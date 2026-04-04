import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { usePermissoes } from "@/hooks/usePermissoes";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  TrendingUp, Plus, Search, CheckCircle2, Clock, AlertCircle,
  Pencil, Trash2, Download, RefreshCw, User, Briefcase,
  ChevronDown, ChevronUp, CreditCard,
} from "lucide-react";

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmt = (v: number | string) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(v));

const fmtDate = (d: string) => {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
};

const hoje = () => new Date().toISOString().split("T")[0];

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pendente: { label: "Pendente", color: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  recebido: { label: "Recebido", color: "bg-green-100 text-green-800 border-green-200" },
  vencido: { label: "Vencido", color: "bg-red-100 text-red-800 border-red-200" },
  cancelado: { label: "Cancelado", color: "bg-gray-100 text-gray-600 border-gray-200" },
};

const ORIGEM_LABELS: Record<string, { label: string; icon: React.ReactNode }> = {
  manual: { label: "Manual", icon: <Plus className="w-3 h-3" /> },
  agendamento: { label: "Agendamento", icon: <Briefcase className="w-3 h-3" /> },
  pacote: { label: "Pacote", icon: <CreditCard className="w-3 h-3" /> },
};

const PAGAMENTO_LABELS: Record<string, string> = {
  dinheiro: "Dinheiro",
  pix: "Pix",
  cartao_debito: "Débito",
  cartao_credito: "Crédito",
  outro: "Outro",
};

// ─── Modal de Nova / Edição ───────────────────────────────────────────────────
type ContaForm = {
  descricao: string;
  valor: string;
  dataVencimento: string;
  dataRecebimento: string;
  status: "pendente" | "recebido" | "vencido" | "cancelado";
  origem: "manual" | "agendamento" | "pacote";
  clienteId: string;
  profissionalId: string;
  tipoPagamento: string;
  observacoes: string;
  recorrente: boolean;
  recorrenciaTipo: string;
};

const FORM_VAZIO: ContaForm = {
  descricao: "",
  valor: "",
  dataVencimento: hoje(),
  dataRecebimento: "",
  status: "pendente",
  origem: "manual",
  clienteId: "",
  profissionalId: "",
  tipoPagamento: "",
  observacoes: "",
  recorrente: false,
  recorrenciaTipo: "",
};

