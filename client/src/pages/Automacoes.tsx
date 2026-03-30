import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Zap, Plus } from "lucide-react";
import { toast } from "sonner";

const tipoLabels: Record<string, string> = {
  evento: "Evento (após agendamento)",
  data_fixa: "Data comemorativa",
  aniversario_mes: "Aniversariante do mês",
  dias_antes_agendamento: "Dias antes do agendamento",
  horas_apos_agendamento: "Horas após agendamento",
};

export default function Automacoes() {
  const utils = trpc.useUtils();
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    tipoGatilho: "dias_antes_agendamento",
    nome: "",
    corpoMensagem: "",
    dataFixaDia: "",
    dataFixaMes: "",
    dataFixaHora: "09:00",
    horaDisparo: "09:00",
    diasAntesDepois: "1",
  });

  const { data: automacoes } = trpc.automacoes.list.useQuery();

  const criarMutation = trpc.automacoes.create.useMutation({
    onSuccess: () => { toast.success("Automação criada!"); utils.automacoes.list.invalidate(); setModalOpen(false); },
    onError: (err: any) => toast.error(err.message),
  });

  const toggleMutation = trpc.automacoes.update.useMutation({
    onSuccess: () => utils.automacoes.list.invalidate(),
    onError: (err: any) => toast.error(err.message),
  });

  return (
    <div className="p-6 space-y-5 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>Automações</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Mensagens automáticas via WhatsApp</p>
        </div>
        <Button onClick={() => setModalOpen(true)} className="gap-2"><Plus className="w-4 h-4" />Nova Automação</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(automacoes ?? []).map(a => (
          <Card key={a.id} className="border-border shadow-none">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="w-9 h-9 bg-secondary rounded-lg flex items-center justify-center">
                  <Zap className="w-4 h-4 text-muted-foreground" />
                </div>
                <Switch checked={!!a.ativo} onCheckedChange={v => toggleMutation.mutate({ id: a.id, ativo: v })} />
              </div>
              <h3 className="text-sm font-semibold text-foreground mb-1">{a.nome}</h3>
              <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">{tipoLabels[a.tipoGatilho] ?? a.tipoGatilho}</span>
              {a.corpoMensagem && <p className="text-xs text-muted-foreground mt-3 line-clamp-2 italic">"{a.corpoMensagem}"</p>}
              {a.horaDisparo && <p className="text-xs text-muted-foreground mt-2">Horário: {a.horaDisparo}</p>}
            </CardContent>
          </Card>
        ))}
        {(automacoes ?? []).length === 0 && (
          <div className="col-span-2 flex flex-col items-center justify-center py-16 text-center">
            <Zap className="w-10 h-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">Nenhuma automação configurada</p>
          </div>
        )}
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle style={{ fontFamily: "'Playfair Display', serif" }}>Nova Automação</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Tipo de gatilho *</Label>
              <Select value={form.tipoGatilho} onValueChange={v => setForm(f => ({ ...f, tipoGatilho: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(tipoLabels).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Nome da automação *</Label>
              <Input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Ex: Lembrete dia anterior" />
            </div>
            {form.tipoGatilho === "aniversario_mes" && (
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Horário de envio (no 1º dia do mês do aniversário)</Label>
                <Input type="time" value={form.horaDisparo} onChange={e => setForm(f => ({ ...f, horaDisparo: e.target.value }))} className="max-w-[140px]" />
              </div>
            )}
            {form.tipoGatilho === "data_fixa" && (
              <div className="grid grid-cols-3 gap-3">
                <div><Label className="text-xs text-muted-foreground mb-1.5 block">Dia *</Label><Input type="number" min="1" max="31" value={form.dataFixaDia} onChange={e => setForm(f => ({ ...f, dataFixaDia: e.target.value }))} placeholder="25" /></div>
                <div><Label className="text-xs text-muted-foreground mb-1.5 block">Mês *</Label><Input type="number" min="1" max="12" value={form.dataFixaMes} onChange={e => setForm(f => ({ ...f, dataFixaMes: e.target.value }))} placeholder="12" /></div>
                <div><Label className="text-xs text-muted-foreground mb-1.5 block">Horário</Label><Input type="time" value={form.dataFixaHora} onChange={e => setForm(f => ({ ...f, dataFixaHora: e.target.value }))} /></div>
              </div>
            )}
            {form.tipoGatilho === "dias_antes_agendamento" && (
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs text-muted-foreground mb-1.5 block">Dias antes</Label><Input type="number" min="1" value={form.diasAntesDepois} onChange={e => setForm(f => ({ ...f, diasAntesDepois: e.target.value }))} /></div>
                <div><Label className="text-xs text-muted-foreground mb-1.5 block">Horário</Label><Input type="time" value={form.horaDisparo} onChange={e => setForm(f => ({ ...f, horaDisparo: e.target.value }))} /></div>
              </div>
            )}
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Mensagem *</Label>
              <textarea
                className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                value={form.corpoMensagem}
                onChange={e => setForm(f => ({ ...f, corpoMensagem: e.target.value }))}
                placeholder="Use {{nome}}, {{servico}}, {{data}}, {{hora}}, {{desconto}} como variáveis..."
              />
              <p className="text-xs text-muted-foreground mt-1">Variáveis disponíveis: {"{{nome}}"}, {"{{servico}}"}, {"{{data}}"}, {"{{hora}}"}, {"{{desconto}}"}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={() => criarMutation.mutate({
              nome: form.nome,
              tipoGatilho: form.tipoGatilho as any,
              corpoMensagem: form.corpoMensagem,
              dataFixaDia: form.dataFixaDia ? parseInt(form.dataFixaDia) : undefined,
              dataFixaMes: form.dataFixaMes ? parseInt(form.dataFixaMes) : undefined,
              dataFixaHora: form.dataFixaHora || undefined,
              horaDisparo: form.horaDisparo || undefined,
              diasAntesDepois: form.diasAntesDepois ? parseInt(form.diasAntesDepois) : undefined,
            })} disabled={!form.nome || !form.corpoMensagem || criarMutation.isPending}>
              {criarMutation.isPending ? "Salvando..." : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
