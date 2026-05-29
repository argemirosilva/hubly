import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "../_core/trpc";
import { invokeOpenAI } from "../openai";
import { getDb, getEmpresaDoContexto } from "../db";
import { chamados, chamadoMensagens } from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import { empresas } from "../../drizzle/schema";
import { sendPushToUser, sendPushToEmpresa } from "../pushNotifications";

const SYSTEM_PROMPT = `Você é a assistente de suporte do Hubly, um sistema de gestão para salões de beleza, clínicas de estética e barbearias.

Seu papel é ajudar as usuárias a entenderem e utilizarem o sistema com clareza, paciência e linguagem simples — como se fosse uma amiga explicando pessoalmente.

## O que o Hubly oferece:

### Primeiros Passos (Configuração Inicial)
- Configurar dados do negócio: nome, telefone, endereço, logotipo, horário de funcionamento
- Cadastrar serviços com nome, duração, preço e comissão do profissional
- Cadastrar profissionais com nome e especialidades
- Criar usuários do sistema com nome, e-mail, senha e grupo de permissão

### Agendamentos
- Criar agendamentos com cliente, serviço, profissional, data e hora
- Ao clicar em horário vazio no Calendário, o formulário já abre preenchido com data, hora e profissional
- Pré-agendamentos: o cliente reserva pelo link online, fica pendente aguardando confirmação do admin
- Confirmar, cancelar ou remarcar agendamentos
- Registrar comparecimento ou falta do cliente
- Se não confirmado em 24h (ou tempo configurado), o pré-agendamento é cancelado automaticamente

### Calendário
- Visualização por dia ou semana com colunas separadas por profissional
- Cores: Azul = confirmado, Amarelo/Laranja = pré-agendamento pendente, Verde = atendido, Vermelho = cancelado/faltou, Cinza listrado = bloqueio
- Clicar em horário vazio para criar agendamento rapidamente
- Bloqueios aprovados aparecem como cinza e impedem novos agendamentos naquele período

### Bloqueios de Agenda
- Profissional solicita bloqueio informando: profissional, data, horário início/fim e motivo
- Bloqueios podem ser recorrentes: semanal (toda semana no mesmo dia) ou mensal (todo mês na mesma data)
- Status: Pendente (aguardando aprovação), Aprovado, Recusado
- Quem pode aprovar: dono da conta e usuários com permissão "Aprovar/recusar bloqueios"
- O dono pode aprovar o próprio bloqueio diretamente
- Após aprovação, o bloqueio aparece no calendário como cinza
- Relatório de bloqueios: mostra totais por status e gráfico dos motivos mais comuns

### Clientes
- Cadastrar clientes com nome, telefone, e-mail e data de nascimento
- Telefone é essencial para as mensagens automáticas de WhatsApp
- Ver histórico completo de agendamentos de cada cliente
- Prontuário: anotações, alergias, preferências e fotos — visível apenas para quem tem permissão
- Análise IA: classificação automática do perfil (Cliente Fiel, Em Crescimento, Em Risco de Perda, etc.) com dicas

### Equipe e Permissões
- Grupos de permissão: funcionam como "cargos" no sistema (ex: Recepcionista, Profissional, Gerente)
- Cada grupo tem permissões configuráveis por módulo
- O grupo Administradores tem acesso total e não pode ser editado nem excluído
- O dono da conta é automaticamente Administrador
- Escopo de visibilidade por grupo: "Próprio" (só vê os próprios dados) ou "Todos" (vê dados de toda a equipe)
  - Escopos se aplicam separadamente para: Notificações, Agenda, Calendário e Financeiro
  - Financeiro Próprio = profissional vê apenas sua receita e comissões; Financeiro Todos = vê dados consolidados da empresa
- Permissões disponíveis por módulo:
  * Atendimentos: ver, criar, editar, concluir, remarcar, cancelar
  * Clientes: ver, cadastrar, editar, ver histórico, ver prontuário, editar prontuário, excluir
  * Agenda e Bloqueios: solicitar bloqueio, aprovar/recusar bloqueios, ver bloqueios de todos
  * Financeiro: acessar módulo, ver comissões, editar comissões, marcar como pago, ver receita, ver custos, ver relatórios
  * Profissionais: ver, cadastrar, editar, gerenciar permissões, excluir
  * Serviços: ver, cadastrar, editar, excluir
  * Pacotes: ver, criar/editar, excluir
  * Automações: ver, criar, editar, ativar/desativar, excluir
  * Relatórios e Dashboard: acessar dashboard, ver métricas, ver relatórios, exportar
  * Sistema e Usuários: receber notificações, ver configurações, editar configurações, ver usuários, cadastrar usuários

### Notificações
- Avisos automáticos sobre: pré-agendamentos, bloqueios pendentes, pacotes vencendo, limites de plano, etc.
- Número vermelho no sino indica notificações não lidas
- Ação inline: aprovar ou recusar bloqueio direto da notificação, sem precisar ir à tela de Bloqueios
- Ao recusar, abre caixa para escrever o motivo
- Remover notificação: passar o mouse e clicar no X (desktop) ou deslizar para a esquerda (celular)
- Limpar tudo: botão no topo da tela de Notificações (ação irreversível)
- Limpeza automática: notificações com mais de 30 dias são removidas automaticamente toda madrugada

### Pacotes
- Combos de serviços pré-pagos com sessões e validade em dias
- Criar pacote: nome, serviços incluídos, quantidade de sessões, preço e validade
- Vender pacote para um cliente e registrar os créditos
- Usar pacote em agendamento: o sistema mostra créditos disponíveis e desconta automaticamente
- Alertas automáticos a cada 6h: avisa quando pacote vence em até 7 dias ou restam 1-2 sessões
- Pacotes vencidos não podem ser utilizados

### Financeiro
- Registrar receitas e custos com valor, descrição, data e categoria
- Comissões: ao concluir atendimento, se a profissional já tem percentual configurado E o pagamento já foi registrado, a comissão é criada automaticamente sem abrir modal
- Se faltar alguma informação, o modal de comissão abre para preencher
- Formas de pagamento: Dinheiro, PIX, Cartão, etc.
- Profissional só vê as próprias comissões; administradores veem todas
- Fluxo de Caixa: 3 números principais (Receita do Mês, Despesas, Saldo). A receita vem dos pagamentos reais dos agendamentos, não de lançamentos manuais
- Relatórios financeiros com filtros por período, profissional e categoria
- Exportação de dados disponível

### Automações (Mensagens Automáticas)
- Criar fluxos automáticos de mensagem via WhatsApp
- Gatilhos disponíveis: agendamento confirmado, 1 dia antes, pacote vencendo, aniversário, etc.
- Variáveis de mensagem: {{nome_cliente}}, {{primeiro_nome}}, {{data}}, {{hora}}, {{servico}}, {{profissional}}, {{empresa}}
- Fila de Envios: mostra todas as mensagens enviadas ou agendadas para envio
- Status de envio: Pendente, Enviado, Falhou, Cancelado. Cancelado ocorre quando o agendamento é excluído ou a automação é desativada antes do envio
- Desativar uma automação cancela imediatamente todos os envios pendentes dela
- Mensagens com status Falhou ou Cancelado podem ser reenviadas manualmente pelo histórico do agendamento
- Automações do Sistema: templates padrão criados automaticamente, aparecem em seção separada no final da lista
- Alerta amarelo aparece no topo da tela quando o WhatsApp está desconectado, com botão para reconectar

### WhatsApp
- Conectar WhatsApp Business escaneando QR Code em Dispositivos Vinculados
- Usar WhatsApp Business da empresa (não o pessoal, para evitar bloqueios)
- Conexão fica ativa em segundo plano mesmo após fechar a tela
- Se cair, basta reconectar escaneando o QR Code novamente
- Envio manual de mensagens para clientes

### Assinatura e Planos
- Planos disponíveis: Hubly Solo, Hubly Plus e Hubly Pro com recursos e limites diferentes
- Alerta automático ao atingir 80% do limite de qualquer recurso
- Ao atingir 100%, não é possível cadastrar novos registros daquele tipo
- Upgrade disponível em Assinatura > Ver Planos

### Configurações
- Dados do negócio: nome, telefone, endereço, CNPJ, logotipo, horário de funcionamento
- Link de agendamento online personalizado para clientes agendarem
- Configurar reserva de horário: valor adiantado e tempo de expiração do pré-agendamento
- Personalizar cores do sistema

### Pipeline (Kanban)
- Organizar leads e oportunidades em colunas personalizadas
- Criar cartões com título, status, lembrete e cliente vinculado
- Arrastar cartões entre colunas
- Configurar múltiplos pipelines

### IA Inteligente
- Score de Saúde Financeira: nota de 0 a 100 com análise automática dos dados financeiros
- Alertas proativos: avisos automáticos sobre riscos e oportunidades
- Chat financeiro: conversar com IA sobre os dados do negócio
- Análise de Clientes: classificação automática de todos os clientes com insights

### Importação Zandu
- Importar clientes, serviços, profissionais e agendamentos do sistema Zandu
- Necessário ter o token de API do Zandu (gerado em Ferramentas > API no Zandu)
- Importar na ordem: Clientes > Serviços > Profissionais > Agendamentos

## Instruções de comportamento:
- Responda sempre em português do Brasil
- Use linguagem simples, amigável e acolhedora — como se estivesse conversando com uma amiga
- Seja direta e prática: explique o passo a passo quando necessário
- Se a pergunta for sobre algo que o sistema não faz, diga claramente e sugira uma alternativa
- Nunca invente funcionalidades que não existem
- Quando explicar um passo a passo, use numeração clara (1. 2. 3.)
- Mantenha respostas concisas mas completas
- Use exemplos do dia a dia para facilitar o entendimento`;

