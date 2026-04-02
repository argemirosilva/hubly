import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Crown,
  Zap,
  Star,
  Sparkles,
  CreditCard,
  FileText,
  ExternalLink,
  Download,
  ArrowUpRight,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  RefreshCw,
  Calendar,
  BarChart3,
} from "lucide-react";
import { Link } from "wouter";

const PLAN_ICONS: Record<string, React.ReactNode> = {
  FREE: <Star className="w-5 h-5" />,
  SOLO: <Zap className="w-5 h-5" />,
  PLUS: <Sparkles className="w-5 h-5" />,
  PRO: <Crown className="w-5 h-5" />,
};

const PLAN_COLORS: Record<string, string> = {
  FREE: "text-muted-foreground",
  SOLO: "text-blue-500",
  PLUS: "text-primary",
  PRO: "text-amber-500",
};

const PLAN_LABELS: Record<string, string> = {
  FREE: "Free",
  SOLO: "Solo",
  PLUS: "Plus",
  PRO: "Pro",
};

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
    active: { label: "Ativo", variant: "default", icon: <CheckCircle className="w-3 h-3" /> },
    trial: { label: "Período de teste", variant: "secondary", icon: <Clock className="w-3 h-3" /> },
    past_due: { label: "Pagamento pendente", variant: "destructive", icon: <AlertTriangle className="w-3 h-3" /> },
    canceled: { label: "Cancelado", variant: "outline", icon: <XCircle className="w-3 h-3" /> },
    paused: { label: "Pausado", variant: "outline", icon: <RefreshCw className="w-3 h-3" /> },
  };
  const cfg = map[status] ?? map["active"];
  return (
    <Badge variant={cfg.variant} className="flex items-center gap-1 text-xs">
      {cfg.icon}
      {cfg.label}
    </Badge>
  );
}

function InvoiceStatusBadge({ status }: { status: string | null }) {
  if (status === "paid") return <Badge className="bg-green-500/15 text-green-600 border-green-500/30 text-xs">Pago</Badge>;
  if (status === "open") return <Badge variant="secondary" className="text-xs">Em aberto</Badge>;
  if (status === "void") return <Badge variant="outline" className="text-xs">Anulado</Badge>;
  if (status === "uncollectible") return <Badge variant="destructive" className="text-xs">Não cobrado</Badge>;
  return <Badge variant="outline" className="text-xs">{status ?? "-"}</Badge>;
}

function formatCurrency(value: number, currency = "BRL") {
  return value.toLocaleString("pt-BR", { style: "currency", currency });
}

