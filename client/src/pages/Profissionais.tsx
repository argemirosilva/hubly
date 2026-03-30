import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Plus, Scissors, Settings, Percent } from "lucide-react";
import { toast } from "sonner";

const CORES = ["#6366f1","#ec4899","#10b981","#f59e0b","#3b82f6","#8b5cf6","#ef4444","#06b6d4"];

const permFields = [
  { key: "podeAgendar", label: "Criar agendamentos" },
  { key: "podeCancelar", label: "Cancelar agendamentos" },
  { key: "podeRemarcar", label: "Remarcar agendamentos" },
  { key: "podeEditarCliente", label: "Editar clientes" },
  { key: "podeSolicitarBloqueio", label: "Solicitar bloqueio de agenda" },
  { key: "podeVerComissoes", label: "Ver próprias comissões" },
  { key: "podeVerFinanceiro", label: "Ver financeiro completo" },
];

export default function Profissionais() {
  const utils = trpc.useUtils();
  const [modalOpen, setModalOpen] = useState(false);
  const [permModalOpen, setPermModalOpen] = useState(false);
  const [profSelecionado, setProfSelecionado] = useState<{ id: number; nome: string; permissoes?: any } | null>(null);
  const [form, setForm] = useState({ nome: "", telefone: "", email: "", especialidade: "", corCalendario: "#6366f1" });

  const { data: profissionais } = trpc.profissionais.list.useQuery();

  const criarMutation = trpc.profissionais.create.useMutation({
    onSuccess: () => { toast.success("Profissional cadastrado!"); utils.profissionais.list.invalidate(); setModalOpen(false); },
    onError: (err: any) => toast.error(err.message),
  });

  const updatePermMutation = trpc.profissionais.updatePermissoes.useMutation({
    onSuccess: () => { toast.success("Permissões atualizadas!"); utils.profissionais.list.invalidate(); },
    onError: (err: any) => toast.error(err.message),
  });

  const handlePermChange = (key: string, value: boolean) => {
    if (!profSelecionado) return;
    const perms = profSelecionado.permissoes ?? {};
    const updated = { ...perms, [key]: value };
    setProfSelecionado(p => p ? { ...p, permissoes: updated } : p);
    updatePermMutation.mutate({ profissionalId: profSelecionado.id, [key]: value } as any);
  };

  return (
    <div className="p-4 lg:p-6 space-y-4 max-w-5xl mx-auto animate-in-up">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-bold tracking-tight text-xl lg:text-2xl">Profissionais</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{profissionais?.length ?? 0} cadastrados</p>
        </div>
        <button onClick={() => setModalOpen(true)} className="btn-primary py-2 px-3 text-xs">
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Novo Profissional</span>
          <span className="sm:hidden">Novo</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(profissionais ?? []).map(p => (
          <Card key={p.id} className="border-border shadow-none">
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm"
                  style={{ backgroundColor: p.corCalendario ?? "#6366f1" }}>
                  {p.nome.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{p.nome}</p>
                  <p className="text-xs text-muted-foreground">{p.especialidade ?? "Profissional"}</p>
                </div>
                <div className={`w-2 h-2 rounded-full ${p.ativo ? "bg-emerald-500" : "bg-gray-300"}`} />
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2"
                onClick={() => { setProfSelecionado(p as any); setPermModalOpen(true); }}
              >
                <Settings className="w-3.5 h-3.5" />
                Gerenciar Permissões
              </Button>
            </CardContent>
          </Card>
        ))}

        {(profissionais ?? []).length === 0 && (
          <div className="col-span-3 flex flex-col items-center justify-center py-16 text-center">
            <Scissors className="w-10 h-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">Nenhum profissional cadastrado</p>
          </div>
        )}
      </div>

      {/* Modal criar profissional */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-bold tracking-tight">Novo Profissional</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Nome completo *</Label>
              <Input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Nome do profissional" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Especialidade</Label>
                <Input value={form.especialidade} onChange={e => setForm(f => ({ ...f, especialidade: e.target.value }))} placeholder="Ex: Cabeleireira" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Telefone</Label>
                <Input value={form.telefone} onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))} placeholder="(11) 99999-9999" />
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Cor no calendário</Label>
              <div className="flex gap-2 flex-wrap">
                {CORES.map(cor => (
                  <button
                    key={cor}
                    className={`w-7 h-7 rounded-full transition-transform ${form.corCalendario === cor ? "scale-125 ring-2 ring-offset-1 ring-foreground" : "hover:scale-110"}`}
                    style={{ backgroundColor: cor }}
                    onClick={() => setForm(f => ({ ...f, corCalendario: cor }))}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={() => criarMutation.mutate(form as any)} disabled={!form.nome || criarMutation.isPending}>
              {criarMutation.isPending ? "Salvando..." : "Cadastrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal permissões */}
      <Dialog open={permModalOpen} onOpenChange={setPermModalOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-bold tracking-tight">
              Permissões — {profSelecionado?.nome}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-1 py-2">
            {permFields.map(field => (
              <div key={field.key} className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
                <span className="text-sm text-foreground">{field.label}</span>
                <Switch
                  checked={!!(profSelecionado?.permissoes?.[field.key])}
                  onCheckedChange={v => handlePermChange(field.key, v)}
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button onClick={() => setPermModalOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
