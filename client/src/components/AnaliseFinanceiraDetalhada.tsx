import { useMemo, useState, type ReactNode } from "react";
import { BarChart3, CalendarDays, ChevronDown, ChevronRight, CreditCard, Package, UsersRound, Wrench } from "lucide-react";
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

export function AnaliseFinanceiraDetalhada() {
  const [visao, setVisao] = useState<Visao>("servicos");
  const [periodo, setPeriodo] = useState<"semana" | "mes" | "ano" | "custom">("mes");
  const [dataInicio, setDataInicio] = useState(inicioMes);
  const [dataFim, setDataFim] = useState(hoje);
  const [aberto, setAberto] = useState<string | null>(null);
  const { data, isLoading } = trpc.analiseFinanceira.resumo.useQuery({ dataInicio, dataFim });

  const aplicarPeriodo = (novoPeriodo: "semana" | "mes" | "ano") => {
    setPeriodo(novoPeriodo);
    setDataInicio(novoPeriodo === "semana" ? inicioSemana() : novoPeriodo === "mes" ? inicioMes() : inicioAno());
    setDataFim(hoje());
  };

  const maiorPagamento = data?.pagamentos[0];
  const tituloPeriodo = useMemo(() => `${new Date(dataInicio + "T12:00:00").toLocaleDateString("pt-BR")} a ${new Date(dataFim + "T12:00:00").toLocaleDateString("pt-BR")}`, [dataInicio, dataFim]);

  return (
    <section className="card-elegant p-4 lg:p-5 space-y-4 animate-in-up" aria-labelledby="analise-financeira-titulo">
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
          <Button type="button" size="sm" variant={periodo === "custom" ? "default" : "outline"} className="h-8 text-xs" onClick={() => setPeriodo("custom")}>
            <CalendarDays className="mr-1 h-3.5 w-3.5" /> Período
          </Button>
        </div>
      </div>

      {periodo === "custom" && (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 motion-stagger-item">
          <label className="text-xs font-medium text-muted-foreground">De <Input type="date" value={dataInicio} onChange={event => setDataInicio(event.target.value)} className="mt-1 h-9" /></label>
          <label className="text-xs font-medium text-muted-foreground">Até <Input type="date" value={dataFim} onChange={event => setDataFim(event.target.value)} className="mt-1 h-9" /></label>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <Resumo label="Serviços concluídos" valor={data ? String(data.totais.atendimentosConcluidos) : "—"} aoClicar={() => setVisao("servicos")} />
        <Resumo label="Faturamento de serviços" valor={data ? moeda(data.totais.faturamentoServicos) : "—"} aoClicar={() => setVisao("servicos")} />
        <Resumo label="Pacotes vendidos" valor={data ? moeda(data.totais.valorPacotesVendidos) : "—"} aoClicar={() => setVisao("pacotes")} />
        <Resumo label="Maior forma de pagamento" valor={maiorPagamento ? maiorPagamento.forma : "—"} subtitulo={maiorPagamento ? moeda(maiorPagamento.recebido) : undefined} aoClicar={() => setVisao("pagamentos")} />
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {visoes.map(item => {
          const Icone = item.icone;
          return <button type="button" key={item.id} onClick={() => { setVisao(item.id); setAberto(null); }} className={`rounded-xl border p-3 text-left transition-all motion-stagger-item ${visao === item.id ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:border-primary/40 hover:bg-muted/35"}`}>
            <Icone className={`mb-2 h-4 w-4 ${visao === item.id ? "text-primary" : "text-muted-foreground"}`} />
            <p className="text-sm font-semibold">{item.titulo}</p>
            <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{item.descricao}</p>
          </button>;
        })}
      </div>

      <div className="rounded-xl border border-border/80 overflow-hidden">
        <div className="flex items-center justify-between border-b bg-muted/25 px-3 py-2.5">
          <div><p className="text-sm font-semibold">{visoes.find(item => item.id === visao)?.titulo}</p><p className="text-[11px] text-muted-foreground">{tituloPeriodo}</p></div>
          {isLoading && <span className="text-xs text-muted-foreground">Atualizando...</span>}
        </div>
        {isLoading ? <div className="p-6 text-center text-sm text-muted-foreground">Calculando os resultados...</div> : <Tabela visao={visao} data={data} aberto={aberto} setAberto={setAberto} />}
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

function Tabela({ visao, data, aberto, setAberto }: { visao: Visao; data: any; aberto: string | null; setAberto: (id: string | null) => void }) {
  if (!data) return null;
  if (visao === "servicos") return <ListaVazia lista={data.servicos}>{data.servicos.map((item: any) => <Linha key={item.servicoId} id={`servico-${item.servicoId}`} principal={item.nome} secundario={`${item.quantidade} atendimento(s) · Ticket médio ${moeda(item.ticketMedio)}`} valor={item.faturamento} aberto={aberto === `servico-${item.servicoId}`} aoAlternar={() => setAberto(aberto === `servico-${item.servicoId}` ? null : `servico-${item.servicoId}`)}><Detalhes lista={data.detalhes.vendas.filter((venda: any) => venda.servicoId === item.servicoId)} campos={(venda: any) => `${venda.cliente ?? "Cliente"} · ${new Date(venda.data + "T12:00:00").toLocaleDateString("pt-BR")} · ${moeda(Number(venda.valor))}`} /></Linha>)}</ListaVazia>;
  if (visao === "pacotes") return <ListaVazia lista={data.pacotes}>{data.pacotes.map((item: any) => <Linha key={item.id} id={`pacote-${item.id}`} principal={item.nome} secundario={`${item.cliente ?? "Cliente"} · ${item.statusPagamento} · Saldo ${moeda(item.saldoAberto)}`} valor={item.valorTotal} aberto={aberto === `pacote-${item.id}`} aoAlternar={() => setAberto(aberto === `pacote-${item.id}` ? null : `pacote-${item.id}`)}><p>Recebido no período: <strong>{moeda(item.recebidoNoPeriodo)}</strong> · Total recebido: <strong>{moeda(item.valorRecebido)}</strong> · Custo previsto: <strong>{moeda(item.custoTotal)}</strong> · Margem prevista: <strong>{moeda(item.margemPrevista)}</strong></p></Linha>)}</ListaVazia>;
  if (visao === "profissionais") return <ListaVazia lista={data.profissionais}>{data.profissionais.map((item: any) => <Linha key={item.profissionalId} id={`prof-${item.profissionalId}`} principal={item.nome} secundario={`${item.atendimentos} lançamento(s) · Comissão ${moeda(item.comissao)}`} valor={item.bruto} aberto={aberto === `prof-${item.profissionalId}`} aoAlternar={() => setAberto(aberto === `prof-${item.profissionalId}` ? null : `prof-${item.profissionalId}`)}><p>Valor líquido: <strong>{moeda(item.liquido)}</strong> · Taxas: <strong>{moeda(item.taxas)}</strong> · Custos: <strong>{moeda(item.custos)}</strong> · Receita da empresa: <strong>{moeda(item.receitaDona)}</strong></p></Linha>)}</ListaVazia>;
  return <ListaVazia lista={data.pagamentos}>{data.pagamentos.map((item: any) => <Linha key={item.forma} id={`pag-${item.forma}`} principal={item.forma} secundario={`${item.quantidade} recebimento(s) registrado(s)`} valor={item.recebido} aberto={aberto === `pag-${item.forma}`} aoAlternar={() => setAberto(aberto === `pag-${item.forma}` ? null : `pag-${item.forma}`)}><Detalhes lista={data.detalhes.pagamentos.filter((pagamento: any) => pagamento.forma === item.forma)} campos={(pagamento: any) => `${pagamento.origem} · ${pagamento.cliente ?? "Cliente"} · ${moeda(Number(pagamento.valor))}`} /></Linha>)}</ListaVazia>;
}

function ListaVazia({ lista, children }: { lista: unknown[]; children: ReactNode }) { return lista.length ? <>{children}</> : <div className="px-4 py-8 text-center text-sm text-muted-foreground">Não há registros neste recorte.</div>; }
function Detalhes({ lista, campos }: { lista: any[]; campos: (item: any) => string }) { return lista.length ? <div className="space-y-1">{lista.map((item, index) => <p key={`${item.id}-${index}`} className="text-muted-foreground">{campos(item)}</p>)}</div> : <p className="text-muted-foreground">Não há detalhes adicionais para este item.</p>; }
