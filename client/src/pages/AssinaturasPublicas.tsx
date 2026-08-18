import { HublyLogo } from "@/components/HublyLogo";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import {
  ArrowRight,
  CalendarCheck2,
  Check,
  ChevronLeft,
  Crown,
  Loader2,
  MessageCircle,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";
import React, { useState } from "react";

type BillingCycle = "monthly" | "annual";

type PublicPlan = {
  type: "SOLO" | "PLUS" | "PRO";
  label: string;
  description: string;
  monthly: number;
  annual: number;
  annualTotal: number;
  limits: {
    profissionais: number;
    notificacoesWhatsappMes: number;
    usuarios: number;
    pacotesServicos: boolean;
    comissoes: boolean;
    relatoriosAvancados: boolean;
    multiplosCaixas: boolean;
    portalCliente: boolean;
    iaFinanceira: boolean;
    iaMarketing: boolean;
    iaTotal: boolean;
  };
};

const planStyles = {
  SOLO: { icon: Users, accent: "text-[#76533a]", iconBg: "bg-[#f7e8d8]", border: "border-[#e5cfbd]" },
  PLUS: { icon: Zap, accent: "text-[#9a5b2f]", iconBg: "bg-[#f8e1c8]", border: "border-[#c9895a]" },
  PRO: { icon: Crown, accent: "text-[#a67c24]", iconBg: "bg-[#f8efce]", border: "border-[#d5b54d]" },
} as const;

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function limitLabel(limit: number, singular: string, plural: string) {
  if (limit === -1) return `${plural} ilimitados`;
  return limit === 1 ? `1 ${singular}` : `Até ${limit} ${plural.toLowerCase()}`;
}

function planFeatures(plan: PublicPlan) {
  const { limits } = plan;
  const features = [
    limitLabel(limits.profissionais, "profissional", "Profissionais"),
    "Agendamentos ilimitados",
    limits.portalCliente ? "Portal de agendamento online" : null,
    `${limits.notificacoesWhatsappMes.toLocaleString("pt-BR")} notificações WhatsApp/mês`,
    limitLabel(limits.usuarios, "usuário da equipe", "Usuários da equipe"),
    limits.pacotesServicos ? "Pacotes de serviços" : null,
    limits.comissoes ? "Controle de comissões" : null,
    limits.relatoriosAvancados ? "Relatórios avançados" : null,
    limits.multiplosCaixas ? "Múltiplos caixas" : null,
    limits.iaTotal ? "IA Financeira, Clientes e Marketing" : limits.iaFinanceira ? "IA Financeira" : null,
  ];

  return features.filter((feature): feature is string => Boolean(feature));
}

function PlanCard({ plan, cycle }: { plan: PublicPlan; cycle: BillingCycle }) {
  const style = planStyles[plan.type];
  const Icon = style.icon;
  const isAnnual = cycle === "annual";
  const price = isAnnual ? plan.annual : plan.monthly;
  const discount = Math.round((1 - plan.annual / plan.monthly) * 100);

  return (
    <article className={`flex h-full flex-col rounded-[28px] border bg-white p-6 shadow-[0_14px_35px_rgba(59,33,21,0.07)] ${style.border}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className={`grid h-11 w-11 place-items-center rounded-2xl ${style.iconBg} ${style.accent}`}><Icon className="h-5 w-5" /></span>
          <h2 className="mt-5 text-2xl font-extrabold tracking-[-0.04em] text-[#2c1a12]">{plan.label}</h2>
          <p className="mt-2 min-h-10 text-sm leading-relaxed text-[#796659]">{plan.description}</p>
        </div>
      </div>

      <div className="mt-6 border-y border-[#eee2d7] py-5">
        <div className="flex items-end gap-1.5"><span className="text-4xl font-extrabold tracking-[-0.06em] text-[#2c1a12]">{formatBRL(price)}</span><span className="mb-1.5 text-sm font-semibold text-[#826d5e]">/mês</span></div>
        {isAnnual ? <p className="mt-2 text-xs font-semibold text-[#5d8b57]">Cobrado {formatBRL(plan.annualTotal)}/ano · economia de {discount}%</p> : <p className="mt-2 text-xs font-semibold text-[#8a7668]">Cobrança mensal</p>}
      </div>

      <ul className="mt-6 flex flex-1 flex-col gap-3" aria-label={`Recursos do ${plan.label}`}>
        {planFeatures(plan).map((feature) => <li key={feature} className="flex items-start gap-2.5 text-sm font-medium leading-snug text-[#523b2d]"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[#5b9958]" />{feature}</li>)}
      </ul>

      <Button asChild className="mt-8 h-12 rounded-xl bg-[#3b2115] font-bold text-white hover:bg-[#5a351e]"><a href="/cadastro">Começar 7 dias grátis <ArrowRight className="ml-2 h-4 w-4" /></a></Button>
    </article>
  );
}

export default function AssinaturasPublicas() {
  const [cycle, setCycle] = useState<BillingCycle>("monthly");
  const { data, isLoading, isError } = trpc.planos.getPlans.useQuery();
  const plans = (data ?? []) as PublicPlan[];

  return (
    <div className="min-h-screen bg-[#fffaf4] text-[#2c1a12]">
      <header className="sticky top-0 z-50 border-b border-[#e9ded2]/80 bg-[#fffaf4]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between px-5 lg:px-8">
          <a href="/" className="inline-flex items-center" aria-label="Hubly — Página inicial"><HublyLogo tone="dark" height={38} /></a>
          <nav className="hidden items-center gap-7 text-sm font-semibold text-[#725f54] md:flex" aria-label="Navegação principal">
            <a href="/recursos" className="transition-colors hover:text-[#3b2115]">Recursos</a>
            <a href="/como-funciona" className="transition-colors hover:text-[#3b2115]">Como funciona</a>
            <a href="/para-seu-negocio" className="transition-colors hover:text-[#3b2115]">Para seu negócio</a>
            <a href="/assinaturas" className="font-extrabold text-[#3b2115]">Assinaturas</a>
          </nav>
          <Button asChild variant="ghost" className="font-bold text-[#5f4a3c] hover:bg-[#f4ece3] hover:text-[#2c1a12]"><a href="/admin">Entrar</a></Button>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden border-b border-[#eee2d7] px-5 pb-14 pt-16 sm:pb-20 sm:pt-24">
          <div className="pointer-events-none absolute left-[10%] top-[-55%] h-[420px] w-[420px] rounded-full bg-[#f4d7b9]/45 blur-3xl" />
          <div className="pointer-events-none absolute right-[8%] top-[15%] h-[330px] w-[330px] rounded-full bg-[#efdc8d]/30 blur-3xl" />
          <div className="relative mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#ead7c7] bg-white/80 px-4 py-2 text-xs font-extrabold text-[#8a5531]"><Sparkles className="h-3.5 w-3.5" /> 7 dias para testar tudo</span>
            <h1 className="mt-6 text-4xl font-extrabold tracking-[-0.065em] text-[#2c1a12] sm:text-6xl">Escolha um plano que acompanhe o seu negócio.</h1>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-[#735f52] sm:text-lg">No teste inicial, você conhece todos os recursos. Depois, escolhe a estrutura que faz sentido para a sua rotina.</p>
            <div className="mt-8 inline-flex rounded-2xl border border-[#e7d8ca] bg-white p-1.5 shadow-sm" aria-label="Ciclo de cobrança">
              <button type="button" onClick={() => setCycle("monthly")} className={`rounded-xl px-5 py-2.5 text-sm font-extrabold transition-colors ${cycle === "monthly" ? "bg-[#3b2115] text-white" : "text-[#735f52] hover:bg-[#f7efe8]"}`}>Mensal</button>
              <button type="button" onClick={() => setCycle("annual")} className={`rounded-xl px-5 py-2.5 text-sm font-extrabold transition-colors ${cycle === "annual" ? "bg-[#3b2115] text-white" : "text-[#735f52] hover:bg-[#f7efe8]"}`}>Anual <span className="ml-1 text-xs opacity-80">economize</span></button>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-14 sm:py-20 lg:px-8">
          {isLoading && <div className="flex min-h-72 items-center justify-center gap-3 text-sm font-semibold text-[#735f52]"><Loader2 className="h-5 w-5 animate-spin" /> Carregando opções de assinatura...</div>}
          {isError && <div className="mx-auto max-w-xl rounded-2xl border border-[#eccfc4] bg-[#fff4f0] p-6 text-center text-sm font-semibold text-[#8a4531]">Não foi possível carregar os planos agora. Atualize a página ou tente novamente em alguns instantes.</div>}
          {!isLoading && !isError && <div className="grid gap-5 md:grid-cols-3">{plans.map((plan) => <PlanCard key={plan.type} plan={plan} cycle={cycle} />)}</div>}
        </section>

        <section className="border-y border-[#eee2d7] bg-[#f8f1e9] px-5 py-14 sm:py-20">
          <div className="mx-auto grid max-w-5xl gap-5 md:grid-cols-3">
            <div className="rounded-3xl bg-white p-6 shadow-sm"><CalendarCheck2 className="h-5 w-5 text-[#9b5c31]" /><h2 className="mt-4 text-lg font-extrabold">Teste com acesso completo</h2><p className="mt-2 text-sm leading-relaxed text-[#796659]">Os primeiros 7 dias dão acesso à estrutura do plano Pro para você conhecer o Hubly no seu ritmo.</p></div>
            <div className="rounded-3xl bg-white p-6 shadow-sm"><MessageCircle className="h-5 w-5 text-[#9b5c31]" /><h2 className="mt-4 text-lg font-extrabold">Detalhes visíveis</h2><p className="mt-2 text-sm leading-relaxed text-[#796659]">Cada plano mostra os limites de equipe, notificações e os recursos incluídos antes da escolha.</p></div>
            <div className="rounded-3xl bg-white p-6 shadow-sm"><ChevronLeft className="h-5 w-5 text-[#9b5c31]" /><h2 className="mt-4 text-lg font-extrabold">Comece pelo essencial</h2><p className="mt-2 text-sm leading-relaxed text-[#796659]">Escolha o plano compatível com seu momento e amplie a estrutura quando a operação pedir.</p></div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#eaded2] bg-[#fffdf9]">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-10 text-sm text-[#7a675a] sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <a href="/" className="inline-flex items-center" aria-label="Hubly — Página inicial"><HublyLogo tone="dark" height={34} /></a>
          <div className="flex flex-wrap gap-x-5 gap-y-2"><a href="/politica-de-privacidade" className="hover:text-[#3b2115]">Privacidade</a><a href="/termos-de-uso" className="hover:text-[#3b2115]">Termos de uso</a><a href="/admin" className="hover:text-[#3b2115]">Entrar na plataforma</a></div>
          <p>© 2026 Hubly</p>
        </div>
      </footer>
    </div>
  );
}
