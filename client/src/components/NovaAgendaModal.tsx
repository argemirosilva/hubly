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
import { getLocalDateString } from "@/lib/utils";
import ClienteAutocomplete from "@/components/ClienteAutocomplete";
import { Plus, Trash2, Zap, Package, Users, UserPlus, X, Star, AlertTriangle } from "lucide-react";
import ModalAbrirPacote from "@/components/ModalAbrirPacote";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ServicoItem {
  profissionalId: string;  // opcional: pode ser deixado em branco
  servicoId: string;
  valorUnitario: string;
  pacoteClienteItemId?: number;
  horaInicio?: string; // ex: "14:00" — calculado automaticamente ou editado manualmente
  horaFim?: string;   // ex: "15:00"
}

interface Props {
  open: boolean;
  onClose: () => void;
  dataInicial?: string;
  horaInicial?: string; // ex: "09:30" — horário do slot selecionado no calendário
  profissionalIdInicial?: number;
  /** Quando true, renderiza o conteúdo diretamente sem wrapper Dialog (usado na página mobile) */
  inlinePage?: boolean;
}

export default function NovaAgendaModal({ open, onClose, dataInicial, horaInicial, profissionalIdInicial, inlinePage }: Props) {
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
    data: dataInicial ?? getLocalDateString(),
    horaInicio: horaInicial ?? "09:00",
    horaFim: "10:00",
    observacoes: "",
    comReserva: true,
    status: "pre_agendado" as "pre_agendado" | "agendado" | "confirmado",
    usarDataLimitePersonalizada: false,
    reservaDataLimitePersonalizada: "", // ISO datetime string
    taxaAdicional: "",
    nomeTaxaAdicional: "",
  });

  // Profissional padrão para pré-preencher o primeiro card
  const profissionalPadrao = profissionalIdInicial
    ? String(profissionalIdInicial)
    : (meuProfissionalId && !podeAgendarParaOutros ? String(meuProfissionalId) : "");

  // Lista de itens: cada um tem profissional + serviço
  const [servicosSelecionados, setServicosSelecionados] = useState<ServicoItem[]>([
    { profissionalId: profissionalPadrao, servicoId: "", valorUnitario: "" }
  ]);

  // Buscar pacotes ativos do cliente com sessões disponíveis
  const clienteIdNum = form.clienteId ? parseInt(form.clienteId) : null;
  const { data: pacotesAtivos = [] } = trpc.pacotes.listarAtivosComSessoes.useQuery(
    { clienteId: clienteIdNum! },
    { enabled: !!clienteIdNum }
  );

  // Buscar vínculos de serviços por profissional (cache por profissionalId)
  // Usamos um mapa: profissionalId → Set<servicoId>
  const profissionaisIds = useMemo(() => {
    const ids = new Set<number>();
    servicosSelecionados.forEach(item => {
      if (item.profissionalId) ids.add(parseInt(item.profissionalId));
    });
    return Array.from(ids);
  }, [servicosSelecionados]);

  // Busca vínculos para todos os profissionais usados nos cards
  // Como o tRPC não suporta batch nativo aqui, usamos um endpoint por profissional
  // Para simplificar: buscamos todos os vínculos de todos os profissionais da empresa
  const { data: todosVinculos = [] } = trpc.profissionalServicos.getAll.useQuery(undefined, {
    enabled: !!profissionais && profissionais.length > 0,
  });

  // Mapa: profissionalId → Set<servicoId>
  const vinculosMap = useMemo(() => {
    const map = new Map<number, Set<number>>();
    (todosVinculos as Array<{ profissionalId: number; servicoId: number }>).forEach((v) => {
      if (!map.has(v.profissionalId)) map.set(v.profissionalId, new Set());
      map.get(v.profissionalId)!.add(v.servicoId);
    });
    return map;
  }, [todosVinculos]);

  // Retorna serviços filtrados para um profissional específico
  const getServicosFiltrados = (profissionalId: string) => {
    if (!servicos) return [];
    if (!profissionalId) return servicos.filter((s: any) => s.ativo);
    const profId = parseInt(profissionalId);
    const vinculados = vinculosMap.get(profId);
    if (!vinculados || vinculados.size === 0) return servicos.filter((s: any) => s.ativo);
    return servicos.filter((s: any) => s.ativo && vinculados.has(s.id));
  };

  // Profissional principal (primeiro serviço selecionado com profissional)
  const profissionalPrincipalId = useMemo(() => {
    const primeiro = servicosSelecionados.find(s => s.profissionalId);
    return primeiro?.profissionalId ? parseInt(primeiro.profissionalId) : null;
  }, [servicosSelecionados]);

  // Verificar conflito de horário em tempo real
  const { data: conflito } = trpc.agendamentos.verificarConflito.useQuery(
    {
      profissionalId: profissionalPrincipalId!,
      data: form.data,
      horaInicio: form.horaInicio,
      horaFim: form.horaFim,
    },
    {
      enabled: !!profissionalPrincipalId && !!form.data && !!form.horaInicio && !!form.horaFim && form.horaFim > form.horaInicio,
    }
  );

  const adicionarPessoaMutation = trpc.reservaPessoas.adicionar.useMutation();

  const criarMutation = trpc.agendamentos.create.useMutation({
    onSuccess: async (novoAgendamento) => {
      // Salvar pessoas adicionais se houver
      if (pessoasAdicionais.length > 0 && novoAgendamento?.id) {
        await Promise.allSettled(
          pessoasAdicionais.map(p =>
            adicionarPessoaMutation.mutateAsync({
              agendamentoId: novoAgendamento.id,
              clienteId: p.clienteId,
              isPrincipal: p.isPrincipal,
            })
          )
        );
      }
      toast.success("Agendamento criado com sucesso!");
      utils.agendamentos.list.invalidate();
      utils.financeiro.dashboard.invalidate();
      onClose();
      setServicosSelecionados([{ profissionalId: profissionalPadrao, servicoId: "", valorUnitario: "" }]);
      setPessoasAdicionais([]);
    },
    onError: (err) => toast.error(err.message),
  });

  // Converte "HH:MM" em minutos desde meia-noite
  const toMin = (h: string) => { const [hh, mm] = h.split(":").map(Number); return hh * 60 + mm; };
  const fromMin = (m: number) => `${Math.floor(m / 60).toString().padStart(2, "0")}:${(m % 60).toString().padStart(2, "0")}`;

  // Recalcular horaInicio/horaFim de cada item sequencialmente e horaFim do agendamento
  const recalcularHorarios = (horaInicioAg: string, itens: ServicoItem[], setItens = true) => {
    if (!servicos) return;
    let cursor = toMin(horaInicioAg);
    const novosItens = itens.map(item => {
      const s = servicos.find(sv => sv.id === parseInt(item.servicoId));
      const dur = s?.duracaoMinutos ?? 0;
      const inicio = fromMin(cursor);
      const fim = fromMin(cursor + dur);
      cursor += dur;
      return { ...item, horaInicio: item.servicoId ? inicio : item.horaInicio, horaFim: item.servicoId ? fim : item.horaFim };
    });
    if (setItens) setServicosSelecionados(novosItens);
    // Atualizar horaFim do agendamento com o fim do último item com serviço
    const ultimoComServico = [...novosItens].reverse().find(i => i.servicoId);
    if (ultimoComServico?.horaFim) {
      setForm(f => ({ ...f, horaFim: ultimoComServico.horaFim! }));
    }
    return novosItens;
  };

  // Recalcular horaFim com base na soma das durações de todos os serviços (compat. legado)
  const recalcularHoraFim = (horaInicio: string, itens: ServicoItem[]) => {
    recalcularHorarios(horaInicio, itens);
  };

  // Ao trocar o profissional de um card, mantém serviço e pacote selecionados
  const handleProfissionalItemChange = (index: number, profissionalId: string) => {
    const novaLista = servicosSelecionados.map((item, i) =>
      i === index ? { ...item, profissionalId } : item
    );
    setServicosSelecionados(novaLista);
  };

  const handleServicoChange = (index: number, servicoId: string) => {
    const servico = servicos?.find(s => s.id === parseInt(servicoId));
    const novaLista = servicosSelecionados.map((item, i) =>
      i === index
        ? { ...item, servicoId, valorUnitario: servico ? String(parseFloat(String(servico.valor)).toFixed(2)) : "", pacoteClienteItemId: undefined }
        : item
    );
    recalcularHorarios(form.horaInicio, novaLista);
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
    setServicosSelecionados(prev => [...prev, { profissionalId: profissionalPadrao, servicoId: "", valorUnitario: "" }]);
  };

  const removerServico = (index: number) => {
    if (servicosSelecionados.length === 1) return;
    const novaLista = servicosSelecionados.filter((_, i) => i !== index);
    recalcularHorarios(form.horaInicio, novaLista);
  };

  // Ao editar manualmente o horário de um item, atualiza o item e recalcula os seguintes
  const handleItemHoraChange = (index: number, campo: "horaInicio" | "horaFim", valor: string) => {
    const novaLista = servicosSelecionados.map((item, i) => i === index ? { ...item, [campo]: valor } : item);
    // Se mudou horaInicio de um item, recalcula os itens seguintes a partir desse ponto
    if (campo === "horaInicio" && valor) {
      let cursor = toMin(valor);
      const recalculados = novaLista.map((item, i) => {
        if (i < index) return item;
        const s = servicos?.find(sv => sv.id === parseInt(item.servicoId));
        const dur = s?.duracaoMinutos ?? 0;
        const inicio = fromMin(cursor);
        const fim = fromMin(cursor + dur);
        cursor += dur;
        return { ...item, horaInicio: item.servicoId ? inicio : item.horaInicio, horaFim: item.servicoId ? fim : item.horaFim };
      });
      setServicosSelecionados(recalculados);
      const ultimo = [...recalculados].reverse().find(i => i.servicoId);
      if (ultimo?.horaFim) setForm(f => ({ ...f, horaFim: ultimo.horaFim! }));
    } else {
      setServicosSelecionados(novaLista);
    }
  };

  // Valor total calculado
  const valorTotal = servicosSelecionados.reduce((acc, item) => {
    return acc + (parseFloat(item.valorUnitario) || 0);
  }, 0);

  // Valor do sinal calculado com percentual real da empresa
  const valorSinal = percentualReserva > 0 ? valorTotal * (percentualReserva / 100) : 0;

  const handleSubmit = () => {
    if (!form.clienteId) {
      toast.error("Selecione o cliente");
      return;
    }
    const servicosValidos = servicosSelecionados.filter(s => s.servicoId);
    if (servicosValidos.length === 0) {
      toast.error("Selecione pelo menos um serviço");
      return;
    }
    if (form.horaFim && form.horaInicio && form.horaFim <= form.horaInicio) {
      toast.error("O horário de término deve ser após o horário de início");
      return;
    }

    const servicoPrincipal = servicosValidos[0];
    const primeiroProfissionalId = servicoPrincipal.profissionalId ? parseInt(servicoPrincipal.profissionalId) : undefined;

    criarMutation.mutate({
      clienteId: parseInt(form.clienteId),
      profissionalId: primeiroProfissionalId,
      servicoId: parseInt(servicoPrincipal.servicoId),
      servicos: servicosValidos.map(s => ({
        servicoId: parseInt(s.servicoId),
        profissionalId: s.profissionalId ? parseInt(s.profissionalId) : undefined,
        horaInicio: s.horaInicio ?? undefined,
        horaFim: s.horaFim ?? undefined,
        valorUnitario: s.valorUnitario || "0",
        pacoteClienteItemId: s.pacoteClienteItemId,
      })),
      data: form.data,
      horaInicio: form.horaInicio + ":00",
      horaFim: form.horaFim + ":00",
      valorTotal: valorTotal.toFixed(2),
      status: form.status,
      observacoes: form.observacoes || undefined,
      comReserva: form.comReserva,
      reservaDataLimitePersonalizada: (form.status === 'pre_agendado' && form.usarDataLimitePersonalizada && form.reservaDataLimitePersonalizada)
        ? new Date(form.reservaDataLimitePersonalizada).toISOString()
        : undefined,
      pacoteClienteItemId: servicoPrincipal.pacoteClienteItemId,
      taxaAdicional: form.taxaAdicional || undefined,
      nomeTaxaAdicional: form.nomeTaxaAdicional || undefined,
    });
  };

  // Estado para pessoas adicionais da reserva
  const [pessoasAdicionais, setPessoasAdicionais] = useState<{ clienteId: number; nome: string; isPrincipal: boolean }[]>([]);
  const [buscaPessoa, setBuscaPessoa] = useState("");
  const [mostrarBuscaPessoa, setMostrarBuscaPessoa] = useState(false);

  // Clientes filtrados para busca de pessoas adicionais (excluindo o cliente principal e já adicionados)
  const clientesFiltradosPessoas = useMemo(() => {
    if (!clientes || !buscaPessoa.trim()) return [];
    const termo = buscaPessoa.toLowerCase();
    const idsJaAdicionados = new Set([
      form.clienteId ? parseInt(form.clienteId) : -1,
      ...pessoasAdicionais.map(p => p.clienteId),
    ]);
    return clientes
      .filter(c => !idsJaAdicionados.has(c.id) && c.nome.toLowerCase().includes(termo))
      .slice(0, 6);
  }, [clientes, buscaPessoa, form.clienteId, pessoasAdicionais]);

  const adicionarPessoa = (clienteId: number, nome: string) => {
    setPessoasAdicionais(prev => [...prev, { clienteId, nome, isPrincipal: false }]);
    setBuscaPessoa("");
    setMostrarBuscaPessoa(false);
  };

  const removerPessoa = (clienteId: number) => {
    setPessoasAdicionais(prev => prev.filter(p => p.clienteId !== clienteId));
  };

  const togglePrincipal = (clienteId: number) => {
    setPessoasAdicionais(prev => prev.map(p => ({ ...p, isPrincipal: p.clienteId === clienteId ? !p.isPrincipal : false })));
  };

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
      <DialogContent className={inlinePage ? "fixed inset-0 max-w-none max-h-none h-full w-full rounded-none border-0 translate-x-0 translate-y-0 top-0 left-0 bottom-auto sm:inset-auto sm:top-[50%] sm:left-[50%] sm:max-w-lg sm:max-h-[90vh] sm:h-auto sm:w-full sm:rounded-lg sm:translate-x-[-50%] sm:translate-y-[-50%] p-0 overflow-hidden overflow-x-hidden gap-0 flex flex-col" : "max-w-lg p-0 overflow-hidden overflow-x-hidden gap-0 flex flex-col max-h-[95dvh] sm:max-h-[90vh] w-[calc(100%-1rem)] sm:w-full"}>
        <DialogHeader className="px-5 pt-5 pb-3 flex-shrink-0 pr-12">
          <DialogTitle className="font-bold tracking-tight">
            Novo Agendamento
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2 px-5 overflow-y-auto overflow-x-hidden flex-1 min-w-0">
          <div className="grid grid-cols-2 gap-4 min-w-0 w-full">
            {/* Cliente */}
            <div className="col-span-2">
              <Label className="text-xs text-muted-foreground mb-1.5 block">Cliente *</Label>
              <ClienteAutocomplete
                clientes={clientes}
                value={form.clienteId}
                onValueChange={v => setForm(f => ({ ...f, clienteId: v }))}
                placeholder="Buscar cliente por nome ou telefone..."
              />
            </div>

            {/* Pessoas da Reserva */}
            <div className="col-span-2">
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" />
                  Pessoas da reserva
                  <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full text-muted-foreground">opcional</span>
                </Label>
                <button
                  type="button"
                  onClick={() => setMostrarBuscaPessoa(v => !v)}
                  className="flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  Adicionar pessoa
                </button>
              </div>

              {/* Campo de busca */}
              {mostrarBuscaPessoa && (
                <div className="relative mb-2">
                  <Input
                    placeholder="Buscar cliente pelo nome..."
                    value={buscaPessoa}
                    onChange={e => setBuscaPessoa(e.target.value)}
                    autoFocus
                    className="text-sm h-8"
                  />
                  {clientesFiltradosPessoas.length > 0 && (
                    <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-lg max-h-40 overflow-y-auto">
                      {clientesFiltradosPessoas.map(c => (
                        <button
                          key={c.id}
                          type="button"
                          className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                          onClick={() => adicionarPessoa(c.id, c.nome)}
                        >
                          {c.nome}
                          {c.telefone && <span className="text-xs text-muted-foreground ml-2">{c.telefone}</span>}
                        </button>
                      ))}
                    </div>
                  )}
                  {buscaPessoa.trim() && clientesFiltradosPessoas.length === 0 && (
                    <p className="text-xs text-muted-foreground mt-1 px-1">Nenhum cliente encontrado.</p>
                  )}
                </div>
              )}

              {/* Lista de pessoas adicionadas */}
              {pessoasAdicionais.length > 0 && (
                <div className="space-y-1.5">
                  {pessoasAdicionais.map(p => (
                    <div key={p.clienteId} className="flex items-center justify-between px-3 py-2 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          title={p.isPrincipal ? "Contato principal (recebe automações)" : "Definir como contato principal"}
                          onClick={() => togglePrincipal(p.clienteId)}
                          className={`transition-colors ${p.isPrincipal ? "text-amber-500" : "text-muted-foreground hover:text-amber-400"}`}
                        >
                          <Star className="h-3.5 w-3.5" fill={p.isPrincipal ? "currentColor" : "none"} />
                        </button>
                        <span className="text-sm text-foreground">{p.nome}</span>
                        {p.isPrincipal && (
                          <span className="text-[10px] bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded-full">principal</span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => removerPessoa(p.clienteId)}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                  <p className="text-[10px] text-muted-foreground px-1">
                    ★ = contato principal (recebe as mensagens automáticas). Se nenhum for marcado, as automações vão para o cliente principal do agendamento.
                  </p>
                </div>
              )}
            </div>

            {/* Data e Horários */}
            <div className="col-span-2 space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground block">Data *</Label>
                <Input
                  type="date"
                  value={form.data}
                  onChange={e => setForm(f => ({ ...f, data: e.target.value }))}
                  className="h-9 text-sm w-full"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground block">Início</Label>
                  <Input
                    type="time"
                    value={form.horaInicio}
                    onChange={e => {
                      setForm(f => ({ ...f, horaInicio: e.target.value }));
                      recalcularHoraFim(e.target.value, servicosSelecionados);
                    }}
                    className="h-9 text-sm w-full"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground block">Fim <span className="text-[10px] text-muted-foreground/60">(auto)</span></Label>
                  <Input
                    type="time"
                    value={form.horaFim}
                    onChange={e => setForm(f => ({ ...f, horaFim: e.target.value }))}
                    className="h-9 text-sm w-full"
                  />
                </div>
              </div>
            </div>

            {/* Alerta de conflito de horário */}
            {conflito?.conflito && (
              <Alert className="border-amber-400/60 bg-amber-50 dark:bg-amber-950/30 py-2.5">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800 dark:text-amber-300 text-xs">
                  <span className="font-semibold">Conflito de horário:</span> o profissional já tem {conflito.agendamentos.length > 1 ? 'agendamentos' : 'um agendamento'} neste período
                  {conflito.agendamentos.map(a => (
                    <span key={a.id} className="block mt-0.5">• {a.clienteNome} — {a.horaInicio}–{a.horaFim}</span>
                  ))}
                </AlertDescription>
              </Alert>
            )}

            {/* Pacotes Ativos do Cliente */}
            {clienteIdNum && pacotesAtivos.length > 0 && (
              <div className="col-span-2">
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
                          const servico = servicos?.find(s => s.id === p.servicoId);
                          if (servico) {
                            setServicosSelecionados([{
                              profissionalId: profissionalPadrao,
                              servicoId: String(p.servicoId),
                              valorUnitario: String(parseFloat(String(servico.valor)).toFixed(2)),
                              pacoteClienteItemId: p.pacoteClienteItemId,
                            }]);
                            recalcularHoraFim(form.horaInicio, [{ profissionalId: profissionalPadrao, servicoId: String(p.servicoId), valorUnitario: "0" }]);
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

            {/* Serviços (múltiplos) — fluxo: profissional → serviço */}
            <div className="col-span-2">
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs text-muted-foreground">Serviços *</Label>
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
                {servicosSelecionados.map((item, index) => {
                  const servicosFiltrados = getServicosFiltrados(item.profissionalId);
                  return (
                    <div key={index} className="rounded-lg border border-border/50 bg-muted/20 p-2.5 space-y-2">
                      {/* Passo 1: Selecionar profissional */}
                      {podeAgendarParaOutros ? (
                        <Select
                          value={item.profissionalId || "__none__"}
                          onValueChange={(v) => handleProfissionalItemChange(index, v === "__none__" ? "" : v)}
                        >
                          <SelectTrigger className="h-9 w-full">
                            <SelectValue placeholder="Selecionar profissional" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__" disabled>Selecionar profissional</SelectItem>
                            {profissionais?.filter(p => p.ativo).map(p => (
                              <SelectItem key={p.id} value={String(p.id)}>
                                {p.nome}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          value={profissionais?.find(p => p.id === meuProfissionalId)?.nome ?? "Carregando..."}
                          disabled
                          className="bg-muted h-9 text-sm"
                        />
                      )}

                      {/* Passo 2: Selecionar serviço (filtrado pelo profissional) */}
                      <Select
                        value={item.servicoId || "__none__"}
                        onValueChange={(v) => handleServicoChange(index, v === "__none__" ? "" : v)}
        >
          <SelectTrigger className="h-9 w-full">
            <SelectValue placeholder="Selecionar serviço" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__" disabled>Selecionar serviço</SelectItem>
                          {servicosFiltrados.map(s => (
                            <SelectItem key={s.id} value={String(s.id)}>
                              {s.nome}
                              {s.duracaoMinutos ? ` · ${s.duracaoMinutos}min` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {/* Vincular sessão de pacote ou abrir novo */}
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

                      {/* Horário por item (exibido quando há serviço selecionado) */}
                      {item.servicoId && (
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-[10px] text-muted-foreground mb-1 block">Início</Label>
                            <Input
                              type="time"
                              value={item.horaInicio ?? ""}
                              onChange={e => handleItemHoraChange(index, "horaInicio", e.target.value)}
                              className="h-8 text-xs w-full"
                            />
                          </div>
                          <div>
                            <Label className="text-[10px] text-muted-foreground mb-1 block">Fim</Label>
                            <Input
                              type="time"
                              value={item.horaFim ?? ""}
                              onChange={e => handleItemHoraChange(index, "horaFim", e.target.value)}
                              className="h-8 text-xs w-full"
                            />
                          </div>
                        </div>
                      )}

                      {/* Valor + botão remover */}
                      <div className="flex gap-2 items-center">
                        <div className="relative flex-1 min-w-0">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R$</span>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.valorUnitario}
                            onChange={e => handleValorChange(index, e.target.value)}
                            className="pl-8 w-full"
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
                  );
                })}
              </div>
            </div>

            {/* Observações */}
            <div className="col-span-2">
              <Label className="text-xs text-muted-foreground mb-1.5 block">Observações</Label>
              <Textarea
                placeholder="Observações para o agendamento..."
                value={form.observacoes}
                onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
                rows={2}
              />
            </div>

            {/* Status inicial */}
            <div className="col-span-2">
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
            <div className="col-span-2 flex items-center justify-between p-3 bg-muted/50 rounded-lg">
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
              <div className="col-span-2 p-3 bg-secondary/50 rounded-lg">
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
                {/* Taxa adicional */}
                <div className="mt-2 pt-2 border-t border-border/40">
                  <p className="text-xs text-muted-foreground mb-1.5 font-medium">Taxa adicional (opcional)</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Nome (ex: Deslocamento)"
                      className="flex-1 text-sm border border-border rounded-md px-2.5 py-1.5 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                      value={form.nomeTaxaAdicional}
                      onChange={e => setForm(f => ({ ...f, nomeTaxaAdicional: e.target.value }))}
                    />
                    <input
                      type="number"
                      placeholder="R$ 0,00"
                      min="0"
                      step="0.01"
                      className="w-28 text-sm border border-border rounded-md px-2.5 py-1.5 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                      value={form.taxaAdicional}
                      onChange={e => setForm(f => ({ ...f, taxaAdicional: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Data limite personalizada para pré-agendamento */}
            {form.status === 'pre_agendado' && (
              <div className="col-span-2 space-y-2">
                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-foreground">Data limite personalizada</p>
                    <p className="text-xs text-muted-foreground">
                      {form.usarDataLimitePersonalizada
                        ? 'Defina até quando o cliente tem para confirmar'
                        : `Prazo padrão: ${empresa?.reservaHorasExpiracao ?? 24}h após a criação`}
                    </p>
                  </div>
                  <Switch
                    checked={form.usarDataLimitePersonalizada}
                    onCheckedChange={v => setForm(f => ({ ...f, usarDataLimitePersonalizada: v, reservaDataLimitePersonalizada: '' }))}
                  />
                </div>
                {form.usarDataLimitePersonalizada && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800/40">
                    <label className="text-xs font-medium text-amber-800 dark:text-amber-300 block mb-1.5">
                      Até quando o cliente pode confirmar?
                    </label>
                    <input
                      type="datetime-local"
                      className="w-full text-sm border border-amber-300 dark:border-amber-700 rounded-md px-3 py-2 bg-white dark:bg-amber-950/30 text-foreground focus:outline-none focus:ring-2 focus:ring-amber-400"
                      value={form.reservaDataLimitePersonalizada}
                      min={new Date().toISOString().slice(0, 16)}
                      onChange={e => setForm(f => ({ ...f, reservaDataLimitePersonalizada: e.target.value }))}
                    />
                    {form.reservaDataLimitePersonalizada && (
                      <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                        Expira em: {new Date(form.reservaDataLimitePersonalizada).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Aviso de automação */}
            {form.comReserva && (
              <div className="col-span-2 flex items-start gap-2 p-3 rounded-lg bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800/40">
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
          <Button
            onClick={handleSubmit}
            disabled={criarMutation.isPending}
          >
            {criarMutation.isPending ? "Salvando..." : "Criar Agendamento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Modal de abrir pacote */}
    {modalPacoteAberto && clienteIdNum && (
      <ModalAbrirPacote
        open={modalPacoteAberto}
        onClose={() => setModalPacoteAberto(false)}
        clienteIdInicial={clienteIdNum}
        clienteNomeInicial={clienteNomeSelecionado}
        servicoIdInicial={pacoteServicoIdInicial}
        onSuccess={() => {
          utils.pacotes.listarAtivosComSessoes.invalidate({ clienteId: clienteIdNum });
        }}
      />
    )}
    </>
  );
}
