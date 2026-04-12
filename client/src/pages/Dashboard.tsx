import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Link } from "wouter";
import {
  Calendar, Users, TrendingUp, DollarSign,
  ArrowUpRight, ArrowDownRight, Plus, ChevronRight,
  Sparkles, Clock, CheckCircle2, AlertCircle, Zap, Brain,
  Gem, MessageCircle, CalendarCheck, ArrowRight, CreditCard, AlertTriangle,
  KanbanSquare, Star, Settings2, GripVertical, Eye, EyeOff, RotateCcw, Save,
  LayoutDashboard, TrendingUp as TrendingUpIcon, CalendarDays,
} from "lucide-react";
import { useState, useMemo, useEffect, useCallback } from "react";
import NovaAgendaModal from "@/components/NovaAgendaModal";
import ReceitaDetalheModal from "@/components/ReceitaDetalheModal";
import { usePermissoes } from "@/hooks/usePermissoes";
import { getLocalDateString } from "@/lib/utils";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { toast } from "sonner";

// ─── Tipos ───────────────────────────────────────────────────────────────────
type WidgetSize = "sm" | "md" | "lg" | "full";
type WidgetConfig = { id: string; visible: boolean; order: number; size: WidgetSize };

// ─── Catálogo de widgets ──────────────────────────────────────────────────────
const WIDGET_CATALOG: Array<{
  id: string;
  title: string;
  description: string;
  defaultSize: WidgetSize;
  requiresPermission?: string;
  adminOnly?: boolean;
}> = [
  { id: "stats",          title: "Métricas Principais",    description: "Cards com agendamentos, receita, clientes e conversão", defaultSize: "full" },
  { id: "contas_pagar",   title: "Contas a Pagar",         description: "Vencidas, hoje e na semana",                           defaultSize: "full", requiresPermission: "financeiroVer" },
  { id: "agenda_hoje",    title: "Agenda de Hoje",         description: "Lista de atendimentos do dia",                         defaultSize: "lg" },
  { id: "acoes_rapidas",  title: "Ações Rápidas",          description: "Botões de acesso rápido",                              defaultSize: "sm" },
  { id: "financeiro",     title: "Resumo Financeiro",      description: "Receita, comissões e ticket médio",                    defaultSize: "sm", requiresPermission: "financeiroVer" },
  { id: "score_ia",       title: "Score Financeiro IA",    description: "Score de saúde financeira e alertas",                  defaultSize: "sm", requiresPermission: "financeiroVer" },
  { id: "pipeline",       title: "Pipeline Favorita",      description: "Mini-kanban da pipeline marcada como favorita",        defaultSize: "sm" },
  { id: "plano_uso",      title: "Plano e Uso",            description: "Status do plano e barras de consumo",                  defaultSize: "sm", adminOnly: true },
  { id: "equipe",         title: "Equipe",                 description: "Profissionais ativos e agendamentos do dia",           defaultSize: "sm", requiresPermission: "profissionaisVer" },
];

// ─── Layouts pré-definidos ───────────────────────────────────────────────────
type PresetLayout = { id: string; title: string; description: string; icon: React.ElementType; color: string; widgets: Array<{ id: string; visible: boolean; order: number; size: WidgetSize }> };

const PRESET_LAYOUTS: PresetLayout[] = [
  {
    id: "visao_geral",
    title: "Visão Geral",
    description: "Todos os widgets visíveis na ordem padrão",
    icon: LayoutDashboard,
    color: "oklch(55% 0.22 264)",
    widgets: [
      { id: "stats",         visible: true,  order: 0, size: "full" },
      { id: "contas_pagar",  visible: true,  order: 1, size: "full" },
      { id: "agenda_hoje",   visible: true,  order: 2, size: "lg" },
      { id: "acoes_rapidas", visible: true,  order: 3, size: "sm" },
      { id: "financeiro",    visible: true,  order: 4, size: "sm" },
      { id: "score_ia",      visible: true,  order: 5, size: "sm" },
      { id: "pipeline",      visible: true,  order: 6, size: "sm" },
      { id: "plano_uso",     visible: true,  order: 7, size: "sm" },
      { id: "equipe",        visible: true,  order: 8, size: "sm" },
    ],
  },
  {
    id: "foco_financeiro",
    title: "Foco Financeiro",
    description: "Métricas, contas, resumo financeiro e score IA em destaque",
    icon: TrendingUpIcon,
    color: "oklch(62% 0.18 155)",
    widgets: [
      { id: "stats",         visible: true,  order: 0, size: "full" },
      { id: "contas_pagar",  visible: true,  order: 1, size: "full" },
      { id: "financeiro",    visible: true,  order: 2, size: "sm" },
      { id: "score_ia",      visible: true,  order: 3, size: "sm" },
      { id: "pipeline",      visible: true,  order: 4, size: "sm" },
      { id: "plano_uso",     visible: true,  order: 5, size: "sm" },
      { id: "agenda_hoje",   visible: false, order: 6, size: "lg" },
      { id: "acoes_rapidas", visible: false, order: 7, size: "sm" },
      { id: "equipe",        visible: false, order: 8, size: "sm" },
    ],
  },
  {
    id: "agenda_dia",
    title: "Agenda do Dia",
    description: "Agenda, ações rápidas e equipe em foco",
    icon: CalendarDays,
    color: "oklch(65% 0.20 75)",
    widgets: [
      { id: "stats",         visible: true,  order: 0, size: "full" },
      { id: "agenda_hoje",   visible: true,  order: 1, size: "lg" },
      { id: "acoes_rapidas", visible: true,  order: 2, size: "sm" },
      { id: "equipe",        visible: true,  order: 3, size: "sm" },
      { id: "pipeline",      visible: true,  order: 4, size: "sm" },
      { id: "contas_pagar",  visible: false, order: 5, size: "full" },
      { id: "financeiro",    visible: false, order: 6, size: "sm" },
      { id: "score_ia",      visible: false, order: 7, size: "sm" },
      { id: "plano_uso",     visible: false, order: 8, size: "sm" },
    ],
  },
];

