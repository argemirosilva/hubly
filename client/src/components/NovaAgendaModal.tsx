import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
  dataInicial?: string;
  profissionalIdInicial?: number;
}

export default function NovaAgendaModal({ open, onClose, dataInicial, profissionalIdInicial }: Props) {
  const utils = trpc.useUtils();
  const { data: clientes } = trpc.clientes.list.useQuery();
  const { data: profissionais } = trpc.profissionais.list.useQuery();
  const { data: servicos } = trpc.servicos.list.useQuery();

  const [form, setForm] = useState({
    clienteId: "",
    profissionalId: profissionalIdInicial ? String(profissionalIdInicial) : "",
    servicoId: "",
    data: dataInicial ?? new Date().toISOString().split("T")[0],
    horaInicio: "09:00",
    horaFim: "10:00",
    observacoes: "",
    comReserva: false,
    status: "agendado" as const,
  });

  // Buscar serviços vinculados ao profissional selecionado
  const profissionalIdNum = form.profissionalId ? parseInt(form.profissionalId) : null;
  const { data: servicosVinculados } = trpc.profissionalServicos.getByProfissional.useQuery(
    { profissionalId: profissionalIdNum! },
    { enabled: !!profissionalIdNum }
  );

  // Filtrar serviços: se o profissional tem vínculos, mostrar apenas esses; senão, mostrar todos
  const servicosFiltrados = useMemo(() => {
    if (!servicos) return [];
    if (!profissionalIdNum) return servicos.filter(s => s.ativo);
    if (!servicosVinculados || servicosVinculados.length === 0) {
      // Profissional sem vínculos configurados → mostrar todos os serviços ativos
      return servicos.filter(s => s.ativo);
    }
    const idsVinculados = new Set(servicosVinculados.map(v => v.servicoId));
    return servicos.filter(s => s.ativo && idsVinculados.has(s.id));
  }, [servicos, servicosVinculados, profissionalIdNum]);

  const criarMutation = trpc.agendamentos.create.useMutation({
    onSuccess: () => {
      toast.success("Agendamento criado com sucesso!");
      utils.agendamentos.list.invalidate();
      utils.financeiro.dashboard.invalidate();
      onClose();
    },
    onError: (err) => toast.error(err.message),
  });

  const servicoSelecionado = servicos?.find(s => s.id === parseInt(form.servicoId));

  const handleProfissionalChange = (id: string) => {
    // Ao trocar de profissional, limpar o serviço selecionado
    setForm(f => ({ ...f, profissionalId: id, servicoId: "" }));
  };

  const handleServicoChange = (id: string) => {
    const servico = servicos?.find(s => s.id === parseInt(id));
    if (servico) {
      const [h, m] = form.horaInicio.split(":").map(Number);
      const totalMin = h * 60 + m + (servico.duracaoMinutos ?? 60);
      const hFim = Math.floor(totalMin / 60).toString().padStart(2, "0");
      const mFim = (totalMin % 60).toString().padStart(2, "0");
      setForm(f => ({ ...f, servicoId: id, horaFim: `${hFim}:${mFim}` }));
    } else {
      setForm(f => ({ ...f, servicoId: id }));
    }
  };

  const handleSubmit = () => {
    if (!form.clienteId || !form.profissionalId || !form.servicoId) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    criarMutation.mutate({
      clienteId: parseInt(form.clienteId),
      profissionalId: parseInt(form.profissionalId),
      servicoId: parseInt(form.servicoId),
      data: form.data,
      horaInicio: form.horaInicio + ":00",
      horaFim: form.horaFim + ":00",
      valorTotal: servicoSelecionado ? String(servicoSelecionado.valor) : "0",
      status: form.comReserva ? "aguardando_reserva" : "agendado",
      observacoes: form.observacoes || undefined,
      comReserva: form.comReserva,
    });
  };

  const temVinculos = !!profissionalIdNum && !!servicosVinculados && servicosVinculados.length > 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-bold tracking-tight">
            Novo Agendamento
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Label className="text-xs text-muted-foreground mb-1.5 block">Cliente *</Label>
              <Select value={form.clienteId} onValueChange={v => setForm(f => ({ ...f, clienteId: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clientes?.map(c => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Profissional *</Label>
              <Select value={form.profissionalId} onValueChange={handleProfissionalChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar" />
                </SelectTrigger>
                <SelectContent>
                  {profissionais?.filter(p => p.ativo).map(p => (
                    <SelectItem key={p.id} value={String(p.id)}>{p.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">
                Serviço *
                {temVinculos && (
                  <span className="ml-1.5 text-[10px] text-primary font-normal">
                    ({servicosFiltrados.length} disponível{servicosFiltrados.length !== 1 ? "is" : ""})
                  </span>
                )}
              </Label>
              <Select
                value={form.servicoId}
                onValueChange={handleServicoChange}
                disabled={!form.profissionalId && servicosFiltrados.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder={
                    !form.profissionalId
                      ? "Selecione o profissional primeiro"
                      : servicosFiltrados.length === 0
                      ? "Nenhum serviço disponível"
                      : "Selecionar serviço"
                  } />
                </SelectTrigger>
                <SelectContent>
                  {servicosFiltrados.map(s => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.nome} — R$ {parseFloat(String(s.valor)).toFixed(2)}
                      {s.duracaoMinutos ? ` · ${s.duracaoMinutos}min` : ""}
                    </SelectItem>
                  ))}
                  {servicosFiltrados.length === 0 && form.profissionalId && (
                    <div className="px-3 py-2 text-xs text-muted-foreground">
                      Nenhum serviço vinculado a este profissional.
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Data *</Label>
              <Input type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Início</Label>
                <Input type="time" value={form.horaInicio} onChange={e => setForm(f => ({ ...f, horaInicio: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Fim</Label>
                <Input type="time" value={form.horaFim} onChange={e => setForm(f => ({ ...f, horaFim: e.target.value }))} />
              </div>
            </div>

            <div className="sm:col-span-2">
              <Label className="text-xs text-muted-foreground mb-1.5 block">Observações</Label>
              <Textarea
                placeholder="Observações para o agendamento..."
                value={form.observacoes}
                onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
                rows={2}
              />
            </div>

            <div className="sm:col-span-2 flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-foreground">Exigir reserva (pré-agendamento)</p>
                <p className="text-xs text-muted-foreground">Envia mensagem de reserva e aguarda pagamento</p>
              </div>
              <Switch
                checked={form.comReserva}
                onCheckedChange={v => setForm(f => ({ ...f, comReserva: v }))}
              />
            </div>

            {servicoSelecionado && (
              <div className="sm:col-span-2 p-3 bg-secondary/50 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Valor do serviço</span>
                  <span className="text-base font-bold text-foreground">
                    R$ {parseFloat(String(servicoSelecionado.valor)).toFixed(2)}
                  </span>
                </div>
                {form.comReserva && (
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-muted-foreground">Reserva (30%)</span>
                    <span className="text-sm font-medium text-amber-600">
                      R$ {(parseFloat(String(servicoSelecionado.valor)) * 0.3).toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={criarMutation.isPending}>
            {criarMutation.isPending ? "Criando..." : "Criar Agendamento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
