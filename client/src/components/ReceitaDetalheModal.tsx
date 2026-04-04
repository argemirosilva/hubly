import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { usePermissoes } from "@/hooks/usePermissoes";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  DollarSign, TrendingUp, Calendar, ChevronLeft, ChevronRight,
  CheckCircle2, Clock, ArrowUpRight, ArrowDownRight, Banknote,
} from "lucide-react";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatDate(d: string | Date) {
  return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function ReceitaDetalheModal({ open, onClose }: Props) {
  const { pode, isAdmin, isOwner, profissionalId } = usePermissoes();
  const isProfissional = !!profissionalId;

  // Período: mês/ano selecionado
  const [mesOffset, setMesOffset] = useState(0); // 0 = mês atual, -1 = anterior, etc.

  const { dataInicio, dataFim, mesLabel } = useMemo(() => {
    const hoje = new Date();
    const targetDate = new Date(hoje.getFullYear(), hoje.getMonth() + mesOffset, 1);
    const ano = targetDate.getFullYear();
    const mes = targetDate.getMonth();
    const inicio = new Date(ano, mes, 1).toISOString().split("T")[0];
    const fim = new Date(ano, mes + 1, 0).toISOString().split("T")[0];
    return {
      dataInicio: inicio,
      dataFim: fim,
      mesLabel: `${MESES[mes]} ${ano}`,
    };
  }, [mesOffset]);

  // Buscar comissões do período
  const { data: comissoes, isLoading } = trpc.financeiro.comissoes.useQuery(
    { dataInicio, dataFim },
    { enabled: open }
  );

  // Buscar profissionais para nomes
  const { data: profissionais } = trpc.profissionais.list.useQuery(undefined, { enabled: open });
  const profMap = useMemo(() => {
    const m: Record<number, string> = {};
    profissionais?.forEach(p => { m[p.id] = p.nome; });
    return m;
  }, [profissionais]);

  // Métricas calculadas
  const metricas = useMemo(() => {
    if (!comissoes || comissoes.length === 0) {
      return {
        totalReceita: 0,
        totalComissao: 0,
        totalPago: 0,
        totalPendente: 0,
        qtdServicos: 0,
        ticketMedio: 0,
      };
    }
    const totalReceita = comissoes.reduce((s, c) => s + parseFloat(String(c.valorServico ?? 0)), 0);
    const totalComissao = comissoes.reduce((s, c) => s + parseFloat(String(c.valorComissao ?? 0)), 0);
    const totalPago = comissoes.filter(c => c.paga).reduce((s, c) => s + parseFloat(String(c.valorComissao ?? 0)), 0);
    const totalPendente = totalComissao - totalPago;
    return {
      totalReceita,
      totalComissao,
      totalPago,
      totalPendente,
      qtdServicos: comissoes.length,
      ticketMedio: comissoes.length > 0 ? totalReceita / comissoes.length : 0,
    };
  }, [comissoes]);

  // Comparação com mês anterior
  const { dataInicio: dataInicioAnterior, dataFim: dataFimAnterior } = useMemo(() => {
    const hoje = new Date();
    const targetDate = new Date(hoje.getFullYear(), hoje.getMonth() + mesOffset - 1, 1);
    const ano = targetDate.getFullYear();
    const mes = targetDate.getMonth();
    return {
      dataInicio: new Date(ano, mes, 1).toISOString().split("T")[0],
      dataFim: new Date(ano, mes + 1, 0).toISOString().split("T")[0],
    };
  }, [mesOffset]);

  const { data: comissoesAnterior } = trpc.financeiro.comissoes.useQuery(
    { dataInicio: dataInicioAnterior, dataFim: dataFimAnterior },
    { enabled: open }
  );

  const variacaoReceita = useMemo(() => {
    const receitaAnterior = (comissoesAnterior ?? []).reduce((s, c) => s + parseFloat(String(c.valorServico ?? 0)), 0);
    if (receitaAnterior === 0) return 0;
    return ((metricas.totalReceita - receitaAnterior) / receitaAnterior) * 100;
  }, [metricas.totalReceita, comissoesAnterior]);

  const isCurrentMonth = mesOffset === 0;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto p-0">
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle className="text-lg font-bold tracking-tight">
            {isProfissional ? "Minhas Receitas" : "Receitas do Período"}
          </DialogTitle>
        </DialogHeader>

        {/* Seletor de período */}
        <div className="px-6 pt-3 pb-1">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={() => setMesOffset(o => o - 1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-semibold">{mesLabel}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setMesOffset(o => Math.min(o + 1, 0))} disabled={isCurrentMonth}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          {mesOffset !== 0 && (
            <div className="text-center mt-1">
              <button onClick={() => setMesOffset(0)} className="text-xs text-muted-foreground hover:text-foreground transition-colors underline">
                Voltar ao mês atual
              </button>
            </div>
          )}
        </div>

        {/* Cards de métricas */}
        <div className="px-6 py-3">
          <div className="grid grid-cols-2 gap-3">
            {/* Receita bruta */}
            <div className="rounded-xl p-3.5 border border-border/50" style={{ background: "oklch(62% 0.18 155 / 6%)" }}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "oklch(62% 0.18 155 / 15%)" }}>
                  <DollarSign className="w-3.5 h-3.5" style={{ color: "oklch(38% 0.14 155)" }} />
                </div>
                <span className="text-xs text-muted-foreground font-medium">
                  {isProfissional ? "Receita dos serviços" : "Receita bruta"}
                </span>
              </div>
              <p className="text-xl font-bold tracking-tight" style={{ color: "oklch(35% 0.14 155)" }}>
                {formatCurrency(metricas.totalReceita)}
              </p>
              {variacaoReceita !== 0 && (
                <div className="flex items-center gap-1 mt-1">
                  {variacaoReceita >= 0
                    ? <ArrowUpRight className="w-3 h-3" style={{ color: "oklch(38% 0.14 155)" }} />
                    : <ArrowDownRight className="w-3 h-3" style={{ color: "oklch(40% 0.18 25)" }} />}
                  <span className="text-[11px] font-semibold" style={{ color: variacaoReceita >= 0 ? "oklch(38% 0.14 155)" : "oklch(40% 0.18 25)" }}>
                    {variacaoReceita >= 0 ? "+" : ""}{variacaoReceita.toFixed(0)}% vs mês anterior
                  </span>
                </div>
              )}
            </div>

            {/* Comissão total */}
            <div className="rounded-xl p-3.5 border border-border/50" style={{ background: "oklch(55% 0.22 264 / 6%)" }}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "oklch(55% 0.22 264 / 15%)" }}>
                  <Banknote className="w-3.5 h-3.5" style={{ color: "oklch(45% 0.18 264)" }} />
                </div>
                <span className="text-xs text-muted-foreground font-medium">
                  {isProfissional ? "Minha comissão" : "Comissões"}
                </span>
              </div>
              <p className="text-xl font-bold tracking-tight" style={{ color: "oklch(35% 0.18 264)" }}>
                {formatCurrency(metricas.totalComissao)}
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">
                {metricas.qtdServicos} serviço{metricas.qtdServicos !== 1 ? "s" : ""} · Ticket médio {formatCurrency(metricas.ticketMedio)}
              </p>
            </div>

            {/* Comissão paga */}
            <div className="rounded-xl p-3.5 border border-border/50">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "oklch(62% 0.18 155 / 12%)" }}>
                  <CheckCircle2 className="w-3.5 h-3.5" style={{ color: "oklch(38% 0.14 155)" }} />
                </div>
                <span className="text-xs text-muted-foreground font-medium">Comissão paga</span>
              </div>
              <p className="text-lg font-bold tracking-tight" style={{ color: "oklch(35% 0.14 155)" }}>
                {formatCurrency(metricas.totalPago)}
              </p>
            </div>

            {/* Comissão pendente */}
            <div className="rounded-xl p-3.5 border border-border/50">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "oklch(68% 0.18 80 / 12%)" }}>
                  <Clock className="w-3.5 h-3.5" style={{ color: "oklch(40% 0.14 80)" }} />
                </div>
                <span className="text-xs text-muted-foreground font-medium">Comissão pendente</span>
              </div>
              <p className="text-lg font-bold tracking-tight" style={{ color: "oklch(40% 0.14 80)" }}>
                {formatCurrency(metricas.totalPendente)}
              </p>
            </div>
          </div>
        </div>

        {/* Lista de comissões */}
        <div className="px-6 pb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold tracking-tight">Detalhamento</h3>
            <span className="text-xs text-muted-foreground">{comissoes?.length ?? 0} registro{(comissoes?.length ?? 0) !== 1 ? "s" : ""}</span>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-14 rounded-lg bg-muted/50 animate-pulse" />
              ))}
            </div>
          ) : !comissoes || comissoes.length === 0 ? (
            <div className="text-center py-8">
              <DollarSign className="w-10 h-10 mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">Nenhuma comissão registrada neste período</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {comissoes.map((c) => {
                const valorServico = parseFloat(String(c.valorServico ?? 0));
                const valorComissao = parseFloat(String(c.valorComissao ?? 0));
                const percentual = parseFloat(String(c.percentualComissao ?? 0));
                return (
                  <div key={c.id} className="flex items-center gap-3 p-3 rounded-xl border border-border/50 hover:bg-muted/30 transition-colors">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: c.paga ? "oklch(62% 0.18 155 / 12%)" : "oklch(68% 0.18 80 / 12%)" }}>
                      {c.paga
                        ? <CheckCircle2 className="w-4 h-4" style={{ color: "oklch(38% 0.14 155)" }} />
                        : <Clock className="w-4 h-4" style={{ color: "oklch(40% 0.14 80)" }} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {!isProfissional && (
                          <span className="text-xs font-semibold truncate">
                            {profMap[c.profissionalId] ?? `Prof. #${c.profissionalId}`}
                          </span>
                        )}
                        <span className="text-[11px] text-muted-foreground">
                          {formatDate(c.createdAt)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] text-muted-foreground">
                          Serviço: {formatCurrency(valorServico)} · {percentual}%
                        </span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold" style={{ color: c.paga ? "oklch(35% 0.14 155)" : "oklch(40% 0.14 80)" }}>
                        {formatCurrency(valorComissao)}
                      </p>
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md"
                        style={{
                          background: c.paga ? "oklch(62% 0.18 155 / 12%)" : "oklch(68% 0.18 80 / 12%)",
                          color: c.paga ? "oklch(35% 0.14 155)" : "oklch(38% 0.14 80)",
                        }}>
                        {c.paga ? "Paga" : "Pendente"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
