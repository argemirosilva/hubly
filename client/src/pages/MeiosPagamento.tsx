import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Plus, Pencil, Trash2, CreditCard, Smartphone, Banknote, Wallet, MoreHorizontal,
  ChevronDown, ChevronUp, Percent
} from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { usePermissoes } from "@/hooks/usePermissoes";

type TipoMeio = "pix" | "debito" | "credito" | "dinheiro" | "outro";

const TIPO_LABELS: Record<TipoMeio, string> = {
  pix: "PIX",
  debito: "Débito",
  credito: "Crédito",
  dinheiro: "Dinheiro",
  outro: "Outro",
};

const TIPO_ICONS: Record<TipoMeio, React.ReactNode> = {
  pix: <Smartphone className="w-4 h-4" />,
  debito: <CreditCard className="w-4 h-4" />,
  credito: <CreditCard className="w-4 h-4" />,
  dinheiro: <Banknote className="w-4 h-4" />,
  outro: <Wallet className="w-4 h-4" />,
};

const TIPO_COLORS: Record<TipoMeio, string> = {
  pix: "bg-green-100 text-green-700 border-green-200",
  debito: "bg-amber-100 text-blue-700 border-blue-200",
  credito: "bg-purple-100 text-purple-700 border-purple-200",
  dinheiro: "bg-amber-100 text-amber-700 border-amber-200",
  outro: "bg-stone-100 text-gray-700 border-gray-200",
};

interface TaxaParcelaForm {
  parcela: number;
  taxa: string;
}

interface FormData {
  nome: string;
  tipo: TipoMeio;
  parcelamentoMaximo: number;
  taxaFixa: string;
  descontarDoVendedor: boolean;
  descontarDoAtendente: boolean;
  taxasParcela: TaxaParcelaForm[];
}

const DEFAULT_FORM: FormData = {
  nome: "",
  tipo: "pix",
  parcelamentoMaximo: 1,
  taxaFixa: "0.00",
  descontarDoVendedor: false,
  descontarDoAtendente: false,
  taxasParcela: [],
};

