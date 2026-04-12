import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Clock, SlidersHorizontal, X, CheckSquare, Square, ChevronDown, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import NovaAgendaModal from "@/components/NovaAgendaModal";
import AgendamentoDetalheModal from "@/components/AgendamentoDetalheModal";
import { trpc } from "@/lib/trpc";
import { ServiceIcon } from "@/lib/serviceIcons";
import { usePermissoes } from "@/hooks/usePermissoes";
import { getLocalDateString } from "@/lib/utils";

const statusLabel: Record<string, string> = {
  pre_agendado: "Pré-agendado",
  agendado: "Agendado",
  confirmado: "Confirmado",
  em_andamento: "Em andamento",
  concluido: "Concluído",
  cancelado: "Cancelado",
  faltou: "Faltou",
};

const statusStyle: Record<string, { bg: string; color: string }> = {
  pre_agendado:       { bg: "oklch(72% 0.16 80 / 14%)",  color: "oklch(42% 0.14 75)" },
  agendado:           { bg: "oklch(55% 0.22 264 / 12%)", color: "oklch(45% 0.18 264)" },
  confirmado:         { bg: "oklch(62% 0.18 155 / 14%)", color: "oklch(35% 0.14 155)" },
  em_andamento:       { bg: "oklch(68% 0.18 80 / 14%)",  color: "oklch(38% 0.14 80)" },
  concluido:          { bg: "oklch(55% 0.04 260 / 10%)", color: "oklch(40% 0.04 260)" },
  cancelado:          { bg: "oklch(58% 0.22 25 / 12%)",  color: "oklch(40% 0.18 25)" },
  faltou:             { bg: "oklch(58% 0.22 25 / 12%)",  color: "oklch(40% 0.18 25)" },
};

