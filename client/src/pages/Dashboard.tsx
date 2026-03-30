import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Link } from "wouter";
import {
  Calendar, Users, TrendingUp, DollarSign,
  AlertCircle, ArrowUpRight, ArrowDownRight, Plus, ChevronRight, CheckCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useMemo } from "react";
import NovaAgendaModal from "@/components/NovaAgendaModal";

const statusLabel: Record<string, string> = {
  pre_agendado: "Pré-agendado",
  aguardando_reserva: "Aguard. Reserva",
  agendado: "Agendado",
  confirmado: "Confirmado",
  em_andamento: "Em andamento",
  concluido: "Concluído",
  cancelado: "Cancelado",
  faltou: "Faltou",
};

const statusColor: Record<string, string> = {
  pre_agendado: "bg-purple-100 text-purple-700",
  aguardando_reserva: "bg-orange-100 text-orange-700",
  agendado: "bg-blue-100 text-blue-700",
  confirmado: "bg-emerald-100 text-emerald-700",
  em_andamento: "bg-cyan-100 text-cyan-700",
  concluido: "bg-gray-100 text-gray-600",
  cancelado: "bg-red-100 text-red-700",
  faltou: "bg-amber-100 text-amber-700",
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export default function Dashboard() {
  const { user } = useAuth();
  const [novaAgendaOpen, setNovaAgendaOpen] = useState(false);

  const today = new Date().toISOString().split("T")[0];

  const { data: empresa } = trpc.empresa.get.useQuery();
  const { data: metrics } = trpc.financeiro.dashboard.useQuery();
  const { data: agendamentosHoje } = trpc.agendamentos.list.useQuery({ dataInicio: today, dataFim: today });
  const { data: clientes } = trpc.clientes.list.useQuery();
  const { data: profissionais } = trpc.profissionais.list.useQuery();
  const { data: servicos } = trpc.servicos.list.useQuery();
  const { data: notificacoes } = trpc.notificacoes.list.useQuery();

  const naoLidas = notificacoes?.filter(n => !n.lida).length ?? 0;

  const profMap = useMemo(() => {
    const map: Record<number, string> = {};
    profissionais?.forEach(p => { map[p.id] = p.nome; });
    return map;
  }, [profissionais]);

  const clienteMap = useMemo(() => {
    const map: Record<number, string> = {};
    clientes?.forEach(c => { map[c.id] = c.nome; });
    return map;
  }, [clientes]);

  const servicoMap = useMemo(() => {
    const map: Record<number, string> = {};
    servicos?.forEach(s => { map[s.id] = s.nome; });
    return map;
  }, [servicos]);

  const agendamentosOrdenados = useMemo(() => {
    return [...(agendamentosHoje ?? [])].sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));
  }, [agendamentosHoje]);

  const variacaoReceita = metrics
    ? metrics.receitaMesAnterior > 0
      ? ((metrics.receitaMes - metrics.receitaMesAnterior) / metrics.receitaMesAnterior) * 100
      : 0
    : 0;

  if (!empresa) {
    return (
      <div className="p-8 max-w-lg mx-auto text-center mt-16">
        <div className="w-16 h-16 bg-secondary rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Calendar className="w-8 h-8 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-semibold mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
          Configure sua empresa
        </h2>
        <p className="text-muted-foreground text-sm mb-6">
          Para começar a usar o Agendei, configure as informações da sua empresa.
        </p>
        <Link href="/admin/configuracoes">
          <Button>Configurar agora</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>
            Bom dia, {user?.name?.split(" ")[0]} 👋
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>
        <Button onClick={() => setNovaAgendaOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Novo Agendamento
        </Button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Agendamentos hoje",
            value: agendamentosHoje?.length ?? 0,
            icon: Calendar,
            iconBg: "bg-blue-50",
            iconColor: "text-blue-600",
            sub: "Hoje",
          },
          {
            label: "Receita do mês",
            value: formatCurrency(metrics?.receitaMes ?? 0),
            icon: DollarSign,
            iconBg: "bg-emerald-50",
            iconColor: "text-emerald-600",
            sub: variacaoReceita !== 0 ? `${variacaoReceita >= 0 ? "+" : ""}${variacaoReceita.toFixed(0)}% vs mês ant.` : "Mês atual",
            trend: variacaoReceita,
          },
          {
            label: "Clientes ativos",
            value: metrics?.totalClientes ?? 0,
            icon: Users,
            iconBg: "bg-purple-50",
            iconColor: "text-purple-600",
            sub: "Total cadastrado",
          },
          {
            label: "Taxa de conversão",
            value: `${metrics?.taxaConversao ?? 0}%`,
            icon: TrendingUp,
            iconBg: "bg-amber-50",
            iconColor: "text-amber-600",
            sub: "Concluídos/Total",
          },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="border-border shadow-none">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-9 h-9 ${stat.iconBg} rounded-lg flex items-center justify-center`}>
                    <Icon className={`w-4 h-4 ${stat.iconColor}`} />
                  </div>
                  {stat.trend !== undefined && (
                    <div className="flex items-center gap-0.5">
                      {stat.trend >= 0
                        ? <ArrowUpRight className="w-3 h-3 text-emerald-500" />
                        : <ArrowDownRight className="w-3 h-3 text-red-500" />}
                      <span className={`text-xs font-medium ${stat.trend >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                        {Math.abs(stat.trend).toFixed(0)}%
                      </span>
                    </div>
                  )}
                </div>
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Agenda do dia */}
        <div className="lg:col-span-2">
          <Card className="border-border shadow-none">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold">Agenda de Hoje</CardTitle>
              <Link href="/admin/calendario">
                <Button variant="ghost" size="sm" className="gap-1 text-xs h-7">
                  Ver calendário <ChevronRight className="w-3 h-3" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              {agendamentosOrdenados.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center px-6">
                  <Calendar className="w-10 h-10 text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">Nenhum agendamento para hoje</p>
                  <Button variant="outline" size="sm" className="mt-3" onClick={() => setNovaAgendaOpen(true)}>
                    Criar agendamento
                  </Button>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {agendamentosOrdenados.map((ag) => (
                    <div key={ag.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/30 transition-colors">
                      <div className="text-center min-w-[48px]">
                        <p className="text-sm font-semibold text-foreground">{ag.horaInicio.slice(0, 5)}</p>
                        <p className="text-xs text-muted-foreground">{ag.horaFim.slice(0, 5)}</p>
                      </div>
                      <div className="w-px h-8 bg-border" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {clienteMap[ag.clienteId] ?? "Cliente"}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {servicoMap[ag.servicoId] ?? "Serviço"} · {profMap[ag.profissionalId] ?? "Profissional"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[ag.status] ?? "bg-gray-100 text-gray-600"}`}>
                          {statusLabel[ag.status] ?? ag.status}
                        </span>
                        <span className="text-sm font-semibold text-foreground">
                          {formatCurrency(parseFloat(String(ag.valorTotal)))}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Painel lateral */}
        <div className="space-y-4">
          <Card className="border-border shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Resumo do Mês</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: "Ticket médio", value: formatCurrency(metrics?.ticketMedio ?? 0) },
                { label: "Total de atend.", value: metrics?.agendamentosMes ?? 0 },
                { label: "Comissões pend.", value: metrics?.comissoesPendentes ?? 0, highlight: "text-amber-600" },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{item.label}</span>
                  <span className={`text-sm font-semibold ${item.highlight ?? "text-foreground"}`}>{item.value}</span>
                </div>
              ))}
              <div className="pt-2 border-t border-border flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">Receita total</span>
                <span className="text-sm font-bold text-emerald-600">{formatCurrency(metrics?.receitaMes ?? 0)}</span>
              </div>
            </CardContent>
          </Card>

          {naoLidas > 0 && (
            <Card className="border-amber-200 bg-amber-50 shadow-none">
              <CardContent className="p-4 flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-amber-800">
                    {naoLidas} notificaç{naoLidas === 1 ? "ão" : "ões"} não lida{naoLidas !== 1 ? "s" : ""}
                  </p>
                </div>
                <Link href="/admin/notificacoes">
                  <Button variant="ghost" size="sm" className="h-7 text-amber-700 hover:bg-amber-100">Ver</Button>
                </Link>
              </CardContent>
            </Card>
          )}

          <Card className="border-border shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Atalhos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-0.5 p-3">
              {[
                { href: "/admin/clientes", label: "Cadastrar cliente", icon: Users },
                { href: "/admin/financeiro", label: "Ver comissões", icon: DollarSign },
                { href: "/admin/automacoes", label: "Automações", icon: CheckCircle },
                { href: "/admin/configuracoes", label: "Configurações", icon: TrendingUp },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <Link key={item.href} href={item.href}>
                    <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-muted transition-colors cursor-pointer">
                      <Icon className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-foreground">{item.label}</span>
                      <ChevronRight className="w-3 h-3 text-muted-foreground ml-auto" />
                    </div>
                  </Link>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>

      {novaAgendaOpen && (
        <NovaAgendaModal open={novaAgendaOpen} onClose={() => setNovaAgendaOpen(false)} />
      )}
    </div>
  );
}
