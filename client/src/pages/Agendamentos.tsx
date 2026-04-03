import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Clock, SlidersHorizontal, X } from "lucide-react";
import NovaAgendaModal from "@/components/NovaAgendaModal";
import AgendamentoDetalheModal from "@/components/AgendamentoDetalheModal";
import { trpc } from "@/lib/trpc";
import { ServiceIcon } from "@/lib/serviceIcons";
import { useAuth } from "@/_core/hooks/useAuth";

const statusLabel: Record<string, string> = {
  pre_agendado: "Pré-agendado",
  aguardando_reserva: "Aguard. Reserva",
  agendado: "Agendado",
  confirmado: "Confirmado",
  em_andamento: "Em andamento",
  concluido: "Concluído",
  cancelado: "Cancelado",
  faltou: "Faltou",
};

const statusStyle: Record<string, { bg: string; color: string }> = {
  pre_agendado:       { bg: "oklch(55% 0.22 264 / 12%)", color: "oklch(45% 0.18 264)" },
  aguardando_reserva: { bg: "oklch(72% 0.16 80 / 14%)",  color: "oklch(42% 0.14 75)" },
  agendado:           { bg: "oklch(55% 0.22 264 / 12%)", color: "oklch(45% 0.18 264)" },
  confirmado:         { bg: "oklch(62% 0.18 155 / 14%)", color: "oklch(35% 0.14 155)" },
  em_andamento:       { bg: "oklch(68% 0.18 80 / 14%)",  color: "oklch(38% 0.14 80)" },
  concluido:          { bg: "oklch(55% 0.04 260 / 10%)", color: "oklch(40% 0.04 260)" },
  cancelado:          { bg: "oklch(58% 0.22 25 / 12%)",  color: "oklch(40% 0.18 25)" },
  faltou:             { bg: "oklch(58% 0.22 25 / 12%)",  color: "oklch(40% 0.18 25)" },
};

