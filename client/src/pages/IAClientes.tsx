import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Users, Brain, RefreshCw, Send, Bot, User, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Moon, Star, Zap, BellOff } from "lucide-react";

interface ChatMsg { role: "user" | "assistant"; content: string; }

const CLASSIFICACAO_CONFIG: Record<string, { label: string; icon: string; color: string; bg: string }> = {
  principal:        { label: "Principal",        icon: "🟢", color: "oklch(38% 0.14 155)", bg: "oklch(55% 0.18 155 / 10%)" },
  bom_pagador:      { label: "Bom pagador",       icon: "💎", color: "oklch(45% 0.18 264)", bg: "oklch(55% 0.22 264 / 10%)" },
  em_crescimento:   { label: "Em crescimento",    icon: "📈", color: "oklch(40% 0.16 300)", bg: "oklch(60% 0.20 300 / 10%)" },
  em_queda:         { label: "Em queda",          icon: "📉", color: "oklch(45% 0.16 220)", bg: "oklch(55% 0.14 220 / 10%)" },
  inativo:          { label: "Inativo",           icon: "💤", color: "oklch(45% 0.06 250)", bg: "oklch(60% 0.04 250 / 10%)" },
  atraso_frequente: { label: "Atraso frequente",  icon: "⚠️",  color: "oklch(45% 0.18 75)",  bg: "oklch(65% 0.20 75 / 10%)"  },
  risco:            { label: "Risco",             icon: "🚨", color: "oklch(45% 0.22 25)",  bg: "oklch(55% 0.22 25 / 10%)"  },
  novo:             { label: "Novo",              icon: "🆕", color: "oklch(45% 0.14 200)", bg: "oklch(55% 0.12 200 / 10%)" },
};

