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

interface ZanduService {
  serviceId?: string;
  id?: string;
  name: string;
  description?: string;
  price?: number;
  duration?: number;
  category?: string;
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
  personId?: string;
  personName?: string;
  serviceId?: string;
  serviceName?: string;
  userId?: string;
  userName?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  price?: number;
  notes?: string;
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
            const data = await zanduFetch("/schedulers/appointments?limit=1000", input.token) as ZanduAppointment[];
            const arr = Array.isArray(data) ? data : [];
            resultado.agendamentos = {
              total: arr.length,
              amostra: arr.slice(0, 5).map((a) => ({
                cliente: a.personName,
                servico: a.serviceName,
                profissional: a.userName,
                data: a.startDate,
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
      tipos: z.array(z.enum(["clientes", "servicos", "profissionais"])),
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
              const nomeLower = s.name.toLowerCase().trim();
              if (nomesExistentes.has(nomeLower) && input.ignorarDuplicados) {
                entry.duplicados++;
                entry.detalhes.push({ nome: s.name, status: "duplicado" });
                continue;
              }

              try {
                await createServico({
                  empresaId: empresa.id,
                  nome: s.name,
                  descricao: s.description || null,
                  valor: String(s.price ?? "0"),
                  duracaoMinutos: s.duration ?? 60,
                  categoria: s.category || null,
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
              const nomeLower = u.name.toLowerCase().trim();
              if (nomesExistentes.has(nomeLower) && input.ignorarDuplicados) {
                entry.duplicados++;
                entry.detalhes.push({ nome: u.name, status: "duplicado" });
                continue;
              }

              try {
                await createProfissional({
                  empresaId: empresa.id,
                  nome: u.name,
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
