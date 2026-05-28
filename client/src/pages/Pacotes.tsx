import React, { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
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
  Pencil, RotateCcw, BarChart3, TrendingUp, CalendarClock, RefreshCw, Search, X, EyeOff,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCurrency(v: number | string) {
  const num = typeof v === "string" ? parseFloat(v) : v;
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(isNaN(num) ? 0 : num);
}

// ─── Componente Relatório Financeiro de Pacotes ───────────────────────────────────────────

const COLORS_PIE = ["#7c3aed", "#10b981", "#f59e0b", "#ef4444"];

function RelatorioPacotes() {
  const { data, isLoading } = trpc.pacotes.relatorioFinanceiro.useQuery();

  if (isLoading) return <div className="text-center py-16 text-slate-400">Carregando relatório...</div>;
  if (!data) return <div className="text-center py-16 text-slate-400">Nenhum dado disponível.</div>;

  // Receita por mês — últimos 6 meses
  const mesesLabels: Record<string, string> = {
    "01": "Jan", "02": "Fev", "03": "Mar", "04": "Abr",
    "05": "Mai", "06": "Jun", "07": "Jul", "08": "Ago",
    "09": "Set", "10": "Out", "11": "Nov", "12": "Dez",
  };
  const agora = new Date();
  const meses6 = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(agora.getFullYear(), agora.getMonth() - (5 - i), 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const receitaChart = meses6.map(m => ({
    mes: mesesLabels[m.split("-")[1]] + "/" + m.split("-")[0].slice(2),
    receita: data.receitaPorMes[m] ?? 0,
  }));

  // Pie chart de status
  const statusChart = [
    { name: "Ativos", value: data.pacotesAtivos },
    { name: "Concluídos", value: data.pacotesConcluidos },
    { name: "Cancelados", value: data.pacotesCancelados },
  ].filter(s => s.value > 0);

  // Sessões por serviço
  const sessoesChart = data.sessoesPorServico.map(s => ({
    nome: s.servicoNome ?? "Desconhecido",
    usadas: s.usadas,
    restantes: s.total - s.usadas,
  }));

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border shadow-sm p-4 space-y-1">
          <p className="text-xs text-slate-500 flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5 text-violet-500" /> Receita Total</p>
          <p className="text-2xl font-bold text-violet-700">{formatCurrency(data.receitaTotal)}</p>
          <p className="text-xs text-slate-400">{data.totalPacotes} pacote{data.totalPacotes !== 1 ? "s" : ""} no total</p>
        </div>
        <div className="bg-white rounded-xl border shadow-sm p-4 space-y-1">
          <p className="text-xs text-slate-500 flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Ativos</p>
          <p className="text-2xl font-bold text-emerald-600">{data.pacotesAtivos}</p>
          <p className="text-xs text-slate-400">{data.pacotesConcluidos} concluídos</p>
        </div>
        <div className="bg-white rounded-xl border shadow-sm p-4 space-y-1">
          <p className="text-xs text-slate-500 flex items-center gap-1.5"><CalendarClock className="w-3.5 h-3.5 text-amber-500" /> Vencendo em 7 dias</p>
          <p className={`text-2xl font-bold ${data.pacotesVencendo.length > 0 ? "text-amber-600" : "text-slate-400"}`}>{data.pacotesVencendo.length}</p>
          <p className="text-xs text-slate-400">{data.pacotesVencidos.length} já vencidos</p>
        </div>
        <div className="bg-white rounded-xl border shadow-sm p-4 space-y-1">
          <p className="text-xs text-slate-500 flex items-center gap-1.5"><XCircle className="w-3.5 h-3.5 text-red-400" /> Cancelados</p>
          <p className="text-2xl font-bold text-red-500">{data.pacotesCancelados}</p>
          <p className="text-xs text-slate-400">de {data.totalPacotes} total</p>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid sm:grid-cols-2 gap-4">
        {/* Receita por mês */}
        <div className="bg-white rounded-xl border shadow-sm p-4">
          <p className="font-semibold text-slate-700 mb-4 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-violet-500" /> Receita por Mês</p>
          {receitaChart.every(r => r.receita === 0) ? (
            <div className="text-center py-8 text-slate-400 text-sm">Nenhuma receita registrada ainda</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={receitaChart} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `R$${v}`} />
                <Tooltip formatter={(v: number) => [formatCurrency(v), "Receita"]} />
                <Bar dataKey="receita" fill="#7c3aed" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Status dos pacotes */}
        <div className="bg-white rounded-xl border shadow-sm p-4">
          <p className="font-semibold text-slate-700 mb-4 flex items-center gap-2"><Package className="w-4 h-4 text-violet-500" /> Status dos Pacotes</p>
          {statusChart.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">Nenhum pacote cadastrado ainda</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={statusChart} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {statusChart.map((_, i) => <Cell key={i} fill={COLORS_PIE[i % COLORS_PIE.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Sessões por serviço */}
      {sessoesChart.length > 0 && (
        <div className="bg-white rounded-xl border shadow-sm p-4">
          <p className="font-semibold text-slate-700 mb-4 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-emerald-500" /> Sessões por Serviço</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={sessoesChart} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="nome" tick={{ fontSize: 11 }} width={100} />
              <Tooltip />
              <Legend />
              <Bar dataKey="usadas" name="Usadas" fill="#7c3aed" radius={[0, 4, 4, 0]} stackId="a" />
              <Bar dataKey="restantes" name="Restantes" fill="#e9d5ff" radius={[0, 4, 4, 0]} stackId="a" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Tabela de pacotes vencendo */}
      {(data.pacotesVencendo.length > 0 || data.pacotesVencidos.length > 0) && (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b bg-amber-50 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-500" />
            <p className="font-semibold text-amber-800 text-sm">Pacotes que precisam de atenção</p>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-stone-50">
              <tr>
                <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500">Cliente</th>
                <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500">Pacote</th>
                <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500">Vencimento</th>
                <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[...data.pacotesVencidos, ...data.pacotesVencendo].map(p => {
                const venc = p.dataVencimento ? new Date(p.dataVencimento) : null;
                const vencido = venc && venc < new Date();
                return (
                  <tr key={p.id} className="hover:bg-stone-50">
                    <td className="px-4 py-2.5 font-medium text-slate-700">{p.clienteNome ?? "—"}</td>
                    <td className="px-4 py-2.5 text-slate-600">{p.nome}</td>
                    <td className="px-4 py-2.5 text-slate-500">{venc ? venc.toLocaleDateString("pt-BR") : "—"}</td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                        vencido ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                      }`}>
                        {vencido ? <XCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                        {vencido ? "Vencido" : "Vence em breve"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
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
      <div className="h-2 rounded-full bg-stone-100 overflow-hidden">
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
    concluido: { label: "Concluído", color: "bg-amber-100 text-blue-700" },
    vencido: { label: "Vencido", color: "bg-orange-100 text-orange-700" },
    cancelado: { label: "Cancelado", color: "bg-red-100 text-red-700" },
  };
  const s = map[status] ?? { label: status, color: "bg-stone-100 text-slate-600" };
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

  // Sincronizar estado quando o modelo muda (ex: abrir edição de modelo diferente)
  useEffect(() => {
    setNome(modelo?.nome ?? "");
    setDescricao(modelo?.descricao ?? "");
    setPreco(String(modelo?.preco ?? ""));
    setValidadeDias(String(modelo?.validadeDias ?? ""));
    setItens(
      modelo?.itens?.length
        ? modelo.itens.map((i: any) => ({ servicoId: i.servicoId, quantidade: i.quantidade }))
        : [{ servicoId: 0, quantidade: 1 }]
    );
  }, [modelo?.id, open]);

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
                      className="w-7 h-7 rounded-lg bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-sm font-bold">−</button>
                    <span className="w-6 text-center text-sm font-semibold">{item.quantidade}</span>
                    <button onClick={() => updateItem(i, "quantidade", item.quantidade + 1)}
                      className="w-7 h-7 rounded-lg bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-sm font-bold">+</button>
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
  // Autocomplete de cliente
  const [clienteBusca, setClienteBusca] = useState("");
  const [clienteNomeSelecionado, setClienteNomeSelecionado] = useState("");
  const [clienteDropdownAberto, setClienteDropdownAberto] = useState(false);
  const clienteInputRef = useRef<HTMLInputElement>(null);
  const clienteDropdownRef = useRef<HTMLDivElement>(null);

  const clientesFiltrados = clienteBusca.trim().length >= 1
    ? clientes.filter(c =>
        c.nome?.toLowerCase().includes(clienteBusca.toLowerCase()) ||
        c.sobrenome?.toLowerCase().includes(clienteBusca.toLowerCase()) ||
        `${c.nome} ${c.sobrenome || ''}`.toLowerCase().includes(clienteBusca.toLowerCase())
      ).slice(0, 10)
    : [];

  function selecionarCliente(c: any) {
    setClienteId(String(c.id));
    setClienteNomeSelecionado(`${c.nome}${c.sobrenome ? ' ' + c.sobrenome : ''}`);
    setClienteBusca(`${c.nome}${c.sobrenome ? ' ' + c.sobrenome : ''}`);
    setClienteDropdownAberto(false);
  }

  function limparCliente() {
    setClienteId("");
    setClienteNomeSelecionado("");
    setClienteBusca("");
    setClienteDropdownAberto(false);
    setTimeout(() => clienteInputRef.current?.focus(), 50);
  }

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        clienteDropdownRef.current && !clienteDropdownRef.current.contains(e.target as Node) &&
        clienteInputRef.current && !clienteInputRef.current.contains(e.target as Node)
      ) {
        setClienteDropdownAberto(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  const [modeloId, setModeloId] = useState("");
  const [nome, setNome] = useState("");
  const [valorPago, setValorPago] = useState("");
  const [formaPagamento, setFormaPagamento] = useState("");
  const [numeroParcelas, setNumeroParcelas] = useState("1");
  const [observacoes, setObservacoes] = useState("");
  const [itens, setItens] = useState<{ servicoId: number; quantidadeTotal: number }[]>([{ servicoId: 0, quantidadeTotal: 1 }]);

  const numParcelas = parseInt(numeroParcelas) || 1;
  const valorTotal = parseFloat(valorPago) || 0;
  const valorPorParcela = numParcelas > 1 ? valorTotal / numParcelas : 0;

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
      numeroParcelas: parseInt(numeroParcelas) || 1,
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
            <div className="relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  ref={clienteInputRef}
                  value={clienteBusca}
                  onChange={e => {
                    setClienteBusca(e.target.value);
                    setClienteDropdownAberto(true);
                    if (clienteNomeSelecionado && e.target.value !== clienteNomeSelecionado) {
                      setClienteId("");
                      setClienteNomeSelecionado("");
                    }
                  }}
                  onFocus={() => setClienteDropdownAberto(true)}
                  placeholder="Digite o nome do cliente..."
                  className="pl-9 pr-8"
                />
                {clienteBusca && (
                  <button
                    type="button"
                    onClick={limparCliente}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              {clienteDropdownAberto && clientesFiltrados.length > 0 && (
                <div
                  ref={clienteDropdownRef}
                  className="absolute z-50 w-full mt-1 rounded-lg border bg-popover shadow-lg overflow-hidden"
                  style={{ borderColor: "oklch(89.5% 0.018 80)" }}
                >
                  {clientesFiltrados.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onMouseDown={e => { e.preventDefault(); selecionarCliente(c); }}
                      className={`w-full text-left px-4 py-2.5 text-sm hover:bg-muted/60 transition-colors flex items-center gap-2 ${
                        clienteId === String(c.id) ? 'bg-primary/8 text-primary font-medium' : ''
                      }`}
                    >
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-xs font-semibold text-primary">
                        {c.nome?.[0]?.toUpperCase()}
                      </div>
                      <span>{c.nome}{c.sobrenome ? ` ${c.sobrenome}` : ''}</span>
                    </button>
                  ))}
                </div>
              )}
              {clienteDropdownAberto && clienteBusca.trim().length >= 1 && clientesFiltrados.length === 0 && (
                <div
                  ref={clienteDropdownRef}
                  className="absolute z-50 w-full mt-1 rounded-lg border bg-popover shadow-lg px-4 py-3 text-sm text-muted-foreground"
                  style={{ borderColor: "oklch(89.5% 0.018 80)" }}
                >
                  Nenhum cliente encontrado
                </div>
              )}
            </div>
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
              <Label>Valor total (R$) *</Label>
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Número de parcelas</Label>
              <Select value={numeroParcelas} onValueChange={setNumeroParcelas}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[1,2,3,4,5,6,7,8,9,10,11,12].map(n => (
                    <SelectItem key={n} value={String(n)}>{n === 1 ? "À vista" : `${n}x`}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {numParcelas > 1 && valorTotal > 0 && (
              <div className="flex flex-col justify-end">
                <p className="text-xs text-slate-500 mb-1">Valor por parcela</p>
                <p className="text-base font-semibold text-violet-700">
                  {numParcelas}x de R$ {valorPorParcela.toFixed(2).replace('.', ',')}
                </p>
              </div>
            )}
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
                      className="w-7 h-7 rounded-lg bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-sm font-bold">−</button>
                    <span className="w-6 text-center text-sm font-semibold">{item.quantidadeTotal}</span>
                    <button onClick={() => setItens(itens.map((it, idx) => idx === i ? { ...it, quantidadeTotal: it.quantidadeTotal + 1 } : it))}
                      className="w-7 h-7 rounded-lg bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-sm font-bold">+</button>
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

function PacoteCard({ pacote, onConsumir, onCancelar, onRenovar, onEditar }: {
  pacote: any;
  onConsumir: (itemId: number) => void;
  onCancelar: (id: number) => void;
  onRenovar?: (pacote: any) => void;
  onEditar?: (pacote: any) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const totalItens = pacote.itens.reduce((a: number, i: any) => a + i.quantidadeTotal, 0);
  const usadosItens = pacote.itens.reduce((a: number, i: any) => a + i.quantidadeUsada, 0);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-stone-50"
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
            {pacote.status === "ativo" && onEditar && (
              <button onClick={() => onEditar(pacote)} className="text-amber-600 hover:text-blue-700 flex items-center gap-1 font-medium">
                <Pencil className="w-3 h-3" /> Editar
              </button>
            )}
            {(pacote.status === "concluido" || pacote.status === "vencido") && onRenovar && (
              <button onClick={() => onRenovar(pacote)} className="text-violet-600 hover:text-violet-800 flex items-center gap-1 font-medium">
                <RefreshCw className="w-3 h-3" /> Renovar
              </button>
            )}
          </div>
          {/* Parcelamento */}
          {pacote.numeroParcelas > 1 && (
            <div className="text-xs text-slate-500 bg-stone-50 rounded-lg px-3 py-2">
              💳 {pacote.numeroParcelas}x de {pacote.valorParcela ? `R$ ${parseFloat(pacote.valorParcela).toFixed(2).replace('.', ',')}` : formatCurrency(parseFloat(pacote.valorPago) / pacote.numeroParcelas)}
              {pacote.formaPagamento && ` · ${pacote.formaPagamento}`}
            </div>
          )}
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
  const [buscaCliente, setBuscaCliente] = useState("");
  const [buscaDebounced, setBuscaDebounced] = useState("");
  const [pacoteRenovarId, setPacoteRenovarId] = useState<number | null>(null);
  const [renovarForm, setRenovarForm] = useState({
    valorPago: "",
    formaPagamento: "",
    numeroParcelas: "1",
    validadeDias: "",
    observacoes: "",
  });
  const [pacoteEditarId, setPacoteEditarId] = useState<number | null>(null);
  const [editarPacoteForm, setEditarPacoteForm] = useState<{
    nome: string; valorPago: string; formaPagamento: string;
    numeroParcelas: string; dataVencimento: string; observacoes: string;
    itens: Array<{ servicoId: number; servicoNome: string; quantidade: number; sessoesUsadas: number }>;
  }>({
    nome: "", valorPago: "", formaPagamento: "",
    numeroParcelas: "1", dataVencimento: "", observacoes: "", itens: [],
  });

  // Debounce da busca para evitar muitas requisições
  const buscaTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  function handleBuscaChange(v: string) {
    setBuscaCliente(v);
    if (buscaTimer.current) clearTimeout(buscaTimer.current);
    buscaTimer.current = setTimeout(() => setBuscaDebounced(v), 400);
  }

  const [mostrarOcultos, setMostrarOcultos] = useState(false);
  const { data: modelos = [], isLoading: loadingModelos } = trpc.pacotes.listarModelos.useQuery();
  const { data: modelosOcultos = [], isLoading: loadingModelosOcultos } = trpc.pacotes.listarModelos.useQuery({ incluirOcultos: true }, {
    select: (data) => data.filter(m => !m.ativo),
  });
  const { data: pacotesRaw = [], isLoading: loadingPacotes } = trpc.pacotes.listarTodos.useQuery({
    status: filtroStatus,
    busca: buscaDebounced || undefined,
  });
  // Filtro client-side como fallback — garante busca mesmo sem suporte server-side
  const pacotesAtivos = buscaCliente.trim()
    ? pacotesRaw.filter(p =>
        (p.clienteNome ?? "").toLowerCase().includes(buscaCliente.toLowerCase())
      )
    : pacotesRaw;
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

  const renovarMutation = trpc.pacotes.renovarPacote.useMutation({
    onSuccess: () => {
      utils.pacotes.listarTodos.invalidate();
      setPacoteRenovarId(null);
      toast.success("Pacote renovado com sucesso!");
    },
    onError: (e) => toast.error(e.message),
  });
  const editarPacoteMutation = trpc.pacotes.editarPacote.useMutation({
    onSuccess: () => {
      utils.pacotes.listarTodos.invalidate();
      setPacoteEditarId(null);
      toast.success("Pacote atualizado com sucesso!");
    },
    onError: (e) => toast.error(e.message),
  });
  const desativarModeloMutation = trpc.pacotes.desativarModelo.useMutation({
    onSuccess: () => { utils.pacotes.listarModelos.invalidate(); toast.success("Modelo ocultado."); },
    onError: (e) => toast.error(e.message),
  });
  const restaurarModeloMutation = trpc.pacotes.restaurarModelo.useMutation({
    onSuccess: () => { utils.pacotes.listarModelos.invalidate(); toast.success("Modelo restaurado!"); },
    onError: (e) => toast.error(e.message),
  });

  const verificarMutation = trpc.pacotes.verificarPacotesVencendo.useMutation({
    onSuccess: (data) => {
      toast.success(`Verificação concluída: ${data.criadas} nova(s) notificação(oes) gerada(s).`);
      utils.pacotes.listarNotificacoes?.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="space-y-6 p-4 lg:p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Pacotes de Serviços</h1>
            <p className="text-sm text-slate-500 mt-0.5">Gerencie pacotes pré-pagos por cliente</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border transition-colors"
              style={{ borderColor: "oklch(89.5% 0.018 80)", color: "oklch(45% 0.050 55)" }}
              onClick={() => verificarMutation.mutate()}
              disabled={verificarMutation.isPending}
              title="Verificar pacotes vencendo e gerar alertas"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${verificarMutation.isPending ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Verificar pacotes</span>
            </button>
            <Button onClick={() => setModalAbrirPacote(true)} className="gap-2">
              <Plus className="w-4 h-4" /> Novo Pacote
            </Button>
          </div>
        </div>

        <Tabs defaultValue="pacotes">
          <TabsList className="mb-4">
            <TabsTrigger value="pacotes" className="gap-2">
              <Users className="w-4 h-4" /> Pacotes por Cliente
            </TabsTrigger>
            <TabsTrigger value="modelos" className="gap-2">
              <Package className="w-4 h-4" /> Modelos
            </TabsTrigger>
            <TabsTrigger value="relatorio" className="gap-2">
              <BarChart3 className="w-4 h-4" /> Relatório
            </TabsTrigger>
          </TabsList>

          {/* ── Aba Pacotes ── */}
          <TabsContent value="pacotes" className="space-y-4">
            {/* Busca por cliente */}
            <div className="relative">
              <input
                type="text"
                value={buscaCliente}
                onChange={e => handleBuscaChange(e.target.value)}
                placeholder="Buscar por nome do cliente..."
                className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              />
              <svg className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <div className="flex gap-2 flex-wrap">
              {(["ativo", "concluido", "vencido", "cancelado", "todos"] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setFiltroStatus(s)}
                  className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
                    filtroStatus === s
                      ? "bg-violet-600 text-white"
                      : "bg-stone-100 text-slate-600 hover:bg-stone-200"
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
                    onEditar={(pac) => {
                      setPacoteEditarId(pac.id);
                      setEditarPacoteForm({
                        nome: pac.nome ?? "",
                        valorPago: String(pac.valorPago ?? ""),
                        formaPagamento: pac.formaPagamento ?? "",
                        numeroParcelas: String(pac.numeroParcelas ?? 1),
                        dataVencimento: pac.dataVencimento
                          ? new Date(pac.dataVencimento).toISOString().split("T")[0]
                          : "",
                        observacoes: pac.observacoes ?? "",
                        itens: (pac.itens as any[]).map((item: any) => ({
                          servicoId: item.servicoId,
                          servicoNome: item.servicoNome ?? `Serviço #${item.servicoId}`,
                          quantidade: item.quantidadeTotal ?? item.quantidade ?? 1,
                          sessoesUsadas: item.quantidadeUsada ?? 0,
                        })),
                      });
                    }}
                    onRenovar={(pac) => {
                      setPacoteRenovarId(pac.id);
                      setRenovarForm({
                        valorPago: String(pac.valorPago ?? ""),
                        formaPagamento: pac.formaPagamento ?? "",
                        numeroParcelas: String(pac.numeroParcelas ?? 1),
                        validadeDias: "",
                        observacoes: "",
                      });
                    }}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── Aba Relatório ── */}
          <TabsContent value="relatorio">
            <RelatorioPacotes />
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
                          className="p-1.5 rounded-lg hover:bg-stone-100 text-slate-400 hover:text-slate-600"
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

            {/* ── Seção de modelos ocultos ── */}
            {modelosOcultos.length > 0 && (
              <div className="mt-6">
                <button
                  onClick={() => setMostrarOcultos(v => !v)}
                  className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 font-medium mb-3"
                >
                  <EyeOff className="w-4 h-4" />
                  {mostrarOcultos ? "Ocultar" : "Ver"} modelos ocultos ({modelosOcultos.length})
                  {mostrarOcultos ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
                {mostrarOcultos && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {modelosOcultos.map(m => (
                      <div key={m.id} className="bg-stone-50 rounded-xl border border-dashed border-slate-200 p-4 space-y-3 opacity-70">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-semibold text-slate-600 line-through">{m.nome}</p>
                            {m.descricao && <p className="text-xs text-slate-400 mt-0.5">{m.descricao}</p>}
                          </div>
                          <button
                            onClick={() => restaurarModeloMutation.mutate({ id: m.id })}
                            disabled={restaurarModeloMutation.isPending}
                            className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-violet-50 hover:border-violet-300 hover:text-violet-700 text-slate-500 transition-colors"
                          >
                            <RotateCcw className="w-3 h-3" /> Restaurar
                          </button>
                        </div>
                        <div className="space-y-1">
                          {m.itens.map((item: any) => (
                            <div key={item.id} className="flex items-center justify-between text-xs">
                              <span className="text-slate-500">{item.servicoNome ?? `Serviço #${item.servicoId}`}</span>
                              <Badge variant="secondary" className="text-xs opacity-60">{item.quantidade}x</Badge>
                            </div>
                          ))}
                        </div>
                        <div className="pt-2 border-t border-slate-100">
                          <span className="font-bold text-slate-400">{formatCurrency(m.preco)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>

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

      {/* Modal de renovação de pacote */}
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
                type="number" min="0" step="0.01" placeholder="Ex: 350.00"
                value={renovarForm.valorPago}
                onChange={e => setRenovarForm(f => ({ ...f, valorPago: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Forma de pagamento</Label>
              <Select value={renovarForm.formaPagamento} onValueChange={v => setRenovarForm(f => ({ ...f, formaPagamento: v }))}>
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
                <Input type="number" min="1" max="24"
                  value={renovarForm.numeroParcelas}
                  onChange={e => setRenovarForm(f => ({ ...f, numeroParcelas: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Validade (dias)</Label>
                <Input type="number" min="1" placeholder="Ex: 90 (opcional)"
                  value={renovarForm.validadeDias}
                  onChange={e => setRenovarForm(f => ({ ...f, validadeDias: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Observações (opcional)</Label>
              <Textarea placeholder="Anotações sobre a renovação..." rows={2}
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

      {/* Modal de edição de pacote */}
      <Dialog open={!!pacoteEditarId} onOpenChange={(open) => !open && setPacoteEditarId(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-4 h-4 text-amber-700" />
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
              <p className="text-xs text-muted-foreground bg-amber-50 rounded-md px-3 py-2">
                Valor por parcela: <strong>{formatCurrency(Number(editarPacoteForm.valorPago) / Number(editarPacoteForm.numeroParcelas))}</strong>
              </p>
            )}
            <div className="space-y-2">
              <Label>Itens do pacote</Label>
              {editarPacoteForm.itens.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-stone-50 rounded-md px-3 py-2">
                  <span className="text-sm flex-1">{item.servicoNome}</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setEditarPacoteForm(f => ({
                        ...f,
                        itens: f.itens.map((it, i) => i === idx ? { ...it, quantidade: Math.max(it.sessoesUsadas + 1, it.quantidade - 1) } : it)
                      }))}
                      className="w-6 h-6 rounded bg-stone-200 hover:bg-stone-300 flex items-center justify-center text-sm font-bold"
                    >-</button>
                    <span className="w-8 text-center text-sm font-medium">{item.quantidade}</span>
                    <button
                      type="button"
                      onClick={() => setEditarPacoteForm(f => ({
                        ...f,
                        itens: f.itens.map((it, i) => i === idx ? { ...it, quantidade: it.quantidade + 1 } : it)
                      }))}
                      className="w-6 h-6 rounded bg-stone-200 hover:bg-stone-300 flex items-center justify-center text-sm font-bold"
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
              className="bg-amber-700 hover:bg-amber-800 text-white"
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
    </div>
  );
}
