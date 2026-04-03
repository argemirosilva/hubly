import { trpc } from "@/lib/trpc";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Clock, User, Sparkles, DollarSign, X, Calendar, Percent } from "lucide-react";
import { useState } from "react";
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
  const { data: clientes } = trpc.clientes.list.useQuery();
  const { data: profissionais } = trpc.profissionais.listParaAgendamento.useQuery();
  const { data: servicos } = trpc.servicos.list.useQuery();

  const [comissaoModal, setComissaoModal] = useState(false);
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

  const handleStatus = (status: string) => {
    if (status === "concluido") {
      // Pré-preencher percentual: prioridade serviço > profissional
      const pctServico = (servico as any)?.percentualComissao ? parseFloat(String((servico as any).percentualComissao)) : 0;
      const pctProfissional = (profissional as any)?.percentualComissao ? parseFloat(String((profissional as any).percentualComissao)) : 0;
      const pct = pctServico > 0 ? pctServico : pctProfissional;
      setComissaoForm(f => ({ ...f, percentualComissao: pct > 0 ? String(pct) : "" }));
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

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: profissional?.corCalendario ? `${profissional.corCalendario}20` : "oklch(60% 0.20 300 / 10%)" }}>
                <Sparkles className="w-3.5 h-3.5" style={{ color: profissional?.corCalendario ?? "oklch(42% 0.16 300)" }} />
              </div>
              <div>
                <p className="text-sm font-semibold">{servico?.nome ?? "—"}</p>
                <p className="text-xs text-muted-foreground">com {profissional?.nome ?? "—"}</p>
              </div>
            </div>

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
              <Label className="text-xs text-muted-foreground mb-1.5 block">% Comissão</Label>
              <Input
                type="number" min="0" max="100" step="0.5"
                value={comissaoForm.percentualComissao}
                onChange={e => setComissaoForm(f => ({ ...f, percentualComissao: e.target.value }))}
                placeholder="Ex: 40"
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
