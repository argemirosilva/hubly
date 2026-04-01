import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  getEmpresaDoUsuario,
  createCliente,
  getClientesByEmpresa,
  createServico,
  getServicosByEmpresa,
  createProfissional,
  getProfissionaisByEmpresa,
  createAgendamento,
  getAgendamentosByEmpresa,
} from "../db";

const ZANDU_BASE_URL = "https://api.zandu.com.br";

// Helper para chamar a API do Zandu
async function zanduFetch(path: string, token: string) {
  const res = await fetch(`${ZANDU_BASE_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Zandu API error ${res.status}: ${text}`);
  }
  return res.json();
}

// ─── Tipos da API Zandu ───────────────────────────────────────────────────────
interface ZanduPerson {
  personId: string;
  name: string;
  email?: string;
  phone?: string;
  document?: string;
  born?: string;
  address?: string;
  comments?: string;
  createdAt?: string;
}

interface ZanduServiceCategory {
  id?: string | number;
  name?: string;
  nome?: string;
}

interface ZanduService {
  serviceId?: string;
  id?: string;
  name: string;
  description?: string;
  price?: number;
  duration?: number;
  // A API Zandu retorna category como objeto { id, name } ou como string
  category?: string | ZanduServiceCategory;
}

interface ZanduUser {
  userId?: string;
  id?: string;
  name: string;
  email?: string;
  phone?: string;
}

interface ZanduAppointment {
  appointmentId?: string;
  id?: string;
  // Pessoa pode vir como objeto aninhado ou como campos planos
  person?: { personId?: string; name?: string; phone?: string; email?: string };
  personId?: string;
  personName?: string;
  // Serviço pode vir como objeto aninhado ou como campos planos
  service?: { serviceId?: string; name?: string; duration?: number; price?: number };
  serviceId?: string;
  serviceName?: string;
  // Profissional pode vir como objeto aninhado ou como campos planos
  user?: { userId?: string; name?: string };
  userId?: string;
  userName?: string;
  // Datas em diferentes formatos possíveis
  startDate?: string;
  start?: string;
  endDate?: string;
  end?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  status?: string;
  price?: number;
  value?: number;
  notes?: string;
  comments?: string;
}

interface ZanduInvoice {
  invoiceId?: string;
  id?: string;
  personName?: string;
  serviceName?: string;
  value?: number;
  date?: string;
  paymentMethod?: string;
  status?: string;
}