export default function MeiosPagamento() {
  const { isAdmin, pode } = usePermissoes();
  const canEdit = isAdmin || pode("configuracoesEditar");

  const { data: meios = [], isLoading, refetch } = trpc.meiosPagamento.list.useQuery();
  const createMutation = trpc.meiosPagamento.create.useMutation({
    onSuccess: () => { toast.success("Meio de pagamento criado!"); refetch(); setModalOpen(false); },
    onError: (e) => toast.error(e.message),
  });
  const updateMutation = trpc.meiosPagamento.update.useMutation({
    onSuccess: () => { toast.success("Meio de pagamento atualizado!"); refetch(); setModalOpen(false); },
    onError: (e) => toast.error(e.message),
  });
  const deleteMutation = trpc.meiosPagamento.delete.useMutation({
    onSuccess: () => { toast.success("Meio de pagamento removido!"); refetch(); setDeleteId(null); },
    onError: (e) => toast.error(e.message),
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState<FormData>(DEFAULT_FORM);
  const [expandedTaxas, setExpandedTaxas] = useState<Set<number>>(new Set());

  function openCreate() {
    setEditingId(null);
    setForm(DEFAULT_FORM);
    setModalOpen(true);
  }

  function openEdit(meio: any) {
    setEditingId(meio.id);
    setForm({
      nome: meio.nome,
      tipo: meio.tipo as TipoMeio,
      parcelamentoMaximo: meio.parcelamentoMaximo,
      taxaFixa: meio.taxaFixa ?? "0.00",
      descontarDoVendedor: meio.descontarDoVendedor,
      descontarDoAtendente: meio.descontarDoAtendente,
      taxasParcela: (meio.taxas ?? []).map((t: any) => ({ parcela: t.parcela, taxa: t.taxa })),
    });
    setModalOpen(true);
  }

  function handleTipoChange(tipo: TipoMeio) {
    const isCredito = tipo === "credito";
    const maxParcelas = isCredito ? form.parcelamentoMaximo : 1;
    // Gerar taxas para crédito se necessário
    let taxas = form.taxasParcela;
    if (isCredito && taxas.length === 0) {
      taxas = Array.from({ length: maxParcelas }, (_, i) => ({ parcela: i + 1, taxa: "0.00" }));
    } else if (!isCredito) {
      taxas = [];
    }
    setForm(f => ({ ...f, tipo, parcelamentoMaximo: maxParcelas, taxasParcela: taxas }));
  }

  function handleParcelamentoChange(value: number) {
    const taxas = Array.from({ length: value }, (_, i) => {
      const existing = form.taxasParcela.find(t => t.parcela === i + 1);
      return existing ?? { parcela: i + 1, taxa: "0.00" };
    });
    setForm(f => ({ ...f, parcelamentoMaximo: value, taxasParcela: taxas }));
  }

  function handleSubmit() {
    if (!form.nome.trim()) { toast.error("Nome é obrigatório"); return; }
    const payload = {
      nome: form.nome.trim(),
      tipo: form.tipo,
      parcelamentoMaximo: form.parcelamentoMaximo,
      taxaFixa: form.taxaFixa || "0.00",
      descontarDoVendedor: form.descontarDoVendedor,
      descontarDoAtendente: form.descontarDoAtendente,
      taxasParcela: form.taxasParcela,
    };
    if (editingId) {
      updateMutation.mutate({ id: editingId, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  function toggleExpandTaxas(id: number) {
    setExpandedTaxas(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Meios de Pagamento</h1>
          <p className="text-sm text-gray-500 mt-1">
            Configure os métodos de pagamento aceitos e suas taxas
          </p>
        </div>
        {canEdit && (
          <Button onClick={openCreate} className="gap-2">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Novo meio</span>
            <span className="sm:hidden">Novo</span>
          </Button>
        )}
      </div>

      {/* Lista */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-stone-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : meios.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-full bg-stone-100 flex items-center justify-center mb-4">
              <CreditCard className="w-7 h-7 text-gray-400" />
            </div>
            <h3 className="font-semibold text-gray-700 mb-1">Nenhum meio de pagamento</h3>
            <p className="text-sm text-gray-500 mb-4">
              Adicione os métodos de pagamento aceitos pelo seu negócio.
            </p>
            {canEdit && (
              <Button onClick={openCreate} variant="outline" className="gap-2">
                <Plus className="w-4 h-4" /> Adicionar primeiro meio
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {meios.map((meio: any) => {
            const tipo = meio.tipo as TipoMeio;
            const isExpanded = expandedTaxas.has(meio.id);
            const hasTaxas = meio.taxas && meio.taxas.length > 0;
            return (
              <Card key={meio.id} className={`transition-all ${!meio.ativo ? "opacity-60" : ""}`}>
                <CardContent className="p-2.5">
                  <div className="flex items-center gap-2">
                    {/* Ícone */}
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center border ${TIPO_COLORS[tipo] || TIPO_COLORS.outro}`}>
                      {TIPO_ICONS[tipo] || TIPO_ICONS.outro}
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-sm text-gray-900">{meio.nome}</span>
                        <Badge variant="outline" className={`text-xs ${TIPO_COLORS[tipo] || TIPO_COLORS.outro}`}>
                          {TIPO_LABELS[tipo] || tipo}
                        </Badge>
                        {!meio.ativo && (
                          <Badge variant="outline" className="text-xs bg-stone-100 text-gray-500">Inativo</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[10px] text-gray-500 flex-wrap">
                        {parseFloat(meio.taxaFixa) > 0 && (
                          <span className="flex items-center gap-1">
                            <Percent className="w-3 h-3" />
                            Taxa fixa: {parseFloat(meio.taxaFixa).toFixed(2)}%
                          </span>
                        )}
                        {meio.parcelamentoMaximo > 1 && (
                          <span>Até {meio.parcelamentoMaximo}x</span>
                        )}
                        {meio.descontarDoVendedor && <span className="text-orange-600">Desconta do vendedor</span>}
                        {meio.descontarDoAtendente && <span className="text-orange-600">Desconta do atendente</span>}
                      </div>
                    </div>
                    {/* Ações */}
                    <div className="flex items-center gap-1">
                      {hasTaxas && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => toggleExpandTaxas(meio.id)}
                          title="Ver taxas por parcela"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </Button>
                      )}
                      {canEdit && (
                        <>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => openEdit(meio)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                            onClick={() => setDeleteId(meio.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                  {/* Taxas por parcela expandidas */}
                  {isExpanded && hasTaxas && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-xs font-medium text-gray-500 mb-2">Taxas por parcela:</p>
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-1.5">
                        {meio.taxas.map((t: any) => (
                          <div key={t.parcela} className="text-center bg-stone-50 rounded-md p-1.5">
                            <div className="text-[10px] text-gray-500">{t.parcela}x</div>
                            <div className="text-xs font-semibold text-gray-800">{parseFloat(t.taxa).toFixed(2)}%</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* FAB Mobile */}
      {canEdit && (
        <button
          onClick={openCreate}
          className="fixed bottom-6 right-6 sm:hidden z-50 w-14 h-14 bg-primary text-white rounded-full shadow-lg flex items-center justify-center hover:bg-primary/90 active:scale-95 transition-all"
          aria-label="Novo meio de pagamento"
        >
          <Plus className="w-6 h-6" />
        </button>
      )}

      {/* Modal criar/editar */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar meio de pagamento" : "Novo meio de pagamento"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Nome */}
            <div className="space-y-1.5">
              <Label htmlFor="nome">Nome *</Label>
              <Input
                id="nome"
                placeholder="Ex: Cartão Visa, PIX, Dinheiro..."
                value={form.nome}
                onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
              />
            </div>
            {/* Tipo */}
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select value={form.tipo} onValueChange={(v) => handleTipoChange(v as TipoMeio)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(TIPO_LABELS) as [TipoMeio, string][]).map(([val, label]) => (
                    <SelectItem key={val} value={val}>
                      <div className="flex items-center gap-2">
                        {TIPO_ICONS[val]}
                        {label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Taxa fixa */}
            <div className="space-y-1.5">
              <Label htmlFor="taxaFixa">Taxa fixa (%)</Label>
              <div className="relative">
                <Input
                  id="taxaFixa"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  placeholder="0.00"
                  value={form.taxaFixa}
                  onChange={e => setForm(f => ({ ...f, taxaFixa: e.target.value }))}
                  className="pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
              </div>
            </div>

            {/* Parcelamento (apenas crédito) */}
            {form.tipo === "credito" && (
              <div className="space-y-1.5">
                <Label>Parcelamento máximo</Label>
                <Select
                  value={String(form.parcelamentoMaximo)}
                  onValueChange={(v) => handleParcelamentoChange(Number(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 24 }, (_, i) => i + 1).map(n => (
                      <SelectItem key={n} value={String(n)}>{n}x</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Taxas por parcela (apenas crédito) */}
            {form.tipo === "credito" && form.taxasParcela.length > 0 && (
              <div className="space-y-2">
                <Label>Taxas por parcela (%)</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {form.taxasParcela.map((t, idx) => (
                    <div key={t.parcela} className="flex items-center gap-2">
                      <span className="text-sm text-gray-500 w-8 shrink-0">{t.parcela}x</span>
                      <div className="relative flex-1">
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          placeholder="0.00"
                          value={t.taxa}
                          onChange={e => {
                            const newTaxas = [...form.taxasParcela];
                            newTaxas[idx] = { ...newTaxas[idx], taxa: e.target.value };
                            setForm(f => ({ ...f, taxasParcela: newTaxas }));
                          }}
                          className="pr-6 text-sm"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Separator />

            {/* Opções de desconto */}
            <div className="space-y-3">
              <Label className="text-sm font-medium text-gray-700">Desconto de taxa</Label>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Descontar do vendedor</p>
                  <p className="text-xs text-gray-500">A taxa é descontada da comissão do vendedor</p>
                </div>
                <Switch
                  checked={form.descontarDoVendedor}
                  onCheckedChange={v => setForm(f => ({ ...f, descontarDoVendedor: v }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Descontar do atendente</p>
                  <p className="text-xs text-gray-500">A taxa é descontada da comissão do atendente</p>
                </div>
                <Switch
                  checked={form.descontarDoAtendente}
                  onCheckedChange={v => setForm(f => ({ ...f, descontarDoAtendente: v }))}
                />
              </div>
            </div>

            {/* Ativo (apenas edição) */}
            {editingId && (
              <>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Meio ativo</p>
                    <p className="text-xs text-gray-500">Desative para ocultar sem excluir</p>
                  </div>
                  <Switch
                    checked={true}
                    onCheckedChange={(v) => {
                      updateMutation.mutate({ id: editingId!, ativo: v });
                    }}
                  />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={isPending}>
              {isPending ? "Salvando..." : editingId ? "Salvar alterações" : "Criar meio"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmar exclusão */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover meio de pagamento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O meio de pagamento será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => deleteId && deleteMutation.mutate({ id: deleteId })}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
