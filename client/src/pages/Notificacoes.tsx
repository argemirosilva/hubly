import { useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  Bell, CheckCheck, Calendar, DollarSign, AlertCircle,
  Package, Clock, RefreshCw, ChevronRight, RotateCcw,
  Plus, Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatCurrency(v: number | string) {
  const num = typeof v === "string" ? parseFloat(v) : v;
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(isNaN(num) ? 0 : num);
}

function getNotifIcon(tipo?: string | null) {
  switch (tipo) {
    case "agendamento":        return { icon: Calendar,     bg: "oklch(55% 0.22 264 / 12%)", color: "oklch(45% 0.18 264)" };
    case "financeiro":         return { icon: DollarSign,   bg: "oklch(62% 0.18 155 / 12%)", color: "oklch(38% 0.14 155)" };
    case "alerta":             return { icon: AlertCircle,  bg: "oklch(72% 0.16 80 / 12%)",  color: "oklch(40% 0.14 75)"  };
    case "vencimento_proximo": return { icon: Clock,        bg: "oklch(72% 0.16 60 / 12%)",  color: "oklch(45% 0.18 55)"  };
    case "sessoes_restantes":  return { icon: Package,      bg: "oklch(62% 0.18 300 / 12%)", color: "oklch(38% 0.16 300)" };
    case "pacote_vencido":     return { icon: AlertCircle,  bg: "oklch(65% 0.20 25 / 12%)",  color: "oklch(40% 0.18 25)"  };
    default:                   return { icon: Bell,         bg: "oklch(55% 0.22 264 / 12%)", color: "oklch(45% 0.18 264)" };
  }
}

function formatarData(d: Date | string) {
  return new Date(d).toLocaleString("pt-BR", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

// ── Tipo unificado ────────────────────────────────────────────────────────────
type NotifUnificada = {
  id: number;
  origem: "sistema" | "pacote";
  tipo: string | null;
  titulo: string;
  mensagem: string;
  lida: boolean;
  data: Date | string;
  clienteNome?: string | null;
  clienteId?: number | null;
  pacoteClienteId?: number | null;
  diasParaVencer?: number | null;
  sessoesRestantes?: number | null;
};

// ── Modal de Renovação de Pacote ──────────────────────────────────────────────
function ModalRenovarPacote({
  open,
  onClose,
  clienteId,
  clienteNome,
  onRenovado,
}: {
  open: boolean;
  onClose: () => void;
  clienteId: number;
  clienteNome: string;
  onRenovado?: () => void;
}) {
  const utils = trpc.useUtils();
  const [modeloId, setModeloId] = useState("");
  const [nome, setNome] = useState("");
  const [valorPago, setValorPago] = useState("");
  const [formaPagamento, setFormaPagamento] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [itens, setItens] = useState<{ servicoId: number; quantidadeTotal: number }[]>([
    { servicoId: 0, quantidadeTotal: 1 },
  ]);

  const { data: modelos = [] } = trpc.pacotes.listarModelos.useQuery();
  const { data: servicosData = [] } = trpc.servicos.list.useQuery();

  function handleModeloChange(id: string) {
    setModeloId(id);
    const modelo = modelos.find((m: any) => m.id === parseInt(id));
    if (modelo) {
      setNome(modelo.nome);
      setValorPago(String(parseFloat(modelo.preco)));
      setItens(modelo.itens.map((i: any) => ({ servicoId: i.servicoId, quantidadeTotal: i.quantidade })));
    }
  }

  const abrirMutation = trpc.pacotes.abrirPacote.useMutation({
    onSuccess: () => {
      utils.pacotes.listarTodos.invalidate();
      utils.pacotes.listarNotificacoes.invalidate();
      utils.pacotes.contarNaoLidas.invalidate();
      toast.success(`Pacote renovado com sucesso para ${clienteNome}!`);
      onRenovado?.();
      onClose();
      // Resetar form
      setModeloId(""); setNome(""); setValorPago(""); setFormaPagamento(""); setObservacoes("");
      setItens([{ servicoId: 0, quantidadeTotal: 1 }]);
    },
    onError: (e) => toast.error(e.message),
  });

  function handleSalvar() {
    if (!nome || !valorPago || itens.some(i => !i.servicoId)) {
      toast.error("Preencha todos os campos obrigatórios."); return;
    }
    abrirMutation.mutate({
      clienteId,
      modeloId: modeloId ? parseInt(modeloId) : undefined,
      nome,
      valorPago: parseFloat(valorPago),
      formaPagamento: formaPagamento || undefined,
      observacoes: observacoes || undefined,
      itens: itens.filter(i => i.servicoId > 0),
    });
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="w-4 h-4" style={{ color: "oklch(55% 0.22 264)" }} />
            Renovar pacote — {clienteNome}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Modelo */}
          {modelos.filter((m: any) => m.ativo).length > 0 && (
            <div>
              <Label>Modelo de pacote <span className="text-muted-foreground">(opcional)</span></Label>
              <Select value={modeloId} onValueChange={handleModeloChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar modelo pré-definido" />
                </SelectTrigger>
                <SelectContent>
                  {modelos.filter((m: any) => m.ativo).map((m: any) => (
                    <SelectItem key={m.id} value={String(m.id)}>
                      {m.nome} — {formatCurrency(m.preco)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Nome */}
          <div>
            <Label>Nome do pacote *</Label>
            <Input
              value={nome}
              onChange={e => setNome(e.target.value)}
              placeholder="Ex: Pacote Manicure 4x"
            />
          </div>

          {/* Valor + Pagamento */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Valor pago (R$) *</Label>
              <Input
                type="number" min="0" step="0.01"
                value={valorPago}
                onChange={e => setValorPago(e.target.value)}
              />
            </div>
            <div>
              <Label>Forma de pagamento</Label>
              <Select value={formaPagamento} onValueChange={setFormaPagamento}>
                <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>
                  {["Dinheiro", "Pix", "Cartão de crédito", "Cartão de débito", "Transferência"].map(f => (
                    <SelectItem key={f} value={f}>{f}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Itens */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Itens do pacote *</Label>
              <Button
                size="sm" variant="outline"
                onClick={() => setItens([...itens, { servicoId: 0, quantidadeTotal: 1 }])}
                className="h-7 text-xs gap-1"
              >
                <Plus className="w-3 h-3" /> Adicionar
              </Button>
            </div>
            <div className="space-y-2">
              {itens.map((item, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <Select
                    value={String(item.servicoId || "")}
                    onValueChange={v => setItens(itens.map((it, idx) =>
                      idx === i ? { ...it, servicoId: parseInt(v) } : it
                    ))}
                  >
                    <SelectTrigger className="flex-1 h-9">
                      <SelectValue placeholder="Selecione o serviço" />
                    </SelectTrigger>
                    <SelectContent>
                      {servicosData.map((s: any) => (
                        <SelectItem key={s.id} value={String(s.id)}>{s.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setItens(itens.map((it, idx) =>
                        idx === i ? { ...it, quantidadeTotal: Math.max(1, it.quantidadeTotal - 1) } : it
                      ))}
                      className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-sm font-bold"
                    >−</button>
                    <span className="w-6 text-center text-sm font-semibold">{item.quantidadeTotal}</span>
                    <button
                      onClick={() => setItens(itens.map((it, idx) =>
                        idx === i ? { ...it, quantidadeTotal: it.quantidadeTotal + 1 } : it
                      ))}
                      className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-sm font-bold"
                    >+</button>
                  </div>
                  {itens.length > 1 && (
                    <button
                      onClick={() => setItens(itens.filter((_, idx) => idx !== i))}
                      className="text-red-400 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Observações */}
          <div>
            <Label>Observações</Label>
            <Textarea
              value={observacoes}
              onChange={e => setObservacoes(e.target.value)}
              rows={2}
              placeholder="Notas sobre a renovação..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            onClick={handleSalvar}
            disabled={abrirMutation.isPending}
            className="gap-2"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            {abrirMutation.isPending ? "Renovando..." : "Renovar pacote"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function Notificacoes() {
  const utils = trpc.useUtils();
  const [, setLocation] = useLocation();

  // Estado do modal de renovação
  const [renovarModal, setRenovarModal] = useState<{
    open: boolean;
    clienteId: number;
    clienteNome: string;
    notifId: number;
    notifOrigem: "sistema" | "pacote";
  } | null>(null);

  // ── Notificações do sistema ───────────────────────────────────────────────
  const { data: notifSistema } = trpc.notificacoes.list.useQuery();
  const marcarLidaSistemaMutation = trpc.notificacoes.marcarLida.useMutation({
    onSuccess: () => utils.notificacoes.list.invalidate(),
    onError: (err: any) => toast.error(err.message),
  });
  const marcarTodasSistemaMutation = trpc.notificacoes.marcarTodasLidas.useMutation({
    onSuccess: () => utils.notificacoes.list.invalidate(),
    onError: (err: any) => toast.error(err.message),
  });

  // ── Notificações de pacotes ───────────────────────────────────────────────
  const { data: notifPacotes } = trpc.pacotes.listarNotificacoes.useQuery({
    apenasNaoLidas: false,
    limite: 100,
  });
  const marcarLidaPacoteMutation = trpc.pacotes.marcarLida.useMutation({
    onSuccess: () => utils.pacotes.listarNotificacoes.invalidate(),
    onError: (err: any) => toast.error(err.message),
  });
  const marcarTodasPacotesMutation = trpc.pacotes.marcarTodasLidas.useMutation({
    onSuccess: () => utils.pacotes.listarNotificacoes.invalidate(),
    onError: (err: any) => toast.error(err.message),
  });
  const verificarMutation = trpc.pacotes.verificarPacotesVencendo.useMutation({
    onSuccess: (data) => {
      toast.success(`Verificação concluída: ${data.criadas} nova(s) notificação(ões) gerada(s).`);
      utils.pacotes.listarNotificacoes.invalidate();
      utils.pacotes.contarNaoLidas.invalidate();
    },
    onError: (err: any) => toast.error(err.message),
  });

  // ── Unificar e ordenar ────────────────────────────────────────────────────
  const lista: NotifUnificada[] = [
    ...(notifSistema ?? []).map(n => ({
      id: n.id,
      origem: "sistema" as const,
      tipo: (n as any).tipo ?? null,
      titulo: (n as any).titulo ?? "Notificação",
      mensagem: n.mensagem ?? "",
      lida: !!n.lida,
      data: (n as any).createdAt ?? new Date(),
    })),
    ...(notifPacotes ?? []).map(n => ({
      id: n.id,
      origem: "pacote" as const,
      tipo: n.tipo,
      titulo: n.tipo === "vencimento_proximo"
        ? `Pacote vencendo em ${n.diasParaVencer} dia(s)`
        : n.tipo === "sessoes_restantes"
          ? `Poucas sessões restantes`
          : `Pacote vencido`,
      mensagem: n.mensagem,
      lida: n.lida,
      data: n.enviadoEm,
      clienteNome: n.clienteNome,
      clienteId: n.clienteId,
      pacoteClienteId: n.pacoteClienteId,
      diasParaVencer: n.diasParaVencer,
      sessoesRestantes: n.sessoesRestantes,
    })),
  ].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

  const naoLidas = lista.filter(n => !n.lida).length;

  function marcarLida(n: NotifUnificada) {
    if (n.lida) return;
    if (n.origem === "sistema") {
      marcarLidaSistemaMutation.mutate({ id: n.id });
    } else {
      marcarLidaPacoteMutation.mutate({ id: n.id });
    }
  }

  function marcarTodasLidas() {
    const temSistema = (notifSistema ?? []).some(n => !n.lida);
    const temPacotes = (notifPacotes ?? []).some(n => !n.lida);
    if (temSistema) marcarTodasSistemaMutation.mutate();
    if (temPacotes) marcarTodasPacotesMutation.mutate();
    if (!temSistema && !temPacotes) toast.info("Nenhuma notificação não lida.");
    else toast.success("Todas marcadas como lidas!");
  }

  function abrirRenovar(n: NotifUnificada, e: React.MouseEvent) {
    e.stopPropagation();
    if (!n.clienteId || !n.clienteNome) return;
    setRenovarModal({
      open: true,
      clienteId: n.clienteId,
      clienteNome: n.clienteNome,
      notifId: n.id,
      notifOrigem: n.origem,
    });
  }

  // Ao renovar, marcar a notificação como lida automaticamente
  function handleRenovado() {
    if (!renovarModal) return;
    if (renovarModal.notifOrigem === "pacote") {
      marcarLidaPacoteMutation.mutate({ id: renovarModal.notifId });
    } else {
      marcarLidaSistemaMutation.mutate({ id: renovarModal.notifId });
    }
  }

  // Tipos de notificação de pacote que exibem o botão "Renovar"
  const tiposRenovaveis = ["vencimento_proximo", "sessoes_restantes", "pacote_vencido"];

  return (
    <div className="p-4 lg:p-6 space-y-4 max-w-3xl mx-auto animate-in-up">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-bold tracking-tight text-xl lg:text-2xl">Notificações</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {naoLidas > 0 ? `${naoLidas} não lida${naoLidas !== 1 ? "s" : ""}` : "Tudo em dia"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border transition-colors"
            style={{ borderColor: "oklch(88% 0.010 250)", color: "oklch(45% 0.010 260)" }}
            onClick={() => verificarMutation.mutate()}
            disabled={verificarMutation.isPending}
            title="Verificar pacotes vencendo e gerar alertas"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${verificarMutation.isPending ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Verificar pacotes</span>
          </button>
          {naoLidas > 0 && (
            <button
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border transition-colors"
              style={{ borderColor: "oklch(88% 0.010 250)", color: "oklch(45% 0.010 260)" }}
              onClick={marcarTodasLidas}
              disabled={marcarTodasSistemaMutation.isPending || marcarTodasPacotesMutation.isPending}
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Marcar todas como lidas</span>
              <span className="sm:hidden">Marcar lidas</span>
            </button>
          )}
        </div>
      </div>

      {/* Lista */}
      <div className="card-elegant overflow-hidden">
        {lista.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-center px-6">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: "oklch(55% 0.22 264 / 8%)" }}>
              <Bell className="w-5 h-5" style={{ color: "oklch(55% 0.22 264)" }} />
            </div>
            <p className="text-sm font-medium text-foreground mb-1">Nenhuma notificação</p>
            <p className="text-xs text-muted-foreground mb-4">
              Clique em "Verificar pacotes" para checar alertas de vencimento.
            </p>
            <button
              className="flex items-center gap-1.5 text-xs font-medium px-4 py-2 rounded-lg transition-colors"
              style={{ background: "oklch(55% 0.22 264 / 10%)", color: "oklch(45% 0.18 264)" }}
              onClick={() => verificarMutation.mutate()}
              disabled={verificarMutation.isPending}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${verificarMutation.isPending ? "animate-spin" : ""}`} />
              Verificar agora
            </button>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: "oklch(94% 0.008 250)" }}>
            {lista.map(n => {
              const { icon: NIcon, bg, color } = getNotifIcon(n.tipo);
              const podeRenovar = n.origem === "pacote" && n.clienteId && n.clienteNome
                && tiposRenovaveis.includes(n.tipo ?? "");

              return (
                <div
                  key={`${n.origem}-${n.id}`}
                  className="flex items-start gap-3 px-4 py-4 cursor-pointer transition-colors"
                  style={{ background: !n.lida ? "oklch(55% 0.22 264 / 3%)" : "transparent" }}
                  onClick={() => marcarLida(n)}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.background = "oklch(97% 0.006 250)";
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.background = !n.lida
                      ? "oklch(55% 0.22 264 / 3%)"
                      : "transparent";
                  }}
                >
                  {/* Ícone */}
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: bg }}>
                    <NIcon className="w-4 h-4" style={{ color }} />
                  </div>

                  {/* Conteúdo */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className={`text-sm leading-snug ${!n.lida ? "font-semibold text-foreground" : "text-foreground/80"}`}>
                        {n.titulo}
                      </p>
                      {n.origem === "pacote" && (
                        <span className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full"
                          style={{ background: "oklch(72% 0.16 60 / 15%)", color: "oklch(45% 0.18 55)" }}>
                          Pacote
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{n.mensagem}</p>

                    {/* Ações inline */}
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      {/* Link para perfil do cliente */}
                      {n.clienteNome && (
                        <button
                          className="flex items-center gap-1 text-[11px] font-medium transition-colors"
                          style={{ color: "oklch(55% 0.22 264)" }}
                          onClick={e => {
                            e.stopPropagation();
                            if (n.clienteId) setLocation(`/admin/clientes/${n.clienteId}`);
                          }}
                        >
                          {n.clienteNome}
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      )}

                      {/* Botão Renovar pacote */}
                      {podeRenovar && (
                        <button
                          className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-all"
                          style={{
                            background: "oklch(55% 0.22 264 / 10%)",
                            color: "oklch(40% 0.18 264)",
                            border: "1px solid oklch(55% 0.22 264 / 20%)",
                          }}
                          onMouseEnter={e => {
                            (e.currentTarget as HTMLElement).style.background = "oklch(55% 0.22 264 / 18%)";
                          }}
                          onMouseLeave={e => {
                            (e.currentTarget as HTMLElement).style.background = "oklch(55% 0.22 264 / 10%)";
                          }}
                          onClick={e => abrirRenovar(n, e)}
                        >
                          <RotateCcw className="w-3 h-3" />
                          Renovar pacote
                        </button>
                      )}
                    </div>

                    <p className="text-[10px] text-muted-foreground/50 mt-1.5">
                      {formatarData(n.data)}
                    </p>
                  </div>

                  {/* Indicador não lida */}
                  {!n.lida && (
                    <div className="w-2 h-2 rounded-full mt-2 flex-shrink-0"
                      style={{ background: "oklch(55% 0.22 264)" }} />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de renovação */}
      {renovarModal && (
        <ModalRenovarPacote
          open={renovarModal.open}
          onClose={() => setRenovarModal(null)}
          clienteId={renovarModal.clienteId}
          clienteNome={renovarModal.clienteNome}
          onRenovado={handleRenovado}
        />
      )}
    </div>
  );
}