export const zanduRouter = router({
  // ── Testar conexão e buscar preview ──────────────────────────────────────
  preview: protectedProcedure
    .input(z.object({
      token: z.string().min(10),
      tipos: z.array(z.enum(["clientes", "servicos", "profissionais", "agendamentos", "vendas"])),
    }))
    .mutation(async ({ ctx, input }) => {
      const empresa = await getEmpresaDoUsuario(ctx.user.id);
      if (!empresa) throw new Error("Empresa não encontrada");

      const resultado: Record<string, { total: number; amostra: unknown[] }> = {};

      for (const tipo of input.tipos) {
        try {
          if (tipo === "clientes") {
            const data = await zanduFetch("/persons?limit=1000", input.token) as ZanduPerson[];
            const arr = Array.isArray(data) ? data : [];
            resultado.clientes = {
              total: arr.length,
              amostra: arr.slice(0, 5).map((p) => ({
                nome: p.name,
                email: p.email,
                telefone: p.phone,
                documento: p.document,
              })),
            };
          } else if (tipo === "servicos") {
            const data = await zanduFetch("/services", input.token) as ZanduService[];
            const arr = Array.isArray(data) ? data : [];
            resultado.servicos = {
              total: arr.length,
              amostra: arr.slice(0, 5).map((s) => ({
                nome: s.name,
                valor: s.price,
                duracao: s.duration,
                categoria: s.category,
              })),
            };
          } else if (tipo === "profissionais") {
            const data = await zanduFetch("/users", input.token) as ZanduUser[];
            const arr = Array.isArray(data) ? data : [];
            resultado.profissionais = {
              total: arr.length,
              amostra: arr.slice(0, 5).map((u) => ({
                nome: u.name,
                email: u.email,
                telefone: u.phone,
              })),
            };
          } else if (tipo === "agendamentos") {
            const data = await zanduFetch("/schedulers/appointments", input.token) as ZanduAppointment[];
            const arr = Array.isArray(data) ? data : [];
            resultado.agendamentos = {
              total: arr.length,
              amostra: arr.slice(0, 5).map((a) => ({
                cliente: a.person?.name || a.personName || "(desconhecido)",
                servico: a.service?.name || a.serviceName || "(desconhecido)",
                profissional: a.user?.name || a.userName || "(desconhecido)",
                data: a.startDate || a.start || a.date,
                status: a.status,
              })),
            };
          } else if (tipo === "vendas") {
            const data = await zanduFetch("/invoices?limit=1000", input.token) as ZanduInvoice[];
            const arr = Array.isArray(data) ? data : [];
            resultado.vendas = {
              total: arr.length,
              amostra: arr.slice(0, 5).map((v) => ({
                cliente: v.personName,
                servico: v.serviceName,
                valor: v.value,
                data: v.date,
                status: v.status,
              })),
            };
          }
        } catch (err) {
          resultado[tipo] = { total: -1, amostra: [{ erro: String(err) }] };
        }
      }

      return resultado;
    }),

  // ── Executar importação ───────────────────────────────────────────────────
  importar: protectedProcedure
    .input(z.object({
      token: z.string().min(10),
      tipos: z.array(z.enum(["clientes", "servicos", "profissionais", "agendamentos"])),
      ignorarDuplicados: z.boolean().default(true),
    }))
    .mutation(async ({ ctx, input }) => {
      const empresa = await getEmpresaDoUsuario(ctx.user.id);
      if (!empresa) throw new Error("Empresa não encontrada");

      const log: {
        tipo: string;
        total: number;
        importados: number;
        duplicados: number;
        erros: number;
        detalhes: { nome: string; status: "importado" | "duplicado" | "erro"; mensagem?: string }[];
      }[] = [];

      for (const tipo of input.tipos) {
        const entry = {
          tipo,
          total: 0,
          importados: 0,
          duplicados: 0,
          erros: 0,
          detalhes: [] as { nome: string; status: "importado" | "duplicado" | "erro"; mensagem?: string }[],
        };

        try {
          if (tipo === "clientes") {
            const data = await zanduFetch("/persons?limit=1000", input.token) as ZanduPerson[];
            const arr = Array.isArray(data) ? data : [];
            entry.total = arr.length;

            // Buscar clientes existentes para detectar duplicados
            const existentes = await getClientesByEmpresa(empresa.id);
            const telefonesExistentes = new Set(existentes.map((c) => c.telefone?.replace(/\D/g, "")));
            const emailsExistentes = new Set(existentes.map((c) => c.email?.toLowerCase()).filter(Boolean));

            for (const p of arr) {
              // Ignorar registros sem nome
              if (!p.name || typeof p.name !== "string") {
                entry.erros++;
                entry.detalhes.push({ nome: "(sem nome)", status: "erro", mensagem: "Registro sem nome ignorado" });
                continue;
              }

              const telefoneLimpo = p.phone?.replace(/\D/g, "");
              const emailLower = p.email?.toLowerCase();
              const isDuplicate =
                (telefoneLimpo && telefonesExistentes.has(telefoneLimpo)) ||
                (emailLower && emailsExistentes.has(emailLower));

              if (isDuplicate && input.ignorarDuplicados) {
                entry.duplicados++;
                entry.detalhes.push({ nome: p.name, status: "duplicado" });
                continue;
              }

              try {
                await createCliente({
                  empresaId: empresa.id,
                  nome: p.name,
                  email: p.email || null,
                  telefone: p.phone || null,
                  whatsapp: p.phone || null,
                  cpf: p.document || null,
                  dataNascimento: p.born ? p.born.split("T")[0] : null,
                  observacoes: p.comments || null,
                  tags: [],
                  ativo: true,
                });
                entry.importados++;
                entry.detalhes.push({ nome: p.name, status: "importado" });
              } catch (err) {
                entry.erros++;
                entry.detalhes.push({ nome: p.name, status: "erro", mensagem: String(err) });
              }
            }
          } else if (tipo === "servicos") {
            const data = await zanduFetch("/services", input.token) as ZanduService[];
            const arr = Array.isArray(data) ? data : [];
            entry.total = arr.length;

            const existentes = await getServicosByEmpresa(empresa.id);
            const nomesExistentes = new Set(existentes.map((s) => s.nome.toLowerCase().trim()));

            for (const s of arr) {
              // Ignorar registros sem nome
              if (!s.name || typeof s.name !== "string") {
                entry.erros++;
                entry.detalhes.push({ nome: "(sem nome)", status: "erro", mensagem: "Registro sem nome ignorado" });
                continue;
              }

              const nomeLower = s.name.toLowerCase().trim();
              if (nomesExistentes.has(nomeLower) && input.ignorarDuplicados) {
                entry.duplicados++;
                entry.detalhes.push({ nome: s.name, status: "duplicado" });
                continue;
              }

              // Extrair nome da categoria — pode ser string ou objeto { id, name/nome }
              const categoriaRaw = s.category;
              let categoriaNome: string | null = null;
              if (typeof categoriaRaw === "string") {
                categoriaNome = categoriaRaw || null;
              } else if (categoriaRaw && typeof categoriaRaw === "object") {
                categoriaNome = (categoriaRaw as ZanduServiceCategory).name ||
                                (categoriaRaw as ZanduServiceCategory).nome ||
                                null;
              }

              try {
                await createServico({
                  empresaId: empresa.id,
                  nome: s.name,
                  descricao: s.description || null,
                  valor: String(s.price ?? "0"),
                  duracaoMinutos: s.duration ?? 60,
                  categoria: categoriaNome,
                  ativo: true,
                });
                entry.importados++;
                entry.detalhes.push({ nome: s.name, status: "importado" });
              } catch (err) {
                entry.erros++;
                entry.detalhes.push({ nome: s.name, status: "erro", mensagem: String(err) });
              }
            }
          } else if (tipo === "profissionais") {
            const data = await zanduFetch("/users", input.token) as ZanduUser[];
            const arr = Array.isArray(data) ? data : [];
            entry.total = arr.length;

            const existentes = await getProfissionaisByEmpresa(empresa.id);
            const nomesExistentes = new Set(existentes.map((p) => p.nome.toLowerCase().trim()));

            for (const u of arr) {
              // Ignorar registros sem nome
              if (!u.name || typeof u.name !== "string") {
                entry.erros++;
                entry.detalhes.push({ nome: "(sem nome)", status: "erro", mensagem: "Registro sem nome ignorado" });
                continue;
              }

              const nomeLower = u.name.toLowerCase().trim();
              if (nomesExistentes.has(nomeLower) && input.ignorarDuplicados) {
                entry.duplicados++;
                entry.detalhes.push({ nome: u.name, status: "duplicado" });
                continue;
              }

              try {
                await createProfissional({
                  empresaId: empresa.id,
                  nome: u.name.trim(),
                  email: u.email || null,
                  telefone: u.phone || null,
                  ativo: true,
                });
                entry.importados++;
                entry.detalhes.push({ nome: u.name, status: "importado" });
              } catch (err) {
                entry.erros++;
                entry.detalhes.push({ nome: u.name, status: "erro", mensagem: String(err) });
              }
            }
          } else if (tipo === "agendamentos") {
            const data = await zanduFetch("/schedulers/appointments", input.token) as ZanduAppointment[];
            const arr = Array.isArray(data) ? data : [];
            entry.total = arr.length;

            // Carregar dados locais para fazer o match por nome
            const clientesLocais = await getClientesByEmpresa(empresa.id);
            const servicosLocais = await getServicosByEmpresa(empresa.id);
            const profissionaisLocais = await getProfissionaisByEmpresa(empresa.id);

            // Mapas de busca por nome normalizado
            const clienteMap = new Map(clientesLocais.map((c) => [c.nome.toLowerCase().trim(), c.id]));
            const servicoMap = new Map(servicosLocais.map((s) => [s.nome.toLowerCase().trim(), s.id]));
            const profissionalMap = new Map(profissionaisLocais.map((p) => [p.nome.toLowerCase().trim(), p.id]));

            // Usar o primeiro profissional como fallback se não encontrar
            const profissionalFallbackId = profissionaisLocais[0]?.id;
            // Usar o primeiro serviço como fallback se não encontrar
            const servicoFallbackId = servicosLocais[0]?.id;

            for (const a of arr) {
              const clienteNome = (a.person?.name || a.personName || "").trim();
              const servicoNome = (a.service?.name || a.serviceName || "").trim();
              const profissionalNome = (a.user?.name || a.userName || "").trim();
              const startRaw = a.startDate || a.start || a.date || "";
              const endRaw = a.endDate || a.end || "";

              if (!startRaw) {
                entry.erros++;
                entry.detalhes.push({ nome: clienteNome || "(sem data)", status: "erro", mensagem: "Agendamento sem data" });
                continue;
              }

              // Resolver IDs locais por nome
              const clienteId = clienteNome ? clienteMap.get(clienteNome.toLowerCase()) : undefined;
              const servicoId = servicoNome ? servicoMap.get(servicoNome.toLowerCase()) : servicoFallbackId;
              const profissionalId = profissionalNome ? profissionalMap.get(profissionalNome.toLowerCase()) : profissionalFallbackId;

              if (!clienteId) {
                entry.erros++;
                entry.detalhes.push({ nome: clienteNome || "(sem cliente)", status: "erro", mensagem: `Cliente "${clienteNome}" não encontrado localmente. Importe os clientes primeiro.` });
                continue;
              }
              if (!servicoId) {
                entry.erros++;
                entry.detalhes.push({ nome: clienteNome, status: "erro", mensagem: `Serviço "${servicoNome}" não encontrado. Importe os serviços primeiro.` });
                continue;
              }
              if (!profissionalId) {
                entry.erros++;
                entry.detalhes.push({ nome: clienteNome, status: "erro", mensagem: "Nenhum profissional encontrado. Importe os profissionais primeiro." });
                continue;
              }

              // Parsear data e hora
              let dataStr: string;
              let horaInicioStr: string;
              let horaFimStr: string;
              try {
                const startDt = new Date(startRaw);
                dataStr = startDt.toISOString().split("T")[0]; // YYYY-MM-DD
                horaInicioStr = startDt.toTimeString().slice(0, 5); // HH:MM

                if (endRaw) {
                  const endDt = new Date(endRaw);
                  horaFimStr = endDt.toTimeString().slice(0, 5);
                } else {
                  // Calcular fim com base na duração do serviço (padrão 60 min)
                  const servicoLocal = servicosLocais.find((s) => s.id === servicoId);
                  const duracao = servicoLocal?.duracaoMinutos ?? 60;
                  const endDt = new Date(startDt.getTime() + duracao * 60000);
                  horaFimStr = endDt.toTimeString().slice(0, 5);
                }
              } catch {
                entry.erros++;
                entry.detalhes.push({ nome: clienteNome, status: "erro", mensagem: `Data inválida: ${startRaw}` });
                continue;
              }

              // Mapear status do Zandu para o Agendei
              const statusMap: Record<string, "agendado" | "confirmado" | "concluido" | "cancelado" | "faltou"> = {
                criado: "agendado",
                confirmado: "confirmado",
                compareceu: "concluido",
                faltou: "faltou",
                cancelado_empresa: "cancelado",
                cancelado_usuario: "cancelado",
                cancelado: "cancelado",
                remarcado: "cancelado",
              };
              const statusZandu = (a.status || "criado").toLowerCase();
              const statusLocal = statusMap[statusZandu] ?? "agendado";

              const valorTotal = String(a.service?.price ?? a.price ?? a.value ?? "0");

              try {
                await createAgendamento({
                  empresaId: empresa.id,
                  clienteId,
                  profissionalId,
                  servicoId,
                  data: dataStr,
                  horaInicio: horaInicioStr,
                  horaFim: horaFimStr,
                  status: statusLocal,
                  valorTotal,
                  observacoes: a.notes || a.comments || null,
                });
                entry.importados++;
                entry.detalhes.push({ nome: `${clienteNome} (${dataStr})`, status: "importado" });
              } catch (err) {
                entry.erros++;
                entry.detalhes.push({ nome: clienteNome, status: "erro", mensagem: String(err) });
              }
            }
          }
        } catch (err) {
          entry.erros++;
          entry.detalhes.push({ nome: tipo, status: "erro", mensagem: String(err) });
        }

        log.push(entry);
      }

      return { sucesso: true, log };
    }),
});
