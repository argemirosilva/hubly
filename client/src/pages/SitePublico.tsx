import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  BadgeCheck,
  CalendarCheck2,
  Check,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Menu,
  MessageCircleMore,
  Play,
  Sparkles,
  UsersRound,
  X,
  Zap,
} from "lucide-react";
import React, { useEffect, useState } from "react";

type PublicPage = "inicio" | "recursos" | "como-funciona" | "negocios";

const HERO_IMAGE = "/manus-storage/hubly-public-hero_2c2e6de4.jpg";
const HUBLY_LOGO_URL = "/manus-storage/hubly-logo-dark_ecdf0ad5.png";

const pageCopy: Record<Exclude<PublicPage, "inicio">, { eyebrow: string; title: string; description: string }> = {
  recursos: {
    eyebrow: "Recursos que trabalham juntos",
    title: "Menos telas abertas. Mais clareza para decidir.",
    description: "Conheça as ferramentas que organizam o atendimento, deixam o dinheiro visível e aproximam seus clientes sem transformar sua rotina em algo complicado.",
  },
  "como-funciona": {
    eyebrow: "Simples desde o primeiro dia",
    title: "Comece pela agenda. O Hubly cresce com você.",
    description: "Você configura o básico, organiza a rotina do dia e vai ativando o que faz sentido quando o negócio pede mais controle.",
  },
  negocios: {
    eyebrow: "Feito para quem vive de atender",
    title: "Seu serviço tem um jeito único. Sua gestão também pode ter.",
    description: "Do atendimento individual ao estúdio com equipe, o Hubly acompanha a evolução de negócios de serviços sem perder a simplicidade.",
  },
};

const pillars = [
  {
    icon: CalendarCheck2,
    title: "Agenda no controle",
    description: "Organize horários, bloqueios, pré-agendamentos e pacotes sem perder tempo procurando conversa.",
    color: "bg-[#f4e5d5] text-[#8b4f2c]",
    details: ["Visualização diária, semanal e mensal da agenda", "Bloqueios de horário para proteger sua disponibilidade", "Pré-agendamento com sinal e confirmação no fluxo certo"],
  },
  {
    icon: UsersRound,
    title: "Clientes por perto",
    description: "Tenha histórico, confirmações e retornos no momento certo para atender com mais atenção.",
    color: "bg-[#e9eee4] text-[#55703d]",
    details: ["Histórico de atendimentos e preferências em um só perfil", "Pipeline para saber quem precisa de retorno", "Confirmações que mantêm o cliente informado"],
  },
  {
    icon: CircleDollarSign,
    title: "Dinheiro visível",
    description: "Saiba o que entrou, o que falta receber e o que está funcionando no seu negócio.",
    color: "bg-[#f8edcf] text-[#9b6a12]",
    details: ["Sinais, pagamentos parciais e valores em aberto", "Visão do que entrou e do que ainda precisa ser recebido", "Acompanhamento de comissões e contas da rotina"],
  },
  {
    icon: MessageCircleMore,
    title: "Rotina que anda",
    description: "Automatize confirmações e lembretes sem deixar sua comunicação com cara de robô.",
    color: "bg-[#e3edf5] text-[#35617c]",
    details: ["Lembretes e confirmações no momento configurado por você", "Mensagens ligadas ao status real de cada agendamento", "Histórico para acompanhar o que foi enviado"],
  },
];

