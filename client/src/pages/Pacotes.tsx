import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Package, Plus, Trash2, ChevronDown, ChevronUp,
  Users, CheckCircle2, Clock, XCircle, AlertCircle,
  Pencil, RotateCcw,
} from "lucide-react";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCurrency(v: number | string) {
  const num = typeof v === "string" ? parseFloat(v) : v;
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(isNaN(num) ? 0 : num);
}

function ProgressBar({ used, total, color }: { used: number; total: number; color: string }) {
  const pct = total > 0 ? Math.min((used / total) * 100, 100) : 0;
  const remaining = total - used;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-slate-500">
        <span>{used} usadas</span>
        <span className={remaining === 0 ? "text-red-500 font-semibold" : "text-slate-600"}>
          {remaining} restantes
        </span>
      </div>
      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: pct >= 100 ? "#ef4444" : pct >= 75 ? "#f59e0b" : color }}
        />
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string }> = {
    ativo: { label: "Ativo", color: "bg-green-100 text-green-700" },
    concluido: { label: "Concluído", color: "bg-blue-100 text-blue-700" },
    vencido: { label: "Vencido", color: "bg-orange-100 text-orange-700" },
    cancelado: { label: "Cancelado", color: "bg-red-100 text-red-700" },
  };
  const s = map[status] ?? { label: status, color: "bg-slate-100 text-slate-600" };
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.color}`}>{s.label}</span>;
}

// ─── Modal: Criar/Editar Modelo ───────────────────────────────────────────────

type ItemModelo = { servicoId: number; quantidade: number };

function ModalModelo({
  open, onClose, modelo, servicos,
}: {
  open: boolean;
  onClose: () => void;
  modelo?: any;
  servicos: any[];
}) {
  const utils = trpc.useUtils();
  const [nome, setNome] = useState(modelo?.nome ?? "");
  const [descricao, setDescricao] = useState(modelo?.descricao ?? "");
  const [preco, setPreco] = useState(String(modelo?.preco ?? ""));
  const [validadeDias, setValidadeDias] = useState(String(modelo?.validadeDias ?? ""));
  const [itens, setItens] = useState<ItemModelo[]>(
    modelo?.itens?.map((i: any) => ({ servicoId: i.servicoId, quantidade: i.quantidade })) ?? [{ servicoId: 0, quantidade: 1 }]
  );

  const criarMutation = trpc.pacotes.criarModelo.useMutation({
    onSuccess: () => { utils.pacotes.listarModelos.invalidate(); toast.success("Modelo criado!"); onClose(); },
    onError: (e) => toast.error(e.message),
  });
  const editarMutation = trpc.pacotes.editarModelo.useMutation({
    onSuccess: () => { utils.pacotes.listarModelos.invalidate(); toast.success("Modelo atualizado!"); onClose(); },
    onError: (e) => toast.error(e.message),
  });

  function addItem() { setItens([...itens, { servicoId: 0, quantidade: 1 }]); }
  function removeItem(i: number) { setItens(itens.filter((_, idx) => idx !== i)); }
  function updateItem(i: number, field: keyof ItemModelo, value: number) {
    setItens(itens.map((it, idx) => idx === i ? { ...it, [field]: value } : it));
  }

  function handleSave() {
    if (!nome || !preco || itens.some(i => !i.servicoId)) {
      toast.error("Preencha todos os campos obrigatórios"); return;
    }
    const payload = {
      nome, descricao, preco: parseFloat(preco),
      validadeDias: validadeDias ? parseInt(validadeDias) : undefined,
      itens: itens.filter(i => i.servicoId > 0),
    };
    if (modelo) editarMutation.mutate({ id: modelo.id, ...payload });
    else criarMutation.mutate(payload);
  }

  const loading = criarMutation.isPending || editarMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{modelo ? "Editar Modelo" : "Novo Modelo de Pacote"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label>Nome do pacote *</Label>
            <Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Pacote Manicure 4x" />
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Descreva o pacote..." rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Preço (R$) *</Label>
              <Input type="number" min="0" step="0.01" value={preco} onChange={e => setPreco(e.target.value)} placeholder="0,00" />
            </div>
            <div>
              <Label>Validade (dias)</Label>
              <Input type="number" min="1" value={validadeDias} onChange={e => setValidadeDias(e.target.value)} placeholder="Sem validade" />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Itens do pacote *</Label>
              <Button size="sm" variant="outline" onClick={addItem} className="h-7 text-xs gap-1">
                <Plus className="w-3 h-3" /> Adicionar
              </Button>
            </div>
            <div className="space-y-2">
              {itens.map((item, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <Select
                    value={String(item.servicoId || "")}
                    onValueChange={v => updateItem(i, "servicoId", parseInt(v))}
                  >
                    <SelectTrigger className="flex-1 h-9">
                      <SelectValue placeholder="Selecione o serviço" />
                    </SelectTrigger>
                    <SelectContent>
                      {servicos.map(s => (
                        <SelectItem key={s.id} value={String(s.id)}>{s.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-1">
                    <button onClick={() => updateItem(i, "quantidade", Math.max(1, item.quantidade - 1))}
                      className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-sm font-bold">−</button>
                    <span className="w-6 text-center text-sm font-semibold">{item.quantidade}</span>
                    <button onClick={() => updateItem(i, "quantidade", item.quantidade + 1)}
                      className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-sm font-bold">+</button>
                  </div>
                  {itens.length > 1 && (
                    <button onClick={() => removeItem(i)} className="text-red-400 hover:text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Salvando..." : modelo ? "Salvar alterações" : "Criar modelo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Modal: Abrir Pacote para Cliente ────────────────────────────────────────

function ModalAbrirPacote({
  open, onClose, clientes, modelos, servicos,
}: {
  open: boolean;
  onClose: () => void;
  clientes: any[];
  modelos: any[];
  servicos: any[];
}) {
  const utils = trpc.useUtils();
  const [clienteId, setClienteId] = useState("");
  const [modeloId, setModeloId] = useState("");
  const [nome, setNome] = useState("");
  const [valorPago, setValorPago] = useState("");
  const [formaPagamento, setFormaPagamento] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [itens, setItens] = useState<{ servicoId: number; quantidadeTotal: number }[]>([{ servicoId: 0, quantidadeTotal: 1 }]);

  function handleModeloChange(id: string) {
    setModeloId(id);
    const modelo = modelos.find(m => m.id === parseInt(id));
    if (modelo) {
      setNome(modelo.nome);
      setValorPago(String(parseFloat(modelo.preco)));
      setItens(modelo.itens.map((i: any) => ({ servicoId: i.servicoId, quantidadeTotal: i.quantidade })));
    }
  }

  const abrirMutation = trpc.pacotes.abrirPacote.useMutation({
    onSuccess: () => {
      utils.pacotes.listarTodos.invalidate();
      toast.success("Pacote aberto com sucesso!");
      onClose();
    },
    onError: (e) => toast.error(e.message),
  });

  function handleSave() {
    if (!clienteId || !nome || !valorPago || itens.some(i => !i.servicoId)) {
      toast.error("Preencha todos os campos obrigatórios"); return;
    }
    abrirMutation.mutate({
      clienteId: parseInt(clienteId),
      modeloId: modeloId ? parseInt(modeloId) : undefined,
      nome,
      valorPago: parseFloat(valorPago),
      formaPagamento: formaPagamento || undefined,
      observacoes: observacoes || undefined,
      itens: itens.filter(i => i.servicoId > 0),
    });
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Abrir Pacote para Cliente</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label>Cliente *</Label>
            <Select value={clienteId} onValueChange={setClienteId}>
              <SelectTrigger><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
              <SelectContent>
                {clientes.map(c => (
                  <SelectItem key={c.id} value={String(c.id)}>{c.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {modelos.length > 0 && (
            <div>
              <Label>Modelo de pacote (opcional)</Label>
              <Select value={modeloId} onValueChange={handleModeloChange}>
                <SelectTrigger><SelectValue placeholder="Selecionar modelo pré-definido" /></SelectTrigger>
                <SelectContent>
                  {modelos.filter(m => m.ativo).map(m => (
                    <SelectItem key={m.id} value={String(m.id)}>
                      {m.nome} — {formatCurrency(m.preco)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label>Nome do pacote *</Label>
            <Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Pacote Manicure 4x" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Valor pago (R$) *</Label>
              <Input type="number" min="0" step="0.01" value={valorPago} onChange={e => setValorPago(e.target.value)} />
            </div>
            <div>
              <Label>Forma de pagamento</Label>
              <Select value={formaPagamento} onValueChange={setFormaPagamento}>
                <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>
                  {["Dinheiro", "Pix", "Cartão de crédito", "Cartão de débito", "Transferência"].map(f => (
                    <SelectItem key={f} value={f}>{f}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Itens do pacote *</Label>
              <Button size="sm" variant="outline" onClick={() => setItens([...itens, { servicoId: 0, quantidadeTotal: 1 }])} className="h-7 text-xs gap-1">
                <Plus className="w-3 h-3" /> Adicionar
              </Button>
            </div>
            <div className="space-y-2">
              {itens.map((item, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <Select
                    value={String(item.servicoId || "")}
                    onValueChange={v => setItens(itens.map((it, idx) => idx === i ? { ...it, servicoId: parseInt(v) } : it))}
                  >
                    <SelectTrigger className="flex-1 h-9">
                      <SelectValue placeholder="Selecione o serviço" />
                    </SelectTrigger>
                    <SelectContent>
                      {servicos.map(s => (
                        <SelectItem key={s.id} value={String(s.id)}>{s.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setItens(itens.map((it, idx) => idx === i ? { ...it, quantidadeTotal: Math.max(1, it.quantidadeTotal - 1) } : it))}
                      className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-sm font-bold">−</button>
                    <span className="w-6 text-center text-sm font-semibold">{item.quantidadeTotal}</span>
                    <button onClick={() => setItens(itens.map((it, idx) => idx === i ? { ...it, quantidadeTotal: it.quantidadeTotal + 1 } : it))}
                      className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-sm font-bold">+</button>
                  </div>
                  {itens.length > 1 && (
                    <button onClick={() => setItens(itens.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <Label>Observações</Label>
            <Textarea value={observacoes} onChange={e => setObservacoes(e.target.value)} rows={2} placeholder="Notas sobre o pacote..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={abrirMutation.isPending}>
            {abrirMutation.isPending ? "Abrindo..." : "Abrir pacote"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Card de Pacote do Cliente ────────────────────────────────────────────────

function PacoteCard({ pacote, onConsumir, onCancelar }: {
  pacote: any;
  onConsumir: (itemId: number) => void;
  onCancelar: (id: number) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const totalItens = pacote.itens.reduce((a: number, i: any) => a + i.quantidadeTotal, 0);
  const usadosItens = pacote.itens.reduce((a: number, i: any) => a + i.quantidadeUsada, 0);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
            <Package className="w-5 h-5 text-violet-600" />
          </div>
          <div>
            <p className="font-semibold text-slate-800 text-sm">{pacote.nome}</p>
            <p className="text-xs text-slate-500">{pacote.clienteNome ?? `Cliente #${pacote.clienteId}`}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-xs text-slate-500">{usadosItens}/{totalItens} sessões</p>
            <p className="text-xs font-semibold text-slate-700">{formatCurrency(pacote.valorPago)}</p>
          </div>
          <StatusBadge status={pacote.status} />
          {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-slate-100 pt-3">
          {pacote.itens.map((item: any) => (
            <div key={item.id} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">{item.servicoNome ?? `Serviço #${item.servicoId}`}</span>
                {pacote.status === "ativo" && item.quantidadeUsada < item.quantidadeTotal && (
                  <button
                    onClick={() => onConsumir(item.id)}
                    className="text-xs px-2.5 py-1 rounded-lg bg-violet-600 text-white hover:bg-violet-700 font-medium transition-colors"
                  >
                    Usar sessão
                  </button>
                )}
                {item.quantidadeUsada >= item.quantidadeTotal && (
                  <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Concluído
                  </span>
                )}
              </div>
              <ProgressBar used={item.quantidadeUsada} total={item.quantidadeTotal} color="#7c3aed" />
            </div>
          ))}

          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
            <span>Aberto em {new Date(pacote.dataAbertura).toLocaleDateString("pt-BR")}</span>
            {pacote.dataVencimento && (
              <span>Vence em {new Date(pacote.dataVencimento).toLocaleDateString("pt-BR")}</span>
            )}
            {pacote.status === "ativo" && (
              <button onClick={() => onCancelar(pacote.id)} className="text-red-400 hover:text-red-600 flex items-center gap-1">
                <XCircle className="w-3 h-3" /> Cancelar
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Página Principal ─────────────────────────────────────────────────────────

export default function Pacotes() {
  const [modalModelo, setModalModelo] = useState(false);
  const [editandoModelo, setEditandoModelo] = useState<any>(null);
  const [modalAbrirPacote, setModalAbrirPacote] = useState(false);
  const [filtroStatus, setFiltroStatus] = useState<"ativo" | "concluido" | "vencido" | "cancelado" | "todos">("ativo");

  const { data: modelos = [], isLoading: loadingModelos } = trpc.pacotes.listarModelos.useQuery();
  const { data: pacotesAtivos = [], isLoading: loadingPacotes } = trpc.pacotes.listarTodos.useQuery({ status: filtroStatus });
  const { data: clientesData = [] } = trpc.clientes.list.useQuery();
  const { data: servicosData = [] } = trpc.servicos.list.useQuery();

  const utils = trpc.useUtils();

  const consumirMutation = trpc.pacotes.consumirSessao.useMutation({
    onSuccess: (data) => {
      utils.pacotes.listarTodos.invalidate();
      if (data.pacoteConcluido) {
        toast.success("Sessão usada! Pacote concluído — notificação enviada.");
      } else {
        toast.success("Sessão registrada com sucesso!");
      }
    },
    onError: (e) => toast.error(e.message),
  });

  const cancelarMutation = trpc.pacotes.cancelarPacote.useMutation({
    onSuccess: () => { utils.pacotes.listarTodos.invalidate(); toast.success("Pacote cancelado."); },
    onError: (e) => toast.error(e.message),
  });

  const desativarModeloMutation = trpc.pacotes.desativarModelo.useMutation({
    onSuccess: () => { utils.pacotes.listarModelos.invalidate(); toast.success("Modelo desativado."); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Pacotes de Serviços</h1>
            <p className="text-sm text-slate-500 mt-0.5">Gerencie pacotes pré-pagos por cliente</p>
          </div>
          <Button onClick={() => setModalAbrirPacote(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Novo Pacote
          </Button>
        </div>

        <Tabs defaultValue="pacotes">
          <TabsList className="mb-4">
            <TabsTrigger value="pacotes" className="gap-2">
              <Users className="w-4 h-4" /> Pacotes por Cliente
            </TabsTrigger>
            <TabsTrigger value="modelos" className="gap-2">
              <Package className="w-4 h-4" /> Modelos
            </TabsTrigger>
          </TabsList>

          {/* ── Aba Pacotes ── */}
          <TabsContent value="pacotes" className="space-y-4">
            <div className="flex gap-2 flex-wrap">
              {(["ativo", "concluido", "vencido", "cancelado", "todos"] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setFiltroStatus(s)}
                  className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
                    filtroStatus === s
                      ? "bg-violet-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {s === "ativo" ? "Ativos" : s === "concluido" ? "Concluídos" : s === "vencido" ? "Vencidos" : s === "cancelado" ? "Cancelados" : "Todos"}
                </button>
              ))}
            </div>

            {loadingPacotes ? (
              <div className="text-center py-12 text-slate-400">Carregando pacotes...</div>
            ) : pacotesAtivos.length === 0 ? (
              <div className="text-center py-16 space-y-3">
                <div className="w-16 h-16 rounded-2xl bg-violet-50 flex items-center justify-center mx-auto">
                  <Package className="w-8 h-8 text-violet-300" />
                </div>
                <p className="text-slate-500 font-medium">Nenhum pacote encontrado</p>
                <p className="text-sm text-slate-400">Abra um pacote para uma cliente para começar</p>
                <Button variant="outline" onClick={() => setModalAbrirPacote(true)} className="gap-2 mt-2">
                  <Plus className="w-4 h-4" /> Abrir primeiro pacote
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {pacotesAtivos.map(p => (
                  <PacoteCard
                    key={p.id}
                    pacote={p}
                    onConsumir={(itemId) => consumirMutation.mutate({ pacoteClienteItemId: itemId })}
                    onCancelar={(id) => cancelarMutation.mutate({ id })}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── Aba Modelos ── */}
          <TabsContent value="modelos" className="space-y-4">
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => { setEditandoModelo(null); setModalModelo(true); }} className="gap-2">
                <Plus className="w-4 h-4" /> Novo Modelo
              </Button>
            </div>

            {loadingModelos ? (
              <div className="text-center py-12 text-slate-400">Carregando modelos...</div>
            ) : modelos.length === 0 ? (
              <div className="text-center py-16 space-y-3">
                <div className="w-16 h-16 rounded-2xl bg-violet-50 flex items-center justify-center mx-auto">
                  <Package className="w-8 h-8 text-violet-300" />
                </div>
                <p className="text-slate-500 font-medium">Nenhum modelo cadastrado</p>
                <p className="text-sm text-slate-400">Crie modelos reutilizáveis para agilizar a abertura de pacotes</p>
                <Button variant="outline" onClick={() => setModalModelo(true)} className="gap-2 mt-2">
                  <Plus className="w-4 h-4" /> Criar modelo
                </Button>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {modelos.map(m => (
                  <div key={m.id} className={`bg-white rounded-xl border shadow-sm p-4 space-y-3 ${!m.ativo ? "opacity-50" : ""}`}>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-slate-800">{m.nome}</p>
                        {m.descricao && <p className="text-xs text-slate-500 mt-0.5">{m.descricao}</p>}
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => { setEditandoModelo(m); setModalModelo(true); }}
                          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        {m.ativo && (
                          <button
                            onClick={() => desativarModeloMutation.mutate({ id: m.id })}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1">
                      {m.itens.map((item: any) => (
                        <div key={item.id} className="flex items-center justify-between text-xs">
                          <span className="text-slate-600">{item.servicoNome ?? `Serviço #${item.servicoId}`}</span>
                          <Badge variant="secondary" className="text-xs">{item.quantidade}x</Badge>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <span className="font-bold text-violet-700">{formatCurrency(m.preco)}</span>
                      {m.validadeDias && (
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {m.validadeDias} dias
                        </span>
                      )}
                      <button
                        onClick={() => setModalAbrirPacote(true)}
                        className="text-xs px-2.5 py-1 rounded-lg bg-violet-600 text-white hover:bg-violet-700 font-medium"
                      >
                        Usar modelo
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Modais */}
      {modalModelo && (
        <ModalModelo
          open={modalModelo}
          onClose={() => { setModalModelo(false); setEditandoModelo(null); }}
          modelo={editandoModelo}
          servicos={servicosData}
        />
      )}
      {modalAbrirPacote && (
        <ModalAbrirPacote
          open={modalAbrirPacote}
          onClose={() => setModalAbrirPacote(false)}
          clientes={clientesData}
          modelos={modelos}
          servicos={servicosData}
        />
      )}
    </DashboardLayout>
  );
}
