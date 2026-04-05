/**
 * Importação Assistida Inteligente
 * Parsing, detecção, mapeamento, validação e execução de importação de dados.
 * NUNCA insere direto no banco — sempre usa os services/procedures existentes.
 */
import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { clientes, servicos, profissionais } from "../../drizzle/schema";
import { eq, and, sql } from "drizzle-orm";

// ─── Sinônimos para detecção de colunas ──────────────────────────────────────
const SINONIMOS: Record<string, string[]> = {
  nome: ["nome", "name", "cliente", "razao", "razão", "nome completo", "nome_completo", "full_name"],
  telefone: ["telefone", "tel", "fone", "celular", "cel", "phone", "mobile", "whatsapp", "wpp", "contato"],
  email: ["email", "e-mail", "mail", "correio", "e_mail"],
  cpf: ["cpf", "documento", "doc", "cpf_cnpj"],
  dataNascimento: ["nascimento", "data_nascimento", "dt_nasc", "aniversario", "aniversário", "birthday", "data nascimento"],
  endereco: ["endereco", "endereço", "address", "rua", "logradouro", "end"],
  observacoes: ["observacoes", "observações", "obs", "notas", "notes", "anotacoes"],
  valor: ["valor", "preco", "preço", "price", "value", "custo", "cost"],
  duracaoMinutos: ["duracao", "duração", "tempo", "minutos", "duration", "min"],
  categoria: ["categoria", "category", "tipo", "type", "grupo"],
  especialidade: ["especialidade", "specialty", "area", "área", "funcao", "função"],
  data: ["data", "date", "dia", "day", "dt"],
  horaInicio: ["hora", "horario", "horário", "time", "hora_inicio", "inicio", "início"],
  status: ["status", "situacao", "situação", "estado", "state"],
  servicoNome: ["servico", "serviço", "service", "procedimento", "tratamento"],
  profissionalNome: ["profissional", "professional", "atendente", "colaborador", "funcionario", "funcionário"],
  clienteNome: ["cliente", "client", "paciente", "nome_cliente"],
};

