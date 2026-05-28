import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Brain, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, RefreshCw, Send, Bot, User, ChevronRight, Bell, BellOff } from "lucide-react";
import { usePermissoes } from "@/hooks/usePermissoes";

interface ChatMsg { role: "user" | "assistant"; content: string; }

function ScoreGauge({ score, status }: { score: number; status: string }) {
  const color = status === "saudavel" ? "oklch(55% 0.18 155)" : status === "atencao" ? "oklch(65% 0.20 75)" : "oklch(55% 0.22 25)";
  const bg = status === "saudavel" ? "oklch(55% 0.18 155 / 10%)" : status === "atencao" ? "oklch(65% 0.20 75 / 10%)" : "oklch(55% 0.22 25 / 10%)";
  const label = status === "saudavel" ? " Saudável" : status === "atencao" ? " Atenção" : " Risco";

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-32 h-32 flex items-center justify-center rounded-full" style={{ background: bg, border: `4px solid ${color}` }}>
        <div className="text-center">
          <p className="text-3xl font-black" style={{ color }}>{score}</p>
          <p className="text-xs text-muted-foreground font-medium">/ 100</p>
        </div>
      </div>
      <span className="text-sm font-semibold">{label}</span>
    </div>
  );
}

export default function IAFinanceiro() {
  const { pode } = usePermissoes();
  const utils = trpc.useUtils();
  const [chatMsgs, setChatMsgs] = useState<ChatMsg[]>([
    { role: "assistant", content: "Olá! Sou seu assistente financeiro. Pode me perguntar sobre seu score, alertas ou qualquer dúvida sobre o financeiro do seu negócio." }
  ]);
  const [inputMsg, setInputMsg] = useState("");
  const [sendingMsg, setSendingMsg] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const { data: score, isLoading: loadingScore } = trpc.iaFinanceiro.getScore.useQuery();
  const { data: alertas, isLoading: loadingAlertas } = trpc.iaFinanceiro.getAlertas.useQuery({ apenasNaoLidos: false });
  const alertasNaoLidos = (alertas ?? []).filter(a => !a.lido).length;

  const calcularMutation = trpc.iaFinanceiro.calcularScore.useMutation({
    onSuccess: (data) => {
      toast.success(`Score calculado: ${data.score}/100`);
      utils.iaFinanceiro.getScore.invalidate();
      utils.iaFinanceiro.getAlertas.invalidate();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const marcarLidoMutation = trpc.iaFinanceiro.marcarAlertaLido.useMutation({
    onSuccess: () => utils.iaFinanceiro.getAlertas.invalidate(),
  });

  const marcarTodosMutation = trpc.iaFinanceiro.marcarTodosLidos.useMutation({
    onSuccess: () => utils.iaFinanceiro.getAlertas.invalidate(),
  });

  const chatMutation = trpc.iaFinanceiro.chat.useMutation({
    onSuccess: (data) => {
      setChatMsgs(prev => [...prev, { role: "assistant" as const, content: String(data.resposta) }]);
      setSendingMsg(false);
    },
    onError: (err: any) => {
      toast.error(err.message);
      setSendingMsg(false);
    },
  });

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMsgs]);

  function enviarMensagem() {
    if (!inputMsg.trim() || sendingMsg) return;
    const msg = inputMsg.trim();
    setInputMsg("");
    setSendingMsg(true);
    setChatMsgs(prev => [...prev, { role: "user", content: msg }]);
    chatMutation.mutate({ mensagem: msg });
  }

  const prioridadeCor = (p: string) =>
    p === "alta" ? "oklch(55% 0.22 25)" : p === "media" ? "oklch(65% 0.20 75)" : "oklch(55% 0.18 155)";

  // Guarda de permissão: apenas administradores podem acessar IA Financeira
  if (!pode("__admin__")) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center p-8">
        <Brain className="w-12 h-12 text-muted-foreground/30" />
        <p className="text-sm font-medium text-muted-foreground">Você não tem permissão para acessar a IA Financeira.</p>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-5 max-w-6xl mx-auto animate-in-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "oklch(78.5% 0.075 85 / 12%)" }}>
            <Brain className="w-5 h-5" style={{ color: "oklch(45% 0.060 55)" }} />
          </div>
          <div>
            <h1 className="font-bold text-xl tracking-tight">IA Financeira</h1>
            <p className="text-xs text-muted-foreground">Análise inteligente do seu financeiro</p>
          </div>
        </div>
        <Button onClick={() => calcularMutation.mutate()} disabled={calcularMutation.isPending} size="sm" className="gap-2">
          <RefreshCw className={`w-4 h-4 ${calcularMutation.isPending ? "animate-spin" : ""}`} />
          {calcularMutation.isPending ? "Calculando..." : "Atualizar análise"}
        </Button>
      </div>

      {/* Score + Motivos */}
      {loadingScore ? (
        <div className="card-elegant p-6 flex items-center justify-center h-40">
          <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : !score ? (
        <div className="card-elegant p-8 text-center space-y-3">
          <Brain className="w-12 h-12 mx-auto text-muted-foreground opacity-40" />
          <p className="font-semibold text-foreground">Nenhuma análise disponível ainda</p>
          <p className="text-sm text-muted-foreground">Clique em "Atualizar análise" para calcular seu score financeiro.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Score */}
          <div className="card-elegant p-6 flex flex-col items-center gap-4">
            <ScoreGauge score={score.score} status={score.status} />
            <p className="text-sm text-center text-muted-foreground">{score.explicacao}</p>
            <p className="text-xs text-muted-foreground">Calculado em {new Date(score.calculadoEm).toLocaleString("pt-BR")}</p>
          </div>

          {/* Motivos */}
          <div className="card-elegant p-5 space-y-3">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" /> Por que essa nota?
            </h3>
            <ul className="space-y-2">
              {(score.motivos as string[]).map((m, i) => (
                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-muted-foreground/50 shrink-0" />
                  {m}
                </li>
              ))}
            </ul>
          </div>

          {/* Dicas */}
          <div className="card-elegant p-5 space-y-3">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <CheckCircle className="w-4 h-4" style={{ color: "oklch(55% 0.18 155)" }} /> Como melhorar
            </h3>
            <ul className="space-y-2">
              {(score.dicas as string[]).map((d, i) => (
                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                  <ChevronRight className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: "oklch(55% 0.18 155)" }} />
                  {d}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Alertas */}
      <div className="card-elegant overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid oklch(89.5% 0.018 80)" }}>
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-muted-foreground" />
            <h3 className="font-semibold text-sm">Alertas Proativos</h3>
            {alertasNaoLidos > 0 && (
              <Badge variant="destructive" className="text-xs px-1.5 py-0">{alertasNaoLidos}</Badge>
            )}
          </div>
          {alertasNaoLidos > 0 && (
            <Button variant="ghost" size="sm" onClick={() => marcarTodosMutation.mutate()} className="text-xs gap-1">
              <BellOff className="w-3.5 h-3.5" /> Marcar todos como lidos
            </Button>
          )}
        </div>
        {loadingAlertas ? (
          <div className="p-6 text-center text-sm text-muted-foreground">Carregando alertas...</div>
        ) : (alertas ?? []).length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">Nenhum alerta no momento. Tudo tranquilo! </div>
        ) : (
          <ul className="divide-y divide-border">
            {(alertas ?? []).map(alerta => (
              <li key={alerta.id} className={`px-5 py-3 flex items-start gap-3 transition-colors ${alerta.lido ? "opacity-50" : ""}`}>
                <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: prioridadeCor(alerta.prioridade) }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{alerta.titulo}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{alerta.mensagem}</p>
                  {alerta.acao && (
                    <p className="text-xs mt-1 font-medium" style={{ color: "oklch(45% 0.060 55)" }}>
                       {alerta.acao}
                    </p>
                  )}
                </div>
                {!alerta.lido && (
                  <Button variant="ghost" size="sm" className="text-xs shrink-0" onClick={() => marcarLidoMutation.mutate({ id: alerta.id })}>
                    Lido
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Chat */}
      <div className="card-elegant overflow-hidden flex flex-col" style={{ height: "420px" }}>
        <div className="flex items-center gap-2 px-5 py-4" style={{ borderBottom: "1px solid oklch(89.5% 0.018 80)" }}>
          <Bot className="w-4 h-4" style={{ color: "oklch(45% 0.060 55)" }} />
          <h3 className="font-semibold text-sm">Assistente Financeiro</h3>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {chatMsgs.map((msg, i) => (
            <div key={i} className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${msg.role === "user" ? "bg-primary" : ""}`}
                style={msg.role === "assistant" ? { background: "oklch(78.5% 0.075 85 / 12%)" } : {}}>
                {msg.role === "user" ? <User className="w-3.5 h-3.5 text-primary-foreground" /> : <Bot className="w-3.5 h-3.5" style={{ color: "oklch(45% 0.060 55)" }} />}
              </div>
              <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${msg.role === "user" ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-muted rounded-tl-sm"}`}>
                {msg.content}
              </div>
            </div>
          ))}
          {sendingMsg && (
            <div className="flex gap-2">
              <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "oklch(78.5% 0.075 85 / 12%)" }}>
                <Bot className="w-3.5 h-3.5" style={{ color: "oklch(45% 0.060 55)" }} />
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
        <div className="p-3 flex gap-2" style={{ borderTop: "1px solid oklch(89.5% 0.018 80)" }}>
          <input
            className="flex-1 bg-muted rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            placeholder="Pergunte sobre seu financeiro..."
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
