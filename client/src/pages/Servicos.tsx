import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Layers, Clock, DollarSign, Percent, Pencil } from "lucide-react";
import { toast } from "sonner";

function formatCurrency(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

const emptyForm = { nome: "", descricao: "", valor: "", duracaoMinutos: "60", categoria: "", percentualComissao: "" };

export default function Servicos() {
  const utils = trpc.useUtils();
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<number | null>(null);
  const [form, setForm] = useState({ ...emptyForm });

  const { data: servicos } = trpc.servicos.list.useQuery();

  const criarMutation = trpc.servicos.create.useMutation({
    onSuccess: () => { toast.success("Serviço cadastrado!"); utils.servicos.list.invalidate(); setModalOpen(false); setForm({ ...emptyForm }); },
    onError: (err: any) => toast.error(err.message),
  });

  const editarMutation = trpc.servicos.update.useMutation({
    onSuccess: () => { toast.success("Serviço atualizado!"); utils.servicos.list.invalidate(); setModalOpen(false); setEditando(null); setForm({ ...emptyForm }); },
    onError: (err: any) => toast.error(err.message),
  });

  function abrirEditar(s: any) {
    setEditando(s.id);
    setForm({
      nome: s.nome ?? "",
      descricao: s.descricao ?? "",
      valor: String(s.valor ?? ""),
      duracaoMinutos: String(s.duracaoMinutos ?? 60),
      categoria: s.categoria ?? "",
      percentualComissao: s.percentualComissao ? String(parseFloat(String(s.percentualComissao))) : "",
    });
    setModalOpen(true);
  }

  function abrirNovo() {
    setEditando(null);
    setForm({ ...emptyForm });
    setModalOpen(true);
  }

  function salvar() {
    const payload = {
      ...form,
      duracaoMinutos: parseInt(form.duracaoMinutos),
      percentualComissao: form.percentualComissao || undefined,
    } as any;

    if (editando) {
      editarMutation.mutate({ id: editando, ...payload });
    } else {
      criarMutation.mutate(payload);
    }
  }

  const isPending = criarMutation.isPending || editarMutation.isPending;

  return (
    <div className="p-4 lg:p-6 space-y-4 max-w-5xl mx-auto animate-in-up">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-bold tracking-tight text-xl lg:text-2xl">Serviços</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{servicos?.length ?? 0} cadastrados</p>
        </div>
        <button onClick={abrirNovo} className="btn-primary py-2 px-3 text-xs">
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Novo Serviço</span>
          <span className="sm:hidden">Novo</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(servicos ?? []).map(s => (
          <Card key={s.id} className="border-border shadow-none hover:shadow-sm transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="w-9 h-9 bg-secondary rounded-lg flex items-center justify-center">
                  <Layers className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${s.ativo ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                    {s.ativo ? "Ativo" : "Inativo"}
                  </span>
                  <button onClick={() => abrirEditar(s)} className="p-1 rounded hover:bg-secondary transition-colors">
                    <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                </div>
              </div>
              <h3 className="text-sm font-semibold text-foreground mb-1">{s.nome}</h3>
              {s.descricao && <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{s.descricao}</p>}
              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {s.duracaoMinutos ?? 60} min
                  </div>
                  {s.percentualComissao && parseFloat(String(s.percentualComissao)) > 0 && (
                    <div className="flex items-center gap-1 text-xs text-primary font-medium">
                      <Percent className="w-3 h-3" />
                      {parseFloat(String(s.percentualComissao)).toFixed(0)}% comissão
                    </div>
                  )}
                </div>
                <span className="text-base font-bold text-foreground">
                  {formatCurrency(parseFloat(String(s.valor)))}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}

        {(servicos ?? []).length === 0 && (
          <div className="col-span-3 flex flex-col items-center justify-center py-16 text-center">
            <Layers className="w-10 h-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">Nenhum serviço cadastrado</p>
          </div>
        )}
      </div>

      <Dialog open={modalOpen} onOpenChange={open => { setModalOpen(open); if (!open) { setEditando(null); setForm({ ...emptyForm }); } }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-bold tracking-tight">{editando ? "Editar Serviço" : "Novo Serviço"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Nome do serviço *</Label>
              <Input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Ex: Corte feminino" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Descrição</Label>
              <Input value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Descrição do serviço" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Valor (R$) *</Label>
                <Input type="number" min="0" step="0.01" value={form.valor} onChange={e => setForm(f => ({ ...f, valor: e.target.value }))} placeholder="0,00" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Duração (min)</Label>
                <Input type="number" min="15" step="15" value={form.duracaoMinutos} onChange={e => setForm(f => ({ ...f, duracaoMinutos: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Categoria</Label>
                <Input value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))} placeholder="Ex: Cabelo, Unhas..." />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">
                  <span className="flex items-center gap-1">
                    <Percent className="w-3 h-3" /> % Comissão padrão
                  </span>
                </Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={form.percentualComissao}
                  onChange={e => setForm(f => ({ ...f, percentualComissao: e.target.value }))}
                  placeholder="Ex: 40"
                />
              </div>
            </div>
            {form.percentualComissao && parseFloat(form.percentualComissao) > 0 && (
              <p className="text-xs text-muted-foreground bg-secondary/50 rounded-md px-3 py-2">
                Ao concluir um agendamento com este serviço, a comissão de <strong>{parseFloat(form.percentualComissao).toFixed(1)}%</strong> será preenchida automaticamente. O profissional pode ter um percentual diferente configurado no seu cadastro — o do serviço tem prioridade.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setModalOpen(false); setEditando(null); }}>Cancelar</Button>
            <Button onClick={salvar} disabled={!form.nome || !form.valor || isPending}>
              {isPending ? "Salvando..." : editando ? "Salvar alterações" : "Cadastrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
