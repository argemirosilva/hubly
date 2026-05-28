import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, BarChart3, TrendingUp, TrendingDown, Calendar, Users, Target, Clock, ShieldOff } from "lucide-react";
import { usePermissoes } from "@/hooks/usePermissoes";

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function mesLabel(mes: string) {
  const [ano, m] = mes.split("-");
  const nomes = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
  return `${nomes[parseInt(m) - 1]}/${ano.slice(2)}`;
}

// ── Painel de Perdas ─────────────────────────────────────────────────────────
function PainelPerdas() {
  const [meses, setMeses] = useState(3);
  const { data, isLoading } = trpc.relatorios.getPerdas.useQuery({ meses });

  if (isLoading) return <div className="text-center py-12 text-muted-foreground">Carregando...</div>;
  if (!data) return null;

  const maxReceita = Math.max(...(data.porMes.map(m => m.receita)), 1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-lg">Relatório de Perdas</h3>
          <p className="text-sm text-muted-foreground">Cancelamentos e faltas com impacto financeiro</p>
        </div>
        <Select value={String(meses)} onValueChange={v => setMeses(Number(v))}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Último mês</SelectItem>
            <SelectItem value="3">3 meses</SelectItem>
            <SelectItem value="6">6 meses</SelectItem>
            <SelectItem value="12">12 meses</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-red-100 bg-red-50">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-red-600 font-medium">Cancelamentos</p>
            <p className="text-2xl font-bold text-red-700">{data.totalCancelados}</p>
            <p className="text-xs text-red-500 mt-1">{fmt(data.receitaPerdida)} perdidos</p>
          </CardContent>
        </Card>
        <Card className="border-orange-100 bg-orange-50">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-orange-600 font-medium">Faltas</p>
            <p className="text-2xl font-bold text-orange-700">{data.totalFaltou}</p>
            <p className="text-xs text-orange-500 mt-1">{fmt(data.receitaFaltou)} perdidos</p>
          </CardContent>
        </Card>
        <Card className="border-green-100 bg-green-50">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-green-600 font-medium">Receita Realizada</p>
            <p className="text-2xl font-bold text-green-700">{fmt(data.receitaRealizada)}</p>
            <p className="text-xs text-green-500 mt-1">no período</p>
          </CardContent>
        </Card>
        <Card className={`border-${data.taxaPerda > 20 ? "red" : data.taxaPerda > 10 ? "yellow" : "green"}-100 bg-${data.taxaPerda > 20 ? "red" : data.taxaPerda > 10 ? "yellow" : "green"}-50`}>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs font-medium" style={{ color: data.taxaPerda > 20 ? "#dc2626" : data.taxaPerda > 10 ? "#d97706" : "#16a34a" }}>Taxa de Perda</p>
            <p className="text-2xl font-bold" style={{ color: data.taxaPerda > 20 ? "#dc2626" : data.taxaPerda > 10 ? "#d97706" : "#16a34a" }}>{data.taxaPerda}%</p>
            <p className="text-xs text-muted-foreground mt-1">{data.taxaPerda <= 10 ? "Saudavel" : data.taxaPerda <= 20 ? "Atencao" : "Critico"}</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de barras por mês */}
      {data.porMes.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Perdas por Mês</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.porMes.map(m => (
                <div key={m.mes} className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{mesLabel(m.mes)}</span>
                    <span>{m.cancelados + m.faltou} perdas · {fmt(m.receita)}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-red-400 rounded-full transition-all"
                      style={{ width: `${Math.round((m.receita / maxReceita) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Últimos cancelamentos */}
      {data.ultimosCancelados.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Últimos Cancelamentos</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {data.ultimosCancelados.map((c, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{c.cliente ?? "Cliente"}</p>
                    <p className="text-xs text-muted-foreground">{c.servico} · {c.profissional}</p>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <p className="text-sm font-medium text-red-600">{fmt(c.valor)}</p>
                    <p className="text-xs text-muted-foreground">{c.data ? new Date(c.data + "T12:00:00").toLocaleDateString("pt-BR") : ""}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── Painel de Taxa de Ocupação ───────────────────────────────────────────────
function PainelOcupacao() {
  const [meses, setMeses] = useState(3);
  const { data, isLoading } = trpc.relatorios.getTaxaOcupacao.useQuery({ meses });

  if (isLoading) return <div className="text-center py-12 text-muted-foreground">Carregando...</div>;
  if (!data) return null;

  const maxDia = Math.max(...data.porDiaSemana.map(d => d.agendamentos), 1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-lg">Taxa de Ocupação</h3>
          <p className="text-sm text-muted-foreground">Eficiência da agenda por período, dia e profissional</p>
        </div>
        <Select value={String(meses)} onValueChange={v => setMeses(Number(v))}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Último mês</SelectItem>
            <SelectItem value="3">3 meses</SelectItem>
            <SelectItem value="6">6 meses</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-xs text-muted-foreground">Total de Agendamentos</p>
            <p className="text-3xl font-bold mt-1">{data.totalAgendamentos}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-xs text-muted-foreground">Concluídos</p>
            <p className="text-3xl font-bold mt-1 text-green-600">{data.totalConcluidos}</p>
          </CardContent>
        </Card>
        <Card className={`border-${data.taxaOcupacaoGeral >= 70 ? "green" : data.taxaOcupacaoGeral >= 50 ? "yellow" : "red"}-100`}>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-xs text-muted-foreground">Taxa de Conclusão</p>
            <p className={`text-3xl font-bold mt-1 ${data.taxaOcupacaoGeral >= 70 ? "text-green-600" : data.taxaOcupacaoGeral >= 50 ? "text-yellow-600" : "text-red-600"}`}>
              {data.taxaOcupacaoGeral}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Por dia da semana */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Agendamentos por Dia da Semana</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-2 h-24">
            {data.porDiaSemana.map(d => (
              <div key={d.dia} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex items-end justify-center" style={{ height: "72px" }}>
                  <div
                    className="w-full bg-primary/80 rounded-t transition-all"
                    style={{ height: `${Math.max(4, Math.round((d.agendamentos / maxDia) * 72))}px` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground">{d.dia}</span>
                <span className="text-xs font-medium">{d.agendamentos}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Por profissional */}
      {data.porProfissional.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Ocupação por Profissional</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {data.porProfissional.map((p, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                    {p.nome.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{p.nome}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${p.taxa}%` }} />
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">{p.taxa}%</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-medium">{p.concluidos}/{p.total}</p>
                    <p className="text-xs text-muted-foreground">concluídos</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Por mês */}
      {data.porMes.length > 1 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Evolução Mensal</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {data.porMes.map(m => (
                <div key={m.mes} className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-sm font-medium">{mesLabel(m.mes)}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${m.taxa}%` }} />
                    </div>
                    <span className="text-sm text-muted-foreground w-12 text-right">{m.taxa}%</span>
                    <span className="text-xs text-muted-foreground w-16 text-right">{m.concluidos}/{m.total}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── Painel de Previsão de Faturamento ────────────────────────────────────────
function PainelPrevisao() {
  const { data, isLoading } = trpc.relatorios.getPrevisaoFaturamento.useQuery();

  if (isLoading) return <div className="text-center py-12 text-muted-foreground">Carregando...</div>;
  if (!data) return null;

  const progresso = Math.min(100, Math.round((data.diasPassados / data.diasNoMes) * 100));
  const progressoReceita = data.projecaoMes > 0 ? Math.min(100, Math.round((data.receitaRealizada / data.projecaoMes) * 100)) : 0;
  const mesRef = (data as any).mesReferencia as string | undefined;
  const ehMesFuturo = mesRef ? mesRef > `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}` : false;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold text-lg">Previsão de Faturamento</h3>
        <p className="text-sm text-muted-foreground">
          {mesRef ? <>Referência: <strong>{mesLabel(mesRef)}</strong>{ehMesFuturo ? " (próximo mês com agendamentos)" : ""}</> : "Projeção baseada no ritmo atual e histórico de 3 meses"}
        </p>
      </div>

      {/* Progresso do mês */}
      <Card>
        <CardContent className="pt-5 pb-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">Progresso do mês</span>
            <span className="font-medium">{data.diasPassados} de {data.diasNoMes} dias ({progresso}%)</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progresso}%` }} />
          </div>
        </CardContent>
      </Card>

      {/* KPIs de faturamento */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Receita Realizada</p>
            <p className="text-2xl font-bold text-green-600 mt-1">{fmt(data.receitaRealizada)}</p>
            <p className="text-xs text-muted-foreground mt-1">até hoje</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Agendamentos Futuros</p>
            <p className="text-2xl font-bold text-amber-700 mt-1">{fmt(data.receitaPrevista)}</p>
            <p className="text-xs text-muted-foreground mt-1">{data.agendamentosFuturos} agendamentos</p>
          </CardContent>
        </Card>
        <Card className={`border-${data.comparacaoMedia >= 0 ? "green" : "red"}-100 bg-${data.comparacaoMedia >= 0 ? "green" : "red"}-50`}>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Projeção do Mês</p>
            <p className={`text-2xl font-bold mt-1 ${data.comparacaoMedia >= 0 ? "text-green-700" : "text-red-700"}`}>{fmt(data.projecaoMes)}</p>
            <div className="flex items-center gap-1 mt-1">
              {data.comparacaoMedia >= 0 ? <TrendingUp className="w-3 h-3 text-green-600" /> : <TrendingDown className="w-3 h-3 text-red-600" />}
              <p className={`text-xs ${data.comparacaoMedia >= 0 ? "text-green-600" : "text-red-600"}`}>
                {data.comparacaoMedia >= 0 ? "+" : ""}{data.comparacaoMedia}% vs média
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Barra de progresso da receita */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Realizado vs Projeção</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>Receita realizada</span>
              <span>{fmt(data.receitaRealizada)} de {fmt(data.projecaoMes)} projetados</span>
            </div>
            <div className="h-3 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${progressoReceita}%` }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>Média mensal (3 meses)</span>
              <span>{fmt(data.mediaMensal3Meses)}</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-amber-400 rounded-full" style={{ width: `${Math.min(100, Math.round((data.mediaMensal3Meses / Math.max(data.projecaoMes, 1)) * 100))}%` }} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resumo */}
      <Card className="bg-muted/30">
        <CardContent className="pt-4 pb-4">
          <p className="text-sm font-medium mb-2">Resumo da Projeção</p>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground">Dias restantes:</span>
              <span className="font-medium ml-2">{data.diasRestantes}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Agendamentos futuros:</span>
              <span className="font-medium ml-2">{data.agendamentosFuturos}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Total do mês:</span>
              <span className="font-medium ml-2">{data.totalMesAtual}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Média histórica:</span>
              <span className="font-medium ml-2">{fmt(data.mediaMensal3Meses)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Página Principal ─────────────────────────────────────────────────────────
export default function Relatorios() {
  const { pode } = usePermissoes();

  if (!pode("financeiroVer")) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
        <ShieldOff className="w-12 h-12 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Acesso restrito</h2>
        <p className="text-muted-foreground text-sm max-w-xs">Você não tem permissão para visualizar os relatórios financeiros. Fale com o administrador.</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <BarChart3 className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Relatórios</h1>
          <p className="text-sm text-muted-foreground">Inteligência de negócio para decisões mais assertivas</p>
        </div>
      </div>

      <Tabs defaultValue="perdas">
        <TabsList className="grid grid-cols-3 w-full" style={{backgroundColor: '#f2eadc'}}>
          <TabsTrigger value="perdas" className="flex items-center gap-1.5 text-xs">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Perdas</span>
            <span className="sm:hidden">Perdas</span>
          </TabsTrigger>
          <TabsTrigger value="ocupacao" className="flex items-center gap-1.5 text-xs">
            <Target className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Taxa de Ocupação</span>
            <span className="sm:hidden">Ocupação</span>
          </TabsTrigger>
          <TabsTrigger value="previsao" className="flex items-center gap-1.5 text-xs">
            <TrendingUp className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Previsão</span>
            <span className="sm:hidden">Previsão</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="perdas" className="mt-6">
          <PainelPerdas />
        </TabsContent>
        <TabsContent value="ocupacao" className="mt-6">
          <PainelOcupacao />
        </TabsContent>
        <TabsContent value="previsao" className="mt-6">
          <PainelPrevisao />
        </TabsContent>
      </Tabs>
    </div>
  );
}
