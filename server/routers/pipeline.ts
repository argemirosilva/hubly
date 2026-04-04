import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  getEmpresaDoUsuario, getEmpresaDoContexto,
  getPipelinesByEmpresa,
  createPipeline,
  updatePipeline,
  deletePipeline,
  getColunasByPipeline,
  createColuna,
  updateColuna,
  deleteColuna,
  getCartoesByPipeline,
  createCartao,
  updateCartao,
  deleteCartao,
  getAutomacoesByEmpresa,
  getHistoricoEnvios,
} from "../db";
import { invokeLLM } from "../_core/llm";

async function getEmpresaId(userId: number, systemUserEmpresaId?: number | null) {
  const empresa = await getEmpresaDoContexto(userId, systemUserEmpresaId);
  if (!empresa) throw new Error("Empresa não encontrada");
  return empresa.id;
}

// ── Mapeamento legível dos tipos de gatilho ───────────────────────────────────
function descreverGatilho(aut: {
  tipoGatilho: string;
  evento?: string | null;
  diasAntesDepois?: number | null;
  horaDisparo?: string | null;
  dataFixaDia?: number | null;
  dataFixaMes?: number | null;
}): string {
  switch (aut.tipoGatilho) {
    case "evento": {
      const mapa: Record<string, string> = {
        agendamento_criado: "Agendamento criado",
        agendamento_confirmado: "Agendamento confirmado",
        agendamento_cancelado: "Agendamento cancelado",
        pre_agendamento: "Pré-agendamento criado",
      };
      return mapa[aut.evento ?? ""] ?? `Evento: ${aut.evento}`;
    }
    case "dias_antes_agendamento":
      return `${aut.diasAntesDepois ?? 1} dia(s) antes do agendamento às ${aut.horaDisparo ?? "09:00"}`;
    case "horas_apos_agendamento":
      return `${aut.diasAntesDepois ?? 2}h após o agendamento`;
    case "aniversario_mes":
      return "Aniversariante do mês";
    case "data_fixa":
      return `Data fixa: dia ${aut.dataFixaDia}/${aut.dataFixaMes} às ${aut.horaDisparo ?? "09:00"}`;
    default:
      return aut.tipoGatilho;
  }
}

