import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Clock, CheckCircle2, XCircle, RefreshCw, Send, MessageSquare, Filter, ChevronRight, Phone, Bot, CalendarClock, AlertTriangle, RotateCcw, Ban, Trash2, CalendarCheck, Search, X, PauseCircle, PlayCircle } from "lucide-react";
import { toast } from "sonner";

type StatusFila = "pendente" | "enviado" | "falhou" | "agendado" | "todos";
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
  zapiMessageId?: string | null;
  messageStatus?: string | null; // sent | delivered | read | failed
  messageStatusAt?: string | null;
};

// Ícone de status de entrega Z-API (✓ enviado, ✓✓ entregue, ✓✓ azul lido)
function MessageStatusIcon({ messageStatus }: { messageStatus?: string | null }) {
  if (!messageStatus || messageStatus === "sent") {
    return <span className="text-muted-foreground text-[11px]" title="Enviado">✓</span>;
  }
  if (messageStatus === "delivered") {
    return <span className="text-muted-foreground text-[11px] font-semibold" title="Entregue">✓✓</span>;
  }
  if (messageStatus === "read") {
    return <span className="text-blue-500 text-[11px] font-bold" title="Lido">✓✓</span>;
  }
  if (messageStatus === "failed") {
    return <span className="text-red-500 text-[11px]" title="Falhou">✕</span>;
  }
  return null;
}

