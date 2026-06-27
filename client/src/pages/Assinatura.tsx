import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { usePermissoes } from "@/hooks/usePermissoes";
import { toast } from "sonner";
import { Link } from "wouter";
import {
  CreditCard, Calendar, CheckCircle2, AlertTriangle, XCircle,
  Clock, FileText, ExternalLink, Download, ArrowUpRight, ArrowLeftRight,
  Shield, Zap, RefreshCw, ChevronRight, Gem, Loader2, Bell, BellRing,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(value: number, currency = "BRL") {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(value);
}

function formatDate(date: Date | string | null | undefined) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

function formatDateShort(date: Date | string | null | undefined) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function getStatusConfig(status: string | null | undefined, daysLeft?: number | null) {
  switch (status) {
    case "active":
      return { label: "Ativa", color: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: CheckCircle2, dot: "bg-emerald-500" };
    case "trial":
    case "trialing": {
      const urgent = daysLeft !== null && daysLeft !== undefined && daysLeft <= 2;
      return {
        label: daysLeft !== null && daysLeft !== undefined ? `Trial · ${daysLeft} dia${daysLeft !== 1 ? "s" : ""} restante${daysLeft !== 1 ? "s" : ""}` : "Trial",
        color: urgent ? "bg-red-100 text-red-700 border-red-200" : "bg-amber-100 text-amber-700 border-amber-200",
        icon: Clock,
        dot: urgent ? "bg-red-500" : "bg-amber-500"
      };
    }
    case "past_due":
      return { label: "Pagamento pendente", color: "bg-amber-100 text-amber-700 border-amber-200", icon: AlertTriangle, dot: "bg-amber-500" };
    case "canceled":
      return { label: "Cancelada", color: "bg-red-100 text-red-700 border-red-200", icon: XCircle, dot: "bg-red-500" };
    case "unpaid":
      return { label: "Inadimplente", color: "bg-red-100 text-red-700 border-red-200", icon: XCircle, dot: "bg-red-500" };
    case "suspended":
      return { label: "Conta suspensa", color: "bg-amber-100 text-amber-700 border-amber-200", icon: AlertTriangle, dot: "bg-amber-500" };
    default:
      return { label: "Plano Free", color: "bg-stone-100 text-slate-600 border-slate-200", icon: Shield, dot: "bg-slate-400" };
  }
}

function getInvoiceStatusConfig(status: string | null | undefined) {
  switch (status) {
    case "paid":
      return { label: "Paga", color: "bg-emerald-100 text-emerald-700" };
    case "open":
      return { label: "Em aberto", color: "bg-amber-100 text-amber-700" };
    case "void":
      return { label: "Cancelada", color: "bg-stone-100 text-slate-500" };
    case "uncollectible":
      return { label: "Inadimplente", color: "bg-red-100 text-red-700" };
    default:
      return { label: status ?? "—", color: "bg-stone-100 text-slate-500" };
  }
}

function getBandeiraIcon(bandeira: string | null | undefined) {
  const b = (bandeira ?? "").toLowerCase();
  if (b === "visa") return "💳 Visa";
  if (b === "mastercard") return "💳 Mastercard";
  if (b === "amex") return "💳 Amex";
  if (b === "elo") return "💳 Elo";
  return "💳 Cartão";
}

function getPlanColor(plan: string | null | undefined) {
  switch (plan) {
    case "SOLO": return "from-blue-500 to-blue-600";
    case "PLUS": return "from-violet-500 to-violet-600";
    case "PRO": return "from-amber-500 to-amber-600";
    default: return "from-slate-400 to-slate-500";
  }
}

// ─── Componente Principal ─────────────────────────────────────────────────────

export default function Assinatura() {
  const { isAdmin } = usePermissoes();
  const [loadingPortal, setLoadingPortal] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  const { data: planStatus, isLoading: loadingPlan } = trpc.planos.getStatus.useQuery();
  const { data: subDetails, isLoading: loadingSub } = trpc.stripe.getSubscriptionDetails.useQuery();
  const { data: invoices, isLoading: loadingInvoices } = trpc.stripe.getInvoices.useQuery();

  const portalMutation = trpc.stripe.createPortalSession.useMutation({
    onSuccess: ({ url }) => {
      if (url) window.open(url, "_blank");
      setLoadingPortal(false);
    },
    onError: (e) => {
      toast.error(e.message || "Erro ao acessar o portal de assinatura");
      setLoadingPortal(false);
    },
  });

  const handlePortal = () => {
    setLoadingPortal(true);
    portalMutation.mutate();
  };

  const handleCancelConfirm = () => {
    setShowCancelDialog(false);
    handlePortal();
  };

  const plan = planStatus?.plan ?? "SOLO";
  const planLabel = planStatus?.planLabel ?? "Solo";
  const isOnTrial = planStatus?.status === "trial";
  const isCanceled = planStatus?.status === "canceled";
  const isSuspended = planStatus?.status === "suspended";
  const trialDaysLeft = isOnTrial && planStatus?.trialEnd
    ? Math.max(0, Math.ceil((new Date(planStatus.trialEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;
  const statusConfig = getStatusConfig(planStatus?.status, trialDaysLeft);
  const StatusIcon = statusConfig.icon;
  const planGradient = isOnTrial ? "from-amber-400 to-orange-500" : getPlanColor(plan);
  const displayLabel = isOnTrial ? "Trial Gratuito" : planLabel;

  const isLoading = loadingPlan || loadingSub;

  // Calcular dias para renovação
  const renovacaoDate = isOnTrial
    ? (planStatus?.trialEnd ?? null)
    : (subDetails?.proximaCobranca ?? planStatus?.currentPeriodEnd);
  const diasParaRenovacao = renovacaoDate
    ? Math.ceil((new Date(renovacaoDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;
  const renovacaoProxima = diasParaRenovacao !== null && diasParaRenovacao >= 0 && diasParaRenovacao <= 3 && true;

  // Guarda: apenas administradores podem acessar
  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center p-8">
        <Shield className="w-12 h-12 text-muted-foreground/30" />
        <p className="text-sm font-medium text-muted-foreground">Apenas administradores podem acessar a assinatura.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 lg:p-6 max-w-5xl">
      {/* ── Cabeçalho ── */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Assinatura</h1>
          <p className="text-sm text-slate-500 mt-0.5">Gerencie seu plano, pagamentos e histórico de faturas</p>
        </div>
        <div className="flex gap-2">
              {(!isSuspended) && (
            <Button
              onClick={handlePortal}
              disabled={loadingPortal}
              className="gap-2 text-sm bg-violet-600 hover:bg-violet-700"
            >
              {loadingPortal ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <ExternalLink className="w-4 h-4" />
              )}
              Portal do cliente
            </Button>
          )}
        </div>
      </div>

      {/* ── Banner de renovação próxima ── */}
      {!isLoading && renovacaoProxima && (
        <div className={`flex items-start gap-3 rounded-2xl border px-5 py-4 ${
          planStatus?.cancelAtPeriodEnd
            ? "bg-red-50 border-red-200"
            : diasParaRenovacao === 1
              ? "bg-amber-50 border-amber-200"
              : "bg-violet-50 border-violet-200"
        }`}>
          <div className={`mt-0.5 shrink-0 ${
            planStatus?.cancelAtPeriodEnd ? "text-red-500" : diasParaRenovacao === 1 ? "text-amber-500" : "text-violet-500"
          }`}>
            <BellRing className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-semibold ${
              planStatus?.cancelAtPeriodEnd ? "text-red-800" : diasParaRenovacao === 1 ? "text-amber-800" : "text-violet-800"
            }`}>
              {planStatus?.cancelAtPeriodEnd
                ? `Assinatura expira em ${diasParaRenovacao} dia${diasParaRenovacao !== 1 ? "s" : ""}`
                : `Renovação automática em ${diasParaRenovacao} dia${diasParaRenovacao !== 1 ? "s" : ""}`
              }
            </p>
            <p className={`text-xs mt-0.5 ${
              planStatus?.cancelAtPeriodEnd ? "text-red-600" : diasParaRenovacao === 1 ? "text-amber-600" : "text-violet-600"
            }`}>
              {planStatus?.cancelAtPeriodEnd
                ? `Sua assinatura ${planLabel} será cancelada em ${formatDate(renovacaoDate)}. Reative agora para não perder o acesso.`
                : `Sua assinatura ${planLabel} será renovada automaticamente em ${formatDate(renovacaoDate)}.`
              }
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handlePortal}
            disabled={loadingPortal}
            className={`shrink-0 text-xs gap-1.5 ${
              planStatus?.cancelAtPeriodEnd
                ? "border-red-300 text-red-700 hover:bg-red-100"
                : diasParaRenovacao === 1
                  ? "border-amber-300 text-amber-700 hover:bg-amber-100"
                  : "border-violet-300 text-violet-700 hover:bg-violet-100"
            }`}
          >
            {loadingPortal ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ExternalLink className="w-3.5 h-3.5" />}
            Gerenciar
          </Button>
        </div>
      )}

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-36 rounded-2xl bg-stone-100 animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {/* ── Cards de Status ── */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Card: Plano atual */}
            <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${planGradient} p-5 text-white shadow-sm`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-white/70 uppercase tracking-wide">
                    {isOnTrial ? "Período de teste" : "Plano atual"}
                  </p>
                  <p className="text-2xl font-bold mt-1">{displayLabel}</p>
                  {isOnTrial && trialDaysLeft !== null ? (
                    <p className="text-xs text-white/90 mt-0.5 font-medium">
                      {trialDaysLeft === 0 ? "Expira hoje!" : `${trialDaysLeft} dia${trialDaysLeft !== 1 ? "s" : ""} restante${trialDaysLeft !== 1 ? "s" : ""}`}
                    </p>
                  ) : planStatus?.billingCycle && true ? (
                    <p className="text-xs text-white/70 mt-0.5">
                      {planStatus.billingCycle === "annual" ? "Cobrança anual" : "Cobrança mensal"}
                    </p>
                  ) : null}
                </div>
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                  {isOnTrial ? <Clock className="w-5 h-5 text-white" /> : <Gem className="w-5 h-5 text-white" />}
                </div>
              </div>
              <div className="mt-4">
                <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-white/20 text-white`}>
                  <span className={`w-1.5 h-1.5 rounded-full bg-white`} />
                  {statusConfig.label}
                </span>
              </div>
              {isOnTrial && (
                <div className="mt-3 text-xs text-white/80">
                  Após o trial, assine um plano para continuar usando o Hubly.
                </div>
              )}
              {isSuspended && (
                <div className="mt-3 text-xs text-white/80">
                  Seus dados estão preservados. Assine para continuar.
                </div>
              )}
            </div>

            {/* Card: Próxima cobrança / Trial expira */}
            <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                    {isOnTrial ? "Trial expira em" : planStatus?.cancelAtPeriodEnd ? "Acesso até" : "Próxima cobrança"}
                  </p>
                  <p className="text-xl font-bold text-slate-800 mt-1">
                    {isOnTrial && planStatus?.trialEnd
                      ? formatDate(planStatus.trialEnd)
                      : subDetails?.proximaCobranca
                        ? formatDate(subDetails.proximaCobranca)
                        : planStatus?.currentPeriodEnd
                          ? formatDate(planStatus.currentPeriodEnd)
                          : "—"}
                  </p>
                  {subDetails?.valorMensal && (
                    <p className="text-sm text-slate-500 mt-0.5">
                      {formatCurrency(subDetails.valorMensal)}
                      {subDetails.intervalo === "year" ? "/ano" : "/mês"}
                    </p>
                  )}
                </div>
                <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-violet-500" />
                </div>
              </div>
              {planStatus?.cancelAtPeriodEnd && (
                <div className="mt-3 flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 rounded-lg px-2.5 py-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Cancelamento agendado
                </div>
              )}
            </div>

            {/* Card: Método de pagamento */}
            <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Pagamento</p>
                  {subDetails?.metodoPagamento ? (
                    <>
                      <p className="text-lg font-bold text-slate-800 mt-1">
                        {getBandeiraIcon(subDetails.metodoPagamento.bandeira)}
                      </p>
                      <p className="text-sm text-slate-500 mt-0.5">
                        •••• {subDetails.metodoPagamento.ultimos4}
                        {subDetails.metodoPagamento.expMes && (
                          <span className="ml-2 text-xs text-slate-400">
                            {String(subDetails.metodoPagamento.expMes).padStart(2, "0")}/{subDetails.metodoPagamento.expAno}
                          </span>
                        )}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-slate-400 mt-1">
                      {"Nenhum cadastrado"}
                    </p>
                  )}
                </div>
                <div className="w-10 h-10 rounded-xl bg-stone-50 flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-slate-400" />
                </div>
              </div>
              {(!isSuspended) && (
                <button
                  onClick={handlePortal}
                  disabled={loadingPortal}
                  className="mt-3 text-xs text-violet-600 hover:text-violet-700 font-medium flex items-center gap-1"
                >
                  Alterar cartão <ChevronRight className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* ── Alerta de cancelamento ── */}
          {planStatus?.cancelAtPeriodEnd && (
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-amber-800">Assinatura com cancelamento agendado</p>
                <p className="text-sm text-amber-700 mt-0.5">
                  Sua assinatura será cancelada em{" "}
                  <strong>{formatDate(subDetails?.cancelarEm ?? planStatus.currentPeriodEnd)}</strong>.
                  Você continuará com acesso até essa data.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handlePortal}
                disabled={loadingPortal}
                className="shrink-0 gap-2 border-amber-300 text-amber-700 hover:bg-amber-100"
              >
                {loadingPortal && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {loadingPortal ? "Aguarde..." : "Reativar"}
              </Button>
            </div>
          )}


          {/* ── Assinatura cancelada: CTA de reativação ── */}
          {isCanceled && (
            <div className="rounded-2xl bg-gradient-to-br from-red-50 to-rose-50 border border-red-200 p-6 flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center">
                  <XCircle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <p className="font-semibold text-slate-800">Sua assinatura foi cancelada</p>
                  <p className="text-sm text-slate-500 mt-0.5">Novos cadastros estão bloqueados. Reative agora para voltar a usar todos os recursos.</p>
                </div>
              </div>
              <Link href="/admin/planos">
                <Button className="gap-2 bg-red-600 hover:bg-red-700 shrink-0">
                  Reativar assinatura <ArrowUpRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          )}

          {/* ── Conta suspensa: CTA de upgrade ── */}
          {isSuspended && (
            <div className="rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 p-6 flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <p className="font-semibold text-slate-800">Seu período de teste encerrou</p>
                  <p className="text-sm text-slate-500 mt-0.5">Seus dados estão preservados. Assine um plano para criar novos agendamentos, clientes e profissionais.</p>
                </div>
              </div>
              <Link href="/admin/planos">
                <Button className="gap-2 bg-amber-600 hover:bg-amber-700 shrink-0">
                  Escolher um plano <ArrowUpRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          )}



          {/* ── Detalhes da assinatura ── */}
          {subDetails && subDetails.stripeSubId && (
            <div className="rounded-2xl bg-white border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <h2 className="font-semibold text-slate-800">Detalhes da assinatura</h2>
              </div>
              <div className="divide-y divide-slate-50">
                <div className="px-5 py-3.5 flex items-center justify-between">
                  <span className="text-sm text-slate-500">Status</span>
                  <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${statusConfig.color}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot}`} />
                    {statusConfig.label}
                  </span>
                </div>
                <div className="px-5 py-3.5 flex items-center justify-between">
                  <span className="text-sm text-slate-500">Início do período atual</span>
                  <span className="text-sm font-medium text-slate-700">{formatDate(subDetails.inicioPerioodo)}</span>
                </div>
                <div className="px-5 py-3.5 flex items-center justify-between">
                  <span className="text-sm text-slate-500">Fim do período atual</span>
                  <span className="text-sm font-medium text-slate-700">{formatDate(subDetails.proximaCobranca)}</span>
                </div>
                <div className="px-5 py-3.5 flex items-center justify-between">
                  <span className="text-sm text-slate-500">Ciclo de cobrança</span>
                  <span className="text-sm font-medium text-slate-700">
                    {subDetails.intervalo === "year" ? "Anual" : "Mensal"}
                  </span>
                </div>
                {subDetails.valorMensal && (
                  <div className="px-5 py-3.5 flex items-center justify-between">
                    <span className="text-sm text-slate-500">Valor</span>
                    <span className="text-sm font-bold text-slate-800">
                      {formatCurrency(subDetails.valorMensal)}
                      {subDetails.intervalo === "year" ? "/ano" : "/mês"}
                    </span>
                  </div>
                )}
                <div className="px-5 py-3.5 flex items-center justify-between">
                  <span className="text-sm text-slate-500">ID da assinatura</span>
                  <span className="text-xs font-mono text-slate-400">{subDetails.stripeSubId}</span>
                </div>
              </div>
              <div className="px-5 py-4 bg-stone-50 flex gap-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePortal}
                  disabled={loadingPortal}
                  className="gap-2 text-sm"
                >
                  {loadingPortal ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <ExternalLink className="w-3.5 h-3.5" />
                  )}
                  {loadingPortal ? "Aguarde..." : "Gerenciar no Stripe"}
                </Button>
                {!planStatus?.cancelAtPeriodEnd && !isSuspended && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCancelDialog(true)}
                    disabled={loadingPortal}
                    className="gap-2 text-sm text-red-600 border-red-200 hover:bg-red-50"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    Cancelar assinatura
                  </Button>
                )}
                {!planStatus?.cancelAtPeriodEnd && (
                  <Link href="/admin/planos">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 text-sm text-violet-600 border-violet-200 hover:bg-violet-50"
                    >
                      <ArrowLeftRight className="w-3.5 h-3.5" />
                      Alterar assinatura
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          )}

          {/* ── Histórico de faturas ── */}
          <div className="rounded-2xl bg-white border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-400" />
                <h2 className="font-semibold text-slate-800">Histórico de faturas</h2>
              </div>
              {invoices && invoices.length > 0 && (
                <span className="text-xs text-slate-400">{invoices.length} fatura{invoices.length !== 1 ? "s" : ""}</span>
              )}
            </div>

            {loadingInvoices ? (
              <div className="p-8 text-center text-slate-400 text-sm">Carregando faturas...</div>
            ) : !invoices || invoices.length === 0 ? (
              <div className="p-10 text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-stone-50 flex items-center justify-center mx-auto">
                  <FileText className="w-6 h-6 text-slate-300" />
                </div>
                <p className="text-slate-500 font-medium text-sm">Nenhuma fatura encontrada</p>
                <p className="text-xs text-slate-400">
                  {false
                    ? "As faturas aparecerão aqui após o primeiro pagamento"
                    : "As faturas aparecerão aqui após o primeiro pagamento"}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {invoices.map((inv) => {
                  const invStatus = getInvoiceStatusConfig(inv.status);
                  return (
                    <div key={inv.id} className="px-5 py-4 flex items-center gap-4 hover:bg-stone-50 transition-colors">
                      <div className="w-9 h-9 rounded-xl bg-stone-100 flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4 text-slate-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium text-slate-700 truncate">
                            {inv.descricao ?? `Fatura ${inv.numero ?? inv.id.slice(-8)}`}
                          </p>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${invStatus.color}`}>
                            {invStatus.label}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {formatDateShort(inv.criadoEm)} · {formatDateShort(inv.periodoInicio)} – {formatDateShort(inv.periodoFim)}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-slate-800">
                          {formatCurrency(inv.valorPago > 0 ? inv.valorPago : inv.valorDevido, inv.moeda)}
                        </p>
                        <div className="flex items-center gap-1 mt-1 justify-end">
                          {inv.urlFatura && (
                            <a
                              href={inv.urlFatura}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-violet-600 hover:text-violet-700 flex items-center gap-0.5"
                            >
                              Ver <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                          {inv.urlPdf && (
                            <a
                              href={inv.urlPdf}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-0.5 ml-2"
                            >
                              PDF <Download className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Diálogo de confirmação de cancelamento ── */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="w-5 h-5" />
              Cancelar assinatura
            </DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-3 text-sm text-slate-600 mt-2">
                <p>
                  Ao cancelar, sua assinatura <strong>{planLabel}</strong> permanece ativa até o fim do período atual. Após isso:
                </p>
                <ul className="space-y-2 pl-1">
                  {[
                    "Não será possível criar novos agendamentos",
                    "Não será possível cadastrar novos clientes",
                    "Não será possível adicionar profissionais",
                    "Não será possível lançar contas a pagar ou receber",
                    "Os dados existentes serão mantidos",
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className={`mt-0.5 w-4 h-4 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold ${
                        i === 4 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
                      }`}>{i === 4 ? "✓" : "✕"}</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-slate-400">
                  Você será redirecionado ao portal do Stripe para confirmar o cancelamento.
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 flex-col sm:flex-row">
            <Button variant="outline" onClick={() => setShowCancelDialog(false)} className="flex-1">
              Manter assinatura
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelConfirm}
              disabled={loadingPortal}
              className="flex-1 gap-2"
            >
              {loadingPortal && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {loadingPortal ? "Aguarde..." : "Confirmar cancelamento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
