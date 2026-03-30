import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import NovaAgendaModal from "@/components/NovaAgendaModal";
import AgendamentoDetalheModal from "@/components/AgendamentoDetalheModal";

const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

export default function Calendario() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [novaAgendaOpen, setNovaAgendaOpen] = useState(false);
  const [novaAgendaData, setNovaAgendaData] = useState<string | undefined>();
  const [agendamentoSelecionado, setAgendamentoSelecionado] = useState<number | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const dataInicio = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const dataFim = `${year}-${String(month + 1).padStart(2, "0")}-${new Date(year, month + 1, 0).getDate()}`;

  const { data: agendamentos } = trpc.agendamentos.list.useQuery({ dataInicio, dataFim });
  const { data: clientes } = trpc.clientes.list.useQuery();
  const { data: profissionais } = trpc.profissionais.list.useQuery();

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

  const today = new Date().toISOString().split("T")[0];
  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-in-up">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-5">
          <div>
            <p className="text-xs text-muted-foreground tracking-[0.15em] uppercase mb-0.5">Calendário</p>
            <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.8rem", fontWeight: 400, color: "oklch(18% 0.018 52)" }}>
              {MESES[month]} {year}
            </h1>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={prevMonth}
              className="w-7 h-7 rounded-md border flex items-center justify-center hover:bg-secondary transition-colors"
              style={{ borderColor: "oklch(87% 0.016 68)" }}>
              <ChevronLeft className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
            <button onClick={() => setCurrentDate(new Date())}
              className="px-3 h-7 rounded-md border text-xs hover:bg-secondary transition-colors"
              style={{ borderColor: "oklch(87% 0.016 68)", color: "oklch(40% 0.012 68)" }}>
              Hoje
            </button>
            <button onClick={nextMonth}
              className="w-7 h-7 rounded-md border flex items-center justify-center hover:bg-secondary transition-colors"
              style={{ borderColor: "oklch(87% 0.016 68)" }}>
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </div>
        </div>

        <button
          onClick={() => { setNovaAgendaData(today); setNovaAgendaOpen(true); }}
          className="flex items-center gap-2 px-4 py-2 text-xs tracking-wider uppercase transition-opacity hover:opacity-80"
          style={{ background: "oklch(22% 0.018 52)", color: "oklch(97% 0.006 68)", borderRadius: "4px", letterSpacing: "0.07em" }}>
          <Plus className="w-3.5 h-3.5" />
          Novo Agendamento
        </button>
      </div>

      {/* ── Legenda de profissionais ────────────────────────────────────── */}
      {profissionais && profissionais.filter(p => p.ativo).length > 0 && (
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-[11px] tracking-[0.12em] uppercase text-muted-foreground">Profissionais:</span>
          {profissionais.filter(p => p.ativo).map(p => (
            <div key={p.id} className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.corCalendario ?? "oklch(50% 0.06 68)" }} />
              <span className="text-xs text-muted-foreground">{p.nome.split(" ")[0]}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Calendário ─────────────────────────────────────────────────── */}
      <div className="card-elegant overflow-hidden">
        {/* Cabeçalho dos dias da semana */}
        <div className="grid grid-cols-7" style={{ borderBottom: "1px solid oklch(87% 0.016 68)", background: "oklch(97% 0.008 68)" }}>
          {DIAS_SEMANA.map((dia, i) => (
            <div key={dia} className="py-3 text-center"
              style={{ borderRight: i < 6 ? "1px solid oklch(92% 0.012 68)" : "none" }}>
              <span className="text-[11px] tracking-[0.12em] uppercase font-medium"
                style={{ color: i === 0 || i === 6 ? "oklch(65% 0.012 68)" : "oklch(45% 0.012 68)" }}>
                {dia}
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
                className="min-h-[96px] p-2 cursor-pointer transition-colors"
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
                    className="text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full transition-colors"
                    style={{
                      background: isToday ? "oklch(22% 0.018 52)" : "transparent",
                      color: isToday
                        ? "oklch(97% 0.006 68)"
                        : !isCurrentMonth
                        ? "oklch(72% 0.010 68)"
                        : isWeekend
                        ? "oklch(55% 0.012 68)"
                        : "oklch(28% 0.018 52)",
                    }}>
                    {day}
                  </span>
                  {ags.length > 0 && (
                    <span className="text-[10px] text-muted-foreground/60 tabular-nums">
                      {ags.length}
                    </span>
                  )}
                </div>

                {/* Eventos */}
                <div className="space-y-0.5">
                  {ags.slice(0, 3).map(ag => {
                    const cor = profMap[ag.profissionalId]?.cor ?? "oklch(50% 0.06 68)";
                    return (
                      <div
                        key={ag.id}
                        className="text-[11px] px-1.5 py-0.5 rounded-sm truncate font-medium cursor-pointer hover:opacity-80 transition-opacity"
                        style={{ backgroundColor: cor, color: "white", lineHeight: "1.4" }}
                        onClick={e => { e.stopPropagation(); setAgendamentoSelecionado(ag.id); }}
                        title={`${ag.horaInicio.slice(0, 5)} — ${clienteMap[ag.clienteId] ?? "Cliente"}`}
                      >
                        {ag.horaInicio.slice(0, 5)} {clienteMap[ag.clienteId]?.split(" ")[0] ?? ""}
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
            );
          })}
        </div>
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
