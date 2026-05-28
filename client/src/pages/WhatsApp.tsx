import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { usePermissoes } from "@/hooks/usePermissoes";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Smartphone,
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
} from "lucide-react";

type WAStatus = "disconnected" | "connecting" | "qr_ready" | "scanning" | "connected" | "logged_out";

const statusConfig: Record<WAStatus, { label: string; color: string; icon: React.ReactNode }> = {
  scanning: { label: "QR Code lido...", color: "bg-purple-100 text-purple-700 border-purple-200", icon: <Loader2 className="w-4 h-4 animate-spin" /> },
  disconnected: { label: "Desconectado", color: "bg-stone-100 text-gray-700 border-gray-200", icon: <WifiOff className="w-4 h-4" /> },
  connecting: { label: "Conectando...", color: "bg-yellow-100 text-yellow-700 border-yellow-200", icon: <Loader2 className="w-4 h-4 animate-spin" /> },
  qr_ready: { label: "Aguardando leitura", color: "bg-amber-100 text-blue-700 border-blue-200", icon: <QrCode className="w-4 h-4" /> },
  connected: { label: "Conectado", color: "bg-green-100 text-green-700 border-green-200", icon: <CheckCircle2 className="w-4 h-4" /> },
  logged_out: { label: "Sessão encerrada", color: "bg-red-100 text-red-700 border-red-200", icon: <AlertCircle className="w-4 h-4" /> },
};