const ENTITY_KEYWORDS: Record<string, string[]> = {
  clientes: ["nome", "telefone", "email", "cpf", "nascimento", "endereco", "whatsapp", "cliente"],
  servicos: ["valor", "preco", "duracao", "categoria", "servico", "procedimento", "minutos"],
  profissionais: ["especialidade", "profissional", "funcao", "colaborador"],
  agendamentos: ["data", "hora", "status", "agendamento", "horario", "servico", "profissional"],
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function normalize(s: string): string {
  return s.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
}

function detectEntityType(columns: string[]): { type: string; confidence: number } {
  const scores: Record<string, number> = { clientes: 0, servicos: 0, profissionais: 0, agendamentos: 0 };
  const normalizedCols = columns.map(normalize);

  for (const [entity, keywords] of Object.entries(ENTITY_KEYWORDS)) {
    for (const col of normalizedCols) {
      for (const kw of keywords) {
        if (col.includes(normalize(kw))) { scores[entity] += 1; break; }
      }
    }
  }

  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const best = sorted[0];
  const total = columns.length || 1;
  return { type: best[0], confidence: Math.min(100, Math.round((best[1] / total) * 100)) };
}

function mapColumns(columns: string[], entityType: string): Record<string, string | null> {
  const fields = entityType === "clientes" ? ["nome", "telefone", "email", "cpf", "dataNascimento", "endereco", "observacoes"]
    : entityType === "servicos" ? ["nome", "valor", "duracaoMinutos", "categoria"]
    : entityType === "profissionais" ? ["nome", "email", "telefone", "especialidade"]
    : ["clienteNome", "servicoNome", "profissionalNome", "data", "horaInicio", "status"];

  const mapping: Record<string, string | null> = {};
  for (const col of columns) {
    const normCol = normalize(col);
    let bestField: string | null = null;
    for (const field of fields) {
      const synonyms = SINONIMOS[field] ?? [field];
      for (const syn of synonyms) {
        if (normCol.includes(normalize(syn))) { bestField = field; break; }
      }
      if (bestField) break;
    }
    mapping[col] = bestField;
  }
  return mapping;
}

function normalizePhone(v: string): string {
  return v.replace(/[^0-9]/g, "");
}

function normalizeCpf(v: string): string {
  return v.replace(/[^0-9]/g, "");
}

function normalizeDate(v: string): string {
  if (!v) return "";
  // Try dd/mm/yyyy
  const brMatch = v.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (brMatch) {
    const [, d, m, y] = brMatch;
    const year = y.length === 2 ? `20${y}` : y;
    return `${year}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  // Try yyyy-mm-dd
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  // Try Excel serial number
  const num = Number(v);
  if (!isNaN(num) && num > 30000 && num < 60000) {
    const d = new Date((num - 25569) * 86400 * 1000);
    return d.toISOString().split("T")[0];
  }
  return v;
}

function normalizeCurrency(v: string): string {
  if (!v) return "0";
  const cleaned = v.replace(/[R$\s]/g, "").replace(/\./g, "").replace(",", ".");
  const num = parseFloat(cleaned);
  return isNaN(num) ? "0" : num.toFixed(2);
}

function normalizeDuration(v: string): number {
  if (!v) return 60;
  const num = parseInt(v.replace(/[^0-9]/g, ""));
  if (v.toLowerCase().includes("h")) return num * 60;
  return isNaN(num) ? 60 : num;
}

type RowStatus = "ok" | "warning" | "error";
interface ValidatedRow {
  original: Record<string, string>;
  mapped: Record<string, string>;
  errors: string[];
  warnings: string[];
  status: RowStatus;
}

function validateRow(mapped: Record<string, string>, entityType: string): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (entityType === "clientes") {
    if (!mapped.nome?.trim()) errors.push("Nome é obrigatório");
    if (mapped.email && !mapped.email.includes("@")) warnings.push("Email com formato suspeito");
    if (mapped.cpf && mapped.cpf.length !== 11) warnings.push("CPF deve ter 11 dígitos");
  } else if (entityType === "servicos") {
    if (!mapped.nome?.trim()) errors.push("Nome do serviço é obrigatório");
    if (!mapped.valor || parseFloat(mapped.valor) <= 0) errors.push("Valor deve ser positivo");
  } else if (entityType === "profissionais") {
    if (!mapped.nome?.trim()) errors.push("Nome é obrigatório");
    if (mapped.email && !mapped.email.includes("@")) warnings.push("Email com formato suspeito");
  } else if (entityType === "agendamentos") {
    if (!mapped.clienteNome?.trim() && !mapped.telefone?.trim()) errors.push("Nome ou telefone do cliente é obrigatório");
    if (!mapped.servicoNome?.trim()) errors.push("Nome do serviço é obrigatório");
    if (!mapped.data?.trim()) errors.push("Data é obrigatória");
    if (!mapped.horaInicio?.trim()) errors.push("Horário é obrigatório");
  }

  return { errors, warnings };
}

// ─── Router ──────────────────────────────────────────────────────────────────

export const importacaoRouter = router({
  parseFile: protectedProcedure
    .input(z.object({
      fileBase64: z.string(),
      fileName: z.string(),
      fileType: z.enum(["xlsx", "csv", "pdf"]),
    }))
    .mutation(async ({ input }) => {
      const buffer = Buffer.from(input.fileBase64, "base64");
      if (buffer.length > 10 * 1024 * 1024) throw new TRPCError({ code: "BAD_REQUEST", message: "Arquivo excede o limite de 10MB" });

      let columns: string[] = [];
      let rows: Record<string, string>[] = [];

      if (input.fileType === "xlsx") {
        const ExcelJS = await import("exceljs");
        const wb = new ExcelJS.default.Workbook();
        await wb.xlsx.load(buffer as any);
        const ws = wb.worksheets[0];
        if (!ws) throw new TRPCError({ code: "BAD_REQUEST", message: "Arquivo Excel sem planilhas" });

        const headerRow = ws.getRow(1);
        headerRow.eachCell((cell, colNumber) => {
          columns.push(String(cell.value ?? `Coluna ${colNumber}`).trim());
        });

        ws.eachRow((row, rowNumber) => {
          if (rowNumber === 1) return;
          const obj: Record<string, string> = {};
          row.eachCell((cell, colNumber) => {
            const col = columns[colNumber - 1];
            if (col) obj[col] = String(cell.value ?? "").trim();
          });
          if (Object.values(obj).some(v => v)) rows.push(obj);
        });
      } else if (input.fileType === "csv") {
        const Papa = await import("papaparse");
        const text = buffer.toString("utf-8");
        const result = Papa.default.parse(text, { header: true, skipEmptyLines: true });
        columns = result.meta.fields ?? [];
        rows = (result.data as Record<string, string>[]).map(r => {
          const obj: Record<string, string> = {};
          for (const [k, v] of Object.entries(r)) obj[k] = String(v ?? "").trim();
          return obj;
        });
      } else if (input.fileType === "pdf") {
        const pdfParse = await import("pdf-parse");
        const data = await (pdfParse as any).default(buffer);
        const lines = (data.text as string).split("\n").map(l => l.trim()).filter(Boolean);
        if (lines.length < 2) throw new TRPCError({ code: "BAD_REQUEST", message: "PDF não contém dados tabulares reconhecíveis" });

        // Heuristic: first non-empty line with multiple "words" is header
        const headerLine = lines[0];
        columns = headerLine.split(/\t|  +/).map(c => c.trim()).filter(Boolean);
        if (columns.length < 2) {
          // Fallback: treat each line as a single-column entry
          columns = ["Conteúdo"];
          rows = lines.slice(1).map(l => ({ "Conteúdo": l }));
        } else {
          for (let i = 1; i < lines.length; i++) {
            const vals = lines[i].split(/\t|  +/).map(v => v.trim());
            const obj: Record<string, string> = {};
            columns.forEach((col, idx) => { obj[col] = vals[idx] ?? ""; });
            if (Object.values(obj).some(v => v)) rows.push(obj);
          }
        }
      }

      // Auto-detect entity type
      const detection = detectEntityType(columns);
      // Auto-map columns
      const mapping = mapColumns(columns, detection.type);

      return { columns, rows, totalRows: rows.length, detectedType: detection.type, confidence: detection.confidence, suggestedMapping: mapping };
    }),

  validate: protectedProcedure
    .input(z.object({
      rows: z.array(z.record(z.string(), z.string())),
      mapping: z.record(z.string(), z.string().nullable()),
      entityType: z.enum(["clientes", "servicos", "profissionais", "agendamentos"]),
      duplicateAction: z.enum(["skip", "update", "create"]).default("skip"),
    }))
    .mutation(async ({ ctx, input }) => {
      const { getEmpresaDoContexto } = await import("../db");
      const empresa = await getEmpresaDoContexto(ctx.user!.id, ctx.systemUser?.empresaId);
      if (!empresa) throw new TRPCError({ code: "NOT_FOUND", message: "Empresa não encontrada" });

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB indisponível" });

      // Load existing data for duplicate detection
      let existingClientes: any[] = [];
      let existingServicos: any[] = [];
      let existingProfissionais: any[] = [];

      if (input.entityType === "clientes") {
        existingClientes = await db.select({ id: clientes.id, nome: clientes.nome, telefone: clientes.telefone, cpf: clientes.cpf })
          .from(clientes).where(and(eq(clientes.empresaId, empresa.id), eq(clientes.ativo, true)));
      } else if (input.entityType === "servicos") {
        existingServicos = await db.select({ id: servicos.id, nome: servicos.nome })
          .from(servicos).where(and(eq(servicos.empresaId, empresa.id), eq(servicos.ativo, true)));
      } else if (input.entityType === "profissionais") {
        existingProfissionais = await db.select({ id: profissionais.id, nome: profissionais.nome, email: profissionais.email })
          .from(profissionais).where(and(eq(profissionais.empresaId, empresa.id), eq(profissionais.ativo, true)));
      }

      const validatedRows: ValidatedRow[] = input.rows.map(row => {
        // Apply mapping
        const mapped: Record<string, string> = {};
        for (const [col, field] of Object.entries(input.mapping)) {
          if (field && row[col] !== undefined) mapped[field] = row[col];
        }

        // Transform
        if (mapped.telefone) mapped.telefone = normalizePhone(mapped.telefone);
        if (mapped.cpf) mapped.cpf = normalizeCpf(mapped.cpf);
        if (mapped.dataNascimento) mapped.dataNascimento = normalizeDate(mapped.dataNascimento);
        if (mapped.data) mapped.data = normalizeDate(mapped.data);
        if (mapped.valor) mapped.valor = normalizeCurrency(mapped.valor);
        if (mapped.duracaoMinutos) mapped.duracaoMinutos = String(normalizeDuration(mapped.duracaoMinutos));

        // Validate
        const { errors, warnings } = validateRow(mapped, input.entityType);

        // Duplicate check
        if (input.entityType === "clientes") {
          const dupByCpf = mapped.cpf && existingClientes.find(c => c.cpf && c.cpf.replace(/\D/g, "") === mapped.cpf);
          const dupByPhone = mapped.telefone && existingClientes.find(c => c.telefone && c.telefone.replace(/\D/g, "").endsWith(mapped.telefone.slice(-8)));
          if (dupByCpf || dupByPhone) warnings.push(`Possível duplicata: ${(dupByCpf || dupByPhone).nome}`);
        } else if (input.entityType === "servicos") {
          const dup = existingServicos.find(s => s.nome.toLowerCase().trim() === (mapped.nome ?? "").toLowerCase().trim());
          if (dup) warnings.push(`Serviço já existe: ${dup.nome}`);
        } else if (input.entityType === "profissionais") {
          const dup = existingProfissionais.find(p => p.email && mapped.email && p.email.toLowerCase() === mapped.email.toLowerCase());
          if (dup) warnings.push(`Profissional já existe: ${dup.nome}`);
        }

        const status: RowStatus = errors.length > 0 ? "error" : warnings.length > 0 ? "warning" : "ok";
        return { original: row, mapped, errors, warnings, status };
      });

      const counts = { ok: 0, warning: 0, error: 0 };
      validatedRows.forEach(r => counts[r.status]++);

      return { rows: validatedRows, counts };
    }),

  execute: protectedProcedure
    .input(z.object({
      rows: z.array(z.object({
        mapped: z.record(z.string(), z.string()),
        status: z.enum(["ok", "warning", "error"]),
      })),
      entityType: z.enum(["clientes", "servicos", "profissionais", "agendamentos"]),
      duplicateAction: z.enum(["skip", "update", "create"]).default("skip"),
    }))
    .mutation(async ({ ctx, input }) => {
      const { getEmpresaDoContexto, createCliente, createServico, createProfissional, createAgendamento } = await import("../db");
      const empresa = await getEmpresaDoContexto(ctx.user!.id, ctx.systemUser?.empresaId);
      if (!empresa) throw new TRPCError({ code: "NOT_FOUND", message: "Empresa não encontrada" });

      const importable = input.rows.filter(r => r.status === "ok" || r.status === "warning");
      let success = 0;
      let errors: { row: number; message: string }[] = [];

      for (let i = 0; i < importable.length; i++) {
        const { mapped } = importable[i];
        try {
          if (input.entityType === "clientes") {
            await createCliente({
              empresaId: empresa.id,
              nome: mapped.nome ?? "",
              telefone: mapped.telefone || undefined,
              email: mapped.email || undefined,
              cpf: mapped.cpf || undefined,
              dataNascimento: mapped.dataNascimento || undefined,
              endereco: mapped.endereco || undefined,
              observacoes: mapped.observacoes || undefined,
            });
          } else if (input.entityType === "servicos") {
            await createServico({
              empresaId: empresa.id,
              nome: mapped.nome ?? "",
              valor: mapped.valor ?? "0",
              duracaoMinutos: parseInt(mapped.duracaoMinutos ?? "60") || 60,
              categoria: mapped.categoria || undefined,
            });
          } else if (input.entityType === "profissionais") {
            await createProfissional({
              empresaId: empresa.id,
              nome: mapped.nome ?? "",
              email: mapped.email || undefined,
              telefone: mapped.telefone || undefined,
              especialidade: mapped.especialidade || undefined,
            });
          }
          success++;
        } catch (err: any) {
          errors.push({ row: i + 1, message: err?.message ?? "Erro desconhecido" });
        }
      }

      return { total: importable.length, success, errors, errorCount: errors.length };
    }),
});
