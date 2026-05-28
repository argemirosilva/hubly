import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import {
  CheckCircle2, Sparkles, Calendar, Users, MessageCircle,
  ArrowRight, LayoutDashboard, CreditCard, Gem, Zap, Star,
  Brain, Package, BarChart3, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(value: number, currency = "BRL") {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(value);
}

function formatDate(date: Date | string | null | undefined) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

function getPlanConfig(planType: string) {
  switch (planType) {
    case "SOLO":
      return {
        gradient: "from-blue-500 to-blue-600",
        lightBg: "bg-amber-50",
        lightText: "text-blue-700",
        lightBorder: "border-blue-200",
        icon: Gem,
        features: [
          { icon: Calendar, text: "Agendamentos ilimitados" },
          { icon: Users, text: "1 profissional" },
          { icon: MessageCircle, text: "100 notificações WhatsApp/mês" },
          { icon: Package, text: "Pacotes de serviços" },
          { icon: BarChart3, text: "Relatórios avançados" },
        ],
      };
    case "PLUS":
      return {
        gradient: "from-violet-500 to-violet-600",
        lightBg: "bg-violet-50",
        lightText: "text-violet-700",
        lightBorder: "border-violet-200",
        icon: Zap,
        features: [
          { icon: Calendar, text: "Agendamentos ilimitados" },
          { icon: Users, text: "Até 5 profissionais" },
          { icon: MessageCircle, text: "400 notificações WhatsApp/mês" },
          { icon: Package, text: "Pacotes de serviços" },
          { icon: Brain, text: "IA Financeira" },
          { icon: BarChart3, text: "Relatórios avançados" },
        ],
      };
    case "PRO":
      return {
        gradient: "from-amber-500 to-amber-600",
        lightBg: "bg-amber-50",
        lightText: "text-amber-700",
        lightBorder: "border-amber-200",
        icon: Star,
        features: [
          { icon: Calendar, text: "Agendamentos ilimitados" },
          { icon: Users, text: "Até 20 profissionais" },
          { icon: MessageCircle, text: "1.000 notificações WhatsApp/mês" },
          { icon: Package, text: "Pacotes de serviços" },
          { icon: Brain, text: "IA completa (Financeira + Clientes)" },
          { icon: BarChart3, text: "Múltiplos caixas + Relatórios avançados" },
        ],
      };
    default:
      return {
        gradient: "from-slate-400 to-slate-500",
        lightBg: "bg-stone-50",
        lightText: "text-slate-700",
        lightBorder: "border-slate-200",
        icon: Gem,
        features: [],
      };
  }
}

// ─── Componente de Confetti ────────────────────────────────────────────────────

function ConfettiDot({ delay, x, color }: { delay: number; x: number; color: string }) {
  return (
    <div
      className="absolute w-2 h-2 rounded-full animate-bounce"
      style={{
        left: `${x}%`,
        top: "-10px",
        backgroundColor: color,
        animationDelay: `${delay}ms`,
        animationDuration: `${1200 + delay}ms`,
      }}
    />
  );
}

const confettiItems = [
  { x: 10, color: "#8b5cf6", delay: 0 },
  { x: 20, color: "#3b82f6", delay: 150 },
  { x: 35, color: "#f59e0b", delay: 300 },
  { x: 50, color: "#10b981", delay: 100 },
  { x: 65, color: "#8b5cf6", delay: 250 },
  { x: 80, color: "#ef4444", delay: 50 },
  { x: 90, color: "#3b82f6", delay: 200 },
];

// ─── Componente Principal ─────────────────────────────────────────────────────

export default function PlanosSuccesso() {
  const [, setLocation] = useLocation();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(10);

  // Extrair session_id da URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sid = params.get("session_id");
    setSessionId(sid);
  }, []);

  // Countdown para redirecionar ao dashboard
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setLocation("/admin");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [setLocation]);

  const { data: session, isLoading } = trpc.stripe.getCheckoutSession.useQuery(
    { sessionId: sessionId ?? "" },
    { enabled: !!sessionId }
  );

  const planConfig = getPlanConfig(session?.planType ?? "SOLO");
  const PlanIcon = planConfig.icon;

  if (isLoading || !sessionId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-violet-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-violet-100 flex items-center justify-center animate-pulse">
            <CheckCircle2 className="w-8 h-8 text-violet-400" />
          </div>
          <p className="text-slate-500 text-sm">Confirmando sua assinatura...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-violet-50 flex items-center justify-center px-4 py-12">
      {/* Confetti animado */}
      <div className="fixed top-0 left-0 right-0 h-20 overflow-hidden pointer-events-none">
        {confettiItems.map((item, i) => (
          <ConfettiDot key={i} {...item} />
        ))}
      </div>

      <div className="w-full max-w-2xl space-y-6">
        {/* ── Card principal de sucesso ── */}
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100">
          {/* Header com gradiente */}
          <div className={`bg-gradient-to-br ${planConfig.gradient} px-8 py-10 text-center relative overflow-hidden`}>
            {/* Círculos decorativos */}
            <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/10" />
            <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full bg-white/10" />

            {/* Ícone de sucesso */}
            <div className="relative flex justify-center mb-4">
              <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-white" />
              </div>
            </div>

            <h1 className="text-3xl font-bold text-white mb-2">
              Assinatura confirmada! 🎉
            </h1>
            <p className="text-white/80 text-base">
              Bem-vindo ao <strong className="text-white">{session?.planLabel ?? "Hubly"}</strong>.
              Seu negócio agora tem superpoderes.
            </p>
          </div>

          {/* Corpo do card */}
          <div className="px-8 py-6 space-y-6">
            {/* Resumo da assinatura */}
            <div className={`rounded-2xl ${planConfig.lightBg} border ${planConfig.lightBorder} p-5`}>
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${planConfig.gradient} flex items-center justify-center`}>
                  <PlanIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-bold text-slate-800 text-lg">{session?.planLabel}</p>
                  <p className={`text-sm ${planConfig.lightText}`}>
                    {session?.billingCycle === "annual" ? "Cobrança anual" : "Cobrança mensal"}
                  </p>
                </div>
                {session?.valorTotal && (
                  <div className="ml-auto text-right">
                    <p className="font-bold text-slate-800 text-xl">
                      {formatCurrency(session.valorTotal, session.moeda)}
                    </p>
                    <p className="text-xs text-slate-500">
                      {session.billingCycle === "annual" ? "por ano" : "por mês"}
                    </p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-white/60 rounded-xl p-3">
                  <p className="text-xs text-slate-500 mb-0.5">Status</p>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="font-semibold text-emerald-700">Ativa</span>
                  </div>
                </div>
                <div className="bg-white/60 rounded-xl p-3">
                  <p className="text-xs text-slate-500 mb-0.5">Próxima cobrança</p>
                  <p className="font-semibold text-slate-700 text-xs">
                    {session?.proximaCobranca ? formatDate(session.proximaCobranca) : "—"}
                  </p>
                </div>
              </div>
            </div>

            {/* Recursos desbloqueados */}
            <div>
              <h2 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-violet-500" />
                Recursos desbloqueados
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {planConfig.features.map((feature, i) => {
                  const FeatureIcon = feature.icon;
                  return (
                    <div key={i} className="flex items-center gap-2.5 p-2.5 rounded-xl bg-stone-50">
                      <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                        <FeatureIcon className="w-3.5 h-3.5 text-emerald-600" />
                      </div>
                      <span className="text-sm text-slate-600">{feature.text}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Link href="/admin" className="flex-1">
                <Button className={`w-full gap-2 bg-gradient-to-r ${planConfig.gradient} hover:opacity-90 text-white border-0`}>
                  <LayoutDashboard className="w-4 h-4" />
                  Ir para o Dashboard
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link href="/admin/assinatura" className="flex-1 sm:flex-none">
                <Button variant="outline" className="w-full gap-2 text-sm">
                  <CreditCard className="w-4 h-4" />
                  Ver assinatura
                </Button>
              </Link>
            </div>

            {/* Redirecionamento automático */}
            <p className="text-center text-xs text-slate-400">
              Você será redirecionado ao dashboard em{" "}
              <span className="font-semibold text-slate-600">{countdown}s</span>
            </p>
          </div>
        </div>

        {/* ── Card de próximos passos ── */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h3 className="font-semibold text-slate-700 mb-4">Próximos passos sugeridos</h3>
          <div className="space-y-3">
            {[
              { href: "/admin/configuracoes", icon: Sparkles, title: "Configure sua empresa", desc: "Adicione logo, horários e link personalizado de agendamento" },
              { href: "/admin/profissionais", icon: Users, title: "Cadastre sua equipe", desc: "Adicione profissionais e configure suas permissões" },
              { href: "/admin/automacoes", icon: MessageCircle, title: "Ative as automações", desc: "Configure lembretes automáticos por WhatsApp" },
            ].map((step) => {
              const StepIcon = step.icon;
              return (
                <Link key={step.href} href={step.href}>
                  <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-stone-50 transition-colors cursor-pointer group">
                    <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
                      <StepIcon className="w-4 h-4 text-violet-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-700">{step.title}</p>
                      <p className="text-xs text-slate-400 truncate">{step.desc}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
