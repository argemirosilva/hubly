import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { usePermissoes } from "@/hooks/usePermissoes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  AlertTriangle, CheckCircle2, Clock, Plus, Search, Filter,
  Pencil, Trash2, Check, Tag, ChevronDown, ChevronUp, X,
  TrendingDown, Calendar, Wallet, ReceiptText
} from "lucide-react";

// ─── Tipos ────────────────────────────────────────────────────────────────────
type Conta = {
  id: number;
  descricao: string;
  valor: string;
  dataVencimento: string;
  dataPagamento?: string | null;
  categoriaId?: number | null;
  status: "pendente" | "pago" | "vencido" | "cancelado";
  recorrente: boolean;
  recorrenciaTipo?: string | null;
  observacoes?: string | null;
  fornecedor?: string | null;
  categoriaNome?: string | null;
  categoriaCor?: string | null;
  categoriaIcone?: string | null;
};

type Categoria = {
  id: number;
  nome: string;
  cor: string | null;
  icone: string | null;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
const formatCurrency = (v: string | number) =>
  Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const formatDate = (d: string) => {
  if (!d) return "-";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
};

const statusConfig = {
  pendente: { label: "Pendente", color: "bg-yellow-100 text-yellow-800 border-yellow-200", icon: Clock },
  pago: { label: "Pago", color: "bg-green-100 text-green-800 border-green-200", icon: CheckCircle2 },
  vencido: { label: "Vencido", color: "bg-red-100 text-red-800 border-red-200", icon: AlertTriangle },
  cancelado: { label: "Cancelado", color: "bg-gray-100 text-gray-600 border-gray-200", icon: X },
};

const ICONES_CATEGORIAS = [
  { value: "receipt", label: "Recibo" },
  { value: "home", label: "Casa/Aluguel" },
  { value: "zap", label: "Energia" },
  { value: "droplets", label: "Água" },
  { value: "wifi", label: "Internet" },
  { value: "phone", label: "Telefone" },
  { value: "package", label: "Produtos" },
  { value: "users", label: "Funcionários" },
  { value: "shield", label: "Impostos" },
  { value: "wrench", label: "Manutenção" },
  { value: "truck", label: "Fornecedor" },
  { value: "credit-card", label: "Cartão" },
];

const CORES_CATEGORIAS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899",
  "#6b7280", "#84cc16", "#14b8a6", "#f43f5e",
];

