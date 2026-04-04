import { trpc } from "@/lib/trpc";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Clock, User, Sparkles, DollarSign, X, Calendar, Percent, Link2, Copy, Check, Plus, Trash2 } from "lucide-react";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const statusConfig: Record<string, { label: string; bg: string; color: string }> = {
  pre_agendado:       { label: "Pré-agendado",    bg: "oklch(55% 0.22 264 / 12%)", color: "oklch(45% 0.18 264)" },
  aguardando_reserva: { label: "Aguard. Reserva", bg: "oklch(72% 0.16 80 / 14%)",  color: "oklch(42% 0.14 75)" },
  agendado:           { label: "Agendado",        bg: "oklch(55% 0.22 264 / 12%)", color: "oklch(45% 0.18 264)" },
  confirmado:         { label: "Confirmado",      bg: "oklch(62% 0.18 155 / 14%)", color: "oklch(35% 0.14 155)" },
  em_andamento:       { label: "Em andamento",    bg: "oklch(68% 0.18 80 / 14%)",  color: "oklch(38% 0.14 80)" },
  concluido:          { label: "Concluído",       bg: "oklch(55% 0.04 260 / 10%)", color: "oklch(40% 0.04 260)" },
  cancelado:          { label: "Cancelado",       bg: "oklch(58% 0.22 25 / 12%)",  color: "oklch(40% 0.18 25)" },
  faltou:             { label: "Faltou",          bg: "oklch(58% 0.22 25 / 12%)",  color: "oklch(40% 0.18 25)" },
};

interface Props {
  agendamentoId: number;
  open: boolean;
  onClose: () => void;
}

