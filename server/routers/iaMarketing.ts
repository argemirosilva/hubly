import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import { invokeOpenAIText, invokeOpenAIJson } from "../openai";
import { empresaHasFeature } from "../db-plans";
import { getEmpresaDoUsuario, getServicosByEmpresa, getProfissionaisByEmpresa } from "../db";
import { getDb } from "../db";
import { marketingPosts } from "../../drizzle/schema";
import { eq, and, desc, gte, lte, isNotNull } from "drizzle-orm";
import OpenAI from "openai";

// ─── Tipos ────────────────────────────────────────────────────────────────────
const tiposPost = ["promocao", "servico", "dica", "depoimento", "novidade", "sazonal", "outro"] as const;
const statusPost = ["rascunho", "aprovado", "agendado", "publicado", "arquivado"] as const;
const plataformas = ["instagram", "tiktok", "ambos"] as const;
const formatos = ["feed", "reels", "stories", "tiktok", "outro"] as const;
const statusProducaoEnum = ["planejado", "gravado", "editado", "postado"] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY não configurada");
  return new OpenAI({ apiKey });
}

// ─── Router ───────────────────────────────────────────────────────────────────
export const iaMarketingRouter = router({

  /**
   * Gera legenda + hashtags para um post de Instagram usando IA
   */
  gerarPost: protectedProcedure
    .input(z.object({
      tipo: z.enum(tiposPost),
      tema: z.string().min(1).max(500),
      servicoId: z.number().optional(),
      tom: z.enum(["descontraido", "profissional", "emocional", "urgente"]).default("descontraido"),
      incluirEmoji: z.boolean().default(true),
      idioma: z.string().default("pt-BR"),
    }))
    .mutation(async ({ ctx, input }) => {
      const empresa = await getEmpresaDoUsuario(ctx.user.id);
      if (!empresa) throw new TRPCError({ code: "NOT_FOUND", message: "Empresa não encontrada" });

      // Buscar contexto da empresa e serviços
      const servicos = await getServicosByEmpresa(empresa.id);
      const servicoSelecionado = input.servicoId ? servicos.find(s => s.id === input.servicoId) : null;

      const tipoLabels: Record<string, string> = {
        promocao: "promoção/oferta especial",
        servico: "divulgação de serviço",
        dica: "dica de beleza/cuidado",
        depoimento: "depoimento de cliente",
        novidade: "novidade/lançamento",
        sazonal: "post sazonal/data comemorativa",
        outro: "post geral",
      };

      const tomLabels: Record<string, string> = {
        descontraido: "descontraído, próximo e amigável",
        profissional: "profissional e sofisticado",
        emocional: "emocional e inspirador",
        urgente: "urgente, com senso de escassez",
      };

      const contextServico = servicoSelecionado
        ? `\nServiço em destaque: ${servicoSelecionado.nome} — R$ ${parseFloat(String(servicoSelecionado.valor)).toFixed(2).replace('.', ',')} — ${servicoSelecionado.duracaoMinutos} min`
        : servicos.length > 0
          ? `\nAlguns serviços do estabelecimento: ${servicos.slice(0, 5).map(s => s.nome).join(', ')}`
          : '';

      const prompt = `Você é um especialista em marketing digital para salões de beleza, clínicas de estética e barbearias.

Crie um post para Instagram com as seguintes características:
- Estabelecimento: ${empresa.nome} (${empresa.tipo})
- Tipo de post: ${tipoLabels[input.tipo] || input.tipo}
- Tema/Assunto: ${input.tema}
- Tom de voz: ${tomLabels[input.tom] || input.tom}
- Usar emojis: ${input.incluirEmoji ? 'sim' : 'não'}
- Idioma: ${input.idioma}${contextServico}

Retorne um JSON com:
{
  "legenda": "texto completo da legenda para o post (máximo 2200 caracteres)",
  "hashtags": "lista de 20-30 hashtags relevantes separadas por espaço",
  "imagemPrompt": "prompt em inglês para gerar a imagem ideal para este post usando DALL-E (seja específico sobre cores, estilo, composição, ambiente de salão/beleza)"
}

A legenda deve ser envolvente, com chamada para ação (CTA) clara e adequada ao tipo de negócio.`;

      const resultado = await invokeOpenAIJson<{
        legenda: string;
        hashtags: string;
        imagemPrompt: string;
      }>({
        messages: [{ role: "user", content: prompt }],
        model: "gpt-4o",
        max_tokens: 2000,
        temperature: 0.8,
      });

      // Salvar como rascunho no banco
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });

      const [inserted] = await db.insert(marketingPosts).values({
        empresaId: empresa.id,
        tipo: input.tipo,
        tema: input.tema,
        legenda: resultado.legenda,
        hashtags: resultado.hashtags,
        imagemPrompt: resultado.imagemPrompt,
        status: "rascunho",
      });

      return {
        id: (inserted as any)?.insertId ?? null,
        legenda: resultado.legenda,
        hashtags: resultado.hashtags,
        imagemPrompt: resultado.imagemPrompt,
      };
    }),

  /**
   * Gera imagem para o post usando DALL-E 3
   */
  gerarImagem: protectedProcedure
    .input(z.object({
      postId: z.number().optional(),
      prompt: z.string().min(10).max(1000),
      estilo: z.enum(["vivid", "natural"]).default("vivid"),
    }))
    .mutation(async ({ ctx, input }) => {
      const empresa = await getEmpresaDoUsuario(ctx.user.id);
      if (!empresa) throw new TRPCError({ code: "NOT_FOUND", message: "Empresa não encontrada" });

      const client = getOpenAIClient();

      // Enriquecer o prompt com contexto de beleza/estética
      const promptEnriquecido = `${input.prompt}. Style: professional beauty salon photography, warm lighting, elegant aesthetic, high quality, Instagram-worthy, ${input.estilo === 'vivid' ? 'vibrant colors' : 'natural tones'}. No text overlay.`;

      const response = await client.images.generate({
        model: "dall-e-3",
        prompt: promptEnriquecido,
        n: 1,
        size: "1024x1024",
        quality: "standard",
        style: input.estilo,
      });

      const imagemUrl = response.data?.[0]?.url;
      if (!imagemUrl) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Falha ao gerar imagem" });

      // Atualizar o post com a URL da imagem se postId fornecido
      if (input.postId) {
        const db = await getDb();
        if (db) {
          await db.update(marketingPosts)
            .set({ imagemUrl, imagemPrompt: input.prompt, updatedAt: new Date() })
            .where(and(eq(marketingPosts.id, input.postId), eq(marketingPosts.empresaId, empresa.id)));
        }
      }

      return { imagemUrl };
    }),

  /**
   * Lista posts de marketing da empresa
   */
  listarPosts: protectedProcedure
    .input(z.object({
      status: z.enum(statusPost).optional(),
      limit: z.number().min(1).max(100).default(20),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ ctx, input }) => {
      const empresa = await getEmpresaDoUsuario(ctx.user.id);
      if (!empresa) throw new TRPCError({ code: "NOT_FOUND", message: "Empresa não encontrada" });

      const db = await getDb();
      if (!db) return [];

      const conditions = [eq(marketingPosts.empresaId, empresa.id)];
      if (input.status) conditions.push(eq(marketingPosts.status, input.status));

      const posts = await db.select()
        .from(marketingPosts)
        .where(and(...conditions))
        .orderBy(desc(marketingPosts.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      return posts;
    }),

  /**
   * Lista posts do calendário editorial por mês/ano
   */
  listarCalendario: protectedProcedure
    .input(z.object({
      ano: z.number().min(2024).max(2030),
      mes: z.number().min(1).max(12),
    }))
    .query(async ({ ctx, input }) => {
      const empresa = await getEmpresaDoUsuario(ctx.user.id);
      if (!empresa) throw new TRPCError({ code: "NOT_FOUND", message: "Empresa não encontrada" });

      const db = await getDb();
      if (!db) return [];

      // Calcular primeiro e último dia do mês no formato YYYY-MM-DD
      const mesStr = String(input.mes).padStart(2, "0");
      const primeiroDia = `${input.ano}-${mesStr}-01`;
      const ultimoDia = new Date(input.ano, input.mes, 0);
      const ultimoDiaStr = `${input.ano}-${mesStr}-${String(ultimoDia.getDate()).padStart(2, "0")}`;

      const posts = await db.select()
        .from(marketingPosts)
        .where(
          and(
            eq(marketingPosts.empresaId, empresa.id),
            isNotNull(marketingPosts.dataPublicacao),
            gte(marketingPosts.dataPublicacao, primeiroDia),
            lte(marketingPosts.dataPublicacao, ultimoDiaStr),
          )
        )
        .orderBy(marketingPosts.dataPublicacao);

      return posts;
    }),

  /**
   * Atualiza o status de produção de um post (Planejado → Gravado → Editado → Postado)
   */
  atualizarStatusProducao: protectedProcedure
    .input(z.object({
      id: z.number(),
      statusProducao: z.enum(statusProducaoEnum),
    }))
    .mutation(async ({ ctx, input }) => {
      const empresa = await getEmpresaDoUsuario(ctx.user.id);
      if (!empresa) throw new TRPCError({ code: "NOT_FOUND", message: "Empresa não encontrada" });

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });

      // Se marcou como postado, atualiza também o status geral para "publicado"
      const updates: Record<string, unknown> = {
        statusProducao: input.statusProducao,
        updatedAt: new Date(),
      };
      if (input.statusProducao === "postado") {
        updates.status = "publicado";
        updates.publicadoEm = new Date();
      }

      await db.update(marketingPosts)
        .set(updates as any)
        .where(and(eq(marketingPosts.id, input.id), eq(marketingPosts.empresaId, empresa.id)));

      return { success: true };
    }),

  /**
   * Atualiza dados de um post do calendário (responsável, data, horário, etc.)
   */
  atualizarPostCalendario: protectedProcedure
    .input(z.object({
      id: z.number(),
      tema: z.string().optional(),
      legenda: z.string().optional(),
      hashtags: z.string().optional(),
      plataforma: z.enum(plataformas).optional(),
      formato: z.enum(formatos).optional(),
      dataPublicacao: z.string().optional(),    // YYYY-MM-DD
      horarioPublicacao: z.string().optional(), // HH:MM
      responsavelId: z.number().nullable().optional(),
      responsavelNome: z.string().nullable().optional(),
      observacoes: z.string().optional(),
      status: z.enum(statusPost).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const empresa = await getEmpresaDoUsuario(ctx.user.id);
      if (!empresa) throw new TRPCError({ code: "NOT_FOUND", message: "Empresa não encontrada" });

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });

      const updates: Record<string, unknown> = { updatedAt: new Date() };
      if (input.tema !== undefined) updates.tema = input.tema;
      if (input.legenda !== undefined) updates.legenda = input.legenda;
      if (input.hashtags !== undefined) updates.hashtags = input.hashtags;
      if (input.plataforma !== undefined) updates.plataforma = input.plataforma;
      if (input.formato !== undefined) updates.formato = input.formato;
      if (input.dataPublicacao !== undefined) updates.dataPublicacao = input.dataPublicacao;
      if (input.horarioPublicacao !== undefined) updates.horarioPublicacao = input.horarioPublicacao;
      if (input.responsavelId !== undefined) updates.responsavelId = input.responsavelId;
      if (input.responsavelNome !== undefined) updates.responsavelNome = input.responsavelNome;
      if (input.observacoes !== undefined) updates.observacoes = input.observacoes;
      if (input.status !== undefined) updates.status = input.status;

      await db.update(marketingPosts)
        .set(updates as any)
        .where(and(eq(marketingPosts.id, input.id), eq(marketingPosts.empresaId, empresa.id)));

      return { success: true };
    }),

  /**
   * Atualiza um post (legenda, status, agendamento) — endpoint legado mantido
   */
  atualizarPost: protectedProcedure
    .input(z.object({
      id: z.number(),
      legenda: z.string().optional(),
      hashtags: z.string().optional(),
      status: z.enum(statusPost).optional(),
      agendadoPara: z.string().optional(), // ISO datetime
      observacoes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const empresa = await getEmpresaDoUsuario(ctx.user.id);
      if (!empresa) throw new TRPCError({ code: "NOT_FOUND", message: "Empresa não encontrada" });

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });

      const updates: Record<string, unknown> = { updatedAt: new Date() };
      if (input.legenda !== undefined) updates.legenda = input.legenda;
      if (input.hashtags !== undefined) updates.hashtags = input.hashtags;
      if (input.status !== undefined) updates.status = input.status;
      if (input.agendadoPara !== undefined) updates.agendadoPara = new Date(input.agendadoPara);
      if (input.observacoes !== undefined) updates.observacoes = input.observacoes;

      await db.update(marketingPosts)
        .set(updates as any)
        .where(and(eq(marketingPosts.id, input.id), eq(marketingPosts.empresaId, empresa.id)));

      return { success: true };
    }),

  /**
   * Exclui um post
   */
  excluirPost: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const empresa = await getEmpresaDoUsuario(ctx.user.id);
      if (!empresa) throw new TRPCError({ code: "NOT_FOUND", message: "Empresa não encontrada" });

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });

      await db.delete(marketingPosts)
        .where(and(eq(marketingPosts.id, input.id), eq(marketingPosts.empresaId, empresa.id)));

      return { success: true };
    }),

  /**
   * Gera pauta de conteúdo com IA e salva no calendário editorial
   */
  gerarPauta: protectedProcedure
    .input(z.object({
      periodo: z.enum(["semana", "mes"]).default("semana"),
      foco: z.string().optional(),
      anoMes: z.string().optional(), // "YYYY-MM" — se não informado, usa mês atual
      salvarNoCalendario: z.boolean().default(true),
    }))
    .mutation(async ({ ctx, input }) => {
      const empresa = await getEmpresaDoUsuario(ctx.user.id);
      if (!empresa) throw new TRPCError({ code: "NOT_FOUND", message: "Empresa não encontrada" });

      const servicos = await getServicosByEmpresa(empresa.id);

      // Determinar mês de referência
      const hoje = new Date();
      const refDate = input.anoMes
        ? new Date(`${input.anoMes}-01`)
        : hoje;
      const anoRef = refDate.getFullYear();
      const mesRef = refDate.getMonth() + 1;
      const mesStr = String(mesRef).padStart(2, "0");

      const qtdPosts = input.periodo === "semana" ? 5 : 20;

      const prompt = `Você é um estrategista de marketing digital especializado em salões de beleza, clínicas de estética e barbearias.

Crie uma pauta de conteúdo para ${input.periodo === "semana" ? "1 semana (5 posts)" : "1 mês (20 posts)"} para as redes sociais de ${empresa.nome} (${empresa.tipo}).
Mês de referência: ${mesRef}/${anoRef}
${input.foco ? `Foco especial em: ${input.foco}` : ''}
${servicos.length > 0 ? `Serviços disponíveis: ${servicos.slice(0, 8).map(s => s.nome).join(', ')}` : ''}

Distribua os posts entre Instagram (Feed, Reels, Stories) e TikTok de forma equilibrada.

Retorne um JSON com:
{
  "pauta": [
    {
      "dia": 1,
      "tipo": "promocao|servico|dica|depoimento|novidade|sazonal|outro",
      "tema": "tema específico do post",
      "plataforma": "instagram|tiktok|ambos",
      "formato": "feed|reels|stories|tiktok|outro",
      "melhorHorario": "HH:MM",
      "justificativa": "por que este post neste dia (1 frase curta)"
    }
  ]
}`;

      const resultado = await invokeOpenAIJson<{
        pauta: Array<{
          dia: number;
          tipo: string;
          tema: string;
          plataforma: string;
          formato: string;
          melhorHorario: string;
          justificativa: string;
        }>;
      }>({
        messages: [{ role: "user", content: prompt }],
        model: "gpt-4o",
        max_tokens: 3000,
        temperature: 0.7,
      });

      const pauta = resultado.pauta ?? [];

      // Salvar no banco de dados como posts do calendário
      if (input.salvarNoCalendario && pauta.length > 0) {
        const db = await getDb();
        if (db) {
          const registros = pauta.map(item => ({
            empresaId: empresa.id,
            tipo: (tiposPost.includes(item.tipo as any) ? item.tipo : "outro") as typeof tiposPost[number],
            tema: item.tema,
            plataforma: (plataformas.includes(item.plataforma as any) ? item.plataforma : "instagram") as typeof plataformas[number],
            formato: (formatos.includes(item.formato as any) ? item.formato : "feed") as typeof formatos[number],
            statusProducao: "planejado" as const,
            dataPublicacao: `${anoRef}-${mesStr}-${String(item.dia).padStart(2, "0")}`,
            horarioPublicacao: item.melhorHorario ?? "18:00",
            observacoes: item.justificativa,
            status: "rascunho" as const,
          }));

          await db.insert(marketingPosts).values(registros);
        }
      }

      return pauta;
    }),

  /**
   * Cria um post manualmente no calendário editorial
   */
  criarPostCalendario: protectedProcedure
    .input(z.object({
      tema: z.string().min(1).max(500),
      tipo: z.enum(tiposPost).default("outro"),
      plataforma: z.enum(plataformas).default("instagram"),
      formato: z.enum(formatos).default("feed"),
      dataPublicacao: z.string(), // YYYY-MM-DD
      horarioPublicacao: z.string().optional(),
      responsavelId: z.number().optional(),
      responsavelNome: z.string().optional(),
      observacoes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const empresa = await getEmpresaDoUsuario(ctx.user.id);
      if (!empresa) throw new TRPCError({ code: "NOT_FOUND", message: "Empresa não encontrada" });

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });

      const [inserted] = await db.insert(marketingPosts).values({
        empresaId: empresa.id,
        tipo: input.tipo,
        tema: input.tema,
        plataforma: input.plataforma,
        formato: input.formato,
        statusProducao: "planejado",
        dataPublicacao: input.dataPublicacao,
        horarioPublicacao: input.horarioPublicacao ?? "18:00",
        responsavelId: input.responsavelId,
        responsavelNome: input.responsavelNome,
        observacoes: input.observacoes,
        status: "rascunho",
      });

      return { id: (inserted as any)?.insertId ?? null, success: true };
    }),

  /**
   * Lista profissionais da empresa (para seleção de responsável)
   */
  listarProfissionais: protectedProcedure
    .query(async ({ ctx }) => {
      const empresa = await getEmpresaDoUsuario(ctx.user.id);
      if (!empresa) throw new TRPCError({ code: "NOT_FOUND", message: "Empresa não encontrada" });

      const profissionais = await getProfissionaisByEmpresa(empresa.id);
      return profissionais.filter(p => p.ativo).map(p => ({ id: p.id, nome: p.nome }));
    }),
});