export default function IAClientes() {
  const utils = trpc.useUtils();
  const [chatMsgs, setChatMsgs] = useState<ChatMsg[]>([
    { role: "assistant", content: "Olá! Posso te ajudar a entender seus clientes. Pergunte quem são os melhores, quem está atrasando, quem sumiu, e muito mais!" }
  ]);
  const [inputMsg, setInputMsg] = useState("");
  const [sendingMsg, setSendingMsg] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const { data: analise, isLoading: loadingAnalise } = trpc.iaClientes.getAnalise.useQuery();
  const { data: insights, isLoading: loadingInsights } = trpc.iaClientes.getInsights.useQuery({ apenasNaoLidos: false });
  const insightsNaoLidos = (insights ?? []).filter(i => !i.lido).length;

  const analisarMutation = trpc.iaClientes.analisar.useMutation({
    onSuccess: (data) => {
      if (data.suficiente) {
        toast.success(data.mensagem);
        utils.iaClientes.getAnalise.invalidate();
        utils.iaClientes.getInsights.invalidate();
      } else {
        toast.info(data.mensagem);
      }
    },
    onError: (err: any) => toast.error(err.message),
  });

  const marcarLidoMutation = trpc.iaClientes.marcarInsightLido.useMutation({
    onSuccess: () => utils.iaClientes.getInsights.invalidate(),
  });

  const marcarTodosMutation = trpc.iaClientes.marcarTodosLidos.useMutation({
    onSuccess: () => utils.iaClientes.getInsights.invalidate(),
  });

  const chatMutation = trpc.iaClientes.chat.useMutation({
    onSuccess: (data) => {
      setChatMsgs(prev => [...prev, { role: "assistant" as const, content: String(data.resposta) }]);
      setSendingMsg(false);
    },
    onError: (err: any) => { toast.error(err.message); setSendingMsg(false); },
  });

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMsgs]);

  function enviarMensagem() {
    if (!inputMsg.trim() || sendingMsg) return;
    const msg = inputMsg.trim();
    setInputMsg("");
    setSendingMsg(true);
    setChatMsgs(prev => [...prev, { role: "user" as const, content: msg }]);
    chatMutation.mutate({ mensagem: msg });
  }

  const statusGeral = analise?.statusGeral;
  const statusLabel = statusGeral === "saudavel" ? "🟢 Clientes saudáveis" : "⚠️ Atenção: há clientes com risco";
  const statusColor = statusGeral === "saudavel" ? "oklch(38% 0.14 155)" : "oklch(45% 0.18 75)";

  return (
    <div className="p-4 lg:p-6 space-y-5 max-w-6xl mx-auto animate-in-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "oklch(42% 0.16 300 / 12%)" }}>
            <Users className="w-5 h-5" style={{ color: "oklch(42% 0.16 300)" }} />
          </div>
          <div>
            <h1 className="font-bold text-xl tracking-tight">IA Clientes</h1>
            <p className="text-xs text-muted-foreground">Análise inteligente da sua carteira de clientes</p>
          </div>
        </div>
        <Button onClick={() => analisarMutation.mutate()} disabled={analisarMutation.isPending} size="sm" className="gap-2">
          <RefreshCw className={`w-4 h-4 ${analisarMutation.isPending ? "animate-spin" : ""}`} />
          {analisarMutation.isPending ? "Analisando..." : "Analisar clientes"}
        </Button>
      </div>

      {/* Status geral + Cards */}
      {loadingAnalise ? (
        <div className="card-elegant p-6 flex items-center justify-center h-32">
          <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : !analise ? (
        <div className="card-elegant p-8 text-center space-y-3">
          <Brain className="w-12 h-12 mx-auto text-muted-foreground opacity-40" />
          <p className="font-semibold">Nenhuma análise disponível ainda</p>
          <p className="text-sm text-muted-foreground">Clique em "Analisar clientes" para gerar insights sobre sua carteira.</p>
          <p className="text-xs text-muted-foreground">Necessário: pelo menos 3 clientes com histórico de 30 dias.</p>
        </div>
      ) : (
        <>
          {/* Status banner */}
          <div className="rounded-xl px-5 py-3 flex items-center gap-3" style={{ background: `${statusColor}15`, border: `1px solid ${statusColor}30` }}>
            <span className="text-sm font-semibold" style={{ color: statusColor }}>{statusLabel}</span>
            <span className="text-xs text-muted-foreground ml-auto">
              Calculado em {new Date(analise.calculadoEm!).toLocaleString("pt-BR")}
            </span>
          </div>

          {/* Cards de contagem */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: "Total analisados", value: analise.totalClientes, icon: Users, color: "oklch(45% 0.18 264)" },
              { label: "Principais", value: analise.contagens.principal + analise.contagens.bom_pagador, icon: Star, color: "oklch(38% 0.14 155)" },
              { label: "Inativos", value: analise.contagens.inativo, icon: Moon, color: "oklch(45% 0.06 250)" },
              { label: "Com risco", value: analise.contagens.risco + analise.contagens.atraso_frequente, icon: AlertTriangle, color: "oklch(45% 0.22 25)" },
            ].map(card => {
              const Icon = card.icon;
              return (
                <div key={card.label} className="stat-card">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: `${card.color}18` }}>
                    <Icon className="w-4 h-4" style={{ color: card.color }} />
                  </div>
                  <p className="text-2xl font-bold tracking-tight">{card.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{card.label}</p>
                </div>
              );
            })}
          </div>

          {/* Top clientes */}
          <div className="card-elegant overflow-hidden">
            <div className="px-5 py-4" style={{ borderBottom: "1px solid oklch(90% 0.012 250)" }}>
              <h3 className="font-semibold text-sm">Top Clientes por Receita</h3>
            </div>
            <ul className="divide-y divide-border">
              {analise.topClientes.map((a: any, i: number) => {
                const cfg = CLASSIFICACAO_CONFIG[a.classificacao] ?? CLASSIFICACAO_CONFIG.novo;
                const det = a.detalhes as any;
                return (
                  <li key={a.id} className="px-5 py-3 flex items-center gap-3">
                    <span className="text-lg font-black text-muted-foreground/30 w-6 text-center">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{a.clienteId}</p>
                      <p className="text-xs text-muted-foreground">{a.resumo}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold">R$ {(det?.totalReceita ?? 0).toFixed(2)}</p>
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ color: cfg.color, background: cfg.bg }}>
                        {cfg.icon} {cfg.label}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </>
      )}

      {/* Insights */}
      <div className="card-elegant overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid oklch(90% 0.012 250)" }}>
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-muted-foreground" />
            <h3 className="font-semibold text-sm">Insights sobre seus clientes</h3>
            {insightsNaoLidos > 0 && (
              <Badge variant="destructive" className="text-xs px-1.5 py-0">{insightsNaoLidos}</Badge>
            )}
          </div>
          {insightsNaoLidos > 0 && (
            <Button variant="ghost" size="sm" onClick={() => marcarTodosMutation.mutate()} className="text-xs gap-1">
              <BellOff className="w-3.5 h-3.5" /> Marcar todos como lidos
            </Button>
          )}
        </div>
        {loadingInsights ? (
          <div className="p-6 text-center text-sm text-muted-foreground">Carregando insights...</div>
        ) : (insights ?? []).length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">Nenhum insight disponível. Execute a análise primeiro.</div>
        ) : (
          <ul className="divide-y divide-border">
            {(insights ?? []).map(insight => {
              const prioridadeCor = insight.prioridade === "alta" ? "oklch(55% 0.22 25)" : insight.prioridade === "media" ? "oklch(65% 0.20 75)" : "oklch(55% 0.18 155)";
              return (
                <li key={insight.id} className={`px-5 py-3 flex items-start gap-3 ${insight.lido ? "opacity-50" : ""}`}>
                  <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: prioridadeCor }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{insight.titulo}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{insight.mensagem}</p>
                    {insight.acao && (
                      <p className="text-xs mt-1 font-medium" style={{ color: "oklch(45% 0.18 264)" }}>💡 {insight.acao}</p>
                    )}
                  </div>
                  {!insight.lido && (
                    <Button variant="ghost" size="sm" className="text-xs shrink-0" onClick={() => marcarLidoMutation.mutate({ id: insight.id })}>
                      Lido
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Chat */}
      <div className="card-elegant overflow-hidden flex flex-col" style={{ height: "420px" }}>
        <div className="flex items-center gap-2 px-5 py-4" style={{ borderBottom: "1px solid oklch(90% 0.012 250)" }}>
          <Bot className="w-4 h-4" style={{ color: "oklch(42% 0.16 300)" }} />
          <h3 className="font-semibold text-sm">Assistente de Clientes</h3>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {chatMsgs.map((msg, i) => (
            <div key={i} className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${msg.role === "user" ? "bg-primary" : ""}`}
                style={msg.role === "assistant" ? { background: "oklch(42% 0.16 300 / 12%)" } : {}}>
                {msg.role === "user" ? <User className="w-3.5 h-3.5 text-primary-foreground" /> : <Bot className="w-3.5 h-3.5" style={{ color: "oklch(42% 0.16 300)" }} />}
              </div>
              <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${msg.role === "user" ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-muted rounded-tl-sm"}`}>
                {msg.content}
              </div>
            </div>
          ))}
          {sendingMsg && (
            <div className="flex gap-2">
              <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "oklch(42% 0.16 300 / 12%)" }}>
                <Bot className="w-3.5 h-3.5" style={{ color: "oklch(42% 0.16 300)" }} />
              </div>
              <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-2.5 flex gap-1 items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>
        <div className="p-3 flex gap-2" style={{ borderTop: "1px solid oklch(90% 0.012 250)" }}>
          <input
            className="flex-1 bg-muted rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            placeholder="Pergunte sobre seus clientes..."
            value={inputMsg}
            onChange={e => setInputMsg(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && enviarMensagem()}
            disabled={sendingMsg}
          />
          <Button size="icon" onClick={enviarMensagem} disabled={sendingMsg || !inputMsg.trim()} className="rounded-xl shrink-0">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
