import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DollarSign, TrendingUp, CheckCircle, Clock } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";

function formatCurrency(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

export default function Financeiro() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [filtroProfId, setFiltroProfId] = useState("todos");

  // Se o usuário é profissional vinculado, filtra apenas suas comissões
  const profissionalVinculadoId = (user as any)?.profissionalId ?? null;

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
      // Filtro automático: profissional vinculado vê apenas suas próprias comissões
      const matchProf = profissionalVinculadoId
        ? c.profissionalId === profissionalVinculadoId
        : filtroProfId === "todos" || c.profissionalId === parseInt(filtroProfId);
      return matchStatus && matchProf;
    });
  }, [comissoes, filtroStatus, filtroProfId, profissionalVinculadoId]);

  const totalPendente = filtradas.filter(c => !c.paga).reduce((acc, c) => acc + parseFloat(String(c.valorComissao)), 0);

  return (
    <div className="p-4 lg:p-6 space-y-4 lg:space-y-6 max-w-6xl mx-auto animate-in-up">
      <h1 className="font-bold tracking-tight text-xl lg:text-2xl">Financeiro</h1>

      {/* Cards de métricas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Receita do mês", value: formatCurrency(metrics?.receitaMes ?? 0), icon: DollarSign, iconBg: "oklch(62% 0.18 155 / 12%)", iconColor: "oklch(38% 0.14 155)" },
          { label: "Ticket médio", value: formatCurrency(metrics?.ticketMedio ?? 0), icon: TrendingUp, iconBg: "oklch(55% 0.22 264 / 12%)", iconColor: "oklch(45% 0.18 264)" },
          { label: "Comissões pagas", value: formatCurrency(comissoes?.filter(c => c.paga).reduce((a, c) => a + parseFloat(String(c.valorComissao)), 0) ?? 0), icon: CheckCircle, iconBg: "oklch(60% 0.20 300 / 12%)", iconColor: "oklch(42% 0.16 300)" },
          { label: "Comissões pendentes", value: formatCurrency(metrics?.comissoesPendentes ?? 0), icon: Clock, iconBg: "oklch(72% 0.16 80 / 12%)", iconColor: "oklch(40% 0.14 75)" },
        ].map(stat => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="stat-card">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
                style={{ background: stat.iconBg }}>
                <Icon className="w-4 h-4" style={{ color: stat.iconColor }} />
              </div>
              <p className="text-lg lg:text-xl font-bold text-foreground tracking-tight">{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
            </div>
          );
        })}
      </div>

      {/* Comissões */}
      <div className="card-elegant overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4"
          style={{ borderBottom: "1px solid oklch(90% 0.012 250)" }}>
          <div>
            <h3 className="font-semibold text-sm tracking-tight">Comissões</h3>
            {totalPendente > 0 && (
              <p className="text-xs mt-0.5" style={{ color: "oklch(40% 0.14 75)" }}>
                {formatCurrency(totalPendente)} pendente
              </p>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            {/* Seletor de profissional: ocultado para usuários vinculados a um profissional */}
            {!profissionalVinculadoId && (
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
        <div>
          {filtradas.length === 0 ? (
            <div className="py-12 text-center">
              <DollarSign className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Nenhuma comissão encontrada</p>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: "oklch(94% 0.008 250)" }}>
              {filtradas.map(c => (
                <div key={c.id} className="flex items-center gap-3 px-4 py-3.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{profMap[c.profissionalId] ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.createdAt ? new Date(c.createdAt).toLocaleDateString("pt-BR") : "—"}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold">{formatCurrency(parseFloat(String(c.valorComissao)))}</p>
                    <p className="text-xs text-muted-foreground">{parseFloat(String(c.percentualComissao ?? 0)).toFixed(0)}%</p>
                  </div>
                  {c.paga ? (
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0"
                      style={{ background: "oklch(62% 0.18 155 / 14%)", color: "oklch(35% 0.14 155)" }}>Paga</span>
                  ) : (
                    <button
                      className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border font-medium flex-shrink-0 transition-colors"
                      style={{ borderColor: "oklch(62% 0.18 155 / 40%)", color: "oklch(35% 0.14 155)", background: "oklch(62% 0.18 155 / 8%)" }}
                      onClick={() => pagarMutation.mutate({ id: c.id })}
                      disabled={pagarMutation.isPending}
                    >
                      <CheckCircle className="w-3 h-3" />
                      Pagar
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
