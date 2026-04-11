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
import { usePermissoes } from "@/hooks/usePermissoes";
import ClienteAutocomplete from "@/components/ClienteAutocomplete";
import { Plus, Trash2, Zap, Package } from "lucide-react";
import ModalAbrirPacote from "@/components/ModalAbrirPacote";

interface ServicoItem {
  servicoId: string;
  profissionalId?: string; // profissional específico para este serviço
  valorUnitario: string;
  pacoteClienteItemId?: number; // vincular sessão de pacote
}

interface Props {
  open: boolean;
  onClose: () => void;
  dataInicial?: string;
  profissionalIdInicial?: number;
}

export default function NovaAgendaModal({ open, onClose, dataInicial, profissionalIdInicial }: Props) {
  const utils = trpc.useUtils();
  const { data: clientes } = trpc.clientes.list.useQuery();
  const { data: profissionais } = trpc.profissionais.listParaAgendamento.useQuery();
  const { data: servicos } = trpc.servicos.list.useQuery();
  const { data: empresa } = trpc.empresa.get.useQuery();
  const { pode, profissionalId: meuProfissionalId, isOwner } = usePermissoes();
  const podeAgendarParaOutros = isOwner || pode('agendamentosVerTodos');

  // Percentual de reserva configurado na empresa (padrão 30%)
  const percentualReserva = parseFloat(String(empresa?.reservaPercentual ?? 30));

  const [form, setForm] = useState({
    clienteId: "",
    profissionalId: profissionalIdInicial ? String(profissionalIdInicial) : (meuProfissionalId && !podeAgendarParaOutros ? String(meuProfissionalId) : ""),
    data: dataInicial ?? new Date().toISOString().split("T")[0],
    horaInicio: "09:00",
    horaFim: "10:00",
    observacoes: "",
    comReserva: true,
    // Padrão: pré-agendado
    status: "pre_agendado" as "pre_agendado" | "agendado" | "confirmado",
  });

  // Lista de serviços selecionados (múltiplos)
  const [servicosSelecionados, setServicosSelecionados] = useState<ServicoItem[]>([
    { servicoId: "", valorUnitario: "" }
  ]);

  // Buscar pacotes ativos do cliente com sessões disponíveis
  const clienteIdNum = form.clienteId ? parseInt(form.clienteId) : null;
  const { data: pacotesAtivos = [] } = trpc.pacotes.listarAtivosComSessoes.useQuery(
    { clienteId: clienteIdNum! },
    { enabled: !!clienteIdNum }
  );

  // Buscar serviços vinculados ao profissional selecionado
  const profissionalIdNum = form.profissionalId ? parseInt(form.profissionalId) : null;
  const { data: servicosVinculados } = trpc.profissionalServicos.getByProfissional.useQuery(
    { profissionalId: profissionalIdNum! },
    { enabled: !!profissionalIdNum }
  );

  // Filtrar serviços disponíveis para o profissional
  const servicosFiltrados = useMemo(() => {
    if (!servicos) return [];
    if (!profissionalIdNum) return servicos.filter(s => s.ativo);
    if (!servicosVinculados || servicosVinculados.length === 0) {
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
      // Reset form
      setServicosSelecionados([{ servicoId: "", valorUnitario: "" }]);
    },
    onError: (err) => toast.error(err.message),
  });

  // Recalcular horaFim com base na soma das durações de todos os serviços
  const recalcularHoraFim = (horaInicio: string, itens: ServicoItem[]) => {
    if (!servicos) return;
    const [h, m] = horaInicio.split(":").map(Number);
    let totalMin = h * 60 + m;
    for (const item of itens) {
      if (item.servicoId) {
        const s = servicos.find(sv => sv.id === parseInt(item.servicoId));
        totalMin += s?.duracaoMinutos ?? 0;
      }
    }
    if (totalMin > h * 60 + m) {
      const hFim = Math.floor(totalMin / 60).toString().padStart(2, "0");
      const mFim = (totalMin % 60).toString().padStart(2, "0");
      setForm(f => ({ ...f, horaFim: `${hFim}:${mFim}` }));
    }
  };

  const handleProfissionalChange = (id: string) => {
    setForm(f => ({ ...f, profissionalId: id }));
    setServicosSelecionados([{ servicoId: "", valorUnitario: "" }]);
  };

  const handleServicoChange = (index: number, servicoId: string) => {
    const servico = servicos?.find(s => s.id === parseInt(servicoId));
    const novaLista = servicosSelecionados.map((item, i) =>
      i === index
        ? { servicoId, valorUnitario: servico ? String(parseFloat(String(servico.valor)).toFixed(2)) : "", pacoteClienteItemId: undefined }
        : item
    );
    setServicosSelecionados(novaLista);
    recalcularHoraFim(form.horaInicio, novaLista);
  };

  const handlePacoteChange = (index: number, pacoteClienteItemId: number | undefined) => {
    setServicosSelecionados(prev => prev.map((item, i) =>
      i === index ? { ...item, pacoteClienteItemId } : item
    ));
  };

  const handleValorChange = (index: number, valor: string) => {
    setServicosSelecionados(prev => prev.map((item, i) => i === index ? { ...item, valorUnitario: valor } : item));
  };

  const adicionarServico = () => {
    setServicosSelecionados(prev => [...prev, { servicoId: "", profissionalId: "", valorUnitario: "" }]);
  };

  const removerServico = (index: number) => {
    if (servicosSelecionados.length === 1) return; // manter pelo menos 1
    const novaLista = servicosSelecionados.filter((_, i) => i !== index);
    setServicosSelecionados(novaLista);
    recalcularHoraFim(form.horaInicio, novaLista);
  };

  // Valor total calculado
  const valorTotal = servicosSelecionados.reduce((acc, item) => {
    return acc + (parseFloat(item.valorUnitario) || 0);
  }, 0);

  // Valor do sinal calculado com percentual real da empresa
  const valorSinal = percentualReserva > 0 ? valorTotal * (percentualReserva / 100) : 0;

  const handleSubmit = () => {
    if (!form.clienteId || !form.profissionalId) {
      toast.error("Preencha cliente e profissional");
      return;
    }
    const servicosValidos = servicosSelecionados.filter(s => s.servicoId);
    if (servicosValidos.length === 0) {
      toast.error("Selecione pelo menos um serviço");
      return;
    }
    const servicoPrincipal = servicosValidos[0];
    criarMutation.mutate({
      clienteId: parseInt(form.clienteId),
      profissionalId: parseInt(servicoPrincipal.profissionalId || form.profissionalId),
      servicoId: parseInt(servicoPrincipal.servicoId),
      servicos: servicosValidos.map(s => ({
        servicoId: parseInt(s.servicoId),
        profissionalId: s.profissionalId ? parseInt(s.profissionalId) : undefined,
        valorUnitario: s.valorUnitario || "0",
        pacoteClienteItemId: s.pacoteClienteItemId,
      })),
      data: form.data,
      horaInicio: form.horaInicio + ":00",
      horaFim: form.horaFim + ":00",
      valorTotal: valorTotal.toFixed(2),
      // Status sempre é o escolhido pelo usuário (pre_agendado por padrão)
      status: form.status,
      observacoes: form.observacoes || undefined,
      comReserva: form.comReserva,
      pacoteClienteItemId: servicoPrincipal.pacoteClienteItemId,
    });
  };

  const temVinculos = !!profissionalIdNum && !!servicosVinculados && servicosVinculados.length > 0;

  // Estado para o modal de abrir pacote
  const [modalPacoteAberto, setModalPacoteAberto] = useState(false);
  const [pacoteServicoIdInicial, setPacoteServicoIdInicial] = useState<number | undefined>();

  // Nome do cliente selecionado para pré-preencher o modal de pacote
  const clienteNomeSelecionado = useMemo(() => {
    if (!clienteIdNum || !clientes) return undefined;
    const c = clientes.find(cl => cl.id === clienteIdNum);
    return c ? c.nome : undefined;
  }, [clienteIdNum, clientes]);

  return (
    <>
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg p-0 overflow-hidden gap-0 flex flex-col max-h-[90vh]">
        <DialogHeader className="px-5 pt-5 pb-3 flex-shrink-0 pr-12">
          <DialogTitle className="font-bold tracking-tight">
            Novo Agendamento
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2 px-5 overflow-y-auto flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Cliente */}
            <div className="sm:col-span-2">
              <Label className="text-xs text-muted-foreground mb-1.5 block">Cliente *</Label>
              <ClienteAutocomplete
                clientes={clientes}
                value={form.clienteId}
                onValueChange={v => setForm(f => ({ ...f, clienteId: v }))}
                placeholder="Buscar cliente por nome ou telefone..."
              />
            </div>

            {/* Profissional */}
            <div className="sm:col-span-2">
              <Label className="text-xs text-muted-foreground mb-1.5 block">Profissional *</Label>
              {podeAgendarParaOutros ? (
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
              ) : (
                <Input
                  value={profissionais?.find(p => p.id === meuProfissionalId)?.nome ?? "Carregando..."}
                  disabled
                  className="bg-muted"
                />
              )}
            </div>

            {/* Pacotes Ativos do Cliente */}
            {clienteIdNum && pacotesAtivos.length > 0 && (
              <div className="sm:col-span-2">
                <Label className="text-xs text-muted-foreground mb-1.5 block">
                  <Package className="w-3 h-3 inline mr-1" />
                  Pacotes Ativos
                </Label>
                <div className="grid grid-cols-1 gap-2">
                  {pacotesAtivos.map(p => {
                    const isSelected = servicosSelecionados.some(s => s.pacoteClienteItemId === p.pacoteClienteItemId);
                    return (
                      <button
                        key={p.pacoteClienteItemId}
                        type="button"
                        className="text-left p-3 rounded-lg border transition-all"
                        style={{
                          borderColor: isSelected ? "oklch(55% 0.22 264)" : "oklch(90% 0.012 250)",
                          background: isSelected ? "oklch(55% 0.22 264 / 6%)" : "oklch(98% 0.006 250)",
                        }}
                        onClick={() => {
                          // Auto-fill service and link pacoteClienteItemId
                          const servico = servicos?.find(s => s.id === p.servicoId);
                          if (servico) {
                            setServicosSelecionados([{
                              servicoId: String(p.servicoId),
                              valorUnitario: String(parseFloat(String(servico.valor)).toFixed(2)),
                              pacoteClienteItemId: p.pacoteClienteItemId,
                            }]);
                            recalcularHoraFim(form.horaInicio, [{ servicoId: String(p.servicoId), valorUnitario: "0" }]);
                          }
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-semibold text-foreground">{p.pacoteNome}</p>
                            <p className="text-xs text-muted-foreground">{p.servicoNome}</p>
                          </div>
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                            style={{ background: "oklch(55% 0.22 264 / 10%)", color: "oklch(45% 0.18 264)" }}>
                            {p.sessoesDisponiveis} sessão(ões)
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Serviços (múltiplos) */}
            <div className="sm:col-span-2">
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs text-muted-foreground">
                  Serviços *
                  {temVinculos && (
                    <span className="ml-1.5 text-[10px] text-primary font-normal">
                      ({servicosFiltrados.length} disponível{servicosFiltrados.length !== 1 ? "is" : ""})
                    </span>
                  )}
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={adicionarServico}
                  className="h-7 text-xs gap-1"
                >
                  <Plus className="h-3 w-3" />
                  Adicionar serviço
                </Button>
              </div>

              <div className="space-y-2">
                {servicosSelecionados.map((item, index) => (
                  <div key={index} className="rounded-lg border border-border/50 bg-muted/20 p-2.5 space-y-2">
                    {/* Linha 1: Select do serviço */}
                    <Select
                      value={item.servicoId}
                      onValueChange={(v) => handleServicoChange(index, v)}
                      disabled={!form.profissionalId && servicosFiltrados.length === 0}
                    >
                      <SelectTrigger className="h-9 w-full">
                        <SelectValue placeholder={
                          !form.profissionalId
                            ? "Selecione o profissional primeiro"
                            : "Selecionar serviço"
                        } />
                      </SelectTrigger>
                      <SelectContent>
                        {servicosFiltrados.map(s => (
                          <SelectItem key={s.id} value={String(s.id)}>
                            {s.nome}
                            {s.duracaoMinutos ? ` · ${s.duracaoMinutos}min` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {/* Linha 1.5: Vincular sessão de pacote ou abrir novo */}
                    {item.servicoId && (() => {
                      const servicoIdNum = parseInt(item.servicoId);
                      const pacotesDoServico = pacotesAtivos.filter(p => p.servicoId === servicoIdNum);
                      if (pacotesDoServico.length === 0) {
                        if (!clienteIdNum) return null;
                        return (
                          <div className="flex items-center gap-2 px-1">
                            <button
                              type="button"
                              onClick={() => { setPacoteServicoIdInicial(servicoIdNum); setModalPacoteAberto(true); }}
                              className="text-[11px] text-violet-600 hover:text-violet-800 font-medium flex items-center gap-1 hover:underline underline-offset-2"
                            >
                              <Package className="w-3 h-3" />
                              Abrir pacote para este serviço
                            </button>
                          </div>
                        );
                      }
                      return (
                        <div className="flex items-center gap-2 px-1">
                          <span className="text-[11px] text-violet-600 font-medium whitespace-nowrap">📦 Usar pacote:</span>
                          <Select
                            value={item.pacoteClienteItemId ? String(item.pacoteClienteItemId) : "nenhum"}
                            onValueChange={v => handlePacoteChange(index, v === "nenhum" ? undefined : parseInt(v))}
                          >
                            <SelectTrigger className="h-7 text-xs flex-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="nenhum">Sem pacote</SelectItem>
                              {pacotesDoServico.map(p => (
                                <SelectItem key={p.pacoteClienteItemId} value={String(p.pacoteClienteItemId)}>
                                  {p.pacoteNome} — {p.sessoesDisponiveis} sessões restantes
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      );
                    })()}
                    {/* Linha 2: Profissional específico para este serviço */}
                    {servicosSelecionados.length > 1 && (
                      <Select
                        value={item.profissionalId || ""}
                        onValueChange={(v) => setServicosSelecionados(prev =>
                          prev.map((it, i) => i === index ? { ...it, profissionalId: v } : it)
                        )}
                      >
                        <SelectTrigger className="h-8 w-full text-xs">
                          <SelectValue placeholder="Profissional (padrão: principal)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Profissional principal</SelectItem>
                          {profissionais?.map(p => (
                            <SelectItem key={p.id} value={String(p.id)}>
                              {p.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    {/* Linha 3: Valor + botão remover */}
                    <div className="flex gap-2 items-center">
                      <div className="relative flex-1">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R$</span>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.valorUnitario}
                          onChange={e => handleValorChange(index, e.target.value)}
                          className="pl-8"
                          placeholder="0,00"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removerServico(index)}
                        disabled={servicosSelecionados.length === 1}
                        className="h-9 w-9 text-muted-foreground hover:text-destructive shrink-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Data */}
            <div className="sm:col-span-2">
              <Label className="text-xs text-muted-foreground mb-1.5 block">Data *</Label>
              <Input
                type="date"
                value={form.data}
                onChange={e => setForm(f => ({ ...f, data: e.target.value }))}
              />
            </div>

            {/* Horários — linha própria, sempre 2 colunas */}
            <div className="sm:col-span-2 grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Início</Label>
                <Input
                  type="time"
                  value={form.horaInicio}
                  onChange={e => {
                    setForm(f => ({ ...f, horaInicio: e.target.value }));
                    recalcularHoraFim(e.target.value, servicosSelecionados);
                  }}
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Fim</Label>
                <Input
                  type="time"
                  value={form.horaFim}
                  onChange={e => setForm(f => ({ ...f, horaFim: e.target.value }))}
                />
              </div>
            </div>

            {/* Observações */}
            <div className="sm:col-span-2">
              <Label className="text-xs text-muted-foreground mb-1.5 block">Observações</Label>
              <Textarea
                placeholder="Observações para o agendamento..."
                value={form.observacoes}
                onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
                rows={2}
              />
            </div>

            {/* Status inicial */}
            <div className="sm:col-span-2">
              <Label className="text-xs text-muted-foreground mb-1.5 block">Status inicial</Label>
              <Select
                value={form.status}
                onValueChange={v => setForm(f => ({ ...f, status: v as any }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pre_agendado">Pré-agendado</SelectItem>
                  <SelectItem value="agendado">Agendado</SelectItem>
                  <SelectItem value="confirmado">Confirmado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Reserva (sinal) */}
            <div className="sm:col-span-2 flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-foreground">Solicitar sinal / reserva</p>
                <p className="text-xs text-muted-foreground">
                  Envia mensagem solicitando pagamento antecipado de{" "}
                  <span className="font-semibold text-amber-600">{percentualReserva}%</span>
                  {valorTotal > 0 && valorSinal > 0 && (
                    <> = <span className="font-semibold text-amber-600">R$ {valorSinal.toFixed(2).replace(".", ",")}</span></>
                  )}
                </p>
              </div>
              <Switch
                checked={form.comReserva}
                onCheckedChange={v => setForm(f => ({ ...f, comReserva: v }))}
              />
            </div>

            {/* Resumo do valor total */}
            {valorTotal > 0 && (
              <div className="sm:col-span-2 p-3 bg-secondary/50 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {servicosSelecionados.filter(s => s.servicoId).length > 1
                      ? `Total (${servicosSelecionados.filter(s => s.servicoId).length} serviços)`
                      : "Valor do serviço"}
                  </span>
                  <span className="text-base font-bold text-foreground">
                    R$ {valorTotal.toFixed(2).replace(".", ",")}
                  </span>
                </div>
                {form.comReserva && valorSinal > 0 && (
                  <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-border/40">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Zap className="h-3 w-3 text-amber-500" />
                      Sinal ({percentualReserva}%) — variável <code className="text-[10px] bg-muted px-1 rounded">{"{{valor_reserva}}"}</code>
                    </span>
                    <span className="text-sm font-semibold text-amber-600">
                      R$ {valorSinal.toFixed(2).replace(".", ",")}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Aviso de automação */}
            {form.comReserva && (
              <div className="sm:col-span-2 flex items-start gap-2 p-3 rounded-lg bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800/40">
                <Zap className="h-4 w-4 text-violet-500 mt-0.5 shrink-0" />
                <p className="text-xs text-violet-700 dark:text-violet-300">
                  A automação <strong>"Pré-agendamento criado"</strong> será disparada ao salvar, enviando a mensagem de sinal configurada.
                </p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="px-5 py-4 flex-shrink-0 border-t" style={{ borderColor: "oklch(91% 0.010 250)" }}>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={criarMutation.isPending}>
            {criarMutation.isPending ? "Criando..." : "Criar Agendamento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Modal de abrir pacote integrado */}
    {modalPacoteAberto && (
      <ModalAbrirPacote
        open={modalPacoteAberto}
        onClose={() => { setModalPacoteAberto(false); setPacoteServicoIdInicial(undefined); }}
        clienteIdInicial={clienteIdNum ?? undefined}
        clienteNomeInicial={clienteNomeSelecionado}
        servicoIdInicial={pacoteServicoIdInicial}
        onSuccess={() => {
          // Invalidar pacotes ativos para que o select seja atualizado automaticamente
          utils.pacotes.listarAtivosComSessoes.invalidate();
        }}
      />
    )}
    </>
  );
}