export const pipelineRouter = router({
  // ── Pipelines ─────────────────────────────────────────────────────────────
  listar: protectedProcedure.query(async ({ ctx }) => {
    const empresaId = await getEmpresaId(ctx.user.id, ctx.systemUser?.empresaId);
    const pipelinesData = await getPipelinesByEmpresa(empresaId);
    // Para cada pipeline, buscar colunas e cartões
    const result = await Promise.all(
      pipelinesData.map(async (p) => {
        const colunas = await getColunasByPipeline(p.id);
        const cartoes = await getCartoesByPipeline(p.id);
        const colunasComCartoes = colunas
          .sort((a, b) => a.ordem - b.ordem)
          .map((c) => ({
            ...c,
            cartoes: cartoes
              .filter((k) => k.colunaId === c.id)
              .sort((a, b) => a.ordem - b.ordem),
          }));
        return { ...p, colunas: colunasComCartoes };
      })
    );
    return result.sort((a, b) => a.ordem - b.ordem);
  }),

  criar: protectedProcedure
    .input(z.object({ nome: z.string().min(1).max(120) }))
    .mutation(async ({ ctx, input }) => {
      const empresaId = await getEmpresaId(ctx.user.id, ctx.systemUser?.empresaId);
      const pipelines = await getPipelinesByEmpresa(empresaId);
      const result = await createPipeline({ empresaId, nome: input.nome, ordem: pipelines.length });
      // Criar colunas padrão
      const colunasPadrao = [
        { nome: "Novo", cor: "#6366f1" },
        { nome: "Em andamento", cor: "#f59e0b" },
        { nome: "Concluído", cor: "#10b981" },
      ];
      for (let i = 0; i < colunasPadrao.length; i++) {
        await createColuna({ pipelineId: result.id, empresaId, nome: colunasPadrao[i].nome, cor: colunasPadrao[i].cor, ordem: i });
      }
      return result;
    }),

  atualizar: protectedProcedure
    .input(z.object({ id: z.number(), nome: z.string().min(1).max(120) }))
    .mutation(async ({ input }) => {
      await updatePipeline(input.id, { nome: input.nome });
      return { success: true };
    }),

  excluir: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deletePipeline(input.id);
      return { success: true };
    }),

  // ── Gerador de Pipeline por IA ────────────────────────────────────────────
  gerarPipelinePorIA: protectedProcedure
    .mutation(async ({ ctx }) => {
      const empresa = await getEmpresaDoUsuario(ctx.user.id);
      if (!empresa) throw new Error("Empresa não encontrada");
      const empresaId = empresa.id;

      // 1. Buscar automações ativas da empresa
      const todasAutomacoes = await getAutomacoesByEmpresa(empresaId);
      const automacoesAtivas = todasAutomacoes.filter((a) => a.ativo);

      if (automacoesAtivas.length === 0) {
        throw new Error("Nenhuma automação ativa encontrada. Crie e ative automações antes de gerar um pipeline.");
      }

      // 2. Montar contexto para a IA
      const contextoAutomacoes = automacoesAtivas.map((a) => ({
        id: a.id,
        nome: a.nome,
        gatilho: descreverGatilho(a),
        canal: a.canalEnvio,
        mensagem: a.corpoMensagem?.substring(0, 120) + (a.corpoMensagem?.length > 120 ? "..." : ""),
      }));

      // 3. Invocar a IA para gerar a estrutura do pipeline
      let estruturaIA: {
        nomePipeline: string;
        descricao: string;
        colunas: Array<{ nome: string; cor: string; descricao: string }>;
        mapeamento: Array<{ automacaoId: number; coluna: string }>;
      };

      try {
        const resposta = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `Você é um especialista em CRM e jornada do cliente para pequenos negócios de serviços (salões, clínicas, barbearias).
Analise as automações fornecidas e crie um Pipeline Kanban que represente visualmente a jornada do cliente.

Retorne APENAS um JSON válido com esta estrutura exata:
{
  "nomePipeline": "Nome descritivo do pipeline (ex: Jornada de Atendimento)",
  "descricao": "Breve descrição do que este pipeline representa",
  "colunas": [
    { "nome": "Nome da coluna", "cor": "#hexadecimal", "descricao": "O que esta etapa representa" }
  ],
  "mapeamento": [
    { "automacaoId": 123, "coluna": "Nome exato da coluna correspondente" }
  ]
}

Regras:
- As colunas devem estar em ordem cronológica da jornada do cliente
- Cada automação deve ser mapeada para a coluna mais adequada
- Use cores distintas e profissionais para cada coluna
- O nome do pipeline deve ser específico para o negócio
- Máximo de 6 colunas para manter o visual limpo
- Inclua sempre uma coluna final de "Concluído" ou similar`,
            },
            {
              role: "user",
              content: `Empresa: ${empresa.nome}
Automações ativas (${automacoesAtivas.length}):
${JSON.stringify(contextoAutomacoes, null, 2)}

Crie um pipeline Kanban que represente a jornada completa do cliente nesta empresa.`,
            },
          ],
          responseFormat: { type: "json_object" },
        });

        const rawContent = resposta.choices[0]?.message?.content;
        const conteudo = typeof rawContent === "string" ? rawContent : "{}";
        estruturaIA = JSON.parse(conteudo);

        // Validação básica da resposta
        if (!estruturaIA.nomePipeline || !Array.isArray(estruturaIA.colunas) || estruturaIA.colunas.length === 0) {
          throw new Error("Resposta da IA inválida");
        }
      } catch (e) {
        // Fallback: estrutura padrão baseada nas automações
        console.warn("[Pipeline IA] Fallback para estrutura padrão:", e);
        estruturaIA = {
          nomePipeline: `Jornada de Atendimento — ${empresa.nome}`,
          descricao: "Pipeline gerado automaticamente com base nas automações ativas",
          colunas: [
            { nome: "Agendado", cor: "#6366f1", descricao: "Clientes com agendamento criado" },
            { nome: "Lembrete Enviado", cor: "#f59e0b", descricao: "Lembrete enviado antes do atendimento" },
            { nome: "Confirmado", cor: "#10b981", descricao: "Agendamento confirmado pelo cliente" },
            { nome: "Cancelado", cor: "#ef4444", descricao: "Agendamento cancelado" },
            { nome: "Concluído", cor: "#8b5cf6", descricao: "Atendimento realizado com sucesso" },
          ],
          mapeamento: automacoesAtivas.map((a) => {
            if (a.evento === "agendamento_criado") return { automacaoId: a.id, coluna: "Agendado" };
            if (a.evento === "agendamento_confirmado") return { automacaoId: a.id, coluna: "Confirmado" };
            if (a.evento === "agendamento_cancelado") return { automacaoId: a.id, coluna: "Cancelado" };
            if (a.tipoGatilho === "dias_antes_agendamento") return { automacaoId: a.id, coluna: "Lembrete Enviado" };
            return { automacaoId: a.id, coluna: "Agendado" };
          }),
        };
      }

      // 4. Criar o pipeline no banco
      const pipelines = await getPipelinesByEmpresa(empresaId);
      const novoPipeline = await createPipeline({
        empresaId,
        nome: estruturaIA.nomePipeline,
        ordem: pipelines.length,
      });
      const pipelineId = novoPipeline.id;

      // 5. Criar as colunas na ordem definida pela IA
      const colunasMap: Record<string, number> = {}; // nome → id
      for (let i = 0; i < estruturaIA.colunas.length; i++) {
        const col = estruturaIA.colunas[i];
        const novaColuna = await createColuna({
          pipelineId,
          empresaId,
          nome: col.nome,
          cor: col.cor ?? "#6366f1",
          ordem: i,
        });
        colunasMap[col.nome] = novaColuna.id;
      }

      // 6. Buscar histórico de envios dos últimos 30 dias para popular cartões
      const { rows: historico } = await getHistoricoEnvios(empresaId, { limit: 200 });
      const trintaDiasAtras = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const historicoRecente = historico.filter(
        (h) => h.clienteId && h.clienteNome && new Date(h.criadoEm) >= trintaDiasAtras
      );

      // 7. Determinar a etapa mais recente de cada cliente (último evento registrado)
      const ultimaEtapaPorCliente = new Map<
        number,
        { clienteId: number; clienteNome: string; automacaoId: number | null; automacaoNome: string | null; criadoEm: Date }
      >();

      for (const h of historicoRecente) {
        const existente = ultimaEtapaPorCliente.get(h.clienteId!);
        if (!existente || new Date(h.criadoEm) > existente.criadoEm) {
          ultimaEtapaPorCliente.set(h.clienteId!, {
            clienteId: h.clienteId!,
            clienteNome: h.clienteNome!,
            automacaoId: h.automacaoId ?? null,
            automacaoNome: h.automacaoNome ?? null,
            criadoEm: new Date(h.criadoEm),
          });
        }
      }

      // 8. Criar cartões para cada cliente na coluna correspondente
      const cartoesOrdem: Record<number, number> = {}; // colunaId → contador
      let cartoesGerados = 0;

      for (const [, cliente] of Array.from(ultimaEtapaPorCliente)) {
        // Encontrar a coluna correta via mapeamento da IA
        const mapeado = estruturaIA.mapeamento?.find(
          (m) => m.automacaoId === cliente.automacaoId
        );
        const nomeColuna = mapeado?.coluna ?? estruturaIA.colunas[0]?.nome;
        const colunaId = colunasMap[nomeColuna];

        if (!colunaId) continue;

        const ordem = cartoesOrdem[colunaId] ?? 0;
        cartoesOrdem[colunaId] = ordem + 1;

        const dataFormatada = cliente.criadoEm.toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        });

        await createCartao({
          pipelineId,
          colunaId,
          empresaId,
          titulo: cliente.clienteNome,
          descricao: `Última interação: ${cliente.automacaoNome ?? "Automação"} em ${dataFormatada}`,
          clienteId: cliente.clienteId,
          clienteNome: cliente.clienteNome,
          status: "em_andamento",
          ordem,
        });
        cartoesGerados++;
      }

      return {
        success: true,
        pipelineId,
        nomePipeline: estruturaIA.nomePipeline,
        descricao: estruturaIA.descricao,
        totalColunas: estruturaIA.colunas.length,
        totalCartoes: cartoesGerados,
        geradoPorIA: true,
      };
    }),

  // ── Colunas ───────────────────────────────────────────────────────────────
  criarColuna: protectedProcedure
    .input(z.object({
      pipelineId: z.number(),
      nome: z.string().min(1).max(120),
      cor: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const empresaId = await getEmpresaId(ctx.user.id, ctx.systemUser?.empresaId);
      const colunas = await getColunasByPipeline(input.pipelineId);
      return createColuna({
        pipelineId: input.pipelineId,
        empresaId,
        nome: input.nome,
        cor: input.cor ?? "#6366f1",
        ordem: colunas.length,
      });
    }),

  atualizarColuna: protectedProcedure
    .input(z.object({
      id: z.number(),
      nome: z.string().min(1).max(120).optional(),
      cor: z.string().optional(),
      ordem: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await updateColuna(id, data);
      return { success: true };
    }),

  excluirColuna: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteColuna(input.id);
      return { success: true };
    }),

  // ── Cartões ───────────────────────────────────────────────────────────────
  criarCartao: protectedProcedure
    .input(z.object({
      colunaId: z.number(),
      pipelineId: z.number(),
      titulo: z.string().min(1).max(255),
      descricao: z.string().optional(),
      status: z.enum(["em_andamento", "congelado", "cancelado", "concluido"]).optional(),
      clienteId: z.number().optional(),
      clienteNome: z.string().optional(),
      responsavelId: z.number().optional(),
      responsavelNome: z.string().optional(),
      lembrete: z.string().optional(),
      valor: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const empresaId = await getEmpresaId(ctx.user.id, ctx.systemUser?.empresaId);
      const cartoes = await getCartoesByPipeline(input.pipelineId);
      const cartoesColuna = cartoes.filter((c) => c.colunaId === input.colunaId);
      return createCartao({
        ...input,
        empresaId,
        status: input.status ?? "em_andamento",
        ordem: cartoesColuna.length,
      });
    }),

  atualizarCartao: protectedProcedure
    .input(z.object({
      id: z.number(),
      colunaId: z.number().optional(),
      titulo: z.string().min(1).max(255).optional(),
      descricao: z.string().nullable().optional(),
      status: z.enum(["em_andamento", "congelado", "cancelado", "concluido"]).optional(),
      clienteId: z.number().nullable().optional(),
      clienteNome: z.string().nullable().optional(),
      responsavelId: z.number().nullable().optional(),
      responsavelNome: z.string().nullable().optional(),
      lembrete: z.string().nullable().optional(),
      valor: z.string().nullable().optional(),
      ordem: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await updateCartao(id, data as Parameters<typeof updateCartao>[1]);
      return { success: true };
    }),

  excluirCartao: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteCartao(input.id);
      return { success: true };
    }),
});
