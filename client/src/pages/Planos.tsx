import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Check,
  X,
  Zap,
  Crown,
  Star,
  Sparkles,
  Lock,
  ArrowRight,
  Clock,
} from "lucide-react";

type BillingCycle = "monthly" | "annual";

const PLAN_ORDER = ["FREE", "SOLO", "PLUS", "PRO"] as const;
type PlanKey = (typeof PLAN_ORDER)[number];

const PLAN_ICONS: Record<PlanKey, React.ReactNode> = {
  FREE: <Star className="w-5 h-5" />,
  SOLO: <Zap className="w-5 h-5" />,
  PLUS: <Sparkles className="w-5 h-5" />,
  PRO: <Crown className="w-5 h-5" />,
};

const PLAN_COLORS: Record<PlanKey, string> = {
  FREE: "border-border bg-card",
  SOLO: "border-primary/40 bg-card",
  PLUS: "border-primary bg-card ring-2 ring-primary/20",
  PRO: "border-amber-500/60 bg-card",
};

const PLAN_BADGE: Record<PlanKey, string | null> = {
  FREE: null,
  SOLO: null,
  PLUS: "Mais popular",
  PRO: null,
};

const FEATURES = [
  { key: "profissionais", label: "Profissionais" },
  { key: "agendamentos", label: "Agendamentos/mês" },
  { key: "notificacoesWhatsapp", label: "Notificações WhatsApp/mês" },
  { key: "clientes", label: "Clientes cadastrados" },
  { key: "linkPersonalizado", label: "Link personalizado (sem marca Agendei)" },
  { key: "pacotesServicos", label: "Pacotes de serviços" },
  { key: "comissoes", label: "Comissões automáticas" },
  { key: "relatoriosAvancados", label: "Relatórios avançados" },
  { key: "multiplosCaixas", label: "Múltiplos caixas" },
  { key: "portalCliente", label: "Portal de agendamento do cliente" },
  { key: "iaMarketing", label: "IA de Marketing" },
  { key: "iaFinanceira", label: "IA Financeira e Comissões" },
  { key: "iaTotal", label: "IA Total (WhatsApp bot + Preditivo)" },
] as const;

const PLAN_FEATURE_VALUES: Record<PlanKey, Record<string, string | boolean>> = {
  FREE: {
    profissionais: "1",
    agendamentos: "15",
    notificacoesWhatsapp: "10",
    clientes: "50",
    linkPersonalizado: false,
    pacotesServicos: false,
    comissoes: false,
    relatoriosAvancados: false,
    multiplosCaixas: false,
    portalCliente: false,
    iaMarketing: false,
    iaFinanceira: false,
    iaTotal: false,
  },
  SOLO: {
    profissionais: "1",
    agendamentos: "Ilimitados",
    notificacoesWhatsapp: "100",
    clientes: "Ilimitados",
    linkPersonalizado: true,
    pacotesServicos: true,
    comissoes: true,
    relatoriosAvancados: true,
    multiplosCaixas: false,
    portalCliente: true,
    iaMarketing: true,
    iaFinanceira: false,
    iaTotal: false,
  },
  PLUS: {
    profissionais: "Até 5",
    agendamentos: "Ilimitados",
    notificacoesWhatsapp: "400",
    clientes: "Ilimitados",
    linkPersonalizado: true,
    pacotesServicos: true,
    comissoes: true,
    relatoriosAvancados: true,
    multiplosCaixas: true,
    portalCliente: true,
    iaMarketing: true,
    iaFinanceira: true,
    iaTotal: false,
  },
  PRO: {
    profissionais: "Até 20",
    agendamentos: "Ilimitados",
    notificacoesWhatsapp: "1.000",
    clientes: "Ilimitados",
    linkPersonalizado: true,
    pacotesServicos: true,
    comissoes: true,
    relatoriosAvancados: true,
    multiplosCaixas: true,
    portalCliente: true,
    iaMarketing: true,
    iaFinanceira: true,
    iaTotal: true,
  },
};

const PRICES: Record<PlanKey, { monthly: number; annual: number; annualTotal: number; label: string; description: string }> = {
  FREE: { monthly: 0, annual: 0, annualTotal: 0, label: "Free", description: "Para começar sem compromisso" },
  SOLO: { monthly: 29.90, annual: 19.42, annualTotal: 233.00, label: "Solo", description: "Para profissionais autônomos" },
  PLUS: { monthly: 69.90, annual: 45.40, annualTotal: 544.80, label: "Plus", description: "Para salões com equipe" },
  PRO: { monthly: 129.90, annual: 84.40, annualTotal: 1012.80, label: "Pro", description: "Para redes e franquias" },
};

