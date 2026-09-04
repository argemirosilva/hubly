import { useEffect, useMemo, useState } from "react";
import { useLocation, useSearch } from "wouter";
import {
  ArrowLeft,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  CreditCard,
  FileText,
  Package,
  ReceiptText,
  TrendingUp,
  UsersRound,
  WalletCards,
  Wrench,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";

type Visao = "recebimentos" | "servicos" | "pacotes" | "profissionais" | "pagamentos";
type Periodo = "semana" | "mes" | "ano" | "custom";

const moeda = (valor: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor || 0);
const paraDataLocal = (data: Date) => `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}-${String(data.getDate()).padStart(2, "0")}`;
const hoje = () => paraDataLocal(new Date());
const inicioMes = () => { const data = new Date(); data.setDate(1); return paraDataLocal(data); };
const inicioSemana = () => { const data = new Date(); data.setDate(data.getDate() - ((data.getDay() + 6) % 7)); return paraDataLocal(data); };
const inicioAno = () => `${new Date().getFullYear()}-01-01`;
const dataCurta = (valor?: string | Date | null) => valor ? new Date(`${String(valor).slice(0, 10)}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }) : "Data não informada";

const visoes: Array<{ id: Visao; titulo: string; descricao: string; base: string; icone: typeof Wrench }> = [
  { id: "recebimentos", titulo: "Recebidos", descricao: "Entradas baixadas no período", base: "Contas recebidas", icone: WalletCards },
  { id: "servicos", titulo: "Serviços", descricao: "Atendimentos concluídos", base: "Faturamento concluído", icone: Wrench },
  { id: "pacotes", titulo: "Pacotes", descricao: "Vendas e saldo contratados", base: "Pacotes abertos", icone: Package },
  { id: "profissionais", titulo: "Profissionais", descricao: "Produção e comissão", base: "Produção concluída", icone: UsersRound },
  { id: "pagamentos", titulo: "Pagamentos", descricao: "Entradas por forma", base: "Pagamentos registrados", icone: CreditCard },
];

function visaoValida(valor: string | null): valor is Visao {
  return visoes.some(visao => visao.id === valor);
}

type Props = { paginaDedicada?: boolean; compacta?: boolean };

export function AnaliseFinanceiraDetalhada({ paginaDedicada = false, compacta = false }: Props) {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const parametros = useMemo(() => new URLSearchParams(search), [search]);
  const visaoDaUrl = parametros.get("visao");
  const periodoDaUrl = parametros.get("periodo");
  const focoDaUrl = parametros.get("foco");
  const [visao, setVisao] = useState<Visao>(() => visaoValida(visaoDaUrl) ? visaoDaUrl : "recebimentos");
  const [periodo, setPeriodo] = useState<Periodo>(() => periodoDaUrl === "semana" || periodoDaUrl === "ano" || periodoDaUrl === "custom" ? periodoDaUrl : "mes");
  const [dataInicio, setDataInicio] = useState(() => parametros.get("inicio") ?? (periodoDaUrl === "semana" ? inicioSemana() : periodoDaUrl === "ano" ? inicioAno() : inicioMes()));
  const [dataFim, setDataFim] = useState(() => parametros.get("fim") ?? hoje());
  const [registroSelecionado, setRegistroSelecionado] = useState<any | null>(null);
  const { data, isLoading } = trpc.analiseFinanceira.resumo.useQuery({ dataInicio, dataFim });

  useEffect(() => {
    if (!paginaDedicada) return;
    const proximoPeriodo = parametros.get("periodo");
    const visaoSolicitada = parametros.get("visao");
    setVisao(visaoValida(visaoSolicitada) ? visaoSolicitada : "recebimentos");
    setPeriodo(proximoPeriodo === "semana" || proximoPeriodo === "ano" || proximoPeriodo === "custom" ? proximoPeriodo : "mes");
    setDataInicio(parametros.get("inicio") ?? (proximoPeriodo === "semana" ? inicioSemana() : proximoPeriodo === "ano" ? inicioAno() : inicioMes()));
    setDataFim(parametros.get("fim") ?? hoje());
    setRegistroSelecionado(null);
  }, [paginaDedicada, search]);

  const atualizarUrl = (proximaVisao: Visao, proximoPeriodo: Periodo, inicio: string, fim: string, foco?: string) => {
    const query = new URLSearchParams({ visao: proximaVisao, periodo: proximoPeriodo, inicio, fim });
    if (foco) query.set("foco", foco);
    setLocation(`/admin/financeiro/analise?${query.toString()}`, { replace: true });
  };

  const aplicarPeriodo = (novoPeriodo: Exclude<Periodo, "custom">) => {
    const inicio = novoPeriodo === "semana" ? inicioSemana() : novoPeriodo === "mes" ? inicioMes() : inicioAno();
    const fim = hoje();
    setPeriodo(novoPeriodo);
    setDataInicio(inicio);
    setDataFim(fim);
    atualizarUrl(visao, novoPeriodo, inicio, fim, focoDaUrl ?? undefined);
  };

  const abrirAnalise = (proximaVisao: Visao, foco?: string, proximoPeriodo: Periodo = "mes", inicio = inicioMes(), fim = hoje()) => {
    const query = new URLSearchParams({ visao: proximaVisao, periodo: proximoPeriodo, inicio, fim });
    if (foco) query.set("foco", foco);
    setLocation(`/admin/financeiro/analise?${query.toString()}`);
  };

  const tituloPeriodo = useMemo(() => `${dataCurta(dataInicio)} a ${dataCurta(dataFim)}`, [dataInicio, dataFim]);
  const configuracaoAtual = visoes.find(item => item.id === visao) ?? visoes[0];
  const dadosDaVisao = useMemo(() => selecionarDados(visao, data, focoDaUrl), [data, focoDaUrl, visao]);
  const resumoDaVisao = useMemo(() => montarResumo(visao, data, dadosDaVisao), [visao, data, dadosDaVisao]);

  if (compacta) {
    const maiorPagamento = data?.pagamentos?.[0];
    return (
      <section className="card-elegant overflow-hidden animate-in-up" aria-labelledby="resumo-analise-financeira-titulo">
        <div className="flex items-start justify-between gap-3 px-4 pt-4 lg:px-5 lg:pt-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">Panorama comercial</p>
            <h2 id="resumo-analise-financeira-titulo" className="mt-1 text-base font-semibold">Resultados deste mês</h2>
            <p className="mt-1 text-xs text-muted-foreground">Abra um indicador para consultar os registros que formam o resultado.</p>
          </div>
          <Button type="button" variant="ghost" size="sm" className="h-8 shrink-0 text-xs" onClick={() => abrirAnalise("recebimentos")}>Ver relatório <ChevronRight className="ml-1 h-3.5 w-3.5" /></Button>
        </div>
        <div className="mt-4 grid grid-cols-2 border-t border-border/70 lg:grid-cols-4">
          <IndicadorCompacto etiqueta="Valores recebidos" valor={data ? moeda(data.totais.valoresRecebidos) : "—"} legenda="Baixas registradas" icone={WalletCards} aoClicar={() => abrirAnalise("recebimentos")} />
          <IndicadorCompacto etiqueta="Serviço líder" valor={data?.servicos?.[0]?.nome ?? "Sem vendas"} legenda={data?.servicos?.[0] ? moeda(data.servicos[0].faturamento) : "Sem atendimento concluído"} icone={Wrench} aoClicar={() => abrirAnalise("servicos", data?.servicos?.[0] ? String(data.servicos[0].servicoId) : undefined)} />
          <IndicadorCompacto etiqueta="Profissional líder" valor={data?.profissionais?.[0]?.nome ?? "—"} legenda={data?.profissionais?.[0] ? moeda(data.profissionais[0].bruto) : "Sem produção concluída"} icone={UsersRound} aoClicar={() => abrirAnalise("profissionais", data?.profissionais?.[0] ? String(data.profissionais[0].profissionalId) : undefined)} />
          <IndicadorCompacto etiqueta="Maior forma de pagamento" valor={maiorPagamento?.forma ?? "Sem entradas"} legenda={maiorPagamento ? moeda(maiorPagamento.recebido) : "Sem pagamento registrado"} icone={CreditCard} aoClicar={() => abrirAnalise("pagamentos", maiorPagamento?.forma)} />
        </div>
      </section>
    );
  }

  return (
    <section className={`${paginaDedicada ? "mx-auto max-w-6xl p-4 lg:p-6" : "card-elegant p-4 lg:p-5"} space-y-5 animate-in-up`} aria-labelledby="analise-financeira-titulo">
      {paginaDedicada && <Button type="button" variant="ghost" size="sm" className="-ml-2 text-muted-foreground" onClick={() => setLocation("/admin/financeiro")}><ArrowLeft className="mr-1.5 h-4 w-4" />Voltar ao Financeiro</Button>}

      <header className="rounded-2xl border border-border/70 bg-gradient-to-br from-primary/[0.09] via-background to-background px-4 py-5 sm:px-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-xl">
            <div className="flex items-center gap-2 text-primary"><BarChart3 className="h-4 w-4" /><span className="text-[11px] font-semibold uppercase tracking-[0.14em]">Relatório financeiro</span></div>
            <h1 id="analise-financeira-titulo" className="mt-2 text-xl font-bold tracking-tight">O que aconteceu no seu período</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">Escolha uma visão. O detalhamento abre ao lado, sem transformar a página em uma lista longa.</p>
          </div>
          <div className="rounded-xl border border-border/80 bg-background/80 px-3 py-2 text-xs shadow-sm"><span className="block text-muted-foreground">Período analisado</span><strong className="mt-0.5 block font-semibold text-foreground">{tituloPeriodo}</strong></div>
        </div>
      </header>

      <div className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-card p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1 rounded-xl bg-muted/60 p-1" role="group" aria-label="Período de análise">
          {(["semana", "mes", "ano"] as const).map(item => <Button key={item} type="button" size="sm" variant={periodo === item ? "default" : "ghost"} className="h-8 rounded-lg px-3 text-xs" onClick={() => aplicarPeriodo(item)}>{item === "semana" ? "Semana" : item === "mes" ? "Mês" : "Ano"}</Button>)}
          <Button type="button" size="sm" variant={periodo === "custom" ? "default" : "ghost"} className="h-8 rounded-lg px-3 text-xs" onClick={() => { setPeriodo("custom"); atualizarUrl(visao, "custom", dataInicio, dataFim, focoDaUrl ?? undefined); }}><CalendarDays className="mr-1 h-3.5 w-3.5" />Personalizar</Button>
        </div>
        <span className="text-xs text-muted-foreground">{isLoading ? "Atualizando dados…" : configuracaoAtual.base}</span>
      </div>

      {periodo === "custom" && <div className="grid grid-cols-1 gap-3 rounded-2xl border border-border/70 bg-muted/20 p-3 sm:grid-cols-2"><CampoData etiqueta="Data inicial" valor={dataInicio} aoMudar={valor => { setDataInicio(valor); atualizarUrl(visao, "custom", valor, dataFim, focoDaUrl ?? undefined); }} /><CampoData etiqueta="Data final" valor={dataFim} aoMudar={valor => { setDataFim(valor); atualizarUrl(visao, "custom", dataInicio, valor, focoDaUrl ?? undefined); }} /></div>}

      <nav className="grid grid-cols-2 gap-2 lg:grid-cols-5" aria-label="Visões de análise financeira">
        {visoes.map(item => {
          const Icone = item.icone;
          const ativa = item.id === visao;
          return <button type="button" key={item.id} onClick={() => { setVisao(item.id); setRegistroSelecionado(null); atualizarUrl(item.id, periodo, dataInicio, dataFim); }} className={`group min-h-[92px] rounded-2xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${ativa ? "border-primary bg-primary text-primary-foreground shadow-sm" : "border-border/80 bg-card hover:border-primary/35 hover:bg-primary/[0.035]"}`}>
            <Icone className={`mb-3 h-4 w-4 ${ativa ? "text-primary-foreground" : "text-primary"}`} />
            <span className="block text-sm font-semibold">{item.titulo}</span>
            <span className={`mt-0.5 block text-[11px] leading-snug ${ativa ? "text-primary-foreground/80" : "text-muted-foreground"}`}>{item.descricao}</span>
          </button>;
        })}
      </nav>

      <section className="overflow-hidden rounded-2xl border border-border/80 bg-card" aria-labelledby="ranking-financeiro-titulo">
        <div className="flex flex-col gap-3 border-b border-border/70 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.13em] text-primary">{configuracaoAtual.base}</p>
            <h2 id="ranking-financeiro-titulo" className="mt-1 text-base font-semibold">{resumoDaVisao.titulo}</h2>
            <p className="mt-1 text-xs text-muted-foreground">{resumoDaVisao.descricao}</p>
          </div>
          <div className="rounded-xl bg-muted/50 px-3 py-2 text-right"><p className="text-[10px] text-muted-foreground">{resumoDaVisao.etiqueta}</p><p className="text-base font-bold tracking-tight">{resumoDaVisao.valor}</p></div>
        </div>

        {focoDaUrl && <div className="flex items-center justify-between border-b border-border/70 bg-primary/[0.035] px-4 py-2"><span className="text-xs text-muted-foreground">Mostrando somente o recorte selecionado</span><Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => atualizarUrl(visao, periodo, dataInicio, dataFim)}>Limpar recorte</Button></div>}

        {isLoading ? <CarregandoRanking /> : dadosDaVisao.length ? <div className="divide-y divide-border/70">{dadosDaVisao.map((item: any, index: number) => <LinhaRanking key={item.chave} indice={index} item={item} visao={visao} aoAbrir={() => setRegistroSelecionado(item)} />)}</div> : <EstadoVazio visao={visao} onVerMes={() => aplicarPeriodo("mes")} />}
      </section>

      <p className="px-1 text-[11px] leading-relaxed text-muted-foreground">{notaDaBase(visao)} Os valores são calculados apenas dentro do período selecionado.</p>

      <DetalheLateral registro={registroSelecionado} visao={visao} data={data} periodo={tituloPeriodo} aoFechar={() => setRegistroSelecionado(null)} />
    </section>
  );
}

function IndicadorCompacto({ etiqueta, valor, legenda, icone: Icone, aoClicar }: { etiqueta: string; valor: string; legenda: string; icone: typeof Wrench; aoClicar: () => void }) {
  return <button type="button" onClick={aoClicar} className="group min-h-[118px] border-b border-r border-border/70 p-3 text-left transition-colors hover:bg-primary/[0.045] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary lg:border-b-0 lg:p-4"><Icone className="mb-3 h-4 w-4 text-primary" /><p className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">{etiqueta}</p><p className="mt-1 truncate text-sm font-bold tracking-tight">{valor}</p><p className="mt-1 truncate text-[11px] text-muted-foreground">{legenda}</p><span className="mt-2 flex items-center gap-1 text-[11px] font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">Ver registros <ArrowUpRight className="h-3 w-3" /></span></button>;
}

function CampoData({ etiqueta, valor, aoMudar }: { etiqueta: string; valor: string; aoMudar: (valor: string) => void }) { return <label className="text-xs font-medium text-muted-foreground">{etiqueta}<Input type="date" value={valor} onChange={event => aoMudar(event.target.value)} className="mt-1.5 h-10 bg-background" /></label>; }

function selecionarDados(visao: Visao, data: any, foco: string | null) {
  if (!data) return [];
  if (visao === "recebimentos") return (data.recebimentos ?? []).filter((item: any) => !foco || String(item.id) === foco).map((item: any) => ({ ...item, chave: `recebimento-${item.id}`, principal: item.descricao || item.cliente || "Recebimento", secundario: `${item.cliente ?? "Cliente não identificado"} · ${dataCurta(item.data)}`, total: Number(item.valor), detalhe: item.origem ?? "Conta a receber" }));
  if (visao === "servicos") return (data.servicos ?? []).filter((item: any) => !foco || String(item.servicoId) === foco).map((item: any) => ({ ...item, chave: `servico-${item.servicoId}`, principal: item.nome, secundario: `${item.quantidade} atendimento${item.quantidade === 1 ? "" : "s"} concluído${item.quantidade === 1 ? "" : "s"}`, total: Number(item.faturamento), detalhe: `Ticket médio ${moeda(item.ticketMedio)}` }));
  if (visao === "pacotes") return (data.pacotes ?? []).filter((item: any) => !foco || String(item.id) === foco).map((item: any) => ({ ...item, chave: `pacote-${item.id}`, principal: item.nome, secundario: item.cliente ?? "Cliente não identificado", total: Number(item.valorTotal), detalhe: `Saldo em aberto ${moeda(item.saldoAberto)}` }));
  if (visao === "profissionais") return (data.profissionais ?? []).filter((item: any) => !foco || String(item.profissionalId) === foco).map((item: any) => ({ ...item, chave: `profissional-${item.profissionalId}`, principal: item.nome, secundario: `${item.atendimentos} atendimento${item.atendimentos === 1 ? "" : "s"} concluído${item.atendimentos === 1 ? "" : "s"}`, total: Number(item.bruto), detalhe: `Comissão ${moeda(item.comissao)}` }));
  return (data.pagamentos ?? []).filter((item: any) => !foco || item.forma === foco).map((item: any) => ({ ...item, chave: `pagamento-${item.forma}`, principal: item.forma, secundario: `${item.quantidade} recebimento${item.quantidade === 1 ? "" : "s"} registrado${item.quantidade === 1 ? "" : "s"}`, total: Number(item.recebido), detalhe: "Entradas registradas" }));
}

function montarResumo(visao: Visao, data: any, itens: any[]) {
  const total = itens.reduce((acumulado, item) => acumulado + Number(item.total ?? 0), 0);
  const configuracoes: Record<Visao, { titulo: string; descricao: string; etiqueta: string; valor: string }> = {
    recebimentos: { titulo: "Recebimentos confirmados", descricao: "Cada linha representa uma conta marcada como recebida.", etiqueta: "Total recebido", valor: moeda(data?.totais?.valoresRecebidos ?? total) },
    servicos: { titulo: "Ranking de serviços", descricao: "Ordenado pelo faturamento de atendimentos concluídos.", etiqueta: "Faturamento", valor: moeda(total) },
    pacotes: { titulo: "Pacotes vendidos", descricao: "Pacotes abertos no período, com situação financeira visível no detalhe.", etiqueta: "Valor contratado", valor: moeda(total) },
    profissionais: { titulo: "Produção por profissional", descricao: "Ordenado pela produção de atendimentos concluídos.", etiqueta: "Produção bruta", valor: moeda(total) },
    pagamentos: { titulo: "Formas de pagamento", descricao: "Cada forma agrupa entradas efetivamente registradas.", etiqueta: "Entradas", valor: moeda(data?.totais?.entradasRegistradas ?? total) },
  };
  return configuracoes[visao];
}

function LinhaRanking({ indice, item, visao, aoAbrir }: { indice: number; item: any; visao: Visao; aoAbrir: () => void }) {
  const Icone = visao === "servicos" ? Wrench : visao === "pacotes" ? Package : visao === "profissionais" ? UsersRound : visao === "pagamentos" ? CreditCard : ReceiptText;
  return <button type="button" onClick={aoAbrir} className="group flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-primary/[0.035] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary sm:px-5"><div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${indice === 0 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{indice + 1}</div><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted/70 text-primary"><Icone className="h-4 w-4" /></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{item.principal}</p><p className="mt-0.5 truncate text-xs text-muted-foreground">{item.secundario}</p></div><div className="hidden text-right sm:block"><p className="text-sm font-bold tracking-tight">{moeda(item.total)}</p><p className="mt-0.5 text-[11px] text-muted-foreground">{item.detalhe}</p></div><ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" /></button>;
}

function EstadoVazio({ visao, onVerMes }: { visao: Visao; onVerMes: () => void }) {
  const titulo: Record<Visao, string> = { recebimentos: "Nenhum recebimento foi baixado neste período.", servicos: "Nenhum atendimento foi concluído neste período.", pacotes: "Nenhum pacote foi aberto neste período.", profissionais: "Não há produção concluída neste período.", pagamentos: "Nenhum pagamento foi registrado neste período." };
  return <div className="flex min-h-56 flex-col items-center justify-center px-5 py-10 text-center"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-muted text-muted-foreground"><BarChart3 className="h-5 w-5" /></div><h3 className="mt-4 text-sm font-semibold">{titulo[visao]}</h3><p className="mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">Tente ampliar o período ou escolha outra visão para continuar a análise.</p><Button type="button" variant="outline" size="sm" className="mt-4" onClick={onVerMes}>Ver mês atual</Button></div>;
}

function CarregandoRanking() { return <div className="space-y-3 p-4 sm:p-5">{[0, 1, 2].map(item => <div key={item} className="flex items-center gap-3"><span className="h-8 w-8 animate-pulse rounded-full bg-muted" /><span className="h-9 w-9 animate-pulse rounded-xl bg-muted" /><span className="flex-1"><span className="block h-3 w-36 animate-pulse rounded bg-muted" /><span className="mt-2 block h-2.5 w-24 animate-pulse rounded bg-muted" /></span><span className="h-4 w-16 animate-pulse rounded bg-muted" /></div>)}</div>; }

function DetalheLateral({ registro, visao, data, periodo, aoFechar }: { registro: any | null; visao: Visao; data: any; periodo: string; aoFechar: () => void }) {
  const detalhes = useMemo(() => registrosDoDetalhe(visao, registro, data), [data, registro, visao]);
  const configuracao = visoes.find(item => item.id === visao) ?? visoes[0];
  return <Sheet open={Boolean(registro)} onOpenChange={aberto => { if (!aberto) aoFechar(); }}><SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-xl"><SheetHeader className="border-b border-border/70 px-5 py-5 pr-12"><div className="flex items-center gap-2 text-primary"><configuracao.icone className="h-4 w-4" /><span className="text-[11px] font-semibold uppercase tracking-[0.13em]">Detalhamento</span></div><SheetTitle className="mt-2 text-lg">{registro?.principal}</SheetTitle><SheetDescription>{periodo}</SheetDescription></SheetHeader>{registro && <><div className="grid grid-cols-2 gap-px border-b border-border/70 bg-border/70"><ResumoDetalhe etiqueta={visao === "servicos" ? "Faturamento" : visao === "pacotes" ? "Valor contratado" : visao === "profissionais" ? "Produção bruta" : "Total"} valor={moeda(registro.total)} /><ResumoDetalhe etiqueta={visao === "recebimentos" ? "Data do recebimento" : visao === "servicos" ? "Ticket médio" : visao === "pacotes" ? "Saldo em aberto" : visao === "profissionais" ? "Comissão" : "Quantidade"} valor={visao === "recebimentos" ? dataCurta(registro.data) : visao === "servicos" ? moeda(registro.ticketMedio) : visao === "pacotes" ? moeda(registro.saldoAberto) : visao === "profissionais" ? moeda(registro.comissao) : String(registro.quantidade)} /></div><ScrollArea className="flex-1"><div className="space-y-4 p-5"><div className="flex items-center justify-between"><div><h3 className="text-sm font-semibold">Registros que compõem este resultado</h3><p className="mt-0.5 text-xs text-muted-foreground">{detalhes.length} registro{detalhes.length === 1 ? "" : "s"} encontrado{detalhes.length === 1 ? "" : "s"}</p></div><Badge variant="secondary" className="font-normal">{configuracao.base}</Badge></div>{detalhes.length ? <div className="space-y-2">{detalhes.map((item: any) => <CartaoRegistro key={item.chave} registro={item} />)}</div> : <div className="rounded-2xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">Não há registros adicionais para este recorte.</div>}</div></ScrollArea></>}</SheetContent></Sheet>;
}

function ResumoDetalhe({ etiqueta, valor }: { etiqueta: string; valor: string }) { return <div className="bg-card px-5 py-4"><p className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">{etiqueta}</p><p className="mt-1 text-sm font-bold tracking-tight">{valor}</p></div>; }

function registrosDoDetalhe(visao: Visao, registro: any, data: any) {
  if (!registro || !data) return [];
  if (visao === "recebimentos") return [registro].map((item: any) => ({ chave: item.chave, titulo: item.principal, linha1: item.cliente ?? "Cliente não identificado", linha2: `${item.origem ?? "Conta a receber"} · ${dataCurta(item.data)}`, valor: item.total, chip: item.forma ?? "Recebido" }));
  if (visao === "servicos") return (data.detalhes?.vendas ?? []).filter((item: any) => item.servicoId === registro.servicoId).map((item: any) => ({ chave: `venda-${item.id}`, titulo: item.cliente ?? "Cliente não identificado", linha1: `${item.servico ?? registro.principal} · ${dataCurta(item.data)}`, linha2: item.profissional ?? "Profissional não identificado", valor: Number(item.valor), chip: "Concluído" }));
  if (visao === "pacotes") return (data.detalhes?.pagamentos ?? []).filter((item: any) => item.pacoteClienteId === registro.id).map((item: any) => ({ chave: `pagamento-pacote-${item.id}`, titulo: item.cliente ?? registro.cliente ?? "Cliente", linha1: `${item.referencia ?? registro.principal} · ${dataCurta(item.data)}`, linha2: item.forma ?? "Pagamento registrado", valor: Number(item.valor), chip: "Recebido" }));
  if (visao === "profissionais") return (data.detalhes?.profissionais ?? []).filter((item: any) => item.profissionalId === registro.profissionalId).map((item: any) => ({ chave: `comissao-${item.id}`, titulo: item.servico ?? "Atendimento", linha1: `${item.paga ? "Comissão paga" : "Comissão pendente"} · ${dataCurta(item.criadoEm)}`, linha2: `Líquido ${moeda(Number(item.valorLiquido))}`, valor: Number(item.valorComissao), chip: item.paga ? "Paga" : "Pendente" }));
  return (data.detalhes?.pagamentos ?? []).filter((item: any) => item.forma === registro.forma).map((item: any) => ({ chave: `pagamento-${item.id}-${item.origem}`, titulo: item.cliente ?? "Cliente não identificado", linha1: `${item.referencia ?? item.origem ?? "Pagamento"} · ${dataCurta(item.data)}`, linha2: item.origem ?? "Pagamento registrado", valor: Number(item.valor), chip: item.forma }));
}

function CartaoRegistro({ registro }: { registro: { titulo: string; linha1: string; linha2: string; valor: number; chip: string } }) { return <article className="rounded-2xl border border-border/80 bg-card p-3.5"><div className="flex items-start gap-3"><div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><FileText className="h-4 w-4" /></div><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><p className="truncate text-sm font-semibold">{registro.titulo}</p><p className="shrink-0 text-sm font-bold">{moeda(registro.valor)}</p></div><p className="mt-1 truncate text-xs text-muted-foreground">{registro.linha1}</p><div className="mt-2 flex items-center gap-2"><Badge variant="secondary" className="h-5 bg-muted px-1.5 text-[10px] font-medium text-muted-foreground">{registro.chip}</Badge><span className="truncate text-[11px] text-muted-foreground">{registro.linha2}</span></div></div></div></article>; }

function notaDaBase(visao: Visao) { const notas: Record<Visao, string> = { recebimentos: "Recebidos usa as contas baixadas como recebidas.", servicos: "Serviços usa o valor de atendimentos concluídos na data do atendimento.", pacotes: "Pacotes usa o valor contratado nas aberturas do período; o detalhe informa saldo e pagamentos disponíveis.", profissionais: "Profissionais usa a produção de atendimentos concluídos e os valores de comissão registrados.", pagamentos: "Pagamentos usa entradas efetivamente registradas na data do recebimento." }; return notas[visao]; }
