import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Clock, CheckCircle2, XCircle, RefreshCw, Send, MessageSquare, Filter, ChevronRight, Phone, Bot, CalendarClock, AlertTriangle, RotateCcw } from "lucide-react";
import { toast } from "sonner";

type StatusFila = "pendente" | "enviado" | "falhou" | "todos";
type Periodo = "hoje" | "semana" | "mes" | "todos";
type Ordenacao = "proximos" | "recentes";

type FilaRow = {
  id: number;
  automacaoNome: string | null;
  clienteNome: string | null;
  telefone: string | null;
  canal: string;
  mensagem: string | null;
  status: string;
  erroDetalhe: string | null;
  enviarEm: string | null;
  criadoEm: string;
  tempoRestante: string | null;
  agendamentoId: number | null;
  servicoNome: string | null;
};

function StatusBadge({ status, tempoRestante }: { status: string; tempoRestante?: string | null }) {
  if (status === "pendente") {
    return (
      <div className="flex flex-col items-end gap-0.5">
        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 text-xs">
          <Clock className="w-3 h-3 mr-1" />
          Pendente
        </Badge>
        {tempoRestante && (
          <span className="text-xs text-yellow-600 font-medium">{tempoRestante}</span>
        )}
      </div>
    );
  }
  if (status === "enviado") {
    return (
      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
        <CheckCircle2 className="w-3 h-3 mr-1" />
        Enviado
      </Badge>
    );
  }
  if (status === "falhou") {
    return (
      <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs">
        <XCircle className="w-3 h-3 mr-1" />
        Falhou
      </Badge>
    );
  }
  return <Badge variant="outline" className="text-xs">{status}</Badge>;
}

function CanalIcon({ canal }: { canal: string }) {
  if (canal === "whatsapp") return <MessageSquare className="w-3.5 h-3.5 text-green-600" />;
  return <Send className="w-3.5 h-3.5 text-muted-foreground" />;
}

function formatDateTime(dt: string | null | undefined) {
  if (!dt) return "—";
  return new Date(dt).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit"
  });
}