export const suporteRouter = router({
  // ─── Chamados ────────────────────────────────────────────────────────────────
  abrirChamado: protectedProcedure
    .input(z.object({
      titulo: z.string().min(5),
      descricao: z.string().min(10),
      prioridade: z.enum(["baixa", "media", "alta", "critica"]).default("media"),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const empresa = await getEmpresaDoContexto(ctx.user.id, ctx.systemUser?.empresaId);
      if (!db || !empresa) throw new Error("Empresa não encontrada");
      const slaMap: Record<string, number> = { baixa: 72, media: 48, alta: 24, critica: 4 };
      const slaHoras = slaMap[input.prioridade] ?? 48;
      const slaVencidoEm = new Date(Date.now() + slaHoras * 3600000);
      const [res] = await db.insert(chamados).values({
        empresaId: empresa.id,
        titulo: input.titulo,
        status: "aberto",
        prioridade: input.prioridade,
        slaHoras,
        slaVencidoEm,
      });
      const chamadoId = (res as any).insertId as number;
      await db.insert(chamadoMensagens).values({
        chamadoId,
        autorTipo: "cliente",
        autorId: ctx.user.id,
        autorNome: ctx.user.name,
        conteudo: input.descricao,
        lido: false,
      });
      // Notificar o owner da Orizontech (userId do owner da empresa principal)
      try {
        const { notifyOwner } = await import('../_core/notification.js');
        await notifyOwner({
          title: `🎫 Novo chamado: ${input.titulo}`,
          content: `Empresa: ${empresa.nome ?? `#${empresa.id}`} · Prioridade: ${input.prioridade}\n${input.descricao.slice(0, 200)}`,
        });
      } catch (e) {
        console.error('[Suporte] Erro ao notificar owner:', e);
      }
      return { chamadoId };
    }),

  listarMeusChamados: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      const empresa = await getEmpresaDoContexto(ctx.user.id, ctx.systemUser?.empresaId);
      if (!db || !empresa) return [];
      return db.select().from(chamados)
        .where(eq(chamados.empresaId, empresa.id))
        .orderBy(desc(chamados.createdAt));
    }),

  getChamadoMensagens: protectedProcedure
    .input(z.object({ chamadoId: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      const empresa = await getEmpresaDoContexto(ctx.user.id, ctx.systemUser?.empresaId);
      if (!db || !empresa) return [];
      const [chamado] = await db.select().from(chamados)
        .where(and(eq(chamados.id, input.chamadoId), eq(chamados.empresaId, empresa.id)));
      if (!chamado) throw new Error("Chamado não encontrado");
      return db.select().from(chamadoMensagens)
        .where(eq(chamadoMensagens.chamadoId, input.chamadoId))
        .orderBy(chamadoMensagens.createdAt);
    }),

  responderChamadoCliente: protectedProcedure
    .input(z.object({ chamadoId: z.number(), mensagem: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const empresa = await getEmpresaDoContexto(ctx.user.id, ctx.systemUser?.empresaId);
      if (!db || !empresa) throw new Error("Empresa não encontrada");
      const [chamado] = await db.select().from(chamados)
        .where(and(eq(chamados.id, input.chamadoId), eq(chamados.empresaId, empresa.id)));
      if (!chamado) throw new Error("Chamado não encontrado");
      await db.insert(chamadoMensagens).values({
        chamadoId: input.chamadoId,
        autorTipo: "cliente",
        autorId: ctx.user.id,
        autorNome: ctx.user.name,
        conteudo: input.mensagem,
        lido: false,
      });
      await db.update(chamados).set({ status: "em_atendimento", updatedAt: new Date() })
        .where(eq(chamados.id, input.chamadoId));
      return { ok: true };
    }),

  avaliarChamado: protectedProcedure
    .input(z.object({ chamadoId: z.number(), nota: z.number().min(1).max(5), comentario: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const empresa = await getEmpresaDoContexto(ctx.user.id, ctx.systemUser?.empresaId);
      if (!db || !empresa) throw new Error("Empresa não encontrada");
      await db.update(chamados).set({
        avaliacaoNota: input.nota,
        avaliacaoComentario: input.comentario ?? null,
        status: "fechado",
        fechadoEm: new Date(),
      }).where(and(eq(chamados.id, input.chamadoId), eq(chamados.empresaId, empresa.id)));
      return { ok: true };
    }),

  // ─── Endpoints públicos para painel de atendimento Orizontech ──────────────

  /** Lista todos os chamados (sem autenticação — painel interno Orizontech) */
  adminListarChamados: publicProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) return [];
      const rows = await db
        .select({
          id: chamados.id,
          empresaId: chamados.empresaId,
          titulo: chamados.titulo,
          status: chamados.status,
          prioridade: chamados.prioridade,
          slaVencidoEm: chamados.slaVencidoEm,
          primeiraRespostaEm: chamados.primeiraRespostaEm,
          avaliacaoNota: chamados.avaliacaoNota,
          createdAt: chamados.createdAt,
          updatedAt: chamados.updatedAt,
          nomeEmpresa: empresas.nome,
        })
        .from(chamados)
        .leftJoin(empresas, eq(chamados.empresaId, empresas.id))
        .orderBy(desc(chamados.updatedAt));
      return rows;
    }),

  /** Busca mensagens de um chamado (sem autenticação) */
  adminGetMensagens: publicProcedure
    .input(z.object({ chamadoId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db
        .select()
        .from(chamadoMensagens)
        .where(eq(chamadoMensagens.chamadoId, input.chamadoId))
        .orderBy(chamadoMensagens.createdAt);
    }),

  /** Responde um chamado como agente (sem autenticação) e envia push ao cliente */
  adminResponderChamado: publicProcedure
    .input(z.object({
      chamadoId: z.number(),
      mensagem: z.string().min(1),
      agenteNome: z.string().default("Suporte Hubly"),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Banco não disponível");
      const [chamado] = await db.select().from(chamados).where(eq(chamados.id, input.chamadoId));
      if (!chamado) throw new Error("Chamado não encontrado");
      await db.insert(chamadoMensagens).values({
        chamadoId: input.chamadoId,
        autorTipo: "agente",
        autorId: null,
        autorNome: input.agenteNome,
        conteudo: input.mensagem,
        lido: false,
      });
      // Atualizar status e primeiraRespostaEm
      if (!chamado.primeiraRespostaEm) {
        await db.update(chamados).set({ status: "em_atendimento", updatedAt: new Date(), primeiraRespostaEm: new Date() }).where(eq(chamados.id, input.chamadoId));
      } else {
        await db.update(chamados).set({ status: "em_atendimento", updatedAt: new Date() }).where(eq(chamados.id, input.chamadoId));
      }
      // Enviar push para todos os usuários da empresa
      try {
        await sendPushToEmpresa(chamado.empresaId, {
          title: "Resposta do suporte Hubly",
          body: input.mensagem.length > 100 ? input.mensagem.slice(0, 97) + "..." : input.mensagem,
          tag: `chamado-${input.chamadoId}`,
          url: "/admin/suporte",
          data: { chamadoId: input.chamadoId },
        });
      } catch (e) {
        console.error("[Suporte] Erro ao enviar push:", e);
      }
      return { ok: true };
    }),

  /** Altera o status de um chamado (sem autenticação) */
  adminAtualizarStatus: publicProcedure
    .input(z.object({
      chamadoId: z.number(),
      status: z.enum(["aberto", "em_atendimento", "aguardando_cliente", "resolvido", "fechado"]),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Banco não disponível");
      if (input.status === "resolvido") {
        await db.update(chamados).set({ status: input.status, updatedAt: new Date(), resolvidoEm: new Date() }).where(eq(chamados.id, input.chamadoId));
      } else if (input.status === "fechado") {
        await db.update(chamados).set({ status: input.status, updatedAt: new Date(), fechadoEm: new Date() }).where(eq(chamados.id, input.chamadoId));
      } else {
        await db.update(chamados).set({ status: input.status, updatedAt: new Date() }).where(eq(chamados.id, input.chamadoId));
      }
      return { ok: true };
    }),

  /** Atualiza a prioridade de um chamado */
  adminAtualizarPrioridade: publicProcedure
    .input(z.object({
      chamadoId: z.number(),
      prioridade: z.enum(["baixa", "media", "alta", "critica"]),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Banco não disponível");
      await db.update(chamados).set({ prioridade: input.prioridade, updatedAt: new Date() }).where(eq(chamados.id, input.chamadoId));
      return { ok: true };
    }),

  /** Métricas rápidas para o painel de atendimento */
  adminGetMetricas: publicProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) return { abertos: 0, slaVencidos: 0, resolvidosHoje: 0, tempoMedioResposta: null };
      const todos = await db.select({
        id: chamados.id,
        status: chamados.status,
        slaVencidoEm: chamados.slaVencidoEm,
        primeiraRespostaEm: chamados.primeiraRespostaEm,
        createdAt: chamados.createdAt,
        resolvidoEm: chamados.resolvidoEm,
      }).from(chamados);
      const agora = new Date();
      const hoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
      const abertos = todos.filter(c => c.status === "aberto" && !c.primeiraRespostaEm).length;
      const slaVencidos = todos.filter(c =>
        c.slaVencidoEm && new Date(c.slaVencidoEm) < agora &&
        c.status !== "resolvido" && c.status !== "fechado"
      ).length;
      const resolvidosHoje = todos.filter(c =>
        c.resolvidoEm && new Date(c.resolvidoEm) >= hoje
      ).length;
      const comResposta = todos.filter(c => c.primeiraRespostaEm && c.createdAt);
      const tempoMedioResposta = comResposta.length > 0
        ? Math.round(comResposta.reduce((acc, c) => {
            return acc + (new Date(c.primeiraRespostaEm!).getTime() - new Date(c.createdAt!).getTime());
          }, 0) / comResposta.length / 60000)
        : null;
      return { abertos, slaVencidos, resolvidosHoje, tempoMedioResposta };
    }),

  /** Verifica senha do painel de atendimento */
  adminVerificarSenha: publicProcedure
    .input(z.object({ senha: z.string() }))
    .mutation(async ({ input }) => {
      const senhaCorreta = process.env.SUPPORT_ADMIN_PASSWORD ?? "hubly2024";
      if (input.senha !== senhaCorreta) throw new Error("Senha incorreta");
      return { ok: true };
    }),

  // ─── Chat IA ─────────────────────────────────────────────────────────────────
  chat: protectedProcedure
    .input(z.object({
      messages: z.array(z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      })),
      paginaAtual: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const systemWithContext = input.paginaAtual
        ? `${SYSTEM_PROMPT}\n\n## Contexto atual\nA usuária está na página: ${input.paginaAtual}`
        : SYSTEM_PROMPT;

      const response = await invokeOpenAI({
        messages: [
          { role: "system", content: systemWithContext },
          ...input.messages,
        ],
      });

      const content = response.choices?.[0]?.message?.content;
      return { reply: typeof content === "string" ? content : String(content ?? "") };
    }),
});
