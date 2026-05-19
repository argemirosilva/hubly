import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { DollarSign, TrendingUp, CheckCircle, Clock, ChevronDown, ChevronRight, User, Calendar, ArrowUpRight, ArrowDownRight, Wallet } from "lucide-react";
import { toast } from "sonner";
import { usePermissoes } from "@/hooks/usePermissoes";

function getInicioMes(offset = 0) {
  const d = new Date();
  d.setMonth(d.getMonth() + offset, 1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}
function getFimMes(offset = 0) {
  const d = new Date();
  d.setMonth(d.getMonth() + offset + 1, 0);
  d.setHours(23, 59, 59, 999);
  return d.toISOString().slice(0, 10);
}
function getUltimos30() {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().slice(0, 10);
}

function formatCurrency(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

export default function Financeiro() {
  const utils = trpc.useUtils();
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [filtroProfId, setFiltroProfId] = useState("todos");
  const [expandidos, setExpandidos] = useState<Record<number, boolean>>({});
  const [dataInicio, setDataInicio] = useState(getInicioMes());
  const [dataFim, setDataFim] = useState(getFimMes());
  const [periodoAtivo, setPeriodoAtivo] = useState<"mes" | "mes_ant" | "30d" | "custom">("mes");

  function aplicarPeriodo(tipo: "mes" | "mes_ant" | "30d") {
    setPeriodoAtivo(tipo);
    if (tipo === "mes") { setDataInicio(getInicioMes()); setDataFim(getFimMes()); }
    else if (tipo === "mes_ant") { setDataInicio(getInicioMes(-1)); setDataFim(getFimMes(-1)); }
    else if (tipo === "30d") { setDataInicio(getUltimos30()); setDataFim(new Date().toISOString().slice(0, 10)); }
  }

  const { pode, isAdmin } = usePermissoes();
  const podeMarcarPaga = pode("financeiroMarcarPago");

  const { data: metrics } = trpc.financeiro.dashboard.useQuery();
  const { data: metricasPagar } = trpc.contasPagar.metricas.useQuery();
  const { data: metricasReceber } = trpc.contasReceber.metricas.useQuery();
  const { data: resumoCreditos } = trpc.creditos.getResumo.useQuery();
  const { data: clientesLista } = trpc.clientes.list.useQuery();
  const clienteNomeMap = useMemo(() => {
    const m: Record<number, string> = {};
    clientesLista?.forEach(c => { m[c.id] = c.nome; });
    return m;
  }, [clientesLista]);

  // Fluxo de caixa consolidado
  // Receita real = soma dos agendamentos concluídos (metrics.receitaMes)
  // Despesas = contas a pagar pagas no mês
  const receitasMes = metrics?.receitaMes ?? 0;
  const despesasMes = metricasPagar?.totalPagoMes ?? 0;
  const saldoMes = receitasMes - despesasMes;
  const totalAPagar = metricasPagar?.totalPendente ?? 0;
  const totalAReceber = metricasReceber?.totalPendente ?? 0;
  const { data: comissoes } = trpc.financeiro.comissoes.useQuery(
    dataInicio || dataFim ? { dataInicio: dataInicio || undefined, dataFim: dataFim || undefined } : undefined
  );
  const { data: profissionais } = trpc.profissionais.list.useQuery();

  const pagarMutation = trpc.financeiro.marcarPaga.useMutation({
    onSuccess: () => {
      toast.success("Comissão marcada como paga!");
      utils.financeiro.comissoes.invalidate();
      utils.financeiro.dashboard.invalidate();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const profMap = useMemo(() => {
    const m: Record<number, { nome: string; cor?: string | null }> = {};
    profissionais?.forEach(p => { m[p.id] = { nome: p.nome, cor: (p as any).corCalendario }; });
    return m;
  }, [profissionais]);

  // Filtrar comissões
  const filtradas = useMemo(() => {
    return (comissoes ?? []).filter(c => {
      const matchStatus = filtroStatus === "todos" || (filtroStatus === "paga" ? c.paga : !c.paga);
      const matchProf = !isAdmin || filtroProfId === "todos" || c.profissionalId === parseInt(filtroProfId);
      return matchStatus && matchProf;
    });
  }, [comissoes, filtroStatus, filtroProfId, isAdmin]);

  // Agrupar por profissional
  const grupos = useMemo(() => {
    const g: Record<number, {
      profissionalId: number;
      nome: string;
      cor: string;
      totalComissao: number;
      totalPendente: number;
      totalPago: number;
      comissoes: typeof filtradas;
    }> = {};

    filtradas.forEach(c => {
      if (!g[c.profissionalId]) {
        const prof = profMap[c.profissionalId];
        g[c.profissionalId] = {
          profissionalId: c.profissionalId,
          nome: prof?.nome ?? "Profissional",
          cor: prof?.cor ?? "oklch(50% 0.06 68)",
          totalComissao: 0,
          totalPendente: 0,
          totalPago: 0,
          comissoes: [],
        };
      }
      const val = parseFloat(String(c.valorComissao));
      g[c.profissionalId].totalComissao += val;
      if (c.paga) g[c.profissionalId].totalPago += val;
      else g[c.profissionalId].totalPendente += val;
      g[c.profissionalId].comissoes.push(c);
    });

    return Object.values(g).sort((a, b) => b.totalComissao - a.totalComissao);
  }, [filtradas, profMap]);

  const toggleExpand = (profId: number) => {
    setExpandidos(prev => ({ ...prev, [profId]: !prev[profId] }));
  };

  if (!pode("financeiroVer")) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center p-8">
        <DollarSign className="w-12 h-12 text-muted-foreground/30" />
        <p className="text-sm font-medium text-muted-foreground">Você não tem permissão para acessar o financeiro.</p>
      </div>
    );
  }

  const totalPendente = filtradas.filter(c => !c.paga).reduce((acc, c) => acc + parseFloat(String(c.valorComissao)), 0);
  const totalPago = filtradas.filter(c => c.paga).reduce((acc, c) => acc + parseFloat(String(c.valorComissao)), 0);
  const totalGeral = totalPendente + totalPago;

  const labelPeriodo = (() => {
    if (periodoAtivo === "mes") return "Mês atual";
    if (periodoAtivo === "mes_ant") return "Mês anterior";
    if (periodoAtivo === "30d") return "Últimos 30 dias";
    if (dataInicio && dataFim) {
      const fmt = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
      return `${fmt(dataInicio)} – ${fmt(dataFim)}`;
    }
    return "Período personalizado";
  })();

  return (
    <div className="p-4 lg:p-6 space-y-4 lg:space-y-6 max-w-6xl mx-auto animate-in-up">
      <h1 className="font-bold tracking-tight text-xl lg:text-2xl">Financeiro</h1>

      {/* Fluxo de Caixa Consolidado */}
      <div className="card-elegant p-4 lg:p-5">
        <div className="flex items-center gap-2 mb-3">
          <Wallet className="w-4 h-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Fluxo de Caixa — Mês Atual</h2>
        </div>
        {/* 3 números principais */}
        <div className="grid grid-cols-3 gap-3">
          <div className="stat-card">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center mb-1.5" style={{ background: "oklch(62% 0.18 155 / 12%)" }}>
              <ArrowUpRight className="w-3 h-3" style={{ color: "oklch(38% 0.14 155)" }} />
            </div>
            <p className="text-base font-bold text-foreground tracking-tight">{formatCurrency(receitasMes)}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Receita do mês</p>
          </div>
          <div className="stat-card">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center mb-1.5" style={{ background: "oklch(60% 0.22 25 / 12%)" }}>
              <ArrowDownRight className="w-3 h-3" style={{ color: "oklch(42% 0.18 25)" }} />
            </div>
            <p className="text-base font-bold text-foreground tracking-tight">{formatCurrency(despesasMes)}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Despesas do mês</p>
          </div>
          <div className="stat-card">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center mb-1.5" style={{ background: saldoMes >= 0 ? "oklch(62% 0.18 155 / 12%)" : "oklch(60% 0.22 25 / 12%)" }}>
              <Wallet className="w-3 h-3" style={{ color: saldoMes >= 0 ? "oklch(38% 0.14 155)" : "oklch(42% 0.18 25)" }} />
            </div>
            <p className={`text-base font-bold tracking-tight ${saldoMes >= 0 ? "text-foreground" : "text-destructive"}`}>{formatCurrency(saldoMes)}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Saldo líquido</p>
          </div>
        </div>
        {/* Barra visual receita vs despesa */}
        {(receitasMes + despesasMes) > 0 && (
          <div className="mt-3">
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "oklch(88% 0.012 250)" }}>
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.round((receitasMes / (receitasMes + despesasMes)) * 100)}%`,
                  background: "oklch(55% 0.18 155)",
                }}
              />
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-[10px] text-muted-foreground">Receitas ({Math.round((receitasMes / (receitasMes + despesasMes)) * 100)}%)</span>
              <span className="text-[10px] text-muted-foreground">Despesas ({Math.round((despesasMes / (receitasMes + despesasMes)) * 100)}%)</span>
            </div>
          </div>
        )}
        {/* Detalhes secundários colapsáveis */}
        <div className="mt-3 pt-3" style={{ borderTop: "1px solid oklch(90% 0.012 250)" }}>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            <div className="stat-card">
              <p className="text-sm font-bold text-foreground tracking-tight">{formatCurrency(metrics?.ticketMedio ?? 0)}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Ticket médio</p>
            </div>
            <div className="stat-card">
              <p className="text-sm font-bold text-foreground tracking-tight">{metrics?.agendamentosMes ?? 0}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Atendimentos</p>
            </div>
            <div className="stat-card">
              <p className="text-sm font-bold tracking-tight" style={{ color: "oklch(40% 0.14 75)" }}>{formatCurrency(totalAPagar)}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">A pagar (pendente)</p>
            </div>
            <div className="stat-card">
              <p className="text-sm font-bold tracking-tight" style={{ color: "oklch(40% 0.14 75)" }}>{formatCurrency(totalAReceber)}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">A receber (pendente)</p>
            </div>
          </div>
        </div>
      </div>

      {/* Card de resumo do período */}
      {filtradas.length > 0 && (
        <div className="card-elegant px-5 py-4" style={{ background: "oklch(55% 0.22 264 / 6%)", border: "1px solid oklch(55% 0.22 264 / 20%)" }}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-xs font-medium" style={{ color: "oklch(45% 0.18 264)" }}>{labelPeriodo}</p>
              <p className="text-2xl font-bold tracking-tight mt-0.5" style={{ color: "oklch(25% 0.12 264)" }}>
                {formatCurrency(totalGeral)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Total de comissões no período</p>
            </div>
            <div className="flex gap-4 sm:gap-6">
              <div className="text-center">
                <p className="text-base font-bold" style={{ color: "oklch(35% 0.14 155)" }}>{formatCurrency(totalPago)}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Pagas</p>
              </div>
              <div className="w-px" style={{ background: "oklch(88% 0.012 250)" }} />
              <div className="text-center">
                <p className="text-base font-bold" style={{ color: "oklch(40% 0.14 75)" }}>{formatCurrency(totalPendente)}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Pendentes</p>
              </div>
              <div className="w-px" style={{ background: "oklch(88% 0.012 250)" }} />
              <div className="text-center">
                <p className="text-base font-bold text-foreground">{filtradas.length}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Comissões</p>
              </div>
            </div>
          </div>
          {/* Barra de progresso pago/pendente */}
          {totalGeral > 0 && (
            <div className="mt-3">
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "oklch(88% 0.012 250)" }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${(totalPago / totalGeral) * 100}%`, background: "oklch(62% 0.18 155)" }}
                />
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                {((totalPago / totalGeral) * 100).toFixed(0)}% pago
              </p>
            </div>
          )}
        </div>
      )}

      {/* Créditos em Aberto */}
      {resumoCreditos && resumoCreditos.clientesComCredito > 0 && (
        <div className="card-elegant overflow-hidden">
          <div className="px-5 py-4" style={{ borderBottom: "1px solid oklch(90% 0.012 250)" }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4" style={{ color: "oklch(38% 0.14 155)" }} />
                <h3 className="font-semibold text-sm tracking-tight">Créditos em Aberto (Passivo)</h3>
              </div>
              <span className="text-xs text-muted-foreground">{resumoCreditos.clientesComCredito} cliente{resumoCreditos.clientesComCredito !== 1 ? 's' : ''}</span>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
              <div className="stat-card" style={{ background: "oklch(62% 0.18 155 / 6%)", border: "1px solid oklch(62% 0.18 155 / 20%)" }}>
                <p className="text-base font-bold tracking-tight" style={{ color: "oklch(35% 0.14 155)" }}>
                  {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(resumoCreditos.totalEmAberto)}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Total em aberto</p>
              </div>
              <div className="stat-card">
                <p className="text-base font-bold tracking-tight text-foreground">
                  {resumoCreditos.clientesComCredito}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Clientes com crédito</p>
              </div>
              <div className="stat-card">
                <p className="text-base font-bold tracking-tight text-foreground">
                  {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(resumoCreditos.totalDevolvido)}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Total já devolvido</p>
              </div>
            </div>
          </div>
          {/* Lista dos clientes com maior crédito */}
          <div className="divide-y divide-border">
            {resumoCreditos.detalhes.slice(0, 8).map((d: { clienteId: number; saldo: number }) => (
              <div key={d.clienteId} className="flex items-center justify-between px-5 py-2.5 hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-white"
                    style={{ background: "oklch(55% 0.22 264)" }}>
                    C
                  </div>
                  <span className="text-xs font-medium text-foreground">{clienteNomeMap[d.clienteId] ?? `Cliente #${d.clienteId}`}</span>
                </div>
                <span className="text-xs font-bold" style={{ color: "oklch(35% 0.14 155)" }}>
                  {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(d.saldo)}
                </span>
              </div>
            ))}
            {resumoCreditos.detalhes.length > 8 && (
              <div className="px-5 py-2.5 text-center">
                <span className="text-xs text-muted-foreground">+{resumoCreditos.detalhes.length - 8} outros clientes com crédito</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Comissões agrupadas por profissional */}
      <div className="card-elegant overflow-hidden">
        <div className="flex flex-col gap-3 px-5 py-4"
          style={{ borderBottom: "1px solid oklch(90% 0.012 250)" }}>
          {/* Linha 1: título + filtros de status/profissional */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold text-sm tracking-tight">Comissões por Profissional</h3>
              {totalPendente > 0 && (
                <p className="text-xs mt-0.5" style={{ color: "oklch(40% 0.14 75)" }}>
                  {formatCurrency(totalPendente)} pendente
                </p>
              )}
            </div>
            <div className="flex gap-2 flex-wrap">
              {isAdmin && (
                <Select value={filtroProfId} onValueChange={setFiltroProfId}>
                  <SelectTrigger className="w-auto min-w-[130px] h-8 text-xs">
                    <SelectValue placeholder="Profissional" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    {profissionais?.map(p => (
                      <SelectItem key={p.id} value={String(p.id)}>{p.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                <SelectTrigger className="w-auto min-w-[110px] h-8 text-xs">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="pendente">Pendentes</SelectItem>
                  <SelectItem value="paga">Pagas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {/* Linha 2: filtro de período */}
          <div className="flex flex-wrap items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            {/* Atalhos rápidos */}
            {(["mes", "mes_ant", "30d"] as const).map(tipo => (
              <button
                key={tipo}
                onClick={() => aplicarPeriodo(tipo)}
                className="text-xs px-2.5 py-1 rounded-md border transition-colors"
                style={periodoAtivo === tipo
                  ? { background: "oklch(55% 0.22 264 / 14%)", borderColor: "oklch(55% 0.22 264 / 50%)", color: "oklch(35% 0.18 264)" }
                  : { background: "transparent", borderColor: "oklch(88% 0.012 250)", color: "oklch(50% 0.04 250)" }
                }
              >
                {tipo === "mes" ? "Mês atual" : tipo === "mes_ant" ? "Mês anterior" : "Últimos 30 dias"}
              </button>
            ))}
            {/* Inputs de data personalizada */}
            <div className="flex items-center gap-1.5 ml-auto">
              <Input
                type="date"
                value={dataInicio}
                onChange={e => { setDataInicio(e.target.value); setPeriodoAtivo("custom"); }}
                className="h-7 text-xs w-[130px]"
              />
              <span className="text-xs text-muted-foreground">até</span>
              <Input
                type="date"
                value={dataFim}
                onChange={e => { setDataFim(e.target.value); setPeriodoAtivo("custom"); }}
                className="h-7 text-xs w-[130px]"
              />
            </div>
          </div>
        </div>

        {grupos.length === 0 ? (
          <div className="py-12 text-center">
            <DollarSign className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Nenhuma comissão encontrada</p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: "oklch(94% 0.008 250)" }}>
            {grupos.map(grupo => {
              const isOpen = expandidos[grupo.profissionalId] ?? false;
              const cor = grupo.cor;
              return (
                <div key={grupo.profissionalId}>
                  {/* Cabeçalho do grupo (profissional) */}
                  <button
                    className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-muted/30 transition-colors text-left"
                    onClick={() => toggleExpand(grupo.profissionalId)}
                  >
                    {/* Avatar colorido */}
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: cor + "22", border: `2px solid ${cor}` }}>
                      <User className="w-4 h-4" style={{ color: cor }} />
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground">{grupo.nome}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-muted-foreground">{grupo.comissoes.length} comissão{grupo.comissoes.length !== 1 ? "ões" : ""}</span>
                        {grupo.totalPendente > 0 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                            style={{ background: "oklch(72% 0.16 80 / 14%)", color: "oklch(40% 0.14 75)" }}>
                            {formatCurrency(grupo.totalPendente)} pendente
                          </span>
                        )}
                        {grupo.totalPago > 0 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                            style={{ background: "oklch(62% 0.18 155 / 14%)", color: "oklch(35% 0.14 155)" }}>
                            {formatCurrency(grupo.totalPago)} pago
                          </span>
                        )}
                      </div>
                    </div>
                    {/* Total */}
                    <div className="text-right flex-shrink-0 mr-2">
                      <p className="text-sm font-bold">{formatCurrency(grupo.totalComissao)}</p>
                      <p className="text-[10px] text-muted-foreground">total</p>
                    </div>
                    {/* Chevron */}
                    {isOpen
                      ? <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      : <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    }
                  </button>

                  {/* Detalhes expandidos: comissões individuais */}
                  {isOpen && (
                    <div className="divide-y" style={{ background: "oklch(98.5% 0.004 250)", borderColor: "oklch(94% 0.008 250)" }}>
                      {grupo.comissoes.map(c => {
                        const vServico = parseFloat(String(c.valorServico ?? 0));
                        const vTaxa = parseFloat(String(c.taxaMaquininha ?? 0));
                        const vCusto = parseFloat(String(c.custoReposicao ?? 0));
                        const vLiquido = parseFloat(String(c.valorLiquido ?? 0));
                        const vComissao = parseFloat(String(c.valorComissao ?? 0));
                        const vReceitaDona = parseFloat(String((c as any).receitaDona ?? 0));
                        const pct = parseFloat(String(c.percentualComissao ?? 0));
                        const temDesconto = vTaxa > 0 || vCusto > 0;
                        const tipoPgto: Record<string, string> = {
                          dinheiro: "Dinheiro", pix: "Pix",
                          cartao_debito: "Débito", cartao_credito: "Crédito", outro: "Outro"
                        };
                        return (
                          <div key={c.id} className="px-4 py-3 pl-14 space-y-2">
                            {/* Linha principal: serviço + cliente + status */}
                            <div className="flex items-center gap-3">
                              <div className="w-0.5 h-8 rounded-full flex-shrink-0" style={{ background: cor }} />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-foreground truncate">
                                  {(c as any).servicoNome ?? "Serviço"}
                                </p>
                                <p className="text-[10px] text-muted-foreground truncate">
                                  {(c as any).clienteNome ?? "Cliente"} · {c.createdAt ? new Date(c.createdAt).toLocaleDateString("pt-BR") : "—"}
                                  {c.tipoPagamento && <span className="ml-1 opacity-70">· {tipoPgto[c.tipoPagamento] ?? c.tipoPagamento}</span>}
                                </p>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <p className="text-xs font-bold">{formatCurrency(vComissao)}</p>
                                <p className="text-[10px] text-muted-foreground">{pct.toFixed(0)}% de {formatCurrency(vLiquido)}</p>
                              </div>
                              {c.paga ? (
                                <span className="text-[10px] px-2 py-0.5 rounded-full font-medium flex-shrink-0"
                                  style={{ background: "oklch(62% 0.18 155 / 14%)", color: "oklch(35% 0.14 155)" }}>Paga</span>
                              ) : podeMarcarPaga ? (
                                <button
                                  className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg border font-medium flex-shrink-0 transition-colors"
                                  style={{ borderColor: "oklch(62% 0.18 155 / 40%)", color: "oklch(35% 0.14 155)", background: "oklch(62% 0.18 155 / 8%)" }}
                                  onClick={() => pagarMutation.mutate({ id: c.id })}
                                  disabled={pagarMutation.isPending}
                                >
                                  <CheckCircle className="w-2.5 h-2.5" />
                                  Pagar
                                </button>
                              ) : (
                                <span className="text-[10px] px-2 py-0.5 rounded-full font-medium flex-shrink-0"
                                  style={{ background: "oklch(72% 0.16 80 / 14%)", color: "oklch(40% 0.14 75)" }}>Pendente</span>
                              )}
                            </div>
                            {/* Breakdown de valores */}
                            <div className="ml-3 rounded-lg px-3 py-2 space-y-1" style={{ background: "oklch(96% 0.006 250)", border: "1px solid oklch(91% 0.01 250)" }}>
                              <div className="flex justify-between items-center">
                                <span className="text-[10px] text-muted-foreground">Valor bruto do serviço</span>
                                <span className="text-[10px] font-medium text-foreground">{formatCurrency(vServico)}</span>
                              </div>
                              {vTaxa > 0 && (
                                <div className="flex justify-between items-center">
                                  <span className="text-[10px] text-muted-foreground">(−) Taxa maquininha</span>
                                  <span className="text-[10px] font-medium" style={{ color: "oklch(42% 0.18 25)" }}>− {formatCurrency(vTaxa)}</span>
                                </div>
                              )}
                              {vCusto > 0 && (
                                <div className="flex justify-between items-center">
                                  <span className="text-[10px] text-muted-foreground">(−) Custo de reposição</span>
                                  <span className="text-[10px] font-medium" style={{ color: "oklch(42% 0.18 25)" }}>− {formatCurrency(vCusto)}</span>
                                </div>
                              )}
                              {temDesconto && (
                                <div className="flex justify-between items-center pt-1" style={{ borderTop: "1px solid oklch(88% 0.01 250)" }}>
                                  <span className="text-[10px] font-medium text-muted-foreground">Valor líquido</span>
                                  <span className="text-[10px] font-semibold text-foreground">{formatCurrency(vLiquido)}</span>
                                </div>
                              )}
                              <div className="flex justify-between items-center pt-1" style={{ borderTop: temDesconto ? undefined : "1px solid oklch(88% 0.01 250)" }}>
                                <span className="text-[10px] font-medium" style={{ color: cor }}>Comissão ({pct.toFixed(0)}%)</span>
                                <span className="text-[10px] font-bold" style={{ color: cor }}>{formatCurrency(vComissao)}</span>
                              </div>
                              {vReceitaDona > 0 && (
                                <div className="flex justify-between items-center">
                                  <span className="text-[10px] text-muted-foreground">Receita da dona</span>
                                  <span className="text-[10px] font-medium text-foreground">{formatCurrency(vReceitaDona)}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
