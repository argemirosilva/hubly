import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Plus, LayoutGrid, List } from "lucide-react";
import NovaAgendaModal from "@/components/NovaAgendaModal";
import AgendamentoDetalheModal from "@/components/AgendamentoDetalheModal";
import { trpc } from "@/lib/trpc";
import { getServiceIcon } from "@/lib/serviceIcons";
import { usePermissoes } from "@/hooks/usePermissoes";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// Backend já aplica filtros via resolveAdminContext, sem necessidade de useAuth aqui

const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const DIAS_SEMANA_CURTO = ["D", "S", "T", "Q", "Q", "S", "S"];
const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

const statusConfig: Record<string, { label: string; bg: string; color: string }> = {
  pre_agendado:       { label: "Pré-agendado",    bg: "oklch(72% 0.16 80 / 14%)",  color: "oklch(42% 0.14 75)" },
  agendado:           { label: "Agendado",        bg: "oklch(55% 0.22 264 / 12%)", color: "oklch(45% 0.18 264)" },
  confirmado:         { label: "Confirmado",      bg: "oklch(62% 0.18 155 / 14%)", color: "oklch(35% 0.14 155)" },
  em_andamento:       { label: "Em andamento",    bg: "oklch(68% 0.18 80 / 14%)",  color: "oklch(38% 0.14 80)" },
  concluido:          { label: "Concluído",       bg: "oklch(55% 0.04 260 / 10%)", color: "oklch(40% 0.04 260)" },
  cancelado:          { label: "Cancelado",       bg: "oklch(58% 0.22 25 / 12%)",  color: "oklch(40% 0.18 25)" },
  faltou:             { label: "Faltou",          bg: "oklch(58% 0.22 25 / 12%)",  color: "oklch(40% 0.18 25)" },
};

