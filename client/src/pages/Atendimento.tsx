import { useState, useEffect, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  MessageCircle, Clock, CheckCircle2, AlertTriangle, XCircle,
  RefreshCw, Send, Building2, ChevronRight, Lock, Eye, EyeOff,
  Inbox, Timer, TrendingUp, ShieldAlert, Zap, Star, User, Bell, BellOff,
} from "lucide-react";

// ─── Tipos ────────────────────────────────────────────────────────────────────

type StatusChamado = "aberto" | "em_atendimento" | "aguardando_cliente" | "resolvido" | "fechado";
type PrioridadeChamado = "baixa" | "media" | "alta" | "critica";
type FilaKey = "novos" | "em_atendimento" | "aguardando_cliente" | "resolvidos_hoje" | "fechados" | "sla_vencido" | "todos";

const STATUS_CONFIG: Record<StatusChamado, { label: string; color: string; icon: React.ReactNode }> = {
  aberto:             { label: "Aberto",             color: "bg-blue-500/15 text-blue-400 border-blue-500/30",    icon: <Inbox className="w-3 h-3" /> },
  em_atendimento:     { label: "Em atendimento",     color: "bg-amber-500/15 text-amber-400 border-amber-500/30", icon: <Clock className="w-3 h-3" /> },
  aguardando_cliente: { label: "Aguardando cliente", color: "bg-purple-500/15 text-purple-400 border-purple-500/30", icon: <AlertTriangle className="w-3 h-3" /> },
  resolvido:          { label: "Resolvido",          color: "bg-green-500/15 text-green-400 border-green-500/30", icon: <CheckCircle2 className="w-3 h-3" /> },
  fechado:            { label: "Fechado",            color: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",    icon: <XCircle className="w-3 h-3" /> },
};

const PRIORIDADE_CONFIG: Record<PrioridadeChamado, { label: string; dot: string }> = {
  baixa:   { label: "Baixa",   dot: "bg-zinc-400" },
  media:   { label: "Média",   dot: "bg-blue-400" },
  alta:    { label: "Alta",    dot: "bg-orange-400" },
  critica: { label: "Crítica", dot: "bg-red-500" },
};

const FILAS: { key: FilaKey; label: string; icon: React.ReactNode }[] = [
  { key: "novos",             label: "Novos",              icon: <Inbox className="w-4 h-4" /> },
  { key: "em_atendimento",    label: "Em atendimento",     icon: <Clock className="w-4 h-4" /> },
  { key: "aguardando_cliente",label: "Aguardando cliente", icon: <AlertTriangle className="w-4 h-4" /> },
  { key: "sla_vencido",       label: "SLA vencido",        icon: <ShieldAlert className="w-4 h-4" /> },
  { key: "resolvidos_hoje",   label: "Resolvidos hoje",    icon: <CheckCircle2 className="w-4 h-4" /> },
  { key: "fechados",          label: "Fechados",           icon: <XCircle className="w-4 h-4" /> },
  { key: "todos",             label: "Todos",              icon: <MessageCircle className="w-4 h-4" /> },
];

function formatDate(d: Date | string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function timeAgo(d: Date | string | null | undefined) {
  if (!d) return "";
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `${mins}min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

function slaColor(slaVencidoEm: Date | string | null | undefined, status: string) {
  if (!slaVencidoEm || status === "resolvido" || status === "fechado") return "text-zinc-600";
  const diff = new Date(slaVencidoEm).getTime() - Date.now();
  if (diff < 0) return "text-red-400";
  if (diff < 3600000) return "text-orange-400";
  if (diff < 7200000) return "text-amber-400";
  return "text-green-500";
}

// ─── Tela de senha ────────────────────────────────────────────────────────────

function TelaLogin({ onSuccess }: { onSuccess: () => void }) {
  const [senha, setSenha] = useState("");
  const [show, setShow] = useState(false);
  const verificar = trpc.suporte.adminVerificarSenha.useMutation({
    onSuccess: () => {
      sessionStorage.setItem("hubly_suporte_auth", "1");
      onSuccess();
    },
    onError: () => toast.error("Senha incorreta"),
  });

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="w-full max-w-sm mx-4">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/20 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-6 h-6 text-amber-400" />
          </div>
          <h1 className="text-xl font-semibold text-zinc-100">Central de Atendimento</h1>
          <p className="text-sm text-zinc-500 mt-1">Hubly · Acesso restrito</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
          <div className="relative">
            <input
              type={show ? "text" : "password"}
              value={senha}
              onChange={e => setSenha(e.target.value)}
              onKeyDown={e => e.key === "Enter" && verificar.mutate({ senha })}
              placeholder="Senha de acesso"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-zinc-200 placeholder:text-zinc-500 text-sm focus:outline-none focus:border-amber-500/50 pr-10"
            />
            <button
              onClick={() => setShow(!show)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
            >
              {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <Button
            onClick={() => verificar.mutate({ senha })}
            disabled={!senha || verificar.isPending}
            className="w-full bg-amber-500 hover:bg-amber-600 text-zinc-900 font-medium h-11"
          >
            {verificar.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Entrar"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Hook de push para atendentes ───────────────────────────────────────────
function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const arr = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) arr[i] = rawData.charCodeAt(i);
  return arr.buffer;
}

function usePushAtendente(autenticado: boolean, empresaId: number | null) {
  const [pushStatus, setPushStatus] = useState<"idle" | "granted" | "denied" | "loading">("idle");
  const vapidQuery = trpc.suporte.getVapidPublicKey.useQuery(undefined, { enabled: autenticado });
  const subscribeMutation = trpc.suporte.adminSubscribePush.useMutation();
  const unsubscribeMutation = trpc.suporte.adminUnsubscribePush.useMutation();

  // Verificar status atual ao montar e ativar automaticamente se permissão ainda não foi solicitada
  const ativarPushRef = useRef<(() => Promise<void>) | null>(null);
  useEffect(() => {
    if (!autenticado || !empresaId) return;
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return;
    if (Notification.permission === "granted") {
      setPushStatus("granted");
    } else if (Notification.permission === "denied") {
      setPushStatus("denied");
    } else {
      // Permissão ainda não solicitada — ativar automaticamente após 2s
      setPushStatus("idle");
      const timer = setTimeout(() => {
        if (ativarPushRef.current) ativarPushRef.current();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [autenticado, empresaId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Vincular ref para o auto-trigger
  useEffect(() => {
    ativarPushRef.current = ativarPush;
  });

  async function ativarPush() {
    if (!empresaId || !vapidQuery.data?.publicKey) {
      toast.error("Chave VAPID não disponível");
      return;
    }
    try {
      setPushStatus("loading");
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setPushStatus("denied");
        toast.error("Permissão de notificação negada");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidQuery.data.publicKey),
      });
      const json = sub.toJSON();
      await subscribeMutation.mutateAsync({
        empresaId,
        endpoint: json.endpoint!,
        p256dh: json.keys?.p256dh ?? "",
        auth: json.keys?.auth ?? "",
        userAgent: navigator.userAgent,
      });
      setPushStatus("granted");
      toast.success("🔔 Notificações ativadas! Você receberá alertas de novos chamados.");
    } catch (e) {
      console.error("[Push] Erro ao ativar:", e);
      setPushStatus("idle");
      toast.error("Erro ao ativar notificações");
    }
  }

  async function desativarPush() {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await unsubscribeMutation.mutateAsync({ endpoint: sub.endpoint });
        await sub.unsubscribe();
      }
      setPushStatus("idle");
      toast.success("Notificações desativadas.");
    } catch (e) {
      toast.error("Erro ao desativar notificações");
    }
  }

  return { pushStatus, ativarPush, desativarPush };
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function Atendimento() {
  const [autenticado, setAutenticado] = useState(() => sessionStorage.getItem("hubly_suporte_auth") === "1");
  const [filaAtiva, setFilaAtiva] = useState<FilaKey>("novos");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [resposta, setResposta] = useState("");
  const [agenteNome, setAgenteNome] = useState(() => localStorage.getItem("hubly_agente_nome") ?? "Suporte Hubly");
  // Mobile: 0=filas, 1=lista, 2=chat
  const [mobileTab, setMobileTab] = useState<0 | 1 | 2>(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef(0);

  const chamadosQuery = trpc.suporte.adminListarChamados.useQuery(undefined, {
    enabled: autenticado,
    refetchInterval: 10000,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
  });

  const metricasQuery = trpc.suporte.adminGetMetricas.useQuery(undefined, {
    enabled: autenticado,
    refetchInterval: 15000,
    refetchIntervalInBackground: true,
  });

  const mensagensQuery = trpc.suporte.adminGetMensagens.useQuery(
    { chamadoId: selectedId! },
    { enabled: autenticado && selectedId !== null, refetchInterval: 8000, refetchIntervalInBackground: true }
  );

  const responderMutation = trpc.suporte.adminResponderChamado.useMutation({
    onSuccess: () => {
      setResposta("");
      mensagensQuery.refetch();
      chamadosQuery.refetch();
      toast.success("Resposta enviada! Push disparado ao cliente.");
    },
    onError: () => toast.error("Erro ao enviar resposta"),
  });

  const atualizarStatusMutation = trpc.suporte.adminAtualizarStatus.useMutation({
    onSuccess: () => { chamadosQuery.refetch(); mensagensQuery.refetch(); toast.success("Status atualizado"); },
    onError: () => toast.error("Erro ao atualizar status"),
  });

  const atualizarPrioridadeMutation = trpc.suporte.adminAtualizarPrioridade.useMutation({
    onSuccess: () => { chamadosQuery.refetch(); toast.success("Prioridade atualizada"); },
    onError: () => toast.error("Erro ao atualizar prioridade"),
  });

  const encerrarMutation = trpc.suporte.adminEncerrarChamado.useMutation({
    onSuccess: () => {
      chamadosQuery.refetch();
      metricasQuery.refetch();
      setSelectedId(null);
      toast.success("Chamado encerrado. Push enviado ao cliente.");
    },
    onError: () => toast.error("Erro ao encerrar chamado"),
  });

  // Scroll para o final das mensagens
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensagensQuery.data]);

  // Salvar nome do agente
  useEffect(() => {
    localStorage.setItem("hubly_agente_nome", agenteNome);
  }, [agenteNome]);

  // Badge no título da aba
  const chamados = chamadosQuery.data ?? [];
  const novosCount = chamados.filter(c => c.status === "aberto" && !c.primeiraRespostaEm).length;

  useEffect(() => {
    if (novosCount > 0) {
      document.title = `(${novosCount}) Central de Atendimento · Hubly`;
    } else {
      document.title = "Central de Atendimento · Hubly";
    }
    return () => { document.title = "Hubly"; };
  }, [novosCount]);

  // Notificação quando chegam novos chamados
  useEffect(() => {
    if (prevCountRef.current > 0 && novosCount > prevCountRef.current) {
      toast.info(`Novo chamado recebido! (${novosCount} aguardando)`, { duration: 6000 });
    }
    prevCountRef.current = novosCount;
  }, [novosCount]);

  // Filtrar chamados por fila
  const agora = new Date();
  const hoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());

  const chamadosFila = useCallback((fila: FilaKey) => {
    switch (fila) {
      case "novos":             return chamados.filter(c => c.status === "aberto" && !c.primeiraRespostaEm);
      case "em_atendimento":    return chamados.filter(c => c.status === "em_atendimento");
      case "aguardando_cliente":return chamados.filter(c => c.status === "aguardando_cliente");
      case "sla_vencido":       return chamados.filter(c => c.slaVencidoEm && new Date(c.slaVencidoEm) < agora && c.status !== "resolvido" && c.status !== "fechado");
      case "resolvidos_hoje":   return chamados.filter(c => c.status === "resolvido" && c.updatedAt && new Date(c.updatedAt) >= hoje);
      case "fechados":          return chamados.filter(c => c.status === "fechado");
      case "todos":             return chamados;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chamados]);

  const chamadosFiltrados = chamadosFila(filaAtiva);
  const chamadoSelecionado = chamados.find(c => c.id === selectedId);
  const mensagens = mensagensQuery.data ?? [];
  const metricas = metricasQuery.data;
  // Obter empresaId do primeiro chamado disponível (todos são da mesma empresa no painel)
  const primeiroEmpresaId = chamados[0]?.empresaId ?? null;
  const { pushStatus, ativarPush, desativarPush } = usePushAtendente(autenticado, primeiroEmpresaId);

  function handleEnviar() {
    if (!selectedId || !resposta.trim()) return;
    responderMutation.mutate({ chamadoId: selectedId, mensagem: resposta.trim(), agenteNome });
  }

  // Helpers mobile
  function selecionarChamadoMobile(id: number) {
    setSelectedId(id);
    setMobileTab(2);
  }
  function voltarParaLista() {
    setSelectedId(null);
    setMobileTab(1);
  }
  function voltarParaFilas() {
    setMobileTab(0);
  }

  if (!autenticado) return <TelaLogin onSuccess={() => setAutenticado(true)} />;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* ── Header ── */}
      <header className="border-b border-zinc-800 px-4 py-3 flex items-center justify-between bg-zinc-900 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <h1 className="font-semibold text-zinc-100 text-sm leading-tight">Central de Atendimento</h1>
            <p className="text-xs text-zinc-500">Hubly · Painel técnico</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-2">
            <User className="w-3.5 h-3.5 text-zinc-500" />
            <input
              value={agenteNome}
              onChange={e => setAgenteNome(e.target.value)}
              className="text-xs bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-zinc-200 w-32 focus:outline-none focus:border-amber-500/50"
              placeholder="Seu nome"
            />
          </div>
          {/* Botão de notificações push */}
          {'Notification' in window && (
            <Button
              variant="ghost"
              size="sm"
              onClick={pushStatus === "granted" ? desativarPush : ativarPush}
              disabled={pushStatus === "loading" || pushStatus === "denied"}
              title={pushStatus === "granted" ? "Notificações ativas — clique para desativar" : pushStatus === "denied" ? "Notificações bloqueadas no navegador" : "Ativar notificações de novos chamados"}
              className={`h-8 w-8 p-0 ${
                pushStatus === "granted" ? "text-amber-400 hover:text-amber-300" :
                pushStatus === "denied" ? "text-red-400 cursor-not-allowed" :
                "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {pushStatus === "granted" ? <Bell className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5" />}
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => chamadosQuery.refetch()} className="text-zinc-400 hover:text-zinc-200 h-8 w-8 p-0">
            <RefreshCw className={`w-3.5 h-3.5 ${chamadosQuery.isFetching ? "animate-spin" : ""}`} />
          </Button>
          <button
            onClick={() => { sessionStorage.removeItem("hubly_suporte_auth"); setAutenticado(false); }}
            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            Sair
          </button>
        </div>
      </header>

      {/* ── Métricas ── */}
      <div className="border-b border-zinc-800 px-3 py-2 bg-zinc-900/50 grid grid-cols-4 gap-2 shrink-0">
        {[
          { icon: <Inbox className="w-4 h-4 text-blue-400" />, label: "Sem resposta", value: metricas?.abertos ?? "—", color: "text-blue-400" },
          { icon: <ShieldAlert className="w-4 h-4 text-red-400" />, label: "SLA vencido", value: metricas?.slaVencidos ?? "—", color: "text-red-400" },
          { icon: <CheckCircle2 className="w-4 h-4 text-green-400" />, label: "Resolvidos hoje", value: metricas?.resolvidosHoje ?? "—", color: "text-green-400" },
          { icon: <Timer className="w-4 h-4 text-amber-400" />, label: "Tempo médio 1ª resp.", value: metricas?.tempoMedioResposta != null ? `${metricas.tempoMedioResposta}min` : "—", color: "text-amber-400" },
        ].map((m, i) => (
          <div key={i} className="bg-zinc-800/60 rounded-xl px-2 py-2 flex flex-col items-center gap-1 sm:flex-row sm:px-4 sm:py-2.5 sm:gap-3">
            <div className="w-7 h-7 rounded-lg bg-zinc-700/60 flex items-center justify-center shrink-0">{m.icon}</div>
            <div className="text-center sm:text-left">
              <p className={`text-base sm:text-lg font-semibold leading-tight ${m.color}`}>{m.value}</p>
              <p className="text-[10px] sm:text-xs text-zinc-500 leading-tight">{m.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Navegação mobile por abas ── */}
      <div className="flex sm:hidden border-b border-zinc-800 bg-zinc-900 shrink-0">
        {[
          { tab: 0 as const, label: "Filas", icon: <Inbox className="w-4 h-4" /> },
          { tab: 1 as const, label: "Chamados", icon: <MessageCircle className="w-4 h-4" /> },
          { tab: 2 as const, label: "Chat", icon: <Send className="w-4 h-4" /> },
        ].map(({ tab, label, icon }) => (
          <button
            key={tab}
            onClick={() => setMobileTab(tab)}
            className={`flex-1 flex flex-col items-center gap-1 py-2.5 text-xs transition-colors ${
              mobileTab === tab
                ? "text-amber-400 border-b-2 border-amber-500"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {icon}
            <span>{label}</span>
            {tab === 0 && novosCount > 0 && (
              <span className="absolute mt-0 ml-8 -translate-y-1 bg-red-500 text-white text-[9px] rounded-full w-3.5 h-3.5 flex items-center justify-center font-bold">{novosCount}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Corpo: 3 colunas desktop / abas mobile ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Coluna 1: Filas — desktop sempre visível, mobile só na aba 0 */}
        <nav className={`border-r border-zinc-800 bg-zinc-900/40 flex flex-col py-2 shrink-0 overflow-y-auto
          w-full sm:w-52
          ${mobileTab === 0 ? "flex" : "hidden"} sm:flex
        `}>
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-2">Filas</p>
          {FILAS.map(f => {
            const count = chamadosFila(f.key).length;
            const isAtiva = filaAtiva === f.key;
            const isUrgente = f.key === "sla_vencido" && count > 0;
            return (
              <button
                key={f.key}
                onClick={() => { setFilaAtiva(f.key); setSelectedId(null); setMobileTab(1); }}
                className={`flex items-center justify-between px-4 py-2.5 text-sm transition-colors rounded-lg mx-2 my-0.5 ${
                  isAtiva
                    ? "bg-amber-500/15 text-amber-300"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className={isAtiva ? "text-amber-400" : ""}>{f.icon}</span>
                  <span>{f.label}</span>
                </div>
                {count > 0 && (
                  <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full min-w-[20px] text-center ${
                    isUrgente ? "bg-red-500/20 text-red-400 animate-pulse" :
                    isAtiva ? "bg-amber-500/20 text-amber-400" : "bg-zinc-700 text-zinc-400"
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Coluna 2: Lista de chamados — desktop sempre visível, mobile só na aba 1 */}
        <div className={`border-r border-zinc-800 flex flex-col bg-zinc-900/20 overflow-hidden shrink-0
          w-full sm:w-80
          ${mobileTab === 1 ? "flex" : "hidden"} sm:flex
        `}>
          <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button onClick={voltarParaFilas} className="sm:hidden text-zinc-500 hover:text-zinc-300 mr-1">
                <ChevronRight className="w-4 h-4 rotate-180" />
              </button>
              <p className="text-sm font-medium text-zinc-200">
                {FILAS.find(f => f.key === filaAtiva)?.label}
              </p>
            </div>
            <span className="text-xs text-zinc-500">{chamadosFiltrados.length} chamados</span>
          </div>
          <div className="flex-1 overflow-y-auto">
            {chamadosQuery.isLoading ? (
              <div className="flex items-center justify-center h-32 text-zinc-500 text-sm">
                <RefreshCw className="w-4 h-4 animate-spin mr-2" /> Carregando...
              </div>
            ) : chamadosFiltrados.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-zinc-600 gap-2">
                <CheckCircle2 className="w-8 h-8" />
                <span className="text-sm">Nenhum chamado nesta fila</span>
              </div>
            ) : (
              chamadosFiltrados.map(c => {
                const slaVencido = c.slaVencidoEm && new Date(c.slaVencidoEm) < agora &&
                  c.status !== "resolvido" && c.status !== "fechado";
                const st = STATUS_CONFIG[c.status as StatusChamado];
                const pr = PRIORIDADE_CONFIG[c.prioridade as PrioridadeChamado];
                const isSelected = selectedId === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => selecionarChamadoMobile(c.id)}
                    className={`w-full text-left px-4 py-3.5 border-b border-zinc-800/50 transition-all hover:bg-zinc-800/40 ${
                      isSelected ? "bg-zinc-800/70 border-l-2 border-l-amber-500" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <span className="text-sm font-medium text-zinc-200 line-clamp-1 flex-1">{c.titulo}</span>
                      <span className="text-xs text-zinc-500 whitespace-nowrap shrink-0">{timeAgo(c.updatedAt)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                      <span className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded border ${st.color}`}>
                        {st.icon} {st.label}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-zinc-500">
                        <span className={`w-1.5 h-1.5 rounded-full ${pr.dot}`} />
                        {pr.label}
                      </span>
                      {slaVencido && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-red-500/15 text-red-400 font-medium">SLA!</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-zinc-500">
                      <Building2 className="w-3 h-3 shrink-0" />
                      <span className="truncate">{c.nomeEmpresa ?? `Empresa #${c.empresaId}`}</span>
                      <span className="ml-auto">#{c.id}</span>
                    </div>
                    {c.slaVencidoEm && c.status !== "resolvido" && c.status !== "fechado" && (
                      <div className={`text-xs mt-1 ${slaColor(c.slaVencidoEm, c.status)}`}>
                        SLA: {formatDate(c.slaVencidoEm)}
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Coluna 3: Chat — desktop sempre visível, mobile só na aba 2 */}
        <div className={`flex-1 flex flex-col overflow-hidden
          ${mobileTab === 2 ? "flex" : "hidden"} sm:flex
        `}>
          {!selectedId ? (
            <div className="flex-1 flex flex-col items-center justify-center text-zinc-600 gap-3">
              <MessageCircle className="w-14 h-14 text-zinc-800" />
              <p className="text-sm">Selecione um chamado para atender</p>
              <p className="text-xs text-zinc-700">Atualização automática a cada 10 segundos</p>
            </div>
          ) : (
            <>
              {/* Header do chamado */}
              <div className="border-b border-zinc-800 px-3 sm:px-5 py-3 bg-zinc-900/50 flex items-center justify-between gap-2 sm:gap-4 shrink-0">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <button onClick={voltarParaLista} className="sm:hidden text-zinc-500 hover:text-zinc-300 shrink-0">
                      <ChevronRight className="w-4 h-4 rotate-180" />
                    </button>
                    <p className="text-sm font-medium text-zinc-100 truncate">{chamadoSelecionado?.titulo}</p>
                    <span className="text-xs text-zinc-600">#{selectedId}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-zinc-500">
                    <Building2 className="w-3 h-3" />
                    <span>{chamadoSelecionado?.nomeEmpresa ?? `Empresa #${chamadoSelecionado?.empresaId}`}</span>
                    <span>·</span>
                    <span>Aberto {formatDate(chamadoSelecionado?.createdAt)}</span>
                    {chamadoSelecionado?.avaliacaoNota && (
                      <>
                        <span>·</span>
                        <span className="flex items-center gap-0.5 text-amber-400">
                          <Star className="w-3 h-3 fill-amber-400" /> {chamadoSelecionado.avaliacaoNota}/5
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                  {/* Prioridade */}
                  <Select
                    value={chamadoSelecionado?.prioridade}
                    onValueChange={val =>
                      atualizarPrioridadeMutation.mutate({ chamadoId: selectedId, prioridade: val as PrioridadeChamado })
                    }
                  >
                    <SelectTrigger className="h-7 text-xs bg-zinc-800 border-zinc-700 w-24 sm:w-28">
                      <SelectValue placeholder="Prioridade" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(PRIORIDADE_CONFIG).map(([k, v]) => (
                        <SelectItem key={k} value={k} className="text-xs">
                          <span className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${v.dot}`} /> {v.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {/* Status */}
                  <Select
                    value={chamadoSelecionado?.status}
                    onValueChange={val =>
                      atualizarStatusMutation.mutate({ chamadoId: selectedId, status: val as StatusChamado })
                    }
                  >
                    <SelectTrigger className="h-7 text-xs bg-zinc-800 border-zinc-700 w-36 sm:w-44">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                        <SelectItem key={k} value={k} className="text-xs">
                          <span className="flex items-center gap-1.5">{v.icon} {v.label}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {chamadoSelecionado?.status !== "fechado" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (confirm(`Encerrar o chamado "${chamadoSelecionado?.titulo}"? O cliente receberá uma notificação.`)) {
                          encerrarMutation.mutate({ chamadoId: selectedId });
                        }
                      }}
                      disabled={encerrarMutation.isPending}
                      className="h-7 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/30 px-2.5"
                    >
                      {encerrarMutation.isPending ? <RefreshCw className="w-3 h-3 animate-spin" /> : <><XCircle className="w-3 h-3 mr-1" /> Encerrar</>}
                    </Button>
                  )}
                </div>
              </div>

              {/* Mensagens */}
              <div className="flex-1 overflow-y-auto p-5 space-y-3">
                {mensagensQuery.isLoading ? (
                  <div className="flex justify-center py-8 text-zinc-500 text-sm">
                    <RefreshCw className="w-4 h-4 animate-spin mr-2" /> Carregando...
                  </div>
                ) : mensagens.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-zinc-600 gap-2">
                    <MessageCircle className="w-8 h-8" />
                    <span className="text-sm">Nenhuma mensagem ainda</span>
                  </div>
                ) : (
                  mensagens.map((m, i) => {
                    const isAgente = m.autorTipo === "agente" || m.autorTipo === "ia";
                    const isSystem = (m.autorTipo as string) === "sistema";
                    if (isSystem) {
                      return (
                        <div key={m.id ?? i} className="flex justify-center">
                          <span className="text-xs text-zinc-600 bg-zinc-800/60 px-3 py-1 rounded-full">
                            {m.conteudo}
                          </span>
                        </div>
                      );
                    }
                    return (
                      <div key={m.id ?? i} className={`flex ${isAgente ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[72%] rounded-2xl px-4 py-3 ${
                          isAgente
                            ? "bg-amber-500/15 border border-amber-500/25 rounded-br-sm"
                            : "bg-zinc-800 border border-zinc-700/60 rounded-bl-sm"
                        }`}>
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className={`text-xs font-medium ${isAgente ? "text-amber-400" : "text-zinc-400"}`}>
                              {m.autorNome ?? (m.autorTipo === "ia" ? "IA Hubly" : "Cliente")}
                            </span>
                            <span className="text-xs text-zinc-600">{formatDate(m.createdAt)}</span>
                          </div>
                          <p className="text-sm text-zinc-200 whitespace-pre-wrap leading-relaxed">{m.conteudo}</p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input de resposta */}
              {chamadoSelecionado?.status !== "fechado" ? (
                <div className="border-t border-zinc-800 p-4 bg-zinc-900/50 shrink-0">
                  <div className="flex gap-3">
                    <Textarea
                      value={resposta}
                      onChange={e => setResposta(e.target.value)}
                      placeholder="Digite sua resposta... O cliente receberá uma notificação push. (Ctrl+Enter para enviar)"
                      className="flex-1 min-h-[88px] max-h-[180px] bg-zinc-800 border-zinc-700 text-zinc-200 placeholder:text-zinc-600 resize-none text-sm focus:border-amber-500/50"
                      onKeyDown={e => {
                        if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleEnviar();
                      }}
                    />
                    <div className="flex flex-col gap-2 justify-end">
                      <Button
                        onClick={handleEnviar}
                        disabled={!resposta.trim() || responderMutation.isPending}
                        className="bg-amber-500 hover:bg-amber-600 text-zinc-900 font-medium h-11 px-5"
                      >
                        {responderMutation.isPending
                          ? <RefreshCw className="w-4 h-4 animate-spin" />
                          : <><Send className="w-4 h-4 mr-1.5" /> Enviar</>
                        }
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => atualizarStatusMutation.mutate({ chamadoId: selectedId, status: "aguardando_cliente" })}
                        className="text-xs text-zinc-500 hover:text-zinc-300 h-8"
                      >
                        <ChevronRight className="w-3 h-3 mr-1" /> Aguardar cliente
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="border-t border-zinc-800 p-4 bg-zinc-900/50 text-center text-xs text-zinc-600 shrink-0">
                  Chamado fechado. Altere o status para responder.
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
