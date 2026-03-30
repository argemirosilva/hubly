import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import NovaAgendaModal from "@/components/NovaAgendaModal";
import AgendamentoDetalheModal from "@/components/AgendamentoDetalheModal";

const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

const statusColors: Record<string, string> = {
  pre_agendado: "bg-purple-500 text-white",
  aguardando_reserva: "bg-orange-500 text-white",
  agendado: "bg-blue-500 text-white",
  confirmado: "bg-emerald-500 text-white",
  em_andamento: "bg-cyan-500 text-white",
  concluido: "bg-gray-400 text-white",
  cancelado: "bg-red-500 text-white",
  faltou: "bg-amber-500 text-white",
};

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
    const map: Record<number, string> = {};
    clientes?.forEach(c => { map[c.id] = c.nome; });
    return map;
  }, [clientes]);

  const profMap = useMemo(() => {
    const map: Record<number, { nome: string; cor: string }> = {};
    profissionais?.forEach(p => { map[p.id] = { nome: p.nome, cor: p.corCalendario ?? "#6366f1" }; });
    return map;
  }, [profissionais]);

  // Agrupar agendamentos por data
  const agendamentosPorDia = useMemo(() => {
    const map: Record<string, typeof agendamentos> = {};
    agendamentos?.forEach(ag => {
      if (!map[ag.data]) map[ag.data] = [];
      map[ag.data]!.push(ag);
    });
    return map;
  }, [agendamentos]);

  // Gerar dias do calendário
  const calDays = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    const days: { date: string; day: number; isCurrentMonth: boolean }[] = [];

    // Dias do mês anterior
    for (let i = firstDay - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const m = month === 0 ? 12 : month;
      const y = month === 0 ? year - 1 : year;
      days.push({ date: `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`, day: d, isCurrentMonth: false });
    }

    // Dias do mês atual
    for (let d = 1; d <= daysInMonth; d++) {
      days.push({ date: `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`, day: d, isCurrentMonth: true });
    }

    // Dias do próximo mês
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
    <div className="p-6 space-y-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-semibold text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>
            {MESES[month]} {year}
          </h1>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={prevMonth}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setCurrentDate(new Date())}>
              Hoje
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={nextMonth}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <Button onClick={() => { setNovaAgendaData(today); setNovaAgendaOpen(true); }} className="gap-2">
          <Plus className="w-4 h-4" />
          Novo Agendamento
        </Button>
      </div>

      {/* Legenda de profissionais */}
      {profissionais && profissionais.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {profissionais.filter(p => p.ativo).map(p => (
            <div key={p.id} className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: p.corCalendario ?? "#6366f1" }} />
              <span className="text-xs text-muted-foreground">{p.nome}</span>
            </div>
          ))}
        </div>
      )}

      {/* Calendário */}
      <div className="bg-card rounded-xl border border-border overflow-hidden shadow-none">
        {/* Cabeçalho dos dias */}
        <div className="grid grid-cols-7 border-b border-border">
          {DIAS_SEMANA.map(dia => (
            <div key={dia} className="px-2 py-2.5 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              {dia}
            </div>
          ))}
        </div>

        {/* Grid de dias */}
        <div className="grid grid-cols-7">
          {calDays.map(({ date, day, isCurrentMonth }) => {
            const ags = agendamentosPorDia[date] ?? [];
            const isToday = date === today;
            return (
              <div
                key={date}
                className={`min-h-[100px] p-1.5 border-r border-b border-border cursor-pointer transition-colors
                  ${!isCurrentMonth ? "bg-muted/20" : "bg-card hover:bg-muted/20"}
                  ${isToday ? "bg-secondary/30" : ""}
                `}
                onClick={() => { setNovaAgendaData(date); setNovaAgendaOpen(true); }}
              >
                <div className={`text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full
                  ${isToday ? "bg-primary text-primary-foreground" : isCurrentMonth ? "text-foreground" : "text-muted-foreground/50"}
                `}>
                  {day}
                </div>
                <div className="space-y-0.5">
                  {ags.slice(0, 3).map(ag => (
                    <div
                      key={ag.id}
                      className={`text-xs px-1.5 py-0.5 rounded truncate font-medium cursor-pointer hover:opacity-80 transition-opacity`}
                      style={{ backgroundColor: profMap[ag.profissionalId]?.cor ?? "#6366f1", color: "white" }}
                      onClick={(e) => { e.stopPropagation(); setAgendamentoSelecionado(ag.id); }}
                      title={`${ag.horaInicio.slice(0, 5)} - ${clienteMap[ag.clienteId] ?? "Cliente"}`}
                    >
                      {ag.horaInicio.slice(0, 5)} {clienteMap[ag.clienteId]?.split(" ")[0] ?? ""}
                    </div>
                  ))}
                  {ags.length > 3 && (
                    <div className="text-xs text-muted-foreground px-1.5">+{ags.length - 3} mais</div>
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
