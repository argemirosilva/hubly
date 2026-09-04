import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useLocation, useSearch } from "wouter";
import { ArrowLeft, BarChart3, CalendarDays, ChevronDown, ChevronRight, CreditCard, Package, UsersRound, Wrench } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Visao = "servicos" | "pacotes" | "profissionais" | "pagamentos";

const moeda = (valor: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor);
const paraDataLocal = (data: Date) => `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}-${String(data.getDate()).padStart(2, "0")}`;
const hoje = () => paraDataLocal(new Date());
const inicioMes = () => { const data = new Date(); data.setDate(1); return paraDataLocal(data); };
const inicioSemana = () => { const data = new Date(); data.setDate(data.getDate() - ((data.getDay() + 6) % 7)); return paraDataLocal(data); };
const inicioAno = () => `${new Date().getFullYear()}-01-01`;

const visoes: Array<{ id: Visao; titulo: string; descricao: string; icone: typeof Wrench }> = [
  { id: "servicos", titulo: "Serviços", descricao: "Mais vendidos e faturamento", icone: Wrench },
  { id: "pacotes", titulo: "Pacotes", descricao: "Vendas, recebimentos e saldo", icone: Package },
  { id: "profissionais", titulo: "Profissionais", descricao: "Produção, comissões e líquido", icone: UsersRound },
  { id: "pagamentos", titulo: "Pagamentos", descricao: "Entradas por forma de pagamento", icone: CreditCard },
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
  const [visao, setVisao] = useState<Visao>(() => visaoValida(visaoDaUrl) ? visaoDaUrl : "servicos");
  const [periodo, setPeriodo] = useState<"semana" | "mes" | "ano" | "custom">(() => periodoDaUrl === "semana" || periodoDaUrl === "ano" || periodoDaUrl === "custom" ? periodoDaUrl : "mes");
  const [dataInicio, setDataInicio] = useState(() => parametros.get("inicio") ?? (periodoDaUrl === "semana" ? inicioSemana() : periodoDaUrl === "ano" ? inicioAno() : inicioMes()));
  const [dataFim, setDataFim] = useState(() => parametros.get("fim") ?? hoje());
  const [aberto, setAberto] = useState<string | null>(null);
  const { data, isLoading } = trpc.analiseFinanceira.resumo.useQuery({ dataInicio, dataFim });

  useEffect(() => {
    if (!paginaDedicada) return;
    const visaoSolicitada = parametros.get("visao");
    const proximaVisao: Visao = visaoValida(visaoSolicitada) ? visaoSolicitada : "servicos";
    const proximoPeriodo = parametros.get("periodo");
    const inicio = parametros.get("inicio") ?? (proximoPeriodo === "semana" ? inicioSemana() : proximoPeriodo === "ano" ? inicioAno() : inicioMes());
    const fim = parametros.get("fim") ?? hoje();
    setVisao(proximaVisao);
    setPeriodo(proximoPeriodo === "semana" || proximoPeriodo === "ano" || proximoPeriodo === "custom" ? proximoPeriodo : "mes");
    setDataInicio(inicio);
    setDataFim(fim);
  }, [paginaDedicada, search]);

  const atualizarUrl = (proximaVisao: Visao, proximoPeriodo: "semana" | "mes" | "ano" | "custom", inicio: string, fim: string, foco?: string) => {
    const query = new URLSearchParams({ visao: proximaVisao, periodo: proximoPeriodo, inicio, fim });
    if (foco) query.set("foco", foco);
    setLocation(`/admin/financeiro/analise?${query.toString()}`, { replace: true });
  };

  const aplicarPeriodo = (novoPeriodo: "semana" | "mes" | "ano") => {
    setPeriodo(novoPeriodo);
    const inicio = novoPeriodo === "semana" ? inicioSemana() : novoPeriodo === "mes" ? inicioMes() : inicioAno();
    const fim = hoje();
    setDataInicio(inicio);
    setDataFim(fim);
    atualizarUrl(visao, novoPeriodo, inicio, fim);
  };

  const maiorPagamento = data?.pagamentos[0];
  const tituloPeriodo = useMemo(() => `${new Date(dataInicio + "T12:00:00").toLocaleDateString("pt-BR")} a ${new Date(dataFim + "T12:00:00").toLocaleDateString("pt-BR")}`, [dataInicio, dataFim]);

  if (compacta) {
    const abrirAnalise = (proximaVisao: Visao, foco?: string) => {
      const query = new URLSearchParams({ visao: proximaVisao, periodo: "mes", inicio: inicioMes(), fim: hoje() });
      if (foco) query.set("foco", foco);
      setLocation(`/admin/financeiro/analise?${query.toString()}`);
    };
    return (
      <section className="card-elegant p-4 lg:p-5 space-y-3 animate-in-up" aria-labelledby="resumo-analise-financeira-titulo">
        <div className="flex items-center justify-between gap-3">
          <div><h2 id="resumo-analise-financeira-titulo" className="text-sm font-semibold">Resultados deste mês</h2><p className="text-xs text-muted-foreground">Toque em um indicador para abrir os registros filtrados.</p></div>
          <Button type="button" variant="ghost" size="sm" className="h-8 text-xs" onClick={() => abrirAnalise("servicos")}>Ver análise</Button>
        </div>
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          <Resumo label="Serviço líder" valor={data?.servicos[0]?.nome ?? "—"} subtitulo={data?.servicos[0] ? moeda(data.servicos[0].faturamento) : undefined} aoClicar={() => abrirAnalise("servicos", data?.servicos[0] ? String(data.servicos[0].servicoId) : undefined)} />
          <Resumo label="Profissional líder" valor={data?.profissionais[0]?.nome ?? "—"} subtitulo={data?.profissionais[0] ? moeda(data.profissionais[0].bruto) : undefined} aoClicar={() => abrirAnalise("profissionais", data?.profissionais[0] ? String(data.profissionais[0].profissionalId) : undefined)} />
          <Resumo label="Pacotes vendidos" valor={data ? moeda(data.totais.valorPacotesVendidos) : "—"} aoClicar={() => abrirAnalise("pacotes")} />
          <Resumo label="Maior forma de pagamento" valor={maiorPagamento?.forma ?? "—"} subtitulo={maiorPagamento ? moeda(maiorPagamento.recebido) : undefined} aoClicar={() => abrirAnalise("pagamentos", maiorPagamento?.forma)} />
        </div>
      </section>
    );
  }

  return (
    <section className={`${paginaDedicada ? "p-4 lg:p-6 max-w-6xl mx-auto" : "card-elegant p-4 lg:p-5"} space-y-4 animate-in-up`} aria-labelledby="analise-financeira-titulo">
      {paginaDedicada && <Button type="button" variant="ghost" size="sm" className="-ml-2" onClick={() => setLocation("/admin/financeiro")}><ArrowLeft className="mr-1.5 h-4 w-4" />Voltar ao Financeiro</Button>}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary"><BarChart3 className="h-4 w-4" /></span>
            <div>
              <h2 id="analise-financeira-titulo" className="text-base font-semibold">Análise de resultados</h2>
              <p className="text-xs text-muted-foreground">Abra cada visão para conferir os números que formam o resultado.</p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(["semana", "mes", "ano"] as const).map(item => (
            <Button key={item} type="button" size="sm" variant={periodo === item ? "default" : "outline"} className="h-8 text-xs" onClick={() => aplicarPeriodo(item)}>
              {item === "semana" ? "Semana" : item === "mes" ? "Mês" : "Ano"}
            </Button>
          ))}
          <Button type="button" size="sm" variant={periodo === "custom" ? "default" : "outline"} className="h-8 text-xs" onClick={() => { setPeriodo("custom"); atualizarUrl(visao, "custom", dataInicio, dataFim); }}>
            <CalendarDays className="mr-1 h-3.5 w-3.5" /> Período
          </Button>
        </div>
      </div>

      {periodo === "custom" && (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 motion-stagger-item">
          <label className="text-xs font-medium text-muted-foreground">De <Input type="date" value={dataInicio} onChange={event => { setDataInicio(event.target.value); atualizarUrl(visao, "custom", event.target.value, dataFim); }} className="mt-1 h-9" /></label>
          <label className="text-xs font-medium text-muted-foreground">Até <Input type="date" value={dataFim} onChange={event => { setDataFim(event.target.value); atualizarUrl(visao, "custom", dataInicio, event.target.value); }} className="mt-1 h-9" /></label>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <Resumo label="Serviço líder" valor={data?.servicos[0]?.nome ?? "—"} subtitulo={data?.servicos[0] ? moeda(data.servicos[0].faturamento) : undefined} aoClicar={() => { setVisao("servicos"); atualizarUrl("servicos", periodo, dataInicio, dataFim, data?.servicos[0] ? String(data.servicos[0].servicoId) : undefined); }} />
        <Resumo label="Profissional líder" valor={data?.profissionais[0]?.nome ?? "—"} subtitulo={data?.profissionais[0] ? moeda(data.profissionais[0].bruto) : undefined} aoClicar={() => { setVisao("profissionais"); atualizarUrl("profissionais", periodo, dataInicio, dataFim, data?.profissionais[0] ? String(data.profissionais[0].profissionalId) : undefined); }} />
        <Resumo label="Pacotes vendidos" valor={data ? moeda(data.totais.valorPacotesVendidos) : "—"} aoClicar={() => { setVisao("pacotes"); atualizarUrl("pacotes", periodo, dataInicio, dataFim); }} />
        <Resumo label="Maior forma de pagamento" valor={maiorPagamento ? maiorPagamento.forma : "—"} subtitulo={maiorPagamento ? moeda(maiorPagamento.recebido) : undefined} aoClicar={() => { setVisao("pagamentos"); atualizarUrl("pagamentos", periodo, dataInicio, dataFim, maiorPagamento?.forma); }} />
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {visoes.map(item => {
          const Icone = item.icone;
          return <button type="button" key={item.id} onClick={() => { setVisao(item.id); setAberto(null); atualizarUrl(item.id, periodo, dataInicio, dataFim); }} className={`rounded-xl border p-3 text-left transition-all motion-stagger-item ${visao === item.id ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:border-primary/40 hover:bg-muted/35"}`}>
            <Icone className={`mb-2 h-4 w-4 ${visao === item.id ? "text-primary" : "text-muted-foreground"}`} />
            <p className="text-sm font-semibold">{item.titulo}</p>
            <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{item.descricao}</p>
          </button>;
        })}
      </div>

      <div className="rounded-xl border border-border/80 overflow-hidden">
        <div className="flex items-center justify-between border-b bg-muted/25 px-3 py-2.5">
          <div><p className="text-sm font-semibold">{visoes.find(item => item.id === visao)?.titulo}</p><p className="text-[11px] text-muted-foreground">{focoDaUrl ? `Filtrado: ${focoDaUrl} · ` : ""}{tituloPeriodo}</p></div>
          {isLoading && <span className="text-xs text-muted-foreground">Atualizando...</span>}
        </div>
        {focoDaUrl && paginaDedicada && <div className="flex items-center justify-between border-b px-3 py-2"><span className="text-xs text-muted-foreground">Recorte selecionado</span><Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => atualizarUrl(visao, periodo, dataInicio, dataFim)}>Ver todos</Button></div>}
        {isLoading ? <div className="p-6 text-center text-sm text-muted-foreground">Calculando os resultados...</div> : <Tabela visao={visao} data={data} foco={focoDaUrl} aberto={aberto} setAberto={setAberto} />}
      </div>
      <p className="text-[11px] leading-relaxed text-muted-foreground">Serviços usam atendimentos concluídos na data do atendimento. Pacotes usam a data de abertura. Pagamentos mostram apenas entradas registradas na data do recebimento.</p>
    </section>
  );
}

