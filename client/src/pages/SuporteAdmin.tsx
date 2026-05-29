import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { MessageCircle, Clock, CheckCircle2, AlertTriangle, XCircle, RefreshCw, Send, Building2, ChevronLeft } from "lucide-react";

// ─── Tipos ────────────────────────────────────────────────────────────────────

type StatusChamado = "aberto" | "em_atendimento" | "aguardando_cliente" | "resolvido" | "fechado";
type PrioridadeChamado = "baixa" | "media" | "alta" | "critica";

const STATUS_CONFIG: Record<StatusChamado, { label: string; color: string; icon: React.ReactNode }> = {
  aberto:             { label: "Aberto",            color: "bg-blue-500/15 text-blue-400 border-blue-500/30",    icon: <MessageCircle className="w-3 h-3" /> },
  em_atendimento:     { label: "Em atendimento",    color: "bg-amber-500/15 text-amber-400 border-amber-500/30", icon: <Clock className="w-3 h-3" /> },
  aguardando_cliente: { label: "Aguardando cliente",color: "bg-purple-500/15 text-purple-400 border-purple-500/30", icon: <AlertTriangle className="w-3 h-3" /> },
  resolvido:          { label: "Resolvido",         color: "bg-green-500/15 text-green-400 border-green-500/30", icon: <CheckCircle2 className="w-3 h-3" /> },
  fechado:            { label: "Fechado",           color: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",    icon: <XCircle className="w-3 h-3" /> },
};

const PRIORIDADE_CONFIG: Record<PrioridadeChamado, { label: string; color: string }> = {
  baixa:   { label: "Baixa",   color: "bg-zinc-500/15 text-zinc-400" },
  media:   { label: "Média",   color: "bg-blue-500/15 text-blue-400" },
  alta:    { label: "Alta",    color: "bg-orange-500/15 text-orange-400" },
  critica: { label: "Crítica", color: "bg-red-500/15 text-red-400" },
};

function formatDate(d: Date | string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function timeAgo(d: Date | string | null | undefined) {
  if (!d) return "";
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `${mins}min atrás`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h atrás`;
  return `${Math.floor(hrs / 24)}d atrás`;
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function SuporteAdmin() {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [resposta, setResposta] = useState("");
  const [agenteNome, setAgenteNome] = useState("Suporte Hubly");
  const [filtroStatus, setFiltroStatus] = useState<string>("todos");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const chamadosQuery = trpc.suporte.adminListarChamados.useQuery(undefined, {
    refetchInterval: 15000,
  });

  const mensagensQuery = trpc.suporte.adminGetMensagens.useQuery(
    { chamadoId: selectedId! },
    { enabled: selectedId !== null, refetchInterval: 8000 }
  );

  const responderMutation = trpc.suporte.adminResponderChamado.useMutation({
    onSuccess: () => {
      setResposta("");
      mensagensQuery.refetch();
      chamadosQuery.refetch();
      toast.success("Resposta enviada e notificação push disparada!");
    },
    onError: () => toast.error("Erro ao enviar resposta"),
  });

  const atualizarStatusMutation = trpc.suporte.adminAtualizarStatus.useMutation({
    onSuccess: () => {
      chamadosQuery.refetch();
      mensagensQuery.refetch();
      toast.success("Status atualizado");
    },
    onError: () => toast.error("Erro ao atualizar status"),
  });

  // Scroll para o final das mensagens
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensagensQuery.data]);

  const chamados = chamadosQuery.data ?? [];
  const chamadosFiltrados = filtroStatus === "todos"
    ? chamados
    : chamados.filter(c => c.status === filtroStatus);

  const chamadoSelecionado = chamados.find(c => c.id === selectedId);
  const mensagens = mensagensQuery.data ?? [];

  // Contadores por status
  const contadores = chamados.reduce((acc, c) => {
    acc[c.status] = (acc[c.status] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const abertosUrgentes = chamados.filter(c =>
    (c.status === "aberto" || c.status === "em_atendimento") &&
    c.slaVencidoEm && new Date(c.slaVencidoEm) < new Date()
  ).length;

  function handleEnviar() {
    if (!selectedId || !resposta.trim()) return;
    responderMutation.mutate({ chamadoId: selectedId, mensagem: resposta.trim(), agenteNome });
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between bg-zinc-900">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
            <MessageCircle className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <h1 className="font-semibold text-zinc-100 text-sm">Central de Suporte</h1>
            <p className="text-xs text-zinc-500">Hubly · Painel Orizontech</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {abertosUrgentes > 0 && (
            <span className="flex items-center gap-1.5 text-xs bg-red-500/15 text-red-400 border border-red-500/30 px-2.5 py-1 rounded-full">
              <AlertTriangle className="w-3 h-3" />
              {abertosUrgentes} SLA vencido
            </span>
          )}
          <div className="flex items-center gap-2">
            <label className="text-xs text-zinc-500">Atendente:</label>
            <input
              value={agenteNome}
              onChange={e => setAgenteNome(e.target.value)}
              className="text-xs bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-zinc-200 w-36 focus:outline-none focus:border-amber-500/50"
            />
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => chamadosQuery.refetch()}
            className="text-zinc-400 hover:text-zinc-200"
          >
            <RefreshCw className={`w-4 h-4 ${chamadosQuery.isFetching ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden" style={{ height: "calc(100vh - 65px)" }}>
        {/* Sidebar: lista de chamados */}
        <aside className="w-80 border-r border-zinc-800 flex flex-col bg-zinc-900/50 overflow-hidden">
          {/* Filtros */}
          <div className="p-3 border-b border-zinc-800 space-y-2">
            <div className="flex gap-1.5 flex-wrap">
              {[
                { key: "todos", label: `Todos (${chamados.length})` },
                { key: "aberto", label: `Abertos (${contadores.aberto ?? 0})` },
                { key: "em_atendimento", label: `Em atend. (${contadores.em_atendimento ?? 0})` },
                { key: "resolvido", label: `Resolvidos (${contadores.resolvido ?? 0})` },
              ].map(f => (
                <button
                  key={f.key}
                  onClick={() => setFiltroStatus(f.key)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                    filtroStatus === f.key
                      ? "bg-amber-500/20 text-amber-400 border-amber-500/40"
                      : "bg-zinc-800 text-zinc-400 border-zinc-700 hover:border-zinc-600"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Lista */}
          <div className="flex-1 overflow-y-auto">
            {chamadosQuery.isLoading ? (
              <div className="flex items-center justify-center h-32 text-zinc-500 text-sm">Carregando...</div>
            ) : chamadosFiltrados.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-zinc-500 text-sm gap-2">
                <CheckCircle2 className="w-8 h-8 text-zinc-700" />
                <span>Nenhum chamado</span>
              </div>
            ) : (
              chamadosFiltrados.map(c => {
                const slaVencido = c.slaVencidoEm && new Date(c.slaVencidoEm) < new Date() &&
                  c.status !== "resolvido" && c.status !== "fechado";
                const st = STATUS_CONFIG[c.status as StatusChamado];
                const pr = PRIORIDADE_CONFIG[c.prioridade as PrioridadeChamado];
                return (
                  <button
                    key={c.id}
                    onClick={() => setSelectedId(c.id)}
                    className={`w-full text-left px-4 py-3 border-b border-zinc-800/60 transition-colors hover:bg-zinc-800/50 ${
                      selectedId === c.id ? "bg-zinc-800/80 border-l-2 border-l-amber-500" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <span className="text-xs font-medium text-zinc-200 line-clamp-1 flex-1">{c.titulo}</span>
                      <span className="text-xs text-zinc-500 whitespace-nowrap">{timeAgo(c.updatedAt)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded border ${st.color}`}>
                        {st.icon} {st.label}
                      </span>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${pr.color}`}>{pr.label}</span>
                      {slaVencido && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-red-500/15 text-red-400">SLA!</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 mt-1.5 text-xs text-zinc-500">
                      <Building2 className="w-3 h-3" />
                      <span className="line-clamp-1">{c.nomeEmpresa ?? `Empresa #${c.empresaId}`}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* Área principal: chat */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {!selectedId ? (
            <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 gap-3">
              <MessageCircle className="w-12 h-12 text-zinc-700" />
              <p className="text-sm">Selecione um chamado para ver as mensagens</p>
            </div>
          ) : (
            <>
              {/* Header do chamado */}
              <div className="border-b border-zinc-800 px-6 py-3 bg-zinc-900/50 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    onClick={() => setSelectedId(null)}
                    className="text-zinc-500 hover:text-zinc-300 md:hidden"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-zinc-100 truncate">{chamadoSelecionado?.titulo}</p>
                    <p className="text-xs text-zinc-500">
                      {chamadoSelecionado?.nomeEmpresa ?? `Empresa #${chamadoSelecionado?.empresaId}`} · #{selectedId} · {formatDate(chamadoSelecionado?.createdAt)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Select
                    value={chamadoSelecionado?.status}
                    onValueChange={val =>
                      atualizarStatusMutation.mutate({ chamadoId: selectedId, status: val as StatusChamado })
                    }
                  >
                    <SelectTrigger className="h-7 text-xs bg-zinc-800 border-zinc-700 w-44">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                        <SelectItem key={k} value={k} className="text-xs">{v.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {chamadoSelecionado?.avaliacaoNota && (
                    <span className="text-xs bg-amber-500/15 text-amber-400 px-2 py-1 rounded">
                      ⭐ {chamadoSelecionado.avaliacaoNota}/5
                    </span>
                  )}
                </div>
              </div>

              {/* Mensagens */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {mensagensQuery.isLoading ? (
                  <div className="flex justify-center py-8 text-zinc-500 text-sm">Carregando mensagens...</div>
                ) : mensagens.length === 0 ? (
                  <div className="flex justify-center py-8 text-zinc-500 text-sm">Nenhuma mensagem ainda</div>
                ) : (
                  mensagens.map(m => {
                    const isAgente = m.autorTipo === "agente" || m.autorTipo === "ia";
                    return (
                      <div key={m.id} className={`flex ${isAgente ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                          isAgente
                            ? "bg-amber-500/20 border border-amber-500/30 rounded-br-sm"
                            : "bg-zinc-800 border border-zinc-700 rounded-bl-sm"
                        }`}>
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs font-medium ${isAgente ? "text-amber-400" : "text-zinc-400"}`}>
                              {m.autorNome ?? (m.autorTipo === "ia" ? "IA" : "Cliente")}
                            </span>
                            <span className="text-xs text-zinc-600">{formatDate(m.createdAt)}</span>
                          </div>
                          <p className="text-sm text-zinc-200 whitespace-pre-wrap">{m.conteudo}</p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input de resposta */}
              {chamadoSelecionado?.status !== "fechado" && (
                <div className="border-t border-zinc-800 p-4 bg-zinc-900/50">
                  <div className="flex gap-3">
                    <Textarea
                      value={resposta}
                      onChange={e => setResposta(e.target.value)}
                      placeholder="Digite sua resposta... (o cliente receberá uma notificação push)"
                      className="flex-1 min-h-[80px] max-h-[160px] bg-zinc-800 border-zinc-700 text-zinc-200 placeholder:text-zinc-500 resize-none text-sm focus:border-amber-500/50"
                      onKeyDown={e => {
                        if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleEnviar();
                      }}
                    />
                    <div className="flex flex-col justify-end">
                      <Button
                        onClick={handleEnviar}
                        disabled={!resposta.trim() || responderMutation.isPending}
                        className="bg-amber-500 hover:bg-amber-600 text-zinc-900 font-medium h-10 px-4"
                      >
                        {responderMutation.isPending ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                      </Button>
                      <p className="text-xs text-zinc-600 mt-1 text-center">Ctrl+Enter</p>
                    </div>
                  </div>
                </div>
              )}
              {chamadoSelecionado?.status === "fechado" && (
                <div className="border-t border-zinc-800 p-4 bg-zinc-900/50 text-center text-xs text-zinc-500">
                  Este chamado está fechado. Altere o status para responder.
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
