import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { usePermissoes } from "@/hooks/usePermissoes";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Check, Zap, Users, Brain, MessageCircle, BarChart3, Package,
  Globe, Crown, Star, ArrowRight, Loader2, Info
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// ─── Dados dos planos ─────────────────────────────────────────────────────────
const PLANOS = [
  {
    key: "SOLO" as const,
    label: "Hubly Solo",
    icon: Star,
    color: "from-blue-500 to-blue-600",
    colorLight: "bg-amber-50 text-blue-700 border-blue-200",
    colorBorder: "border-blue-500",
    colorBadge: "bg-amber-100 text-blue-700",
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
      { icon: MessageCircle, text: "100 notificações WhatsApp/mês" },
      { icon: MessageCircle, text: "Conexão WhatsApp via QR Code" },
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
      { icon: Brain, text: "IA Financeira" },
      { icon: MessageCircle, text: "400 notificações WhatsApp/mês" },
      { icon: MessageCircle, text: "Conexão WhatsApp via QR Code" },
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
      { icon: Brain, text: "IA Financeira + IA Clientes" },
      { icon: MessageCircle, text: "1.000 notificações WhatsApp/mês" },
      { icon: MessageCircle, text: "WhatsApp via API dedicada e robusta" },
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
  const { data: stripePrices } = trpc.planos.getStripePrices.useQuery();
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
  const isSuspendedPlanos = statusPlano?.status === "suspended";
  // Usa preços do Stripe se disponíveis, senão usa os hardcoded
  function getPreco(key: string, cicloLocal: "monthly" | "annual"): number {
    if (stripePrices?.[key]) {
      const p = stripePrices[key];
      if (cicloLocal === "monthly" && p.mensal) return p.mensal;
      if (cicloLocal === "annual" && p.anual) {
        // Anual: divide por 12 para mostrar valor mensal equivalente
        return Math.round((p.anual / 12) * 100) / 100;
      }
    }
    const plano = PLANOS.find(p => p.key === key);
    return cicloLocal === "monthly" ? (plano?.monthly ?? 0) : (plano?.annual ?? 0);
  }
  function getPrecoAnualTotal(key: string): number {
    if (stripePrices?.[key]?.anual) return stripePrices[key].anual!;
    return PLANOS.find(p => p.key === key)?.annualTotal ?? 0;
  }
  const soloMensal = getPreco("SOLO", "monthly");
  const soloAnualMes = getPreco("SOLO", "annual");
  const desconto = soloMensal > 0 && soloAnualMes > 0
    ? Math.round((1 - soloAnualMes / soloMensal) * 100)
    : Math.round((1 - (PLANOS[0].annual / PLANOS[0].monthly)) * 100);

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
          Escolha o plano ideal para o seu negócio. Cancele a qualquer momento.
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
            Economize até {formatBRL(getPreco("PRO", "monthly") * 12 - getPrecoAnualTotal("PRO"))} por ano no plano Pro
          </p>
        )}
      </div>

      {/* Cards de planos */}
      <div className="px-4 pb-12 max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-5">
        {PLANOS.map((plano) => {
          const Icon = plano.icon;
          const isAtual = planoAtual === plano.key;
          const isLoading = loadingKey === plano.key;
          const preco = getPreco(plano.key, ciclo);
          const precoAnualTotal = getPrecoAnualTotal(plano.key);
          const precoMensalRef = getPreco(plano.key, "monthly");

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
                      Cobrado {formatBRL(precoAnualTotal)}/ano
                      <span className="ml-1 line-through opacity-50">{formatBRL(precoMensalRef)}/mês</span>
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
                    {loadingKey === plano.key ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Aguarde...</>
                    ) : planoAtual && planoAtual !== "FREE" && !isSuspendedPlanos ? (
                      <>Alterar para {plano.label} <ArrowRight className="w-4 h-4 ml-1" /></>
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
                      const isDestaque = plano.key === "PRO" && f.text.includes("API dedicada");
                      return (
                        <li key={i} className={`flex items-start gap-2 text-sm ${isDestaque ? "rounded-lg bg-amber-50 border border-amber-200 px-2 py-1.5 -mx-2" : ""}`}>
                          <div className={`mt-0.5 flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center ${isDestaque ? "bg-amber-200" : "bg-green-100"}`}>
                            <Check className={`w-2.5 h-2.5 ${isDestaque ? "text-amber-700" : "text-green-600"}`} />
                          </div>
                          <span className={isDestaque ? "text-amber-800 font-medium" : "text-foreground"}>{f.text}</span>
                          {isDestaque && (
                            <div className="ml-auto flex items-center gap-1 shrink-0">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Info className="w-3.5 h-3.5 text-amber-500 cursor-help" />
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="max-w-[220px] text-xs">
                                    Conexão via Z-API: maior estabilidade, sem risco de desconexão inesperada e sem dependência do celular ligado.
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              <span className="text-[10px] font-bold bg-amber-500 text-white px-1.5 py-0.5 rounded-full">PRO</span>
                            </div>
                          )}
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



      {/* FAQ rápido */}
      <div className="px-4 pb-12 max-w-3xl mx-auto">
        <h3 className="text-center font-semibold text-base mb-6 text-muted-foreground">Perguntas frequentes</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { q: "Posso cancelar a qualquer momento?", r: "Sim. Você pode cancelar sua assinatura a qualquer momento pelo painel de assinatura. O acesso permanece até o fim do período pago." },
            { q: "Como funciona o plano anual?", r: "No plano anual, o valor total é cobrado de uma vez no cartão. Você economiza em relação ao mensal e garante o preço por 12 meses." },
            { q: "Posso mudar de plano depois?", r: "Sim. Você pode fazer upgrade ou downgrade pelo portal do cliente Stripe a qualquer momento." },
            { q: "Quais formas de pagamento são aceitas?", r: "Aceitamos cartão de crédito e débito via Stripe. O pagamento é processado com segurança." },
            { q: "Qual a diferença entre QR Code e API dedicada no WhatsApp?", r: "Nos planos Solo e Plus, a conexão WhatsApp é feita via QR Code no seu celular. No plano PRO, usamos uma API dedicada (Z-API) que oferece maior estabilidade, sem dependência do celular ligado e com menor risco de interrupções no envio de mensagens." },
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