function StatusBadge({ status, tempoRestante, messageStatus, canal }: { status: string; tempoRestante?: string | null; messageStatus?: string | null; canal?: string }) {
  if (status === "agendado") {
    return (
      <div className="flex flex-col items-end gap-0.5">
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
          <CalendarCheck className="w-3 h-3 mr-1" />
          Agendado
        </Badge>
        {tempoRestante && (
          <span className="text-xs text-blue-600 font-medium">{tempoRestante}</span>
        )}
      </div>
    );
  }
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
      <div className="flex items-center gap-1">
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          Enviado
        </Badge>
        {canal === "whatsapp" && <MessageStatusIcon messageStatus={messageStatus} />}
      </div>
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

function DetalheModal({ row, open, onClose, onReenviar, reenviarLoading, onCancelar, cancelarLoading, onLimpar, limparLoading, onReagendar, reagendarLoading }: {
  row: FilaRow | null;
  open: boolean;
  onClose: () => void;
  onReenviar: (id: number) => void;
  reenviarLoading: boolean;
  onCancelar: (id: number) => void;
  cancelarLoading: boolean;
  onLimpar: (id: number) => void;
  limparLoading: boolean;
  onReagendar: (id: number, horasDelay: number) => void;
  reagendarLoading: boolean;
}) {
  const [delayHoras, setDelayHoras] = useState<string>("24");
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
            <StatusBadge status={row.status} tempoRestante={row.tempoRestante} messageStatus={row.messageStatus} canal={row.canal} />
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

          {/* Botões para itens com falha */}
          {row.status === "falhou" && (
            <div className="flex flex-col gap-2">
              <Button
                className="w-full gap-2"
                variant="outline"
                onClick={() => onReenviar(row.id)}
                disabled={reenviarLoading || reagendarLoading}
              >
                <RotateCcw className="w-4 h-4" />
                {reenviarLoading ? "Reenviando..." : "Reenviar agora"}
              </Button>
              <div className="flex gap-2">
                <Select value={delayHoras} onValueChange={setDelayHoras}>
                  <SelectTrigger className="w-28 shrink-0 text-xs h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Em 1 hora</SelectItem>
                    <SelectItem value="6">Em 6 horas</SelectItem>
                    <SelectItem value="24">Em 24 horas</SelectItem>
                    <SelectItem value="48">Em 48 horas</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  className="flex-1 gap-2"
                  variant="outline"
                  onClick={() => onReagendar(row.id, parseInt(delayHoras))}
                  disabled={reagendarLoading || reenviarLoading}
                >
                  <CalendarCheck className="w-4 h-4 text-blue-500" />
                  <span className="text-blue-600">{reagendarLoading ? "Reagendando..." : "Reagendar"}</span>
                </Button>
              </div>
            </div>
          )}
          {/* Botão cancelar — apenas para pendentes, agendados e falhados */}
          {(row.status === "pendente" || row.status === "agendado" || row.status === "falhou") && (
            <Button
              className="w-full gap-2 border-red-200 hover:bg-red-50"
              variant="outline"
              onClick={() => onCancelar(row.id)}
              disabled={cancelarLoading}
            >
              <Trash2 className="w-4 h-4 text-red-500" />
              <span className="text-red-600">{cancelarLoading ? "Cancelando..." : "Cancelar e remover envio"}</span>
            </Button>
          )}
          {/* Botão limpar — apenas para enviados */}
          {row.status === "enviado" && (
            <Button
              className="w-full gap-2 border-gray-200 hover:bg-gray-50"
              variant="outline"
              onClick={() => onLimpar(row.id)}
              disabled={limparLoading}
            >
              <Trash2 className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600">{limparLoading ? "Limpando..." : "Limpar registro"}</span>
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
  const [automacaoFiltro, setAutomacaoFiltro] = useState<string>("__todos__");
  const [buscaCliente, setBuscaCliente] = useState<string>("");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedRow, setSelectedRow] = useState<FilaRow | null>(null);
  const [reenviarLoading, setReenviarLoading] = useState(false);
  const [cancelarLoading, setCancelarLoading] = useState(false);
  const [limparLoading, setLimparLoading] = useState(false);

  // Seleção múltipla
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [modoSelecao, setModoSelecao] = useState(false);
  const [cancelarLoteLoading, setCancelarLoteLoading] = useState(false);
  const [limparEnviadosOpen, setLimparEnviadosOpen] = useState(false);
  const [limparEnviadosLoading, setLimparEnviadosLoading] = useState(false);

  // Pausa geral de automações
  const { data: pausadaData, refetch: refetchPausa } = trpc.configuracoes.getAutomacoesPausadas.useQuery();
  const isPausada = pausadaData ?? false;
  const togglePausaMutation = trpc.configuracoes.toggleAutomacoesPausadas.useMutation({
    onSuccess: (res) => {
      refetchPausa();
      if (res.pausado) {
        toast.warning("⚠️ Automações PAUSADAS — nenhuma mensagem será enviada até você religar.");
      } else {
        toast.success("✅ Automações REATIVADAS — mensagens voltam a ser enviadas normalmente.");
      }
    },
    onError: (e) => toast.error(e.message),
  });

  const { data, isLoading, refetch } = trpc.automacoes.getFilaEnvios.useQuery(
    { status, periodo, ordenacao, automacaoNome: automacaoFiltro === "__todos__" ? undefined : automacaoFiltro, limit: 100 },
    { refetchInterval: autoRefresh ? 15000 : false }
  );

  // Lista de automações distintas para o seletor de filtro
  const { data: automacoesNomesData } = trpc.automacoes.getAutomacoesNomes.useQuery(
    undefined,
    { staleTime: 60000 }
  );

  // Query separada para totais (sem filtro de status) — garante que os cards não zeram ao filtrar
  const { data: totaisData } = trpc.automacoes.getFilaTotais.useQuery(
    { periodo },
    { refetchInterval: autoRefresh ? 15000 : false }
  );

  const limparItemMutation = trpc.automacoes.limparItem.useMutation({
    onSuccess: () => {
      toast.success("Registro limpo com sucesso!");
      setSelectedRow(null);
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const cancelarMutation = trpc.automacoes.cancelarItem.useMutation({
    onSuccess: () => {
      toast.success("Envio cancelado e removido!");
      setSelectedRow(null);
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const cancelarItensMutation = trpc.automacoes.cancelarItens.useMutation({
    onSuccess: () => {
      toast.success(`${selectedIds.size} envio(s) cancelado(s) e removido(s)!`);
      setSelectedIds(new Set());
      setModoSelecao(false);
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const limparEnviadosMutation = trpc.automacoes.limparEnviados.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.deletedCount} envio(s) removido(s) com sucesso!`);
      setLimparEnviadosOpen(false);
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleCancelar = async (id: number) => {
    setCancelarLoading(true);
    try {
      await cancelarMutation.mutateAsync({ id });
    } finally {
      setCancelarLoading(false);
    }
  };

  const handleLimparItem = async (id: number) => {
    setLimparLoading(true);
    try {
      await limparItemMutation.mutateAsync({ id });
    } finally {
      setLimparLoading(false);
    }
  };

  const handleCancelarLote = async () => {
    if (selectedIds.size === 0) return;
    setCancelarLoteLoading(true);
    try {
      await cancelarItensMutation.mutateAsync({ ids: Array.from(selectedIds) });
    } finally {
      setCancelarLoteLoading(false);
    }
  };

  const handleLimparEnviados = async () => {
    setLimparEnviadosLoading(true);
    try {
      await limparEnviadosMutation.mutateAsync({ periodo, automacaoNome: automacaoFiltro === "__todos__" ? undefined : automacaoFiltro });
    } finally {
      setLimparEnviadosLoading(false);
    }
  };

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

  const [reagendarLoading, setReagendarLoading] = useState(false);
  const reagendarMutation = trpc.automacoes.reagendarItem.useMutation({
    onSuccess: (data) => {
      const dt = new Date(data.enviarEm).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
      toast.success(`Reagendado para ${dt}`);
      setSelectedRow(null);
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleReagendar = async (id: number, horasDelay: number) => {
    setReagendarLoading(true);
    try {
      await reagendarMutation.mutateAsync({ id, horasDelay });
    } finally {
      setReagendarLoading(false);
    }
  };

  // Filtro local por nome do cliente
  const rowsFiltradas = (data?.rows ?? []).filter(r =>
    !buscaCliente.trim() || (r.clienteNome ?? "").toLowerCase().includes(buscaCliente.toLowerCase())
  );

  // Linhas pendentes, agendadas ou falhadas visíveis (para selecionar todas)
  const linhasCancelaveis = rowsFiltradas.filter(r => r.status === "pendente" || r.status === "agendado" || r.status === "falhou");
  const linhasPendentes = linhasCancelaveis; // alias para compatibilidade
  const todasSelecionadas = linhasCancelaveis.length > 0 && linhasCancelaveis.every(r => selectedIds.has(r.id));

  const toggleSelecionarTodas = () => {
    if (todasSelecionadas) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(linhasCancelaveis.map(r => r.id)));
    }
  };

  const toggleItem = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const pendentes = totaisData?.pendentes ?? 0;
  const agendados = totaisData?.agendados ?? 0;
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
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="gap-1.5 text-xs"
          >
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
            {autoRefresh ? "Atualizar: ON" : "Atualizar: OFF"}
          </Button>
          <Button
            variant={isPausada ? "destructive" : "outline"}
            size="sm"
            onClick={() => togglePausaMutation.mutate({ pausar: !isPausada })}
            disabled={togglePausaMutation.isPending}
            className="gap-1.5 text-xs font-semibold"
            title={isPausada ? "Automações pausadas — clique para reativar" : "Pausar todos os envios automáticos"}
          >
            {isPausada ? <PlayCircle className="w-3.5 h-3.5" /> : <PauseCircle className="w-3.5 h-3.5" />}
            {isPausada ? "Reativar" : "Pausar"}
          </Button>
        </div>
      </div>

      {/* Banner de aviso quando pausado */}
      {isPausada && (
        <div className="flex items-center gap-3 rounded-xl border border-red-300 bg-red-50 px-4 py-3">
          <PauseCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-700">⚠️ Automações pausadas</p>
            <p className="text-xs text-red-600 mt-0.5">Nenhuma mensagem será enviada enquanto a pausa estiver ativa. Faça seus ajustes e clique em <strong>Reativar</strong> quando terminar.</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => togglePausaMutation.mutate({ pausar: false })}
            disabled={togglePausaMutation.isPending}
            className="gap-1.5 text-xs border-red-300 text-red-700 hover:bg-red-100"
          >
            <PlayCircle className="w-3.5 h-3.5" />
            Reativar agora
          </Button>
        </div>
      )}

      <div className="grid grid-cols-4 gap-3">
        <button
          onClick={() => setStatus(status === "agendado" ? "todos" : "agendado")}
          className={`rounded-xl border p-3 text-left transition-all ${status === "agendado" ? "border-blue-400 bg-blue-50" : "bg-card hover:bg-muted/50"}`}
        >
          <p className="text-xs text-muted-foreground">Agendados</p>
          <p className="text-2xl font-bold text-blue-600">{agendados}</p>
        </button>
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

      {/* Campo de busca por nome do cliente */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          placeholder="Buscar por nome do cliente..."
          value={buscaCliente}
          onChange={e => setBuscaCliente(e.target.value)}
          className="w-full pl-9 pr-9 py-2 text-sm border border-input rounded-lg focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring bg-background placeholder-muted-foreground"
        />
        {buscaCliente && (
          <button
            type="button"
            onClick={() => setBuscaCliente("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
        <Select value={status} onValueChange={v => setStatus(v as StatusFila)}>
          <SelectTrigger className="w-32 h-8 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="agendado">Agendados</SelectItem>
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
        {/* Seletor de automação */}
        {automacoesNomesData && automacoesNomesData.nomes.length > 0 && (
          <Select value={automacaoFiltro} onValueChange={setAutomacaoFiltro}>
            <SelectTrigger className="w-44 h-8 text-xs">
              <Bot className="w-3 h-3 mr-1 shrink-0" />
              <SelectValue placeholder="Automação" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__todos__">Todas as automações</SelectItem>
              {automacoesNomesData.nomes.map(nome => (
                <SelectItem key={nome} value={nome}>{nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {(status !== "todos" || automacaoFiltro !== "__todos__" || buscaCliente) && (
          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => { setStatus("todos"); setAutomacaoFiltro("__todos__"); setBuscaCliente(""); }}>
            Limpar filtros
          </Button>
        )}
        {/* Botão para limpar enviados */}
        {enviados > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5 text-red-600 border-red-200 hover:bg-red-50"
            onClick={() => setLimparEnviadosOpen(true)}
          >
            <Trash2 className="w-3.5 h-3.5" />
            Limpar enviados
          </Button>
        )}
          {/* Botão modo seleção — aparece se houver pendentes ou falhados */}
          {linhasCancelaveis.length > 0 && (
          <Button
            variant={modoSelecao ? "default" : "outline"}
            size="sm"
            className="h-8 text-xs gap-1.5 ml-auto"
            onClick={() => {
              setModoSelecao(!modoSelecao);
              setSelectedIds(new Set());
            }}
          >
            <Ban className="w-3.5 h-3.5" />
            {modoSelecao ? "Cancelar seleção" : "Selecionar para cancelar"}
          </Button>
        )}
      </div>

      {/* Barra de ação em lote */}
      {modoSelecao && (
        <div className="flex items-center gap-3 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3">
          <Checkbox
            checked={todasSelecionadas}
            onCheckedChange={toggleSelecionarTodas}
            id="selecionar-todas"
          />
          <label htmlFor="selecionar-todas" className="text-sm cursor-pointer select-none">
            {todasSelecionadas ? "Desmarcar todas" : `Selecionar todas (${linhasCancelaveis.length} itens)`}
          </label>
          {selectedIds.size > 0 && (
            <Button
              size="sm"
              variant="destructive"
              className="ml-auto gap-1.5 text-xs"
              onClick={handleCancelarLote}
              disabled={cancelarLoteLoading}
            >
              <Trash2 className="w-3.5 h-3.5" />
              {cancelarLoteLoading ? "Cancelando..." : `Cancelar ${selectedIds.size} envio(s)`}
            </Button>
          )}
        </div>
      )}

      {/* Modal de confirmação para limpar enviados */}
      <Dialog open={limparEnviadosOpen} onOpenChange={setLimparEnviadosOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Limpar enviados
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-700">
                Você está prestes a remover todos os registros de mensagens <strong>enviadas</strong> com os filtros atuais:
              </p>
              <ul className="text-xs text-red-600 mt-2 space-y-1 ml-4 list-disc">
                <li>Período: <strong>{periodo === "hoje" ? "Hoje" : periodo === "semana" ? "Esta semana" : periodo === "mes" ? "Este mês" : "Todos"}</strong></li>
                {automacaoFiltro !== "__todos__" && <li>Automação: <strong>{automacaoFiltro}</strong></li>}
              </ul>
              <p className="text-xs text-red-600 mt-2">
                Esta ação <strong>não pode ser desfeita</strong>.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setLimparEnviadosOpen(false)}
                disabled={limparEnviadosLoading}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={handleLimparEnviados}
                disabled={limparEnviadosLoading}
                className="flex-1 gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                {limparEnviadosLoading ? "Limpando..." : "Confirmar limpeza"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando...</div>
      ) : !data || data.rows.length === 0 || (buscaCliente && rowsFiltradas.length === 0 && data.rows.length === 0) ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Send className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="text-muted-foreground font-medium">Nenhum envio encontrado</p>
            <p className="text-sm text-muted-foreground mt-1">Tente ajustar os filtros ou aguarde novos envios</p>
          </CardContent>
        </Card>
      ) : rowsFiltradas.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Search className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="text-muted-foreground font-medium">Nenhum cliente encontrado</p>
            <p className="text-sm text-muted-foreground mt-1">Nenhum envio corresponde a &ldquo;{buscaCliente}&rdquo;</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {buscaCliente ? `${rowsFiltradas.length} de ${data!.total}` : data!.total} envio{(buscaCliente ? rowsFiltradas.length : data!.total) !== 1 ? "s" : ""} encontrado{(buscaCliente ? rowsFiltradas.length : data!.total) !== 1 ? "s" : ""}
              {autoRefresh && <span className="ml-2 text-xs text-green-600">• Atualização automática ativa</span>}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {rowsFiltradas.map((row) => {
                const isPendente = row.status === "pendente" || row.status === "agendado";
                const isSelected = selectedIds.has(row.id);

                return (
                  <div
                    key={row.id}
                    className={`w-full flex items-start gap-3 px-4 py-3 transition-colors text-left group ${isSelected ? "bg-yellow-50" : "hover:bg-muted/40"}`}
                  >
                    {/* Checkbox no modo seleção — pendentes e falhados */}
                    {modoSelecao && (isPendente || row.status === "falhou") && (
                      <div className="mt-1 shrink-0" onClick={e => e.stopPropagation()}>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleItem(row.id)}
                        />
                      </div>
                    )}
                    {modoSelecao && !isPendente && row.status !== "falhou" && (
                      <div className="mt-1 shrink-0 w-4" />
                    )}

                    {/* Conteúdo clicável */}
                    <button
                      className="flex-1 flex items-start gap-3 text-left min-w-0"
                      onClick={() => {
                        if (modoSelecao && (isPendente || row.status === "falhou")) {
                          toggleItem(row.id);
                        } else if (!modoSelecao) {
                          setSelectedRow(row as unknown as FilaRow);
                        }
                      }}
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
                        <StatusBadge status={row.status} tempoRestante={row.tempoRestante} messageStatus={row.messageStatus} canal={row.canal} />
                        {!modoSelecao && <ChevronRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />}
                      </div>
                    </button>
                  </div>
                );
              })}
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
        onCancelar={handleCancelar}
        cancelarLoading={cancelarLoading}
        onLimpar={handleLimparItem}
        limparLoading={limparLoading}
        onReagendar={handleReagendar}
        reagendarLoading={reagendarLoading}
      />
    </div>
  );
}
