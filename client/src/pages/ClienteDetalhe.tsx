import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft, Phone, Mail, Calendar, DollarSign, Scissors, Brain,
  Package, Clock, CheckCircle2, XCircle, AlertCircle, Zap,
  Pencil, Save, X, Trash2, MapPin, CreditCard, History, RefreshCw, ChevronDown, ChevronUp,
  TrendingUp, TrendingDown, Activity, Star, Ban, Wallet, ArrowDownLeft, ArrowUpRight,
} from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const statusColor: Record<string, string> = {
  concluido: "bg-emerald-100 text-emerald-700",
  cancelado: "bg-red-100 text-red-700",
  faltou: "bg-amber-100 text-amber-700",
  agendado: "bg-blue-100 text-blue-700",
  confirmado: "bg-emerald-100 text-emerald-700",
};

function formatCurrency(v: number | string | null | undefined) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(v ?? 0));
}

export default function ClienteDetalhe({ id: propId }: { id?: number } = {}) {
  const id = propId ?? parseInt(window.location.pathname.split("/").pop() ?? "0");
  const [, navigate] = useLocation();

  // Estado de edição
  const [modoEdicao, setModoEdicao] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [confirmarExcluir, setConfirmarExcluir] = useState(false);
  const [pacoteHistoricoId, setPacoteHistoricoId] = useState<number | null>(null);
  const [devolverCreditoModal, setDevolverCreditoModal] = useState(false);
  const [devolverValor, setDevolverValor] = useState("");
  // Estados para editar/remover movimentação de crédito
  const [editarCreditoModal, setEditarCreditoModal] = useState(false);
  const [editarCreditoItem, setEditarCreditoItem] = useState<{ id: number; valor: string; origem: string } | null>(null);
  const [removerCreditoId, setRemoverCreditoId] = useState<number | null>(null);
  const [pacoteRenovarId, setPacoteRenovarId] = useState<number | null>(null);
  const [pacoteEditarId, setPacoteEditarId] = useState<number | null>(null);
  const [editarPacoteForm, setEditarPacoteForm] = useState<{
    nome: string; valorPago: string; formaPagamento: string;
    numeroParcelas: string; dataVencimento: string; observacoes: string;
    itens: Array<{ servicoId: number; servicoNome: string; quantidade: number; sessoesUsadas: number }>;
  }>({
    nome: "", valorPago: "", formaPagamento: "",
    numeroParcelas: "1", dataVencimento: "", observacoes: "", itens: [],
  });
  const [renovarForm, setRenovarForm] = useState({
    valorPago: "",
    formaPagamento: "",
    numeroParcelas: "1",
    validadeDias: "",
    observacoes: "",
  });

  const { data: cliente, isLoading } = trpc.clientes.getById.useQuery({ id }, {
    enabled: !!id,
  });

  // Inicializa o form quando os dados chegam (apenas se não estiver editando)
  useEffect(() => {
    if (cliente && !modoEdicao) {
      const c = cliente as any;
      setForm({
        nome: c.nome ?? "",
        telefone: c.telefone ?? "",
        whatsapp: c.whatsapp ?? "",
        email: c.email ?? "",
        cpf: c.cpf ?? "",
        dataNascimento: c.dataNascimento ?? "",
        endereco: c.endereco ?? "",
        observacoes: c.observacoes ?? "",
      });
    }
  }, [cliente]);
  const { data: agendamentos } = trpc.agendamentos.list.useQuery({});
  const { data: agendamentosVinculados = [] } = trpc.agendamentos.getVinculadosByCliente.useQuery(
    { clienteId: id },
    { enabled: !!id }
  );
  const { data: servicos } = trpc.servicos.list.useQuery();
  const { data: analiseIA } = trpc.iaClientes.getClienteAnalise.useQuery({ clienteId: id }, { enabled: !!id });
  const { data: pacotesCliente = [], isLoading: loadingPacotes } = trpc.pacotes.listarPorCliente.useQuery(
    { clienteId: id },
    { enabled: !!id }
  );

  const utils = trpc.useUtils();

  // Queries de crédito
  const { data: saldoCreditoData } = trpc.creditos.getSaldo.useQuery(
    { clienteId: id },
    { enabled: !!id }
  );
  const saldoCredito = saldoCreditoData?.saldo ?? 0;
  const { data: historicoCreditoData = [] } = trpc.creditos.getHistorico.useQuery(
    { clienteId: id },
    { enabled: !!id }
  );

  const devolverCreditoMutation = trpc.creditos.devolver.useMutation({
    onSuccess: (data) => {
      toast.success(`Devolução registrada! Saldo restante: R$${data.novoSaldo.toFixed(2)}`);
      utils.creditos.getSaldo.invalidate({ clienteId: id });
      utils.creditos.getHistorico.invalidate({ clienteId: id });
      setDevolverCreditoModal(false);
      setDevolverValor("");
    },
    onError: (e) => toast.error(e.message),
  });

  const editarCreditoMutation = trpc.creditos.editar.useMutation({
    onSuccess: () => {
      toast.success('Movimentação atualizada!');
      utils.creditos.getSaldo.invalidate({ clienteId: id });
      utils.creditos.getHistorico.invalidate({ clienteId: id });
      utils.creditos.listSaldos.invalidate();
      setEditarCreditoModal(false);
      setEditarCreditoItem(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const removerCreditoMutation = trpc.creditos.remover.useMutation({
    onSuccess: () => {
      toast.success('Movimentação removida!');
      utils.creditos.getSaldo.invalidate({ clienteId: id });
      utils.creditos.getHistorico.invalidate({ clienteId: id });
      utils.creditos.listSaldos.invalidate();
      setRemoverCreditoId(null);
    },
    onError: (e) => toast.error(e.message),
  });

  // Histórico de sessões do pacote selecionado
  const { data: historicoSessoes = [], isLoading: loadingHistorico } = trpc.pacotes.historicoSessoes.useQuery(
    { pacoteClienteId: pacoteHistoricoId! },
    { enabled: !!pacoteHistoricoId }
  );

  // Mutação de renovação de pacote
  const renovarMutation = trpc.pacotes.renovarPacote.useMutation({
    onSuccess: () => {
      utils.pacotes.listarPorCliente.invalidate();
      setPacoteRenovarId(null);
      toast.success("Pacote renovado com sucesso!");
    },
    onError: (e) => toast.error(e.message),
  });

  const editarPacoteMutation = trpc.pacotes.editarPacote.useMutation({
    onSuccess: () => {
      utils.pacotes.listarPorCliente.invalidate();
      setPacoteEditarId(null);
      toast.success("Pacote atualizado com sucesso!");
    },
    onError: (e) => toast.error(e.message),
  });

  const consumirMutation = trpc.pacotes.consumirSessao.useMutation({
    onSuccess: () => {
      utils.pacotes.listarPorCliente.invalidate();
      toast.success("Sessão consumida com sucesso!");
    },
    onError: (e) => toast.error(e.message),
  });

  const editarMutation = trpc.clientes.update.useMutation({
    onSuccess: () => {
      toast.success("Cliente atualizado com sucesso!");
      utils.clientes.getById.invalidate({ id });
      utils.clientes.list.invalidate();
      utils.clientes.listAll.invalidate();
      setModoEdicao(false);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const excluirMutation = trpc.clientes.delete.useMutation({
    onSuccess: () => {
      toast.success("Cliente removido.");
      navigate("/admin/clientes");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const servicoMap = useMemo(() => {
    const m: Record<number, string> = {};
    servicos?.forEach(s => { m[s.id] = s.nome; });
    return m;
  }, [servicos]);

  const agendamentosCliente = useMemo(() => {
    const titulares = (agendamentos ?? [])
      .filter(ag => ag.clienteId === id)
      .map(ag => ({ ...ag, isVinculado: false, titularNome: '' }));
    // Combinar com reservas onde o cliente é pessoa vinculada (sem duplicar)
    const titularIds = new Set(titulares.map(ag => ag.id));
    const vinculados = (agendamentosVinculados as any[])
      .filter(ag => !titularIds.has(ag.id));
    return [...titulares, ...vinculados]
      .sort((a, b) => b.data.localeCompare(a.data));
  }, [agendamentos, agendamentosVinculados, id]);

  const pacotesAtivos = useMemo(() => pacotesCliente.filter(p => p.status === "ativo"), [pacotesCliente]);

  function iniciarEdicao() {
    if (cliente) {
      setForm({
        nome: (cliente as any).nome ?? "",
        telefone: (cliente as any).telefone ?? "",
        whatsapp: (cliente as any).whatsapp ?? "",
        email: (cliente as any).email ?? "",
        cpf: (cliente as any).cpf ?? "",
        dataNascimento: (cliente as any).dataNascimento ?? "",
        endereco: (cliente as any).endereco ?? "",
        observacoes: (cliente as any).observacoes ?? "",
      });
      setModoEdicao(true);
    }
  }

  function cancelarEdicao() {
    setModoEdicao(false);
  }

  function salvar() {
    editarMutation.mutate({ id, ...form } as any);
  }

  if (isLoading || !cliente) return (
    <div className="p-6 flex items-center justify-center min-h-[400px]">
      <p className="text-muted-foreground">Carregando...</p>
    </div>
  );

  const c = cliente as any;

  return (
    <TooltipProvider>
      <div className="p-4 lg:p-6 space-y-6 max-w-4xl mx-auto">

        {/* ── Header ── */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {/* Usar button com navigate para evitar erro de removeChild com Tooltip+Link+asChild */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => navigate("/admin/clientes")}
              title="Voltar para Clientes"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="text-xl lg:text-2xl font-bold tracking-tight">
              {modoEdicao ? "Editando cliente" : c.nome}
            </h1>
          </div>

          {/* Botões de ação */}
          <div key={modoEdicao ? "edit" : "view"} className="flex items-center gap-2">
            {modoEdicao ? (
              <>
                <Button variant="outline" size="sm" onClick={cancelarEdicao} className="gap-1.5">
                  <X className="w-3.5 h-3.5" /> Cancelar
                </Button>
                <Button size="sm" onClick={salvar} disabled={editarMutation.isPending} className="gap-1.5">
                  <Save className="w-3.5 h-3.5" />
                  {editarMutation.isPending ? "Salvando..." : "Salvar"}
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setConfirmarExcluir(true)}
                  className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Excluir</span>
                </Button>
                <Button size="sm" onClick={iniciarEdicao} className="gap-1.5">
                  <Pencil className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Editar</span>
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ── Card de dados do cliente ── */}
          <Card className="border-border shadow-none">
            <CardContent className="p-6">
              <div className="text-center mb-5">
                <Avatar className="w-16 h-16 mx-auto mb-3">
                  <AvatarFallback className="text-xl font-bold" style={{ background: "oklch(55% 0.22 264)", color: "white" }}>
                    {(modoEdicao ? form.nome : c.nome)?.charAt(0)?.toUpperCase() ?? "?"}
                  </AvatarFallback>
                </Avatar>
                {!modoEdicao && <h2 className="text-base font-semibold">{c.nome}</h2>}
              </div>

              {modoEdicao ? (
                /* Formulário de edição */
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Nome completo *</Label>
                    <Input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Telefone</Label>
                    <Input value={form.telefone} onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))} placeholder="(11) 99999-9999" />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">WhatsApp</Label>
                    <Input value={form.whatsapp} onChange={e => setForm(f => ({ ...f, whatsapp: e.target.value }))} placeholder="(11) 99999-9999" />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Email</Label>
                    <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@exemplo.com" />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">CPF</Label>
                    <Input value={form.cpf} onChange={e => setForm(f => ({ ...f, cpf: e.target.value }))} placeholder="000.000.000-00" />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Data de nascimento <span className="font-normal text-muted-foreground/60">(opcional)</span></Label>
                    <div className="relative">
                      <Input
                        type="date"
                        value={form.dataNascimento}
                        onChange={e => setForm(f => ({ ...f, dataNascimento: e.target.value }))}
                        className={!form.dataNascimento ? "text-muted-foreground" : ""}
                      />
                      {form.dataNascimento && (
                        <button
                          type="button"
                          onClick={() => setForm(f => ({ ...f, dataNascimento: "" }))}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                          title="Remover data"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Endereço</Label>
                    <Input value={form.endereco} onChange={e => setForm(f => ({ ...f, endereco: e.target.value }))} placeholder="Rua, número, bairro..." />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Observações</Label>
                    <Textarea value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} rows={3} placeholder="Alergias, preferências..." />
                  </div>
                </div>
              ) : (
                /* Visualização dos dados */
                <div className="space-y-2.5">
                  {c.telefone && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="w-4 h-4 shrink-0" />{c.telefone}
                    </div>
                  )}
                  {c.whatsapp && c.whatsapp !== c.telefone && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="w-4 h-4 shrink-0 text-green-500" />
                      <span>{c.whatsapp} <span className="text-xs text-green-600">(WhatsApp)</span></span>
                    </div>
                  )}
                  {c.email && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="w-4 h-4 shrink-0" />{c.email}
                    </div>
                  )}
                  {c.cpf && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CreditCard className="w-4 h-4 shrink-0" />{c.cpf}
                    </div>
                  )}
                  {c.dataNascimento && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4 shrink-0" />
                      {c.dataNascimento.split("-").reverse().join("/")}
                    </div>
                  )}
                  {c.endereco && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="w-4 h-4 shrink-0" />{c.endereco}
                    </div>
                  )}
                  {c.observacoes && (
                    <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1 font-medium">Observações</p>
                      <p className="text-sm">{c.observacoes}</p>
                    </div>
                  )}
                  {!c.telefone && !c.email && !c.cpf && !c.observacoes && (
                    <p className="text-xs text-muted-foreground text-center py-2">
                      Clique em <strong>Editar</strong> para adicionar informações
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Stats e abas ── */}
          <div className="lg:col-span-2 space-y-4">
            {/* KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Total gasto", value: formatCurrency(c.totalGasto), icon: DollarSign, color: "text-emerald-600" },
                { label: "Atendimentos", value: c.totalAtendimentos ?? 0, icon: Scissors, color: "text-blue-600" },
                { label: "Saldo sessões", value: c.saldoSessoes ?? 0, icon: Calendar, color: "text-purple-600" },
                { label: "Crédito", value: formatCurrency(saldoCredito), icon: Wallet, color: saldoCredito > 0 ? "text-green-600" : "text-muted-foreground" },
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

            {/* Score do Cliente */}
            <ClienteScoreCard agendamentos={agendamentosCliente} cliente={c} />

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
                      color: (analiseIA as any).classificacao === 'risco' ? 'oklch(40% 0.18 25)' : (analiseIA as any).classificacao === 'atraso_frequente' ? 'oklch(42% 0.14 75)' : (analiseIA as any).classificacao === 'inativo' ? 'oklch(40% 0.06 250)' : (analiseIA as any).classificacao === 'principal' ? 'oklch(38% 0.14 155)' : 'oklch(45% 0.18 264)',
                      background: (analiseIA as any).classificacao === 'risco' ? 'oklch(55% 0.22 25 / 12%)' : (analiseIA as any).classificacao === 'atraso_frequente' ? 'oklch(65% 0.20 75 / 12%)' : (analiseIA as any).classificacao === 'inativo' ? 'oklch(60% 0.04 250 / 12%)' : (analiseIA as any).classificacao === 'principal' ? 'oklch(55% 0.18 155 / 12%)' : 'oklch(55% 0.22 264 / 12%)'
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
                      }[(analiseIA as any).classificacao as string] ?? (analiseIA as any).classificacao}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{(analiseIA as any).resumo}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Score: <span className="font-bold text-foreground">{(analiseIA as any).scoreCliente}/100</span>
                    {" · "}Calculado em {new Date((analiseIA as any).calculadoEm).toLocaleDateString("pt-BR")}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Abas: Histórico + Pacotes + Créditos */}
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
                <TabsTrigger value="creditos" className="gap-1.5 text-xs">
                  <Wallet className="w-3.5 h-3.5" /> Créditos
                  {saldoCredito > 0 && (
                    <Badge variant="secondary" className="ml-1 text-xs h-4 px-1.5 bg-green-100 text-green-700">
                      {formatCurrency(saldoCredito)}
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
                          <div key={`${ag.id}-${(ag as any).isVinculado ? 'v' : 't'}`} className="flex items-center justify-between px-5 py-3">
                            <div>
                              <div className="flex items-center gap-1.5">
                                <p className="text-sm font-medium">{(ag as any).servicoNome ?? servicoMap[ag.servicoId] ?? "Serviço"}</p>
                                {(ag as any).isVinculado && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ background: "oklch(92% 0.04 264)", color: "oklch(40% 0.18 264)" }}>
                                    convidada
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {ag.data.split("-").reverse().join("/")} · {ag.horaInicio.slice(0, 5)}
                                {(ag as any).isVinculado && (ag as any).titularNome && (
                                  <span className="ml-1">· titular: {(ag as any).titularNome}</span>
                                )}
                              </p>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor[ag.status] ?? "bg-gray-100 text-gray-600"}`}>
                                {ag.status}
                              </span>
                              <span className="text-sm font-semibold">
                                {formatCurrency(ag.valorTotal)}
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
                    {pacotesCliente.map((pacote: any) => {
                      const venc = pacote.dataVencimento ? new Date(pacote.dataVencimento) : null;
                      const vencido = venc && venc < new Date();
                      const vencendoBreve = venc && !vencido && (venc.getTime() - Date.now()) < 7 * 24 * 60 * 60 * 1000;

                      const statusBadge = {
                        ativo: "bg-emerald-100 text-emerald-700",
                        concluido: "bg-slate-100 text-slate-600",
                        cancelado: "bg-red-100 text-red-600",
                        vencido: "bg-amber-100 text-amber-700",
                      }[(pacote.status ?? "ativo") as string] ?? "bg-slate-100 text-slate-600";

                      const StatusIcon = pacote.status === "ativo"
                        ? CheckCircle2
                        : pacote.status === "cancelado"
                        ? XCircle
                        : Clock;

                      return (
                        <Card key={pacote.id} className={`border-border shadow-none transition-opacity ${pacote.status !== "ativo" ? "opacity-60" : ""}`}>
                          <CardContent className="p-4 space-y-3">
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

                            {pacote.valorPago && (
                              <div className="pt-2 border-t border-border flex items-center justify-between">
                                <span className="text-xs text-muted-foreground">Valor pago</span>
                                <span className="text-sm font-bold text-violet-700">
                                  {formatCurrency(pacote.valorPago)}
                                </span>
                              </div>
                            )}

                            {/* Botões de ação do pacote */}
                            <div className="pt-2 border-t border-border flex items-center gap-2 flex-wrap">
                              <button
                                onClick={() => setPacoteHistoricoId(pacoteHistoricoId === pacote.id ? null : pacote.id)}
                                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                              >
                                <History className="w-3.5 h-3.5" />
                                {pacoteHistoricoId === pacote.id ? "Ocultar histórico" : "Ver histórico"}
                                {pacoteHistoricoId === pacote.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                              </button>
                              <button
                                onClick={() => {
                                  setPacoteEditarId(pacote.id);
                                  setEditarPacoteForm({
                                    nome: pacote.nome ?? "",
                                    valorPago: String(pacote.valorPago ?? ""),
                                    formaPagamento: pacote.formaPagamento ?? "",
                                    numeroParcelas: String(pacote.numeroParcelas ?? 1),
                                    dataVencimento: pacote.dataVencimento
                                      ? new Date(pacote.dataVencimento).toISOString().split("T")[0]
                                      : "",
                                    observacoes: (pacote as any).observacoes ?? "",
                                    itens: (pacote.itens as any[]).map((item: any) => ({
                                      servicoId: item.servicoId,
                                      servicoNome: item.servicoNome ?? `Serviço #${item.servicoId}`,
                                      quantidade: item.quantidadeTotal ?? item.quantidade ?? 1,
                                      sessoesUsadas: item.quantidadeUsada ?? 0,
                                    })),
                                  });
                                }}
                                className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                                Editar pacote
                              </button>
                              {(pacote.status === "concluido" || pacote.status === "vencido") && (
                                <button
                                  onClick={() => {
                                    setPacoteRenovarId(pacote.id);
                                    setRenovarForm({
                                      valorPago: String(pacote.valorPago ?? ""),
                                      formaPagamento: pacote.formaPagamento ?? "",
                                      numeroParcelas: String(pacote.numeroParcelas ?? 1),
                                      validadeDias: "",
                                      observacoes: "",
                                    });
                                  }}
                                  className="flex items-center gap-1.5 text-xs text-violet-600 hover:text-violet-800 font-medium transition-colors ml-auto"
                                >
                                  <RefreshCw className="w-3.5 h-3.5" />
                                  Renovar pacote
                                </button>
                              )}
                            </div>

                            {/* Histórico expandido */}
                            {pacoteHistoricoId === pacote.id && (
                              <div className="pt-2 border-t border-border space-y-2">
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Sessões utilizadas</p>
                                {loadingHistorico ? (
                                  <p className="text-xs text-muted-foreground">Carregando...</p>
                                ) : historicoSessoes.length === 0 ? (
                                  <p className="text-xs text-muted-foreground italic">Nenhuma sessão utilizada ainda.</p>
                                ) : (
                                  <div className="space-y-1.5">
                                    {historicoSessoes.map((s: any, i: number) => (
                                      <div key={i} className="flex items-center justify-between bg-slate-50 rounded-md px-3 py-2">
                                        <div>
                                          <p className="text-xs font-medium text-foreground">{s.servicoNome ?? "Serviço"}</p>
                                          <p className="text-xs text-muted-foreground">
                                            {s.data ? new Date(s.data).toLocaleDateString("pt-BR") : ""}
                                            {s.horaInicio ? ` · ${s.horaInicio.slice(0, 5)}` : ""}
                                            {s.profissionalNome ? ` · ${s.profissionalNome}` : ""}
                                          </p>
                                        </div>
                                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                                          s.status === "concluido" ? "bg-emerald-100 text-emerald-700"
                                          : s.status === "cancelado" ? "bg-red-100 text-red-600"
                                          : "bg-blue-100 text-blue-700"
                                        }`}>
                                          {s.status ?? "agendado"}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </TabsContent>

              {/* ── Créditos ── */}
              <TabsContent value="creditos">
                <Card className="border-border shadow-none">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base font-semibold">Crédito do Cliente</CardTitle>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-bold ${saldoCredito > 0 ? 'text-green-600' : 'text-muted-foreground'}`}>
                          Saldo: {formatCurrency(saldoCredito)}
                        </span>
                        {saldoCredito > 0 && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs gap-1.5 border-amber-300 text-amber-700 hover:bg-amber-50"
                            onClick={() => setDevolverCreditoModal(true)}
                          >
                            <ArrowUpRight className="w-3.5 h-3.5" />
                            Devolver em dinheiro
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    {historicoCreditoData.length === 0 ? (
                      <div className="py-8 text-center">
                        <Wallet className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
                        <p className="text-sm text-muted-foreground">Nenhuma movimentação de crédito</p>
                        <p className="text-xs text-muted-foreground mt-1">O crédito é gerado automaticamente quando a cliente paga a mais</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-border">
                        {historicoCreditoData.map((mov: any) => (
                          <div key={mov.id} className="flex items-center justify-between px-5 py-3 group hover:bg-muted/30 transition-colors">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                                mov.tipo === 'credito' ? 'bg-green-100' : 'bg-amber-100'
                              }`}>
                                {mov.tipo === 'credito'
                                  ? <ArrowDownLeft className="w-3.5 h-3.5 text-green-600" />
                                  : <ArrowUpRight className="w-3.5 h-3.5 text-amber-600" />
                                }
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium">
                                  {mov.tipo === 'credito' ? 'Crédito' : mov.tipo === 'uso' ? 'Uso em agendamento' : 'Devolução'}
                                </p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {mov.origem && <span>{mov.origem} · </span>}
                                  {mov.createdAt ? new Date(mov.createdAt).toLocaleDateString('pt-BR') : ''}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className={`text-sm font-bold ${
                                Number(mov.valor) >= 0 ? 'text-green-600' : 'text-amber-600'
                              }`}>
                                {Number(mov.valor) >= 0 ? '+' : ''}{formatCurrency(Number(mov.valor))}
                              </span>
                              {/* Ações visíveis no hover */}
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  title="Editar"
                                  className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                  onClick={() => {
                                    setEditarCreditoItem({ id: mov.id, valor: Math.abs(Number(mov.valor)).toFixed(2), origem: mov.origem ?? '' });
                                    setEditarCreditoModal(true);
                                  }}
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  title="Remover"
                                  className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors"
                                  onClick={() => setRemoverCreditoId(mov.id)}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      {/* ── Modal de devolução de crédito ── */}
      <Dialog open={devolverCreditoModal} onOpenChange={setDevolverCreditoModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowUpRight className="w-4 h-4 text-amber-600" />
              Devolver Crédito em Dinheiro
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Saldo disponível: <strong className="text-green-600">{formatCurrency(saldoCredito)}</strong>
            </p>
            <div className="space-y-1.5">
              <Label>Valor a devolver (R$)</Label>
              <Input
                type="number"
                min="0.01"
                max={saldoCredito}
                step="0.01"
                placeholder={`Máx: ${saldoCredito.toFixed(2)}`}
                value={devolverValor}
                onChange={e => setDevolverValor(e.target.value)}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDevolverCreditoModal(false)}>Cancelar</Button>
            <Button
              className="bg-amber-600 hover:bg-amber-700 text-white"
              disabled={!devolverValor || Number(devolverValor) <= 0 || devolverCreditoMutation.isPending}
              onClick={() => {
                devolverCreditoMutation.mutate({
                  clienteId: id,
                  valor: Number(devolverValor),
                  origem: `Devolução em dinheiro para ${c.nome}`,
                });
              }}
            >
              {devolverCreditoMutation.isPending ? "Registrando..." : "Confirmar devolução"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Modal de edição de movimentação de crédito ── */}
      <Dialog open={editarCreditoModal} onOpenChange={(open) => { setEditarCreditoModal(open); if (!open) setEditarCreditoItem(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-4 h-4 text-blue-600" />
              Editar Movimentação de Crédito
            </DialogTitle>
          </DialogHeader>
          {editarCreditoItem && (
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label>Valor (R$)</Label>
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={editarCreditoItem.valor}
                  onChange={e => setEditarCreditoItem(prev => prev ? { ...prev, valor: e.target.value } : null)}
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label>Descrição / Origem</Label>
                <Input
                  value={editarCreditoItem.origem}
                  onChange={e => setEditarCreditoItem(prev => prev ? { ...prev, origem: e.target.value } : null)}
                  placeholder="Ex: Pagamento a maior, Ajuste manual..."
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditarCreditoModal(false); setEditarCreditoItem(null); }}>Cancelar</Button>
            <Button
              disabled={!editarCreditoItem?.valor || Number(editarCreditoItem.valor) <= 0 || editarCreditoMutation.isPending}
              onClick={() => {
                if (!editarCreditoItem) return;
                editarCreditoMutation.mutate({
                  id: editarCreditoItem.id,
                  clienteId: id,
                  valor: Number(editarCreditoItem.valor),
                  origem: editarCreditoItem.origem,
                });
              }}
            >
              {editarCreditoMutation.isPending ? 'Salvando...' : 'Salvar alterações'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Confirmação de remoção de movimentação de crédito ── */}
      <AlertDialog open={!!removerCreditoId} onOpenChange={(open) => !open && setRemoverCreditoId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover movimentação?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O saldo do cliente será recalculado automaticamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => {
                if (removerCreditoId) removerCreditoMutation.mutate({ id: removerCreditoId, clienteId: id });
              }}
            >
              {removerCreditoMutation.isPending ? 'Removendo...' : 'Remover'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Modal de renovação de pacote ── */}
      <Dialog open={!!pacoteRenovarId} onOpenChange={(open) => !open && setPacoteRenovarId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-violet-600" />
              Renovar Pacote
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Valor pago (R$)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="Ex: 350.00"
                value={renovarForm.valorPago}
                onChange={e => setRenovarForm(f => ({ ...f, valorPago: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Forma de pagamento</Label>
              <Select
                value={renovarForm.formaPagamento}
                onValueChange={v => setRenovarForm(f => ({ ...f, formaPagamento: v }))}
              >
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="cartao_debito">Cartão Débito</SelectItem>
                  <SelectItem value="cartao_credito">Cartão Crédito</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Número de parcelas</Label>
                <Input
                  type="number"
                  min="1"
                  max="24"
                  value={renovarForm.numeroParcelas}
                  onChange={e => setRenovarForm(f => ({ ...f, numeroParcelas: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Validade (dias)</Label>
                <Input
                  type="number"
                  min="1"
                  placeholder="Ex: 90 (opcional)"
                  value={renovarForm.validadeDias}
                  onChange={e => setRenovarForm(f => ({ ...f, validadeDias: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Observações (opcional)</Label>
              <Textarea
                placeholder="Anotações sobre a renovação..."
                rows={2}
                value={renovarForm.observacoes}
                onChange={e => setRenovarForm(f => ({ ...f, observacoes: e.target.value }))}
              />
            </div>
            {Number(renovarForm.numeroParcelas) > 1 && Number(renovarForm.valorPago) > 0 && (
              <p className="text-xs text-muted-foreground bg-violet-50 rounded-md px-3 py-2">
                Valor por parcela: <strong>{formatCurrency(Number(renovarForm.valorPago) / Number(renovarForm.numeroParcelas))}</strong>
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPacoteRenovarId(null)}>Cancelar</Button>
            <Button
              className="bg-violet-600 hover:bg-violet-700 text-white"
              disabled={!renovarForm.valorPago || renovarMutation.isPending}
              onClick={() => {
                if (!pacoteRenovarId) return;
                renovarMutation.mutate({
                  pacoteClienteId: pacoteRenovarId,
                  valorPago: Number(renovarForm.valorPago),
                  formaPagamento: renovarForm.formaPagamento || undefined,
                  numeroParcelas: Number(renovarForm.numeroParcelas) || 1,
                  validadeDias: renovarForm.validadeDias ? Number(renovarForm.validadeDias) : undefined,
                  observacoes: renovarForm.observacoes || undefined,
                });
              }}
            >
              {renovarMutation.isPending ? "Renovando..." : "Renovar pacote"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Modal de edição de pacote ── */}
      <Dialog open={!!pacoteEditarId} onOpenChange={(open) => !open && setPacoteEditarId(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-4 h-4 text-blue-600" />
              Editar Pacote
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nome do pacote</Label>
              <Input
                value={editarPacoteForm.nome}
                onChange={e => setEditarPacoteForm(f => ({ ...f, nome: e.target.value }))}
                placeholder="Ex: Pacote Manicure 4x"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Valor pago (R$)</Label>
                <Input
                  type="number" min="0" step="0.01"
                  value={editarPacoteForm.valorPago}
                  onChange={e => setEditarPacoteForm(f => ({ ...f, valorPago: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Forma de pagamento</Label>
                <Select
                  value={editarPacoteForm.formaPagamento}
                  onValueChange={v => setEditarPacoteForm(f => ({ ...f, formaPagamento: v }))}
                >
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dinheiro">Dinheiro</SelectItem>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="cartao_debito">Cartão Débito</SelectItem>
                    <SelectItem value="cartao_credito">Cartão Crédito</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Número de parcelas</Label>
                <Input
                  type="number" min="1" max="24"
                  value={editarPacoteForm.numeroParcelas}
                  onChange={e => setEditarPacoteForm(f => ({ ...f, numeroParcelas: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Vencimento</Label>
                <Input
                  type="date"
                  value={editarPacoteForm.dataVencimento}
                  onChange={e => setEditarPacoteForm(f => ({ ...f, dataVencimento: e.target.value }))}
                />
              </div>
            </div>
            {Number(editarPacoteForm.numeroParcelas) > 1 && Number(editarPacoteForm.valorPago) > 0 && (
              <p className="text-xs text-muted-foreground bg-blue-50 rounded-md px-3 py-2">
                Valor por parcela: <strong>{formatCurrency(Number(editarPacoteForm.valorPago) / Number(editarPacoteForm.numeroParcelas))}</strong>
              </p>
            )}
            <div className="space-y-2">
              <Label>Itens do pacote</Label>
              {editarPacoteForm.itens.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-slate-50 rounded-md px-3 py-2">
                  <span className="text-sm flex-1">{item.servicoNome}</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setEditarPacoteForm(f => ({
                        ...f,
                        itens: f.itens.map((it, i) => i === idx ? { ...it, quantidade: Math.max(it.sessoesUsadas + 1, it.quantidade - 1) } : it)
                      }))}
                      className="w-6 h-6 rounded bg-slate-200 hover:bg-slate-300 flex items-center justify-center text-sm font-bold"
                    >-</button>
                    <span className="w-8 text-center text-sm font-medium">{item.quantidade}</span>
                    <button
                      type="button"
                      onClick={() => setEditarPacoteForm(f => ({
                        ...f,
                        itens: f.itens.map((it, i) => i === idx ? { ...it, quantidade: it.quantidade + 1 } : it)
                      }))}
                      className="w-6 h-6 rounded bg-slate-200 hover:bg-slate-300 flex items-center justify-center text-sm font-bold"
                    >+</button>
                  </div>
                  <span className="text-xs text-muted-foreground">{item.sessoesUsadas} usadas</span>
                </div>
              ))}
            </div>
            <div className="space-y-1.5">
              <Label>Observações (opcional)</Label>
              <Textarea
                placeholder="Anotações sobre o pacote..."
                rows={2}
                value={editarPacoteForm.observacoes}
                onChange={e => setEditarPacoteForm(f => ({ ...f, observacoes: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPacoteEditarId(null)}>Cancelar</Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white"
              disabled={!editarPacoteForm.nome || editarPacoteMutation.isPending}
              onClick={() => {
                if (!pacoteEditarId) return;
                editarPacoteMutation.mutate({
                  id: pacoteEditarId,
                  nome: editarPacoteForm.nome,
                  valorPago: editarPacoteForm.valorPago ? Number(editarPacoteForm.valorPago) : undefined,
                  formaPagamento: editarPacoteForm.formaPagamento || undefined,
                  numeroParcelas: Number(editarPacoteForm.numeroParcelas) || 1,
                  dataVencimento: editarPacoteForm.dataVencimento || null,
                  observacoes: editarPacoteForm.observacoes || undefined,
                  itens: editarPacoteForm.itens.map(it => ({
                    servicoId: it.servicoId,
                    quantidade: it.quantidade,
                    sessoesUsadas: it.sessoesUsadas,
                  })),
                });
              }}
            >
              {editarPacoteMutation.isPending ? "Salvando..." : "Salvar alterações"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Confirmação de exclusão ── */}
      <AlertDialog open={confirmarExcluir} onOpenChange={setConfirmarExcluir}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              O cliente <strong>{c.nome}</strong> será marcado como inativo. Você pode reativá-lo depois na lista de clientes usando o filtro "Ver inativos".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => excluirMutation.mutate({ id })}
            >
              {excluirMutation.isPending ? "Removendo..." : "Remover cliente"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
}

// ─── Score do Cliente ────────────────────────────────────────────────────────

function calcularScore(agendamentos: any[], cliente: any) {
  const total = agendamentos.length;
  if (total === 0) return { score: 0, label: "Sem dados", color: "#94a3b8", icon: Activity, fatores: [], stats: { total: 0, concluidos: 0, cancelados: 0, faltas: 0 } };

  const concluidos = agendamentos.filter(a => a.status === "concluido").length;
  const cancelados = agendamentos.filter(a => a.status === "cancelado").length;
  const faltas = agendamentos.filter(a => a.status === "faltou").length;

  // Fator 1: Taxa de conclusão (0-30 pts)
  const taxaConclusao = total > 0 ? concluidos / total : 0;
  const ptsConclusao = Math.round(taxaConclusao * 30);

  // Fator 2: Frequência — média de dias entre atendimentos concluídos (0-25 pts)
  const datasConc = agendamentos
    .filter(a => a.status === "concluido")
    .map(a => new Date(a.data).getTime())
    .sort((a, b) => a - b);
  let ptsFrequencia = 0;
  if (datasConc.length >= 2) {
    const intervalos: number[] = [];
    for (let i = 1; i < datasConc.length; i++) {
      intervalos.push((datasConc[i] - datasConc[i - 1]) / (1000 * 60 * 60 * 24));
    }
    const mediaIntervalo = intervalos.reduce((a, b) => a + b, 0) / intervalos.length;
    if (mediaIntervalo <= 7) ptsFrequencia = 25;
    else if (mediaIntervalo <= 14) ptsFrequencia = 22;
    else if (mediaIntervalo <= 21) ptsFrequencia = 18;
    else if (mediaIntervalo <= 30) ptsFrequencia = 15;
    else if (mediaIntervalo <= 45) ptsFrequencia = 10;
    else if (mediaIntervalo <= 60) ptsFrequencia = 5;
    else ptsFrequencia = 2;
  } else if (datasConc.length === 1) {
    ptsFrequencia = 10;
  }

  // Fator 3: Gasto total (0-20 pts)
  const gasto = Number(cliente.totalGasto ?? 0);
  let ptsGasto = 0;
  if (gasto >= 5000) ptsGasto = 20;
  else if (gasto >= 2000) ptsGasto = 17;
  else if (gasto >= 1000) ptsGasto = 14;
  else if (gasto >= 500) ptsGasto = 10;
  else if (gasto >= 200) ptsGasto = 7;
  else if (gasto > 0) ptsGasto = 3;

  // Fator 4: Baixo cancelamento/falta (0-15 pts)
  const taxaProblemas = total > 0 ? (cancelados + faltas) / total : 0;
  const ptsConfiabilidade = Math.round((1 - taxaProblemas) * 15);

  // Fator 5: Recência — último atendimento (0-10 pts)
  let ptsRecencia = 0;
  if (cliente.ultimoAtendimento) {
    const diasDesdeUltimo = (Date.now() - new Date(cliente.ultimoAtendimento).getTime()) / (1000 * 60 * 60 * 24);
    if (diasDesdeUltimo <= 7) ptsRecencia = 10;
    else if (diasDesdeUltimo <= 14) ptsRecencia = 8;
    else if (diasDesdeUltimo <= 30) ptsRecencia = 6;
    else if (diasDesdeUltimo <= 60) ptsRecencia = 4;
    else if (diasDesdeUltimo <= 90) ptsRecencia = 2;
    else ptsRecencia = 0;
  }

  const score = Math.min(100, ptsConclusao + ptsFrequencia + ptsGasto + ptsConfiabilidade + ptsRecencia);

  const fatores = [
    { nome: "Conclusão", pts: ptsConclusao, max: 30, detalhe: `${Math.round(taxaConclusao * 100)}% concluídos` },
    { nome: "Frequência", pts: ptsFrequencia, max: 25, detalhe: datasConc.length >= 2 ? `${datasConc.length} visitas` : "Poucos dados" },
    { nome: "Gasto", pts: ptsGasto, max: 20, detalhe: formatCurrency(gasto) },
    { nome: "Confiabilidade", pts: ptsConfiabilidade, max: 15, detalhe: `${cancelados} canc. · ${faltas} faltas` },
    { nome: "Recência", pts: ptsRecencia, max: 10, detalhe: cliente.ultimoAtendimento ? `Último: ${new Date(cliente.ultimoAtendimento).toLocaleDateString("pt-BR")}` : "Sem visita" },
  ];

  let label: string;
  let color: string;
  let icon: any;
  if (score >= 80) { label = "Excelente"; color = "oklch(50% 0.16 155)"; icon = Star; }
  else if (score >= 60) { label = "Bom"; color = "oklch(55% 0.22 264)"; icon = TrendingUp; }
  else if (score >= 40) { label = "Regular"; color = "oklch(60% 0.20 75)"; icon = Activity; }
  else if (score >= 20) { label = "Baixo"; color = "oklch(55% 0.18 30)"; icon = TrendingDown; }
  else { label = "Crítico"; color = "oklch(50% 0.22 25)"; icon = Ban; }

  return { score, label, color, icon, fatores, stats: { total, concluidos, cancelados, faltas } };
}

function ScoreRing({ score, color, size = 80 }: { score: number; color: string; size?: number }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="oklch(92% 0.005 250)" strokeWidth={6} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={6}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        className="transition-all duration-700" />
      <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="central"
        className="fill-foreground font-bold" fontSize={size * 0.28}
        transform={`rotate(90, ${size / 2}, ${size / 2})`}>
        {score}
      </text>
    </svg>
  );
}

function ClienteScoreCard({ agendamentos, cliente }: { agendamentos: any[]; cliente: any }) {
  const result = useMemo(() => calcularScore(agendamentos, cliente), [agendamentos, cliente]);
  const { score, label, color, fatores, stats, icon: Icon } = result;

  if (agendamentos.length === 0) return null;

  return (
    <Card className="border-border shadow-none">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${color}18` }}>
            <Icon className="w-3.5 h-3.5" style={{ color }} />
          </div>
          <h3 className="font-semibold text-sm">Score do Cliente</h3>
          <span className="text-xs px-2 py-0.5 rounded-full font-medium ml-auto" style={{ color, background: `${color}15` }}>
            {label}
          </span>
        </div>

        <div className="flex items-center gap-5">
          <ScoreRing score={score} color={color} />

          <div className="flex-1 space-y-1.5">
            {fatores.map(f => (
              <div key={f.nome} className="space-y-0.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">{f.nome}</span>
                  <span className="text-[11px] font-medium tabular-nums">{f.pts}/{f.max}</span>
                </div>
                <div className="h-1 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${(f.pts / f.max) * 100}%`, background: color }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2 mt-3 pt-3 border-t border-border">
          {[
            { label: "Total", value: stats.total, color: "text-foreground" },
            { label: "Concluídos", value: stats.concluidos, color: "text-emerald-600" },
            { label: "Cancelados", value: stats.cancelados, color: "text-red-500" },
            { label: "Faltas", value: stats.faltas, color: "text-amber-500" },
          ].map(s => (
            <div key={s.label} className="text-center">
              <p className={`text-sm font-bold ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
