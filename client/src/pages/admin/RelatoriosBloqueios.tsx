import { useMemo, useState } from "react";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { Lock, CheckCircle, XCircle, Calendar, ShieldOff } from "lucide-react";
import { usePermissoes } from "@/hooks/usePermissoes";

export default function RelatoriosBloqueios() {
  const { pode } = usePermissoes();
  const [filtroMes, setFiltroMes] = useState<string>(new Date().toISOString().slice(0, 7));
  
  const temPermissao = pode("agendamentosVer");
  const { data: bloqueios } = trpc.bloqueios.list.useQuery({}, { enabled: temPermissao });
  const { data: profissionais } = trpc.profissionais.listParaAgendamento.useQuery(undefined, { enabled: temPermissao });

  if (!temPermissao) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
        <ShieldOff className="w-12 h-12 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Acesso restrito</h2>
        <p className="text-muted-foreground text-sm max-w-xs">Você não tem permissão para visualizar o relatório de bloqueios. Fale com o administrador.</p>
      </div>
    );
  }

  const profMap: Record<number, string> = {};
  profissionais?.forEach(p => { profMap[p.id] = p.nome; });

  const bloqueiosMes = useMemo(() => {
    if (!bloqueios) return [];
    return bloqueios.filter(b => b.dataInicio.startsWith(filtroMes));
  }, [bloqueios, filtroMes]);

  const metricas = useMemo(() => {
    const total = bloqueiosMes.length;
    const aprovados = bloqueiosMes.filter(b => b.status === "aprovado").length;
    const recusados = bloqueiosMes.filter(b => b.status === "recusado").length;
    const pendentes = bloqueiosMes.filter(b => b.status === "pendente").length;
    
    return {
      total,
      aprovados,
      recusados,
      pendentes,
      taxaAprovacao: total > 0 ? Math.round((aprovados / total) * 100) : 0,
    };
  }, [bloqueiosMes]);

  const bloqueiosPorProfissional = useMemo(() => {
    const map: Record<number, number> = {};
    bloqueiosMes.forEach(b => {
      map[b.profissionalId] = (map[b.profissionalId] ?? 0) + 1;
    });
    return Object.entries(map).map(([profId, count]) => ({
      nome: profMap[parseInt(profId)] ?? "Profissional",
      bloqueios: count,
    })).sort((a, b) => b.bloqueios - a.bloqueios);
  }, [bloqueiosMes, profMap]);

  const motivosMaisComuns = useMemo(() => {
    const map: Record<string, number> = {};
    bloqueiosMes.forEach(b => {
      if (b.motivo) {
        map[b.motivo] = (map[b.motivo] ?? 0) + 1;
      }
    });
    return Object.entries(map)
      .map(([motivo, count]) => ({ motivo, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [bloqueiosMes]);

  const motivosRecusa = useMemo(() => {
    const map: Record<string, number> = {};
    bloqueiosMes.filter(b => b.status === "recusado").forEach(b => {
      if (b.motivoRecusa) {
        map[b.motivoRecusa] = (map[b.motivoRecusa] ?? 0) + 1;
      }
    });
    return Object.entries(map)
      .map(([motivo, count]) => ({ motivo, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [bloqueiosMes]);

  const distribuicaoStatus = useMemo(() => [
    { name: "Aprovados", value: metricas.aprovados, fill: "oklch(62% 0.18 155)" },
    { name: "Recusados", value: metricas.recusados, fill: "oklch(58% 0.22 25)" },
    { name: "Pendentes", value: metricas.pendentes, fill: "oklch(72% 0.16 80)" },
  ].filter(d => d.value > 0), [metricas]);

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-6 animate-in-up">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-bold tracking-tight text-2xl lg:text-3xl flex items-center gap-2">
            <Lock className="w-6 h-6" />
            Relatório de Bloqueios
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Análise de bloqueios de agenda e aprovações</p>
        </div>
        <Select value={filtroMes} onValueChange={setFiltroMes}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: 12 }, (_, i) => {
              const d = new Date();
              d.setMonth(d.getMonth() - i);
              const mes = d.toISOString().slice(0, 7);
              return (
                <SelectItem key={mes} value={mes}>
                  {new Date(mes + "-01").toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total de Bloqueios</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metricas.total}</div>
            <p className="text-xs text-muted-foreground mt-1">neste mês</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <CheckCircle className="w-4 h-4" /> Aprovados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{metricas.aprovados}</div>
            <p className="text-xs text-muted-foreground mt-1">{metricas.taxaAprovacao}% de aprovação</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <XCircle className="w-4 h-4" /> Recusados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{metricas.recusados}</div>
            <p className="text-xs text-muted-foreground mt-1">taxa de rejeição</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <Calendar className="w-4 h-4" /> Pendentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{metricas.pendentes}</div>
            <p className="text-xs text-muted-foreground mt-1">aguardando aprovação</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {distribuicaoStatus.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Distribuição de Status</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={distribuicaoStatus} cx="50%" cy="50%" labelLine={false} label={({ name, value }) => `${name}: ${value}`} outerRadius={80} fill="#8884d8" dataKey="value">
                    {distribuicaoStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {bloqueiosPorProfissional.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Bloqueios por Profissional</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={bloqueiosPorProfissional}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="nome" angle={-45} textAnchor="end" height={80} interval={0} tick={{ fontSize: 12 }} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="bloqueios" fill="oklch(78.5% 0.075 85)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {motivosMaisComuns.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Motivos Mais Comuns</CardTitle>
              <CardDescription>Top 5 motivos de bloqueio</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {motivosMaisComuns.map((item, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground truncate">{item.motivo}</span>
                    <span className="text-sm font-semibold">{item.count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {motivosRecusa.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Motivos de Rejeição</CardTitle>
              <CardDescription>Top 5 motivos de recusa</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {motivosRecusa.map((item, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground truncate">{item.motivo}</span>
                    <span className="text-sm font-semibold">{item.count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Bloqueios do Mês</CardTitle>
          <CardDescription>{bloqueiosMes.length} bloqueios registrados</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-2 font-semibold">Profissional</th>
                  <th className="text-left py-2 px-2 font-semibold">Período</th>
                  <th className="text-left py-2 px-2 font-semibold">Motivo</th>
                  <th className="text-left py-2 px-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {bloqueiosMes.slice(0, 10).map(b => (
                  <tr key={b.id} className="border-b hover:bg-muted/50">
                    <td className="py-2 px-2">{profMap[b.profissionalId] ?? "Profissional"}</td>
                    <td className="py-2 px-2 text-xs">{b.dataInicio?.split("-").reverse().join("/")} → {b.dataFim?.split("-").reverse().join("/")}</td>
                    <td className="py-2 px-2 text-xs text-muted-foreground truncate">{b.motivo ?? "-"}</td>
                    <td className="py-2 px-2">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        b.status === "aprovado" ? "bg-green-100 text-green-700" :
                        b.status === "recusado" ? "bg-red-100 text-red-700" :
                        "bg-yellow-100 text-yellow-700"
                      }`}>
                        {b.status === "aprovado" ? "Aprovado" : b.status === "recusado" ? "Recusado" : "Pendente"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