export default function AgendamentoDetalheModal({ agendamentoId, open, onClose }: Props) {
  const utils = trpc.useUtils();
  const { data: ag, isLoading } = trpc.agendamentos.getById.useQuery({ id: agendamentoId });
  const { data: itens } = trpc.agendamentos.getItens.useQuery({ agendamentoId }, { enabled: !!agendamentoId });
  const { data: clientes } = trpc.clientes.list.useQuery();
  const { data: profissionais } = trpc.profissionais.listParaAgendamento.useQuery();
  const { data: servicos } = trpc.servicos.list.useQuery();

  // Estado para edição de serviços
  const [editandoServicos, setEditandoServicos] = useState(false);
  const [servicosEdit, setServicosEdit] = useState<{ servicoId: string; valorUnitario: string }[]>([]);
  // Estado para edição inline de valores
  const [valoresEdit, setValoresEdit] = useState<Record<number, string>>({});
  const [editandoValores, setEditandoValores] = useState(false);

  const updateServicosMutation = trpc.agendamentos.updateServicos.useMutation({
    onSuccess: () => {
      toast.success("Serviços atualizados!");
      utils.agendamentos.getItens.invalidate({ agendamentoId });
      utils.agendamentos.getById.invalidate({ id: agendamentoId });
      utils.agendamentos.list.invalidate();
      setEditandoServicos(false);
    },
    onError: (err: { message: string }) => toast.error(err.message),
  });

  const updateValoresMutation = trpc.agendamentos.updateValores.useMutation({
    onSuccess: (data) => {
      toast.success("Valores atualizados!");
      utils.agendamentos.getItens.invalidate({ agendamentoId });
      utils.agendamentos.getById.invalidate({ id: agendamentoId });
      utils.agendamentos.list.invalidate();
      setEditandoValores(false);
    },
    onError: (err: { message: string }) => toast.error(err.message),
  });

  function iniciarEdicaoValores() {
    const map: Record<number, string> = {};
    servicosDoAgendamento.forEach(s => { map[s.servicoId] = s.valor.toFixed(2); });
    setValoresEdit(map);
    setEditandoValores(true);
  }

  function salvarValores() {
    const itens = servicosDoAgendamento.map(s => ({
      servicoId: s.servicoId,
      valorUnitario: valoresEdit[s.servicoId] ?? s.valor.toFixed(2),
    }));
    updateValoresMutation.mutate({ agendamentoId, itens });
  }

  const [comissaoModal, setComissaoModal] = useState(false);
  const [linkConfirmacao, setLinkConfirmacao] = useState<string | null>(null);
  const [linkCopiado, setLinkCopiado] = useState(false);
  const [comissaoForm, setComissaoForm] = useState({
    percentualComissao: "",
    tipoPagamento: "dinheiro" as "dinheiro" | "pix" | "cartao_debito" | "cartao_credito" | "outro",
    custoReposicao: "",
  });

  const updateMutation = trpc.agendamentos.update.useMutation({
    onSuccess: () => {
      toast.success("Status atualizado!");
      utils.agendamentos.list.invalidate();
      utils.agendamentos.getById.invalidate({ id: agendamentoId });
    },
    onError: (err: { message: string }) => toast.error(err.message),
  });

  const gerarLinkMutation = trpc.confirmacao.gerarLink.useMutation({
    onSuccess: (data) => {
      setLinkConfirmacao(data.link);
      navigator.clipboard.writeText(data.link).then(() => {
        setLinkCopiado(true);
        toast.success("Link de confirmação copiado!");
        setTimeout(() => setLinkCopiado(false), 3000);
      }).catch(() => {
        toast.success("Link gerado! Copie manualmente.");
      });
    },
    onError: (err: { message: string }) => toast.error(err.message),
  });

  const criarComissaoMutation = trpc.financeiro.criarComissao.useMutation({
    onSuccess: () => {
      toast.success("Comissão registrada automaticamente!");
      utils.financeiro.comissoes.invalidate();
      setComissaoModal(false);
    },
    onError: (err: { message: string }) => toast.error(err.message),
  });

  const cliente = clientes?.find(c => c.id === ag?.clienteId);
  const profissional = profissionais?.find(p => p.id === ag?.profissionalId);
  const servico = servicos?.find(s => s.id === ag?.servicoId);

  // Serviços do agendamento: usar itens se disponíveis, senão fallback para servicoId
  const servicosDoAgendamento = useMemo(() => {
    if (itens && itens.length > 0) {
      return itens.map(item => ({
        servicoId: item.servicoId,
        nome: servicos?.find(s => s.id === item.servicoId)?.nome ?? "Serviço",
        valor: parseFloat(String(item.valorUnitario)),
      }));
    }
    if (servico) {
      return [{ servicoId: servico.id, nome: servico.nome, valor: parseFloat(String(ag?.valorTotal ?? 0)) }];
    }
    return [];
  }, [itens, servico, servicos, ag]);

  const iniciarEdicaoServicos = () => {
    if (servicosDoAgendamento.length > 0) {
      setServicosEdit(servicosDoAgendamento.map(s => ({
        servicoId: String(s.servicoId),
        valorUnitario: s.valor.toFixed(2),
      })));
    } else {
      setServicosEdit([{ servicoId: "", valorUnitario: "" }]);
    }
    setEditandoServicos(true);
  };

  const salvarEdicaoServicos = () => {
    const validos = servicosEdit.filter(s => s.servicoId);
    if (validos.length === 0) { toast.error("Selecione pelo menos um serviço"); return; }
    const total = validos.reduce((acc, s) => acc + (parseFloat(s.valorUnitario) || 0), 0);
    updateServicosMutation.mutate({
      agendamentoId,
      servicoIdPrincipal: parseInt(validos[0].servicoId),
      servicos: validos.map(s => ({ servicoId: parseInt(s.servicoId), valorUnitario: s.valorUnitario || "0" })),
      valorTotal: total.toFixed(2),
    });
  };

  const handleStatus = (status: string) => {
    if (status === "concluido") {
      // Pré-preencher percentual: prioridade serviço > profissional
      const pctServico = (servico as any)?.percentualComissao ? parseFloat(String((servico as any).percentualComissao)) : 0;
      const pctProfissional = (profissional as any)?.percentualComissao ? parseFloat(String((profissional as any).percentualComissao)) : 0;
      const pct = pctServico > 0 ? pctServico : pctProfissional;
      // Pré-preencher custo de reposição com custoFixo do serviço
      const custoServico = (servico as any)?.custoFixo ? parseFloat(String((servico as any).custoFixo)) : 0;
      setComissaoForm(f => ({
        ...f,
        percentualComissao: pct > 0 ? String(pct) : "",
        custoReposicao: custoServico > 0 ? String(custoServico) : "",
      }));
      // Primeiro atualiza status
      updateMutation.mutate({ id: agendamentoId, status: "concluido" } as any, {
        onSuccess: () => {
          // Depois abre modal de comissão se tiver profissional
          if (ag?.profissionalId) setComissaoModal(true);
        }
      });
      return;
    }
    updateMutation.mutate({ id: agendamentoId, status: status as Parameters<typeof updateMutation.mutate>[0]["status"] } as Parameters<typeof updateMutation.mutate>[0]);
  };

  function salvarComissao() {
    if (!ag || !ag.profissionalId) return;
    criarComissaoMutation.mutate({
      profissionalId: ag.profissionalId,
      agendamentoId: ag.id,
      valorServico: String(ag.valorTotal),
      percentualComissao: comissaoForm.percentualComissao || "0",
      tipoPagamento: comissaoForm.tipoPagamento,
      custoReposicao: comissaoForm.custoReposicao || undefined,
    });
  }

  if (isLoading || !ag) return null;

  const cfg = statusConfig[ag.status] ?? statusConfig.agendado;
  const dataFormatada = ag.data.split("-").reverse().join("/");

  return (
    <>
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md p-0 overflow-hidden gap-0 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: "1px solid oklch(90% 0.012 250)" }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl gradient-primary flex items-center justify-center">
              <Calendar className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-sm tracking-tight">Detalhes do Agendamento</h2>
              <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold"
                style={{ background: cfg.bg, color: cfg.color }}>
                {cfg.label}
              </span>
            </div>
          </div>
          <button onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Corpo */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Info block */}
          <div className="rounded-xl p-4 space-y-3.5"
            style={{ background: "oklch(97.5% 0.006 250)", border: "1px solid oklch(91% 0.010 250)" }}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: "oklch(55% 0.22 264 / 10%)" }}>
                <User className="w-3.5 h-3.5" style={{ color: "oklch(45% 0.18 264)" }} />
              </div>
              <div>
                <p className="text-sm font-semibold">{cliente?.nome ?? "—"}</p>
                <p className="text-xs text-muted-foreground">{cliente?.telefone ?? ""}</p>
              </div>
            </div>

            {/* Serviços (múltiplos) com edição inline de valores */}
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: profissional?.corCalendario ? `${profissional.corCalendario}20` : "oklch(60% 0.20 300 / 10%)" }}>
                <Sparkles className="w-3.5 h-3.5" style={{ color: profissional?.corCalendario ?? "oklch(42% 0.16 300)" }} />
              </div>
              <div className="flex-1 min-w-0">
                {/* Lista de serviços com valor editável inline */}
                <div className="space-y-1.5">
                  {servicosDoAgendamento.length === 0 && (
                    <p className="text-sm font-semibold">{servico?.nome ?? "—"}</p>
                  )}
                  {servicosDoAgendamento.map((s, i) => (
                    <div key={i} className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold truncate flex-1">{s.nome}</p>
                      {editandoValores ? (
                        <div className="relative w-28 flex-shrink-0">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">R$</span>
                          <Input
                            type="number" step="0.01" min="0"
                            value={valoresEdit[s.servicoId] ?? s.valor.toFixed(2)}
                            onChange={e => setValoresEdit(prev => ({ ...prev, [s.servicoId]: e.target.value }))}
                            className="pl-7 h-7 text-xs"
                            autoFocus={i === 0}
                          />
                        </div>
                      ) : (
                        <span className="text-xs font-medium text-muted-foreground flex-shrink-0">
                          {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(s.valor)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-xs text-muted-foreground">com {profissional?.nome ?? "—"}</p>
                  {!editandoValores ? (
                    servicosDoAgendamento.length > 0 && (
                      <button
                        onClick={iniciarEdicaoValores}
                        className="text-[10px] text-primary hover:underline"
                      >
                        editar valores
                      </button>
                    )
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setEditandoValores(false)}
                        className="text-[10px] text-muted-foreground hover:underline"
                      >
                        cancelar
                      </button>
                      <button
                        onClick={salvarValores}
                        disabled={updateValoresMutation.isPending}
                        className="text-[10px] text-primary font-semibold hover:underline disabled:opacity-50"
                      >
                        {updateValoresMutation.isPending ? "salvando..." : "salvar valores"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Edição completa de serviços (trocar serviço) */}
            {editandoServicos && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8" />
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-semibold text-foreground">Trocar serviços</p>
                    <button
                      onClick={() => setServicosEdit(prev => [...prev, { servicoId: "", valorUnitario: "" }])}
                      className="text-[10px] text-primary hover:underline flex items-center gap-0.5"
                    >
                      <Plus className="w-3 h-3" /> adicionar
                    </button>
                  </div>
                  {servicosEdit.map((item, index) => (
                    <div key={index} className="flex gap-1.5 items-center">
                      <Select
                        value={item.servicoId}
                        onValueChange={(v) => {
                          const s = servicos?.find(sv => sv.id === parseInt(v));
                          setServicosEdit(prev => prev.map((it, i) => i === index
                            ? { servicoId: v, valorUnitario: s ? String(parseFloat(String(s.valor)).toFixed(2)) : it.valorUnitario }
                            : it
                          ));
                        }}
                      >
                        <SelectTrigger className="h-8 text-xs flex-1">
                          <SelectValue placeholder="Serviço" />
                        </SelectTrigger>
                        <SelectContent>
                          {servicos?.filter(s => s.ativo).map(s => (
                            <SelectItem key={s.id} value={String(s.id)}>{s.nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="relative w-24">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">R$</span>
                        <Input
                          type="number" step="0.01" min="0"
                          value={item.valorUnitario}
                          onChange={e => setServicosEdit(prev => prev.map((it, i) => i === index ? { ...it, valorUnitario: e.target.value } : it))}
                          className="pl-7 h-8 text-xs"
                        />
                      </div>
                      <button
                        onClick={() => setServicosEdit(prev => prev.filter((_, i) => i !== index))}
                        disabled={servicosEdit.length === 1}
                        className="text-muted-foreground hover:text-destructive disabled:opacity-30"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setEditandoServicos(false)}>Cancelar</Button>
                    <Button size="sm" className="h-7 text-xs" onClick={salvarEdicaoServicos} disabled={updateServicosMutation.isPending}>
                      {updateServicosMutation.isPending ? "Salvando..." : "Salvar"}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: "oklch(68% 0.18 80 / 10%)" }}>
                <Clock className="w-3.5 h-3.5" style={{ color: "oklch(40% 0.14 80)" }} />
              </div>
              <p className="text-sm font-semibold">
                {dataFormatada} · {ag.horaInicio.slice(0, 5)} – {ag.horaFim.slice(0, 5)}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: "oklch(62% 0.18 155 / 10%)" }}>
                <DollarSign className="w-3.5 h-3.5" style={{ color: "oklch(35% 0.14 155)" }} />
              </div>
              <p className="text-sm font-semibold">
                {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })
                  .format(parseFloat(String(ag.valorTotal)))}
              </p>
            </div>
          </div>

          {ag.observacoes && (
            <div className="rounded-xl p-3.5"
              style={{ background: "oklch(97.5% 0.006 250)", border: "1px solid oklch(91% 0.010 250)" }}>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Observações</p>
              <p className="text-sm">{ag.observacoes}</p>
            </div>
          )}

          {/* Ações */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2.5">
              Alterar status
            </p>
            <div className="flex flex-wrap gap-2">
              {ag.status === "aguardando_reserva" && (
                <ActionBtn
                  label="Confirmar reserva"
                  icon={CheckCircle2}
                  bg="oklch(62% 0.18 155 / 10%)"
                  color="oklch(35% 0.14 155)"
                  border="oklch(62% 0.18 155 / 25%)"
                  onClick={() => handleStatus("agendado")}
                  loading={updateMutation.isPending}
                />
              )}
              {["agendado", "pre_agendado"].includes(ag.status) && (
                <ActionBtn
                  label="Confirmar"
                  icon={CheckCircle2}
                  bg="oklch(62% 0.18 155 / 10%)"
                  color="oklch(35% 0.14 155)"
                  border="oklch(62% 0.18 155 / 25%)"
                  onClick={() => handleStatus("confirmado")}
                  loading={updateMutation.isPending}
                />
              )}
              {["agendado", "pre_agendado", "confirmado"].includes(ag.status) && (
                <ActionBtn
                  label={gerarLinkMutation.isPending ? "Gerando..." : linkCopiado ? "Copiado!" : "Link Confirm."}
                  icon={linkCopiado ? Check : Link2}
                  bg="oklch(55% 0.22 264 / 10%)"
                  color="oklch(45% 0.18 264)"
                  border="oklch(55% 0.22 264 / 25%)"
                  onClick={() => gerarLinkMutation.mutate({ agendamentoId: ag.id, origin: window.location.origin })}
                  loading={gerarLinkMutation.isPending}
                />
              )}
              {["agendado", "confirmado"].includes(ag.status) && (
                <ActionBtn
                  label="Concluído"
                  icon={CheckCircle2}
                  bg="oklch(55% 0.04 260 / 8%)"
                  color="oklch(40% 0.04 260)"
                  border="oklch(55% 0.04 260 / 20%)"
                  onClick={() => handleStatus("concluido")}
                  loading={updateMutation.isPending}
                />
              )}
              {["agendado", "confirmado"].includes(ag.status) && (
                <ActionBtn
                  label="Faltou"
                  icon={XCircle}
                  bg="oklch(72% 0.16 80 / 10%)"
                  color="oklch(42% 0.14 75)"
                  border="oklch(72% 0.16 80 / 25%)"
                  onClick={() => handleStatus("faltou")}
                  loading={updateMutation.isPending}
                />
              )}
              {!["cancelado", "concluido"].includes(ag.status) && (
                <ActionBtn
                  label="Cancelar"
                  icon={XCircle}
                  bg="oklch(58% 0.22 25 / 10%)"
                  color="oklch(40% 0.18 25)"
                  border="oklch(58% 0.22 25 / 25%)"
                  onClick={() => handleStatus("cancelado")}
                  loading={updateMutation.isPending}
                />
              )}
            </div>
          </div>
          {/* Link de confirmação gerado */}
          {linkConfirmacao && (
            <div className="px-5 pb-4">
              <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
                <Link2 className="w-4 h-4 text-primary shrink-0" />
                <p className="text-xs text-muted-foreground truncate flex-1">{linkConfirmacao}</p>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 shrink-0"
                  onClick={() => {
                    navigator.clipboard.writeText(linkConfirmacao);
                    setLinkCopiado(true);
                    toast.success("Link copiado!");
                    setTimeout(() => setLinkCopiado(false), 2000);
                  }}
                >
                  {linkCopiado ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>

    {/* Modal de Comissão Automática */}
    <Dialog open={comissaoModal} onOpenChange={setComissaoModal}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-bold tracking-tight flex items-center gap-2">
            <Percent className="w-4 h-4 text-primary" />
            Registrar Comissão
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="rounded-lg bg-secondary/50 p-3 text-xs text-muted-foreground">
            <p><strong>{servico?.nome}</strong> · {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(parseFloat(String(ag?.valorTotal ?? 0)))}</p>
            <p className="mt-0.5">Profissional: <strong>{profissional?.nome}</strong></p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">
                % Comissão
                {(servico as any)?.percentualComissao && parseFloat(String((servico as any).percentualComissao)) > 0 && (
                  <span className="ml-1 text-primary/70">(fixo do serviço)</span>
                )}
              </Label>
              <Input
                type="number" min="0" max="100" step="0.5"
                value={comissaoForm.percentualComissao}
                onChange={e => setComissaoForm(f => ({ ...f, percentualComissao: e.target.value }))}
                placeholder="Ex: 40"
                readOnly={(servico as any)?.percentualComissao && parseFloat(String((servico as any).percentualComissao)) > 0}
                className={(servico as any)?.percentualComissao && parseFloat(String((servico as any).percentualComissao)) > 0 ? "bg-secondary/50 cursor-not-allowed" : ""}
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Tipo de Pagamento</Label>
              <Select value={comissaoForm.tipoPagamento} onValueChange={(v: any) => setComissaoForm(f => ({ ...f, tipoPagamento: v }))}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="cartao_debito">Cartão Débito</SelectItem>
                  <SelectItem value="cartao_credito">Cartão Crédito</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Custo de Reposição (R$) <span className="text-muted-foreground/60">opcional</span></Label>
            <Input
              type="number" min="0" step="0.01"
              value={comissaoForm.custoReposicao}
              onChange={e => setComissaoForm(f => ({ ...f, custoReposicao: e.target.value }))}
              placeholder="0,00"
            />
          </div>
          {comissaoForm.percentualComissao && parseFloat(comissaoForm.percentualComissao) > 0 && ag && (
            <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 text-xs space-y-1">
              <p className="font-semibold text-primary">Prévia do cálculo</p>
              <p>Valor do serviço: <strong>{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(parseFloat(String(ag.valorTotal)))}</strong></p>
              <p>Comissão ({parseFloat(comissaoForm.percentualComissao).toFixed(1)}%): <strong className="text-primary">{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(parseFloat(String(ag.valorTotal)) * parseFloat(comissaoForm.percentualComissao) / 100)}</strong></p>
            </div>
          )}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setComissaoModal(false)}>Pular</Button>
          <Button onClick={salvarComissao} disabled={criarComissaoMutation.isPending}>
            {criarComissaoMutation.isPending ? "Salvando..." : "Registrar Comissão"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}

function ActionBtn({
  label, icon: Icon, bg, color, border, onClick, loading
}: {
  label: string;
  icon: React.ElementType;
  bg: string;
  color: string;
  border: string;
  onClick: () => void;
  loading: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-80 disabled:opacity-50"
      style={{ background: bg, color, border: `1.5px solid ${border}` }}>
      <Icon className="w-3.5 h-3.5" />
      {label}
    </button>
  );
}
