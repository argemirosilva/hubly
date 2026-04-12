import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { usePermissoes } from "@/hooks/usePermissoes";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Smartphone,
  Wifi,
  WifiOff,
  QrCode,
  RefreshCw,
  LogOut,
  Send,
  CheckCircle2,
  AlertCircle,
  Loader2,
  MessageCircle,
  RotateCcw,
  History,
  Zap,
} from "lucide-react";

type WAStatus = "disconnected" | "connecting" | "qr_ready" | "scanning" | "connected" | "logged_out";

const statusConfig: Record<WAStatus, { label: string; color: string; icon: React.ReactNode }> = {
  scanning: {
    label: "QR Code lido...",
    color: "bg-purple-100 text-purple-700 border-purple-200",
    icon: <Loader2 className="w-4 h-4 animate-spin" />,
  },
  disconnected: {
    label: "Desconectado",
    color: "bg-gray-100 text-gray-700 border-gray-200",
    icon: <WifiOff className="w-4 h-4" />,
  },
  connecting: {
    label: "Conectando...",
    color: "bg-yellow-100 text-yellow-700 border-yellow-200",
    icon: <Loader2 className="w-4 h-4 animate-spin" />,
  },
  qr_ready: {
    label: "Aguardando QR Code",
    color: "bg-blue-100 text-blue-700 border-blue-200",
    icon: <QrCode className="w-4 h-4" />,
  },
  connected: {
    label: "Conectado",
    color: "bg-green-100 text-green-700 border-green-200",
    icon: <CheckCircle2 className="w-4 h-4" />,
  },
  logged_out: {
    label: "Sessão encerrada",
    color: "bg-red-100 text-red-700 border-red-200",
    icon: <AlertCircle className="w-4 h-4" />,
  },
};