function formatPrice(value: number) {
  return value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function FeatureValue({ value }: { value: string | boolean }) {
  if (typeof value === "boolean") {
    return value
      ? <Check className="w-4 h-4 text-green-500 mx-auto" />
      : <X className="w-4 h-4 text-muted-foreground/40 mx-auto" />;
  }
  return <span className="text-sm font-medium text-center block">{value}</span>;
}

export default function Planos() {
  const { user } = useAuth();
  const [billing, setBilling] = useState<BillingCycle>("monthly");
  const { data: status } = trpc.planos.getStatus.useQuery(undefined, { enabled: !!user });

  const currentPlan = (status?.plan ?? "FREE") as PlanKey;

  function handleSelectPlan(plan: PlanKey) {
    if (plan === "FREE") return;
    // Futuramente: redirecionar para Stripe checkout
    alert(`Em breve: checkout para o plano ${PRICES[plan].label}. Integração com Stripe em desenvolvimento.`);
  }

  const trialDaysLeft = status?.trialEnd
    ? Math.max(0, Math.ceil((new Date(status.trialEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold tracking-tight mb-3">Escolha o plano ideal</h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Comece gratuitamente. Faça upgrade quando precisar crescer.
            Sem taxas escondidas, cancele quando quiser.
          </p>

          {/* Trial banner */}
          {status?.status === "trial" && trialDaysLeft !== null && trialDaysLeft > 0 && (
            <div className="mt-4 inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 rounded-full px-4 py-2 text-sm font-medium">
              <Clock className="w-4 h-4" />
              Você está no período de teste: {trialDaysLeft} dia{trialDaysLeft !== 1 ? "s" : ""} restante{trialDaysLeft !== 1 ? "s" : ""} no plano Solo
            </div>
          )}
        </div>

        {/* Toggle mensal/anual */}
        <div className="flex items-center justify-center gap-3 mb-10">
          <Label htmlFor="billing-toggle" className={billing === "monthly" ? "font-semibold" : "text-muted-foreground"}>
            Mensal
          </Label>
          <Switch
            id="billing-toggle"
            checked={billing === "annual"}
            onCheckedChange={(v) => setBilling(v ? "annual" : "monthly")}
          />
          <Label htmlFor="billing-toggle" className={billing === "annual" ? "font-semibold" : "text-muted-foreground"}>
            Anual
          </Label>
          {billing === "annual" && (
            <Badge variant="secondary" className="bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30">
              35% OFF
            </Badge>
          )}
        </div>

        {/* Cards de planos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-14">
          {PLAN_ORDER.map((plan) => {
            const price = PRICES[plan];
            const isCurrentPlan = currentPlan === plan;
            const isBestValue = plan === "PLUS";
            const displayPrice = billing === "annual" ? price.annual : price.monthly;

            return (
              <div
                key={plan}
                className={`relative rounded-2xl border-2 p-6 flex flex-col gap-4 transition-all ${PLAN_COLORS[plan]} ${isBestValue ? "shadow-lg shadow-primary/10" : ""}`}
              >
                {/* Badge "Mais popular" */}
                {PLAN_BADGE[plan] && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground px-3 py-0.5 text-xs font-semibold">
                      {PLAN_BADGE[plan]}
                    </Badge>
                  </div>
                )}

                {/* Ícone e nome */}
                <div className="flex items-center gap-2">
                  <div className={`p-2 rounded-lg ${plan === "PRO" ? "bg-amber-500/15 text-amber-500" : "bg-primary/10 text-primary"}`}>
                    {PLAN_ICONS[plan]}
                  </div>
                  <div>
                    <div className="font-bold text-lg">{price.label}</div>
                    <div className="text-xs text-muted-foreground">{price.description}</div>
                  </div>
                </div>

                {/* Preço */}
                <div>
                  {plan === "FREE" ? (
                    <div className="text-4xl font-bold">Grátis</div>
                  ) : (
                    <>
                      <div className="flex items-end gap-1">
                        <span className="text-sm text-muted-foreground mt-1">R$</span>
                        <span className="text-4xl font-bold">{formatPrice(displayPrice).split(",")[0]}</span>
                        <span className="text-lg font-semibold text-muted-foreground">,{formatPrice(displayPrice).split(",")[1]}</span>
                        <span className="text-sm text-muted-foreground mb-1">/mês</span>
                      </div>
                      {billing === "annual" && (
                        <div className="text-xs text-muted-foreground mt-0.5">
                          R$ {formatPrice(price.annualTotal)} cobrado anualmente
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* CTA */}
                {isCurrentPlan ? (
                  <Button variant="outline" disabled className="w-full">
                    Plano atual
                  </Button>
                ) : plan === "FREE" ? (
                  <Button variant="outline" className="w-full" disabled>
                    Gratuito
                  </Button>
                ) : (
                  <Button
                    className={`w-full ${plan === "PRO" ? "bg-amber-500 hover:bg-amber-600 text-white" : ""}`}
                    variant={isBestValue ? "default" : "outline"}
                    onClick={() => handleSelectPlan(plan)}
                  >
                    Assinar {price.label}
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                )}

                {/* Features resumidas */}
                <ul className="space-y-2 text-sm mt-1">
                  {plan === "FREE" && (
                    <>
                      <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500 shrink-0" /> 1 profissional</li>
                      <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500 shrink-0" /> 15 agendamentos/mês</li>
                      <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500 shrink-0" /> 10 notificações WhatsApp</li>
                      <li className="flex items-center gap-2"><X className="w-4 h-4 text-muted-foreground/40 shrink-0" /> Sem pacotes de serviços</li>
                      <li className="flex items-center gap-2"><X className="w-4 h-4 text-muted-foreground/40 shrink-0" /> Sem IA</li>
                    </>
                  )}
                  {plan === "SOLO" && (
                    <>
                      <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500 shrink-0" /> 1 profissional</li>
                      <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500 shrink-0" /> Agendamentos ilimitados</li>
                      <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500 shrink-0" /> 100 notificações WhatsApp</li>
                      <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500 shrink-0" /> Pacotes de serviços</li>
                      <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500 shrink-0" /> IA de Marketing</li>
                    </>
                  )}
                  {plan === "PLUS" && (
                    <>
                      <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500 shrink-0" /> Até 5 profissionais</li>
                      <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500 shrink-0" /> Agendamentos ilimitados</li>
                      <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500 shrink-0" /> 400 notificações WhatsApp</li>
                      <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500 shrink-0" /> Múltiplos caixas</li>
                      <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500 shrink-0" /> IA Financeira</li>
                    </>
                  )}
                  {plan === "PRO" && (
                    <>
                      <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500 shrink-0" /> Até 20 profissionais</li>
                      <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500 shrink-0" /> Agendamentos ilimitados</li>
                      <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500 shrink-0" /> 1.000 notificações WhatsApp</li>
                      <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500 shrink-0" /> Domínio próprio</li>
                      <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500 shrink-0" /> IA Total + WhatsApp Bot</li>
                    </>
                  )}
                </ul>
              </div>
            );
          })}
        </div>

        {/* Tabela comparativa completa */}
        <div className="rounded-2xl border border-border overflow-hidden">
          <div className="bg-muted/50 px-6 py-4 border-b border-border">
            <h2 className="font-bold text-lg">Comparativo completo de funcionalidades</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-6 py-3 font-medium text-muted-foreground w-1/3">Funcionalidade</th>
                  {PLAN_ORDER.map((plan) => (
                    <th key={plan} className={`px-4 py-3 text-center font-semibold ${currentPlan === plan ? "text-primary" : ""}`}>
                      {PRICES[plan].label}
                      {currentPlan === plan && (
                        <Badge variant="outline" className="ml-1 text-xs border-primary text-primary">atual</Badge>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {FEATURES.map((feature, idx) => (
                  <tr key={feature.key} className={`border-b border-border/50 ${idx % 2 === 0 ? "bg-muted/20" : ""}`}>
                    <td className="px-6 py-3 text-muted-foreground">{feature.label}</td>
                    {PLAN_ORDER.map((plan) => (
                      <td key={plan} className="px-4 py-3 text-center">
                        <FeatureValue value={PLAN_FEATURE_VALUES[plan][feature.key]} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Nota sobre IA */}
        <div className="mt-6 flex items-start gap-3 bg-muted/40 rounded-xl p-4 border border-border">
          <Lock className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-sm text-muted-foreground">
            As funcionalidades de <strong>IA</strong> estão em desenvolvimento ativo e serão liberadas progressivamente.
            Os planos que incluem IA já exibem os módulos com a tag <Badge variant="outline" className="text-xs mx-1">PRO</Badge> ou <Badge variant="outline" className="text-xs mx-1">PLUS</Badge> para que você possa ver o que está por vir.
          </p>
        </div>

        {/* FAQ rápido */}
        <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="bg-muted/30 rounded-xl p-4 border border-border">
            <div className="font-semibold mb-1">O plano Free expira?</div>
            <div className="text-muted-foreground">Não. O plano Free é permanente. Você começa com 7 dias grátis no plano Solo e, se não assinar, migra automaticamente para o Free.</div>
          </div>
          <div className="bg-muted/30 rounded-xl p-4 border border-border">
            <div className="font-semibold mb-1">Posso cancelar a qualquer momento?</div>
            <div className="text-muted-foreground">Sim. Nos planos mensais, o cancelamento é imediato. Nos planos anuais, você mantém o acesso até o fim do período contratado.</div>
          </div>
          <div className="bg-muted/30 rounded-xl p-4 border border-border">
            <div className="font-semibold mb-1">Como funciona o desconto anual?</div>
            <div className="text-muted-foreground">No plano anual você economiza 35% em relação ao mensal. O valor total é cobrado de uma vez no cartão de crédito em até 12x.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
