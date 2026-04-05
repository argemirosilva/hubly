import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { usePermissoes } from "@/hooks/usePermissoes";
import {
  Bell, CheckCheck, Calendar, DollarSign, AlertCircle,
  Package, Clock, RefreshCw, ChevronRight,
  BellRing, BellOff, Smartphone, CheckCircle2, XCircle, Volume2, Loader2, Info,
  Send, MessageCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

// ── Ícones por tipo ───────────────────────────────────────────────────────────
function getNotifIcon(tipo?: string | null) {
  switch (tipo) {
    case "agendamento":       return { icon: Calendar,      bg: "oklch(55% 0.22 264 / 12%)", color: "oklch(45% 0.18 264)" };
    case "financeiro":        return { icon: DollarSign,    bg: "oklch(62% 0.18 155 / 12%)", color: "oklch(38% 0.14 155)" };
    case "alerta":            return { icon: AlertCircle,   bg: "oklch(72% 0.16 80 / 12%)",  color: "oklch(40% 0.14 75)"  };
    case "vencimento_proximo":return { icon: Clock,         bg: "oklch(72% 0.16 60 / 12%)",  color: "oklch(45% 0.18 55)"  };
    case "sessoes_restantes": return { icon: Package,       bg: "oklch(62% 0.18 300 / 12%)", color: "oklch(38% 0.16 300)" };
    case "pacote_vencido":    return { icon: AlertCircle,   bg: "oklch(65% 0.20 25 / 12%)",  color: "oklch(40% 0.18 25)"  };
    default:                  return { icon: Bell,          bg: "oklch(55% 0.22 264 / 12%)", color: "oklch(45% 0.18 264)" };
  }
}

function formatarData(d: Date | string) {
  return new Date(d).toLocaleString("pt-BR", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

// ── Tipo unificado ────────────────────────────────────────────────────────────
type NotifUnificada = {
  id: number;
  origem: "sistema" | "pacote";
  tipo: string | null;
  titulo: string;
  mensagem: string;
  lida: boolean;
  data: Date | string;
  clienteNome?: string | null;
  clienteId?: number | null;
  pacoteClienteId?: number | null;
  diasParaVencer?: number | null;
  sessoesRestantes?: number | null;
};

export default function Notificacoes() {
  const utils = trpc.useUtils();
  const [, setLocation] = useLocation();

  // ── Permissões ────────────────────────────────────────────────────────
  const { pode, isOwner } = usePermissoes();
  // Permissão para aprovar/recusar bloqueios de agenda.
  // TODO: Quando botões de aprovar/recusar bloqueios forem adicionados a esta página,
  // usar `podeAprovarBloqueio` para condicionar a exibição dessas ações.
  const podeAprovarBloqueio = isOwner || pode('agendaAprovarBloqueio');

  // ── Envio rápido de mensagem ──────────────────────────────────────────
  const [envioRapido, setEnvioRapido] = useState<{ clienteId: number; clienteNome: string; pacoteClienteId: number; notificacaoPacoteId: number } | null>(null);

  // ── Push Notifications (PWA) ──────────────────────────────────────────
  const push = usePushNotifications();
  const isPWA = window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as { standalone?: boolean }).standalone === true;

  // ── Notificações do sistema ───────────────────────────────────────────────
  const { data: notifSistema } = trpc.notificacoes.list.useQuery();
  const marcarLidaSistemaMutation = trpc.notificacoes.marcarLida.useMutation({
    onSuccess: () => utils.notificacoes.list.invalidate(),
    onError: (err: any) => toast.error(err.message),
  });
  const marcarTodasSistemaMutation = trpc.notificacoes.marcarTodasLidas.useMutation({
    onSuccess: () => utils.notificacoes.list.invalidate(),
    onError: (err: any) => toast.error(err.message),
  });

  // ── Notificações de pacotes ───────────────────────────────────────────────
  const { data: notifPacotes, refetch: refetchPacotes } = trpc.pacotes.listarNotificacoes.useQuery({
    apenasNaoLidas: false,
    limite: 100,
  });
  const marcarLidaPacoteMutation = trpc.pacotes.marcarLida.useMutation({
    onSuccess: () => utils.pacotes.listarNotificacoes.invalidate(),
    onError: (err: any) => toast.error(err.message),
  });
  const marcarTodasPacotesMutation = trpc.pacotes.marcarTodasLidas.useMutation({
    onSuccess: () => { utils.pacotes.listarNotificacoes.invalidate(); },
    onError: (err: any) => toast.error(err.message),
  });
  const verificarMutation = trpc.pacotes.verificarPacotesVencendo.useMutation({
    onSuccess: (data) => {
      toast.success(`Verificação concluída: ${data.criadas} nova(s) notificação(ões) gerada(s).`);
      utils.pacotes.listarNotificacoes.invalidate();
      utils.pacotes.contarNaoLidas.invalidate();
    },
    onError: (err: any) => toast.error(err.message),
  });

  // ── Unificar e ordenar ────────────────────────────────────────────────────
  const lista: NotifUnificada[] = [
    ...(notifSistema ?? []).map(n => ({
      id: n.id,
      origem: "sistema" as const,
      tipo: (n as any).tipo ?? null,
      titulo: (n as any).titulo ?? "Notificação",
      mensagem: n.mensagem ?? "",
      lida: !!n.lida,
      data: (n as any).createdAt ?? new Date(),
    })),
    ...(notifPacotes ?? []).map(n => ({
      id: n.id,
      origem: "pacote" as const,
      tipo: n.tipo,
      titulo: n.tipo === "vencimento_proximo"
        ? `Pacote vencendo em ${n.diasParaVencer} dia(s)`
        : n.tipo === "sessoes_restantes"
          ? `Poucas sessões restantes`
          : `Pacote vencido`,
      mensagem: n.mensagem,
      lida: n.lida,
      data: n.enviadoEm,
      clienteNome: n.clienteNome,
      clienteId: n.clienteId,
      pacoteClienteId: n.pacoteClienteId,
      diasParaVencer: n.diasParaVencer,
      sessoesRestantes: n.sessoesRestantes,
    })),
  ].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

  const naoLidas = lista.filter(n => !n.lida).length;

  function marcarLida(n: NotifUnificada) {
    if (n.lida) return;
    if (n.origem === "sistema") {
      marcarLidaSistemaMutation.mutate({ id: n.id });
    } else {
      marcarLidaPacoteMutation.mutate({ id: n.id });
    }
  }

  function marcarTodasLidas() {
    const temSistema = (notifSistema ?? []).some(n => !n.lida);
    const temPacotes = (notifPacotes ?? []).some(n => !n.lida);
    if (temSistema) marcarTodasSistemaMutation.mutate();
    if (temPacotes) marcarTodasPacotesMutation.mutate();
    if (!temSistema && !temPacotes) toast.info("Nenhuma notificação não lida.");
    else toast.success("Todas marcadas como lidas!");
  }

  return (
    <div className="p-4 lg:p-6 space-y-4 max-w-3xl mx-auto animate-in-up">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-bold tracking-tight text-xl lg:text-2xl">Notificações</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {naoLidas > 0 ? `${naoLidas} não lida${naoLidas !== 1 ? "s" : ""}` : "Tudo em dia"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Botão verificar pacotes */}
          <button
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border transition-colors"
            style={{ borderColor: "oklch(88% 0.010 250)", color: "oklch(45% 0.010 260)" }}
            onClick={() => verificarMutation.mutate()}
            disabled={verificarMutation.isPending}
            title="Verificar pacotes vencendo e gerar alertas"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${verificarMutation.isPending ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Verificar pacotes</span>
          </button>
          {/* Botão marcar todas lidas */}
          {naoLidas > 0 && (
            <button
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border transition-colors"
              style={{ borderColor: "oklch(88% 0.010 250)", color: "oklch(45% 0.010 260)" }}
              onClick={marcarTodasLidas}
              disabled={marcarTodasSistemaMutation.isPending || marcarTodasPacotesMutation.isPending}
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Marcar todas como lidas</span>
              <span className="sm:hidden">Marcar lidas</span>
            </button>
          )}
        </div>
      </div>

      {/* Lista */}
      <div className="card-elegant overflow-hidden">
        {lista.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-center px-6">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: "oklch(55% 0.22 264 / 8%)" }}>
              <Bell className="w-5 h-5" style={{ color: "oklch(55% 0.22 264)" }} />
            </div>
            <p className="text-sm font-medium text-foreground mb-1">Nenhuma notificação</p>
            <p className="text-xs text-muted-foreground mb-4">
              Clique em "Verificar pacotes" para checar alertas de vencimento.
            </p>
            <button
              className="flex items-center gap-1.5 text-xs font-medium px-4 py-2 rounded-lg transition-colors"
              style={{ background: "oklch(55% 0.22 264 / 10%)", color: "oklch(45% 0.18 264)" }}
              onClick={() => verificarMutation.mutate()}
              disabled={verificarMutation.isPending}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${verificarMutation.isPending ? "animate-spin" : ""}`} />
              Verificar agora
            </button>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: "oklch(94% 0.008 250)" }}>
            {lista.map(n => {
              const { icon: NIcon, bg, color } = getNotifIcon(n.tipo);
              return (
                <div
                  key={`${n.origem}-${n.id}`}
                  className="flex items-start gap-3 px-4 py-4 cursor-pointer transition-colors"
                  style={{ background: !n.lida ? "oklch(55% 0.22 264 / 3%)" : "transparent" }}
                  onClick={() => marcarLida(n)}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.background = "oklch(97% 0.006 250)";
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.background = !n.lida ? "oklch(55% 0.22 264 / 3%)" : "transparent";
                  }}
                >
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: bg }}>
                    <NIcon className="w-4 h-4" style={{ color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className={`text-sm leading-snug ${!n.lida ? "font-semibold text-foreground" : "text-foreground/80"}`}>
                        {n.titulo}
                      </p>
                      {n.origem === "pacote" && (
                        <span className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full"
                          style={{ background: "oklch(72% 0.16 60 / 15%)", color: "oklch(45% 0.18 55)" }}>
                          Pacote
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{n.mensagem}</p>
                    {n.clienteNome && (
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <button
                          className="flex items-center gap-1 text-[11px] font-medium transition-colors"
                          style={{ color: "oklch(55% 0.22 264)" }}
                          onClick={e => {
                            e.stopPropagation();
                            if (n.clienteId) setLocation(`/admin/clientes/${n.clienteId}`);
                          }}
                        >
                          {n.clienteNome}
                          <ChevronRight className="w-3 h-3" />
                        </button>
                        {n.origem === "pacote" && n.clienteId && n.pacoteClienteId && (
                          <button
                            className="flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-lg transition-colors"
                            style={{ background: "oklch(55% 0.18 155 / 10%)", color: "oklch(40% 0.16 155)" }}
                            onClick={e => {
                              e.stopPropagation();
                              setEnvioRapido({ clienteId: n.clienteId!, clienteNome: n.clienteNome!, pacoteClienteId: n.pacoteClienteId!, notificacaoPacoteId: n.id });
                            }}
                          >
                            <Send className="w-3 h-3" />
                            Enviar mensagem
                          </button>
                        )}
                      </div>
                    )}
                    <p className="text-[10px] text-muted-foreground/50 mt-1.5">
                      {formatarData(n.data)}
                    </p>
                  </div>
                  {!n.lida && (
                    <div className="w-2 h-2 rounded-full mt-2 flex-shrink-0"
                      style={{ background: "oklch(55% 0.22 264)" }} />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── Push Notifications (PWA) ─── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Smartphone className="w-4 h-4" />
              Notificações Push (PWA)
            </CardTitle>
            {push.isSubscribed && (
              <Badge className="bg-green-100 text-green-700 border-green-200 text-xs">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Ativo
              </Badge>
            )}
            {push.isDenied && (
              <Badge variant="destructive" className="text-xs">
                <XCircle className="w-3 h-3 mr-1" />
                Bloqueado
              </Badge>
            )}
            {!push.isSubscribed && !push.isDenied && push.isSupported && (
              <Badge variant="secondary" className="text-xs">
                <BellOff className="w-3 h-3 mr-1" />
                Inativo
              </Badge>
            )}
          </div>
          <CardDescription>
            Receba alertas com som mesmo com o app em segundo plano ou fechado
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {!push.isSupported && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700">
                Navegador não suportado. Use Chrome, Edge ou Firefox para ativar notificações push.
              </p>
            </div>
          )}
          {push.isDenied && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
              <XCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <p className="text-xs text-red-700">
                Notificações bloqueadas. Acesse as configurações do navegador → Privacidade → Notificações → Permitir para este site.
              </p>
            </div>
          )}
          {push.isSubscribed && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-green-50 border border-green-100">
              <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
              <p className="text-xs text-green-800">
                Notificações ativas neste dispositivo. Você receberá alertas mesmo com o app fechado.
              </p>
            </div>
          )}
          {!push.isSubscribed && !push.isDenied && push.isSupported && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 border border-blue-100">
              <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <p className="text-xs text-blue-700">
                Ative para receber alertas de novos agendamentos, lembretes e avisos financeiros{isPWA ? " com som" : ". Instale o app como atalho para receber notificações com som"}.
              </p>
            </div>
          )}
          {push.isSupported && !push.isDenied && (
            <div className="flex gap-2">
              {!push.isSubscribed ? (
                <Button
                  size="sm"
                  onClick={push.subscribe}
                  disabled={push.isLoading}
                  className="gap-2 bg-blue-600 hover:bg-blue-700"
                >
                  {push.isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BellRing className="w-3.5 h-3.5" />}
                  Ativar Notificações Push
                </Button>
              ) : (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={push.sendTest}
                    disabled={push.isLoading}
                    className="gap-2"
                  >
                    {push.isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Volume2 className="w-3.5 h-3.5" />}
                    Enviar Teste
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={push.unsubscribe}
                    disabled={push.isLoading}
                    className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                  >
                    {push.isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BellOff className="w-3.5 h-3.5" />}
                    Desativar
                  </Button>
                </>
              )}
            </div>
          )}
          {!isPWA && (
            <>
              <Separator />
              <div className="space-y-1.5">
                <p className="text-xs font-semibold">Para receber notificações com som, instale como atalho:</p>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <p><span className="font-medium text-foreground">Android (Chrome):</span> Menu (⋮) → Adicionar à tela inicial</p>
                  <p><span className="font-medium text-foreground">iPhone (Safari):</span> Compartilhar (□↑) → Adicionar à Tela de Início</p>
                  <p><span className="font-medium text-foreground">Desktop (Chrome):</span> Ícone de instalação (⊕) na barra de endereços</p>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ── Modal de Envio Rápido ── */}
      {envioRapido && (
        <EnvioRapidoModal
          clienteId={envioRapido.clienteId}
          clienteNome={envioRapido.clienteNome}
          pacoteClienteId={envioRapido.pacoteClienteId}
          notificacaoPacoteId={envioRapido.notificacaoPacoteId}
          onClose={() => setEnvioRapido(null)}
          onSuccess={() => {
            setEnvioRapido(null);
            utils.pacotes.listarNotificacoes.invalidate();
            utils.pacotes.contarNaoLidas.invalidate();
          }}
        />
      )}
    </div>
  );
}

// ─── Modal de Envio Rápido ──────────────────────────────────────────────────

function EnvioRapidoModal({ clienteId, clienteNome, pacoteClienteId, notificacaoPacoteId, onClose, onSuccess }: {
  clienteId: number;
  clienteNome: string;
  pacoteClienteId: number;
  notificacaoPacoteId: number;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { data: automacoesManual, isLoading } = trpc.automacoes.getAutomacoesManual.useQuery({ evento: "renovacao_pacote" });
  const enviarMutation = trpc.automacoes.enviarManual.useMutation({
    onSuccess: () => {
      toast.success("Mensagem enviada com sucesso!");
      onSuccess();
    },
    onError: (err) => toast.error(err.message),
  });

  const automacao = automacoesManual?.[0];
  const preview = automacao?.corpoMensagem
    ?.replace(/\{\{nome_cliente\}\}/g, clienteNome)
    ?.replace(/\{\{primeiro_nome\}\}/g, clienteNome.split(" ")[0])
    ?? "";

  return (
    <Dialog open onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <MessageCircle className="w-4 h-4" style={{ color: "oklch(55% 0.18 155)" }} />
            Enviar mensagem para {clienteNome.split(" ")[0]}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 flex items-center justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : !automacao ? (
          <div className="py-6 text-center space-y-3">
            <MessageCircle className="w-10 h-10 mx-auto text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">
              Nenhuma automação manual de renovação configurada.
            </p>
            <p className="text-xs text-muted-foreground">
              Crie uma automação do tipo "Manual" com evento "renovacao_pacote" em Automações.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl p-4 text-sm leading-relaxed whitespace-pre-wrap"
              style={{ background: "oklch(96% 0.006 250)", border: "1px solid oklch(90% 0.012 250)" }}>
              {preview || automacao.corpoMensagem}
            </div>
            <p className="text-[11px] text-muted-foreground">
              As variáveis serão substituídas pelos dados reais do cliente e pacote ao enviar.
            </p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} size="sm">Cancelar</Button>
          {automacao && (
            <Button
              size="sm"
              className="gap-1.5"
              style={{ background: "oklch(55% 0.18 155)", color: "white" }}
              disabled={enviarMutation.isPending}
              onClick={() => {
                enviarMutation.mutate({
                  automacaoId: automacao.id,
                  clienteId,
                  pacoteClienteId,
                  notificacaoPacoteId,
                });
              }}
            >
              {enviarMutation.isPending ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Enviando...</>
              ) : (
                <><Send className="w-3.5 h-3.5" /> Enviar via WhatsApp</>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