function formatCurrency(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

export default function Agendamentos() {
  const { pode, isAdmin } = usePermissoes();
  const utils = trpc.useUtils();
  const [novaAgendaOpen, setNovaAgendaOpen] = useState(false);
  const [agSelecionado, setAgSelecionado] = useState<number | null>(null);
  // Seleção múltipla
  const [modoSelecao, setModoSelecao] = useState(false);
  const [selecionados, setSelecionados] = useState<Set<number>>(new Set());
  const [confirmLote, setConfirmLote] = useState<{ status: string; label: string } | null>(null);
  const [confirmExcluirLote, setConfirmExcluirLote] = useState(false);

  const bulkDeleteMutation = trpc.agendamentos.bulkDelete.useMutation({
    onSuccess: (result) => {
      utils.agendamentos.list.invalidate();
      setSelecionados(new Set());
      setModoSelecao(false);
      setConfirmExcluirLote(false);
      if (result.falhas > 0) {
        toast.error(`${result.sucesso} excluído${result.sucesso !== 1 ? 's' : ''}, ${result.falhas} com erro`);
      } else {
        toast.success(`${result.sucesso} agendamento${result.sucesso !== 1 ? 's' : ''} excluído${result.sucesso !== 1 ? 's' : ''} com sucesso`);
      }
    },
    onError: (err) => toast.error(`Erro ao excluir: ${err.message}`),
  });

  const bulkUpdateMutation = trpc.agendamentos.bulkUpdateStatus.useMutation({
    onSuccess: (result) => {
      utils.agendamentos.list.invalidate();
      setSelecionados(new Set());
      setModoSelecao(false);
      setConfirmLote(null);
      if (result.falhas > 0) {
        toast.error(`${result.sucesso} atualizados, ${result.falhas} com erro`);
      } else {
        toast.success(`${result.sucesso} agendamento${result.sucesso !== 1 ? "s" : ""} atualizado${result.sucesso !== 1 ? "s" : ""}`);
      }
    },
    onError: (err) => {
      toast.error(`Erro ao atualizar: ${err.message}`);
    },
  });

  function toggleSelecao(id: number) {
    setSelecionados(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function selecionarTodos() {
    if (selecionados.size === filtrados.length) {
      setSelecionados(new Set());
    } else {
      setSelecionados(new Set(filtrados.map(ag => ag.id)));
    }
  }

  function confirmarAcaoLote(status: string, label: string) {
    if (selecionados.size === 0) return;
    setConfirmLote({ status, label });
  }

  function executarAcaoLote() {
    if (!confirmLote) return;
    bulkUpdateMutation.mutate({ ids: Array.from(selecionados), status: confirmLote.status as any });
  }
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [busca, setBusca] = useState("");
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  const [filtroProfissional, setFiltroProfissional] = useState<string>("todos");
  const [filtroSaldoAberto, setFiltroSaldoAberto] = useState(false);

  const today = getLocalDateString();
  const [dataInicio, setDataInicio] = useState(today);
  const [dataFim, setDataFim] = useState(today);

  // Backend já aplica o filtro correto via resolveAdminContext
  const { data: agendamentos } = trpc.agendamentos.list.useQuery({ dataInicio, dataFim });
  const { data: clientes } = trpc.clientes.list.useQuery();
  const { data: profissionais } = trpc.profissionais.listParaAgendamento.useQuery();
  const { data: servicos } = trpc.servicos.list.useQuery();

  const clienteMap = useMemo(() => {
    const m: Record<number, string> = {};
    clientes?.forEach(c => { m[c.id] = c.nome; });
    return m;
  }, [clientes]);

  const profMap = useMemo(() => {
    const m: Record<number, { nome: string; cor: string }> = {};
    profissionais?.forEach(p => { m[p.id] = { nome: p.nome, cor: p.corCalendario ?? "oklch(55% 0.22 264)" }; });
    return m;
  }, [profissionais]);

  const servicoMap = useMemo(() => {
    const m: Record<number, string> = {};
    servicos?.forEach(s => { m[s.id] = s.nome; });
    return m;
  }, [servicos]);

  const filtrados = useMemo(() => {
    return (agendamentos ?? []).filter(ag => {
      const matchStatus = filtroStatus === "todos" || ag.status === filtroStatus;
      const nomeCliente = clienteMap[ag.clienteId] ?? "";
      const matchBusca = !busca || nomeCliente.toLowerCase().includes(busca.toLowerCase());
      const matchProfissional = filtroProfissional === "todos" || ag.profissionalId === parseInt(filtroProfissional);
      const emAberto = (ag as any).emAberto ?? 0;
      const matchSaldo = !filtroSaldoAberto || emAberto > 0;
      return matchStatus && matchBusca && matchProfissional && matchSaldo;
    }).sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));
  }, [agendamentos, filtroStatus, busca, clienteMap, filtroProfissional, filtroSaldoAberto]);

  const filtrosAtivos = filtroStatus !== "todos" || dataInicio !== today || dataFim !== today || filtroProfissional !== "todos" || filtroSaldoAberto;

  return (
    <div className="p-4 lg:p-6 space-y-4 max-w-7xl mx-auto animate-in-up">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-bold tracking-tight text-xl lg:text-2xl">Agendamentos</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {filtrados.length} resultado{filtrados.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <button
              onClick={() => { setModoSelecao(!modoSelecao); setSelecionados(new Set()); }}
              className={`flex items-center gap-1.5 py-2 px-3 rounded-lg border text-xs font-medium transition-all ${modoSelecao ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border hover:bg-muted"}`}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{modoSelecao ? "Cancelar" : "Selecionar"}</span>
            </button>
          )}
          <button onClick={() => setNovaAgendaOpen(true)} className="btn-primary py-2 px-3 text-xs">
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Novo Agendamento</span>
            <span className="sm:hidden">Novo</span>
          </button>
        </div>
      </div>

      {/* ── Filtros ─────────────────────────────────────────────────────── */}
      {/* Barra de busca + botão filtros (mobile) */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar cliente..."
            className="pl-9 h-10"
            value={busca}
            onChange={e => setBusca(e.target.value)}
          />
        </div>
        {/* Botão filtros mobile */}
        <button
          onClick={() => setFiltrosAbertos(!filtrosAbertos)}
          className="lg:hidden flex items-center gap-1.5 px-3 h-10 rounded-lg border text-sm font-medium transition-colors relative"
          style={{
            background: filtrosAtivos ? "oklch(55% 0.22 264 / 10%)" : "transparent",
            borderColor: filtrosAtivos ? "oklch(55% 0.22 264 / 40%)" : "oklch(88% 0.010 250)",
            color: filtrosAtivos ? "oklch(45% 0.18 264)" : "oklch(45% 0.010 260)",
          }}>
          <SlidersHorizontal className="w-4 h-4" />
          {filtrosAtivos && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full"
              style={{ background: "oklch(55% 0.22 264)" }} />
          )}
        </button>
      </div>

      {/* Filtros expandidos (mobile) / sempre visíveis (desktop) */}
      <div className={`${filtrosAbertos ? "flex" : "hidden"} lg:flex flex-wrap gap-2`}>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-shrink-0 self-center">
          <span>De</span>
        </div>
        <Input
          type="date"
          value={dataInicio}
          onChange={e => setDataInicio(e.target.value)}
          className="w-auto h-9 text-sm"
        />
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-shrink-0 self-center">
          <span>até</span>
        </div>
        <Input
          type="date"
          value={dataFim}
          onChange={e => setDataFim(e.target.value)}
          className="w-auto h-9 text-sm"
        />
        <Select value={filtroStatus} onValueChange={setFiltroStatus}>
          <SelectTrigger className="w-auto min-w-[140px] h-9 text-sm">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            {Object.entries(statusLabel).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {/* Filtro por profissional — apenas para admins */}
        {isAdmin && profissionais && profissionais.length > 0 && (
          <Select value={filtroProfissional} onValueChange={setFiltroProfissional}>
            <SelectTrigger className="w-auto min-w-[160px] h-9 text-sm">
              <SelectValue placeholder="Profissional" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os profissionais</SelectItem>
              {profissionais.map(p => (
                <SelectItem key={p.id} value={String(p.id)}>{p.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {/* Filtro saldo em aberto */}
        <button
          onClick={() => setFiltroSaldoAberto(v => !v)}
          className="flex items-center gap-1.5 h-9 px-3 rounded-lg border text-xs font-medium transition-all"
          style={{
            background: filtroSaldoAberto ? "oklch(72% 0.16 80 / 14%)" : "transparent",
            borderColor: filtroSaldoAberto ? "oklch(62% 0.14 75)" : "oklch(88% 0.010 250)",
            color: filtroSaldoAberto ? "oklch(38% 0.14 75)" : "oklch(45% 0.010 260)",
          }}>
          Com saldo em aberto
        </button>
        {filtrosAtivos && (
          <button
            onClick={() => { setFiltroStatus("todos"); setDataInicio(today); setDataFim(today); setFiltroProfissional("todos"); setFiltroSaldoAberto(false); }}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors h-9 px-2">
            <X className="w-3.5 h-3.5" />
            Limpar
          </button>
        )}
      </div>

      {/* ── Barra de ações em lote ─────────────────────────────────────── */}
      {modoSelecao && (
        <div className="flex items-center gap-3 p-3 rounded-xl border bg-primary/5 border-primary/20">
          <button
            onClick={selecionarTodos}
            className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
          >
            {selecionados.size === filtrados.length && filtrados.length > 0
              ? <CheckSquare className="w-4 h-4" />
              : <Square className="w-4 h-4" />}
            {selecionados.size === 0 ? "Selecionar todos" : `${selecionados.size} selecionado${selecionados.size !== 1 ? "s" : ""}`}
          </button>
          {selecionados.size > 0 && (
            <>
              <div className="w-px h-4 bg-border" />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
                    disabled={bulkUpdateMutation.isPending}
                  >
                    {bulkUpdateMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                    Alterar status
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem onClick={() => confirmarAcaoLote("confirmado", "Confirmado")}>Confirmar</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => confirmarAcaoLote("concluido", "Concluído")}>Concluir</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => confirmarAcaoLote("cancelado", "Cancelado")}>Cancelar</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => confirmarAcaoLote("faltou", "Faltou")}>Marcar como Faltou</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => confirmarAcaoLote("agendado", "Agendado")}>Voltar para Agendado</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              {/* Botão excluir em lote — apenas para admins */}
              {(isAdmin || pode('__admin__')) && (
                <button
                  onClick={() => setConfirmExcluirLote(true)}
                  disabled={bulkDeleteMutation.isPending}
                  className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-medium transition-colors"
                  style={{ background: "oklch(55% 0.22 25 / 12%)", color: "oklch(42% 0.18 25)" }}
                >
                  {bulkDeleteMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  Excluir
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Lista ───────────────────────────────────────────────────────── */}
      <div className="card-elegant overflow-hidden">
        {filtrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-center px-6">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: "oklch(55% 0.22 264 / 8%)" }}>
              <Clock className="w-5 h-5" style={{ color: "oklch(55% 0.22 264)" }} />
            </div>
            <p className="text-sm font-medium text-foreground mb-1">Nenhum agendamento encontrado</p>
            <p className="text-xs text-muted-foreground">Tente ajustar os filtros ou criar um novo agendamento</p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: "oklch(94% 0.008 250)" }}>
            {filtrados.map(ag => {
              // Suporte a múltiplos serviços: usar servicoNome do backend se disponível
              const servicoNome = (ag as any).servicoNome ?? servicoMap[ag.servicoId] ?? "";
              const prof = profMap[ag.profissionalId];
              const st = statusStyle[ag.status] ?? statusStyle.agendado;
              return (
                <div
                  key={ag.id}
                  className={`flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors cursor-pointer ${modoSelecao && selecionados.has(ag.id) ? "bg-primary/5" : ""}`}
                  onClick={() => {
                    if (modoSelecao) { toggleSelecao(ag.id); return; }
                    setAgSelecionado(ag.id);
                  }}
                >
                  {/* Checkbox de seleção */}
                  {modoSelecao && (
                    <div className="flex-shrink-0" onClick={e => { e.stopPropagation(); toggleSelecao(ag.id); }}>
                      {selecionados.has(ag.id)
                        ? <CheckSquare className="w-4 h-4 text-primary" />
                        : <Square className="w-4 h-4 text-muted-foreground" />}
                    </div>
                  )}
                  {/* Ícone do serviço — oculto em telas muito pequenas */}
                  {!modoSelecao && (
                    <div className="hidden sm:block flex-shrink-0">
                      <ServiceIcon serviceName={servicoNome} size="md" showBackground />
                    </div>
                  )}

                  {/* Barra colorida do profissional (mobile) */}
                  <div className="sm:hidden w-1 h-10 rounded-full flex-shrink-0"
                    style={{ background: prof?.cor ?? "oklch(55% 0.22 264)" }} />

                  {/* Data e hora */}
                  <div className="text-center flex-shrink-0 w-12">
                    <p className="text-[10px] text-muted-foreground leading-tight">
                      {ag.data.split("-").reverse().slice(0, 2).join("/")}
                    </p>
                    <p className="text-sm font-bold tabular-nums">{ag.horaInicio.slice(0, 5)}</p>
                  </div>

                  {/* Separador */}
                  <div className="hidden sm:block w-px h-8 bg-border flex-shrink-0" />

                  {/* Cliente e serviço */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{clienteMap[ag.clienteId] ?? "—"}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {servicoNome || "—"}
                      {prof && <span className="hidden sm:inline"> · {prof.nome.split(" ")[0]}</span>}
                    </p>
                  </div>

                  {/* Status */}
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-medium flex-shrink-0 whitespace-nowrap"
                    style={{ background: st.bg, color: st.color }}>
                    {statusLabel[ag.status] ?? ag.status}
                  </span>

                  {/* Valor e saldo em aberto */}
                  <div className="hidden sm:flex flex-col items-end flex-shrink-0">
                    <span className="text-sm font-bold tabular-nums" style={{ color: "oklch(35% 0.14 155)" }}>
                      {formatCurrency(parseFloat(String(ag.valorTotal)))}
                    </span>
                    {(ag as any).emAberto > 0 && (
                      <span className="text-[10px] font-medium tabular-nums" style={{ color: "oklch(50% 0.14 75)" }}>
                        em aberto: {formatCurrency((ag as any).emAberto)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {novaAgendaOpen && <NovaAgendaModal open={novaAgendaOpen} onClose={() => setNovaAgendaOpen(false)} />}
      {agSelecionado && (
        <AgendamentoDetalheModal
          agendamentoId={agSelecionado}
          open={!!agSelecionado}
          onClose={() => setAgSelecionado(null)}
        />
      )}

      {/* Dialog de confirmação de ação em lote */}
      <AlertDialog open={!!confirmLote} onOpenChange={open => { if (!open) setConfirmLote(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar ação em lote</AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a alterar o status de <strong>{selecionados.size} agendamento{selecionados.size !== 1 ? "s" : ""}</strong> para <strong>{confirmLote?.label}</strong>.
              Esta ação não pode ser desfeita automaticamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={executarAcaoLote} disabled={bulkUpdateMutation.isPending}>
              {bulkUpdateMutation.isPending ? "Atualizando..." : "Confirmar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* AlertDialog de exclusão em lote */}
      <AlertDialog open={confirmExcluirLote} onOpenChange={open => { if (!open) setConfirmExcluirLote(false); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir agendamentos selecionados</AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a <strong>excluir permanentemente {selecionados.size} agendamento{selecionados.size !== 1 ? "s" : ""}</strong>.
              Esta ação não pode ser desfeita e removerá todos os dados vinculados (pagamentos, comissões, prontuários).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => bulkDeleteMutation.mutate({ ids: Array.from(selecionados) })}
              disabled={bulkDeleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {bulkDeleteMutation.isPending ? "Excluindo..." : `Excluir ${selecionados.size} agendamento${selecionados.size !== 1 ? "s" : ""}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
