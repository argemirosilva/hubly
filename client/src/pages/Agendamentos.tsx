import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Search, Clock } from "lucide-react";
import NovaAgendaModal from "@/components/NovaAgendaModal";
import AgendamentoDetalheModal from "@/components/AgendamentoDetalheModal";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { ServiceIcon } from "@/lib/serviceIcons";

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

const statusColor: Record<string, string> = {
  pre_agendado: "bg-purple-100 text-purple-700",
  aguardando_reserva: "bg-orange-100 text-orange-700",
  agendado: "bg-blue-100 text-blue-700",
  confirmado: "bg-emerald-100 text-emerald-700",
  em_andamento: "bg-cyan-100 text-cyan-700",
  concluido: "bg-gray-100 text-gray-600",
  cancelado: "bg-red-100 text-red-700",
  faltou: "bg-amber-100 text-amber-700",
};

function formatCurrency(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

export default function Agendamentos() {
  const [novaAgendaOpen, setNovaAgendaOpen] = useState(false);
  const [agSelecionado, setAgSelecionado] = useState<number | null>(null);
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [busca, setBusca] = useState("");

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
    const m: Record<number, string> = {};
    profissionais?.forEach(p => { m[p.id] = p.nome; });
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
      return matchStatus && matchBusca;
    }).sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));
  }, [agendamentos, filtroStatus, busca, clienteMap]);

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>
          Agendamentos
        </h1>
        <Button onClick={() => setNovaAgendaOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Novo Agendamento
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar cliente..." className="pl-9" value={busca} onChange={e => setBusca(e.target.value)} />
        </div>
        <Input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className="w-auto" />
        <Input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="w-auto" />
        <Select value={filtroStatus} onValueChange={setFiltroStatus}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            {Object.entries(statusLabel).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Lista */}
      <Card className="border-border shadow-none">
        <CardContent className="p-0">
          {filtrados.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Clock className="w-10 h-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">Nenhum agendamento encontrado</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filtrados.map(ag => {
                const servicoNome = servicoMap[ag.servicoId] ?? "";
                return (
                  <div
                    key={ag.id}
                    className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/30 transition-colors cursor-pointer group"
                    onClick={() => setAgSelecionado(ag.id)}
                  >
                    {/* Ícone do serviço */}
                    <ServiceIcon serviceName={servicoNome} size="md" showBackground />

                    {/* Data e hora */}
                    <div className="text-center min-w-[52px]">
                      <p className="text-xs text-muted-foreground">{ag.data.split("-").reverse().join("/")}</p>
                      <p className="text-sm font-semibold tabular-nums">{ag.horaInicio.slice(0, 5)}</p>
                    </div>
                    <div className="w-px h-8 bg-border" />

                    {/* Cliente e serviço */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{clienteMap[ag.clienteId] ?? "—"}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {servicoNome || "—"} · {profMap[ag.profissionalId] ?? "—"}
                      </p>
                    </div>

                    {/* Status */}
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${statusColor[ag.status] ?? "bg-gray-100 text-gray-600"}`}>
                      {statusLabel[ag.status] ?? ag.status}
                    </span>

                    {/* Valor */}
                    <span className="text-sm font-semibold flex-shrink-0 tabular-nums">
                      {formatCurrency(parseFloat(String(ag.valorTotal)))}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {novaAgendaOpen && <NovaAgendaModal open={novaAgendaOpen} onClose={() => setNovaAgendaOpen(false)} />}
      {agSelecionado && (
        <AgendamentoDetalheModal agendamentoId={agSelecionado} open={!!agSelecionado} onClose={() => setAgSelecionado(null)} />
      )}
    </div>
  );
}
