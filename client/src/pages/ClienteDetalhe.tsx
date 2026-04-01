import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ArrowLeft, Phone, Mail, Calendar, DollarSign, Scissors, Brain,
  Package, Clock, CheckCircle2, XCircle, AlertCircle, Zap,
} from "lucide-react";
import { Link } from "wouter";
import { useMemo } from "react";
import { toast } from "sonner";

const statusColor: Record<string, string> = {
  concluido: "bg-emerald-100 text-emerald-700",
  cancelado: "bg-red-100 text-red-700",
  faltou: "bg-amber-100 text-amber-700",
  agendado: "bg-blue-100 text-blue-700",
  confirmado: "bg-emerald-100 text-emerald-700",
};

function formatCurrency(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

export default function ClienteDetalhe({ id: propId }: { id?: number } = {}) {
  const id = propId ?? parseInt(window.location.pathname.split("/").pop() ?? "0");

  const { data: cliente } = trpc.clientes.getById.useQuery({ id }, { enabled: !!id });
  const { data: agendamentos } = trpc.agendamentos.list.useQuery({});
  const { data: servicos } = trpc.servicos.list.useQuery();
  const { data: analiseIA } = trpc.iaClientes.getClienteAnalise.useQuery({ clienteId: id }, { enabled: !!id });
  const { data: pacotesCliente = [], isLoading: loadingPacotes } = trpc.pacotes.listarPorCliente.useQuery(
    { clienteId: id },
    { enabled: !!id }
  );

  const utils = trpc.useUtils();
  const consumirMutation = trpc.pacotes.consumirSessao.useMutation({
    onSuccess: () => {
      utils.pacotes.listarPorCliente.invalidate();
      toast.success("Sessão consumida com sucesso!");
    },
    onError: (e) => toast.error(e.message),
  });

  const servicoMap = useMemo(() => {
    const m: Record<number, string> = {};
    servicos?.forEach(s => { m[s.id] = s.nome; });
    return m;
  }, [servicos]);

  const agendamentosCliente = useMemo(() => {
    return (agendamentos ?? [])
      .filter(ag => ag.clienteId === id)
      .sort((a, b) => b.data.localeCompare(a.data));
  }, [agendamentos, id]);

  const pacotesAtivos = useMemo(() => pacotesCliente.filter(p => p.status === "ativo"), [pacotesCliente]);

  if (!cliente) return (
    <div className="p-6 flex items-center justify-center min-h-[400px]">
      <p className="text-muted-foreground">Carregando...</p>
    </div>
  );

  return (
    <TooltipProvider>
      <div className="p-6 space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <Link href="/admin/clientes">
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              </Link>
            </TooltipTrigger>
            <TooltipContent>Voltar para Clientes</TooltipContent>
          </Tooltip>
          <h1 className="text-2xl font-semibold text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>
            Perfil da Cliente
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Info principal */}
          <Card className="border-border shadow-none">
            <CardContent className="p-6 text-center">
              <Avatar className="w-20 h-20 mx-auto mb-4">
                <AvatarFallback className="bg-secondary text-secondary-foreground text-2xl font-bold">
                  {cliente.nome.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <h2 className="text-lg font-semibold text-foreground">{cliente.nome}</h2>
              <div className="mt-4 space-y-2 text-left">
                {cliente.telefone && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="w-4 h-4 shrink-0" />{cliente.telefone}
                  </div>
                )}
                {cliente.email && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="w-4 h-4 shrink-0" />{cliente.email}
                  </div>
                )}
                {cliente.dataNascimento && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4 shrink-0" />
                    {cliente.dataNascimento.split("-").reverse().join("/")}
                  </div>
                )}
              </div>
              {cliente.observacoes && (
                <div className="mt-4 p-3 bg-muted/50 rounded-lg text-left">
                  <p className="text-xs text-muted-foreground mb-1">Observações</p>
                  <p className="text-sm">{cliente.observacoes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stats e abas */}
          <div className="lg:col-span-2 space-y-4">
            {/* KPIs */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Total gasto", value: formatCurrency(parseFloat(String(cliente.totalGasto ?? 0))), icon: DollarSign, color: "text-emerald-600" },
                { label: "Atendimentos", value: cliente.totalAtendimentos ?? 0, icon: Scissors, color: "text-blue-600" },
                { label: "Saldo sessões", value: cliente.saldoSessoes ?? 0, icon: Calendar, color: "text-purple-600" },
              ].map(stat => {
                const Icon = stat.icon;
                return (
                  <Card key={stat.label} className="border-border shadow-none">
                    <CardContent className="p-4 text-center">
                      <Icon className={`w-5 h-5 mx-auto mb-2 ${stat.color}`} />
                      <p className="text-xl font-bold text-foreground">{stat.value}</p>
                      <p className="text-xs text-muted-foreground">{stat.label}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Análise IA */}
            {analiseIA && (
              <Card className="border-border shadow-none">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "oklch(55% 0.22 264 / 12%)" }}>
                      <Brain className="w-3.5 h-3.5" style={{ color: "oklch(45% 0.18 264)" }} />
                    </div>
                    <h3 className="font-semibold text-sm">Análise IA</h3>
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium ml-auto" style={{
                      color: analiseIA.classificacao === 'risco' ? 'oklch(40% 0.18 25)' : analiseIA.classificacao === 'atraso_frequente' ? 'oklch(42% 0.14 75)' : analiseIA.classificacao === 'inativo' ? 'oklch(40% 0.06 250)' : analiseIA.classificacao === 'principal' ? 'oklch(38% 0.14 155)' : 'oklch(45% 0.18 264)',
                      background: analiseIA.classificacao === 'risco' ? 'oklch(55% 0.22 25 / 12%)' : analiseIA.classificacao === 'atraso_frequente' ? 'oklch(65% 0.20 75 / 12%)' : analiseIA.classificacao === 'inativo' ? 'oklch(60% 0.04 250 / 12%)' : analiseIA.classificacao === 'principal' ? 'oklch(55% 0.18 155 / 12%)' : 'oklch(55% 0.22 264 / 12%)'
                    }}>
                      {{
                        principal: '⭐ Principal',
                        bom_pagador: '✓ Bom pagador',
                        em_crescimento: '↑ Em crescimento',
                        em_queda: '↓ Em queda',
                        inativo: '○ Inativo',
                        atraso_frequente: '⚠ Atraso frequente',
                        risco: '⚡ Risco',
                        novo: '✦ Novo',
                      }[analiseIA.classificacao] ?? analiseIA.classificacao}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{analiseIA.resumo}</p>
                  <p className="text-xs text-muted-foreground mt-2">Score: <span className="font-bold text-foreground">{analiseIA.scoreCliente}/100</span> · Calculado em {new Date(analiseIA.calculadoEm).toLocaleDateString('pt-BR')}</p>
                </CardContent>
              </Card>
            )}

            {/* Abas: Histórico + Pacotes */}
            <Tabs defaultValue="historico">
              <TabsList className="mb-3">
                <TabsTrigger value="historico" className="gap-1.5 text-xs">
                  <Scissors className="w-3.5 h-3.5" /> Histórico
                </TabsTrigger>
                <TabsTrigger value="pacotes" className="gap-1.5 text-xs">
                  <Package className="w-3.5 h-3.5" /> Pacotes
                  {pacotesAtivos.length > 0 && (
                    <Badge variant="secondary" className="ml-1 text-xs h-4 px-1.5">
                      {pacotesAtivos.length}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              {/* ── Histórico ── */}
              <TabsContent value="historico">
                <Card className="border-border shadow-none">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold">Histórico de Atendimentos</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {agendamentosCliente.length === 0 ? (
                      <div className="py-8 text-center">
                        <p className="text-sm text-muted-foreground">Nenhum atendimento registrado</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-border">
                        {agendamentosCliente.map(ag => (
                          <div key={ag.id} className="flex items-center justify-between px-5 py-3">
                            <div>
                              <p className="text-sm font-medium">{servicoMap[ag.servicoId] ?? "Serviço"}</p>
                              <p className="text-xs text-muted-foreground">
                                {ag.data.split("-").reverse().join("/")} · {ag.horaInicio.slice(0, 5)}
                              </p>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor[ag.status] ?? "bg-gray-100 text-gray-600"}`}>
                                {ag.status}
                              </span>
                              <span className="text-sm font-semibold">
                                {formatCurrency(parseFloat(String(ag.valorTotal)))}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ── Pacotes ── */}
              <TabsContent value="pacotes">
                {loadingPacotes ? (
                  <div className="py-8 text-center text-muted-foreground text-sm">Carregando pacotes...</div>
                ) : pacotesCliente.length === 0 ? (
                  <Card className="border-border shadow-none">
                    <CardContent className="py-12 text-center space-y-3">
                      <div className="w-14 h-14 rounded-2xl bg-violet-50 flex items-center justify-center mx-auto">
                        <Package className="w-7 h-7 text-violet-300" />
                      </div>
                      <p className="text-sm font-medium text-muted-foreground">Nenhum pacote cadastrado</p>
                      <p className="text-xs text-muted-foreground">Abra um pacote em Pacotes → Novo Pacote</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {pacotesCliente.map(pacote => {
                      const venc = pacote.dataVencimento ? new Date(pacote.dataVencimento) : null;
                      const vencido = venc && venc < new Date();
                      const vencendoBreve = venc && !vencido && (venc.getTime() - Date.now()) < 7 * 24 * 60 * 60 * 1000;

                      const statusBadge = {
                        ativo: "bg-emerald-100 text-emerald-700",
                        concluido: "bg-slate-100 text-slate-600",
                        cancelado: "bg-red-100 text-red-600",
                        vencido: "bg-amber-100 text-amber-700",
                      }[pacote.status ?? "ativo"] ?? "bg-slate-100 text-slate-600";

                      const StatusIcon = pacote.status === "ativo"
                        ? CheckCircle2
                        : pacote.status === "cancelado"
                        ? XCircle
                        : Clock;

                      return (
                        <Card key={pacote.id} className={`border-border shadow-none transition-opacity ${pacote.status !== "ativo" ? "opacity-60" : ""}`}>
                          <CardContent className="p-4 space-y-3">
                            {/* Header */}
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="font-semibold text-foreground text-sm">{pacote.nome}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  Aberto em {new Date(pacote.criadoEm!).toLocaleDateString("pt-BR")}
                                  {venc && ` · Vence em ${venc.toLocaleDateString("pt-BR")}`}
                                </p>
                              </div>
                              <div className="flex items-center gap-1.5">
                                {(vencido || vencendoBreve) && (
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <AlertCircle className={`w-4 h-4 ${vencido ? "text-red-400" : "text-amber-400"}`} />
                                    </TooltipTrigger>
                                    <TooltipContent>{vencido ? "Pacote vencido" : "Vence em menos de 7 dias"}</TooltipContent>
                                  </Tooltip>
                                )}
                                <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${statusBadge}`}>
                                  <StatusIcon className="w-3 h-3" />
                                  {pacote.status === "ativo" ? "Ativo" : pacote.status === "concluido" ? "Concluído" : pacote.status === "cancelado" ? "Cancelado" : "Vencido"}
                                </span>
                              </div>
                            </div>

                            {/* Itens com progresso */}
                            <div className="space-y-2.5">
                              {(pacote.itens as any[]).map((item: any) => {
                                const pct = item.quantidadeTotal > 0
                                  ? Math.min((item.quantidadeUsada / item.quantidadeTotal) * 100, 100)
                                  : 0;
                                const restantes = item.quantidadeTotal - item.quantidadeUsada;
                                const cor = pct >= 100 ? "#ef4444" : pct >= 75 ? "#f59e0b" : "#7c3aed";

                                return (
                                  <div key={item.id} className="space-y-1">
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs font-medium text-foreground">
                                        {item.servicoNome ?? `Serviço #${item.servicoId}`}
                                      </span>
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs text-muted-foreground tabular-nums">
                                          {item.quantidadeUsada}/{item.quantidadeTotal}
                                        </span>
                                        {pacote.status === "ativo" && restantes > 0 && (
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <button
                                                onClick={() => consumirMutation.mutate({ pacoteClienteItemId: item.id })}
                                                disabled={consumirMutation.isPending}
                                                className="w-6 h-6 rounded-md bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50 transition-colors flex items-center justify-center"
                                              >
                                                <Zap className="w-3 h-3" />
                                              </button>
                                            </TooltipTrigger>
                                            <TooltipContent>Consumir 1 sessão</TooltipContent>
                                          </Tooltip>
                                        )}
                                      </div>
                                    </div>
                                    <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                                      <div
                                        className="h-full rounded-full transition-all duration-500"
                                        style={{ width: `${pct}%`, background: cor }}
                                      />
                                    </div>
                                    <p className={`text-xs ${restantes === 0 ? "text-red-500 font-medium" : "text-muted-foreground"}`}>
                                      {restantes === 0 ? "Esgotado" : `${restantes} restante${restantes !== 1 ? "s" : ""}`}
                                    </p>
                                  </div>
                                );
                              })}
                            </div>

                            {/* Valor pago */}
                            {pacote.valorPago && (
                              <div className="pt-2 border-t border-border flex items-center justify-between">
                                <span className="text-xs text-muted-foreground">Valor pago</span>
                                <span className="text-sm font-bold text-violet-700">
                                  {formatCurrency(parseFloat(String(pacote.valorPago)))}
                                </span>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
