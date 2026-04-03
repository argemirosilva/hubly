import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { usePermissoes } from "@/hooks/usePermissoes";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Check, Zap, Users, Brain, MessageCircle, BarChart3, Package,
  Globe, Sparkles, Crown, Star, ArrowRight, Loader2
} from "lucide-react";

// ─── Dados dos planos ─────────────────────────────────────────────────────────
const PLANOS = [
  {
    key: "SOLO" as const,
    label: "Hubly Solo",
    icon: Star,
    color: "from-blue-500 to-blue-600",
    colorLight: "bg-blue-50 text-blue-700 border-blue-200",
    colorBorder: "border-blue-500",
    colorBadge: "bg-blue-100 text-blue-700",
    monthly: 49.00,
    annual: 40.83,
    annualTotal: 490.00,
    descricao: "Para profissionais autônomos",
    destaque: false,
    features: [
      { icon: Users, text: "1 profissional" },
      { icon: Zap, text: "Agendamentos ilimitados" },
      { icon: Globe, text: "Portal de agendamento online" },
      { icon: Package, text: "Pacotes de serviços" },
      { icon: BarChart3, text: "Relatórios avançados" },
      { icon: Sparkles, text: "IA Marketing" },
      { icon: MessageCircle, text: "100 notificações WhatsApp/mês" },
    ],
    naoInclui: ["IA Financeira", "IA Clientes", "Múltiplos caixas"],
  },
  {
    key: "PLUS" as const,
    label: "Hubly Plus",
    icon: Zap,
    color: "from-violet-500 to-violet-600",
    colorLight: "bg-violet-50 text-violet-700 border-violet-200",
    colorBorder: "border-violet-500",
    colorBadge: "bg-violet-100 text-violet-700",
    monthly: 149.00,
    annual: 124.17,
    annualTotal: 1490.00,
    descricao: "Para salões com pequena equipe",
    destaque: true,
    features: [
      { icon: Users, text: "Até 5 profissionais" },
      { icon: Zap, text: "Agendamentos ilimitados" },
      { icon: Globe, text: "Portal de agendamento online" },
      { icon: Package, text: "Pacotes de serviços" },
      { icon: BarChart3, text: "Relatórios avançados" },
      { icon: Sparkles, text: "IA Marketing" },
      { icon: Brain, text: "IA Financeira" },
      { icon: MessageCircle, text: "400 notificações WhatsApp/mês" },
    ],
    naoInclui: ["IA Clientes"],
  },
  {
    key: "PRO" as const,
    label: "Hubly Pro",
    icon: Crown,
    color: "from-amber-500 to-orange-500",
    colorLight: "bg-amber-50 text-amber-700 border-amber-200",
    colorBorder: "border-amber-500",
    colorBadge: "bg-amber-100 text-amber-700",
    monthly: 299.00,
    annual: 249.17,
    annualTotal: 2990.00,
    descricao: "Para redes e empresas em crescimento",
    destaque: false,
    features: [
      { icon: Users, text: "Até 20 profissionais" },
      { icon: Zap, text: "Agendamentos ilimitados" },
      { icon: Globe, text: "Portal de agendamento online" },
      { icon: Package, text: "Pacotes de serviços" },
      { icon: BarChart3, text: "Relatórios avançados" },
      { icon: Sparkles, text: "IA Marketing" },
      { icon: Brain, text: "IA Financeira + IA Clientes" },
      { icon: MessageCircle, text: "1.000 notificações WhatsApp/mês" },
    ],
    naoInclui: [],
  },
];

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function PlanoBadgeAtual() {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700 border border-green-200">
      <Check className="w-3 h-3" /> Plano atual
    </span>
  );
}

