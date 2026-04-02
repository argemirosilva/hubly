import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Link } from "wouter";
import {
  CreditCard, Calendar, CheckCircle2, AlertTriangle, XCircle,
  Clock, FileText, ExternalLink, Download, ArrowUpRight,
  Shield, Zap, RefreshCw, ChevronRight, Gem,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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

function getStatusConfig(status: string | null | undefined) {
  switch (status) {
    case "active":
      return { label: "Ativa", color: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: CheckCircle2, dot: "bg-emerald-500" };
    case "trialing":
      return { label: "Trial", color: "bg-blue-100 text-blue-700 border-blue-200", icon: Clock, dot: "bg-blue-500" };
    case "past_due":
      return { label: "Pagamento pendente", color: "bg-amber-100 text-amber-700 border-amber-200", icon: AlertTriangle, dot: "bg-amber-500" };
    case "canceled":
      return { label: "Cancelada", color: "bg-red-100 text-red-700 border-red-200", icon: XCircle, dot: "bg-red-500" };
    case "unpaid":
      return { label: "Inadimplente", color: "bg-red-100 text-red-700 border-red-200", icon: XCircle, dot: "bg-red-500" };
    default:
      return { label: "Plano Free", color: "bg-slate-100 text-slate-600 border-slate-200", icon: Shield, dot: "bg-slate-400" };
  }
}

function getInvoiceStatusConfig(status: string | null | undefined) {
  switch (status) {
    case "paid":
      return { label: "Paga", color: "bg-emerald-100 text-emerald-700" };
    case "open":
      return { label: "Em aberto", color: "bg-amber-100 text-amber-700" };
    case "void":
      return { label: "Cancelada", color: "bg-slate-100 text-slate-500" };
    case "uncollectible":
      return { label: "Inadimplente", color: "bg-red-100 text-red-700" };
    default:
      return { label: status ?? "—", color: "bg-slate-100 text-slate-500" };
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
  const [loadingPortal, setLoadingPortal] = useState(false);

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

  const plan = planStatus?.plan ?? "FREE";
  const planLabel = planStatus?.planLabel ?? "Free";
  const statusConfig = getStatusConfig(planStatus?.status);
  const StatusIcon = statusConfig.icon;
  const planGradient = getPlanColor(plan);

  const isLoading = loadingPlan || loadingSub;

  return (
    <div className="space-y-6 p-4 lg:p-6 max-w-5xl">
      {/* ── Cabeçalho ── */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Minha Assinatura</h1>
          <p className="text-sm text-slate-500 mt-0.5">Gerencie seu plano, pagamentos e histórico de faturas</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/planos">
            <Button variant="outline" className="gap-2 text-sm">
              <Gem className="w-4 h-4" /> Ver planos
            </Button>
          </Link>
          {plan !== "FREE" && (
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

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-36 rounded-2xl bg-slate-100 animate-pulse" />
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
                  <p className="text-xs font-medium text-white/70 uppercase tracking-wide">Plano atual</p>
                  <p className="text-2xl font-bold mt-1">{planLabel}</p>
                  {planStatus?.billingCycle && plan !== "FREE" && (
                    <p className="text-xs text-white/70 mt-0.5">
                      {planStatus.billingCycle === "annual" ? "Cobrança anual" : "Cobrança mensal"}
                    </p>
                  )}
                </div>
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                  <Gem className="w-5 h-5 text-white" />
                </div>
              </div>
              <div className="mt-4">
                <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-white/20 text-white`}>
                  <span className={`w-1.5 h-1.5 rounded-full bg-white`} />
                  {statusConfig.label}
                </span>
              </div>
            </div>

            {/* Card: Próxima cobrança */}
            <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                    {planStatus?.cancelAtPeriodEnd ? "Acesso até" : "Próxima cobrança"}
                  </p>
                  <p className="text-xl font-bold text-slate-800 mt-1">
                    {subDetails?.proximaCobranca
                      ? formatDate(subDetails.proximaCobranca)
                      : planStatus?.currentPeriodEnd
                        ? formatDate(planStatus.currentPeriodEnd)
                        : plan === "FREE" ? "Plano gratuito" : "—"}
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
                      {plan === "FREE" ? "Sem cobrança" : "Nenhum cadastrado"}
                    </p>
                  )}
                </div>
                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-slate-400" />
                </div>
              </div>
              {plan !== "FREE" && (
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
                className="shrink-0 border-amber-300 text-amber-700 hover:bg-amber-100"
              >
                Reativar
              </Button>
            </div>
          )}

          {/* ── Plano Free: CTA de upgrade ── */}
          {plan === "FREE" && (
            <div className="rounded-2xl bg-gradient-to-br from-violet-50 to-blue-50 border border-violet-100 p-6 flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-violet-100 flex items-center justify-center">
                  <Zap className="w-6 h-6 text-violet-600" />
                </div>
                <div>
                  <p className="font-semibold text-slate-800">Você está no plano gratuito</p>
                  <p className="text-sm text-slate-500 mt-0.5">Faça upgrade para desbloquear agendamentos ilimitados, WhatsApp e IA</p>
                </div>
              </div>
              <Link href="/admin/planos">
                <Button className="gap-2 bg-violet-600 hover:bg-violet-700 shrink-0">
                  Ver planos <ArrowUpRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          )}

          {/* ── Detalhes da assinatura ── */}
          {subDetails && (
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
              <div className="px-5 py-4 bg-slate-50 flex gap-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePortal}
                  disabled={loadingPortal}
                  className="gap-2 text-sm"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Gerenciar no Stripe
                </Button>
                {!planStatus?.cancelAtPeriodEnd && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePortal}
                    disabled={loadingPortal}
                    className="gap-2 text-sm text-red-600 border-red-200 hover:bg-red-50"
                  >
                    Cancelar assinatura
                  </Button>
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
                <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto">
                  <FileText className="w-6 h-6 text-slate-300" />
                </div>
                <p className="text-slate-500 font-medium text-sm">Nenhuma fatura encontrada</p>
                <p className="text-xs text-slate-400">
                  {plan === "FREE"
                    ? "Faça upgrade para um plano pago para ver seu histórico de faturas"
                    : "As faturas aparecerão aqui após o primeiro pagamento"}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {invoices.map((inv) => {
                  const invStatus = getInvoiceStatusConfig(inv.status);
                  return (
                    <div key={inv.id} className="px-5 py-4 flex items-center gap-4 hover:bg-slate-50 transition-colors">
                      <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
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
    </div>
  );
}
