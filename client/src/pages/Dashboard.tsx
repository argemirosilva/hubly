import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Link } from "wouter";
import {
  Calendar, Users, TrendingUp, DollarSign,
  ArrowUpRight, ArrowDownRight, Plus, ChevronRight,
  Sparkles, Clock, CheckCircle2, AlertCircle, Zap, Brain,
  Gem, MessageCircle, CalendarCheck, ArrowRight
} from "lucide-react";
import { useState, useMemo } from "react";
import NovaAgendaModal from "@/components/NovaAgendaModal";

const statusConfig: Record<string, { label: string; bg: string; color: string }> = {
  pre_agendado:       { label: "Pré-agendado",    bg: "oklch(55% 0.22 264 / 12%)", color: "oklch(45% 0.18 264)" },
  aguardando_reserva: { label: "Aguard. Reserva", bg: "oklch(72% 0.16 80 / 14%)",  color: "oklch(42% 0.14 75)" },
  agendado:           { label: "Agendado",        bg: "oklch(55% 0.22 264 / 12%)", color: "oklch(45% 0.18 264)" },
  confirmado:         { label: "Confirmado",      bg: "oklch(62% 0.18 155 / 14%)", color: "oklch(35% 0.14 155)" },
  em_andamento:       { label: "Em andamento",    bg: "oklch(68% 0.18 80 / 14%)",  color: "oklch(38% 0.14 80)" },
  concluido:          { label: "Concluído",       bg: "oklch(55% 0.04 260 / 10%)", color: "oklch(40% 0.04 260)" },
  cancelado:          { label: "Cancelado",       bg: "oklch(58% 0.22 25 / 12%)",  color: "oklch(40% 0.18 25)" },
  faltou:             { label: "Faltou",          bg: "oklch(58% 0.22 25 / 12%)",  color: "oklch(40% 0.18 25)" },
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function saudacao(nome?: string) {
  const h = new Date().getHours();
  const greeting = h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
  return nome ? `${greeting}, ${nome.split(" ")[0]}! ` : `${greeting}! `;
}

// ─── Componente de status do plano ──────────────────────────────────────────
type PlanoStatus = {
  plan: string;
  planLabel: string;
  usage: {
    agendamentosCount: number;
    agendamentosLimit: number;
    agendamentosPercent: number;
    notificacoesWhatsappCount: number;
    notificacoesWhatsappLimit: number;
  };
} | null | undefined;

const PLAN_COLORS: Record<string, { gradient: string; badge: string; badgeText: string }> = {
  FREE:  { gradient: "oklch(55% 0.04 260)", badge: "oklch(94% 0.008 250)", badgeText: "oklch(35% 0.012 260)" },
  SOLO:  { gradient: "oklch(55% 0.22 264)", badge: "oklch(55% 0.22 264 / 12%)", badgeText: "oklch(35% 0.18 264)" },
  PLUS:  { gradient: "oklch(55% 0.22 290)", badge: "oklch(55% 0.22 290 / 12%)", badgeText: "oklch(35% 0.18 290)" },
  PRO:   { gradient: "oklch(62% 0.20 60)",  badge: "oklch(62% 0.20 60 / 12%)",  badgeText: "oklch(38% 0.16 60)" },
};

function UsageBar({ label, icon: Icon, count, limit, percent }: {
  label: string;
  icon: React.ElementType;
  count: number;
  limit: number;
  percent: number;
}) {
  const isUnlimited = limit === -1;
  const isWarning = !isUnlimited && percent >= 80;
  const isCritical = !isUnlimited && percent >= 95;
  const barColor = isCritical
    ? "oklch(55% 0.22 25)"
    : isWarning
    ? "oklch(65% 0.20 75)"
    : "oklch(55% 0.22 264)";
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Icon className="w-3 h-3 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
        <span className="text-xs font-semibold" style={{ color: isCritical ? "oklch(40% 0.18 25)" : isWarning ? "oklch(42% 0.14 75)" : "oklch(35% 0.012 260)" }}>
          {isUnlimited ? `${count} / ∞` : `${count} / ${limit}`}
        </span>
      </div>
      <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: isUnlimited ? "0%" : `${Math.min(percent, 100)}%`, background: barColor }}
        />
      </div>
    </div>
  );
}