export default function Planos() {
  const { isAdmin } = usePermissoes();
  const [ciclo, setCiclo] = useState<"monthly" | "annual">("monthly");
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const { data: statusPlano } = trpc.planos.getStatus.useQuery();
  const checkoutMutation = trpc.stripe.createCheckoutSession.useMutation({
    onSuccess: (data) => {
      setLoadingKey(null);
      if (data.url) {
        toast.success("Redirecionando para o checkout...", { description: "Você será levado ao Stripe para finalizar o pagamento." });
        window.open(data.url, "_blank");
      }
    },
    onError: (err) => {
      setLoadingKey(null);
      toast.error("Erro ao iniciar checkout", { description: err.message });
    },
  });

  const planoAtual = statusPlano?.plan ?? "FREE";
  const desconto = Math.round((1 - (PLANOS[0].annual / PLANOS[0].monthly)) * 100);

  function handleAssinar(planKey: "SOLO" | "PLUS" | "PRO") {
    setLoadingKey(planKey);
    checkoutMutation.mutate({ planType: planKey, billingCycle: ciclo });
  }

  // Guarda: apenas administradores podem acessar
  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center p-8">
        <Crown className="w-12 h-12 text-muted-foreground/30" />
        <p className="text-sm font-medium text-muted-foreground">Apenas administradores podem acessar os planos.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="px-6 pt-8 pb-6 text-center max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Escolha seu plano</h1>
        <p className="text-muted-foreground text-base">
          Comece grátis e faça upgrade quando precisar. Cancele a qualquer momento.
        </p>

        {/* Toggle mensal / anual */}
        <div className="inline-flex items-center gap-3 mt-6 bg-muted rounded-xl p-1">
          <button
            onClick={() => setCiclo("monthly")}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
              ciclo === "monthly"
                ? "bg-background shadow text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Mensal
          </button>
          <button
            onClick={() => setCiclo("annual")}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
              ciclo === "annual"
                ? "bg-background shadow text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Anual
            <span className="bg-green-100 text-green-700 text-xs font-semibold px-2 py-0.5 rounded-full">
              -{desconto}%
            </span>
          </button>
        </div>

        {ciclo === "annual" && (
          <p className="text-sm text-green-600 font-medium mt-2">
            Economize até {formatBRL(PLANOS[2].monthly * 12 - PLANOS[2].annualTotal)} por ano no plano Pro
          </p>
        )}
      </div>

      {/* Cards de planos */}
      <div className="px-4 pb-12 max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-5">
        {PLANOS.map((plano) => {
          const Icon = plano.icon;
          const isAtual = planoAtual === plano.key;
          const isLoading = loadingKey === plano.key;
          const preco = ciclo === "monthly" ? plano.monthly : plano.annual;

          return (
            <Card
              key={plano.key}
              className={`relative flex flex-col transition-all duration-200 ${
                plano.destaque
                  ? `border-2 ${plano.colorBorder} shadow-lg scale-[1.02]`
                  : "border hover:shadow-md"
              }`}
            >
              {plano.destaque && (
                <div className={`absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold text-white bg-gradient-to-r ${plano.color} shadow`}>
                  Mais popular
                </div>
              )}

              <CardHeader className="pb-4">
                <div className="flex items-start justify-between mb-3">
                  <div className={`p-2 rounded-lg bg-gradient-to-br ${plano.color}`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  {isAtual && <PlanoBadgeAtual />}
                </div>

                <div>
                  <h2 className="text-xl font-bold">{plano.label}</h2>
                  <p className="text-sm text-muted-foreground mt-0.5">{plano.descricao}</p>
                </div>

                <div className="mt-4">
                  <div className="flex items-end gap-1">
                    <span className="text-4xl font-extrabold tracking-tight">
                      {formatBRL(preco)}
                    </span>
                    <span className="text-muted-foreground text-sm mb-1.5">/mês</span>
                  </div>
                  {ciclo === "annual" && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Cobrado {formatBRL(plano.annualTotal)}/ano
                      <span className="ml-1 line-through opacity-50">{formatBRL(plano.monthly)}/mês</span>
                    </p>
                  )}
                </div>
              </CardHeader>

              <CardContent className="flex flex-col flex-1 gap-4">
                {/* Botão de ação */}
                {isAtual ? (
                  <Button variant="outline" disabled className="w-full">
                    <Check className="w-4 h-4 mr-2" /> Plano atual
                  </Button>
                ) : (
                  <Button
                    className={`w-full font-semibold bg-gradient-to-r ${plano.color} hover:opacity-90 text-white border-0`}
                    onClick={() => handleAssinar(plano.key)}
                    disabled={isLoading || loadingKey !== null}
                  >
                    {isLoading ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Aguarde...</>
                    ) : (
                      <>Assinar {plano.label} <ArrowRight className="w-4 h-4 ml-1" /></>
                    )}
                  </Button>
                )}

                {/* Divisor */}
                <div className="border-t pt-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                    Incluído no plano
                  </p>

                  {/* Features incluídas */}
                  <ul className="space-y-2.5">
                    {plano.features.map((f, i) => {
                      const FIcon = f.icon;
                      return (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <div className="mt-0.5 flex-shrink-0 w-4 h-4 rounded-full bg-green-100 flex items-center justify-center">
                            <Check className="w-2.5 h-2.5 text-green-600" />
                          </div>
                          <span className="text-foreground">{f.text}</span>
                        </li>
                      );
                    })}
                  </ul>

                  {/* Features não incluídas */}
                  {plano.naoInclui.length > 0 && (
                    <ul className="space-y-2 mt-2">
                      {plano.naoInclui.map((f, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <div className="mt-0.5 flex-shrink-0 w-4 h-4 rounded-full bg-muted flex items-center justify-center">
                            <span className="text-muted-foreground text-xs">—</span>
                          </div>
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Plano Free info */}
      <div className="px-4 pb-8 max-w-5xl mx-auto">
        <div className="rounded-xl border bg-muted/30 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-sm">Plano Gratuito (Free)</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              1 profissional · 15 agendamentos/mês · 50 clientes · 10 notificações WhatsApp
            </p>
          </div>
          {planoAtual === "FREE" && (
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 shrink-0">
              <Check className="w-3 h-3 mr-1" /> Plano atual
            </Badge>
          )}
        </div>
      </div>

      {/* FAQ rápido */}
      <div className="px-4 pb-12 max-w-3xl mx-auto">
        <h3 className="text-center font-semibold text-base mb-6 text-muted-foreground">Perguntas frequentes</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { q: "Posso cancelar a qualquer momento?", r: "Sim. Você pode cancelar sua assinatura a qualquer momento pelo painel de assinatura. O acesso permanece até o fim do período pago." },
            { q: "Como funciona o plano anual?", r: "No plano anual, o valor total é cobrado de uma vez no cartão. Você economiza em relação ao mensal e garante o preço por 12 meses." },
            { q: "Posso mudar de plano depois?", r: "Sim. Você pode fazer upgrade ou downgrade pelo portal do cliente Stripe a qualquer momento." },
            { q: "Quais formas de pagamento são aceitas?", r: "Aceitamos cartão de crédito e débito via Stripe. O pagamento é processado com segurança." },
          ].map((item, i) => (
            <div key={i} className="rounded-lg border bg-card p-4">
              <p className="font-medium text-sm mb-1">{item.q}</p>
              <p className="text-sm text-muted-foreground">{item.r}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