export default function WhatsAppPage() {
  const { pode } = usePermissoes();
  const [testPhone, setTestPhone] = useState("");
  const [pollingInterval, setPollingInterval] = useState(10000);
  const [localConnecting, setLocalConnecting] = useState(false);
  const [showZapiQr, setShowZapiQr] = useState(false);

  // Plano da empresa — determina qual API usar (transparente ao usuário)
  // Sempre dispara zapiGetStatus primeiro (o backend decide se é Pro ou não)
  const { data: planoStatus } = trpc.planos.getStatus.useQuery(undefined, {
    retry: 1,
    retryDelay: 2000,
  });

  // ─── Z-API: sempre consulta o backend (o backend decide com base no plano + credenciais) ───────────────────────────────────────────────────────────────────────────────
  const { data: zapiStatus, refetch: refetchZapi } = trpc.whatsapp.zapiGetStatus.useQuery(undefined, {
    refetchInterval: pollingInterval,
    refetchIntervalInBackground: false,
    retry: 1,
  });

  // isPro é determinado pelo backend via zapiStatus.isPro (fonte única de verdade)
  const isPro = zapiStatus?.isPro === true;
  // Considera carregado quando zapiStatus chegou (independente do planoStatus)
  const planoCarregado = zapiStatus !== undefined;

  const [zapiOrigin] = useState(() => window.location.origin);

  const { data: zapiQrData, isLoading: zapiQrLoading, refetch: refetchZapiQr } =
    trpc.whatsapp.zapiGetQrCode.useQuery({ origin: zapiOrigin }, {
      enabled: isPro && showZapiQr && zapiStatus?.connected === false,
      refetchInterval: isPro && showZapiQr && !zapiStatus?.connected ? 15000 : false,
      retry: 1,
    });

  const zapiRestartMutation = trpc.whatsapp.zapiRestart.useMutation({
    onSuccess: (d) => {
      if (d.ok) { toast.success("Instância reiniciada"); refetchZapi(); setShowZapiQr(true); setTimeout(() => refetchZapiQr(), 3000); }
      else toast.error("Erro ao reiniciar: " + (d.error ?? "desconhecido"));
    },
    onError: (e) => toast.error("Erro ao reiniciar: " + e.message),
  });

  const zapiDisconnectMutation = trpc.whatsapp.zapiDisconnect.useMutation({
    onSuccess: (d) => {
      if (d.ok) { toast.success("WhatsApp desconectado"); refetchZapi(); setShowZapiQr(false); }
      else toast.error("Erro ao desconectar: " + (d.error ?? "desconhecido"));
    },
    onError: (e) => toast.error("Erro ao desconectar: " + e.message),
  });

  // ─── Baileys (Solo / Plus) ───────────────────────────────────────────────────────────────────────────────
  const { data: baileysData, isLoading: baileysLoading, refetch: refetchBaileys } =
    trpc.whatsapp.getStatus.useQuery(undefined, {
      enabled: planoCarregado && !isPro,
      refetchInterval: planoCarregado && !isPro ? pollingInterval : false,
      refetchIntervalInBackground: false,
      retry: 1,
    });

  const baileysStatus = (baileysData?.status ?? "disconnected") as WAStatus;
  const effectiveBaileysStatus: WAStatus =
    localConnecting && !["connecting", "connected", "qr_ready", "scanning"].includes(baileysStatus)
      ? "connecting"
      : baileysStatus;

  const connectMutation = trpc.whatsapp.connect.useMutation({
    onSuccess: () => { setPollingInterval(2000); refetchBaileys(); },
    onError: (e) => toast.error("Erro ao conectar: " + e.message),
  });
  const disconnectMutation = trpc.whatsapp.disconnect.useMutation({
    onSuccess: () => { setLocalConnecting(false); refetchBaileys(); toast.success("WhatsApp desconectado"); },
    onError: (e) => toast.error("Erro ao desconectar: " + e.message),
  });
  const sendTestMutation = trpc.whatsapp.sendTest.useMutation({
    onSuccess: () => toast.success("Mensagem de teste enviada!"),
    onError: (e) => toast.error("Erro ao enviar: " + e.message),
  });
  const resetSessionMutation = trpc.whatsapp.resetSession.useMutation({
    onSuccess: () => { refetchBaileys(); toast.success("Sessão reiniciada"); },
    onError: (e) => toast.error("Erro ao reiniciar: " + e.message),
  });

  const { data: connectionLog } = trpc.whatsapp.getConnectionLog.useQuery(undefined, {
    enabled: planoCarregado && !isPro,
    refetchInterval: planoCarregado && !isPro ? 30000 : false,
  });

  // ─── Efeitos de polling ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!isPro) {
      if (["connecting", "connected", "qr_ready", "scanning"].includes(baileysStatus)) setLocalConnecting(false);
    }
  }, [baileysStatus, isPro]);

  useEffect(() => {
    const connected = isPro ? (zapiStatus?.connected ?? false) : (baileysStatus === "connected");
    if (connected) {
      setPollingInterval(30000);
      if (isPro) setShowZapiQr(false);
    } else if (!isPro && ["qr_ready", "connecting", "scanning"].includes(baileysStatus)) {
      setPollingInterval(2000);
    } else {
      setPollingInterval(10000);
    }
  }, [zapiStatus?.connected, baileysStatus, isPro]);

  // ─── Helpers ─────────────────────────────────────────────────────────────────
  const isConnected = isPro ? (zapiStatus?.connected ?? false) : (baileysStatus === "connected");
  const refetchStatus = () => { if (isPro) refetchZapi(); else refetchBaileys(); };

  if (!pode("automacoesVer")) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center p-8">
        <MessageCircle className="w-12 h-12 text-muted-foreground/30" />
        <p className="text-sm font-medium text-muted-foreground">Você não tem permissão para acessar o WhatsApp.</p>
      </div>
    );
  }

  // ─── Render Z-API ─────────────────────────────────────────────────────────────
  const renderZapi = () => {
    const connected = zapiStatus?.connected ?? false;
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Status da Conexão</CardTitle>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
              connected ? "bg-green-100 text-green-700 border-green-200" : "bg-stone-100 text-gray-700 border-gray-200"
            }`}>
              {connected ? <CheckCircle2 className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
              {connected ? "Conectado" : "Desconectado"}
            </span>
          </div>
          {connected && (zapiStatus?.phoneNumber || zapiStatus?.deviceName) && (
            <CardDescription className="flex items-center gap-1.5 mt-1">
              <Smartphone className="w-3.5 h-3.5" />
              {[zapiStatus?.deviceName, zapiStatus?.phoneNumber].filter(Boolean).join(" · ")}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {connected ? (
            <>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-200">
                <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-green-800">WhatsApp conectado</p>
                  <p className="text-xs text-green-600">Mensagens automáticas estão sendo enviadas normalmente.</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => zapiRestartMutation.mutate()} disabled={zapiRestartMutation.isPending} className="flex-1">
                  {zapiRestartMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                  Reiniciar
                </Button>
                <Button variant="outline" size="sm" onClick={() => zapiDisconnectMutation.mutate()} disabled={zapiDisconnectMutation.isPending} className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50">
                  {zapiDisconnectMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <LogOut className="w-4 h-4 mr-2" />}
                  Desconectar
                </Button>
              </div>
            </>
          ) : !showZapiQr ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 p-3 rounded-lg bg-stone-50 border border-gray-200">
                <WifiOff className="w-5 h-5 text-gray-500 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-800">WhatsApp desconectado</p>
                  <p className="text-xs text-gray-500">Clique em "Conectar" para gerar o QR Code.</p>
                </div>
              </div>
              <Button onClick={() => { setShowZapiQr(true); refetchZapiQr(); }} className="w-full">
                <QrCode className="w-4 h-4 mr-2" />
                Conectar WhatsApp
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground text-center">
                Abra o WhatsApp no celular → <strong>Dispositivos conectados</strong> → <strong>Conectar dispositivo</strong> → escaneie o QR Code.
              </p>
              {zapiQrLoading ? (
                <div className="flex flex-col items-center gap-3 py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Gerando QR Code...</p>
                </div>
              ) : zapiQrData?.qrBase64 ? (
                <div className="flex flex-col items-center gap-3">
                  <img src={zapiQrData.qrBase64} alt="QR Code WhatsApp" className="w-56 h-56 rounded-xl border-2 border-gray-200 shadow-sm" />
                  <p className="text-xs text-muted-foreground">QR Code atualiza automaticamente a cada 15s</p>
                  <Button variant="outline" size="sm" onClick={() => refetchZapiQr()}>
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Atualizar QR
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 py-6">
                  <AlertCircle className="w-8 h-8 text-yellow-500" />
                  <p className="text-sm text-muted-foreground text-center">Não foi possível gerar o QR Code. Tente reiniciar.</p>
                  <Button variant="outline" size="sm" onClick={() => zapiRestartMutation.mutate()} disabled={zapiRestartMutation.isPending}>
                    {zapiRestartMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                    Reiniciar
                  </Button>
                </div>
              )}
              <Button variant="ghost" size="sm" onClick={() => setShowZapiQr(false)} className="w-full text-muted-foreground">
                Cancelar
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  // ─── Render Baileys ───────────────────────────────────────────────────────────
  const renderBaileys = () => {
    const config = statusConfig[effectiveBaileysStatus];
    return (
      <>
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Status da Conexão</CardTitle>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${config.color}`}>
                {config.icon}
                {config.label}
              </span>
            </div>
            {baileysData?.phoneNumber && (
              <CardDescription className="flex items-center gap-1.5 mt-1">
                <Smartphone className="w-3.5 h-3.5" />
                {baileysData.phoneNumber}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {baileysLoading && baileysData === undefined ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : effectiveBaileysStatus === "connected" ? (
              <>
                <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-200">
                  <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-green-800">WhatsApp conectado</p>
                    <p className="text-xs text-green-600">Mensagens automáticas estão sendo enviadas normalmente.</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => disconnectMutation.mutate()} disabled={disconnectMutation.isPending} className="w-full text-red-600 hover:text-red-700 hover:bg-red-50">
                  {disconnectMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <LogOut className="w-4 h-4 mr-2" />}
                  Desconectar
                </Button>
              </>
            ) : effectiveBaileysStatus === "qr_ready" ? (
              <>
                <p className="text-sm text-muted-foreground text-center">
                  Abra o WhatsApp no celular → <strong>Dispositivos conectados</strong> → <strong>Conectar dispositivo</strong> → escaneie o QR Code.
                </p>
                {baileysData?.qrDataUrl ? (
                  <div className="flex flex-col items-center gap-2">
                    <img src={baileysData.qrDataUrl} alt="QR Code WhatsApp" className="w-56 h-56 rounded-xl border-2 border-gray-200 shadow-sm" />
                    <p className="text-xs text-muted-foreground">QR Code atualiza automaticamente</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3 py-6">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Gerando QR Code...</p>
                  </div>
                )}
                <Button variant="outline" size="sm" onClick={() => disconnectMutation.mutate()} className="w-full text-red-600 hover:text-red-700">
                  <LogOut className="w-4 h-4 mr-2" /> Cancelar
                </Button>
              </>
            ) : effectiveBaileysStatus === "connecting" || effectiveBaileysStatus === "scanning" ? (
              <div className="flex flex-col items-center gap-3 py-6">
                <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
                <p className="text-sm text-muted-foreground">
                  {effectiveBaileysStatus === "scanning" ? "QR Code lido, autenticando..." : "Conectando ao WhatsApp..."}
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 p-3 rounded-lg bg-stone-50 border border-gray-200">
                  <WifiOff className="w-5 h-5 text-gray-500 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-800">WhatsApp desconectado</p>
                    <p className="text-xs text-gray-500">Clique em "Conectar" para gerar o QR Code.</p>
                  </div>
                </div>
                <Button onClick={() => { setLocalConnecting(true); setPollingInterval(2000); connectMutation.mutate(); }} disabled={connectMutation.isPending || localConnecting} className="w-full">
                  {(connectMutation.isPending || localConnecting) ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <QrCode className="w-4 h-4 mr-2" />}
                  Conectar WhatsApp
                </Button>
                {effectiveBaileysStatus === "logged_out" && (
                  <Button variant="outline" size="sm" onClick={() => resetSessionMutation.mutate()} disabled={resetSessionMutation.isPending} className="w-full">
                    {resetSessionMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RotateCcw className="w-4 h-4 mr-2" />}
                    Reiniciar sessão
                  </Button>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {connectionLog && connectionLog.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-muted-foreground" />
                <CardTitle className="text-sm text-muted-foreground font-normal">Histórico de conexão</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {connectionLog.slice(0, 10).map((log, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    <span className="text-muted-foreground shrink-0">
                      {new Date(log.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <span className="text-foreground">{log.event}{log.detail ? ` — ${log.detail}` : ""}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </>
    );
  };

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
        <Button variant="ghost" size="sm" onClick={refetchStatus} className="ml-auto">
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Conteúdo principal — transparente ao usuário */}
      {!planoCarregado ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : isPro ? renderZapi() : renderBaileys()}

      {/* Enviar mensagem de teste */}
      {isConnected && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Send className="w-4 h-4" />
              Enviar mensagem de teste
            </CardTitle>
            <CardDescription>
              Verifique se o envio está funcionando corretamente.
              {isPro && zapiStatus?.phoneNumber && (
                <span className="block mt-0.5 text-xs text-muted-foreground/70">
                  Número conectado: <strong>{[zapiStatus.deviceName, zapiStatus.phoneNumber].filter(Boolean).join(" · ")}</strong>
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <div className="flex-1">
                <Label htmlFor="testPhone" className="sr-only">Número de telefone</Label>
                <Input
                  id="testPhone"
                  placeholder={isPro && zapiStatus?.phoneNumber ? zapiStatus.phoneNumber : baileysData?.phoneNumber ?? "55 11 99999-9999"}
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                />
              </div>
              <Button onClick={() => { if (!testPhone.trim()) return; sendTestMutation.mutate({ telefone: testPhone.trim() }); }} disabled={sendTestMutation.isPending || !testPhone.trim()}>
                {sendTestMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
