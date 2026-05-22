import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Tag, Percent, DollarSign } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface FormData {
  nome: string;
  valor: string;
  tipo: "fixo" | "percentual";
}

const DEFAULT_FORM: FormData = {
  nome: "",
  valor: "",
  tipo: "fixo",
};

export default function TaxasConfig() {
  const { data: taxas = [], isLoading, refetch } = trpc.taxasConfig.list.useQuery();

  const createMutation = trpc.taxasConfig.create.useMutation({
    onSuccess: () => { toast.success("Taxa criada!"); refetch(); setModalOpen(false); resetForm(); },
    onError: (err) => toast.error(err.message),
  });

  const updateMutation = trpc.taxasConfig.update.useMutation({
    onSuccess: () => { toast.success("Taxa atualizada!"); refetch(); setModalOpen(false); resetForm(); },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = trpc.taxasConfig.delete.useMutation({
    onSuccess: () => { toast.success("Taxa removida!"); refetch(); setDeleteId(null); },
    onError: (err) => toast.error(err.message),
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState<FormData>(DEFAULT_FORM);

  function resetForm() {
    setForm(DEFAULT_FORM);
    setEditingId(null);
  }

  function openCreate() {
    resetForm();
    setModalOpen(true);
  }

  function openEdit(taxa: any) {
    setForm({ nome: taxa.nome, valor: taxa.valor, tipo: taxa.tipo });
    setEditingId(taxa.id);
    setModalOpen(true);
  }

  function handleSubmit() {
    if (!form.nome.trim()) { toast.error("Nome é obrigatório"); return; }
    const valorNum = parseFloat(form.valor);
    if (isNaN(valorNum) || valorNum <= 0) { toast.error("Valor deve ser maior que zero"); return; }
    if (editingId) {
      updateMutation.mutate({ id: editingId, nome: form.nome, valor: form.valor, tipo: form.tipo });
    } else {
      createMutation.mutate({ nome: form.nome, valor: form.valor, tipo: form.tipo });
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Taxas Adicionais</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Configure taxas que podem ser aplicadas aos agendamentos (ex: taxa de deslocamento)
          </p>
        </div>
        <Button onClick={openCreate} size="sm" className="gap-1.5">
          <Plus className="w-4 h-4" />
          Nova taxa
        </Button>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Carregando...</div>
      ) : taxas.length === 0 ? (
        <Card>
          <CardContent className="py-10 flex flex-col items-center gap-3 text-center">
            <Tag className="w-8 h-8 text-muted-foreground/40" />
            <div>
              <p className="font-medium text-sm">Nenhuma taxa configurada</p>
              <p className="text-xs text-muted-foreground mt-1">
                Crie taxas reutilizáveis para aplicar rapidamente nos agendamentos.
              </p>
            </div>
            <Button onClick={openCreate} size="sm" variant="outline" className="gap-1.5 mt-1">
              <Plus className="w-3.5 h-3.5" />
              Criar primeira taxa
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {taxas.map((taxa: any) => (
            <Card key={taxa.id} className="overflow-hidden">
              <CardContent className="p-0">
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      {taxa.tipo === "percentual"
                        ? <Percent className="w-4 h-4 text-blue-600" />
                        : <DollarSign className="w-4 h-4 text-blue-600" />
                      }
                    </div>
                    <div>
                      <p className="font-medium text-sm">{taxa.nome}</p>
                      <p className="text-xs text-muted-foreground">
                        {taxa.tipo === "percentual"
                          ? `${parseFloat(taxa.valor).toFixed(2)}% sobre o valor do agendamento`
                          : `R$ ${parseFloat(taxa.valor).toFixed(2)} fixo`
                        }
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(taxa)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteId(taxa.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal criar/editar */}
      <Dialog open={modalOpen} onOpenChange={(open) => { if (!open) { setModalOpen(false); resetForm(); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar taxa" : "Nova taxa adicional"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="nome">Nome da taxa</Label>
              <Input
                id="nome"
                placeholder="Ex: Taxa de deslocamento"
                value={form.nome}
                onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tipo">Tipo</Label>
              <Select value={form.tipo} onValueChange={(v: "fixo" | "percentual") => setForm(f => ({ ...f, tipo: v }))}>
                <SelectTrigger id="tipo">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixo">Valor fixo (R$)</SelectItem>
                  <SelectItem value="percentual">Percentual (%)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="valor">{form.tipo === "percentual" ? "Percentual (%)" : "Valor (R$)"}</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  {form.tipo === "percentual" ? "%" : "R$"}
                </span>
                <Input
                  id="valor"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0,00"
                  className="pl-9"
                  value={form.valor}
                  onChange={e => setForm(f => ({ ...f, valor: e.target.value }))}
                />
              </div>
              {form.tipo === "percentual" && (
                <p className="text-xs text-muted-foreground">O valor será calculado sobre o total dos serviços do agendamento.</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setModalOpen(false); resetForm(); }}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={isPending}>
              {isPending ? "Salvando..." : editingId ? "Salvar" : "Criar taxa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmar exclusão */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover taxa?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A taxa será removida permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate({ id: deleteId })}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