function DetalheModal({ row, open, onClose, onReenviar, reenviarLoading }: {
  row: FilaRow | null;
  open: boolean;
  onClose: () => void;
  onReenviar: (id: number) => void;
  reenviarLoading: boolean;
}) {
  if (!row) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <CanalIcon canal={row.canal} />
            Detalhes do Envio #{row.id}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Status */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Status</span>
            <StatusBadge status={row.status} tempoRestante={row.tempoRestante} />
          </div>

          {/* Automação */}
          <div className="flex items-start gap-2">
            <Bot className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Automação</p>
              <p className="text-sm font-medium">{row.automacaoNome ?? "—"}</p>
            </div>
          </div>

          {/* Cliente e telefone */}
          <div className="flex items-start gap-2">
            <Phone className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Cliente</p>
              <p className="text-sm font-medium">{row.clienteNome ?? "—"}</p>
              {row.telefone && (
                <p className="text-xs text-muted-foreground mt-0.5">{row.telefone}</p>
              )}
            </div>
          </div>

          {/* Horários */}
          <div className="flex items-start gap-2">
            <CalendarClock className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Horário programado de envio</p>
              <p className="text-sm font-medium">{formatDateTime(row.enviarEm)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Criado em: {formatDateTime(row.criadoEm)}
              </p>
            </div>
          </div>

          {/* Serviço */}
          {row.servicoNome && (
            <div className="flex items-start gap-2">
              <div className="w-4 h-4 mt-0.5 shrink-0 text-muted-foreground">✂️</div>
              <div>
                <p className="text-xs text-muted-foreground">Serviço</p>
                <p className="text-sm font-medium">{row.servicoNome}</p>
              </div>
            </div>
          )}

          {/* Agendamento vinculado */}
          {row.agendamentoId && (
            <div className="text-xs text-muted-foreground">
              Agendamento #{row.agendamentoId}
            </div>
          )}

          {/* Mensagem completa */}
          {row.mensagem && (
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">Mensagem completa</p>
              <div className="bg-muted/50 rounded-lg p-3 border">
                <pre className="text-xs whitespace-pre-wrap font-sans leading-relaxed text-foreground">
                  {row.mensagem}
                </pre>
              </div>
            </div>
          )}

          {/* Erro */}
          {row.erroDetalhe && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3">
              <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-medium text-red-700">Detalhe do erro</p>
                <p className="text-xs text-red-600 mt-0.5">{row.erroDetalhe}</p>
              </div>
            </div>
          )}

          {/* Botão reenviar */}
          {row.status === "falhou" && (
            <Button
              className="w-full gap-2"
              variant="outline"
              onClick={() => onReenviar(row.id)}
              disabled={reenviarLoading}
            >
              <RotateCcw className="w-4 h-4" />
              {reenviarLoading ? "Reenviando..." : "Reenviar agora"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function FilaAutomacoes() {
  const [status, setStatus] = useState<StatusFila>("todos");
  const [periodo, setPeriodo] = useState<Periodo>("semana");
  const [ordenacao, setOrdenacao] = useState<Ordenacao>("recentes");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedRow, setSelectedRow] = useState<FilaRow | null>(null);
  const [reenviarLoading, setReenviarLoading] = useState(false);

  const { data, isLoading, refetch } = trpc.automacoes.getFilaEnvios.useQuery(
    { status, periodo, ordenacao, limit: 100 },
    { refetchInterval: autoRefresh ? 15000 : false }
  );

  // Query separada para totais (sem filtro de status) — garante que os cards não zeram ao filtrar
  const { data: totaisData } = trpc.automacoes.getFilaTotais.useQuery(
    { periodo },
    { refetchInterval: autoRefresh ? 15000 : false }
  );

  const reenviarMutation = trpc.automacoes.reenviarItem.useMutation({
    onSuccess: () => {
      toast.success("Item reenfileirado com sucesso!");
      setSelectedRow(null);
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleReenviar = async (id: number) => {
    setReenviarLoading(true);
    try {
      await reenviarMutation.mutateAsync({ id });
    } finally {
      setReenviarLoading(false);
    }
  };

  const pendentes = totaisData?.pendentes ?? 0;
  const enviados = totaisData?.enviados ?? 0;
  const falhas = totaisData?.falhas ?? 0;

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Send className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Caixa de Saída</h1>
            <p className="text-sm text-muted-foreground">Log de mensagens enviadas, pendentes e com falha</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" />
            Atualizar
          </Button>
          <Button
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className="gap-1.5 text-xs"
          >
            <Clock className="w-3.5 h-3.5" />
            {autoRefresh ? "Auto ON" : "Auto OFF"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <button
          onClick={() => setStatus(status === "pendente" ? "todos" : "pendente")}
          className={`rounded-xl border p-3 text-left transition-all ${status === "pendente" ? "border-yellow-400 bg-yellow-50" : "bg-card hover:bg-muted/50"}`}
        >
          <p className="text-xs text-muted-foreground">Pendentes</p>
          <p className="text-2xl font-bold text-yellow-600">{pendentes}</p>
        </button>
        <button
          onClick={() => setStatus(status === "enviado" ? "todos" : "enviado")}
          className={`rounded-xl border p-3 text-left transition-all ${status === "enviado" ? "border-green-400 bg-green-50" : "bg-card hover:bg-muted/50"}`}
        >
          <p className="text-xs text-muted-foreground">Enviados</p>
          <p className="text-2xl font-bold text-green-600">{enviados}</p>
        </button>
        <button
          onClick={() => setStatus(status === "falhou" ? "todos" : "falhou")}
          className={`rounded-xl border p-3 text-left transition-all ${status === "falhou" ? "border-red-400 bg-red-50" : "bg-card hover:bg-muted/50"}`}
        >
          <p className="text-xs text-muted-foreground">Falhas</p>
          <p className="text-2xl font-bold text-red-600">{falhas}</p>
        </button>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
        <Select value={status} onValueChange={v => setStatus(v as StatusFila)}>
          <SelectTrigger className="w-32 h-8 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="pendente">Pendentes</SelectItem>
            <SelectItem value="enviado">Enviados</SelectItem>
            <SelectItem value="falhou">Falhas</SelectItem>
          </SelectContent>
        </Select>
        <Select value={periodo} onValueChange={v => setPeriodo(v as Periodo)}>
          <SelectTrigger className="w-32 h-8 text-xs"><SelectValue placeholder="Período" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="hoje">Hoje</SelectItem>
            <SelectItem value="semana">Esta semana</SelectItem>
            <SelectItem value="mes">Este mês</SelectItem>
            <SelectItem value="todos">Todos</SelectItem>
          </SelectContent>
        </Select>
        <Select value={ordenacao} onValueChange={v => setOrdenacao(v as Ordenacao)}>
          <SelectTrigger className="w-36 h-8 text-xs"><SelectValue placeholder="Ordenação" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="recentes">Mais recentes</SelectItem>
            <SelectItem value="proximos">Próximos envios</SelectItem>
          </SelectContent>
        </Select>
        {status !== "todos" && (
          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setStatus("todos")}>
            Limpar filtro
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando...</div>
      ) : !data || data.rows.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Send className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="text-muted-foreground font-medium">Nenhum envio encontrado</p>
            <p className="text-sm text-muted-foreground mt-1">Tente ajustar os filtros ou aguarde novos envios</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {data.total} envio{data.total !== 1 ? "s" : ""} encontrado{data.total !== 1 ? "s" : ""}
              {autoRefresh && <span className="ml-2 text-xs text-green-600">• Atualização automática ativa</span>}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {data.rows.map((row) => (
                <button
                  key={row.id}
                  className="w-full flex items-start gap-3 px-4 py-3 hover:bg-muted/40 transition-colors text-left group"
                  onClick={() => setSelectedRow(row as unknown as FilaRow)}
                >
                  <div className="mt-0.5 shrink-0"><CanalIcon canal={row.canal} /></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium truncate">{row.clienteNome ?? "Cliente"}</span>
                      <span className="text-xs text-muted-foreground">·</span>
                      <span className="text-xs text-muted-foreground truncate">{row.automacaoNome ?? "Automação"}</span>
                      {row.servicoNome && (
                        <>
                          <span className="text-xs text-muted-foreground">·</span>
                          <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full truncate">{row.servicoNome}</span>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {row.telefone && (
                        <span className="text-xs text-muted-foreground">{row.telefone}</span>
                      )}
                      {row.enviarEm && (
                        <>
                          <span className="text-xs text-muted-foreground">·</span>
                          <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                            <CalendarClock className="w-3 h-3" />
                            {formatDateTime(String(row.enviarEm))}
                          </span>
                        </>
                      )}
                    </div>
                    {row.mensagem && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-1 italic">
                        "{row.mensagem.slice(0, 90)}{row.mensagem.length > 90 ? "..." : ""}"
                      </p>
                    )}
                    {row.erroDetalhe && (
                      <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        {row.erroDetalhe.slice(0, 60)}{row.erroDetalhe.length > 60 ? "..." : ""}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 flex flex-col items-end gap-1">
                    <StatusBadge status={row.status} tempoRestante={row.tempoRestante} />
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <DetalheModal
        row={selectedRow}
        open={!!selectedRow}
        onClose={() => setSelectedRow(null)}
        onReenviar={handleReenviar}
        reenviarLoading={reenviarLoading}
      />
    </div>
  );
}