function ResourceCard({ resource }: { resource: (typeof pillars)[number] }) {
  const { icon: Icon, title, description, color, details } = resource;
  return (
    <details className="group rounded-3xl border border-[#eaded2] bg-white transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_16px_30px_rgba(76,45,26,0.08)] open:ring-1 open:ring-[#d8b89c]">
      <summary className="cursor-pointer list-none p-6 [&::-webkit-details-marker]:hidden">
        <div className={`grid h-11 w-11 place-items-center rounded-2xl ${color}`}><Icon className="h-5 w-5" /></div>
        <h3 className="mt-6 text-xl font-extrabold tracking-[-0.03em] text-[#342117]">{title}</h3>
        <p className="mt-3 text-sm leading-relaxed text-[#796659]">{description}</p>
        <span className="mt-6 inline-flex items-center gap-1 text-sm font-bold text-[#8a4d2b]">Ver como funciona <ChevronDown className="h-4 w-4 transition-transform duration-200 group-open:rotate-180" /></span>
      </summary>
      <div className="border-t border-[#f0e6dc] px-6 pb-6 pt-5">
        <p className="text-xs font-extrabold uppercase tracking-[0.13em] text-[#9a6a45]">Na prática, você consegue</p>
        <ul className="mt-3 space-y-2.5 text-sm leading-relaxed text-[#655143]">
          {details.map((detail) => <li key={detail} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[#60945a]" />{detail}</li>)}
        </ul>
        <a href="/recursos" className="mt-5 inline-flex items-center gap-1 text-sm font-bold text-[#8a4d2b]">Explorar todos os recursos <ArrowRight className="h-3.5 w-3.5" /></a>
      </div>
    </details>
  );
}

const moments = [
  { step: "01", title: "Organize a sua agenda", text: "Cadastre serviços, horários e clientes. O dia deixa de depender da memória.", icon: CalendarCheck2 },
  { step: "02", title: "Atenda sem correria", text: "Confirmações, sinais e lembretes ficam no fluxo certo, sem repetir trabalho.", icon: MessageCircleMore },
  { step: "03", title: "Acompanhe o que acontece", text: "Veja o que entrou, o que falta e quais clientes precisam de atenção.", icon: CircleDollarSign },
];

function Logo() {
  return (
    <a href="/" className="inline-flex items-center" aria-label="Hubly — Página inicial">
      <img src={HUBLY_LOGO_URL} alt="Hubly" className="h-9 w-auto object-contain" />
    </a>
  );
}

function SiteHeader() {
  const [open, setOpen] = useState(false);
  const links = [
    ["Recursos", "/recursos"],
    ["Como funciona", "/como-funciona"],
    ["Para seu negócio", "/para-seu-negocio"],
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-[#e9ded2]/80 bg-[#fffaf4]/90 backdrop-blur-xl">
      <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between px-5 lg:px-8">
        <Logo />
        <nav className="hidden items-center gap-8 text-sm font-semibold text-[#725f54] md:flex" aria-label="Navegação principal">
          {links.map(([label, href]) => (
            <a key={href} href={href} className="transition-colors hover:text-[#3b2115]">{label}</a>
          ))}
        </nav>
        <div className="hidden items-center gap-3 md:flex">
          <Button asChild variant="ghost" className="font-bold text-[#5f4a3c] hover:bg-[#f4ece3] hover:text-[#2c1a12]"><a href="/admin">Entrar</a></Button>
          <Button asChild className="rounded-xl bg-[#3b2115] px-5 font-bold text-white shadow-[0_10px_20px_rgba(59,33,21,0.18)] transition-transform hover:-translate-y-0.5 hover:bg-[#5a351e]"><a href="/admin">Começar agora <ArrowRight className="ml-2 h-4 w-4" /></a></Button>
        </div>
        <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setOpen(!open)} aria-label={open ? "Fechar menu" : "Abrir menu"}>{open ? <X /> : <Menu />}</Button>
      </div>
      {open && (
        <div className="border-t border-[#eee2d7] bg-[#fffaf4] px-5 pb-5 pt-3 md:hidden">
          <nav className="grid gap-1" aria-label="Navegação móvel">
            {links.map(([label, href]) => <a key={href} href={href} className="rounded-xl px-3 py-3 font-semibold text-[#4b3325] hover:bg-[#f4ece3]">{label}</a>)}
            <a href="/admin" className="mt-2 rounded-xl bg-[#3b2115] px-4 py-3 text-center font-bold text-white">Começar agora</a>
          </nav>
        </div>
      )}
    </header>
  );
}

function ProductWindow() {
  return (
    <div className="relative mx-auto w-full max-w-[570px] rounded-[28px] border border-[#3b2115]/10 bg-[#fffdf9] p-2 shadow-[0_28px_70px_rgba(59,33,21,0.18)]">
      <div className="overflow-hidden rounded-[21px] border border-[#eadfd4] bg-[#fdf9f4]">
        <div className="flex h-11 items-center justify-between border-b border-[#eee2d7] bg-white px-4">
          <div className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-[#ee9a7c]" /><span className="h-2.5 w-2.5 rounded-full bg-[#f3ca5d]" /><span className="h-2.5 w-2.5 rounded-full bg-[#83bb9b]" /></div>
          <span className="text-[10px] font-bold tracking-wide text-[#a08d80]">hubly.app</span>
          <span className="w-10" />
        </div>
        <div className="grid min-h-[345px] grid-cols-[142px_1fr]">
          <aside className="hidden border-r border-[#eee2d7] bg-[#fffdf9] p-4 sm:block">
            <div className="mb-6 flex items-center gap-2 text-xs font-black text-[#3b2115]"><span className="h-6 w-6 rounded-lg bg-[#3b2115]" /> hubly</div>
            {["Visão geral", "Agenda", "Clientes", "Financeiro", "Automações"].map((item, i) => <div key={item} className={`mb-2 rounded-lg px-2.5 py-2 text-[11px] font-semibold ${i === 0 ? "bg-[#f4e6d8] text-[#65391f]" : "text-[#9c897b]"}`}>{item}</div>)}
          </aside>
          <main className="p-4 sm:p-5">
            <div className="mb-5 flex items-start justify-between"><div><p className="text-[11px] font-semibold text-[#9c897b]">Terça-feira, 18 de agosto</p><h3 className="mt-1 text-lg font-extrabold tracking-tight text-[#2c1a12]">Sua rotina, mais leve.</h3></div><span className="rounded-full bg-[#e6f3e7] px-2.5 py-1 text-[10px] font-bold text-[#398052]">Tudo em dia</span></div>
            <div className="mb-4 grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-[#f6ebdf] p-2.5"><p className="text-[9px] font-semibold text-[#8c6b55]">Hoje</p><p className="mt-1 text-lg font-black text-[#3b2115]">08</p><p className="text-[9px] text-[#997e6c]">atendimentos</p></div>
              <div className="rounded-xl bg-[#eef4e8] p-2.5"><p className="text-[9px] font-semibold text-[#6c8460]">Recebido</p><p className="mt-1 text-lg font-black text-[#355a3d]">R$ 860</p><p className="text-[9px] text-[#759271]">este mês</p></div>
              <div className="rounded-xl bg-[#f8f0d8] p-2.5"><p className="text-[9px] font-semibold text-[#93792e]">Clientes</p><p className="mt-1 text-lg font-black text-[#6e5810]">124</p><p className="text-[9px] text-[#a28e4d]">ativos</p></div>
            </div>
            <div className="rounded-xl border border-[#ede3d9] bg-white p-3">
              <div className="mb-3 flex items-center justify-between"><p className="text-[11px] font-extrabold text-[#493225]">Agenda de hoje</p><span className="text-[10px] font-bold text-[#9b5c31]">Ver agenda</span></div>
              {["09:00  ·  Ana Luísa", "11:30  ·  Beatriz M.", "15:00  ·  Camila R."].map((slot, i) => <div key={slot} className="mb-2 flex items-center gap-2 last:mb-0"><span className={`h-7 w-1 rounded-full ${["bg-[#dd9b65]", "bg-[#8eb27c]", "bg-[#b497d1]"][i]}`} /><p className="text-[10px] font-semibold text-[#604a3b]">{slot}</p><span className="ml-auto rounded-full bg-[#f5f0ea] px-1.5 py-0.5 text-[8px] font-bold text-[#927b6b]">Confirmado</span></div>)}
            </div>
          </main>
        </div>
      </div>
      <div className="absolute -bottom-6 -left-8 hidden max-w-[205px] rounded-2xl border border-[#f5e6c0] bg-[#fff9eb] p-3 shadow-[0_14px_34px_rgba(90,56,24,0.16)] sm:block"><div className="flex items-center gap-2"><span className="grid h-7 w-7 place-items-center rounded-full bg-[#f6d777] text-[#755517]"><Zap className="h-3.5 w-3.5" /></span><div><p className="text-[10px] font-extrabold text-[#493225]">Confirmação enviada</p><p className="text-[9px] text-[#927b6b]">Cliente respondeu agora</p></div></div></div>
    </div>
  );
}

function HomeContent() {
  return (
    <>
      <section className="relative overflow-hidden bg-[#fffaf4] pb-16 pt-12 sm:pb-24 sm:pt-20">
        <div className="pointer-events-none absolute left-[8%] top-[-28%] h-[500px] w-[500px] rounded-full bg-[#f4d7b9]/45 blur-3xl" />
        <div className="pointer-events-none absolute right-[-8%] top-[20%] h-[380px] w-[380px] rounded-full bg-[#efdc8d]/30 blur-3xl" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 lg:grid-cols-[1.02fr_.98fr] lg:px-8">
          <div className="max-w-xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#e9dac9] bg-white/80 px-3.5 py-2 text-xs font-bold text-[#78563f]"><Sparkles className="h-3.5 w-3.5 text-[#b87a2f]" /> Gestão feita para quem faz acontecer</div>
            <h1 className="max-w-2xl text-[2.7rem] font-extrabold leading-[1.03] tracking-[-0.065em] text-[#2c1a12] sm:text-6xl lg:text-[4.3rem]">Seu negócio não precisa ser uma bagunça <span className="text-[#a65d32]">para crescer.</span></h1>
            <p className="mt-6 max-w-lg text-base leading-relaxed text-[#705e52] sm:text-lg">Organize agenda, clientes, pagamentos e mensagens em um só lugar — pelo celular e do seu jeito.</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row"><Button asChild size="lg" className="h-12 rounded-xl bg-[#3b2115] px-6 text-sm font-bold shadow-[0_14px_28px_rgba(59,33,21,0.2)] hover:bg-[#57321d]"><a href="/admin">Começar agora <ArrowRight className="ml-2 h-4 w-4" /></a></Button><Button asChild size="lg" variant="outline" className="h-12 rounded-xl border-[#d9cabb] bg-white/70 px-6 text-sm font-bold text-[#4d3325] hover:bg-white"><a href="#como-funciona"><Play className="mr-2 h-4 w-4 fill-current" /> Ver como funciona</a></Button></div>
            <div className="mt-8 flex flex-wrap gap-x-5 gap-y-3 text-xs font-semibold text-[#756156]"><span className="inline-flex items-center gap-1.5"><Check className="h-4 w-4 text-[#5f9a59]" /> Feito para serviços</span><span className="inline-flex items-center gap-1.5"><Check className="h-4 w-4 text-[#5f9a59]" /> Funciona no celular</span><span className="inline-flex items-center gap-1.5"><Check className="h-4 w-4 text-[#5f9a59]" /> Tudo no mesmo lugar</span></div>
          </div>
          <div className="relative min-h-[390px] lg:min-h-[500px]">
            <div className="absolute inset-x-0 top-0 mx-auto h-[330px] max-w-[520px] overflow-hidden rounded-[32px] border border-white/80 shadow-[0_28px_70px_rgba(74,38,16,0.16)] lg:left-14 lg:right-auto"><img src={HERO_IMAGE} alt="Empreendedora de serviços organizando o negócio pelo celular" className="h-full w-full object-cover object-[70%_center]" /></div>
            <div className="absolute bottom-0 left-0 right-0 mx-auto"><ProductWindow /></div>
          </div>
        </div>
      </section>

      <section className="border-y border-[#eee2d7] bg-[#fffdf9] py-6"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-10 gap-y-3 px-5 text-center text-xs font-bold text-[#8d7666]"><span>AGENDA</span><span className="h-1 w-1 rounded-full bg-[#c4985f]" /><span>CLIENTES</span><span className="h-1 w-1 rounded-full bg-[#c4985f]" /><span>FINANCEIRO</span><span className="h-1 w-1 rounded-full bg-[#c4985f]" /><span>AUTOMAÇÕES</span><span className="h-1 w-1 rounded-full bg-[#c4985f]" /><span>MARKETING</span></div></section>

      <section className="bg-[#fffaf4] py-20 sm:py-28"><div className="mx-auto max-w-7xl px-5 lg:px-8"><div className="max-w-2xl"><p className="text-sm font-extrabold uppercase tracking-[0.16em] text-[#a65d32]">Reconhece essa rotina?</p><h2 className="mt-3 text-3xl font-extrabold tracking-[-0.05em] text-[#2c1a12] sm:text-5xl">Você trabalha muito. A gestão não precisa virar mais um trabalho.</h2><p className="mt-5 text-base leading-relaxed text-[#735f52]">O Hubly tira as tarefas repetitivas do caminho para você olhar com calma para o que faz seu negócio crescer.</p></div><div className="mt-12 grid gap-4 md:grid-cols-2"><div className="rounded-3xl bg-[#3b2115] p-7 text-[#fff8f0] sm:p-9"><p className="text-sm font-bold text-[#f7d187]">Antes</p><p className="mt-5 text-2xl font-bold leading-tight">“Eu confirmo tudo no WhatsApp e, mesmo assim, tem cliente que esquece.”</p><div className="mt-8 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-xs font-semibold text-[#eadcd1]"><Clock3 className="h-3.5 w-3.5" /> Tempo indo embora</div></div><div className="rounded-3xl border border-[#eaded2] bg-white p-7 sm:p-9"><p className="text-sm font-bold text-[#60945a]">Com o Hubly</p><p className="mt-5 text-2xl font-bold leading-tight text-[#38231a]">“Minha agenda confirma, eu acompanho e consigo atender melhor.”</p><div className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#edf5e9] px-3 py-2 text-xs font-semibold text-[#5a8655]"><BadgeCheck className="h-3.5 w-3.5" /> Rotina organizada</div></div></div></div></section>

      <section id="recursos" className="bg-[#f8f1e9] py-20 sm:py-28"><div className="mx-auto max-w-7xl px-5 lg:px-8"><div className="flex flex-col justify-between gap-5 md:flex-row md:items-end"><div className="max-w-2xl"><p className="text-sm font-extrabold uppercase tracking-[0.16em] text-[#a65d32]">O que você resolve</p><h2 className="mt-3 text-3xl font-extrabold tracking-[-0.05em] text-[#2c1a12] sm:text-5xl">Uma visão simples para uma rotina que tem muita coisa acontecendo.</h2><p className="mt-4 text-sm font-semibold text-[#846d5c]">Clique em cada card para ver o que ele resolve no seu dia a dia.</p></div><a className="inline-flex items-center gap-1 text-sm font-bold text-[#6b4028] hover:text-[#a65d32]" href="/recursos">Conhecer todos os recursos <ChevronRight className="h-4 w-4" /></a></div><div className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-4">{pillars.map((resource) => <ResourceCard key={resource.title} resource={resource} />)}</div></div></section>

      <section id="como-funciona" className="bg-[#fffdf9] py-20 sm:py-28"><div className="mx-auto grid max-w-7xl gap-14 px-5 lg:grid-cols-[.85fr_1.15fr] lg:px-8"><div><p className="text-sm font-extrabold uppercase tracking-[0.16em] text-[#a65d32]">Um passo de cada vez</p><h2 className="mt-3 text-3xl font-extrabold tracking-[-0.05em] text-[#2c1a12] sm:text-5xl">Comece pela agenda. O Hubly cresce com você.</h2><p className="mt-5 text-base leading-relaxed text-[#735f52]">Não precisa mudar tudo de uma vez. Configure o essencial, ganhe clareza no dia a dia e adicione novas ferramentas quando fizer sentido.</p><Button asChild variant="outline" className="mt-8 rounded-xl border-[#d8c7b7] bg-white font-bold text-[#4b3020] hover:bg-[#f8f1e9]"><a href="/como-funciona">Ver a rotina completa <ArrowRight className="ml-2 h-4 w-4" /></a></Button></div><div className="space-y-3">{moments.map(({ step, title, text, icon: Icon }) => <article key={step} className="flex gap-5 rounded-3xl border border-[#eaded2] bg-white p-5 sm:p-6"><span className="pt-0.5 text-sm font-black text-[#b17b50]">{step}</span><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-3"><h3 className="text-lg font-extrabold text-[#352217]">{title}</h3><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#f7ece2] text-[#8a4d2b]"><Icon className="h-4 w-4" /></span></div><p className="mt-2 text-sm leading-relaxed text-[#796659]">{text}</p></div></article>)}</div></div></section>

      <section className="overflow-hidden bg-[#3b2115] py-20 text-white sm:py-28"><div className="mx-auto max-w-7xl px-5 lg:px-8"><div className="grid gap-12 lg:grid-cols-[1.05fr_.95fr] lg:items-center"><div><p className="text-sm font-extrabold uppercase tracking-[0.16em] text-[#f2c870]">Feito para serviços</p><h2 className="mt-3 text-3xl font-extrabold tracking-[-0.05em] sm:text-5xl">Você entende do seu atendimento. O Hubly entende da sua rotina.</h2><p className="mt-5 max-w-xl text-base leading-relaxed text-[#e6d7cc]">Beleza, estética, barbearia, bem-estar, consultoria e outros serviços. Cada negócio tem seu jeito, mas todos precisam de tempo para fazer o que fazem bem.</p><Button asChild className="mt-8 rounded-xl bg-[#f5d77a] px-6 font-bold text-[#432815] hover:bg-[#ffe493]"><a href="/para-seu-negocio">Ver para o meu negócio <ArrowRight className="ml-2 h-4 w-4" /></a></Button></div><div className="grid gap-3 sm:grid-cols-2"><div className="rounded-3xl bg-white/10 p-6"><p className="text-xl font-extrabold">Beleza & estética</p><p className="mt-2 text-sm text-[#e1d2c7]">Agenda, sinal, pacotes e relacionamento no ritmo da sua cliente.</p></div><div className="rounded-3xl bg-white/10 p-6"><p className="text-xl font-extrabold">Barbearia</p><p className="mt-2 text-sm text-[#e1d2c7]">Mais fluidez entre horários, equipe e atendimento recorrente.</p></div><div className="rounded-3xl bg-white/10 p-6 sm:col-span-2"><p className="text-xl font-extrabold">Profissionais de serviço</p><p className="mt-2 text-sm text-[#e1d2c7]">Para quem atende, administra e quer crescer sem se perder no processo.</p></div></div></div></div></section>

      <section className="bg-[#fffaf4] py-20 sm:py-28"><div className="mx-auto max-w-4xl px-5 text-center"><span className="inline-flex items-center gap-2 rounded-full bg-[#f7ead5] px-4 py-2 text-xs font-extrabold text-[#91501f]"><Sparkles className="h-3.5 w-3.5" /> Gestão sem complicação</span><h2 className="mx-auto mt-5 max-w-3xl text-4xl font-extrabold tracking-[-0.06em] text-[#2c1a12] sm:text-6xl">Organize hoje. Cresça com mais calma amanhã.</h2><p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-[#735f52]">Crie sua conta, coloque a agenda para funcionar e descubra quanto mais leve pode ser gerir o seu negócio.</p><Button asChild size="lg" className="mt-8 h-12 rounded-xl bg-[#3b2115] px-7 font-bold shadow-[0_14px_28px_rgba(59,33,21,0.2)] hover:bg-[#57321d]"><a href="/admin">Começar agora <ArrowRight className="ml-2 h-4 w-4" /></a></Button></div></section>
    </>
  );
}

const supportDetails: Record<Exclude<PublicPage, "inicio">, { label: string; title: string; text: string; icon: typeof CalendarCheck2 }[]> = {
  recursos: [
    { label: "Atendimento", title: "Agenda que evita desencontros", text: "Visualize o dia, bloqueie horários, identifique conflitos e trate pré-agendamentos sem perder informações pelo caminho.", icon: CalendarCheck2 },
    { label: "Relacionamento", title: "Cliente lembrado na hora certa", text: "Centralize histórico, confirmações, retorno e Pipeline para que cada conversa tenha continuidade.", icon: UsersRound },
    { label: "Resultado", title: "Financeiro que acompanha sua rotina", text: "Controle sinais, pagamentos parciais, valores em aberto e recebimentos sem planilhas paralelas.", icon: CircleDollarSign },
    { label: "Automação", title: "Mensagens com contexto", text: "Programe confirmações e lembretes que respeitam o momento do agendamento e deixam sua comunicação mais consistente.", icon: MessageCircleMore },
    { label: "Crescimento", title: "Pacotes, equipe e permissões", text: "Acompanhe serviços recorrentes, distribua a operação e mantenha cada pessoa com o acesso que precisa.", icon: Sparkles },
    { label: "Decisão", title: "Insights para não trabalhar no escuro", text: "Use os dados de agenda, clientes e financeiro para entender o que merece mais atenção no seu negócio.", icon: Zap },
  ],
  "como-funciona": [
    { label: "Primeiro passo", title: "Configure o essencial", text: "Cadastre seus serviços, horários e profissionais para que a agenda reflita a sua operação real.", icon: CalendarCheck2 },
    { label: "Segundo passo", title: "Traga a rotina para um só lugar", text: "Crie agendamentos, acompanhe clientes e organize recebimentos sem alternar entre agenda, papel e conversa.", icon: UsersRound },
    { label: "Terceiro passo", title: "Ative o que poupa seu tempo", text: "Quando estiver pronto, use confirmação, automações, pacotes e relatórios para reduzir tarefas repetitivas.", icon: MessageCircleMore },
  ],
  negocios: [
    { label: "Beleza e estética", title: "Mais tempo para cuidar da cliente", text: "Do primeiro contato ao retorno, mantenha agenda, sinal, pacotes e histórico organizados com leveza.", icon: Sparkles },
    { label: "Barbearia", title: "Fluxo rápido para uma agenda dinâmica", text: "Acompanhe horários, equipe e clientes recorrentes sem depender de conversa espalhada.", icon: CalendarCheck2 },
    { label: "Serviços profissionais", title: "Gestão para quem atende e administra", text: "Organize seu tempo, seus clientes e o financeiro sem criar um processo difícil de manter.", icon: CircleDollarSign },
  ],
};

function SupportPage({ page }: { page: Exclude<PublicPage, "inicio"> }) {
  const intro = pageCopy[page];
  const details = supportDetails[page];
  const isWorkflow = page === "como-funciona";
  return <><section className="relative overflow-hidden bg-[#fffaf4] py-20 sm:py-28"><div className="absolute right-[-6rem] top-[-8rem] h-80 w-80 rounded-full bg-[#f6d777]/30 blur-3xl" /><div className="relative mx-auto max-w-4xl px-5 text-center"><p className="text-sm font-extrabold uppercase tracking-[0.16em] text-[#a65d32]">{intro.eyebrow}</p><h1 className="mt-4 text-4xl font-extrabold tracking-[-0.06em] text-[#2c1a12] sm:text-6xl">{intro.title}</h1><p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-[#735f52] sm:text-lg">{intro.description}</p><Button asChild className="mt-8 rounded-xl bg-[#3b2115] px-6 font-bold hover:bg-[#57321d]"><a href="/admin">Começar agora <ArrowRight className="ml-2 h-4 w-4" /></a></Button></div></section><section className="bg-[#f8f1e9] py-16 sm:py-24"><div className="mx-auto max-w-6xl px-5"><div className={`grid gap-4 ${isWorkflow ? "md:grid-cols-3" : "md:grid-cols-2 lg:grid-cols-3"}`}>{details.map(({ label, title, text, icon: Icon }, index) => <article key={title} className="group rounded-3xl border border-[#eaded2] bg-white p-6 transition-transform hover:-translate-y-1"><div className="flex items-center justify-between"><span className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#a65d32]">{isWorkflow ? `Passo ${index + 1}` : label}</span><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#f6ebdf] text-[#8a4d2b]"><Icon className="h-5 w-5" /></span></div><h2 className="mt-7 text-2xl font-extrabold tracking-[-0.04em] text-[#352217]">{title}</h2><p className="mt-3 text-sm leading-relaxed text-[#796659]">{text}</p></article>)}</div></div></section><section className="bg-[#fffdf9] py-16"><div className="mx-auto flex max-w-5xl flex-col items-center gap-6 px-5 text-center"><p className="max-w-2xl text-xl font-bold tracking-[-0.03em] text-[#3b2115]">O Hubly foi pensado para deixar a gestão mais simples, não para colocar mais uma ferramenta complicada na sua rotina.</p><Button asChild variant="outline" className="rounded-xl border-[#d7c5b5] bg-white px-6 font-bold text-[#4d3325] hover:bg-[#f8f1e9]"><a href="/">Voltar para o início <ArrowRight className="ml-2 h-4 w-4" /></a></Button></div></section></>;
}

export default function SitePublico({ page = "inicio" }: { page?: PublicPage }) {
  useEffect(() => { document.title = page === "inicio" ? "Hubly — Você no controle" : `${pageCopy[page].title} | Hubly`; }, [page]);
  return <div className="min-h-screen bg-[#fffaf4] font-['Plus_Jakarta_Sans'] text-[#2c1a12]"><SiteHeader />{page === "inicio" ? <HomeContent /> : <SupportPage page={page} />}<footer className="border-t border-[#eaded2] bg-[#fffdf9]"><div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-10 text-sm text-[#7a675a] sm:flex-row sm:items-center sm:justify-between lg:px-8"><Logo /><div className="flex flex-wrap gap-x-5 gap-y-2"><a href="/politica-de-privacidade" className="hover:text-[#3b2115]">Privacidade</a><a href="/termos-de-uso" className="hover:text-[#3b2115]">Termos de uso</a><a href="/admin" className="hover:text-[#3b2115]">Entrar na plataforma</a></div><p>© {new Date().getFullYear()} Hubly</p></div></footer></div>;
}
