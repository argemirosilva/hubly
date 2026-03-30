import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, CheckCircle, XCircle, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const statusLabel: Record<string, string> = { pendente: "Pendente", aprovado: "Aprovado", recusado: "Recusado" };
const statusColor: Record<string, string> = { pendente: "bg-amber-100 text-amber-700", aprovado: "bg-emerald-100 text-emerald-700", recusado: "bg-red-100 text-red-700" };

export default function Bloqueios() {
  const utils = trpc.useUtils();
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ dataInicio: "", dataFim: "", horaInicio: "08:00", horaFim: "18:00", motivo: "" });

  const { data: bloqueios } = trpc.bloqueios.list.useQuery();
  const { data: profissionais } = trpc.profissionais.list.useQuery();

  const criarMutation = trpc.bloqueios.create.useMutation({
    onSuccess: () => { toast.success("Solicitação enviada!"); utils.bloqueios.list.invalidate(); setModalOpen(false); },
    onError: (err: any) => toast.error(err.message),
  });
  const aprovarMutation = trpc.bloqueios.aprovar.useMutation({
    onSuccess: () => { toast.success("Bloqueio aprovado!"); utils.bloqueios.list.invalidate(); },
    onError: (err: any) => toast.error(err.message),
  });
  const recusarMutation = trpc.bloqueios.recusar.useMutation({
    onSuccess: () => { toast.success("Bloqueio recusado."); utils.bloqueios.list.invalidate(); },
    onError: (err: any) => toast.error(err.message),
  });

  const profMap: Record<number, string> = {};
  profissionais?.forEach(p => { profMap[p.id] = p.nome; });

  return (
    <div className="p-6 space-y-5 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>Bloqueios de Agenda</h1>
        <Button onClick={() => setModalOpen(true)} className="gap-2"><Plus className="w-4 h-4" />Solicitar Bloqueio</Button>
      </div>
      <Card className="border-border shadow-none">
        <CardContent className="p-0">
          {(bloqueios ?? []).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Lock className="w-10 h-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">Nenhuma solicitação de bloqueio</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {(bloqueios ?? []).map(b => (
                <div key={b.id} className="flex items-center gap-4 px-5 py-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{profMap[b.profissionalId] ?? "Profissional"}</p>
                    <p className="text-xs text-muted-foreground">
                      {b.dataInicio?.split("-").reverse().join("/")} até {b.dataFim?.split("-").reverse().join("/")} · {b.horaInicio?.slice(0,5)} - {b.horaFim?.slice(0,5)}
                    </p>
                    {b.motivo && <p className="text-xs text-muted-foreground mt-0.5 italic">"{b.motivo}"</p>}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[b.status] ?? "bg-gray-100 text-gray-600"}`}>
                    {statusLabel[b.status] ?? b.status}
                  </span>
                  {b.status === "pendente" && (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="h-7 gap-1 text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                        onClick={() => aprovarMutation.mutate({ id: b.id })}>
                        <CheckCircle className="w-3 h-3" />Aprovar
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 gap-1 text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => recusarMutation.mutate({ id: b.id, motivoRecusa: "Recusado pela gestão" })}>
                        <XCircle className="w-3 h-3" />Recusar
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle style={{ fontFamily: "'Playfair Display', serif" }}>Solicitar Bloqueio</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs text-muted-foreground mb-1.5 block">Data início *</Label><Input type="date" value={form.dataInicio} onChange={e => setForm(f => ({ ...f, dataInicio: e.target.value }))} /></div>
              <div><Label className="text-xs text-muted-foreground mb-1.5 block">Data fim *</Label><Input type="date" value={form.dataFim} onChange={e => setForm(f => ({ ...f, dataFim: e.target.value }))} /></div>
              <div><Label className="text-xs text-muted-foreground mb-1.5 block">Hora início</Label><Input type="time" value={form.horaInicio} onChange={e => setForm(f => ({ ...f, horaInicio: e.target.value }))} /></div>
              <div><Label className="text-xs text-muted-foreground mb-1.5 block">Hora fim</Label><Input type="time" value={form.horaFim} onChange={e => setForm(f => ({ ...f, horaFim: e.target.value }))} /></div>
            </div>
            <div><Label className="text-xs text-muted-foreground mb-1.5 block">Motivo</Label><Input value={form.motivo} onChange={e => setForm(f => ({ ...f, motivo: e.target.value }))} placeholder="Férias, consulta médica..." /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={() => criarMutation.mutate(form as any)} disabled={!form.dataInicio || !form.dataFim || criarMutation.isPending}>
              {criarMutation.isPending ? "Enviando..." : "Solicitar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
