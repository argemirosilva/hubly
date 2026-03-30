import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Layers, Clock, DollarSign } from "lucide-react";
import { toast } from "sonner";

function formatCurrency(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

export default function Servicos() {
  const utils = trpc.useUtils();
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ nome: "", descricao: "", valor: "", duracaoMinutos: "60", categoria: "" });

  const { data: servicos } = trpc.servicos.list.useQuery();

  const criarMutation = trpc.servicos.create.useMutation({
    onSuccess: () => { toast.success("Serviço cadastrado!"); utils.servicos.list.invalidate(); setModalOpen(false); },
    onError: (err: any) => toast.error(err.message),
  });

  return (
    <div className="p-4 lg:p-6 space-y-4 max-w-5xl mx-auto animate-in-up">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-bold tracking-tight text-xl lg:text-2xl">Serviços</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{servicos?.length ?? 0} cadastrados</p>
        </div>
        <button onClick={() => setModalOpen(true)} className="btn-primary py-2 px-3 text-xs">
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Novo Serviço</span>
          <span className="sm:hidden">Novo</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(servicos ?? []).map(s => (
          <Card key={s.id} className="border-border shadow-none">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="w-9 h-9 bg-secondary rounded-lg flex items-center justify-center">
                  <Layers className="w-4 h-4 text-muted-foreground" />
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${s.ativo ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                  {s.ativo ? "Ativo" : "Inativo"}
                </span>
              </div>
              <h3 className="text-sm font-semibold text-foreground mb-1">{s.nome}</h3>
              {s.descricao && <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{s.descricao}</p>}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  {s.duracaoMinutos ?? 60} min
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

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-bold tracking-tight">Novo Serviço</DialogTitle>
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
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Categoria</Label>
              <Input value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))} placeholder="Ex: Cabelo, Estética, Unhas..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={() => criarMutation.mutate({ ...form, valor: form.valor, duracaoMinutos: parseInt(form.duracaoMinutos) } as any)} disabled={!form.nome || !form.valor || criarMutation.isPending}>
              {criarMutation.isPending ? "Salvando..." : "Cadastrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