export default function WhatsAppPage() {
  const { pode } = usePermissoes();
  const [testPhone, setTestPhone] = useState("");
  const [pollingInterval, setPollingInterval] = useState(3000);
  // Estado local para feedback imediato ao clicar em Conectar
  const [localConnecting, setLocalConnecting] = useState(false);

  // Polling do status do WhatsApp
  const { data: statusData, isLoading: statusLoading, refetch: refetchStatus } = trpc.whatsapp.getStatus.useQuery(undefined, {
    refetchInterval: pollingInterval,
    refetchIntervalInBackground: false,
  });

  // Enquanto a primeira query não retornou, mostramos "verificando"
  const isVerifying = statusLoading && statusData === undefined;
  const status = (statusData?.status ?? "disconnected") as WAStatus;
  // Mostrar "connecting" tanto quando o servidor reporta quanto quando clicamos localmente
  const effectiveStatus: WAStatus = localConnecting && status !== "connecting" && status !== "connected" && status !== "qr_ready" && status !== "scanning"
    ? "connecting"
    : status;
  const config = statusConfig[effectiveStatus];

  // Limpar localConnecting quando o servidor confirmar o estado
  useEffect(() => {
    if (status === "connecting" || status === "connected" || status === "qr_ready" || status === "scanning") {
      setLocalConnecting(false);
    }
  }, [status]);

  // Parar polling quando conectado
  useEffect(() => {
    if (status === "connected") {
      setPollingInterval(30000); // Polling lento quando conectado
    } else if (status === "qr_ready" || status === "connecting" || status === "scanning") {
      setPollingInterval(2000); // Polling rápido para QR
    } else {
      setPollingInterval(10000);
    }
  }, [status]);

  const connectMutation = trpc.whatsapp.connect.useMutation({
    onSuccess: () => {
      setPollingInterval(2000);
      refetchStatus();
      toast.info("Iniciando conexão...", { description: "Aguarde o QR Code aparecer." });
    },
    onError: (err) => {
      toast.error("Erro ao conectar", { description: err.message });
    },
  });

  const disconnectMutation = trpc.whatsapp.disconnect.useMutation({
    onSuccess: () => {
      refetchStatus();
      toast.success("WhatsApp desconectado", { description: "Sessão encerrada com sucesso." });
    },
    onError: (err) => {
      toast.error("Erro ao desconectar", { description: err.message });
    },
  });

  const sendTestMutation = trpc.whatsapp.sendTest.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success("Mensagem enviada!", { description: `Teste enviado para ${testPhone}` });
      } else {
        toast.error("Falha no envio", { description: "Verifique o número e tente novamente." });
      }
    },
    onError: (err) => {
      toast.error("Erro ao enviar", { description: err.message });
    },
  });

  const resetSessionMutation = trpc.whatsapp.resetSession.useMutation({
    onSuccess: () => {
      setPollingInterval(2000);
      refetchStatus();
      toast.success("Sessão resetada!", { description: "Clique em Conectar para gerar um novo QR Code." });
    },
    onError: (err) => {
      toast.error("Erro ao resetar sessão", { description: err.message });
    },
  });

  // Log de eventos de conexão
  const { data: connectionLog } = trpc.whatsapp.getConnectionLog.useQuery(undefined, {
    refetchInterval: 15000,
    staleTime: 10000,
  });

  // Contagem regressiva para próxima reconexão automática
  const [countdown, setCountdown] = useState<number | null>(null);
  useEffect(() => {
    if (!statusData?.nextReconnectAt) {
      setCountdown(null);
      return;
    }
    const update = () => {
      const diff = Math.max(0, Math.round((new Date(statusData.nextReconnectAt!).getTime() - Date.now()) / 1000));
      setCountdown(diff);
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [statusData?.nextReconnectAt]);

  const handleConnect = () => {
    setLocalConnecting(true);
    setPollingInterval(2000);
    connectMutation.mutate();
  };
  const handleDisconnect = () => {
    setLocalConnecting(false);
    disconnectMutation.mutate();
  };
  const handleResetSession = () => resetSessionMutation.mutate();
  const handleSendTest = () => {
    if (!testPhone.trim()) return;
    sendTestMutation.mutate({ telefone: testPhone.trim() });
  };

  // Guarda de permissão: apenas quem tem automacoesVer pode acessar WhatsApp
  if (!pode("automacoesVer")) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center p-8">
        <MessageCircle className="w-12 h-12 text-muted-foreground/30" />
        <p className="text-sm font-medium text-muted-foreground">Você não tem permissão para acessar o WhatsApp.</p>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-green-100">
          <MessageCircle className="w-6 h-6 text-green-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">WhatsApp</h1>
          <p className="text-sm text-muted-foreground">
            Conecte seu WhatsApp para enviar confirmações automáticas
          </p>
        </div>
      </div>

      {/* Status Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Status da Conexão</CardTitle>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${config.color}`}
            >
              {config.icon}
              {config.label}
            </span>
          </div>
          {statusData?.phoneNumber && (
            <CardDescription className="flex items-center gap-1.5 mt-1">
              <Smartphone className="w-3.5 h-3.5" />
              +{statusData.phoneNumber}
              {statusData.connectedAt && (
                <span className="text-xs text-muted-foreground ml-2">
                  · Conectado em {new Date(statusData.connectedAt).toLocaleString("pt-BR")}
                </span>
              )}
            </CardDescription>
          )}
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Estado: verificando conexão ao abrir a tela */}
          {isVerifying && (
            <div className="flex flex-col items-center gap-3 py-6">
              <Loader2 className="w-10 h-10 text-muted-foreground/40 animate-spin" />
              <p className="text-sm text-muted-foreground">Verificando conexão...</p>
            </div>
          )}

          {/* QR Code */}
          {!isVerifying && effectiveStatus === "qr_ready" && statusData?.qrDataUrl && (
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="p-3 bg-white rounded-xl border-2 border-green-200 shadow-sm">
                <img
                  src={statusData.qrDataUrl}
                  alt="QR Code WhatsApp"
                  className="w-56 h-56"
                />
              </div>
              <div className="text-center space-y-1">
                <p className="text-sm font-medium">Escaneie o QR Code com seu WhatsApp</p>
                <p className="text-xs text-muted-foreground">
                  Abra o WhatsApp → Menu → Aparelhos conectados → Conectar um aparelho
                </p>
                <p className="text-xs text-amber-600 font-medium mt-1">
                  ⏱ O QR Code expira em ~60 segundos
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetchStatus()}
                className="gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Atualizar QR Code
              </Button>
            </div>
          )}

          {/* QR Code aguardando (sem imagem ainda) */}
          {!isVerifying && effectiveStatus === "qr_ready" && !statusData?.qrDataUrl && (
            <div className="flex flex-col items-center gap-3 py-6">
              <QrCode className="w-10 h-10 text-blue-400 animate-pulse" />
              <p className="text-sm text-muted-foreground">Gerando QR Code...</p>
            </div>
          )}

          {/* Connecting state */}
          {!isVerifying && effectiveStatus === "connecting" && (
            <div className="flex flex-col items-center gap-3 py-6">
              <Loader2 className="w-10 h-10 text-yellow-500 animate-spin" />
              <p className="text-sm text-muted-foreground">Iniciando conexão, aguarde...</p>
            </div>
          )}

          {/* Scanning state (QR lido, aguardando confirmação) */}
          {!isVerifying && effectiveStatus === "scanning" && (
            <div className="flex flex-col items-center gap-3 py-6">
              <div className="relative">
                <Smartphone className="w-12 h-12 text-purple-400" />
                <Loader2 className="w-5 h-5 text-purple-600 animate-spin absolute -bottom-1 -right-1" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-purple-800">QR Code lido com sucesso!</p>
                <p className="text-xs text-muted-foreground">Aguardando confirmação no seu celular...</p>
              </div>
            </div>
          )}

          {/* Connected state */}
          {!isVerifying && effectiveStatus === "connected" && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 border border-green-100">
              <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
              <div>
                <p className="text-sm font-medium text-green-800">WhatsApp conectado!</p>
                <p className="text-xs text-green-600">
                  Confirmações automáticas de agendamento estão ativas.
                </p>
              </div>
            </div>
          )}

          {/* Disconnected / logged out state */}
          {!isVerifying && (effectiveStatus === "disconnected" || effectiveStatus === "logged_out") && (
            <div className="flex flex-col items-center gap-3 py-4">
              <WifiOff className="w-10 h-10 text-gray-300" />
              <div className="text-center">
                <p className="text-sm font-medium">WhatsApp não conectado</p>
                <p className="text-xs text-muted-foreground">
                  Clique em "Conectar" para gerar o QR Code
                </p>
              </div>
              {/* Contagem regressiva para reconexão automática */}
              {countdown !== null && countdown > 0 && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-700">
                  <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                  <span>Reconectando automaticamente em <strong>{countdown}s</strong></span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleConnect}
                    disabled={connectMutation.isPending || localConnecting}
                    className="h-6 px-2 text-xs text-blue-700 hover:bg-blue-100 gap-1 ml-1"
                  >
                    <Zap className="w-3 h-3" />
                    Reconectar agora
                  </Button>
                </div>
              )}
              {status === "logged_out" && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-left max-w-xs">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700">
                    Sessão encerrada. Se o QR Code não aparecer, use o botão "Resetar Sessão" abaixo.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          {!isVerifying && (
          <div className="flex flex-col gap-2 pt-2">
            <div className="flex gap-2">
              {effectiveStatus !== "connected" && (
                <Button
                  onClick={handleConnect}
                  disabled={connectMutation.isPending || localConnecting || effectiveStatus === "connecting" || effectiveStatus === "qr_ready"}
                  className="flex-1 gap-2 bg-green-600 hover:bg-green-700"
                >
                  {connectMutation.isPending || localConnecting || effectiveStatus === "connecting" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Wifi className="w-4 h-4" />
                  )}
                  {effectiveStatus === "connecting" ? "Conectando..." : effectiveStatus === "qr_ready" ? "Aguardando escaneamento..." : "Conectar WhatsApp"}
                </Button>
              )}
              {(effectiveStatus === "connected" || effectiveStatus === "qr_ready" || effectiveStatus === "connecting" || effectiveStatus === "scanning") && (
                <Button
                  variant="outline"
                  onClick={handleDisconnect}
                  disabled={disconnectMutation.isPending}
                  className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                >
                  {disconnectMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <LogOut className="w-4 h-4" />
                  )}
                  Desconectar
                </Button>
              )}
            </div>
            {(effectiveStatus === "disconnected" || effectiveStatus === "logged_out") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetSession}
                disabled={resetSessionMutation.isPending}
                className="gap-1.5 text-muted-foreground hover:text-foreground text-xs"
              >
                {resetSessionMutation.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RotateCcw className="w-3.5 h-3.5" />
                )}
                Resetar sessão (QR Code não aparece?)
              </Button>
            )}
          </div>
        )}
        </CardContent>
      </Card>

      {/* Test Message */}
      {effectiveStatus === "connected" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Enviar Mensagem de Teste</CardTitle>
            <CardDescription>
              Verifique se o envio está funcionando corretamente
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <div className="flex-1">
                <Label htmlFor="testPhone" className="sr-only">Número de telefone</Label>
                <Input
                  id="testPhone"
                  placeholder="(11) 99999-9999"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendTest()}
                />
              </div>
              <Button
                onClick={handleSendTest}
                disabled={sendTestMutation.isPending || !testPhone.trim()}
                className="gap-2"
              >
                {sendTestMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                Testar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Log de eventos de conexão */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-muted-foreground" />
              <CardTitle className="text-base">Diagnóstico de Conexão</CardTitle>
            </div>
            {connectionLog && connectionLog.length > 0 && (
              <span className="text-xs text-muted-foreground">
                {Math.min(connectionLog.length, 5)} de {connectionLog.length} eventos
              </span>
            )}
          </div>
          <CardDescription>Monitoramento detalhado de cada evento de conexão</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {(!connectionLog || connectionLog.length === 0) ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              Nenhum evento registrado ainda. Conecte o WhatsApp para iniciar o monitoramento.
            </div>
          ) : (
            <div className="divide-y max-h-[500px] overflow-y-auto">
              {connectionLog.slice(-5).reverse().map((entry) => {
                const eventConfig: Record<string, { label: string; color: string; dot: string; bg: string }> = {
                  connected:        { label: "Conectado",           color: "text-green-700",  dot: "bg-green-500",  bg: "hover:bg-green-50/50" },
                  disconnected:     { label: "Desconectado",        color: "text-gray-600",   dot: "bg-gray-400",   bg: "hover:bg-gray-50/50" },
                  qr_ready:         { label: "QR Code gerado",      color: "text-blue-700",   dot: "bg-blue-500",   bg: "hover:bg-blue-50/50" },
                  logged_out:       { label: "Sessão encerrada",    color: "text-red-700",    dot: "bg-red-500",    bg: "hover:bg-red-50/50" },
                  reconnecting:     { label: "Reconectando",        color: "text-yellow-700", dot: "bg-yellow-500", bg: "hover:bg-yellow-50/50" },
                  reconnect_attempt:{ label: "Tentativa de reconexão", color: "text-orange-700", dot: "bg-orange-400", bg: "hover:bg-orange-50/50" },
                  error:            { label: "Erro",                 color: "text-red-700",    dot: "bg-red-600",    bg: "hover:bg-red-50/50" },
                };
                const cfg = eventConfig[entry.event] ?? { label: entry.event, color: "text-muted-foreground", dot: "bg-gray-300", bg: "" };
                const duracaoFormatada = entry.duracaoSessaoMs
                  ? entry.duracaoSessaoMs < 60000
                    ? `${Math.round(entry.duracaoSessaoMs / 1000)}s`
                    : entry.duracaoSessaoMs < 3600000
                    ? `${Math.round(entry.duracaoSessaoMs / 60000)}min`
                    : `${(entry.duracaoSessaoMs / 3600000).toFixed(1)}h`
                  : null;
                const motivoLabel: Record<string, string> = {
                  timeout_rede: "Timeout de rede",
                  logout_dispositivo: "Logout no celular",
                  nao_autorizado: "Não autorizado",
                  acesso_negado: "Acesso negado",
                  sessao_expirada: "Sessão expirada",
                  erro_servidor_wa: "Erro no servidor WA",
                  servidor_wa_indisponivel: "Servidor WA indisponível",
                  reinicio_servidor: "Reinicio do servidor",
                  shutdown_servidor: "Shutdown do servidor",
                  conexao_estabelecida: "Conexão estabelecida",
                  aguardando_qr: "Aguardando QR",
                  erro_conexao: "Erro de conexão",
                };
                return (
                  <div key={entry.id} className={`px-4 py-3 transition-colors ${cfg.bg}`}>
                    <div className="flex items-start gap-3">
                      <span className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${cfg.dot}`} />
                      <div className="flex-1 min-w-0">
                        {/* Linha principal */}
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span className={`text-sm font-semibold ${cfg.color}`}>{cfg.label}</span>
                          <span className="text-xs text-muted-foreground shrink-0">
                            {new Date(entry.createdAt).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                          </span>
                        </div>
                        {/* Descrição */}
                        {entry.detail && (
                          <p className="text-xs text-muted-foreground mt-0.5">{entry.detail}</p>
                        )}
                        {/* Badges de metadados */}
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {entry.statusCode && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono bg-gray-100 text-gray-600 border border-gray-200">
                              Cód. {entry.statusCode}
                            </span>
                          )}
                          {entry.motivo && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-600 border border-slate-200">
                              {motivoLabel[entry.motivo] ?? entry.motivo}
                            </span>
                          )}
                          {duracaoFormatada && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] bg-blue-50 text-blue-600 border border-blue-200">
                              <Zap className="w-2.5 h-2.5" />
                              Sessão: {duracaoFormatada}
                            </span>
                          )}
                          {entry.tentativa && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] bg-orange-50 text-orange-600 border border-orange-200">
                              <RotateCcw className="w-2.5 h-2.5" />
                              Tentativa {entry.tentativa}
                            </span>
                          )}
                          {entry.telefone && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] bg-green-50 text-green-600 border border-green-200">
                              <Smartphone className="w-2.5 h-2.5" />
                              {entry.telefone}
                            </span>
                          )}
                        </div>
                        {/* Detalhe técnico (colapsável) */}
                        {entry.detalheTecnico && (
                          <details className="mt-1.5">
                            <summary className="text-[10px] text-muted-foreground cursor-pointer hover:text-foreground select-none">Ver detalhe técnico</summary>
                            <pre className="mt-1 text-[10px] text-muted-foreground bg-muted/50 rounded p-2 overflow-x-auto whitespace-pre-wrap break-all">{entry.detalheTecnico}</pre>
                          </details>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="border-dashed">
        <CardContent className="pt-5">
          <div className="space-y-3">
            <p className="text-sm font-medium">Como funciona</p>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex gap-2">
                <span className="text-green-600 font-bold shrink-0">1.</span>
                <span>Clique em "Conectar WhatsApp" e escaneie o QR Code com seu celular</span>
              </div>
              <div className="flex gap-2">
                <span className="text-green-600 font-bold shrink-0">2.</span>
                <span>Após conectar, o sistema envia automaticamente confirmações quando agendamentos são criados</span>
              </div>
              <div className="flex gap-2">
                <span className="text-green-600 font-bold shrink-0">3.</span>
                <span>O cliente recebe a mensagem diretamente no WhatsApp dele com os detalhes do agendamento</span>
              </div>
            </div>
            <Separator />
            <p className="text-xs text-muted-foreground">
              <strong>Atenção:</strong> Esta integração usa o WhatsApp Web. Mantenha seu celular conectado à internet para garantir o funcionamento. Para alto volume de mensagens, considere a API oficial do WhatsApp Business.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