function formatDate(date: Date | string | null | undefined) {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

function CardBrandIcon({ brand }: { brand: string | null }) {
  const brands: Record<string, string> = {
    visa: "VISA",
    mastercard: "MC",
    amex: "AMEX",
    elo: "ELO",
    hipercard: "HIPER",
  };
  return (
    <span className="inline-flex items-center justify-center w-10 h-6 rounded border border-border bg-muted text-[10px] font-bold tracking-wider">
      {brands[brand?.toLowerCase() ?? ""] ?? brand?.toUpperCase() ?? "CARD"}
    </span>
  );
}

export default function MinhaAssinatura() {
  const { user } = useAuth();
  const [portalLoading, setPortalLoading] = useState(false);

  const { data: status, isLoading: statusLoading } = trpc.planos.getStatus.useQuery(
    undefined,
    { enabled: !!user }
  );
  const { data: invoices, isLoading: invoicesLoading } = trpc.stripe.getInvoices.useQuery(
    undefined,
    { enabled: !!user }
  );
  const { data: subDetails } = trpc.stripe.getSubscriptionDetails.useQuery(
    undefined,
    { enabled: !!user }
  );

  const createPortal = trpc.stripe.createPortalSession.useMutation();

  async function handleOpenPortal() {
    setPortalLoading(true);
    try {
      const result = await createPortal.mutateAsync();
      if (result.url) window.open(result.url, "_blank");
    } catch {
      alert("Erro ao abrir o portal de assinatura. Tente novamente.");
    } finally {
      setPortalLoading(false);
    }
  }

  const plan = (status?.plan ?? "FREE") as string;
  const isFree = plan === "FREE";
  const isTrial = status?.status === "trial";

  const agendamentosPercent = status?.usage?.agendamentosPercent ?? 0;
  const agendamentosCount = status?.usage?.agendamentosCount ?? 0;
  const agendamentosLimit = status?.usage?.agendamentosLimit ?? 15;
  const limitIsInfinite = agendamentosLimit === -1;

  const trialDaysLeft = status?.trialEnd
    ? Math.max(0, Math.ceil((new Date(status.trialEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Minha Assinatura</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Gerencie seu plano, visualize faturas e acompanhe o uso da plataforma.
        </p>
      </div>

      {/* Status do Plano */}
      <div className="rounded-2xl border bg-card p-6 space-y-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl bg-muted ${PLAN_COLORS[plan]}`}>
              {PLAN_ICONS[plan]}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold">Plano {PLAN_LABELS[plan]}</span>
                {status?.status && <StatusBadge status={status.status} />}
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                {isTrial && trialDaysLeft !== null
                  ? `Período de teste: ${trialDaysLeft} dia${trialDaysLeft !== 1 ? "s" : ""} restante${trialDaysLeft !== 1 ? "s" : ""}`
                  : isFree
                  ? "Plano gratuito — sem cobrança"
                  : status?.billingCycle === "annual"
                  ? "Cobrança anual"
                  : "Cobrança mensal"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {!isFree && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenPortal}
                disabled={portalLoading}
              >
                <CreditCard className="w-4 h-4 mr-1.5" />
                {portalLoading ? "Abrindo..." : "Gerenciar no Stripe"}
              </Button>
            )}
            <Button asChild size="sm">
              <Link href="/admin/planos">
                <ArrowUpRight className="w-4 h-4 mr-1.5" />
                {isFree ? "Fazer upgrade" : "Ver planos"}
              </Link>
            </Button>
          </div>
        </div>

        <Separator />

        {/* Detalhes da assinatura */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground text-xs mb-1">Próxima cobrança</p>
            <p className="font-medium flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
              {subDetails?.proximaCobranca
                ? formatDate(subDetails.proximaCobranca)
                : status?.currentPeriodEnd
                ? formatDate(status.currentPeriodEnd)
                : isFree ? "Sem cobrança" : "-"}
            </p>
          </div>

          <div>
            <p className="text-muted-foreground text-xs mb-1">Valor</p>
            <p className="font-medium">
              {subDetails?.valorMensal
                ? `${formatCurrency(subDetails.valorMensal)}/${subDetails.intervalo === "year" ? "ano" : "mês"}`
                : isFree ? "R$ 0,00" : "-"}
            </p>
          </div>

          <div>
            <p className="text-muted-foreground text-xs mb-1">Método de pagamento</p>
            {subDetails?.metodoPagamento?.ultimos4 ? (
              <p className="font-medium flex items-center gap-1.5">
                <CardBrandIcon brand={subDetails.metodoPagamento.bandeira} />
                •••• {subDetails.metodoPagamento.ultimos4}
              </p>
            ) : (
              <p className="font-medium text-muted-foreground">{isFree ? "—" : "Não configurado"}</p>
            )}
          </div>

          <div>
            <p className="text-muted-foreground text-xs mb-1">Cancelamento</p>
            <p className="font-medium">
              {subDetails?.cancelarAoFinal
                ? `Cancela em ${formatDate(subDetails.cancelarEm)}`
                : isFree ? "—" : "Renovação automática"}
            </p>
          </div>
        </div>

        {/* Alerta de cancelamento */}
        {subDetails?.cancelarAoFinal && (
          <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-sm">
            <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-amber-600 dark:text-amber-400">Assinatura será cancelada</p>
              <p className="text-muted-foreground mt-0.5">
                Seu plano permanece ativo até {formatDate(subDetails.cancelarEm)}. Após essa data, você será migrado para o plano Free.
              </p>
              <Button variant="link" className="p-0 h-auto text-amber-600 dark:text-amber-400 mt-1 text-xs" onClick={handleOpenPortal}>
                Reativar assinatura →
              </Button>
            </div>
          </div>
        )}

        {/* Alerta de pagamento pendente */}
        {status?.status === "past_due" && (
          <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-sm">
            <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-red-600 dark:text-red-400">Pagamento pendente</p>
              <p className="text-muted-foreground mt-0.5">
                Há uma fatura em aberto. Atualize seu método de pagamento para manter o acesso.
              </p>
              <Button variant="link" className="p-0 h-auto text-red-600 dark:text-red-400 mt-1 text-xs" onClick={handleOpenPortal}>
                Atualizar pagamento →
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Uso do plano */}
      <div className="rounded-2xl border bg-card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-muted-foreground" />
          <h2 className="font-semibold">Uso do plano</h2>
          <Badge variant="outline" className="text-xs ml-auto">
            {new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
          </Badge>
        </div>

        <div className="space-y-4">
          {/* Agendamentos */}
          <div>
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-muted-foreground">Agendamentos este mês</span>
              <span className="font-medium">
                {agendamentosCount}
                {!limitIsInfinite && (
                  <span className="text-muted-foreground font-normal"> / {agendamentosLimit}</span>
                )}
              </span>
            </div>
            {!limitIsInfinite ? (
              <Progress
                value={agendamentosPercent}
                className={`h-2 ${agendamentosPercent >= 90 ? "[&>div]:bg-red-500" : agendamentosPercent >= 70 ? "[&>div]:bg-amber-500" : ""}`}
              />
            ) : (
              <div className="h-2 rounded-full bg-primary/20 flex items-center px-2">
                <span className="text-[10px] text-primary font-medium">Ilimitados</span>
              </div>
            )}
            {!limitIsInfinite && agendamentosPercent >= 80 && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1.5 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                {agendamentosPercent >= 100
                  ? "Limite atingido. Faça upgrade para continuar agendando."
                  : `${Math.round(100 - agendamentosPercent)}% do limite restante.`}
              </p>
            )}
          </div>

          {/* Limites do plano */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
            {[
              { label: "Profissionais", value: status?.limits?.profissionais === -1 ? "Ilimitados" : String(status?.limits?.profissionais ?? 1) },
              { label: "Clientes", value: status?.limits?.clientes === -1 ? "Ilimitados" : String(status?.limits?.clientes ?? 50) },
              { label: "WhatsApp/mês", value: status?.limits?.notificacoesWhatsappMes === -1 ? "Ilimitados" : String(status?.limits?.notificacoesWhatsappMes ?? 10) },
            ].map((item) => (
              <div key={item.label} className="bg-muted/50 rounded-xl p-3">
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className="font-semibold text-sm mt-0.5">{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        {isFree && (
          <div className="pt-2">
            <Button asChild size="sm" className="w-full sm:w-auto">
              <Link href="/admin/planos">
                <ArrowUpRight className="w-4 h-4 mr-1.5" />
                Fazer upgrade para aumentar os limites
              </Link>
            </Button>
          </div>
        )}
      </div>

      {/* Histórico de faturas */}
      <div className="rounded-2xl border bg-card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-muted-foreground" />
          <h2 className="font-semibold">Histórico de faturas</h2>
        </div>

        {statusLoading || invoicesLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : !invoices || invoices.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Nenhuma fatura encontrada.</p>
            {isFree && (
              <p className="text-xs mt-1">As faturas aparecerão aqui após a primeira assinatura.</p>
            )}
          </div>
        ) : (
          <div className="divide-y divide-border -mx-1">
            {invoices.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between gap-4 py-3.5 px-1">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">
                      {formatDate(inv.criadoEm)}
                    </span>
                    <InvoiceStatusBadge status={inv.status} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {inv.descricao ?? `Período: ${formatDate(inv.periodoInicio)} – ${formatDate(inv.periodoFim)}`}
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-sm font-semibold">
                    {formatCurrency(inv.valorPago > 0 ? inv.valorPago : inv.valorDevido)}
                  </span>
                  <div className="flex items-center gap-1">
                    {inv.urlFatura && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        asChild
                        title="Ver fatura"
                      >
                        <a href={inv.urlFatura} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </Button>
                    )}
                    {inv.urlPdf && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        asChild
                        title="Baixar PDF"
                      >
                        <a href={inv.urlPdf} target="_blank" rel="noopener noreferrer">
                          <Download className="w-3.5 h-3.5" />
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Ações rápidas */}
      {!isFree && (
        <div className="rounded-2xl border bg-card p-6 space-y-3">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Ações</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button variant="outline" className="justify-start" onClick={handleOpenPortal} disabled={portalLoading}>
              <CreditCard className="w-4 h-4 mr-2" />
              Atualizar método de pagamento
            </Button>
            <Button variant="outline" className="justify-start" onClick={handleOpenPortal} disabled={portalLoading}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Alterar plano ou ciclo de cobrança
            </Button>
            <Button asChild variant="outline" className="justify-start">
              <Link href="/admin/planos">
                <ArrowUpRight className="w-4 h-4 mr-2" />
                Ver todos os planos disponíveis
              </Link>
            </Button>
            <Button variant="outline" className="justify-start text-destructive hover:text-destructive" onClick={handleOpenPortal} disabled={portalLoading}>
              <XCircle className="w-4 h-4 mr-2" />
              Cancelar assinatura
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