function formatCurrency(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

export default function Agendamentos() {
  const { user } = useAuth();
  const [novaAgendaOpen, setNovaAgendaOpen] = useState(false);
  const [agSelecionado, setAgSelecionado] = useState<number | null>(null);
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [busca, setBusca] = useState("");
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);

  // Se o usuário é profissional vinculado, filtra apenas seus agendamentos
  const profissionalVinculadoId = (user as any)?.profissionalId ?? null;

  const today = new Date().toISOString().split("T")[0];
  const [dataInicio, setDataInicio] = useState(today);
  const [dataFim, setDataFim] = useState(today);

  const { data: agendamentos } = trpc.agendamentos.list.useQuery({ dataInicio, dataFim });
  const { data: clientes } = trpc.clientes.list.useQuery();
  const { data: profissionais } = trpc.profissionais.list.useQuery();
  const { data: servicos } = trpc.servicos.list.useQuery();

  const clienteMap = useMemo(() => {
    const m: Record<number, string> = {};
    clientes?.forEach(c => { m[c.id] = c.nome; });
    return m;
  }, [clientes]);

  const profMap = useMemo(() => {
    const m: Record<number, { nome: string; cor: string }> = {};
    profissionais?.forEach(p => { m[p.id] = { nome: p.nome, cor: p.corCalendario ?? "oklch(55% 0.22 264)" }; });
    return m;
  }, [profissionais]);

  const servicoMap = useMemo(() => {
    const m: Record<number, string> = {};
    servicos?.forEach(s => { m[s.id] = s.nome; });
    return m;
  }, [servicos]);

  const filtrados = useMemo(() => {
    return (agendamentos ?? []).filter(ag => {
      const matchStatus = filtroStatus === "todos" || ag.status === filtroStatus;
      const nomeCliente = clienteMap[ag.clienteId] ?? "";
      const matchBusca = !busca || nomeCliente.toLowerCase().includes(busca.toLowerCase());
      // Filtro automático: profissional vinculado vê apenas seus próprios agendamentos
      const matchProfissional = !profissionalVinculadoId || ag.profissionalId === profissionalVinculadoId;
      return matchStatus && matchBusca && matchProfissional;
    }).sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));
  }, [agendamentos, filtroStatus, busca, clienteMap, profissionalVinculadoId]);

  const filtrosAtivos = filtroStatus !== "todos" || dataInicio !== today || dataFim !== today;

  return (
    <div className="p-4 lg:p-6 space-y-4 max-w-7xl mx-auto animate-in-up">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-bold tracking-tight text-xl lg:text-2xl">Agendamentos</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {filtrados.length} resultado{filtrados.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button onClick={() => setNovaAgendaOpen(true)} className="btn-primary py-2 px-3 text-xs">
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Novo Agendamento</span>
          <span className="sm:hidden">Novo</span>
        </button>
      </div>

      {/* ── Filtros ─────────────────────────────────────────────────────── */}
      {/* Barra de busca + botão filtros (mobile) */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar cliente..."
            className="pl-9 h-10"
            value={busca}
            onChange={e => setBusca(e.target.value)}
          />
        </div>
        {/* Botão filtros mobile */}
        <button
          onClick={() => setFiltrosAbertos(!filtrosAbertos)}
          className="lg:hidden flex items-center gap-1.5 px-3 h-10 rounded-lg border text-sm font-medium transition-colors relative"
          style={{
            background: filtrosAtivos ? "oklch(55% 0.22 264 / 10%)" : "transparent",
            borderColor: filtrosAtivos ? "oklch(55% 0.22 264 / 40%)" : "oklch(88% 0.010 250)",
            color: filtrosAtivos ? "oklch(45% 0.18 264)" : "oklch(45% 0.010 260)",
          }}>
          <SlidersHorizontal className="w-4 h-4" />
          {filtrosAtivos && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full"
              style={{ background: "oklch(55% 0.22 264)" }} />
          )}
        </button>
      </div>

      {/* Filtros expandidos (mobile) / sempre visíveis (desktop) */}
      <div className={`${filtrosAbertos ? "flex" : "hidden"} lg:flex flex-wrap gap-2`}>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-shrink-0 self-center">
          <span>De</span>
        </div>
        <Input
          type="date"
          value={dataInicio}
          onChange={e => setDataInicio(e.target.value)}
          className="w-auto h-9 text-sm"
        />
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-shrink-0 self-center">
          <span>até</span>
        </div>
        <Input
          type="date"
          value={dataFim}
          onChange={e => setDataFim(e.target.value)}
          className="w-auto h-9 text-sm"
        />
        <Select value={filtroStatus} onValueChange={setFiltroStatus}>
          <SelectTrigger className="w-auto min-w-[140px] h-9 text-sm">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            {Object.entries(statusLabel).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {filtrosAtivos && (
          <button
            onClick={() => { setFiltroStatus("todos"); setDataInicio(today); setDataFim(today); }}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors h-9 px-2">
            <X className="w-3.5 h-3.5" />
            Limpar
          </button>
        )}
      </div>

      {/* ── Lista ───────────────────────────────────────────────────────── */}
      <div className="card-elegant overflow-hidden">
        {filtrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-center px-6">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: "oklch(55% 0.22 264 / 8%)" }}>
              <Clock className="w-5 h-5" style={{ color: "oklch(55% 0.22 264)" }} />
            </div>
            <p className="text-sm font-medium text-foreground mb-1">Nenhum agendamento encontrado</p>
            <p className="text-xs text-muted-foreground">Tente ajustar os filtros ou criar um novo agendamento</p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: "oklch(94% 0.008 250)" }}>
            {filtrados.map(ag => {
              const servicoNome = servicoMap[ag.servicoId] ?? "";
              const prof = profMap[ag.profissionalId];
              const st = statusStyle[ag.status] ?? statusStyle.agendado;
              return (
                <div
                  key={ag.id}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={() => setAgSelecionado(ag.id)}
                >
                  {/* Ícone do serviço — oculto em telas muito pequenas */}
                  <div className="hidden sm:block flex-shrink-0">
                    <ServiceIcon serviceName={servicoNome} size="md" showBackground />
                  </div>

                  {/* Barra colorida do profissional (mobile) */}
                  <div className="sm:hidden w-1 h-10 rounded-full flex-shrink-0"
                    style={{ background: prof?.cor ?? "oklch(55% 0.22 264)" }} />

                  {/* Data e hora */}
                  <div className="text-center flex-shrink-0 w-12">
                    <p className="text-[10px] text-muted-foreground leading-tight">
                      {ag.data.split("-").reverse().slice(0, 2).join("/")}
                    </p>
                    <p className="text-sm font-bold tabular-nums">{ag.horaInicio.slice(0, 5)}</p>
                  </div>

                  {/* Separador */}
                  <div className="hidden sm:block w-px h-8 bg-border flex-shrink-0" />

                  {/* Cliente e serviço */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{clienteMap[ag.clienteId] ?? "—"}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {servicoNome || "—"}
                      {prof && <span className="hidden sm:inline"> · {prof.nome.split(" ")[0]}</span>}
                    </p>
                  </div>

                  {/* Status */}
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-medium flex-shrink-0 whitespace-nowrap"
                    style={{ background: st.bg, color: st.color }}>
                    {statusLabel[ag.status] ?? ag.status}
                  </span>

                  {/* Valor — oculto em mobile pequeno */}
                  <span className="hidden sm:block text-sm font-bold flex-shrink-0 tabular-nums"
                    style={{ color: "oklch(35% 0.14 155)" }}>
                    {formatCurrency(parseFloat(String(ag.valorTotal)))}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {novaAgendaOpen && <NovaAgendaModal open={novaAgendaOpen} onClose={() => setNovaAgendaOpen(false)} />}
      {agSelecionado && (
        <AgendamentoDetalheModal
          agendamentoId={agSelecionado}
          open={!!agSelecionado}
          onClose={() => setAgSelecionado(null)}
        />
      )}
    </div>
  );
}