const DEFAULT_LAYOUT: WidgetConfig[] = WIDGET_CATALOG.map((w, i) => ({
  id: w.id,
  visible: true,
  order: i,
  size: w.defaultSize,
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────
const statusConfig: Record<string, { label: string; bg: string; color: string }> = {
  pre_agendado:       { label: "Pré-agendado",    bg: "oklch(72% 0.16 80 / 14%)",  color: "oklch(42% 0.14 75)" },
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

// ─── PlanStatusCard ───────────────────────────────────────────────────────────
type PlanoStatus = {
  plan: string; planLabel: string;
  usage: { agendamentosCount: number; agendamentosLimit: number; agendamentosPercent: number; notificacoesWhatsappCount: number; notificacoesWhatsappLimit: number; };
} | null | undefined;

const PLAN_COLORS: Record<string, { gradient: string; badge: string; badgeText: string }> = {
  FREE:  { gradient: "oklch(55% 0.04 260)", badge: "oklch(94% 0.008 250)", badgeText: "oklch(35% 0.012 260)" },
  SOLO:  { gradient: "oklch(55% 0.22 264)", badge: "oklch(55% 0.22 264 / 12%)", badgeText: "oklch(35% 0.18 264)" },
  PLUS:  { gradient: "oklch(55% 0.22 290)", badge: "oklch(55% 0.22 290 / 12%)", badgeText: "oklch(35% 0.18 290)" },
  PRO:   { gradient: "oklch(62% 0.20 60)",  badge: "oklch(62% 0.20 60 / 12%)",  badgeText: "oklch(38% 0.16 60)" },
};

function UsageBar({ label, icon: Icon, count, limit, percent }: { label: string; icon: React.ElementType; count: number; limit: number; percent: number }) {
  const isUnlimited = limit === -1;
  const isWarning = !isUnlimited && percent >= 80;
  const isCritical = !isUnlimited && percent >= 95;
  const barColor = isCritical ? "oklch(55% 0.22 25)" : isWarning ? "oklch(65% 0.20 75)" : "oklch(55% 0.22 264)";
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5"><Icon className="w-3 h-3 text-muted-foreground" /><span className="text-xs text-muted-foreground">{label}</span></div>
        <span className="text-xs font-semibold" style={{ color: isCritical ? "oklch(40% 0.18 25)" : isWarning ? "oklch(42% 0.14 75)" : "oklch(35% 0.012 260)" }}>
          {isUnlimited ? `${count} / ∞` : `${count} / ${limit}`}
        </span>
      </div>
      <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: isUnlimited ? "0%" : `${Math.min(percent, 100)}%`, background: barColor }} />
      </div>
    </div>
  );
}

function PlanStatusCard({ statusPlano }: { statusPlano: PlanoStatus }) {
  if (!statusPlano) return null;
  const colors = PLAN_COLORS[statusPlano.plan] ?? PLAN_COLORS.FREE;
  const isFree = statusPlano.plan === "FREE";
  const { usage } = statusPlano;
  const hasWarning = (usage.agendamentosPercent >= 80 && usage.agendamentosLimit !== -1);
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: colors.badge }}>
            <Gem className="w-3.5 h-3.5" style={{ color: colors.badgeText }} />
          </div>
          <div>
            <p className="text-xs text-muted-foreground leading-none mb-0.5">Plano atual</p>
            <p className="text-sm font-bold tracking-tight" style={{ color: colors.badgeText }}>{statusPlano.planLabel}</p>
          </div>
        </div>
        <Link href="/admin/planos">
          <button className="text-xs font-medium flex items-center gap-0.5 hover:opacity-80 transition-opacity" style={{ color: colors.badgeText }}>
            {isFree ? "Fazer upgrade" : "Gerenciar"}<ArrowRight className="w-3 h-3" />
          </button>
        </Link>
      </div>
      <div className="space-y-2.5 pt-1 border-t" style={{ borderColor: "oklch(92% 0.008 250)" }}>
        <UsageBar label="Agendamentos/mês" icon={CalendarCheck} count={usage.agendamentosCount} limit={usage.agendamentosLimit} percent={usage.agendamentosPercent} />
        <UsageBar label="WhatsApp/mês" icon={MessageCircle} count={usage.notificacoesWhatsappCount} limit={usage.notificacoesWhatsappLimit} percent={usage.notificacoesWhatsappLimit > 0 ? Math.round((usage.notificacoesWhatsappCount / usage.notificacoesWhatsappLimit) * 100) : 0} />
      </div>
      {hasWarning && (
        <Link href="/admin/planos">
          <div className="mt-1 px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2 cursor-pointer" style={{ background: "oklch(55% 0.22 25 / 10%)", color: "oklch(38% 0.18 25)" }}>
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />Limite próximo — faça upgrade
          </div>
        </Link>
      )}
    </div>
  );
}