function PlanStatusCard({ statusPlano }: { statusPlano: PlanoStatus }) {
  if (!statusPlano) return null;
  const colors = PLAN_COLORS[statusPlano.plan] ?? PLAN_COLORS.FREE;
  const isFree = statusPlano.plan === "FREE";
  const { usage } = statusPlano;
  const hasWarning = (usage.agendamentosPercent >= 80 && usage.agendamentosLimit !== -1)
    || (usage.agendamentosLimit !== -1 && usage.agendamentosPercent >= 80);

  return (
    <div className="card-elegant p-4 space-y-3">
      {/* Header do plano */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: colors.badge }}>
            <Gem className="w-3.5 h-3.5" style={{ color: colors.badgeText }} />
          </div>
          <div>
            <p className="text-xs text-muted-foreground leading-none mb-0.5">Plano atual</p>
            <p className="text-sm font-bold tracking-tight" style={{ color: colors.badgeText }}>
              {statusPlano.planLabel}
            </p>
          </div>
        </div>
        <Link href="/admin/planos">
          <button className="text-xs font-medium flex items-center gap-0.5 hover:opacity-80 transition-opacity"
            style={{ color: colors.badgeText }}>
            {isFree ? "Fazer upgrade" : "Gerenciar"}
            <ArrowRight className="w-3 h-3" />
          </button>
        </Link>
      </div>

      {/* Barras de uso */}
      <div className="space-y-2.5 pt-1 border-t" style={{ borderColor: "oklch(92% 0.008 250)" }}>
        <UsageBar
          label="Agendamentos/mês"
          icon={CalendarCheck}
          count={usage.agendamentosCount}
          limit={usage.agendamentosLimit}
          percent={usage.agendamentosPercent}
        />
        <UsageBar
          label="WhatsApp/mês"
          icon={MessageCircle}
          count={usage.notificacoesWhatsappCount}
          limit={usage.notificacoesWhatsappLimit}
          percent={usage.notificacoesWhatsappLimit > 0
            ? Math.round((usage.notificacoesWhatsappCount / usage.notificacoesWhatsappLimit) * 100)
            : 0}
        />
      </div>

      {/* CTA de upgrade se perto do limite */}
      {hasWarning && (
        <Link href="/admin/planos">
          <div className="mt-1 px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2 cursor-pointer"
            style={{ background: "oklch(55% 0.22 25 / 10%)", color: "oklch(38% 0.18 25)" }}>
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            Limite próximo — faça upgrade
          </div>
        </Link>
      )}
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [novaAgendaOpen, setNovaAgendaOpen] = useState(false);
  const today = new Date().toISOString().split("T")[0];

  // Detectar se o usuário logado é um profissional vinculado
  // auth.me retorna profissionalId quando é um system_user com vínculo
  const { data: meData } = trpc.auth.me.useQuery();
  const profissionalIdVinculado = (meData as any)?.profissionalId ?? null;
  const isProfissional = !!profissionalIdVinculado;

  const { data: empresa } = trpc.empresa.get.useQuery();
  // Passa profissionalId automaticamente — backend filtra se vinculado, admin recebe null e vê tudo
  const { data: metrics } = trpc.financeiro.dashboard.useQuery(
    isProfissional ? { profissionalId: profissionalIdVinculado } : undefined
  );
  const { data: scoreIA } = trpc.iaFinanceiro.getScore.useQuery();
  const { data: alertasIA } = trpc.iaFinanceiro.getAlertas.useQuery({ apenasNaoLidos: true });
  const alertasNaoLidos = (alertasIA ?? []).length;
  // Agenda do dia: filtrar por profissional se vinculado
  const { data: agendamentosHoje } = trpc.agendamentos.list.useQuery(
    isProfissional
      ? { dataInicio: today, dataFim: today, profissionalId: profissionalIdVinculado }
      : { dataInicio: today, dataFim: today }
  );
  const { data: clientes } = trpc.clientes.list.useQuery();
  const { data: profissionais } = trpc.profissionais.list.useQuery();
  const { data: servicos } = trpc.servicos.list.useQuery();
  const { data: statusPlano } = trpc.planos.getStatus.useQuery();

  const profMap = useMemo(() => {
    const m: Record<number, { nome: string; cor: string }> = {};
    profissionais?.forEach(p => { m[p.id] = { nome: p.nome, cor: p.corCalendario ?? "oklch(55% 0.22 264)" }; });
    return m;
  }, [profissionais]);

  const clienteMap = useMemo(() => {
    const m: Record<number, string> = {};
    clientes?.forEach(c => { m[c.id] = c.nome; });
    return m;
  }, [clientes]);

  const servicoMap = useMemo(() => {
    const m: Record<number, string> = {};
    servicos?.forEach(s => { m[s.id] = s.nome; });
    return m;
  }, [servicos]);

  const agendamentosOrdenados = useMemo(() =>
    [...(agendamentosHoje ?? [])].sort((a, b) => a.horaInicio.localeCompare(b.horaInicio)),
    [agendamentosHoje]
  );

  const variacaoReceita = metrics && metrics.receitaMesAnterior > 0
    ? ((metrics.receitaMes - metrics.receitaMesAnterior) / metrics.receitaMesAnterior) * 100
    : 0;

  const dataFormatada = new Date().toLocaleDateString("pt-BR", {
    weekday: "long", day: "numeric", month: "long"
  });

  // Agendamentos pendentes de confirmação
  const pendentes = agendamentosOrdenados.filter(a =>
    a.status === "aguardando_reserva" || a.status === "pre_agendado"
  ).length;

  if (!empresa) {
    return (
      <div className="flex items-center justify-center min-h-screen p-8">
        <div className="text-center max-w-sm space-y-5">
          <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mx-auto">
            <Sparkles className="w-7 h-7 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight mb-2">Configure sua empresa</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Para começar a usar o Agendei, configure as informações do seu estabelecimento.
            </p>
          </div>
          <Link href="/admin/configuracoes">
            <button className="btn-primary mx-auto">
              Configurar agora <ChevronRight className="w-4 h-4" />
            </button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-7 max-w-7xl mx-auto space-y-5 animate-in-up">

      {/*  Header  */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground font-medium capitalize mb-0.5 hidden sm:block">{dataFormatada}</p>
          <h1 className="font-bold tracking-tight text-xl lg:text-2xl truncate">
            {saudacao(user?.name ?? undefined)}
          </h1>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-xs sm:text-sm text-muted-foreground truncate">{empresa.nome}</p>
            {isProfissional && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
                style={{ background: "oklch(55% 0.22 264 / 12%)", color: "oklch(35% 0.18 264)" }}>
                <span className="w-1.5 h-1.5 rounded-full bg-current" />
                Minha agenda
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {pendentes > 0 && (
            <Link href="/admin/agendamentos">
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
                style={{ background: "oklch(72% 0.16 80 / 15%)", color: "oklch(40% 0.14 75)" }}>
                <AlertCircle className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{pendentes} pendente{pendentes > 1 ? "s" : ""}</span>
                <span className="sm:hidden">{pendentes}</span>
              </div>
            </Link>
          )}
          <button
            onClick={() => setNovaAgendaOpen(true)}
            className="btn-primary py-2 px-3 text-xs">
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Novo Agendamento</span>
            <span className="sm:hidden">Novo</span>
          </button>
        </div>
      </div>

      {/*  Stats  */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            label: "Hoje",
            value: String(agendamentosHoje?.length ?? 0),
            sub: "agendamentos",
            icon: Calendar,
            iconBg: "oklch(55% 0.22 264 / 12%)",
            iconColor: "oklch(45% 0.18 264)",
          },
          {
            label: "Receita do mês",
            value: formatCurrency(metrics?.receitaMes ?? 0),
            sub: variacaoReceita !== 0
              ? `${variacaoReceita >= 0 ? "+" : ""}${variacaoReceita.toFixed(0)}% vs anterior`
              : "Mês atual",
            trend: variacaoReceita,
            icon: DollarSign,
            iconBg: "oklch(62% 0.18 155 / 12%)",
            iconColor: "oklch(38% 0.14 155)",
          },
          {
            label: "Clientes",
            value: String(metrics?.totalClientes ?? 0),
            sub: "cadastrados",
            icon: Users,
            iconBg: "oklch(60% 0.20 300 / 12%)",
            iconColor: "oklch(42% 0.16 300)",
          },
          {
            label: "Conversão",
            value: `${metrics?.taxaConversao ?? 0}%`,
            sub: "concluídos / total",
            icon: TrendingUp,
            iconBg: "oklch(68% 0.18 80 / 12%)",
            iconColor: "oklch(40% 0.14 80)",
          },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="stat-card">
              <div className="flex items-start justify-between mb-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: stat.iconBg }}>
                  <Icon className="w-4 h-4" style={{ color: stat.iconColor }} />
                </div>
                {stat.trend !== undefined && (
                  <div className="flex items-center gap-0.5 text-xs font-semibold"
                    style={{ color: stat.trend >= 0 ? "oklch(38% 0.14 155)" : "oklch(40% 0.18 25)" }}>
                    {stat.trend >= 0
                      ? <ArrowUpRight className="w-3.5 h-3.5" />
                      : <ArrowDownRight className="w-3.5 h-3.5" />}
                    {Math.abs(stat.trend).toFixed(0)}%
                  </div>
                )}
              </div>
              <p className="text-2xl font-bold tracking-tight text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                <span className="font-medium text-foreground/70">{stat.label}</span> · {stat.sub}
              </p>
            </div>
          );
        })}
      </div>

      {/*  Main grid  */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Agenda do dia */}
        <div className="lg:col-span-2 card-elegant overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4"
            style={{ borderBottom: "1px solid oklch(90% 0.012 250)" }}>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: "oklch(55% 0.22 264 / 10%)" }}>
                <Clock className="w-4 h-4" style={{ color: "oklch(45% 0.18 264)" }} />
              </div>
              <div>
                <h3 className="font-semibold text-sm tracking-tight">Agenda de Hoje</h3>
                <p className="text-xs text-muted-foreground">
                  {agendamentosOrdenados.length} atendimento{agendamentosOrdenados.length !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
            <Link href="/admin/calendario">
              <button className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
                Ver calendário <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </Link>
          </div>

          {agendamentosOrdenados.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-center px-6">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
                style={{ background: "oklch(55% 0.22 264 / 8%)" }}>
                <Calendar className="w-5 h-5" style={{ color: "oklch(55% 0.22 264)" }} />
              </div>
              <p className="text-sm font-medium text-foreground mb-1">Nenhum agendamento hoje</p>
              <p className="text-xs text-muted-foreground mb-5">Que tal criar o primeiro?</p>
              <button onClick={() => setNovaAgendaOpen(true)} className="btn-primary text-xs py-1.5">
                <Plus className="w-3.5 h-3.5" /> Criar agendamento
              </button>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: "oklch(94% 0.008 250)" }}>
              {agendamentosOrdenados.map((ag) => {
                const cfg = statusConfig[ag.status] ?? statusConfig.agendado;
                const prof = profMap[ag.profissionalId];
                return (
                  <div key={ag.id}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors">
                    {/* Hora */}
                    <div className="text-center flex-shrink-0 w-10">
                      <p className="text-sm font-bold tracking-tight text-foreground">
                        {ag.horaInicio.slice(0, 5)}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {ag.horaFim.slice(0, 5)}
                      </p>
                    </div>

                    {/* Cor profissional */}
                    <div className="w-1 h-10 rounded-full flex-shrink-0"
                      style={{ background: prof?.cor ?? "oklch(55% 0.22 264)" }} />

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">
                        {clienteMap[ag.clienteId] ?? "Cliente"}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {servicoMap[ag.servicoId] ?? "Serviço"} · {prof?.nome?.split(" ")[0] ?? ""}
                      </p>
                    </div>

                    {/* Status */}
                    <span className="badge text-[10px] flex-shrink-0"
                      style={{ background: cfg.bg, color: cfg.color }}>
                      {cfg.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Painel lateral */}
        <div className="space-y-4">
          {/* Ações rápidas */}
          <div className="card-elegant p-4">
            <h3 className="font-semibold text-sm mb-3 tracking-tight">Ações Rápidas</h3>
            <div className="space-y-2">
              {[
                { label: "Novo agendamento", icon: Plus, action: () => setNovaAgendaOpen(true), primary: true },
                { label: "Ver calendário", icon: Calendar, href: "/admin/calendario" },
                { label: "Adicionar cliente", icon: Users, href: "/admin/clientes" },
                { label: "Ver automações", icon: Zap, href: "/admin/automacoes" },
              ].map((item) => {
                const Icon = item.icon;
                if (item.action) {
                  return (
                    <button key={item.label} onClick={item.action}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${item.primary ? "btn-primary justify-start" : "btn-ghost hover:bg-muted"}`}>
                      <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                      {item.label}
                    </button>
                  );
                }
                return (
                  <Link key={item.label} href={item.href!}>
                    <button className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-medium btn-ghost hover:bg-muted transition-all">
                      <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                      {item.label}
                    </button>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Resumo financeiro */}
          <div className="card-elegant p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm tracking-tight">Financeiro</h3>
              <Link href="/admin/financeiro">
                <button className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                  Ver tudo <ChevronRight className="w-3 h-3" />
                </button>
              </Link>
            </div>
            <div className="space-y-3">
              {[
                { label: "Receita bruta", value: formatCurrency(metrics?.receitaMes ?? 0), positive: true },
                { label: "Comissões pendentes", value: formatCurrency(metrics?.comissoesPendentes ?? 0), positive: false },
                { label: "Ticket médio", value: formatCurrency(metrics?.ticketMedio ?? 0), positive: true },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{item.label}</span>
                  <span className="text-xs font-bold"
                    style={{ color: item.positive ? "oklch(35% 0.14 155)" : "oklch(40% 0.18 25)" }}>
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Card IA Financeira */}
          <div className="card-elegant p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "oklch(55% 0.22 264 / 12%)" }}>
                  <Brain className="w-3.5 h-3.5" style={{ color: "oklch(45% 0.18 264)" }} />
                </div>
                <h3 className="font-semibold text-sm tracking-tight">Score Financeiro</h3>
              </div>
              <Link href="/admin/ia-financeiro">
                <button className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                  Detalhes <ChevronRight className="w-3 h-3" />
                </button>
              </Link>
            </div>
            {!scoreIA ? (
              <div className="text-center py-3">
                <p className="text-xs text-muted-foreground mb-2">Nenhuma análise ainda</p>
                <Link href="/admin/ia-financeiro">
                  <button className="text-xs font-medium" style={{ color: "oklch(45% 0.18 264)" }}>Calcular agora →</button>
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Score</span>
                  <div className="flex items-center gap-1.5">
                    <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${scoreIA.score}%`, background: scoreIA.status === 'saudavel' ? 'oklch(55% 0.18 155)' : scoreIA.status === 'atencao' ? 'oklch(65% 0.20 75)' : 'oklch(55% 0.22 25)' }} />
                    </div>
                    <span className="text-xs font-bold">{scoreIA.score}/100</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Status</span>
                  <span className="text-xs font-semibold" style={{ color: scoreIA.status === 'saudavel' ? 'oklch(38% 0.14 155)' : scoreIA.status === 'atencao' ? 'oklch(42% 0.14 75)' : 'oklch(40% 0.18 25)' }}>
                    {scoreIA.status === 'saudavel' ? ' Saudável' : scoreIA.status === 'atencao' ? ' Atenção' : ' Risco'}
                  </span>
                </div>
                {alertasNaoLidos > 0 && (
                  <div className="flex items-center gap-1.5 mt-1 px-2 py-1.5 rounded-lg" style={{ background: "oklch(55% 0.22 25 / 10%)" }}>
                    <AlertCircle className="w-3 h-3" style={{ color: "oklch(45% 0.22 25)" }} />
                    <span className="text-xs font-medium" style={{ color: "oklch(40% 0.18 25)" }}>{alertasNaoLidos} alerta{alertasNaoLidos > 1 ? 's' : ''} não lido{alertasNaoLidos > 1 ? 's' : ''}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Card de Plano e Uso */}
          <PlanStatusCard statusPlano={statusPlano} />

          {/* Profissionais ativos — oculto para profissionais vinculados (veem apenas seus dados) */}
          {!isProfissional && profissionais && profissionais.filter(p => p.ativo).length > 0 && (
            <div className="card-elegant p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm tracking-tight">Equipe</h3>
                <Link href="/admin/profissionais">
                  <button className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                    Gerenciar <ChevronRight className="w-3 h-3" />
                  </button>
                </Link>
              </div>
              <div className="space-y-2">
                {profissionais.filter(p => p.ativo).slice(0, 4).map(p => {
                  const agendamentosProf = agendamentosOrdenados.filter(a => a.profissionalId === p.id).length;
                  return (
                    <div key={p.id} className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-[11px] font-bold text-white"
                        style={{ background: p.corCalendario ?? "oklch(55% 0.22 264)" }}>
                        {p.nome.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{p.nome.split(" ")[0]}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" style={{ color: "oklch(55% 0.22 264)" }} />
                        <span className="text-[11px] font-semibold text-muted-foreground">{agendamentosProf}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {novaAgendaOpen && (
        <NovaAgendaModal
          open={novaAgendaOpen}
          onClose={() => setNovaAgendaOpen(false)}
        />
      )}
    </div>
  );
}