// ─── Modal de Conta ───────────────────────────────────────────────────────────
function ModalConta({
  open, onClose, conta, categorias
}: {
  open: boolean;
  onClose: () => void;
  conta?: Conta | null;
  categorias: Categoria[];
}) {
  const utils = trpc.useUtils();
  const isEdicao = !!conta;

  const [descricao, setDescricao] = useState(conta?.descricao ?? "");
  const [valor, setValor] = useState(conta ? String(parseFloat(String(conta.valor))) : "");
  const [dataVencimento, setDataVencimento] = useState(conta?.dataVencimento ?? new Date().toISOString().split("T")[0]);
  const [categoriaId, setCategoriaId] = useState<string>(conta?.categoriaId ? String(conta.categoriaId) : "none");
  const [meioPagamentoId, setMeioPagamentoId] = useState<string>("none");
  const [recorrente, setRecorrente] = useState(conta?.recorrente ?? false);
  const [recorrenciaTipo, setRecorrenciaTipo] = useState<string>(conta?.recorrenciaTipo ?? "mensal");
  const [observacoes, setObservacoes] = useState(conta?.observacoes ?? "");
  const [fornecedor, setFornecedor] = useState(conta?.fornecedor ?? "");

  const { data: meiosPagamento = [] } = trpc.meiosPagamento.listAtivos.useQuery();

  const criar = trpc.contasPagar.criar.useMutation({
    onSuccess: () => {
      utils.contasPagar.list.invalidate();
      utils.contasPagar.metricas.invalidate();
      toast.success("Conta lançada com sucesso!");
      onClose();
    },
    onError: (e) => toast.error(e.message),
  });

  const atualizar = trpc.contasPagar.atualizar.useMutation({
    onSuccess: () => {
      utils.contasPagar.list.invalidate();
      utils.contasPagar.metricas.invalidate();
      toast.success("Conta atualizada!");
      onClose();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSubmit = () => {
    if (!descricao.trim()) return toast.error("Informe a descrição");
    const valorNum = parseFloat(valor.replace(",", "."));
    if (!valorNum || valorNum <= 0) return toast.error("Informe um valor válido");
    if (!dataVencimento) return toast.error("Informe a data de vencimento");

    const payload = {
      descricao: descricao.trim(),
      valor: valorNum,
      dataVencimento,
      categoriaId: (categoriaId && categoriaId !== "none") ? parseInt(categoriaId) : undefined,
      recorrente,
      recorrenciaTipo: recorrente ? (recorrenciaTipo as any) : undefined,
      observacoes: observacoes || undefined,
      fornecedor: fornecedor || undefined,
    };

    if (isEdicao && conta) {
      atualizar.mutate({ id: conta.id, ...payload });
    } else {
      criar.mutate(payload);
    }
  };

  const isLoading = criar.isPending || atualizar.isPending;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdicao ? "Editar Conta" : "Nova Conta a Pagar"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {/* Descrição */}
          <div className="space-y-1">
            <Label>Descrição *</Label>
            <Input
              placeholder="Ex: Aluguel, Energia elétrica, Fornecedor..."
              value={descricao}
              onChange={e => setDescricao(e.target.value)}
              autoFocus
            />
          </div>

          {/* Valor + Vencimento lado a lado */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Valor (R$) *</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                value={valor}
                onChange={e => setValor(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Vencimento *</Label>
              <Input
                type="date"
                value={dataVencimento}
                onChange={e => setDataVencimento(e.target.value)}
              />
            </div>
          </div>

          {/* Categoria */}
          <div className="space-y-1">
            <Label>Categoria</Label>
            <Select value={categoriaId} onValueChange={setCategoriaId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma categoria (opcional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem categoria</SelectItem>
                {categorias.map(c => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    <span className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: c.cor ?? "#6b7280" }} />
                      {c.nome}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Meio de Pagamento */}
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

          {/* Fornecedor */}
          <div className="space-y-1">
            <Label>Fornecedor / Beneficiário</Label>
            <Input
              placeholder="Nome do fornecedor (opcional)"
              value={fornecedor}
              onChange={e => setFornecedor(e.target.value)}
            />
          </div>

          {/* Recorrente */}
          <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
            <Switch checked={recorrente} onCheckedChange={setRecorrente} id="recorrente" />
            <Label htmlFor="recorrente" className="cursor-pointer">Conta recorrente</Label>
            {recorrente && (
              <Select value={recorrenciaTipo} onValueChange={setRecorrenciaTipo}>
                <SelectTrigger className="w-32 h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="semanal">Semanal (toda semana)</SelectItem>
                  <SelectItem value="quinzenal">Quinzenal (a cada 15 dias)</SelectItem>
                  <SelectItem value="mensal">Mensal (todo mês)</SelectItem>
                  <SelectItem value="bimestral">Bimestral (a cada 2 meses)</SelectItem>
                  <SelectItem value="trimestral">Trimestral (a cada 3 meses)</SelectItem>
                  <SelectItem value="semestral">Semestral (a cada 6 meses)</SelectItem>
                  <SelectItem value="anual">Anual (uma vez por ano)</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Observações */}
          <div className="space-y-1">
            <Label>Observações</Label>
            <Textarea
              placeholder="Anotações adicionais (opcional)"
              value={observacoes}
              onChange={e => setObservacoes(e.target.value)}
              rows={2}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? "Salvando..." : isEdicao ? "Salvar alterações" : "Lançar conta"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Modal de Categorias ──────────────────────────────────────────────────────
function ModalCategorias({ open, onClose }: { open: boolean; onClose: () => void }) {
  const utils = trpc.useUtils();
  const { data: categorias = [] } = trpc.contasPagar.categorias.list.useQuery();
  const [nome, setNome] = useState("");
  const [cor, setCor] = useState("#6b7280");

  const criar = trpc.contasPagar.categorias.criar.useMutation({
    onSuccess: () => {
      utils.contasPagar.categorias.list.invalidate();
      setNome("");
      toast.success("Categoria criada!");
    },
    onError: (e) => toast.error(e.message),
  });

  const deletar = trpc.contasPagar.categorias.deletar.useMutation({
    onSuccess: () => {
      utils.contasPagar.categorias.list.invalidate();
      toast.success("Categoria removida!");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="w-5 h-5" />
            Categorias de Despesa
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Nova categoria */}
          <div className="p-3 rounded-lg border bg-muted/30 space-y-3">
            <p className="text-sm font-medium">Nova categoria</p>
            <div className="flex gap-2">
              <Input
                placeholder="Ex: Aluguel, Produtos, Impostos..."
                value={nome}
                onChange={e => setNome(e.target.value)}
                className="flex-1"
              />
              <Button
                size="sm"
                onClick={() => nome.trim() && criar.mutate({ nome: nome.trim(), cor })}
                disabled={criar.isPending || !nome.trim()}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {CORES_CATEGORIAS.map(c => (
                <button
                  key={c}
                  className={`w-6 h-6 rounded-full border-2 transition-transform ${cor === c ? "border-foreground scale-110" : "border-transparent"}`}
                  style={{ background: c }}
                  onClick={() => setCor(c)}
                />
              ))}
            </div>
          </div>

          {/* Lista de categorias */}
          <div className="space-y-1.5 max-h-60 overflow-y-auto">
            {categorias.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhuma categoria cadastrada</p>
            )}
            {categorias.map(c => (
              <div key={c.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50">
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: c.cor ?? "#6b7280" }} />
                <span className="flex-1 text-sm">{c.nome}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={() => deletar.mutate({ id: c.id })}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Card de Conta ────────────────────────────────────────────────────────────
function CardConta({ conta, onEditar, onMarcarPago, onDeletar }: {
  conta: Conta;
  onEditar: (c: Conta) => void;
  onMarcarPago: (id: number) => void;
  onDeletar: (id: number) => void;
}) {
  const cfg = statusConfig[conta.status] ?? statusConfig.pendente;
  const StatusIcon = cfg.icon;
  const hoje = new Date().toISOString().split("T")[0];
  const diasParaVencer = conta.status === "pendente"
    ? Math.ceil((new Date(conta.dataVencimento).getTime() - new Date(hoje).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div className={`flex items-center gap-3 p-3.5 rounded-xl border bg-card hover:shadow-sm transition-shadow ${conta.status === "vencido" ? "border-red-200 bg-red-50/30" : ""}`}>
      {/* Indicador de categoria */}
      <div
        className="w-1 self-stretch rounded-full flex-shrink-0"
        style={{ background: conta.categoriaCor ?? "#e5e7eb" }}
      />

      {/* Conteúdo principal */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-medium text-sm truncate">{conta.descricao}</p>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              {conta.categoriaNome && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: conta.categoriaCor ?? "#6b7280" }} />
                  {conta.categoriaNome}
                </span>
              )}
              {conta.fornecedor && (
                <span className="text-xs text-muted-foreground">· {conta.fornecedor}</span>
              )}
              {conta.recorrente && (
                <Badge variant="outline" className="text-xs h-4 px-1">
                  {conta.recorrenciaTipo ?? "recorrente"}
                </Badge>
              )}
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="font-bold text-sm">{formatCurrency(conta.valor)}</p>
            <p className="text-xs text-muted-foreground">
              {conta.status === "pago" && conta.dataPagamento
                ? `Pago em ${formatDate(conta.dataPagamento)}`
                : `Vence ${formatDate(conta.dataVencimento)}`}
            </p>
          </div>
        </div>

        {/* Rodapé */}
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-1.5">
            <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${cfg.color}`}>
              <StatusIcon className="w-3 h-3" />
              {cfg.label}
            </span>
            {diasParaVencer !== null && diasParaVencer <= 3 && diasParaVencer >= 0 && (
              <span className="text-xs text-orange-600 font-medium">
                {diasParaVencer === 0 ? "Vence hoje!" : `${diasParaVencer}d`}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {conta.status !== "pago" && conta.status !== "cancelado" && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-green-700 hover:text-green-800 hover:bg-green-50"
                onClick={() => onMarcarPago(conta.id)}
              >
                <Check className="w-3.5 h-3.5 mr-1" />
                Pagar
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEditar(conta)}>
              <Pencil className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={() => onDeletar(conta.id)}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Página Principal ─────────────────────────────────────────────────────────
export default function ContasPagar() {
  const { pode } = usePermissoes();
  const utils = trpc.useUtils();

  // Filtros
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [filtroCategoria, setFiltroCategoria] = useState("");
  const [mostrarFiltros, setMostrarFiltros] = useState(false);

  // Modais
  const [modalConta, setModalConta] = useState(false);
  const [contaEditando, setContaEditando] = useState<Conta | null>(null);
  const [modalCategorias, setModalCategorias] = useState(false);

  // Queries
  const { data: contas = [], isLoading } = trpc.contasPagar.list.useQuery({
    status: filtroStatus !== "todos" ? filtroStatus : undefined,
    categoriaId: (filtroCategoria && filtroCategoria !== "todas") ? parseInt(filtroCategoria) : undefined,
  });
  const { data: metricas } = trpc.contasPagar.metricas.useQuery();
  const { data: categorias = [] } = trpc.contasPagar.categorias.list.useQuery();

  // Mutations
  const marcarPago = trpc.contasPagar.marcarPago.useMutation({
    onSuccess: () => {
      utils.contasPagar.list.invalidate();
      utils.contasPagar.metricas.invalidate();
      toast.success("Conta marcada como paga!");
    },
  });

  const deletar = trpc.contasPagar.deletar.useMutation({
    onSuccess: () => {
      utils.contasPagar.list.invalidate();
      utils.contasPagar.metricas.invalidate();
      toast.success("Conta removida!");
    },
  });

  // Filtro local por busca
  const contasFiltradas = useMemo(() => {
    if (!busca.trim()) return contas;
    const q = busca.toLowerCase();
    return contas.filter(c =>
      c.descricao.toLowerCase().includes(q) ||
      (c.fornecedor ?? "").toLowerCase().includes(q) ||
      (c.categoriaNome ?? "").toLowerCase().includes(q)
    );
  }, [contas, busca]);

  const handleEditar = (conta: Conta) => {
    setContaEditando(conta);
    setModalConta(true);
  };

  const handleFecharModal = () => {
    setModalConta(false);
    setContaEditando(null);
  };

  // Guarda de permissão: apenas quem tem financeiroVer pode acessar
  if (!pode("financeiroVer")) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center p-8">
        <ReceiptText className="w-12 h-12 text-muted-foreground/30" />
        <p className="text-sm font-medium text-muted-foreground">Você não tem permissão para acessar contas a pagar.</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-4 md:space-y-6 pb-24 md:pb-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
            <ReceiptText className="w-5 h-5 md:w-6 md:h-6 text-primary shrink-0" />
            <span className="truncate">Contas a Pagar</span>
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5 hidden sm:block">Controle suas despesas e vencimentos</p>
        </div>
        {/* Botões sempre visíveis — adaptados por tamanho de tela */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="hidden sm:flex"
            onClick={() => setModalCategorias(true)}
          >
            <Tag className="w-4 h-4 mr-1.5" />
            Categorias
          </Button>
          <Button
            size="sm"
            className="gap-1.5 font-semibold shadow-sm"
            onClick={() => { setContaEditando(null); setModalConta(true); }}
          >
            <Plus className="w-4 h-4" />
            <span>Nova Conta</span>
          </Button>
        </div>
      </div>

      {/* Cards de métricas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-0 shadow-sm bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <span className="text-xs font-medium text-red-700">Vencidas</span>
            </div>
            <p className="text-xl font-bold text-red-700">{formatCurrency(metricas?.totalVencido ?? 0)}</p>
            <p className="text-xs text-red-500 mt-0.5">{metricas?.contasVencidas ?? 0} conta(s)</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-yellow-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-yellow-600" />
              <span className="text-xs font-medium text-yellow-700">A Vencer</span>
            </div>
            <p className="text-xl font-bold text-yellow-700">{formatCurrency(metricas?.totalPendente ?? 0)}</p>
            <p className="text-xs text-yellow-500 mt-0.5">{metricas?.contasPendentes ?? 0} conta(s)</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span className="text-xs font-medium text-green-700">Pago no Mês</span>
            </div>
            <p className="text-xl font-bold text-green-700">{formatCurrency(metricas?.totalPagoMes ?? 0)}</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-medium text-blue-700">Total do Mês</span>
            </div>
            <p className="text-xl font-bold text-blue-700">{formatCurrency(metricas?.totalMes ?? 0)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Barra de busca e filtros */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por descrição, fornecedor ou categoria..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setMostrarFiltros(!mostrarFiltros)}
            className={mostrarFiltros ? "bg-primary/10 border-primary" : ""}
          >
            <Filter className="w-4 h-4" />
          </Button>
        </div>

        {mostrarFiltros && (
          <div className="flex gap-3 p-3 rounded-lg border bg-muted/30 flex-wrap">
            <div className="flex items-center gap-2">
              <Label className="text-xs whitespace-nowrap">Status:</Label>
              <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                <SelectTrigger className="h-8 text-xs w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="vencido">Vencido</SelectItem>
                  <SelectItem value="pago">Pago</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-xs whitespace-nowrap">Categoria:</Label>
              <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
                <SelectTrigger className="h-8 text-xs w-40">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  {categorias.map(c => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {(filtroStatus !== "todos" || filtroCategoria) && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs"
                onClick={() => { setFiltroStatus("todos"); setFiltroCategoria(""); }}
              >
                <X className="w-3 h-3 mr-1" />
                Limpar filtros
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Lista de contas */}
      <div className="space-y-2">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : contasFiltradas.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Wallet className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Nenhuma conta encontrada</p>
            <p className="text-sm mt-1">
              {busca || filtroStatus !== "todos" || filtroCategoria
                ? "Tente ajustar os filtros"
                : "Clique em \"Nova Conta\" para lançar sua primeira despesa"}
            </p>
          </div>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">
              {contasFiltradas.length} conta{contasFiltradas.length !== 1 ? "s" : ""} encontrada{contasFiltradas.length !== 1 ? "s" : ""}
            </p>
            {contasFiltradas.map(conta => (
              <CardConta
                key={conta.id}
                conta={conta as Conta}
                onEditar={handleEditar}
                onMarcarPago={(id) => marcarPago.mutate({ id })}
                onDeletar={(id) => {
                  if (confirm("Remover esta conta?")) deletar.mutate({ id });
                }}
              />
            ))}
          </>
        )}
      </div>

      {/* Modais */}
      {modalConta && (
        <ModalConta
          open={modalConta}
          onClose={handleFecharModal}
          conta={contaEditando}
          categorias={categorias as Categoria[]}
        />
      )}
      <ModalCategorias open={modalCategorias} onClose={() => setModalCategorias(false)} />

      {/* FAB mobile — Categorias (apenas no mobile, já que Nova Conta está no header) */}
      <button
        className="fixed bottom-20 right-4 z-50 sm:hidden flex items-center gap-2 px-4 h-12 rounded-full bg-muted text-muted-foreground shadow-md border active:scale-95 transition-transform text-sm font-medium"
        onClick={() => setModalCategorias(true)}
        aria-label="Categorias"
      >
        <Tag className="w-4 h-4" />
        Categorias
      </button>
    </div>
  );
}