// ─── SortableWidgetItem (modo edição) ─────────────────────────────────────────
function SortableWidgetItem({ widget, catalog, onToggle }: {
  widget: WidgetConfig;
  catalog: typeof WIDGET_CATALOG[0] | undefined;
  onToggle: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: widget.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  if (!catalog) return null;
  return (
    <div ref={setNodeRef} style={style}
      className="flex items-center gap-3 p-3 rounded-xl border bg-card hover:bg-muted/30 transition-colors">
      <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors p-0.5">
        <GripVertical className="w-4 h-4" />
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{catalog.title}</p>
        <p className="text-xs text-muted-foreground truncate">{catalog.description}</p>
      </div>
      <button
        onClick={() => onToggle(widget.id)}
        className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-all ${widget.visible ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
        {widget.visible ? <><Eye className="w-3.5 h-3.5" />Visível</> : <><EyeOff className="w-3.5 h-3.5" />Oculto</>}
      </button>
    </div>
  );
}

// ─── Dashboard principal ──────────────────────────────────────────────────────
export default function Dashboard() {
  const { user } = useAuth();
  const [novaAgendaOpen, setNovaAgendaOpen] = useState(false);
  const [receitaDetalheOpen, setReceitaDetalheOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [layout, setLayout] = useState<WidgetConfig[]>(DEFAULT_LAYOUT);
  const [layoutDirty, setLayoutDirty] = useState(false);
  const today = getLocalDateString();
  const [agendaPeriodo, setAgendaPeriodo] = useState<"hoje" | "semana" | "mes">("hoje");
  const [agendaDataInicio, setAgendaDataInicio] = useState(today);
  const [agendaDataFim, setAgendaDataFim] = useState(today);

  const aplicarPeriodoAgenda = (tipo: "hoje" | "semana" | "mes") => {
    const d = new Date();
    if (tipo === "hoje") {
      setAgendaDataInicio(today); setAgendaDataFim(today);
    } else if (tipo === "semana") {
      const dom = new Date(d); dom.setDate(d.getDate() - d.getDay());
      const sab = new Date(dom); sab.setDate(dom.getDate() + 6);
      setAgendaDataInicio(getLocalDateString(dom)); setAgendaDataFim(getLocalDateString(sab));
    } else {
      const ini = new Date(d.getFullYear(), d.getMonth(), 1);
      const fim = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      setAgendaDataInicio(getLocalDateString(ini)); setAgendaDataFim(getLocalDateString(fim));
    }
    setAgendaPeriodo(tipo);
  };

  const { pode, isOwner, isAdmin, hasFullAccess, profissionalId: profissionalIdVinculado } = usePermissoes();
  const isProfissional = !!profissionalIdVinculado;
  const podeVerFinanceiro = pode("financeiroVer");

  const { data: empresa } = trpc.empresa.get.useQuery();
  const { data: metrics } = trpc.financeiro.dashboard.useQuery(undefined);
  const { data: metricasPreAg } = trpc.agendamentos.metricasPreAgendamento.useQuery();
  const { data: scoreIA } = trpc.iaFinanceiro.getScore.useQuery();
  const { data: alertasIA } = trpc.iaFinanceiro.getAlertas.useQuery({ apenasNaoLidos: true });
  const alertasNaoLidos = (alertasIA ?? []).length;
  const { data: agendamentosHoje } = trpc.agendamentos.list.useQuery({ dataInicio: agendaDataInicio, dataFim: agendaDataFim });
  const { data: clientes } = trpc.clientes.list.useQuery();
  const { data: profissionais } = trpc.profissionais.list.useQuery();
  const { data: servicos } = trpc.servicos.list.useQuery();
  const { data: statusPlano } = trpc.planos.getStatus.useQuery();
  const { data: waStatus } = trpc.whatsapp.getStatus.useQuery(undefined, { staleTime: 30000, refetchInterval: 60000 });
  const waDesconectado = waStatus !== undefined && waStatus.status !== "connected" && waStatus.status !== "connecting" && waStatus.status !== "qr_ready";

  const [hojeStr] = useState(() => getLocalDateString());
  const [fimSemanaStr] = useState(() => { const d = new Date(); d.setDate(d.getDate() + 6); return getLocalDateString(d); });
  const { data: contasHoje } = trpc.contasPagar.list.useQuery({ status: "pendente", dataInicio: hojeStr, dataFim: hojeStr }, { enabled: podeVerFinanceiro });
  const { data: contasSemana } = trpc.contasPagar.list.useQuery({ status: "pendente", dataInicio: hojeStr, dataFim: fimSemanaStr }, { enabled: podeVerFinanceiro });
  const { data: contasVencidas } = trpc.contasPagar.list.useQuery({ status: "vencido" }, { enabled: podeVerFinanceiro });
  const { data: dashboardPipeline } = trpc.pipeline.getDashboardPipeline.useQuery();

  // Configuração salva do dashboard
  const { data: savedConfig, isLoading: configLoading } = trpc.dashboardConfig.get.useQuery();
  const saveConfig = trpc.dashboardConfig.save.useMutation({
    onSuccess: () => { toast.success("Layout salvo!"); setLayoutDirty(false); setEditMode(false); },
    onError: () => toast.error("Erro ao salvar layout"),
  });

  // Carregar config salva quando chegar do servidor
  useEffect(() => {
    if (savedConfig && savedConfig.length > 0) {
      // Mesclar com catálogo: adicionar widgets novos que não existem na config salva
      const savedIds = new Set(savedConfig.map((w: WidgetConfig) => w.id));
      const newWidgets = DEFAULT_LAYOUT.filter(w => !savedIds.has(w.id)).map((w, i) => ({
        ...w,
        order: savedConfig.length + i,
      }));
      const merged = [...savedConfig, ...newWidgets].sort((a: WidgetConfig, b: WidgetConfig) => a.order - b.order);
      setLayout(merged);
    }
  }, [savedConfig]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setLayout(prev => {
        const oldIndex = prev.findIndex(w => w.id === active.id);
        const newIndex = prev.findIndex(w => w.id === over.id);
        const reordered = arrayMove(prev, oldIndex, newIndex).map((w, i) => ({ ...w, order: i }));
        setLayoutDirty(true);
        return reordered;
      });
    }
  }, []);

  const toggleWidget = useCallback((id: string) => {
    setLayout(prev => prev.map(w => w.id === id ? { ...w, visible: !w.visible } : w));
    setLayoutDirty(true);
  }, []);

  const [activePresetId, setActivePresetId] = useState<string | null>(null);

  const applyPreset = useCallback((preset: PresetLayout) => {
    setLayout(preset.widgets);
    setActivePresetId(preset.id);
    setLayoutDirty(true);
    toast.success(`Layout "${preset.title}" aplicado! Clique em Salvar para confirmar.`);
  }, []);

  const resetLayout = useCallback(() => {
    setLayout(DEFAULT_LAYOUT);
    setActivePresetId(null);
    setLayoutDirty(true);
  }, []);

  const handleSave = useCallback(() => {
    saveConfig.mutate(layout);
  }, [layout, saveConfig]);

  const totalContasHoje = contasHoje?.reduce((acc, c) => acc + parseFloat(String(c.valor)), 0) ?? 0;
  const totalContasSemana = contasSemana?.reduce((acc, c) => acc + parseFloat(String(c.valor)), 0) ?? 0;
  const totalContasVencidas = contasVencidas?.reduce((acc, c) => acc + parseFloat(String(c.valor)), 0) ?? 0;

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

  const dataFormatada = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
  const pendentes = agendamentosOrdenados.filter(a => a.status === "pre_agendado").length;

  // Widgets ordenados e visíveis
  const sortedLayout = useMemo(() => [...layout].sort((a, b) => a.order - b.order), [layout]);

  // ─── Renderizadores de widgets ────────────────────────────────────────────
  const renderWidget = (widgetId: string) => {
    switch (widgetId) {
      case "stats":
        return (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: "Hoje", value: String(agendamentosHoje?.length ?? 0), sub: isProfissional ? "meus atendimentos" : "agendamentos", icon: Calendar, iconBg: "oklch(55% 0.22 264 / 12%)", iconColor: "oklch(45% 0.18 264)" },
              ...(podeVerFinanceiro || pode("financeiroVerComissoes") ? [{ label: isProfissional ? "Minha receita" : "Receita do mês", value: formatCurrency(metrics?.receitaMes ?? 0), sub: variacaoReceita !== 0 ? `${variacaoReceita >= 0 ? "+" : ""}${variacaoReceita.toFixed(0)}% vs anterior` : "Mês atual", trend: variacaoReceita, icon: DollarSign, iconBg: "oklch(62% 0.18 155 / 12%)", iconColor: "oklch(38% 0.14 155)", onClick: () => setReceitaDetalheOpen(true) }] : []),
              { label: isProfissional ? "Clientes atendidos" : "Clientes", value: String(metrics?.totalClientes ?? 0), sub: isProfissional ? "no mês" : "cadastrados", icon: Users, iconBg: "oklch(60% 0.20 300 / 12%)", iconColor: "oklch(42% 0.16 300)" },
              { label: "Conversão", value: `${metrics?.taxaConversao ?? 0}%`, sub: isProfissional ? "meus concluídos" : "concluídos / total", icon: TrendingUp, iconBg: "oklch(68% 0.18 80 / 12%)", iconColor: "oklch(40% 0.14 80)" },
              ...(!isProfissional && (metricasPreAg?.total ?? 0) > 0 ? [{ label: "Pré-reservas", value: `${metricasPreAg?.taxaConversao ?? 0}%`, sub: `${metricasPreAg?.convertidos ?? 0} de ${metricasPreAg?.total ?? 0} confirmados`, icon: CalendarCheck, iconBg: "oklch(60% 0.20 220 / 12%)", iconColor: "oklch(40% 0.16 220)" }] : []),
            ].map((stat) => {
              const Icon = stat.icon;
              const isClickable = !!(stat as any).onClick;
              return (
                <div key={stat.label} className={`stat-card ${isClickable ? "cursor-pointer hover:shadow-md hover:border-primary/20 transition-all" : ""}`} onClick={(stat as any).onClick}>
                  <div className="flex items-start justify-between mb-1.5">
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: stat.iconBg }}><Icon className="w-3 h-3" style={{ color: stat.iconColor }} /></div>
                    {(stat as any).trend !== undefined && (
                      <div className="flex items-center gap-0.5 text-[10px] font-semibold" style={{ color: (stat as any).trend >= 0 ? "oklch(38% 0.14 155)" : "oklch(40% 0.18 25)" }}>
                        {(stat as any).trend >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {Math.abs((stat as any).trend).toFixed(0)}%
                      </div>
                    )}
                  </div>
                  <p className="text-base font-bold tracking-tight text-foreground">{stat.value}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5"><span className="font-medium text-foreground/70">{stat.label}</span> · {stat.sub}</p>
                </div>
              );
            })}
          </div>
        );

      case "contas_pagar":
        if (!podeVerFinanceiro) return null;
        return (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 lg:gap-2">
            <Link href="/admin/contas-pagar?filtro=vencidas">
                <div className="stat-card cursor-pointer hover:shadow-md transition-shadow border-l-4" style={{ borderLeftColor: "oklch(55% 0.22 25)" }}>
                <div className="flex items-start justify-between mb-1 lg:mb-1.5">
                  <div className="w-5 h-5 lg:w-6 lg:h-6 rounded-md lg:rounded-lg flex items-center justify-center" style={{ background: "oklch(55% 0.22 25 / 12%)" }}><AlertTriangle className="w-2.5 h-2.5 lg:w-3 lg:h-3" style={{ color: "oklch(45% 0.22 25)" }} /></div>
                  <span className="text-[9px] font-semibold px-1 py-0.5 rounded-full" style={{ background: "oklch(55% 0.22 25 / 12%)", color: "oklch(40% 0.18 25)" }}>{contasVencidas?.length ?? 0} conta{(contasVencidas?.length ?? 0) !== 1 ? "s" : ""}</span>
                </div>
                <p className="text-sm lg:text-base font-bold tracking-tight" style={{ color: "oklch(40% 0.18 25)" }}>{formatCurrency(totalContasVencidas)}</p>
                <p className="text-[9px] lg:text-[10px] text-muted-foreground mt-0.5"><span className="font-medium" style={{ color: "oklch(40% 0.18 25)" }}>Contas Vencidas</span> · clique para ver</p>
              </div>
            </Link>
            <Link href="/admin/contas-pagar?filtro=hoje">
                <div className="stat-card cursor-pointer hover:shadow-md transition-shadow border-l-4" style={{ borderLeftColor: "oklch(65% 0.20 75)" }}>
                <div className="flex items-start justify-between mb-1 lg:mb-1.5">
                  <div className="w-5 h-5 lg:w-6 lg:h-6 rounded-md lg:rounded-lg flex items-center justify-center" style={{ background: "oklch(65% 0.20 75 / 12%)" }}><CreditCard className="w-2.5 h-2.5 lg:w-3 lg:h-3" style={{ color: "oklch(42% 0.16 75)" }} /></div>
                  <span className="text-[9px] font-semibold px-1 py-0.5 rounded-full" style={{ background: "oklch(65% 0.20 75 / 12%)", color: "oklch(40% 0.14 75)" }}>{contasHoje?.length ?? 0} conta{(contasHoje?.length ?? 0) !== 1 ? "s" : ""}</span>
                </div>
                <p className="text-sm lg:text-base font-bold tracking-tight" style={{ color: "oklch(40% 0.14 75)" }}>{formatCurrency(totalContasHoje)}</p>
                <p className="text-[9px] lg:text-[10px] text-muted-foreground mt-0.5"><span className="font-medium" style={{ color: "oklch(40% 0.14 75)" }}>A Pagar Hoje</span> · vencimento hoje</p>
              </div>
            </Link>
            <Link href="/admin/contas-pagar?filtro=semana">
                <div className="stat-card cursor-pointer hover:shadow-md transition-shadow border-l-4" style={{ borderLeftColor: "oklch(55% 0.22 264)" }}>
                <div className="flex items-start justify-between mb-1 lg:mb-1.5">
                  <div className="w-5 h-5 lg:w-6 lg:h-6 rounded-md lg:rounded-lg flex items-center justify-center" style={{ background: "oklch(55% 0.22 264 / 12%)" }}><CalendarCheck className="w-2.5 h-2.5 lg:w-3 lg:h-3" style={{ color: "oklch(45% 0.18 264)" }} /></div>
                  <span className="text-[9px] font-semibold px-1 py-0.5 rounded-full" style={{ background: "oklch(55% 0.22 264 / 12%)", color: "oklch(35% 0.18 264)" }}>{contasSemana?.length ?? 0} conta{(contasSemana?.length ?? 0) !== 1 ? "s" : ""}</span>
                </div>
                <p className="text-sm lg:text-base font-bold tracking-tight" style={{ color: "oklch(35% 0.18 264)" }}>{formatCurrency(totalContasSemana)}</p>
                <p className="text-[9px] lg:text-[10px] text-muted-foreground mt-0.5"><span className="font-medium" style={{ color: "oklch(35% 0.18 264)" }}>A Pagar na Semana</span> · próximos 7 dias</p>
              </div>
            </Link>
          </div>
        );

      case "agenda_hoje":
        return (
          <div className="card-elegant overflow-hidden">
            <div className="px-5 py-4" style={{ borderBottom: "1px solid oklch(90% 0.012 250)" }}>
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "oklch(55% 0.22 264 / 10%)" }}><Clock className="w-4 h-4" style={{ color: "oklch(45% 0.18 264)" }} /></div>
                  <div>
                    <h3 className="font-semibold text-sm tracking-tight">{isProfissional ? "Minha Agenda" : "Agenda"}</h3>
                    <p className="text-xs text-muted-foreground">{agendamentosOrdenados.length} atendimento{agendamentosOrdenados.length !== 1 ? "s" : ""}</p>
                  </div>
                </div>
                <Link href="/admin/calendario"><button className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">Ver calendário <ChevronRight className="w-3.5 h-3.5" /></button></Link>
              </div>
              <div className="flex gap-1.5">
                {(["hoje", "semana", "mes"] as const).map(p => (
                  <button
                    key={p}
                    onClick={() => aplicarPeriodoAgenda(p)}
                    className="h-7 px-2.5 rounded-md border text-[11px] font-medium transition-all"
                    style={{
                      background: agendaPeriodo === p ? "oklch(55% 0.22 264 / 12%)" : "transparent",
                      borderColor: agendaPeriodo === p ? "oklch(55% 0.22 264 / 50%)" : "oklch(88% 0.010 250)",
                      color: agendaPeriodo === p ? "oklch(45% 0.18 264)" : "oklch(50% 0.010 260)",
                      fontWeight: agendaPeriodo === p ? 600 : 400,
                    }}
                  >
                    {p === "hoje" ? "Hoje" : p === "semana" ? "Semana" : "Mês"}
                  </button>
                ))}
              </div>
            </div>
            {agendamentosOrdenados.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 text-center px-6">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4" style={{ background: "oklch(55% 0.22 264 / 8%)" }}><Calendar className="w-5 h-5" style={{ color: "oklch(55% 0.22 264)" }} /></div>
                <p className="text-sm font-medium text-foreground mb-1">Nenhum agendamento {agendaPeriodo === "hoje" ? "hoje" : agendaPeriodo === "semana" ? "esta semana" : "este mês"}</p>
                <p className="text-xs text-muted-foreground mb-5">Que tal criar o primeiro?</p>
                <button onClick={() => setNovaAgendaOpen(true)} className="btn-primary text-xs py-1.5"><Plus className="w-3.5 h-3.5" /> Criar agendamento</button>
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: "oklch(94% 0.008 250)" }}>
                {agendamentosOrdenados.map((ag) => {
                  const cfg = statusConfig[ag.status] ?? statusConfig.agendado;
                  const prof = profMap[ag.profissionalId];
                  return (
                    <div key={ag.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors">
                      <div className="text-center flex-shrink-0 w-10">
                        <p className="text-sm font-bold tracking-tight text-foreground">{ag.horaInicio.slice(0, 5)}</p>
                        <p className="text-[10px] text-muted-foreground">{ag.horaFim.slice(0, 5)}</p>
                      </div>
                      <div className="w-1 h-10 rounded-full flex-shrink-0" style={{ background: prof?.cor ?? "oklch(55% 0.22 264)" }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{clienteMap[ag.clienteId] ?? "Cliente"}</p>
                        <p className="text-xs text-muted-foreground truncate">{(ag as any).servicoNome ?? servicoMap[ag.servicoId] ?? "Serviço"} · {prof?.nome?.split(" ")[0] ?? ""}</p>
                      </div>
                      <span className="badge text-[10px] flex-shrink-0" style={{ background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );

      case "acoes_rapidas":
        return (
          <div className="card-elegant p-4">
            <h3 className="font-semibold text-sm mb-3 tracking-tight">Ações Rápidas</h3>
            <div className="space-y-2">
              {[
                { label: "Novo agendamento", icon: Plus, action: () => setNovaAgendaOpen(true), primary: true },
                { label: "Ver calendário", icon: Calendar, href: "/admin/calendario" },
                ...(pode("clientesVer") ? [{ label: "Adicionar cliente", icon: Users, href: "/admin/clientes" }] : []),
                ...(pode("automacoesVer") ? [{ label: "Ver automações", icon: Zap, href: "/admin/automacoes" }] : []),
              ].map((item) => {
                const Icon = item.icon;
                if ((item as any).action) return (
                  <button key={item.label} onClick={(item as any).action} className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${(item as any).primary ? "btn-primary justify-start" : "btn-ghost hover:bg-muted"}`}>
                    <Icon className="w-3.5 h-3.5 flex-shrink-0" />{item.label}
                  </button>
                );
                return (
                  <Link key={item.label} href={(item as any).href!}>
                    <button className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-medium btn-ghost hover:bg-muted transition-all"><Icon className="w-3.5 h-3.5 flex-shrink-0" />{item.label}</button>
                  </Link>
                );
              })}
            </div>
          </div>
        );

      case "financeiro":
        if (!podeVerFinanceiro) return null;
        return (
          <div className="card-elegant p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm tracking-tight">Financeiro</h3>
              <Link href="/admin/financeiro"><button className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">Ver tudo <ChevronRight className="w-3 h-3" /></button></Link>
            </div>
            <div className="space-y-3">
              {[
                { label: "Receita bruta", value: formatCurrency(metrics?.receitaMes ?? 0), positive: true },
                { label: "Comissões pendentes", value: formatCurrency(metrics?.comissoesPendentes ?? 0), positive: false },
                { label: "Ticket médio", value: formatCurrency(metrics?.ticketMedio ?? 0), positive: true },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{item.label}</span>
                  <span className="text-xs font-bold" style={{ color: item.positive ? "oklch(35% 0.14 155)" : "oklch(40% 0.18 25)" }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        );

      case "score_ia":
        if (!podeVerFinanceiro) return null;
        return (
          <div className="card-elegant p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "oklch(55% 0.22 264 / 12%)" }}><Brain className="w-3.5 h-3.5" style={{ color: "oklch(45% 0.18 264)" }} /></div>
                <h3 className="font-semibold text-sm tracking-tight">Score Financeiro</h3>
              </div>
              <Link href="/admin/ia-financeiro"><button className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">Detalhes <ChevronRight className="w-3 h-3" /></button></Link>
            </div>
            {!scoreIA ? (
              <div className="text-center py-3">
                <p className="text-xs text-muted-foreground mb-2">Nenhuma análise ainda</p>
                <Link href="/admin/ia-financeiro"><button className="text-xs font-medium" style={{ color: "oklch(45% 0.18 264)" }}>Calcular agora →</button></Link>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Score</span>
                  <div className="flex items-center gap-1.5">
                    <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full transition-all" style={{ width: `${scoreIA.score}%`, background: scoreIA.status === 'saudavel' ? 'oklch(55% 0.18 155)' : scoreIA.status === 'atencao' ? 'oklch(65% 0.20 75)' : 'oklch(55% 0.22 25)' }} /></div>
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
        );

      case "pipeline":
        if (!dashboardPipeline) return null;
        return (
          <div className="card-elegant overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid oklch(90% 0.012 250)" }}>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "oklch(55% 0.22 264 / 10%)" }}><KanbanSquare className="w-3.5 h-3.5" style={{ color: "oklch(45% 0.18 264)" }} /></div>
                <div>
                  <h3 className="font-semibold text-xs tracking-tight truncate max-w-[130px]">{dashboardPipeline.nome}</h3>
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1"><Star className="w-2.5 h-2.5 fill-yellow-400 text-yellow-400" /> Pipeline favorita</p>
                </div>
              </div>
              <Link href="/admin/pipeline"><button className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">Abrir <ChevronRight className="w-3 h-3" /></button></Link>
            </div>
            <div className="p-3 space-y-2">
              {dashboardPipeline.colunas.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-3">Nenhuma coluna criada</p>
              ) : (
                dashboardPipeline.colunas.map((col: any) => (
                  <div key={col.id} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: col.cor ?? "#6366f1" }} />
                      <span className="text-xs text-muted-foreground truncate">{col.nome}</span>
                    </div>
                    <span className="text-xs font-semibold flex-shrink-0 px-1.5 py-0.5 rounded-full" style={{ background: "oklch(55% 0.22 264 / 10%)", color: "oklch(35% 0.18 264)" }}>{col.cartoes.length}</span>
                  </div>
                ))
              )}
              <div className="pt-1 border-t" style={{ borderColor: "oklch(92% 0.008 250)" }}>
                <p className="text-[10px] text-muted-foreground">{dashboardPipeline.colunas.reduce((acc: number, c: any) => acc + c.cartoes.length, 0)} cartões no total</p>
              </div>
            </div>
          </div>
        );

      case "plano_uso":
        if (!hasFullAccess) return null;
        return (
          <div className="card-elegant p-4">
            <PlanStatusCard statusPlano={statusPlano} />
          </div>
        );

      case "equipe":
        if (!pode("profissionaisVer") || !profissionais || profissionais.filter(p => p.ativo).length === 0) return null;
        return (
          <div className="card-elegant p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm tracking-tight">Equipe</h3>
              <Link href="/admin/profissionais"><button className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">Gerenciar <ChevronRight className="w-3 h-3" /></button></Link>
            </div>
            <div className="space-y-2">
              {profissionais.filter(p => p.ativo).slice(0, 4).map(p => {
                const agendamentosProf = agendamentosOrdenados.filter(a => a.profissionalId === p.id).length;
                return (
                  <div key={p.id} className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-[11px] font-bold text-white" style={{ background: p.corCalendario ?? "oklch(55% 0.22 264)" }}>{p.nome.charAt(0)}</div>
                    <div className="flex-1 min-w-0"><p className="text-xs font-medium truncate">{p.nome.split(" ")[0]}</p></div>
                    <div className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" style={{ color: "oklch(55% 0.22 264)" }} /><span className="text-[11px] font-semibold text-muted-foreground">{agendamentosProf}</span></div>
                  </div>
                );
              })}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // ─── Widgets "full" (largura total) vs "sidebar" ─────────────────────────
  const fullWidgets = ["stats", "contas_pagar"];
  const mainWidgets = ["agenda_hoje"];
  const sideWidgets = ["acoes_rapidas", "financeiro", "score_ia", "pipeline", "plano_uso", "equipe"];

  if (!empresa) {
    return (
      <div className="flex items-center justify-center min-h-screen p-8">
        <div className="text-center max-w-sm space-y-5">
          <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mx-auto"><Sparkles className="w-7 h-7 text-white" /></div>
          <div>
            <h2 className="text-xl font-bold tracking-tight mb-2">Configure sua empresa</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">Para começar a usar o Hubly, configure as informações do seu estabelecimento.</p>
          </div>
          <Link href="/admin/configuracoes"><button className="btn-primary mx-auto">Configurar agora <ChevronRight className="w-4 h-4" /></button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-7 max-w-7xl mx-auto space-y-5 animate-in-up">

      {/* Alerta WhatsApp desconectado */}
      {waDesconectado && (
        <Link href="/admin/whatsapp">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity"
            style={{ background: "oklch(55% 0.18 25 / 10%)", border: "1px solid oklch(55% 0.18 25 / 25%)", color: "oklch(42% 0.18 25)" }}>
            <MessageCircle className="w-3 h-3 shrink-0" /><span>WhatsApp desconectado</span><ArrowRight className="w-3 h-3 shrink-0" />
          </div>
        </Link>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground font-medium capitalize mb-0.5 hidden sm:block">{dataFormatada}</p>
          <h1 className="font-bold tracking-tight text-xl lg:text-2xl truncate">{saudacao(user?.name ?? undefined)}</h1>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-xs sm:text-sm text-muted-foreground truncate">{empresa.nome}</p>
            {isProfissional && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: "oklch(55% 0.22 264 / 12%)", color: "oklch(35% 0.18 264)" }}>
                <span className="w-1.5 h-1.5 rounded-full bg-current" />Minha agenda
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {pendentes > 0 && (
            <Link href="/admin/agendamentos">
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer" style={{ background: "oklch(72% 0.16 80 / 15%)", color: "oklch(40% 0.14 75)" }}>
                <AlertCircle className="w-3.5 h-3.5" /><span className="hidden sm:inline">{pendentes} pendente{pendentes > 1 ? "s" : ""}</span><span className="sm:hidden">{pendentes}</span>
              </div>
            </Link>
          )}
          {/* Botão Personalizar */}
          <button
            onClick={() => setEditMode(v => !v)}
            className={`flex items-center gap-1.5 py-2 px-3 text-xs rounded-lg font-medium transition-all border ${editMode ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border hover:bg-muted text-foreground"}`}>
            <Settings2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{editMode ? "Editando..." : "Personalizar"}</span>
          </button>
          <button onClick={() => setNovaAgendaOpen(true)} className="btn-primary py-2 px-3 text-xs">
            <Plus className="w-3.5 h-3.5" /><span className="hidden sm:inline">Novo Agendamento</span><span className="sm:hidden">Novo</span>
          </button>
        </div>
      </div>

      {/* ─── Modo de edição ─────────────────────────────────────────────────── */}
      {editMode && (
        <div className="rounded-2xl border-2 border-dashed p-5 space-y-4 animate-in-up" style={{ borderColor: "oklch(55% 0.22 264 / 30%)", background: "oklch(55% 0.22 264 / 4%)" }}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-sm tracking-tight flex items-center gap-2">
                <Settings2 className="w-4 h-4" style={{ color: "oklch(45% 0.18 264)" }} />
                Personalizar Dashboard
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">Arraste para reordenar · clique em Visível/Oculto para mostrar ou esconder</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={resetLayout} className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border hover:bg-muted transition-colors">
                <RotateCcw className="w-3.5 h-3.5" />Padrão
              </button>
              <button onClick={handleSave} disabled={saveConfig.isPending}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg btn-primary transition-colors disabled:opacity-60">
                <Save className="w-3.5 h-3.5" />{saveConfig.isPending ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>

          {/* Layouts pré-definidos */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Layouts pré-definidos</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 lg:gap-2">
              {PRESET_LAYOUTS.map(preset => {
                const Icon = preset.icon;
                const isActive = activePresetId === preset.id;
                return (
                  <button
                    key={preset.id}
                    onClick={() => applyPreset(preset)}
                    className={`flex items-start gap-3 p-3 rounded-xl border-2 text-left transition-all hover:scale-[1.01] active:scale-[0.99] ${
                      isActive
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border bg-background hover:border-primary/40 hover:bg-muted/40"
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${preset.color.replace(')', ' / 15%)')}` }}>
                      <Icon className="w-4 h-4" style={{ color: preset.color }} />
                    </div>
                    <div className="min-w-0">
                      <p className={`text-xs font-semibold truncate ${isActive ? "text-primary" : ""}`}>{preset.title}</p>
                      <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{preset.description}</p>
                    </div>
                    {isActive && <div className="ml-auto flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center" style={{ background: "oklch(55% 0.22 264)" }}><svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg></div>}
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-muted-foreground">Aplique um layout pré-definido como ponto de partida e ajuste os widgets abaixo conforme preferir.</p>
          </div>

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={sortedLayout.map(w => w.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {sortedLayout.map(widget => {
                  const catalog = WIDGET_CATALOG.find(c => c.id === widget.id);
                  return <SortableWidgetItem key={widget.id} widget={widget} catalog={catalog} onToggle={toggleWidget} />;
                })}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      )}

      {/* ─── Widgets "full" (largura total) ─────────────────────────────────── */}
      {sortedLayout
        .filter(w => w.visible && fullWidgets.includes(w.id))
        .map(w => {
          const content = renderWidget(w.id);
          if (!content) return null;
          return <div key={w.id}>{content}</div>;
        })}

      {/* ─── Grid principal (main + sidebar) ────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Coluna principal (2/3) */}
        <div className="lg:col-span-2 space-y-5">
          {sortedLayout
            .filter(w => w.visible && mainWidgets.includes(w.id))
            .map(w => {
              const content = renderWidget(w.id);
              if (!content) return null;
              return <div key={w.id}>{content}</div>;
            })}
        </div>

        {/* Painel lateral (1/3) */}
        <div className="space-y-4">
          {sortedLayout
            .filter(w => w.visible && sideWidgets.includes(w.id))
            .map(w => {
              const content = renderWidget(w.id);
              if (!content) return null;
              return <div key={w.id}>{content}</div>;
            })}
        </div>
      </div>

      {novaAgendaOpen && <NovaAgendaModal open={novaAgendaOpen} onClose={() => setNovaAgendaOpen(false)} />}
      {receitaDetalheOpen && <ReceitaDetalheModal open={receitaDetalheOpen} onClose={() => setReceitaDetalheOpen(false)} />}
    </div>
  );
}
