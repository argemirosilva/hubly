import { trpc } from "@/lib/trpc";
import { useState, useMemo, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Trash2, Save, Loader2, Edit3, AlertTriangle } from "lucide-react";
import ClienteAutocomplete from "@/components/ClienteAutocomplete";

interface ServicoItem {
  profissionalId: string;
  servicoId: string;
  valorUnitario: string;
  horaInicio?: string;
  horaFim?: string;
}

interface Props {
  agendamentoId: number;
  open: boolean;
  onClose: () => void;
}

const toMin = (h: string) => {
  const [hh, mm] = h.split(":").map(Number);
  return hh * 60 + (mm || 0);
};
const fromMin = (m: number) => {
  const h = Math.floor(m / 60) % 24;
  const min = m % 60;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
};

export default function EditarAgendamentoModal({ agendamentoId, open, onClose }: Props) {
  const utils = trpc.useUtils();

  const { data: ag, isLoading: loadingAg } = trpc.agendamentos.getById.useQuery(
    { id: agendamentoId },
    { enabled: open && !!agendamentoId }
  );
  const { data: itens } = trpc.agendamentos.getItens.useQuery(
    { agendamentoId },
    { enabled: open && !!agendamentoId }
  );
  const { data: clientes } = trpc.clientes.list.useQuery();
  const { data: profissionais } = trpc.profissionais.listParaAgendamento.useQuery();
  const { data: servicos } = trpc.servicos.list.useQuery();
  const { data: todosVinculos = [] } = trpc.profissionalServicos.getAll.useQuery(undefined, {
    enabled: !!profissionais && profissionais.length > 0,
  });

  const [form, setForm] = useState({
    clienteId: "",
    data: "",
    horaInicio: "09:00",
    horaFim: "10:00",
    observacoes: "",
  });
  const [servicosSelecionados, setServicosSelecionados] = useState<ServicoItem[]>([
    { profissionalId: "", servicoId: "", valorUnitario: "" },
  ]);
  const [inicializado, setInicializado] = useState(false);

  // Pré-preencher form quando dados carregarem
  useEffect(() => {
    if (!ag || !open) { setInicializado(false); return; }
    if (inicializado) return;

    setForm({
      clienteId: String(ag.clienteId ?? ""),
      data: ag.data ?? "",
      horaInicio: (ag.horaInicio ?? "09:00").slice(0, 5),
      horaFim: (ag.horaFim ?? "10:00").slice(0, 5),
      observacoes: ag.observacoes ?? "",
    });

    // Pré-preencher serviços a partir dos itens
    if (itens && itens.length > 0) {
      setServicosSelecionados(itens.map((item: any) => ({
        profissionalId: item.profissionalId ? String(item.profissionalId) : String(ag.profissionalId ?? ""),
        servicoId: String(item.servicoId),
        valorUnitario: parseFloat(String(item.valorUnitario ?? 0)).toFixed(2),
        horaInicio: item.horaInicio ? String(item.horaInicio).slice(0, 5) : undefined,
        horaFim: item.horaFim ? String(item.horaFim).slice(0, 5) : undefined,
      })));
    } else if (ag.servicoId) {
      setServicosSelecionados([{
        profissionalId: String(ag.profissionalId ?? ""),
        servicoId: String(ag.servicoId),
        valorUnitario: parseFloat(String(ag.valorTotal ?? 0)).toFixed(2),
        horaInicio: (ag.horaInicio ?? "").slice(0, 5),
        horaFim: (ag.horaFim ?? "").slice(0, 5),
      }]);
    }
    setInicializado(true);
  }, [ag, itens, open, inicializado]);

  // Resetar ao fechar
  useEffect(() => {
    if (!open) setInicializado(false);
  }, [open]);

  // Mapa de vínculos profissional → serviços
  const vinculosMap = useMemo(() => {
    const map = new Map<number, Set<number>>();
    (todosVinculos as Array<{ profissionalId: number; servicoId: number }>).forEach((v) => {
      if (!map.has(v.profissionalId)) map.set(v.profissionalId, new Set());
      map.get(v.profissionalId)!.add(v.servicoId);
    });
    return map;
  }, [todosVinculos]);

  const getServicosFiltrados = (profissionalId: string) => {
    if (!profissionalId || !servicos) return servicos?.filter((s: any) => s.ativo) ?? [];
    const pid = parseInt(profissionalId);
    const vinculados = vinculosMap.get(pid);
    if (!vinculados || vinculados.size === 0) return servicos?.filter((s: any) => s.ativo) ?? [];
    return servicos.filter((s: any) => s.ativo && vinculados.has(s.id));
  };

  const recalcularHorarios = (horaInicio: string, itens: ServicoItem[]) => {
    let cursor = toMin(horaInicio);
    const novosItens = itens.map((item) => {
      if (!item.servicoId) return item;
      const s = servicos?.find((sv: any) => sv.id === parseInt(item.servicoId));
      const dur = (s as any)?.duracaoMinutos ?? 60;
      const inicio = fromMin(cursor);
      const fim = fromMin(cursor + dur);
      cursor += dur;
      return { ...item, horaInicio: inicio, horaFim: fim };
    });
    setServicosSelecionados(novosItens);
    const ultimo = [...novosItens].reverse().find(i => i.servicoId);
    if (ultimo?.horaFim) setForm(f => ({ ...f, horaFim: ultimo.horaFim! }));
    return novosItens;
  };

  const handleProfissionalChange = (index: number, profissionalId: string) => {
    const novaLista = servicosSelecionados.map((item, i) =>
      i === index ? { ...item, profissionalId } : item
    );
    setServicosSelecionados(novaLista);
  };

  const handleServicoChange = (index: number, servicoId: string) => {
    const s = servicos?.find((sv: any) => sv.id === parseInt(servicoId));
    const novaLista = servicosSelecionados.map((item, i) =>
      i === index
        ? { ...item, servicoId, valorUnitario: s ? String(parseFloat(String(s.valor)).toFixed(2)) : "" }
        : item
    );
    recalcularHorarios(form.horaInicio, novaLista);
  };

  const adicionarServico = () => {
    setServicosSelecionados(prev => [...prev, { profissionalId: "", servicoId: "", valorUnitario: "" }]);
  };

  const removerServico = (index: number) => {
    if (servicosSelecionados.length === 1) return;
    const novaLista = servicosSelecionados.filter((_, i) => i !== index);
    recalcularHorarios(form.horaInicio, novaLista);
  };

  const valorTotal = servicosSelecionados.reduce((acc, item) => acc + (parseFloat(item.valorUnitario) || 0), 0);

  // Mutation para atualizar dados principais (cliente, data, hora, observações)
  const updateMutation = trpc.agendamentos.update.useMutation({
    onError: (err: any) => toast.error(err.message),
  });

  // Mutation para atualizar serviços
  const updateServicosMutation = trpc.agendamentos.updateServicos.useMutation({
    onError: (err: any) => toast.error(err.message),
  });

  // Mutation para atualizar clienteId (via update genérico)
  const handleSalvar = async () => {
    if (!form.clienteId) { toast.error("Selecione o cliente"); return; }
    const servicosValidos = servicosSelecionados.filter(s => s.servicoId);
    if (servicosValidos.length === 0) { toast.error("Selecione pelo menos um serviço"); return; }

    try {
      // 1. Atualizar dados principais
      await updateMutation.mutateAsync({
        id: agendamentoId,
        data: form.data,
        horaInicio: form.horaInicio + ":00",
        horaFim: form.horaFim + ":00",
        observacoes: form.observacoes,
      } as any);

      // 2. Atualizar clienteId separadamente se mudou
      if (ag && String(ag.clienteId) !== form.clienteId) {
        await updateMutation.mutateAsync({ id: agendamentoId, clienteId: parseInt(form.clienteId) } as any);
      }

      // 3. Atualizar serviços
      await updateServicosMutation.mutateAsync({
        agendamentoId,
        servicoIdPrincipal: parseInt(servicosValidos[0].servicoId),
        profissionalIdPrincipal: servicosValidos[0].profissionalId ? parseInt(servicosValidos[0].profissionalId) : undefined,
        servicos: servicosValidos.map(s => ({
          servicoId: parseInt(s.servicoId),
          profissionalId: s.profissionalId ? parseInt(s.profissionalId) : undefined,
          horaInicio: s.horaInicio ?? undefined,
          horaFim: s.horaFim ?? undefined,
          valorUnitario: s.valorUnitario || "0",
        })),
        valorTotal: valorTotal.toFixed(2),
        horaFim: form.horaFim + ":00",
      });

      toast.success("Agendamento atualizado com sucesso!");
      utils.agendamentos.getById.invalidate({ id: agendamentoId });
      utils.agendamentos.getItens.invalidate({ agendamentoId });
      utils.agendamentos.list.invalidate();
      onClose();
    } catch {
      // erros já tratados nas mutations
    }
  };

  const isPending = updateMutation.isPending || updateServicosMutation.isPending;

  if (loadingAg || !ag) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg p-0 overflow-hidden gap-0 max-h-[95dvh] sm:max-h-[92vh] flex flex-col w-[calc(100%-1rem)] sm:w-full">
        {/* Header */}
        <DialogHeader className="px-5 py-4 border-b">
          <DialogTitle className="flex items-center gap-2 text-sm font-bold">
            <Edit3 className="w-4 h-4 text-primary" />
            Editar Agendamento
          </DialogTitle>
        </DialogHeader>

        {/* Corpo */}
        <div className="p-5 space-y-5 overflow-y-auto flex-1">

          {/* Aviso: sem profissional atribuído */}
          {servicosSelecionados.every(s => !s.profissionalId) && (
            <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3">
              <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-amber-700">Sem profissional atribuído</p>
                <p className="text-[11px] text-amber-600 mt-0.5">Selecione um profissional em pelo menos um serviço para garantir a organização da agenda.</p>
              </div>
            </div>
          )}

          {/* Cliente */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Cliente *</Label>
            <ClienteAutocomplete
              clientes={clientes ?? []}
              value={form.clienteId}
              onValueChange={(id) => setForm(f => ({ ...f, clienteId: id }))}
            />
          </div>

          {/* Data e Hora */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Data *</Label>
              <Input
                type="date"
                value={form.data}
                onChange={e => setForm(f => ({ ...f, data: e.target.value }))}
                className="h-9 text-sm w-full"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Início *</Label>
                <Input
                  type="time"
                  value={form.horaInicio}
                  onChange={e => {
                    setForm(f => ({ ...f, horaInicio: e.target.value }));
                    recalcularHorarios(e.target.value, servicosSelecionados);
                  }}
                  className="h-9 text-sm w-full"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Fim</Label>
                <Input
                  type="time"
                  value={form.horaFim}
                  onChange={e => setForm(f => ({ ...f, horaFim: e.target.value }))}
                  className="h-9 text-sm w-full"
                />
              </div>
            </div>
          </div>

          {/* Serviços */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">Serviços *</Label>
              <button
                onClick={adicionarServico}
                className="flex items-center gap-1 text-[11px] text-primary hover:underline"
              >
                <Plus className="w-3 h-3" /> Adicionar serviço
              </button>
            </div>

            {servicosSelecionados.map((item, index) => {
              const servicosFiltrados = getServicosFiltrados(item.profissionalId);
              return (
                <div key={index} className="rounded-xl border border-border/50 bg-muted/20 p-3 space-y-2">
                  {/* Profissional */}
                  <Select
                    value={item.profissionalId || "__none__"}
                    onValueChange={(v) => handleProfissionalChange(index, v === "__none__" ? "" : v)}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Selecionar profissional" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__" disabled>Selecionar profissional</SelectItem>
                      {profissionais?.filter((p: any) => p.ativo).map((p: any) => (
                        <SelectItem key={p.id} value={String(p.id)}>{p.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Serviço */}
                  <Select
                    value={item.servicoId || "__none__"}
                    onValueChange={(v) => handleServicoChange(index, v === "__none__" ? "" : v)}
                  >
                    <SelectTrigger className="h-9 text-sm w-full">
                      <SelectValue placeholder="Serviço" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__" disabled>Selecionar serviço</SelectItem>
                      {servicosFiltrados.map((s: any) => (
                        <SelectItem key={s.id} value={String(s.id)}>{s.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Valor + Remover */}
                  <div className="flex gap-2 items-center">
                    <div className="relative flex-1">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R$</span>
                      <Input
                        type="number" step="0.01" min="0"
                        value={item.valorUnitario}
                        onChange={e => setServicosSelecionados(prev => prev.map((it, i) =>
                          i === index ? { ...it, valorUnitario: e.target.value } : it
                        ))}
                        className="pl-8 h-9 text-sm"
                      />
                    </div>
                    <button
                      onClick={() => removerServico(index)}
                      disabled={servicosSelecionados.length === 1}
                      className="text-muted-foreground hover:text-destructive disabled:opacity-30 flex-shrink-0 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Horário por item */}
                  {item.servicoId && (
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <Label className="text-[10px] text-muted-foreground mb-1 block">Início do serviço</Label>
                        <Input
                          type="time"
                          value={item.horaInicio ?? ""}
                          onChange={e => setServicosSelecionados(prev => prev.map((it, i) =>
                            i === index ? { ...it, horaInicio: e.target.value } : it
                          ))}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="flex-1">
                        <Label className="text-[10px] text-muted-foreground mb-1 block">Fim do serviço</Label>
                        <Input
                          type="time"
                          value={item.horaFim ?? ""}
                          onChange={e => setServicosSelecionados(prev => prev.map((it, i) =>
                            i === index ? { ...it, horaFim: e.target.value } : it
                          ))}
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Total */}
            <div className="flex justify-between items-center pt-1 px-1">
              <span className="text-xs text-muted-foreground">Total</span>
              <span className="text-sm font-bold">
                {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valorTotal)}
              </span>
            </div>
          </div>

          {/* Observações */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Observações</Label>
            <Textarea
              value={form.observacoes}
              onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
              placeholder="Observações sobre o agendamento..."
              className="text-sm resize-none h-20"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="border-t px-5 py-3.5 flex items-center justify-between gap-3 flex-shrink-0"
          style={{ background: "oklch(97% 0.006 250)" }}>
          <Button variant="outline" onClick={onClose} className="h-9 text-sm">
            Cancelar
          </Button>
          <Button onClick={handleSalvar} disabled={isPending} className="h-9 text-sm gap-2">
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isPending ? "Salvando..." : "Salvar alterações"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