function Resumo({ label, valor, subtitulo, aoClicar }: { label: string; valor: string; subtitulo?: string; aoClicar: () => void }) {
  return <button type="button" onClick={aoClicar} className="rounded-xl bg-muted/35 px-3 py-2.5 text-left motion-stagger-item transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><p className="text-[10px] text-muted-foreground">{label}</p><p className="mt-0.5 truncate text-sm font-bold">{valor}</p>{subtitulo && <p className="text-[10px] text-muted-foreground">{subtitulo}</p>}</button>;
}

function Linha({ id, principal, secundario, valor, aberto, aoAlternar, children }: { id: string; principal: string; secundario: string; valor: number; aberto: boolean; aoAlternar: () => void; children?: ReactNode }) {
  return <div className="border-b last:border-b-0"><button type="button" onClick={aoAlternar} className="flex w-full items-center gap-2 px-3 py-3 text-left transition-colors hover:bg-muted/40"><span className="text-muted-foreground">{aberto ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{principal}</span><span className="block truncate text-[11px] text-muted-foreground">{secundario}</span></span><strong className="text-sm">{moeda(valor)}</strong></button>{aberto && children && <div className="border-t bg-muted/20 px-4 py-3 text-xs">{children}</div>}</div>;
}

function Tabela({ visao, data, foco, aberto, setAberto }: { visao: Visao; data: any; foco: string | null; aberto: string | null; setAberto: (id: string | null) => void }) {
  if (!data) return null;
  const itens = visao === "servicos" ? data.servicos.filter((item: any) => !foco || String(item.servicoId) === foco)
    : visao === "pacotes" ? data.pacotes.filter((item: any) => !foco || String(item.id) === foco)
    : visao === "profissionais" ? data.profissionais.filter((item: any) => !foco || String(item.profissionalId) === foco)
    : data.pagamentos.filter((item: any) => !foco || item.forma === foco);
  if (visao === "servicos") return <ListaVazia lista={itens}>{itens.map((item: any) => <Linha key={item.servicoId} id={`servico-${item.servicoId}`} principal={item.nome} secundario={`${item.quantidade} atendimento(s) · Ticket médio ${moeda(item.ticketMedio)}`} valor={item.faturamento} aberto={aberto === `servico-${item.servicoId}`} aoAlternar={() => setAberto(aberto === `servico-${item.servicoId}` ? null : `servico-${item.servicoId}`)}><Detalhes lista={data.detalhes.vendas.filter((venda: any) => venda.servicoId === item.servicoId)} campos={(venda: any) => `${venda.cliente ?? "Cliente"} · ${new Date(venda.data + "T12:00:00").toLocaleDateString("pt-BR")} · ${moeda(Number(venda.valor))}`} /></Linha>)}</ListaVazia>;
  if (visao === "pacotes") return <ListaVazia lista={itens}>{itens.map((item: any) => <Linha key={item.id} id={`pacote-${item.id}`} principal={item.nome} secundario={`${item.cliente ?? "Cliente"} · ${item.statusPagamento} · Saldo ${moeda(item.saldoAberto)}`} valor={item.valorTotal} aberto={aberto === `pacote-${item.id}`} aoAlternar={() => setAberto(aberto === `pacote-${item.id}` ? null : `pacote-${item.id}`)}><p>Recebido no período: <strong>{moeda(item.recebidoNoPeriodo)}</strong> · Total recebido: <strong>{moeda(item.valorRecebido)}</strong> · Custo previsto: <strong>{moeda(item.custoTotal)}</strong> · Margem prevista: <strong>{moeda(item.margemPrevista)}</strong></p></Linha>)}</ListaVazia>;
  if (visao === "profissionais") return <ListaVazia lista={itens}>{itens.map((item: any) => <Linha key={item.profissionalId} id={`prof-${item.profissionalId}`} principal={item.nome} secundario={`${item.atendimentos} lançamento(s) · Comissão ${moeda(item.comissao)}`} valor={item.bruto} aberto={aberto === `prof-${item.profissionalId}`} aoAlternar={() => setAberto(aberto === `prof-${item.profissionalId}` ? null : `prof-${item.profissionalId}`)}><p>Valor líquido: <strong>{moeda(item.liquido)}</strong> · Taxas: <strong>{moeda(item.taxas)}</strong> · Custos: <strong>{moeda(item.custos)}</strong> · Receita da empresa: <strong>{moeda(item.receitaDona)}</strong></p></Linha>)}</ListaVazia>;
  return <ListaVazia lista={itens}>{itens.map((item: any) => <Linha key={item.forma} id={`pag-${item.forma}`} principal={item.forma} secundario={`${item.quantidade} recebimento(s) registrado(s)`} valor={item.recebido} aberto={aberto === `pag-${item.forma}`} aoAlternar={() => setAberto(aberto === `pag-${item.forma}` ? null : `pag-${item.forma}`)}><Detalhes lista={data.detalhes.pagamentos.filter((pagamento: any) => pagamento.forma === item.forma)} campos={(pagamento: any) => `${pagamento.origem} · ${pagamento.cliente ?? "Cliente"} · ${moeda(Number(pagamento.valor))}`} /></Linha>)}</ListaVazia>;
}

function ListaVazia({ lista, children }: { lista: unknown[]; children: ReactNode }) { return lista.length ? <>{children}</> : <div className="px-4 py-8 text-center text-sm text-muted-foreground">Não há registros neste recorte.</div>; }
function Detalhes({ lista, campos }: { lista: any[]; campos: (item: any) => string }) { return lista.length ? <div className="space-y-1">{lista.map((item, index) => <p key={`${item.id}-${index}`} className="text-muted-foreground">{campos(item)}</p>)}</div> : <p className="text-muted-foreground">Não há detalhes adicionais para este item.</p>; }
