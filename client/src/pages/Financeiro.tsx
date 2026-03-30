import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DollarSign, TrendingUp, CheckCircle, Clock } from "lucide-react";
import { toast } from "sonner";

function formatCurrency(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

export default function Financeiro() {
  const utils = trpc.useUtils();
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [filtroProfId, setFiltroProfId] = useState("todos");

  const { data: metrics } = trpc.financeiro.dashboard.useQuery();
  const { data: comissoes } = trpc.financeiro.comissoes.useQuery();
  const { data: profissionais } = trpc.profissionais.list.useQuery();

  const pagarMutation = trpc.financeiro.marcarPaga.useMutation({
    onSuccess: () => { toast.success("Comissão marcada como paga!"); utils.financeiro.comissoes.invalidate(); utils.financeiro.dashboard.invalidate(); },
    onError: (err: any) => toast.error(err.message),
  });

  const profMap = useMemo(() => {
    const m: Record<number, string> = {};
    profissionais?.forEach(p => { m[p.id] = p.nome; });
    return m;
  }, [profissionais]);

  const filtradas = useMemo(() => {
    return (comissoes ?? []).filter(c => {
      const matchStatus = filtroStatus === "todos" || (filtroStatus === "paga" ? c.paga : !c.paga);
      const matchProf = filtroProfId === "todos" || c.profissionalId === parseInt(filtroProfId);
      return matchStatus && matchProf;
    });
  }, [comissoes, filtroStatus, filtroProfId]);

  const totalPendente = filtradas.filter(c => !c.paga).reduce((acc, c) => acc + parseFloat(String(c.valorComissao)), 0);

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-semibold text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>
        Financeiro
      </h1>

      {/* Cards de métricas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Receita do mês", value: formatCurrency(metrics?.receitaMes ?? 0), icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Ticket médio", value: formatCurrency(metrics?.ticketMedio ?? 0), icon: TrendingUp, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Comissões pagas", value: "—", icon: CheckCircle, color: "text-purple-600", bg: "bg-purple-50" },
          { label: "Comissões pendentes", value: metrics?.comissoesPendentes ?? 0, icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
        ].map(stat => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="border-border shadow-none">
              <CardContent className="p-5">
                <div className={`w-9 h-9 ${stat.bg} rounded-lg flex items-center justify-center mb-3`}>
                  <Icon className={`w-4 h-4 ${stat.color}`} />
                </div>
                <p className="text-xl font-bold text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Comissões */}
      <Card className="border-border shadow-none">
        <CardHeader className="pb-3 flex flex-row items-center justify-between flex-wrap gap-3">
          <div>
            <CardTitle className="text-base font-semibold">Comissões</CardTitle>
            {totalPendente > 0 && (
              <p className="text-sm text-amber-600 mt-0.5">
                {formatCurrency(totalPendente)} pendente de pagamento
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Select value={filtroProfId} onValueChange={setFiltroProfId}>
              <SelectTrigger className="w-[160px] h-8 text-xs">
                <SelectValue placeholder="Profissional" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {profissionais?.map(p => (
                  <SelectItem key={p.id} value={String(p.id)}>{p.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filtroStatus} onValueChange={setFiltroStatus}>
              <SelectTrigger className="w-[130px] h-8 text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="pendente">Pendentes</SelectItem>
                <SelectItem value="paga">Pagas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filtradas.length === 0 ? (
            <div className="py-12 text-center">
              <DollarSign className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Nenhuma comissão encontrada</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filtradas.map(c => (
                <div key={c.id} className="flex items-center gap-4 px-5 py-3.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{profMap[c.profissionalId] ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.createdAt ? new Date(c.createdAt).toLocaleDateString("pt-BR") : "—"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-foreground">{formatCurrency(parseFloat(String(c.valorComissao)))}</p>
                    <p className="text-xs text-muted-foreground">{parseFloat(String(c.percentualComissao ?? 0)).toFixed(0)}% de comissão</p>
                  </div>
                  {c.paga ? (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">Paga</span>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1 text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                      onClick={() => pagarMutation.mutate({ id: c.id })}
                      disabled={pagarMutation.isPending}
                    >
                      <CheckCircle className="w-3 h-3" />
                      Pagar
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