export default function Calendario() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [novaAgendaOpen, setNovaAgendaOpen] = useState(false);
  const [novaAgendaData, setNovaAgendaData] = useState<string | undefined>();
  const [agendamentoSelecionado, setAgendamentoSelecionado] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "lista">("grid");
  const [profissionalFiltro, setProfissionalFiltro] = useState<string>("");

  const { isOwner, pode } = usePermissoes();
  const isAdmin = isOwner || pode('agendamentosVerTodos');

  // Backend já aplica o filtro correto via resolveAdminContext
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const dataInicio = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const dataFim = `${year}-${String(month + 1).padStart(2, "0")}-${new Date(year, month + 1, 0).getDate()}`;

  const { data: agendamentos } = trpc.agendamentos.list.useQuery({
    dataInicio,
    dataFim,
    profissionalId: profissionalFiltro ? parseInt(profissionalFiltro) : undefined,
  });

  const { data: clientes } = trpc.clientes.list.useQuery();
  const { data: profissionais } = trpc.profissionais.listParaAgendamento.useQuery();

  const clienteMap = useMemo(() => {
    const m: Record<number, string> = {};
    clientes?.forEach(c => { m[c.id] = c.nome; });
    return m;
  }, [clientes]);

  const profMap = useMemo(() => {
    const m: Record<number, { nome: string; cor: string }> = {};
    profissionais?.forEach(p => { m[p.id] = { nome: p.nome, cor: p.corCalendario ?? "oklch(50% 0.06 68)" }; });
    return m;
  }, [profissionais]);

  const agendamentosPorDia = useMemo(() => {
    const m: Record<string, typeof agendamentos> = {};
    agendamentos?.forEach(ag => {
      if (!m[ag.data]) m[ag.data] = [];
      m[ag.data]!.push(ag);
    });
    return m;
  }, [agendamentos]);

  const calDays = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    const days: { date: string; day: number; isCurrentMonth: boolean }[] = [];

    for (let i = firstDay - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const m = month === 0 ? 12 : month;
      const y = month === 0 ? year - 1 : year;
      days.push({ date: `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`, day: d, isCurrentMonth: false });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      days.push({ date: `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`, day: d, isCurrentMonth: true });
    }
    const remaining = 42 - days.length;
    for (let d = 1; d <= remaining; d++) {
      const m = month === 11 ? 1 : month + 2;
      const y = month === 11 ? year + 1 : year;
      days.push({ date: `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`, day: d, isCurrentMonth: false });
    }
    return days;
  }, [year, month]);

  // Dias do mês com agendamentos para a view lista
  const diasComAgendamentos = useMemo(() => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const result: { date: string; day: number; weekday: string }[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const date = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const weekday = DIAS_SEMANA[new Date(date).getDay()];
      result.push({ date, day: d, weekday });
    }
    return result;
  }, [year, month]);

  const today = new Date().toISOString().split("T")[0];
  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-4 lg:space-y-6 animate-in-up">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div>
            <p className="text-xs text-muted-foreground tracking-[0.12em] uppercase mb-0.5 hidden sm:block">Calendário</p>
            <h1 className="font-bold text-xl lg:text-2xl tracking-tight">
              {MESES[month]} <span className="text-muted-foreground font-normal">{year}</span>
            </h1>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={prevMonth}
              className="w-7 h-7 rounded-lg border flex items-center justify-center hover:bg-muted transition-colors">
              <ChevronLeft className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
            <button onClick={() => setCurrentDate(new Date())}
              className="px-2.5 h-7 rounded-lg border text-xs hover:bg-muted transition-colors text-muted-foreground">
              Hoje
            </button>
            <button onClick={nextMonth}
              className="w-7 h-7 rounded-lg border flex items-center justify-center hover:bg-muted transition-colors">
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Filtro por profissional (admin only) */}
          {isAdmin && profissionais && profissionais.filter(p => p.ativo).length > 1 && (
            <Select value={profissionalFiltro} onValueChange={setProfissionalFiltro}>
              <SelectTrigger className="h-8 text-xs w-[160px]">
                <SelectValue placeholder="Todos profissionais" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos profissionais</SelectItem>
                {profissionais.filter(p => p.ativo).map(p => (
                  <SelectItem key={p.id} value={String(p.id)}>{p.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Toggle view: apenas visível no mobile */}
          <div className="flex lg:hidden items-center rounded-lg border overflow-hidden">
            <button
              onClick={() => setViewMode("grid")}
              className="p-2 transition-colors"
              style={{ background: viewMode === "grid" ? "oklch(55% 0.22 264)" : "transparent" }}>
              <LayoutGrid className="w-4 h-4" style={{ color: viewMode === "grid" ? "white" : "oklch(55% 0.010 260)" }} />
            </button>
            <button
              onClick={() => setViewMode("lista")}
              className="p-2 transition-colors"
              style={{ background: viewMode === "lista" ? "oklch(55% 0.22 264)" : "transparent" }}>
              <List className="w-4 h-4" style={{ color: viewMode === "lista" ? "white" : "oklch(55% 0.010 260)" }} />
            </button>
          </div>

          <button
            onClick={() => { setNovaAgendaData(today); setNovaAgendaOpen(true); }}
            className="btn-primary py-2 px-3 text-xs">
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Novo Agendamento</span>
            <span className="sm:hidden">Novo</span>
          </button>
        </div>
      </div>

      {/* ── Legenda de profissionais ────────────────────────────────────── */}
      {profissionais && profissionais.filter(p => p.ativo).length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          {profissionais.filter(p => p.ativo).map(p => (
            <div key={p.id} className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: p.corCalendario ?? "oklch(50% 0.06 68)" }} />
              <span className="text-xs text-muted-foreground">{p.nome.split(" ")[0]}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Calendário Grid (desktop sempre, mobile quando viewMode=grid) ── */}
      <div className={`card-elegant overflow-hidden ${viewMode === "lista" ? "hidden lg:block" : ""}`}>
        {/* Cabeçalho dos dias da semana */}
        <div className="grid grid-cols-7" style={{ borderBottom: "1px solid oklch(90% 0.012 250)", background: "oklch(97% 0.008 68)" }}>
          {DIAS_SEMANA.map((dia, i) => (
            <div key={dia} className="py-2.5 text-center"
              style={{ borderRight: i < 6 ? "1px solid oklch(92% 0.012 68)" : "none" }}>
              <span className="hidden sm:inline text-[11px] tracking-[0.12em] uppercase font-medium"
                style={{ color: i === 0 || i === 6 ? "oklch(65% 0.012 68)" : "oklch(45% 0.012 68)" }}>
                {dia}
              </span>
              <span className="sm:hidden text-[11px] font-semibold"
                style={{ color: i === 0 || i === 6 ? "oklch(65% 0.012 68)" : "oklch(45% 0.012 68)" }}>
                {DIAS_SEMANA_CURTO[i]}
              </span>
            </div>
          ))}
        </div>

        {/* Grid de dias */}
        <div className="grid grid-cols-7">
          {calDays.map(({ date, day, isCurrentMonth }, idx) => {
            const ags = agendamentosPorDia[date] ?? [];
            const isToday = date === today;
            const col = idx % 7;
            const isWeekend = col === 0 || col === 6;

            return (
              <div
                key={date}
                className="min-h-[72px] sm:min-h-[96px] p-1 sm:p-2 cursor-pointer transition-colors"
                style={{
                  borderRight: col < 6 ? "1px solid oklch(92% 0.012 68)" : "none",
                  borderBottom: "1px solid oklch(92% 0.012 68)",
                  background: isToday
                    ? "oklch(92% 0.022 72 / 40%)"
                    : !isCurrentMonth
                    ? "oklch(97% 0.006 68)"
                    : isWeekend
                    ? "oklch(98.5% 0.006 68)"
                    : "oklch(99% 0.004 68)",
                }}
                onClick={() => { setNovaAgendaData(date); setNovaAgendaOpen(true); }}
              >
                {/* Número do dia */}
                <div className="flex items-center justify-between mb-1">
                  <span
                    className="text-xs font-medium w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center rounded-full transition-colors"
                    style={{
                      background: isToday ? "oklch(55% 0.22 264)" : "transparent",
                      color: isToday
                        ? "white"
                        : !isCurrentMonth
                        ? "oklch(72% 0.010 68)"
                        : isWeekend
                        ? "oklch(55% 0.012 68)"
                        : "oklch(28% 0.018 52)",
                    }}>
                    {day}
                  </span>
                  {ags.length > 0 && (
                    <span className="hidden sm:block text-[10px] text-muted-foreground/60 tabular-nums">
                      {ags.length}
                    </span>
                  )}
                </div>

                {/* Eventos — no mobile mostra apenas bolinhas coloridas */}
                <div className="space-y-0.5">
                  {/* Mobile: bolinhas */}
                  <div className="flex flex-wrap gap-0.5 sm:hidden">
                    {ags.slice(0, 4).map(ag => {
                      const cor = profMap[ag.profissionalId]?.cor ?? "oklch(50% 0.06 68)";
                      return (
                        <div key={ag.id}
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ background: cor }}
                          onClick={e => { e.stopPropagation(); setAgendamentoSelecionado(ag.id); }}
                        />
                      );
                    })}
                    {ags.length > 4 && (
                      <span className="text-[9px] text-muted-foreground leading-none">+{ags.length - 4}</span>
                    )}
                  </div>
                  {/* Desktop: chips com nome */}
                  <div className="hidden sm:block space-y-0.5">
                    {ags.slice(0, 3).map(ag => {
                      const cor = profMap[ag.profissionalId]?.cor ?? "oklch(50% 0.06 68)";
                      const servicoNome = (ag as any).servicoNome ?? "";
                      const { icon: SvcIcon } = getServiceIcon(servicoNome);
                      return (
                        <div
                          key={ag.id}
                          className="flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded-sm cursor-pointer hover:opacity-80 transition-opacity overflow-hidden"
                          style={{ backgroundColor: cor, color: "white", lineHeight: "1.4" }}
                          onClick={e => { e.stopPropagation(); setAgendamentoSelecionado(ag.id); }}
                          title={`${ag.horaInicio.slice(0, 5)} — ${clienteMap[ag.clienteId] ?? "Cliente"}${servicoNome ? ` • ${servicoNome}` : ""}`}
                        >
                          <SvcIcon className="w-2.5 h-2.5 flex-shrink-0 opacity-90" />
                          <span className="truncate font-medium">{ag.horaInicio.slice(0, 5)} {clienteMap[ag.clienteId]?.split(" ")[0] ?? ""}</span>
                        </div>
                      );
                    })}
                    {ags.length > 3 && (
                      <p className="text-[10px] text-muted-foreground/60 px-1.5">
                        +{ags.length - 3} mais
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Vista Lista / Agenda (mobile quando viewMode=lista) ─────────── */}
      <div className={`space-y-3 ${viewMode === "grid" ? "hidden lg:hidden" : "lg:hidden"}`}>
        {diasComAgendamentos.map(({ date, day, weekday }) => {
          const ags = (agendamentosPorDia[date] ?? []).sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));
          const isToday = date === today;

          return (
            <div key={date}>
              {/* Cabeçalho do dia */}
              <div className="flex items-center gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{
                      background: isToday ? "oklch(55% 0.22 264)" : "oklch(94% 0.010 250)",
                    }}>
                    <span className="text-sm font-bold" style={{ color: isToday ? "white" : "oklch(35% 0.018 260)" }}>
                      {day}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">{weekday}</span>
                </div>
                {ags.length > 0 && (
                  <span className="text-xs text-muted-foreground">{ags.length} atend.</span>
                )}
              </div>

              {ags.length === 0 ? (
                <div className="ml-11 py-2 text-xs text-muted-foreground/60 italic">
                  Sem agendamentos
                </div>
              ) : (
                <div className="ml-11 space-y-2">
                  {ags.map(ag => {
                    const cor = profMap[ag.profissionalId]?.cor ?? "oklch(50% 0.06 68)";
                    const prof = profMap[ag.profissionalId];
                    const servicoNome = (ag as any).servicoNome ?? "";
                    const { icon: SvcIcon } = getServiceIcon(servicoNome);
                    const cfg = statusConfig[ag.status] ?? statusConfig.agendado;
                    return (
                      <div
                        key={ag.id}
                        className="flex items-center gap-3 p-3 rounded-xl cursor-pointer hover:bg-muted/40 transition-colors"
                        style={{ background: "white", border: "1px solid oklch(92% 0.010 250)", boxShadow: "0 1px 4px oklch(0% 0 0 / 4%)" }}
                        onClick={() => setAgendamentoSelecionado(ag.id)}
                      >
                        {/* Barra colorida */}
                        <div className="w-1 h-10 rounded-full flex-shrink-0" style={{ background: cor }} />
                        {/* Hora */}
                        <div className="text-center flex-shrink-0 w-10">
                          <p className="text-xs font-bold">{ag.horaInicio.slice(0, 5)}</p>
                          <p className="text-[10px] text-muted-foreground">{ag.horaFim.slice(0, 5)}</p>
                        </div>
                        {/* Ícone do serviço */}
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ background: cor + "20" }}>
                          <SvcIcon className="w-4 h-4" style={{ color: cor }} />
                        </div>
                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">{clienteMap[ag.clienteId] ?? "Cliente"}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {servicoNome || "Serviço"} · {prof?.nome?.split(" ")[0] ?? ""}
                          </p>
                        </div>
                        {/* Status */}
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-medium flex-shrink-0"
                          style={{ background: cfg.bg, color: cfg.color }}>
                          {cfg.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {novaAgendaOpen && (
        <NovaAgendaModal
          open={novaAgendaOpen}
          onClose={() => { setNovaAgendaOpen(false); setNovaAgendaData(undefined); }}
          dataInicial={novaAgendaData}
        />
      )}

      {agendamentoSelecionado && (
        <AgendamentoDetalheModal
          agendamentoId={agendamentoSelecionado}
          open={!!agendamentoSelecionado}
          onClose={() => setAgendamentoSelecionado(null)}
        />
      )}
    </div>
  );
}
