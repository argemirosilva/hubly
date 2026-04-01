import { trpc } from "@/lib/trpc";
import { useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ArrowLeft, Phone, Mail, Calendar, DollarSign, Scissors, Brain } from "lucide-react";
import { Link } from "wouter";
import { useMemo } from "react";

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

export default function ClienteDetalhe() {
  const [, params] = useRoute("/admin/clientes/:id");
  const id = parseInt(params?.id ?? "0");

  const { data: cliente } = trpc.clientes.getById.useQuery({ id }, { enabled: !!id });
  const { data: agendamentos } = trpc.agendamentos.list.useQuery({});
  const { data: servicos } = trpc.servicos.list.useQuery();
  const { data: analiseIA } = trpc.iaClientes.getClienteAnalise.useQuery({ clienteId: id }, { enabled: !!id });

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

  if (!cliente) return (
    <div className="p-6 flex items-center justify-center min-h-[400px]">
      <p className="text-muted-foreground">Carregando...</p>
    </div>
  );

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <Link href="/admin/clientes">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
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
                  <Phone className="w-4 h-4" />{cliente.telefone}
                </div>
              )}
              {cliente.email && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="w-4 h-4" />{cliente.email}
                </div>
              )}
              {cliente.dataNascimento && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4" />
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

        {/* Stats e histórico */}
        <div className="lg:col-span-2 space-y-4">
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

          {/* Análise IA do cliente */}
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
                      principal: ' Principal',
                      bom_pagador: ' Bom pagador',
                      em_crescimento: ' Em crescimento',
                      em_queda: ' Em queda',
                      inativo: ' Inativo',
                      atraso_frequente: ' Atraso frequente',
                      risco: ' Risco',
                      novo: ' Novo',
                    }[analiseIA.classificacao] ?? analiseIA.classificacao}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{analiseIA.resumo}</p>
                <p className="text-xs text-muted-foreground mt-2">Score: <span className="font-bold text-foreground">{analiseIA.scoreCliente}/100</span> · Calculado em {new Date(analiseIA.calculadoEm).toLocaleDateString('pt-BR')}</p>
              </CardContent>
            </Card>
          )}

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
        </div>
      </div>
    </div>
  );
}
