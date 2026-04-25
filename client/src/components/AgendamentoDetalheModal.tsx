import { trpc } from "@/lib/trpc";
import { usePermissoes } from "@/hooks/usePermissoes";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Clock, User, Sparkles, DollarSign, X, Calendar, Percent, Link2, Copy, Check, Plus, Trash2, CreditCard, Tag, AlertCircle, ScanLine, Loader2, Edit3, Wallet, Users, UserPlus, Star, Crown, MessageCircle, ChevronDown, ChevronUp } from "lucide-react";
import EditarAgendamentoModal from "@/components/EditarAgendamentoModal";
import { useState, useMemo, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const statusConfig: Record<string, { label: string; bg: string; color: string }> = {
  pre_agendado:       { label: "Pré-agendado",    bg: "oklch(72% 0.16 80 / 14%)",  color: "oklch(42% 0.14 75)" },
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
  const { isAdmin } = usePermissoes();
  const { data: ag, isLoading } = trpc.agendamentos.getById.useQuery({ id: agendamentoId });
  const { data: itens } = trpc.agendamentos.getItens.useQuery({ agendamentoId }, { enabled: !!agendamentoId });
  const { data: pagamentos, refetch: refetchPagamentos } = trpc.agendamentos.getPagamentos.useQuery({ agendamentoId }, { enabled: !!agendamentoId });
  const { data: mensagens = [] } = trpc.agendamentos.getMensagens.useQuery({ agendamentoId }, { enabled: !!agendamentoId && open });
  const [mostrarMensagens, setMostrarMensagens] = useState(false);
  const { data: clientes } = trpc.clientes.list.useQuery();
  const { data: profissionais } = trpc.profissionais.listParaAgendamento.useQuery();
  const { data: servicos } = trpc.servicos.list.useQuery();
  const { data: meiosPagamento } = trpc.meiosPagamento.list.useQuery();
  const { data: saldoCreditoData } = trpc.creditos.getSaldo.useQuery(
    { clienteId: ag?.clienteId ?? 0 },
    { enabled: !!ag?.clienteId }
  );
  const saldoCredito = saldoCreditoData?.saldo ?? 0;

  // Pessoas da reserva
  const { data: pessoasReserva = [], refetch: refetchPessoas } = trpc.reservaPessoas.listar.useQuery(
    { agendamentoId },
    { enabled: !!agendamentoId }
  );
  const [mostrarAddPessoa, setMostrarAddPessoa] = useState(false);
  const [novaClienteId, setNovaClienteId] = useState<string>("");
  const [novaRole, setNovaRole] = useState<'acompanhante' | 'dependente' | 'outro'>('acompanhante');

  const adicionarPessoaMutation = trpc.reservaPessoas.adicionar.useMutation({
    onSuccess: () => {
      toast.success('Pessoa adicionada à reserva!');
      refetchPessoas();
      setMostrarAddPessoa(false);
      setNovaClienteId("");
      setNovaRole('acompanhante');
    },
    onError: (e) => toast.error(e.message),
  });

  const removerPessoaMutation = trpc.reservaPessoas.remover.useMutation({
    onSuccess: () => { toast.success('Pessoa removida!'); refetchPessoas(); },
    onError: (e) => toast.error(e.message),
  });

  const definirPrincipalMutation = trpc.reservaPessoas.definirPrincipal.useMutation({
    onSuccess: () => { toast.success('Contato principal definido!'); refetchPessoas(); },
    onError: (e) => toast.error(e.message),
  });

  // Estado para edição de serviços
  const [editandoServicos, setEditandoServicos] = useState(false);
  const [servicosEdit, setServicosEdit] = useState<{ servicoId: string; profissionalId?: string; valorUnitario: string; horaInicio?: string; horaFim?: string }[]>([]);
  // Estado para edição inline de valores
  const [valoresEdit, setValoresEdit] = useState<Record<number, string>>({});
  const [editandoValores, setEditandoValores] = useState(false);
  // Estado para pagamentos parciais
  const [showAddPagamento, setShowAddPagamento] = useState(false);
  const [novoPagamento, setNovoPagamento] = useState({ valor: "", meioPagamento: "", numeroParcelas: 1, observacao: "" });
  // Estado para leitura de comprovante
  const comprovanteInputRef = useRef<HTMLInputElement>(null);
  const [pdfPreview, setPdfPreview] = useState<string | null>(null);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const lerComprovanteMutation = trpc.agendamentos.lerComprovante.useMutation({
    onSuccess: (result) => {
      if (!result.sucesso) {
        toast.error('Imagem não reconhecida como comprovante válido. Tente outra imagem.');
        return;
      }
      const { dados } = result;
      // Pré-preencher o formulário de pagamento com os dados extraídos
      setNovoPagamento({
        valor: String(dados.valor),
        meioPagamento: dados.tipo || 'PIX',
        numeroParcelas: 1,
        observacao: `Comprovante ${dados.banco ?? ''} - ${dados.data ?? ''}`.trim(),
      });
      setShowAddPagamento(true);
      toast.success(`Comprovante lido! Valor: R$ ${dados.valor} — confirme e registre.`);
    },
    onError: () => toast.error('Erro ao ler comprovante. Tente novamente.'),
  });

  const handleComprovanteUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      if (file.type === 'application/pdf') {
        setPdfPreview(dataUrl);
        setShowPdfPreview(true);
      } else {
        lerComprovanteMutation.mutate({ agendamentoId, imageUrl: dataUrl });
      }
    };
    reader.onerror = () => {
      toast.error('Erro ao ler arquivo. Tente novamente.');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleConfirmPdfPreview = () => {
    if (pdfPreview) {
      lerComprovanteMutation.mutate({ agendamentoId, imageUrl: pdfPreview });
      setShowPdfPreview(false);
      setPdfPreview(null);
    }
  };

  const handleCancelPdfPreview = () => {
    setShowPdfPreview(false);
    setPdfPreview(null);
  };

  // Estado para desconto
  const [editandoDesconto, setEditandoDesconto] = useState(false);
  const [descontoEdit, setDescontoEdit] = useState("");

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
    onSuccess: () => {
      toast.success("Valores atualizados!");
      utils.agendamentos.getItens.invalidate({ agendamentoId });
      utils.agendamentos.getById.invalidate({ id: agendamentoId });
      utils.agendamentos.list.invalidate();
      setEditandoValores(false);
    },
    onError: (err: { message: string }) => toast.error(err.message),
  });

  const registrarCreditoMutation = trpc.creditos.registrar.useMutation({
    onSuccess: (data) => {
      utils.creditos.getSaldo.invalidate({ clienteId: ag?.clienteId ?? 0 });
      utils.creditos.getHistorico.invalidate({ clienteId: ag?.clienteId ?? 0 });
      toast.success(`✅ Crédito de R$${data.novoSaldo.toFixed(2)} registrado para a cliente!`);
    },
  });

  const usarCreditoMutation = trpc.creditos.usar.useMutation({
    onSuccess: (data) => {
      toast.success(`Crédito aplicado! Saldo restante: R$${data.novoSaldo.toFixed(2)}`);
      utils.agendamentos.getPagamentos.invalidate({ agendamentoId });
      utils.agendamentos.getById.invalidate({ id: agendamentoId });
      utils.creditos.getSaldo.invalidate({ clienteId: ag?.clienteId ?? 0 });
      utils.creditos.getHistorico.invalidate({ clienteId: ag?.clienteId ?? 0 });
    },
    onError: (err: { message: string }) => toast.error(err.message),
  });

  const addPagamentoMutation = trpc.agendamentos.addPagamento.useMutation({
    onSuccess: (_, vars) => {
      // Detectar pagamento a maior após registrar
      const totalItens = parseFloat(String(ag?.valorTotal ?? 0));
      const desconto = parseFloat(String((ag as any)?.desconto ?? 0));
      const totalJaPago = (pagamentos ?? []).reduce((acc, p) => acc + parseFloat(String(p.valor)), 0);
      const novoPag = parseFloat(vars.valor);
      const totalComNovo = totalJaPago + novoPag;
      const excedente = totalComNovo - (totalItens - desconto);
      if (excedente > 0.01 && ag?.clienteId) {
        registrarCreditoMutation.mutate({
          clienteId: ag.clienteId,
          valor: Math.round(excedente * 100) / 100,
          origem: `Pagamento a maior no agendamento #${agendamentoId}`,
          agendamentoId,
        });
      }
      toast.success("Pagamento registrado!");
      utils.agendamentos.getPagamentos.invalidate({ agendamentoId });
      utils.agendamentos.getById.invalidate({ id: agendamentoId });
      setNovoPagamento({ valor: "", meioPagamento: "", numeroParcelas: 1, observacao: "" });
      setShowAddPagamento(false);
    },
    onError: (err: { message: string }) => toast.error(err.message),
  });

  const removePagamentoMutation = trpc.agendamentos.removePagamento.useMutation({
    onSuccess: () => {
      toast.success("Pagamento removido!");
      utils.agendamentos.getPagamentos.invalidate({ agendamentoId });
      utils.agendamentos.getById.invalidate({ id: agendamentoId });
    },
    onError: (err: { message: string }) => toast.error(err.message),
  });

  const updateDescontoMutation = trpc.agendamentos.updateDesconto.useMutation({
    onSuccess: () => {
      toast.success("Desconto atualizado!");
      utils.agendamentos.getById.invalidate({ id: agendamentoId });
      utils.agendamentos.list.invalidate();
      setEditandoDesconto(false);
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

  const [editarModal, setEditarModal] = useState(false);
  const [comissaoModal, setComissaoModal] = useState(false);
  const [resumoConclusaoModal, setResumoConclusaoModal] = useState(false);
  const [confirmarExclusaoModal, setConfirmarExclusaoModal] = useState(false);
  // Modal de sinal fora do prazo
  const [sinalForaDoPrazoModal, setSinalForaDoPrazoModal] = useState(false);
  const [sinalValor, setSinalValor] = useState("");
  const [sinalObs, setSinalObs] = useState("");
  const confirmarSinalForaDoPrazoMutation = trpc.agendamentos.confirmarSinalForaDoPrazo.useMutation({
    onSuccess: async () => {
      toast.success("✅ Sinal confirmado! Agendamento reativado para Agendado.");
      setSinalForaDoPrazoModal(false);
      setSinalValor("");
      setSinalObs("");
      await Promise.all([
        utils.agendamentos.getById.invalidate({ id: agendamentoId }),
        utils.agendamentos.getPagamentos.invalidate({ agendamentoId }),
        utils.agendamentos.list.invalidate(),
        utils.financeiro.comissoes.invalidate(),
      ]);
    },
    onError: (err: { message: string }) => toast.error(err.message),
  });
  const deleteMutation = trpc.agendamentos.delete.useMutation({
    onSuccess: () => {
      toast.success("Agendamento excluído com sucesso!");
      utils.agendamentos.list.invalidate();
      onClose();
    },
    onError: (err: { message: string }) => toast.error(err.message),
  });
  const [linkConfirmacao, setLinkConfirmacao] = useState<string | null>(null);
  const [linkCopiado, setLinkCopiado] = useState(false);
  const [comissaoForm, setComissaoForm] = useState({
    percentualComissao: "",
    tipoPagamento: "dinheiro" as "dinheiro" | "pix" | "cartao_debito" | "cartao_credito" | "outro",
    custoReposicao: "",
  });

  const updateMutation = trpc.agendamentos.update.useMutation({
    onSuccess: async () => {
      toast.success("Status atualizado!");
      await Promise.all([
        utils.agendamentos.getById.invalidate({ id: agendamentoId }),
        utils.agendamentos.getPagamentos.invalidate({ agendamentoId }),
        utils.agendamentos.list.invalidate(),
      ]);
    },
    onError: (err: { message: string }) => toast.error(err.message),
  });

  const confirmarReservaMutation = trpc.agendamentos.confirmarReserva.useMutation({
    onSuccess: async () => {
      toast.success("✅ Reserva confirmada! Agendamento atualizado para Agendado.");
      await Promise.all([
        utils.agendamentos.getById.invalidate({ id: agendamentoId }),
        utils.agendamentos.getPagamentos.invalidate({ agendamentoId }),
        utils.agendamentos.list.invalidate(),
        utils.financeiro.comissoes.invalidate(),
      ]);
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
        profissionalId: (item as any).profissionalId ?? null,
        horaInicio: (item as any).horaInicio ?? null,
        horaFim: (item as any).horaFim ?? null,
        nome: servicos?.find(s => s.id === item.servicoId)?.nome ?? "Serviço",
        valor: parseFloat(String(item.valorUnitario)),
        pacoteClienteItemId: item.pacoteClienteItemId ?? null,
      }));
    }
    if (servico) {
      return [{ servicoId: servico.id, profissionalId: null, horaInicio: null, horaFim: null, nome: servico.nome, valor: parseFloat(String(ag?.valorTotal ?? 0)), pacoteClienteItemId: null }];
    }
    return [];
  }, [itens, servico, servicos, ag]);

  const iniciarEdicaoServicos = () => {
    if (servicosDoAgendamento.length > 0) {
      setServicosEdit(servicosDoAgendamento.map(s => ({
        servicoId: String(s.servicoId),
        profissionalId: s.profissionalId ? String(s.profissionalId) : "",
        valorUnitario: s.valor.toFixed(2),
        horaInicio: s.horaInicio ? String(s.horaInicio).slice(0, 5) : "",
        horaFim: s.horaFim ? String(s.horaFim).slice(0, 5) : "",
      })));
    } else {
      setServicosEdit([{ servicoId: "", profissionalId: "", valorUnitario: "", horaInicio: "", horaFim: "" }]);
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
      profissionalIdPrincipal: validos[0].profissionalId ? parseInt(validos[0].profissionalId) : undefined,
      servicos: validos.map(s => ({
        servicoId: parseInt(s.servicoId),
        profissionalId: s.profissionalId ? parseInt(s.profissionalId) : undefined,
        horaInicio: s.horaInicio ? s.horaInicio + ":00" : undefined,
        horaFim: s.horaFim ? s.horaFim + ":00" : undefined,
        valorUnitario: s.valorUnitario || "0",
      })),
      valorTotal: total.toFixed(2),
    });
  };

  const handleStatus = (status: string) => {
    if (status === "concluido") {
      // Abre modal de resumo de conclusão antes de confirmar
      setResumoConclusaoModal(true);
      return;
    }
    updateMutation.mutate({ id: agendamentoId, status: status as Parameters<typeof updateMutation.mutate>[0]["status"] } as Parameters<typeof updateMutation.mutate>[0]);
  };

  const confirmarConclusao = () => {
    // Pré-preencher percentual: prioridade serviço > profissional
    const pctServico = (servico as any)?.percentualComissao ? parseFloat(String((servico as any).percentualComissao)) : 0;
    const pctProfissional = (profissional as any)?.percentualComissao ? parseFloat(String((profissional as any).percentualComissao)) : 0;
    const pct = pctServico > 0 ? pctServico : pctProfissional;
    const custoServico = (servico as any)?.custoFixo ? parseFloat(String((servico as any).custoFixo)) : 0;
    setComissaoForm(f => ({
      ...f,
      percentualComissao: pct > 0 ? String(pct) : "",
      custoReposicao: custoServico > 0 ? String(custoServico) : "",
    }));
    setResumoConclusaoModal(false);
    updateMutation.mutate({ id: agendamentoId, status: "concluido" } as any, {
      onSuccess: () => {
        if (ag?.profissionalId) setComissaoModal(true);
      }
    });
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
      <DialogContent className="max-w-md p-0 overflow-hidden gap-0 max-h-[90vh] flex flex-col" showCloseButton={false}>
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
                  {servicosDoAgendamento.map((s, i) => {
                    const profItem = s.profissionalId
                      ? profissionais?.find(p => p.id === s.profissionalId)
                      : profissional;
                    const horaItemStr = s.horaInicio && s.horaFim
                      ? `${String(s.horaInicio).slice(0, 5)} – ${String(s.horaFim).slice(0, 5)}`
                      : null;
                    return (
                    <div key={i} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-1 min-w-0">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">{s.nome}</p>
                          {(profItem || horaItemStr) && (
                            <p className="text-[10px] text-muted-foreground">
                              {profItem?.nome}{profItem && horaItemStr ? " · " : ""}{horaItemStr}
                            </p>
                          )}
                        </div>
                        {s.pacoteClienteItemId && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-violet-600 bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-800/40 rounded-full px-1.5 py-0.5 flex-shrink-0">
                            📦 Pacote
                          </span>
                        )}
                      </div>
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
                    );
                  })}
                </div>
                <div className="flex items-center gap-2 mt-1">
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
                  {servicosEdit.map((item, index) => {
                    // Serviços filtrados pelo profissional do item
                    const profIdNum = item.profissionalId ? parseInt(item.profissionalId) : null;
                    const servicosDisponiveis = servicos?.filter((s: any) => s.ativo) ?? [];
                    return (
                    <div key={index} className="space-y-1.5 p-2 rounded-lg border border-border/40 bg-muted/20">
                      {/* Passo 1: Profissional */}
                      <Select
                        value={item.profissionalId || "__none__"}
                        onValueChange={(v) => setServicosEdit(prev => prev.map((it, i) =>
                          i === index ? { ...it, profissionalId: v === "__none__" ? "" : v, servicoId: "", valorUnitario: "" } : it
                        ))}
                      >
                        <SelectTrigger className="h-8 text-xs w-full">
                          <SelectValue placeholder="Selecionar profissional" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__" disabled>Selecionar profissional</SelectItem>
                          {profissionais?.filter((p: any) => p.ativo).map((p: any) => (
                            <SelectItem key={p.id} value={String(p.id)}>{p.nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {/* Passo 2: Serviço + valor + remover */}
                      <div className="flex gap-1.5 items-center">
                        <Select
                          value={item.servicoId || "__none__"}
                          onValueChange={(v) => {
                            const s = servicos?.find((sv: any) => sv.id === parseInt(v));
                            setServicosEdit(prev => prev.map((it, i) => i === index
                              ? { ...it, servicoId: v === "__none__" ? "" : v, valorUnitario: s ? String(parseFloat(String(s.valor)).toFixed(2)) : it.valorUnitario }
                              : it
                            ));
                          }}
                          disabled={!item.profissionalId}
                        >
                          <SelectTrigger className="h-8 text-xs flex-1">
                            <SelectValue placeholder={!item.profissionalId ? "Selecione o profissional" : "Serviço"} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__" disabled>Selecionar serviço</SelectItem>
                            {servicosDisponiveis.map((s: any) => (
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
                      {/* Horário por item */}
                      {item.servicoId && (
                        <div className="flex gap-1.5 items-center">
                          <div className="flex-1">
                            <Label className="text-[9px] text-muted-foreground mb-0.5 block">Início</Label>
                            <Input type="time" value={item.horaInicio ?? ""}
                              onChange={e => setServicosEdit(prev => prev.map((it, i) => i === index ? { ...it, horaInicio: e.target.value } : it))}
                              className="h-7 text-xs" />
                          </div>
                          <div className="flex-1">
                            <Label className="text-[9px] text-muted-foreground mb-0.5 block">Fim</Label>
                            <Input type="time" value={item.horaFim ?? ""}
                              onChange={e => setServicosEdit(prev => prev.map((it, i) => i === index ? { ...it, horaFim: e.target.value } : it))}
                              className="h-7 text-xs" />
                          </div>
                        </div>
                      )}
                    </div>
                    );
                  })}
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

          {/* ─── Seção Pagamentos e Desconto (apenas admin) ─── */}
          {isAdmin && (() => {
            const totalItens = parseFloat(String(ag.valorTotal ?? 0));
            const desconto = parseFloat(String((ag as any).desconto ?? 0));
            const totalPago = (pagamentos ?? []).reduce((acc, p) => acc + parseFloat(String(p.valor)), 0);
            const emAberto = Math.max(0, totalItens - desconto - totalPago);
            const fmt = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
            return (
              <div className="rounded-xl overflow-hidden" style={{ border: "1px solid oklch(91% 0.010 250)" }}>
                {/* Header da seção */}
                <div className="flex items-center justify-between px-4 py-2.5"
                  style={{ background: "oklch(97% 0.006 250)", borderBottom: "1px solid oklch(91% 0.010 250)" }}>
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Pagamento</span>
                  </div>
                  {emAberto > 0 && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 border-amber-400 text-amber-600 bg-amber-50">
                      Em aberto
                    </Badge>
                  )}
                  {emAberto <= 0 && totalPago > 0 && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 border-green-400 text-green-600 bg-green-50">
                      Quitado
                    </Badge>
                  )}
                </div>

                <div className="p-4 space-y-3">
                  {/* Pagamentos registrados */}
                  {(pagamentos ?? []).length > 0 && (
                    <div className="space-y-1.5">
                      {(pagamentos ?? []).map((p) => (
                        <div key={p.id} className="flex items-center justify-between gap-2 text-sm">
                          <div className="flex items-center gap-1.5 flex-1 min-w-0">
                            <Check className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                            <span className="text-xs text-muted-foreground truncate">
                              {p.meioPagamento || "Pagamento"}
                              {p.observacao && <span className="ml-1 opacity-60">· {p.observacao}</span>}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <span className="text-xs font-semibold text-green-600">{fmt(parseFloat(String(p.valor)))}</span>
                            <button
                              onClick={() => removePagamentoMutation.mutate({ id: p.id })}
                              disabled={removePagamentoMutation.isPending}
                              className="text-muted-foreground hover:text-destructive transition-colors"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Formulário adicionar pagamento */}
                  {/* Badge de crédito disponível */}
                  {saldoCredito > 0 && (
                    <div className="flex items-center justify-between p-2.5 rounded-lg" style={{ background: "oklch(62% 0.18 155 / 8%)", border: "1px solid oklch(62% 0.18 155 / 25%)" }}>
                      <div className="flex items-center gap-2">
                        <Wallet className="w-3.5 h-3.5" style={{ color: "oklch(35% 0.14 155)" }} />
                        <span className="text-xs font-medium" style={{ color: "oklch(35% 0.14 155)" }}>
                          Crédito disponível: {fmt(saldoCredito)}
                        </span>
                      </div>
                      {emAberto > 0 && (
                        <button
                          onClick={() => {
                            const valorUsar = Math.min(saldoCredito, emAberto);
                            usarCreditoMutation.mutate({
                              clienteId: ag.clienteId!,
                              valor: valorUsar,
                              agendamentoId,
                              origem: `Crédito usado no agendamento #${agendamentoId}`,
                            });
                          }}
                          disabled={usarCreditoMutation.isPending}
                          className="text-[11px] font-semibold px-2 py-1 rounded-md transition-all disabled:opacity-50"
                          style={{ background: "oklch(62% 0.18 155 / 15%)", color: "oklch(28% 0.14 155)", border: "1px solid oklch(62% 0.18 155 / 35%)" }}
                        >
                          {usarCreditoMutation.isPending ? "Aplicando..." : "Usar crédito"}
                        </button>
                      )}
                    </div>
                  )}

                  {showAddPagamento ? (
                    <div className="space-y-2 p-3 rounded-lg" style={{ background: "oklch(97.5% 0.006 250)", border: "1px solid oklch(91% 0.010 250)" }}>
                      <div className="space-y-2">
                        <div>
                          <Label className="text-[10px] text-muted-foreground mb-1 block">Valor (R$) *</Label>
                          <Input
                            type="number" step="0.01" min="0.01" placeholder="0,00"
                            value={novoPagamento.valor}
                            onChange={e => setNovoPagamento(p => ({ ...p, valor: e.target.value }))}
                            className="h-9 text-sm"
                            autoFocus
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] text-muted-foreground mb-1 block">Meio de Pagamento</Label>
                          <Select
                            value={novoPagamento.meioPagamento}
                            onValueChange={v => setNovoPagamento(p => ({ ...p, meioPagamento: v }))}
                          >
                            <SelectTrigger className="h-9 text-sm">
                              <SelectValue placeholder="Selecionar" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                              <SelectItem value="PIX">PIX</SelectItem>
                              <SelectItem value="Cartão Débito">Cartão Débito</SelectItem>
                              <SelectItem value="Cartão Crédito">Cartão Crédito</SelectItem>
                              {(meiosPagamento ?? []).filter(m => m.ativo).map(m => (
                                <SelectItem key={m.id} value={m.nome}>{m.nome}</SelectItem>
                              ))}
                              <SelectItem value="Outro">Outro</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      {novoPagamento.meioPagamento === "Cartão Crédito" && (
                        <div>
                          <Label className="text-[10px] text-muted-foreground mb-1 block">Parcelamento</Label>
                          <Select
                            value={String(novoPagamento.numeroParcelas)}
                            onValueChange={v => setNovoPagamento(p => ({ ...p, numeroParcelas: parseInt(v) }))}
                          >
                            <SelectTrigger className="h-9 text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1">À vista (1x)</SelectItem>
                              {[2,3,4,5,6,7,8,9,10,11,12].map(n => (
                                <SelectItem key={n} value={String(n)}>{n}x</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      <div>
                        <Label className="text-[10px] text-muted-foreground mb-1 block">Observação <span className="opacity-60">(opcional)</span></Label>
                        <Input
                          placeholder="Ex: sinal, parcela 1..."
                          value={novoPagamento.observacao}
                          onChange={e => setNovoPagamento(p => ({ ...p, observacao: e.target.value }))}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="flex gap-2 pt-1">
                        <Button size="sm" variant="outline" className="h-7 text-xs flex-1" onClick={() => setShowAddPagamento(false)}>Cancelar</Button>
                        <Button
                          size="sm" className="h-7 text-xs flex-1"
                          disabled={!novoPagamento.valor || addPagamentoMutation.isPending}
                          onClick={() => {
                            if (!novoPagamento.valor) return;
                            addPagamentoMutation.mutate({
                              agendamentoId,
                              valor: novoPagamento.valor,
                              meioPagamento: novoPagamento.meioPagamento || undefined,
                              numeroParcelas: novoPagamento.meioPagamento === "Cartão Crédito" ? novoPagamento.numeroParcelas : undefined,
                              observacao: novoPagamento.observacao || undefined,
                            });
                          }}
                        >
                          {addPagamentoMutation.isPending ? "Salvando..." : "Registrar"}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      <button
                        onClick={() => setShowAddPagamento(true)}
                        className="flex items-center gap-1.5 text-xs text-primary hover:underline font-medium"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Adicionar pagamento
                      </button>
                      <button
                        onClick={() => comprovanteInputRef.current?.click()}
                        disabled={lerComprovanteMutation.isPending}
                        className="flex items-center gap-1.5 text-xs text-violet-600 hover:underline font-medium disabled:opacity-50"
                      >
                        {lerComprovanteMutation.isPending ? (
                          <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Lendo comprovante...</>
                        ) : (
                          <><ScanLine className="w-3.5 h-3.5" /> Ler comprovante (IA)</>
                        )}
                      </button>
                      <input
                        ref={comprovanteInputRef}
                        type="file"
                        accept="image/*,application/pdf"
                        className="hidden"
                        onChange={handleComprovanteUpload}
                      />
                    </div>
                  )}

                  <Separator className="my-1" />

                  {/* Resumo financeiro */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Itens</span>
                      <span className="font-medium">{fmt(totalItens)}</span>
                    </div>

                    {/* Desconto */}
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <Tag className="w-3 h-3 text-muted-foreground" />
                        <span className="text-muted-foreground">Desconto</span>
                      </div>
                      {editandoDesconto ? (
                        <div className="flex items-center gap-1.5">
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">R$</span>
                            <Input
                              type="number" step="0.01" min="0"
                              value={descontoEdit}
                              onChange={e => setDescontoEdit(e.target.value)}
                              className="pl-7 h-6 text-xs w-24"
                              autoFocus
                            />
                          </div>
                          <button onClick={() => setEditandoDesconto(false)} className="text-[10px] text-muted-foreground hover:underline">cancelar</button>
                          <button
                            onClick={() => updateDescontoMutation.mutate({ agendamentoId, desconto: descontoEdit || "0" })}
                            disabled={updateDescontoMutation.isPending}
                            className="text-[10px] text-primary font-semibold hover:underline disabled:opacity-50"
                          >
                            {updateDescontoMutation.isPending ? "..." : "salvar"}
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <span className={`font-medium ${desconto > 0 ? "text-amber-600" : ""}`}>
                            {desconto > 0 ? `- ${fmt(desconto)}` : fmt(0)}
                          </span>
                          <button
                            onClick={() => { setDescontoEdit(String(desconto || "")); setEditandoDesconto(true); }}
                            className="text-[10px] text-muted-foreground hover:text-primary"
                          >
                            editar
                          </button>
                        </div>
                      )}
                    </div>

                    {totalPago > 0 && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Pago</span>
                        <span className="font-medium text-green-600">- {fmt(totalPago)}</span>
                      </div>
                    )}

                    <Separator className="my-0.5" />

                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold">Em aberto</span>
                      <span className={`text-sm font-bold ${
                        emAberto <= 0 ? "text-green-600" : "text-amber-600"
                      }`}>
                        {emAberto <= 0 ? "Quitado" : fmt(emAberto)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {ag.observacoes && (
            <div className="rounded-xl p-3.5"
              style={{ background: "oklch(97.5% 0.006 250)", border: "1px solid oklch(91% 0.010 250)" }}>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Observações</p>
              <p className="text-sm">{ag.observacoes}</p>
            </div>
          )}

          {/* ── Seção: Pessoas da Reserva ── */}
          {isAdmin && (
            <div className="rounded-xl overflow-hidden"
              style={{ background: "oklch(97.5% 0.006 250)", border: "1px solid oklch(91% 0.010 250)" }}>
              <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "oklch(91% 0.010 250)" }}>
                <div className="flex items-center gap-2">
                  <Users className="w-3.5 h-3.5 text-muted-foreground" />
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Pessoas da Reserva</p>
                  {pessoasReserva.length > 0 && (
                    <span className="text-[10px] bg-muted text-muted-foreground rounded-full px-1.5 py-0.5">{pessoasReserva.length}</span>
                  )}
                </div>
                <button
                  onClick={() => setMostrarAddPessoa(v => !v)}
                  className="flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-lg transition-colors"
                  style={{ color: "oklch(45% 0.18 264)", background: "oklch(55% 0.22 264 / 10%)" }}
                >
                  <UserPlus className="w-3 h-3" />
                  Adicionar
                </button>
              </div>

              {/* Lista de pessoas */}
              {pessoasReserva.length > 0 && (
                <div className="divide-y" style={{ borderColor: "oklch(91% 0.010 250)" }}>
                  {pessoasReserva.map((p: any) => (
                    <div key={p.id} className="flex items-center justify-between px-4 py-2.5 group hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                          p.isPrincipal ? 'bg-amber-100' : 'bg-muted'
                        }`}>
                          {p.isPrincipal
                            ? <Crown className="w-3 h-3 text-amber-600" />
                            : <User className="w-3 h-3 text-muted-foreground" />
                          }
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{p.clienteNome ?? 'Cliente'}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {p.isPrincipal ? 'Contato principal' : (
                              p.role === 'acompanhante' ? 'Acompanhante' :
                              p.role === 'dependente' ? 'Dependente' : 'Outro'
                            )}
                            {p.clienteTelefone && <span> · {p.clienteTelefone}</span>}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!p.isPrincipal && (
                          <button
                            title="Definir como contato principal"
                            className="p-1 rounded hover:bg-amber-50 text-muted-foreground hover:text-amber-600 transition-colors"
                            onClick={() => definirPrincipalMutation.mutate({ agendamentoId, pessoaId: p.id })}
                          >
                            <Star className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          title="Remover"
                          className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors"
                          onClick={() => removerPessoaMutation.mutate({ id: p.id, agendamentoId })}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {pessoasReserva.length === 0 && !mostrarAddPessoa && (
                <div className="px-4 py-4 text-center">
                  <p className="text-xs text-muted-foreground">Nenhuma pessoa vinculada. Adicione acompanhantes ou dependentes.</p>
                </div>
              )}

              {/* Formulário de adicionar pessoa */}
              {mostrarAddPessoa && (
                <div className="px-4 py-3 space-y-2.5 border-t" style={{ borderColor: "oklch(91% 0.010 250)" }}>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Cliente</Label>
                    <Select value={novaClienteId} onValueChange={setNovaClienteId}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Selecionar cliente..." />
                      </SelectTrigger>
                      <SelectContent>
                        {(clientes ?? []).filter((c: any) => c.id !== ag.clienteId).map((c: any) => (
                          <SelectItem key={c.id} value={String(c.id)}>{c.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Relação</Label>
                    <Select value={novaRole} onValueChange={(v: any) => setNovaRole(v)}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="acompanhante">Acompanhante</SelectItem>
                        <SelectItem value="dependente">Dependente</SelectItem>
                        <SelectItem value="outro">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm" variant="outline" className="flex-1 h-7 text-xs"
                      onClick={() => { setMostrarAddPessoa(false); setNovaClienteId(""); }}
                    >Cancelar</Button>
                    <Button
                      size="sm" className="flex-1 h-7 text-xs"
                      disabled={!novaClienteId || adicionarPessoaMutation.isPending}
                      onClick={() => adicionarPessoaMutation.mutate({
                        agendamentoId,
                        clienteId: parseInt(novaClienteId),
                        role: novaRole,
                        isPrincipal: false,
                      })}
                    >
                      {adicionarPessoaMutation.isPending ? 'Adicionando...' : 'Adicionar'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Seção: Mensagens Enviadas ── */}
          {isAdmin && mensagens.length > 0 && (
            <div className="rounded-xl overflow-hidden" style={{ border: "1px solid oklch(91% 0.010 250)" }}>
              <button
                className="w-full flex items-center justify-between px-4 py-2.5 transition-colors hover:bg-muted/30"
                style={{ background: "oklch(97% 0.006 250)", borderBottom: mostrarMensagens ? "1px solid oklch(91% 0.010 250)" : undefined }}
                onClick={() => setMostrarMensagens(v => !v)}
              >
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-3.5 h-3.5 text-green-500" />
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Mensagens Enviadas</span>
                  <span className="text-[10px] bg-muted text-muted-foreground rounded-full px-1.5 py-0.5">{mensagens.length}</span>
                </div>
                {mostrarMensagens ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
              </button>
              {mostrarMensagens && (
                <div className="divide-y" style={{ borderColor: "oklch(91% 0.010 250)" }}>
                  {mensagens.map((m: any) => {
                    const statusColor = m.status === 'enviado' ? 'text-green-600' : m.status === 'falhou' ? 'text-red-500' : 'text-amber-500';
                    const statusLabel = m.status === 'enviado' ? 'Enviado' : m.status === 'falhou' ? 'Falhou' : m.status === 'pendente' ? 'Pendente' : 'Agendado';
                    const deliveryLabel = m.messageStatus === 'read' ? '✓✓ Lido' : m.messageStatus === 'delivered' ? '✓✓ Entregue' : m.messageStatus === 'sent' ? '✓ Enviado' : m.messageStatus === 'failed' ? '✗ Falhou' : null;
                    return (
                      <div key={m.id} className="px-4 py-3 space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-foreground truncate flex-1">{m.automacaoNome || 'Automação'}</span>
                          <span className={`text-[10px] font-semibold ${statusColor}`}>{statusLabel}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                          <span>{new Date(m.criadoEm).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                          {deliveryLabel && <span className="text-green-600 font-medium">{deliveryLabel}</span>}
                        </div>
                        {m.mensagem && (
                          <p className="text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2 whitespace-pre-wrap line-clamp-3">{m.mensagem}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Botão Editar Agendamento */}
          {isAdmin && (
            <div>
              <button
                onClick={() => setEditarModal(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={{ background: "oklch(55% 0.22 264 / 10%)", color: "oklch(45% 0.18 264)", border: "1px solid oklch(55% 0.22 264 / 25%)" }}
              >
                <Edit3 className="w-4 h-4" />
                Editar Agendamento
              </button>
            </div>
          )}

          {/* Ações */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2.5">
              Alterar status
            </p>
            <div className="flex flex-wrap gap-2">
              {/* Reserva Recebida: para qualquer pré-agendado, independente de ter valorReserva */}
              {ag.status === "pre_agendado" && (
                <ActionBtn
                  label={confirmarReservaMutation.isPending ? "Confirmando..." : "Reserva Recebida"}
                  icon={CheckCircle2}
                  bg="oklch(55% 0.22 155 / 14%)"
                  color="oklch(28% 0.14 155)"
                  border="oklch(55% 0.22 155 / 35%)"
                  onClick={() => confirmarReservaMutation.mutate({ id: ag.id })}
                  loading={confirmarReservaMutation.isPending}
                />
              )}
              {/* Confirmar: não mostrar se já está confirmado ou mais avançado */}
              {!["confirmado", "concluido", "faltou"].includes(ag.status) && (
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
              {/* Link de confirmação: sempre disponível */}
              <ActionBtn
                label={gerarLinkMutation.isPending ? "Gerando..." : linkCopiado ? "Copiado!" : "Link Confirm."}
                icon={linkCopiado ? Check : Link2}
                bg="oklch(55% 0.22 264 / 10%)"
                color="oklch(45% 0.18 264)"
                border="oklch(55% 0.22 264 / 25%)"
                onClick={() => gerarLinkMutation.mutate({ agendamentoId: ag.id, origin: window.location.origin })}
                loading={gerarLinkMutation.isPending}
              />
              {/* Concluído: não mostrar se já está concluído */}
              {ag.status !== "concluido" && (
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
              {/* Faltou: não mostrar se já está faltou */}
              {ag.status !== "faltou" && (
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
              {/* Cancelar: não mostrar se já está cancelado */}
              {ag.status !== "cancelado" && (
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
              {/* Confirmar Sinal Fora do Prazo: apenas para agendamentos cancelados que tinham valorReserva */}
              {ag.status === "cancelado" && ag.valorReserva && parseFloat(String(ag.valorReserva)) > 0 && (
                <ActionBtn
                  label="Sinal Recebido"
                  icon={DollarSign}
                  bg="oklch(55% 0.22 155 / 14%)"
                  color="oklch(28% 0.14 155)"
                  border="oklch(55% 0.22 155 / 35%)"
                  onClick={() => {
                    setSinalValor(String(ag.valorReserva ?? ""));
                    setSinalForaDoPrazoModal(true);
                  }}
                  loading={confirmarSinalForaDoPrazoMutation.isPending}
                />
              )}
            </div>
          </div>

          {/* Zona de perigo: excluir agendamento */}
          <div className="border-t pt-4 mt-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2.5">
              Zona de perigo
            </p>
            <button
              onClick={() => setConfirmarExclusaoModal(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-red-600 bg-red-50 border border-red-200 hover:bg-red-100 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Excluir agendamento
            </button>
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
         {/* Barra fixa de pagamento no rodé (apenas admin) */}
        {isAdmin && (() => {
          const totalItens = parseFloat(String(ag.valorTotal ?? 0));
          const desconto = parseFloat(String((ag as any).desconto ?? 0));
          const totalPago = (pagamentos ?? []).reduce((acc, p) => acc + parseFloat(String(p.valor)), 0);
          const emAberto = Math.max(0, totalItens - desconto - totalPago);
          const fmt = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
          return (
            <div className="border-t px-4 py-2.5 flex items-center justify-between gap-3 flex-shrink-0"
              style={{ borderColor: "oklch(91% 0.010 250)", background: "oklch(97% 0.006 250)" }}>
              <div className="flex items-center gap-3 text-xs">
                <span className="text-muted-foreground">Total</span>
                <span className="font-bold">{fmt(totalItens)}</span>
                {desconto > 0 && <span className="text-amber-600 text-[11px]">- {fmt(desconto)}</span>}
                {totalPago > 0 && <span className="text-green-600 text-[11px]">pago {fmt(totalPago)}</span>}
              </div>
              <div className="flex items-center gap-2">
                {emAberto > 0 && (
                  <span className="text-[11px] font-bold text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                    {fmt(emAberto)} em aberto
                  </span>
                )}
                {emAberto <= 0 && totalPago > 0 && (
                  <span className="text-[11px] font-bold text-green-600 bg-green-50 border border-green-200 rounded-full px-2 py-0.5">
                    Quitado
                  </span>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs gap-1.5 border-primary/30 text-primary hover:bg-primary/5"
                  onClick={() => setShowAddPagamento(true)}
                >
                  <Plus className="w-3.5 h-3.5" />
                  Pagamento
                </Button>
              </div>
            </div>
          );
        })()}

      </DialogContent>
    </Dialog>

    {/* Modal de Edição Completa */}
    <EditarAgendamentoModal
      agendamentoId={agendamentoId}
      open={editarModal}
      onClose={() => setEditarModal(false)}
    />

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

    {/* Modal de Confirmação de Exclusão */}
    <Dialog open={confirmarExclusaoModal} onOpenChange={setConfirmarExclusaoModal}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-bold tracking-tight flex items-center gap-2 text-red-600">
            <Trash2 className="w-4 h-4" />
            Excluir Agendamento
          </DialogTitle>
        </DialogHeader>
        <div className="py-2 space-y-3">
          <p className="text-sm text-muted-foreground">
            Esta ação é <strong className="text-foreground">permanente e irreversível</strong>. Todos os dados vinculados serão removidos:
          </p>
          <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
            <li>Itens e serviços do agendamento</li>
            <li>Pagamentos registrados</li>
            <li>Comissões vinculadas</li>
            <li>Prontuários e anotações</li>
            <li>Vínculos com pipeline</li>
          </ul>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setConfirmarExclusaoModal(false)}>Cancelar</Button>
          <Button
            onClick={() => deleteMutation.mutate({ id: agendamentoId })}
            disabled={deleteMutation.isPending}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {deleteMutation.isPending ? "Excluindo..." : "Excluir permanentemente"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Modal de Resumo de Conclusão */}
    <Dialog open={resumoConclusaoModal} onOpenChange={setResumoConclusaoModal}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-bold tracking-tight flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            Concluir Atendimento
          </DialogTitle>
        </DialogHeader>
        {ag && (() => {
          const totalItens = parseFloat(String(ag.valorTotal ?? 0));
          const desconto = parseFloat(String((ag as any).desconto ?? 0));
          const totalPago = (pagamentos ?? []).reduce((acc, p) => acc + parseFloat(String(p.valor)), 0);
          const emAberto = Math.max(0, totalItens - desconto - totalPago);
          const fmt = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
          const clienteNome = clientes?.find(c => c.id === ag.clienteId)?.nome ?? "Cliente";
          return (
            <div className="space-y-4 py-2">
              <div className="rounded-lg bg-secondary/50 p-3 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Resumo do Atendimento</p>
                <p className="text-sm font-medium">{clienteNome}</p>
                <div className="space-y-1">
                  {servicosDoAgendamento.map((s, i) => (
                    <div key={i} className="flex justify-between text-xs">
                      <span className="text-muted-foreground">{s.nome}</span>
                      <span className="font-medium">{fmt(s.valor)}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">{fmt(totalItens)}</span>
                </div>
                {desconto > 0 && (
                  <div className="flex justify-between text-amber-600">
                    <span>Desconto</span>
                    <span>- {fmt(desconto)}</span>
                  </div>
                )}
                {totalPago > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Já pago</span>
                    <span>- {fmt(totalPago)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold pt-1 border-t">
                  <span>Em aberto</span>
                  <span className={emAberto > 0 ? "text-amber-600" : "text-green-600"}>
                    {emAberto > 0 ? fmt(emAberto) : "Quitado"}
                  </span>
                </div>
              </div>
              {emAberto > 0 && (
                <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-amber-700">Ainda há {fmt(emAberto)} em aberto. Você pode registrar o pagamento antes ou após concluir.</p>
                </div>
              )}
            </div>
          );
        })()}
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setResumoConclusaoModal(false)}>Voltar</Button>
          <Button
            onClick={confirmarConclusao}
            disabled={updateMutation.isPending}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {updateMutation.isPending ? "Concluindo..." : "Confirmar Conclusão"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Modal de Confirmar Sinal Fora do Prazo */}
    <Dialog open={sinalForaDoPrazoModal} onOpenChange={(open) => { if (!open) { setSinalForaDoPrazoModal(false); setSinalValor(""); setSinalObs(""); } }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-bold tracking-tight flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-green-600" />
            Confirmar Sinal Recebido
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
            <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-700">
              O prazo de pagamento do sinal havia expirado e o agendamento foi cancelado automaticamente.
              Ao confirmar o recebimento, o agendamento volta para o status <strong>Agendado</strong> e o valor é registrado no financeiro.
            </p>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Valor do sinal recebido (R$)</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={sinalValor}
              onChange={e => setSinalValor(e.target.value)}
              placeholder="0,00"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Observação <span className="text-muted-foreground/60">(opcional)</span></Label>
            <Input
              value={sinalObs}
              onChange={e => setSinalObs(e.target.value)}
              placeholder="Ex: cliente pagou via PIX após o prazo"
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => { setSinalForaDoPrazoModal(false); setSinalValor(""); setSinalObs(""); }}>Cancelar</Button>
          <Button
            onClick={() => confirmarSinalForaDoPrazoMutation.mutate({
              id: agendamentoId,
              valorSinal: sinalValor || undefined,
              observacao: sinalObs || undefined,
            })}
            disabled={confirmarSinalForaDoPrazoMutation.isPending}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {confirmarSinalForaDoPrazoMutation.isPending ? "Confirmando..." : "Confirmar Recebimento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Modal de Preview de PDF */}
    <Dialog open={showPdfPreview} onOpenChange={setShowPdfPreview}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Preview do Comprovante (PDF)</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-auto bg-muted rounded-lg">
          {pdfPreview && (
            <iframe
              src={pdfPreview}
              className="w-full h-full min-h-[400px]"
              title="PDF Preview"
            />
          )}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleCancelPdfPreview}>
            Cancelar
          </Button>
          <Button onClick={handleConfirmPdfPreview} disabled={lerComprovanteMutation.isPending}>
            {lerComprovanteMutation.isPending ? "Processando..." : "Confirmar e Processar"}
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
