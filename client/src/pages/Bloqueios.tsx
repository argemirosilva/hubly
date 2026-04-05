import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Lock, CheckCircle, XCircle, Plus, Calendar, Clock } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { usePermissoes } from "@/hooks/usePermissoes";
import { trpc } from "@/lib/trpc";

const statusConfig: Record<string, { label: string; bg: string; color: string }> = {
  pendente:  { label: "Pendente",  bg: "oklch(72% 0.16 80 / 14%)",  color: "oklch(40% 0.14 75)" },
  aprovado:  { label: "Aprovado",  bg: "oklch(62% 0.18 155 / 14%)", color: "oklch(35% 0.14 155)" },
  recusado:  { label: "Recusado",  bg: "oklch(58% 0.22 25 / 12%)",  color: "oklch(40% 0.18 25)" },
};

export default function Bloqueios() {
  const utils = trpc.useUtils();
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ dataInicio: "", dataFim: "", horaInicio: "08:00", horaFim: "18:00", motivo: "" });
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);
  const [selectedBloqueio, setSelectedBloqueio] = useState<any>(null);
  const [motivoRecusa, setMotivoRecusa] = useState("");

  const { isOwner, pode, profissionalId } = usePermissoes();
  const isAdmin = isOwner || pode('agendaAprovarBloqueio');

  const { data: bloqueios } = trpc.bloqueios.list.useQuery();
  const { data: profissionais } = trpc.profissionais.listParaAgendamento.useQuery();

  const criarMutation = trpc.bloqueios.create.useMutation({
    onSuccess: () => { toast.success("Solicitação enviada!"); utils.bloqueios.list.invalidate(); setModalOpen(false); },
    onError: (err: any) => toast.error(err.message),
  });
  const aprovarMutation = trpc.bloqueios.aprovar.useMutation({
    onSuccess: () => { toast.success("Bloqueio aprovado!"); utils.bloqueios.list.invalidate(); },
    onError: (err: any) => toast.error(err.message),
  });
  const recusarMutation = trpc.bloqueios.recusar.useMutation({
    onSuccess: () => { 
      toast.success("Bloqueio recusado."); 
      utils.bloqueios.list.invalidate();
      setApprovalModalOpen(false);
      setMotivoRecusa("");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const profMap: Record<number, string> = {};
  profissionais?.forEach(p => { profMap[p.id] = p.nome; });

  return (
    <div className="p-4 lg:p-6 space-y-4 max-w-4xl mx-auto animate-in-up">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-bold tracking-tight text-xl lg:text-2xl">Bloqueios de Agenda</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{bloqueios?.length ?? 0} solicitações</p>
        </div>
        <button onClick={() => setModalOpen(true)} className="btn-primary py-2 px-3 text-xs">
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Solicitar Bloqueio</span>
          <span className="sm:hidden">Solicitar</span>
        </button>
      </div>

      <div className="card-elegant overflow-hidden">
        {(bloqueios ?? []).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-center px-6">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: "oklch(55% 0.22 264 / 8%)" }}>
              <Lock className="w-5 h-5" style={{ color: "oklch(55% 0.22 264)" }} />
            </div>
            <p className="text-sm font-medium text-foreground mb-1">Nenhuma solicitação</p>
            <p className="text-xs text-muted-foreground mb-4">Solicite bloqueios para férias, folgas ou consultas</p>
            <button className="btn-primary text-xs py-1.5" onClick={() => setModalOpen(true)}>
              <Plus className="w-3.5 h-3.5" /> Solicitar bloqueio
            </button>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: "oklch(94% 0.008 250)" }}>
            {(bloqueios ?? []).map(b => {
              const cfg = statusConfig[b.status] ?? statusConfig.pendente;
              return (
                <div key={b.id} className="px-4 py-3.5">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: "oklch(55% 0.22 264 / 10%)" }}>
                      <Lock className="w-4 h-4" style={{ color: "oklch(45% 0.18 264)" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-foreground">{profMap[b.profissionalId] ?? "Profissional"}</p>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0"
                          style={{ background: cfg.bg, color: cfg.color }}>
                          {cfg.label}
                        </span>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-3 mt-1">
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="w-3 h-3 flex-shrink-0" />
                          {b.dataInicio?.split("-").reverse().join("/")} → {b.dataFim?.split("-").reverse().join("/")}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3 flex-shrink-0" />
                          {b.horaInicio?.slice(0, 5)} – {b.horaFim?.slice(0, 5)}
                        </span>
                      </div>
                      {b.motivo && (
                        <p className="text-xs text-muted-foreground mt-0.5 italic truncate">\"{ b.motivo}\"</p>
                      )}
                      {b.status === "recusado" && b.motivoRecusa && (
                        <p className="text-xs text-red-600 mt-0.5 italic">Motivo da recusa: {b.motivoRecusa}</p>
                      )}
                      {b.aprovadoPorId && (
                        <p className="text-xs text-muted-foreground mt-1">Aprovado em {b.updatedAt ? new Date(b.updatedAt).toLocaleDateString('pt-BR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}</p>
                      )}
                    </div>
                  </div>
                  {b.status === "pendente" && isAdmin && b.profissionalId !== profissionalId && (
                    <div className="flex gap-2 mt-3 ml-12">
                      <button
                        className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors"
                        style={{ borderColor: "oklch(62% 0.18 155 / 40%)", color: "oklch(35% 0.14 155)", background: "oklch(62% 0.18 155 / 8%)" }}
                        onClick={() => aprovarMutation.mutate({ id: b.id })}
                        disabled={aprovarMutation.isPending}>
                        <CheckCircle className="w-3 h-3" /> Aprovar
                      </button>
                      <button
                        className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors"
                        style={{ borderColor: "oklch(58% 0.22 25 / 40%)", color: "oklch(40% 0.18 25)", background: "oklch(58% 0.22 25 / 8%)" }}
                        onClick={() => { setSelectedBloqueio(b); setApprovalModalOpen(true); setMotivoRecusa(""); }}
                        disabled={recusarMutation.isPending}>
                        <XCircle className="w-3 h-3" /> Recusar
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-bold tracking-tight">Solicitar Bloqueio</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Data início *</Label>
                <Input type="date" value={form.dataInicio} onChange={e => setForm(f => ({ ...f, dataInicio: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Data fim *</Label>
                <Input type="date" value={form.dataFim} onChange={e => setForm(f => ({ ...f, dataFim: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Hora início</Label>
                <Input type="time" value={form.horaInicio} onChange={e => setForm(f => ({ ...f, horaInicio: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Hora fim</Label>
                <Input type="time" value={form.horaFim} onChange={e => setForm(f => ({ ...f, horaFim: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Motivo</Label>
              <Input value={form.motivo} onChange={e => setForm(f => ({ ...f, motivo: e.target.value }))} placeholder="Férias, consulta médica..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={() => criarMutation.mutate(form as any)} disabled={!form.dataInicio || !form.dataFim || criarMutation.isPending}>
              {criarMutation.isPending ? "Enviando..." : "Solicitar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={approvalModalOpen} onOpenChange={setApprovalModalOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-bold tracking-tight">Recusar Bloqueio</DialogTitle>
          </DialogHeader>
          {selectedBloqueio && (
            <div className="space-y-4 py-2">
              <div className="p-3 rounded-lg" style={{ background: "oklch(94% 0.008 250)" }}>
                <p className="text-xs text-muted-foreground mb-1">Profissional</p>
                <p className="text-sm font-semibold">{profMap[selectedBloqueio.profissionalId] ?? "Profissional"}</p>
                <p className="text-xs text-muted-foreground mt-2 mb-1">Período</p>
                <p className="text-sm">{selectedBloqueio.dataInicio?.split("-").reverse().join("/")} → {selectedBloqueio.dataFim?.split("-").reverse().join("/")}</p>
                {selectedBloqueio.motivo && (
                  <>
                    <p className="text-xs text-muted-foreground mt-2 mb-1">Motivo</p>
                    <p className="text-sm italic">\"{selectedBloqueio.motivo}\"</p>
                  </>
                )}
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Observações da recusa</Label>
                <Textarea 
                  value={motivoRecusa} 
                  onChange={e => setMotivoRecusa(e.target.value)}
                  placeholder="Explique por que o bloqueio está sendo recusado..."
                  className="text-xs h-24"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setApprovalModalOpen(false)}>Cancelar</Button>
            <Button 
              onClick={() => recusarMutation.mutate({ id: selectedBloqueio.id, motivoRecusa })}
              disabled={recusarMutation.isPending}
              style={{ background: "oklch(58% 0.22 25)", color: "white" }}
            >
              {recusarMutation.isPending ? "Recusando..." : "Recusar Bloqueio"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