function ModalConta({
  open,
  onClose,
  editando,
  clientes,
  profissionais,
}: {
  open: boolean;
  onClose: () => void;
  editando: any | null;
  clientes: any[];
  profissionais: any[];
}) {
  const utils = trpc.useUtils();
  const [form, setForm] = useState<ContaForm>(FORM_VAZIO);
  const [mostrarAvancado, setMostrarAvancado] = useState(false);
  const [meioPagamentoId, setMeioPagamentoId] = useState<string>("none");
  const { data: meiosPagamento = [] } = trpc.meiosPagamento.listAtivos.useQuery();

  // Preencher form ao editar
  useState(() => {
    if (editando) {
      setForm({
        descricao: editando.descricao ?? "",
        valor: String(editando.valor ?? ""),
        dataVencimento: editando.dataVencimento ?? hoje(),
        dataRecebimento: editando.dataRecebimento ?? "",
        status: editando.status ?? "pendente",
        origem: editando.origem ?? "manual",
        clienteId: editando.clienteId ? String(editando.clienteId) : "",
        profissionalId: editando.profissionalId ? String(editando.profissionalId) : "",
        tipoPagamento: editando.tipoPagamento ?? "",
        observacoes: editando.observacoes ?? "",
        recorrente: editando.recorrente ?? false,
        recorrenciaTipo: editando.recorrenciaTipo ?? "",
      });
    } else {
      setForm(FORM_VAZIO);
    }
  });

  const criarMutation = trpc.contasReceber.criar.useMutation({
    onSuccess: () => {
      utils.contasReceber.list.invalidate();
      utils.contasReceber.metricas.invalidate();
      toast.success("Conta a receber criada com sucesso!");
      onClose();
    },
    onError: (e) => toast.error(e.message),
  });

  const atualizarMutation = trpc.contasReceber.atualizar.useMutation({
    onSuccess: () => {
      utils.contasReceber.list.invalidate();
      utils.contasReceber.metricas.invalidate();
      toast.success("Conta atualizada com sucesso!");
      onClose();
    },
    onError: (e) => toast.error(e.message),
  });

  const set = (k: keyof ContaForm, v: any) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = () => {
    if (!form.descricao.trim()) return toast.error("Informe a descrição");
    if (!form.valor || isNaN(Number(form.valor))) return toast.error("Informe um valor válido");
    if (!form.dataVencimento) return toast.error("Informe a data de vencimento");

    const payload = {
      descricao: form.descricao.trim(),
      valor: Number(form.valor),
      dataVencimento: form.dataVencimento,
      dataRecebimento: form.dataRecebimento || undefined,
      status: form.status,
      origem: form.origem,
      clienteId: form.clienteId ? Number(form.clienteId) : undefined,
      profissionalId: form.profissionalId ? Number(form.profissionalId) : undefined,
      tipoPagamento: (form.tipoPagamento || undefined) as any,
      observacoes: form.observacoes || undefined,
      recorrente: form.recorrente,
      recorrenciaTipo: (form.recorrenciaTipo || undefined) as any,
    };

    if (editando) {
      atualizarMutation.mutate({ id: editando.id, ...payload });
    } else {
      criarMutation.mutate(payload);
    }
  };

  const isLoading = criarMutation.isPending || atualizarMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editando ? "Editar Conta a Receber" : "Nova Conta a Receber"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Descrição */}
          <div className="space-y-1">
            <Label>Descrição *</Label>
            <Input
              placeholder="Ex: Mensalidade cliente, Serviço realizado..."
              value={form.descricao}
              onChange={e => set("descricao", e.target.value)}
            />
          </div>

          {/* Valor + Vencimento */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Valor (R$) *</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                value={form.valor}
                onChange={e => set("valor", e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Vencimento *</Label>
              <Input
                type="date"
                value={form.dataVencimento}
                onChange={e => set("dataVencimento", e.target.value)}
              />
            </div>
          </div>

          {/* Status + Origem */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => set("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="recebido">Recebido</SelectItem>
                  <SelectItem value="vencido">Vencido</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Origem</Label>
              <Select value={form.origem} onValueChange={v => set("origem", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="agendamento">Agendamento</SelectItem>
                  <SelectItem value="pacote">Pacote</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Data de recebimento + Forma de pagamento */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Data de Recebimento</Label>
              <Input
                type="date"
                value={form.dataRecebimento}
                onChange={e => set("dataRecebimento", e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Forma de Pagamento</Label>
              <Select value={form.tipoPagamento || "nenhum"} onValueChange={v => set("tipoPagamento", v === "nenhum" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="nenhum">Não informado</SelectItem>
                  <SelectItem value="dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="pix">Pix</SelectItem>
                  <SelectItem value="cartao_debito">Cartão Débito</SelectItem>
                  <SelectItem value="cartao_credito">Cartão Crédito</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Meio de Pagamento Cadastrado */}
          {meiosPagamento.length > 0 && (
            <div className="space-y-1">
              <Label>Meio de Pagamento</Label>
              <Select value={meioPagamentoId} onValueChange={setMeioPagamentoId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o meio de pagamento (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem especificar</SelectItem>
                  {meiosPagamento.map((m: any) => (
                    <SelectItem key={m.id} value={String(m.id)}>{m.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Cliente + Profissional */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Cliente</Label>
              <Select value={form.clienteId || "nenhum"} onValueChange={v => set("clienteId", v === "nenhum" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="nenhum">Nenhum</SelectItem>
                  {clientes.map(c => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Profissional</Label>
              <Select value={form.profissionalId || "nenhum"} onValueChange={v => set("profissionalId", v === "nenhum" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="nenhum">Nenhum</SelectItem>
                  {profissionais.map(p => (
                    <SelectItem key={p.id} value={String(p.id)}>{p.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Opções avançadas */}
          <button
            type="button"
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setMostrarAvancado(v => !v)}
          >
            {mostrarAvancado ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            Opções avançadas
          </button>

          {mostrarAvancado && (
            <div className="space-y-3 border rounded-lg p-3 bg-muted/30">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="recorrente"
                  checked={form.recorrente}
                  onChange={e => set("recorrente", e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="recorrente" className="cursor-pointer">Recorrente</Label>
              </div>
              {form.recorrente && (
                <div className="space-y-1">
                  <Label>Frequência</Label>
                  <Select value={form.recorrenciaTipo || "mensal"} onValueChange={v => set("recorrenciaTipo", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="semanal">Semanal</SelectItem>
                      <SelectItem value="mensal">Mensal</SelectItem>
                      <SelectItem value="anual">Anual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-1">
                <Label>Observações</Label>
                <Textarea
                  placeholder="Anotações adicionais..."
                  value={form.observacoes}
                  onChange={e => set("observacoes", e.target.value)}
                  rows={2}
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? "Salvando..." : editando ? "Salvar alterações" : "Criar conta"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Modal Marcar Recebido ────────────────────────────────────────────────────
function ModalMarcarRecebido({
  conta,
  onClose,
}: {
  conta: any | null;
  onClose: () => void;
}) {
  const utils = trpc.useUtils();
  const [dataRecebimento, setDataRecebimento] = useState(hoje());
  const [tipoPagamento, setTipoPagamento] = useState("");

  const mutation = trpc.contasReceber.marcarRecebido.useMutation({
    onSuccess: () => {
      utils.contasReceber.list.invalidate();
      utils.contasReceber.metricas.invalidate();
      toast.success("Conta marcada como recebida!");
      onClose();
    },
    onError: (e) => toast.error(e.message),
  });

  if (!conta) return null;

  return (
    <Dialog open={!!conta} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Confirmar Recebimento</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground">
            Marcar <strong>{conta.descricao}</strong> ({fmt(conta.valor)}) como recebida?
          </p>
          <div className="space-y-1">
            <Label>Data de Recebimento</Label>
            <Input type="date" value={dataRecebimento} onChange={e => setDataRecebimento(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Forma de Pagamento</Label>
            <Select value={tipoPagamento || "nenhum"} onValueChange={v => setTipoPagamento(v === "nenhum" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="nenhum">Não informado</SelectItem>
                <SelectItem value="dinheiro">Dinheiro</SelectItem>
                <SelectItem value="pix">Pix</SelectItem>
                <SelectItem value="cartao_debito">Cartão Débito</SelectItem>
                <SelectItem value="cartao_credito">Cartão Crédito</SelectItem>
                <SelectItem value="outro">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            onClick={() => mutation.mutate({
              id: conta.id,
              dataRecebimento,
              tipoPagamento: (tipoPagamento || undefined) as any,
            })}
            disabled={mutation.isPending}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {mutation.isPending ? "Salvando..." : "Confirmar Recebimento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Página Principal ─────────────────────────────────────────────────────────
export default function ContasReceber() {
  const { pode } = usePermissoes();
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [filtroOrigem, setFiltroOrigem] = useState("todos");
  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState<any | null>(null);
  const [marcarRecebido, setMarcarRecebido] = useState<any | null>(null);
  const [deletandoId, setDeletandoId] = useState<number | null>(null);

  const utils = trpc.useUtils();
  const { data: contas = [], isLoading } = trpc.contasReceber.list.useQuery();
  const { data: metricas } = trpc.contasReceber.metricas.useQuery();
  const { data: clientes = [] } = trpc.clientes.list.useQuery();
  const { data: profissionais = [] } = trpc.profissionais.list.useQuery();

  const deletarMutation = trpc.contasReceber.deletar.useMutation({
    onSuccess: () => {
      utils.contasReceber.list.invalidate();
      utils.contasReceber.metricas.invalidate();
      toast.success("Conta removida.");
      setDeletandoId(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const importarMutation = trpc.contasReceber.importarAgendamentos.useMutation({
    onSuccess: (data) => {
      utils.contasReceber.list.invalidate();
      utils.contasReceber.metricas.invalidate();
      if (data.count > 0) {
        toast.success(`${data.count} agendamento(s) importado(s) com sucesso!`);
      } else {
        toast.info("Nenhum agendamento novo para importar.");
      }
    },
    onError: (e) => toast.error(e.message),
  });

  // Filtros
  const contasFiltradas = contas.filter(c => {
    const matchBusca = !busca || c.descricao.toLowerCase().includes(busca.toLowerCase()) ||
      (c.clienteNome ?? "").toLowerCase().includes(busca.toLowerCase());
    const matchStatus = filtroStatus === "todos" || c.status === filtroStatus;
    const matchOrigem = filtroOrigem === "todos" || c.origem === filtroOrigem;
    return matchBusca && matchStatus && matchOrigem;
  });

  // Agrupar por status para exibição
  const vencidas = contasFiltradas.filter(c => c.status === "vencido" || (c.status === "pendente" && c.dataVencimento < hoje()));
  const pendentes = contasFiltradas.filter(c => c.status === "pendente" && c.dataVencimento >= hoje());
  const recebidas = contasFiltradas.filter(c => c.status === "recebido");
  const canceladas = contasFiltradas.filter(c => c.status === "cancelado");

  const abrirEdicao = (c: any) => {
    setEditando(c);
    setModalAberto(true);
  };

  const fecharModal = () => {
    setModalAberto(false);
    setEditando(null);
  };

  // Guarda de permissão: apenas quem tem financeiroVer pode acessar
  if (!pode("financeiroVer")) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center p-8">
        <p className="text-sm font-medium text-muted-foreground">Você não tem permissão para acessar contas a receber.</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6 pb-24 md:pb-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Contas a Receber</h1>
          <p className="text-sm text-muted-foreground">Controle de recebimentos manuais e automáticos</p>
        </div>
        {/* Botões desktop */}
        <div className="hidden sm:flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => importarMutation.mutate()}
            disabled={importarMutation.isPending}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${importarMutation.isPending ? "animate-spin" : ""}`} />
            Importar Agendamentos
          </Button>
          <Button onClick={() => setModalAberto(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nova Conta
          </Button>
        </div>
        {/* Botões mobile */}
        <div className="flex sm:hidden gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => importarMutation.mutate()}
            disabled={importarMutation.isPending}
          >
            <RefreshCw className={`w-4 h-4 mr-1.5 ${importarMutation.isPending ? "animate-spin" : ""}`} />
            Importar
          </Button>
          <Button className="flex-1" onClick={() => setModalAberto(true)}>
            <Plus className="w-4 h-4 mr-1.5" />
            Nova Conta
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-yellow-500" />
              <span className="text-xs text-muted-foreground">A Receber</span>
            </div>
            <p className="text-xl font-bold">{fmt(metricas?.totalPendente ?? 0)}</p>
            <p className="text-xs text-muted-foreground">{metricas?.quantidadePendentes ?? 0} pendentes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <span className="text-xs text-muted-foreground">Recebido no Mês</span>
            </div>
            <p className="text-xl font-bold text-green-600">{fmt(metricas?.totalRecebidoMes ?? 0)}</p>
            <p className="text-xs text-muted-foreground">mês atual</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle className="w-4 h-4 text-red-500" />
              <span className="text-xs text-muted-foreground">Vencido</span>
            </div>
            <p className="text-xl font-bold text-red-600">{fmt(metricas?.totalVencido ?? 0)}</p>
            <p className="text-xs text-muted-foreground">{metricas?.quantidadeVencidas ?? 0} contas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-blue-500" />
              <span className="text-xs text-muted-foreground">Próx. 7 dias</span>
            </div>
            <p className="text-xl font-bold text-blue-600">{fmt(metricas?.totalProximas7 ?? 0)}</p>
            <p className="text-xs text-muted-foreground">{metricas?.quantidadeProximas7 ?? 0} contas</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar por descrição ou cliente..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
          />
        </div>
        <Select value={filtroStatus} onValueChange={setFiltroStatus}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            <SelectItem value="pendente">Pendente</SelectItem>
            <SelectItem value="recebido">Recebido</SelectItem>
            <SelectItem value="vencido">Vencido</SelectItem>
            <SelectItem value="cancelado">Cancelado</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filtroOrigem} onValueChange={setFiltroOrigem}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas as origens</SelectItem>
            <SelectItem value="manual">Manual</SelectItem>
            <SelectItem value="agendamento">Agendamento</SelectItem>
            <SelectItem value="pacote">Pacote</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Lista */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando...</div>
      ) : contasFiltradas.length === 0 ? (
        <div className="text-center py-16">
          <TrendingUp className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground font-medium">Nenhuma conta encontrada</p>
          <p className="text-sm text-muted-foreground mt-1">
            Crie uma conta manualmente ou importe os agendamentos concluídos.
          </p>
          <Button className="mt-4" onClick={() => setModalAberto(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nova Conta
          </Button>
        </div>
      ) : (
        <div className="space-y-1">
          {/* Vencidas */}
          {vencidas.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-4 h-4 text-red-500" />
                <span className="text-sm font-semibold text-red-600">Vencidas ({vencidas.length})</span>
              </div>
              {vencidas.map(c => <LinhaContaReceber key={c.id} conta={c} onEditar={abrirEdicao} onMarcar={setMarcarRecebido} onDeletar={setDeletandoId} />)}
            </div>
          )}
          {/* Pendentes */}
          {pendentes.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-yellow-500" />
                <span className="text-sm font-semibold text-yellow-700">Pendentes ({pendentes.length})</span>
              </div>
              {pendentes.map(c => <LinhaContaReceber key={c.id} conta={c} onEditar={abrirEdicao} onMarcar={setMarcarRecebido} onDeletar={setDeletandoId} />)}
            </div>
          )}
          {/* Recebidas */}
          {recebidas.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span className="text-sm font-semibold text-green-700">Recebidas ({recebidas.length})</span>
              </div>
              {recebidas.map(c => <LinhaContaReceber key={c.id} conta={c} onEditar={abrirEdicao} onMarcar={setMarcarRecebido} onDeletar={setDeletandoId} />)}
            </div>
          )}
          {/* Canceladas */}
          {canceladas.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-semibold text-muted-foreground">Canceladas ({canceladas.length})</span>
              </div>
              {canceladas.map(c => <LinhaContaReceber key={c.id} conta={c} onEditar={abrirEdicao} onMarcar={setMarcarRecebido} onDeletar={setDeletandoId} />)}
            </div>
          )}
        </div>
      )}

      {/* Modais */}
      <ModalConta
        open={modalAberto}
        onClose={fecharModal}
        editando={editando}
        clientes={clientes}
        profissionais={profissionais}
      />
      <ModalMarcarRecebido
        conta={marcarRecebido}
        onClose={() => setMarcarRecebido(null)}
      />
      <AlertDialog open={!!deletandoId} onOpenChange={v => !v && setDeletandoId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover conta?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deletandoId && deletarMutation.mutate({ id: deletandoId })}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* FAB mobile — Nova Conta fixo no canto inferior direito */}
      <button
        className="fixed bottom-20 right-4 z-50 sm:hidden flex items-center justify-center w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg active:scale-95 transition-transform"
        onClick={() => setModalAberto(true)}
        aria-label="Nova Conta"
      >
        <Plus className="w-6 h-6" />
      </button>
    </div>
  );
}

// ─── Linha da Lista ───────────────────────────────────────────────────────────
function LinhaContaReceber({
  conta,
  onEditar,
  onMarcar,
  onDeletar,
}: {
  conta: any;
  onEditar: (c: any) => void;
  onMarcar: (c: any) => void;
  onDeletar: (id: number) => void;
}) {
  const statusInfo = STATUS_LABELS[conta.status] ?? STATUS_LABELS.pendente;
  const origemInfo = ORIGEM_LABELS[conta.origem] ?? ORIGEM_LABELS.manual;
  const isVencida = conta.status === "pendente" && conta.dataVencimento < hoje();
  const effectiveStatus = isVencida ? STATUS_LABELS.vencido : statusInfo;

  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors ${isVencida ? "border-red-200" : ""}`}>
      {/* Indicador de status */}
      <div className={`w-1 h-10 rounded-full flex-shrink-0 ${conta.status === "recebido" ? "bg-green-500" : isVencida || conta.status === "vencido" ? "bg-red-500" : conta.status === "cancelado" ? "bg-gray-300" : "bg-yellow-400"}`} />

      {/* Info principal */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm truncate">{conta.descricao}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${effectiveStatus.color}`}>
            {effectiveStatus.label}
          </span>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            {origemInfo.icon}
            {origemInfo.label}
          </span>
        </div>
        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
          {conta.clienteNome && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <User className="w-3 h-3" />
              {conta.clienteNome}
            </span>
          )}
          {conta.profissionalNome && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Briefcase className="w-3 h-3" />
              {conta.profissionalNome}
            </span>
          )}
          <span className="text-xs text-muted-foreground">
            Venc: {fmtDate(conta.dataVencimento)}
          </span>
          {conta.dataRecebimento && (
            <span className="text-xs text-green-600">
              Recebido: {fmtDate(conta.dataRecebimento)}
            </span>
          )}
          {conta.tipoPagamento && (
            <span className="text-xs text-muted-foreground">
              {PAGAMENTO_LABELS[conta.tipoPagamento] ?? conta.tipoPagamento}
            </span>
          )}
        </div>
      </div>

      {/* Valor */}
      <div className="text-right flex-shrink-0">
        <p className={`font-bold text-sm ${conta.status === "recebido" ? "text-green-600" : isVencida ? "text-red-600" : ""}`}>
          {fmt(conta.valor)}
        </p>
      </div>

      {/* Ações */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {conta.status !== "recebido" && conta.status !== "cancelado" && (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
            title="Marcar como recebido"
            onClick={() => onMarcar(conta)}
          >
            <CheckCircle2 className="w-4 h-4" />
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0"
          title="Editar"
          onClick={() => onEditar(conta)}
        >
          <Pencil className="w-4 h-4" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
          title="Remover"
          onClick={() => onDeletar(conta.id)}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
