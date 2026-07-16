import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Plus, Layers, Clock, Percent, Pencil, Tag, Trash2, ChevronDown, ChevronRight, Sparkles, CheckSquare, Square, AlertTriangle, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { usePermissoes } from "@/hooks/usePermissoes";
import { trpc } from "@/lib/trpc";

function formatCurrency(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

const emptyForm = { nome: "", descricao: "", valor: "", duracaoMinutos: "60", categoria: "", percentualComissao: "", custoFixo: "" };
const emptyTipoForm = { nome: "", cor: "#7c3aed" };

const COR_PRESETS = [
  "#7c3aed", "#9333ea", "#a855f7", "#c026d3",
  "#2563eb", "#0891b2", "#0284c7", "#6366f1",
  "#16a34a", "#059669", "#0d9488", "#65a30d",
  "#dc2626", "#e11d48", "#be185d", "#db2777",
  "#d97706", "#ea580c", "#ca8a04", "#84cc16",
  "#475569", "#64748b", "#78716c", "#292524",
];

export default function Servicos() {
  const utils = trpc.useUtils();
  const { pode, isAdmin, profissionalId: meuProfissionalId } = usePermissoes();

  // ─── Serviços ──────────────────────────────────────────────────────────────
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<number | null>(null);
  const [form, setForm] = useState({ ...emptyForm });

  // ─── Seleção em lote ───────────────────────────────────────────────────────
  const [modoSelecao, setModoSelecao] = useState(false);
  const [selecionados, setSelecionados] = useState<Set<number>>(new Set());
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteInfo, setDeleteInfo] = useState<{
    ids: number[];
    comVinculos: { id: number; totalAgendamentos: number; totalPacotes: number }[];
    semVinculos: { id: number }[];
    nomes: Record<number, string>;
  } | null>(null);

  // ─── Tipos de Profissional ─────────────────────────────────────────────────
  const [tiposModalOpen, setTiposModalOpen] = useState(false);
  const [editandoTipo, setEditandoTipo] = useState<number | null>(null);
  const [tipoForm, setTipoForm] = useState({ ...emptyTipoForm });
  const [gruposExpandidos, setGruposExpandidos] = useState<Record<string, boolean>>({});

  const { data: servicos } = trpc.servicos.list.useQuery();
  const { data: tipos } = trpc.tiposProfissional.list.useQuery();

  // IDs dos serviços vinculados ao profissional logado
  const { data: meusServicosVinculados } = trpc.profissionalServicos.getByProfissional.useQuery(
    { profissionalId: meuProfissionalId! },
    { enabled: !isAdmin && !!meuProfissionalId }
  );
  const meusServicosIds = useMemo(() => {
    if (isAdmin) return null;
    if (!meusServicosVinculados) return new Set<number>();
    return new Set(meusServicosVinculados.map((v: any) => v.servicoId));
  }, [isAdmin, meusServicosVinculados]);

  const criarMutation = trpc.servicos.create.useMutation({
    onSuccess: () => { toast.success("Serviço cadastrado!"); utils.servicos.list.invalidate(); setModalOpen(false); setForm({ ...emptyForm }); },
    onError: (err: any) => toast.error(err.message),
  });

  const editarMutation = trpc.servicos.update.useMutation({
    onSuccess: () => { toast.success("Serviço atualizado!"); utils.servicos.list.invalidate(); setModalOpen(false); setEditando(null); setForm({ ...emptyForm }); },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteMutation = trpc.servicos.delete.useMutation({
    onSuccess: (res) => {
      if (res.acao === 'deletado') toast.success("Serviço excluído.");
      else toast.info(res.motivo ?? "Serviço desativado pois possui vínculos.");
      utils.servicos.list.invalidate();
      setDeleteModalOpen(false);
      setDeleteInfo(null);
      setSelecionados(new Set());
      setModoSelecao(false);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteLoteMutation = trpc.servicos.deleteLote.useMutation({
    onSuccess: (res) => {
      const partes = [];
      if (res.deletados > 0) partes.push(`${res.deletados} excluído${res.deletados > 1 ? 's' : ''}`);
      if (res.desativados > 0) partes.push(`${res.desativados} desativado${res.desativados > 1 ? 's' : ''} (possuem vínculos)`);
      toast.success(partes.join(', ') + '.');
      utils.servicos.list.invalidate();
      setDeleteModalOpen(false);
      setDeleteInfo(null);
      setSelecionados(new Set());
      setModoSelecao(false);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const criarTipoMutation = trpc.tiposProfissional.criar.useMutation({
    onSuccess: () => { toast.success("Tipo criado!"); utils.tiposProfissional.list.invalidate(); setEditandoTipo(null); setTipoForm({ ...emptyTipoForm }); },
    onError: (err: any) => toast.error(err.message),
  });

  const atualizarTipoMutation = trpc.tiposProfissional.atualizar.useMutation({
    onSuccess: () => { toast.success("Tipo atualizado!"); utils.tiposProfissional.list.invalidate(); setEditandoTipo(null); setTipoForm({ ...emptyTipoForm }); },
    onError: (err: any) => toast.error(err.message),
  });

  const excluirTipoMutation = trpc.tiposProfissional.excluir.useMutation({
    onSuccess: () => { toast.success("Tipo removido!"); utils.tiposProfissional.list.invalidate(); },
    onError: (err: any) => toast.error(err.message),
  });

  // ─── Verificar vínculos antes de abrir modal de confirmação ───────────────
  const verificarVinculosQuery = trpc.servicos.verificarVinculos.useQuery(
    { ids: Array.from(selecionados) },
    { enabled: false }
  );

  // ─── Agrupamento de serviços por categoria ─────────────────────────────────
  const servicosAgrupados = useMemo(() => {
    const grupos: Record<string, typeof servicos> = {};
    const semCategoria: typeof servicos = [];
    for (const s of (servicos ?? [])) {
      if (s.categoria) {
        if (!grupos[s.categoria]) grupos[s.categoria] = [];
        grupos[s.categoria]!.push(s);
      } else {
        semCategoria.push(s);
      }
    }
    const result: { label: string; items: typeof servicos; cor?: string }[] = [];
    for (const tipo of (tipos ?? [])) {
      if (grupos[tipo.nome]) {
        result.push({ label: tipo.nome, items: grupos[tipo.nome]!, cor: tipo.cor ?? undefined });
        delete grupos[tipo.nome];
      }
    }
    for (const [cat, items] of Object.entries(grupos)) {
      result.push({ label: cat, items: items! });
    }
    if (semCategoria.length > 0) {
      result.push({ label: "Sem categoria", items: semCategoria });
    }
    return result;
  }, [servicos, tipos]);

  // Mapa id → nome para o modal de confirmação
  const servicosMap = useMemo(() => {
    const m: Record<number, string> = {};
    for (const s of (servicos ?? [])) m[s.id] = s.nome;
    return m;
  }, [servicos]);

  // Todos os IDs visíveis
  const todosIds = useMemo(() => (servicos ?? []).map(s => s.id), [servicos]);

  function toggleGrupo(label: string) {
    setGruposExpandidos(prev => ({ ...prev, [label]: !(prev[label] ?? true) }));
  }

  function isExpandido(label: string) {
    return gruposExpandidos[label] ?? true;
  }

  function podeEditarServico(servicoId: number): boolean {
    if (isAdmin) return true;
    if (!meusServicosIds) return false;
    return meusServicosIds.has(servicoId);
  }

  function podeVerDadosFinanceiros(servicoId: number): boolean {
    if (isAdmin) return true;
    if (!meusServicosIds) return false;
    return meusServicosIds.has(servicoId);
  }

  function abrirEditar(s: any) {
    setEditando(s.id);
    setForm({
      nome: s.nome ?? "",
      descricao: s.descricao ?? "",
      valor: String(s.valor ?? ""),
      duracaoMinutos: String(s.duracaoMinutos ?? 60),
      categoria: s.categoria ?? "",
      percentualComissao: s.percentualComissao ? String(parseFloat(String(s.percentualComissao))) : "",
      custoFixo: s.custoFixo ? String(parseFloat(String(s.custoFixo))) : "",
    });
    setModalOpen(true);
  }

  function abrirNovo() {
    setEditando(null);
    setForm({ ...emptyForm });
    setModalOpen(true);
  }

  function salvar() {
    const payload = {
      ...form,
      duracaoMinutos: parseInt(form.duracaoMinutos),
      percentualComissao: form.percentualComissao || undefined,
      custoFixo: form.custoFixo || undefined,
    } as any;
    if (editando) {
      editarMutation.mutate({ id: editando, ...payload });
    } else {
      criarMutation.mutate(payload);
    }
  }

  function salvarTipo() {
    if (!tipoForm.nome.trim()) return;
    if (editandoTipo) {
      atualizarTipoMutation.mutate({ id: editandoTipo, nome: tipoForm.nome, cor: tipoForm.cor });
    } else {
      criarTipoMutation.mutate({ nome: tipoForm.nome, cor: tipoForm.cor });
    }
  }

  function abrirEditarTipo(t: any) {
    setEditandoTipo(t.id);
    setTipoForm({ nome: t.nome, cor: t.cor ?? "#7c3aed" });
  }

  function toggleSelecao(id: number) {
    setSelecionados(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleTodos() {
    if (selecionados.size === todosIds.length) {
      setSelecionados(new Set());
    } else {
      setSelecionados(new Set(todosIds));
    }
  }

  function cancelarSelecao() {
    setModoSelecao(false);
    setSelecionados(new Set());
  }

  async function abrirModalDelete(ids: number[]) {
    // Busca vínculos via query manual
    try {
      const res = await utils.client.servicos.verificarVinculos.query({ ids });
      setDeleteInfo({
        ids,
        comVinculos: res.comVinculos as any,
        semVinculos: res.semVinculos as any,
        nomes: servicosMap,
      });
      setDeleteModalOpen(true);
    } catch {
      toast.error("Erro ao verificar vínculos. Tente novamente.");
    }
  }

  function confirmarDelete() {
    if (!deleteInfo) return;
    if (deleteInfo.ids.length === 1) {
      deleteMutation.mutate({ id: deleteInfo.ids[0] });
    } else {
      deleteLoteMutation.mutate({ ids: deleteInfo.ids });
    }
  }

  const isPending = criarMutation.isPending || editarMutation.isPending;
  const isTipoPending = criarTipoMutation.isPending || atualizarTipoMutation.isPending;
  const isDeletePending = deleteMutation.isPending || deleteLoteMutation.isPending;

  if (!pode("servicosVer")) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center p-8">
        <Sparkles className="w-12 h-12 text-muted-foreground/30" />
        <p className="text-sm font-medium text-muted-foreground">Você não tem permissão para acessar os Serviços.</p>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-4 max-w-5xl mx-auto animate-in-up">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-bold tracking-tight text-xl lg:text-2xl">Serviços</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{servicos?.length ?? 0} cadastrados</p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && !modoSelecao && (
            <>
              <button onClick={() => setTiposModalOpen(true)} className="btn-ghost py-2 px-3 text-xs border border-border rounded-lg flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Tipos de Profissional</span>
                <span className="sm:hidden">Tipos</span>
              </button>
              {(servicos?.length ?? 0) > 0 && (
                <button onClick={() => setModoSelecao(true)} className="btn-ghost py-2 px-3 text-xs border border-border rounded-lg flex items-center gap-1.5 text-muted-foreground hover:text-destructive hover:border-destructive/40 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Excluir</span>
                </button>
              )}
              <button onClick={abrirNovo} className="btn-primary py-2 px-3 text-xs">
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Novo Serviço</span>
                <span className="sm:hidden">Novo</span>
              </button>
            </>
          )}
          {modoSelecao && (
            <>
              <button onClick={toggleTodos} className="btn-ghost py-2 px-3 text-xs border border-border rounded-lg flex items-center gap-1.5">
                {selecionados.size === todosIds.length ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                <span>{selecionados.size === todosIds.length ? "Desmarcar todos" : "Selecionar todos"}</span>
              </button>
              <button
                onClick={() => selecionados.size > 0 && abrirModalDelete(Array.from(selecionados))}
                disabled={selecionados.size === 0}
                className="btn-ghost py-2 px-3 text-xs border border-destructive/40 rounded-lg flex items-center gap-1.5 text-destructive hover:bg-destructive/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Excluir {selecionados.size > 0 ? `(${selecionados.size})` : ""}
              </button>
              <button onClick={cancelarSelecao} className="btn-ghost py-2 px-3 text-xs border border-border rounded-lg flex items-center gap-1.5">
                <X className="w-3.5 h-3.5" />
                Cancelar
              </button>
            </>
          )}
        </div>
      </div>

      {/* Banner de modo seleção */}
      {modoSelecao && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs">
          <CheckSquare className="w-3.5 h-3.5 flex-shrink-0" />
          <span>Clique nos serviços para selecioná-los. Serviços com agendamentos ou pacotes vinculados serão <strong>desativados</strong> em vez de excluídos.</span>
        </div>
      )}

      {/* Serviços agrupados */}
      {servicosAgrupados.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Layers className="w-10 h-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">Nenhum serviço cadastrado</p>
        </div>
      ) : (
        <div className="space-y-5">
          {servicosAgrupados.map(grupo => (
            <div key={grupo.label}>
              <button
                onClick={() => toggleGrupo(grupo.label)}
                className="flex items-center gap-2 mb-3 w-full text-left group"
              >
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: grupo.cor ?? "#94a3b8" }} />
                <span className="text-sm font-semibold text-foreground">{grupo.label}</span>
                <Badge variant="secondary" className="text-xs">{grupo.items?.length ?? 0}</Badge>
                <span className="ml-auto text-muted-foreground">
                  {isExpandido(grupo.label) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </span>
              </button>

              {isExpandido(grupo.label) && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                  {(grupo.items ?? []).map(s => {
                    const isSelecionado = selecionados.has(s.id);
                    return (
                      <Card
                        key={s.id}
                        onClick={() => modoSelecao ? toggleSelecao(s.id) : undefined}
                        className={`border-border shadow-none hover:shadow-sm transition-all duration-150 group relative ${
                          modoSelecao ? "cursor-pointer" : ""
                        } ${isSelecionado ? "ring-2 ring-destructive border-destructive/40 bg-destructive/5" : ""}`}
                      >
                        {/* Checkbox de seleção */}
                        {modoSelecao && (
                          <div className="absolute top-1.5 right-1.5 z-10">
                            {isSelecionado
                              ? <CheckSquare className="w-4 h-4 text-destructive" />
                              : <Square className="w-4 h-4 text-muted-foreground/50" />
                            }
                          </div>
                        )}
                        <CardContent className="px-2 py-1">
                          <div className="flex items-center justify-between mb-0.5">
                            <span
                              className="text-[9px] font-semibold uppercase tracking-wider leading-none"
                              style={{ color: grupo.cor ?? "oklch(78.5% 0.075 85)" }}
                            >
                              {grupo.label === "Sem categoria" ? "Geral" : grupo.label}
                            </span>
                            <div className="flex items-center gap-0.5">
                              <span className={`text-[9px] font-medium px-1 py-0.5 rounded-full leading-none ${
                                s.ativo ? "bg-emerald-50 text-emerald-600" : "bg-stone-100 text-gray-400"
                              }`}>
                                {s.ativo ? "Ativo" : "Inativo"}
                              </span>
                              {!modoSelecao && podeEditarServico(s.id) && (
                                <>
                                  <button
                                    onClick={() => abrirEditar(s)}
                                    className="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-secondary transition-all"
                                  >
                                    <Pencil className="w-2.5 h-2.5 text-muted-foreground" />
                                  </button>
                                  {isAdmin && (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); abrirModalDelete([s.id]); }}
                                      className="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-destructive/10 transition-all"
                                      title="Excluir serviço"
                                    >
                                      <Trash2 className="w-2.5 h-2.5 text-destructive/70" />
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                          <p className="text-xs font-semibold text-foreground leading-snug mb-1">{s.nome}</p>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                                <Clock className="w-2.5 h-2.5" />
                                {s.duracaoMinutos ?? 60}m
                              </span>
                              {podeVerDadosFinanceiros(s.id) && (s as any).percentualComissao && parseFloat(String((s as any).percentualComissao)) > 0 && (
                                <span className="flex items-center gap-0.5 text-[10px] font-medium" style={{ color: grupo.cor ?? "oklch(78.5% 0.075 85)" }}>
                                  <Percent className="w-2 h-2" />
                                  {parseFloat(String((s as any).percentualComissao)).toFixed(0)}%
                                </span>
                              )}
                            </div>
                            <span className="text-xs font-bold text-foreground">
                              {formatCurrency(parseFloat(String(s.valor)))}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal de confirmação de exclusão */}
      <Dialog open={deleteModalOpen} onOpenChange={open => { if (!open && !isDeletePending) { setDeleteModalOpen(false); setDeleteInfo(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-bold">
              <Trash2 className="w-4 h-4 text-destructive" />
              {deleteInfo?.ids.length === 1 ? "Excluir serviço" : `Excluir ${deleteInfo?.ids.length ?? 0} serviços`}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>

          {deleteInfo && (
            <div className="space-y-3 py-1">
              {/* Serviços sem vínculos → serão deletados */}
              {deleteInfo.semVinculos.length > 0 && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-1.5">
                  <p className="text-xs font-semibold text-destructive flex items-center gap-1.5">
                    <Trash2 className="w-3.5 h-3.5" />
                    {deleteInfo.semVinculos.length === 1 ? "Será excluído permanentemente:" : `${deleteInfo.semVinculos.length} serão excluídos permanentemente:`}
                  </p>
                  <ul className="space-y-0.5">
                    {deleteInfo.semVinculos.map(s => (
                      <li key={s.id} className="text-xs text-foreground pl-2">• {deleteInfo.nomes[s.id] ?? `Serviço #${s.id}`}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Serviços com vínculos → serão desativados */}
              {deleteInfo.comVinculos.length > 0 && (
                <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 space-y-1.5">
                  <p className="text-xs font-semibold text-amber-800 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {deleteInfo.comVinculos.length === 1 ? "Será desativado (possui vínculos):" : `${deleteInfo.comVinculos.length} serão desativados (possuem vínculos):`}
                  </p>
                  <ul className="space-y-1">
                    {deleteInfo.comVinculos.map(s => (
                      <li key={s.id} className="text-xs text-amber-900 pl-2">
                        • {deleteInfo.nomes[s.id] ?? `Serviço #${s.id}`}
                        <span className="text-amber-700 ml-1">
                          ({[
                            s.totalAgendamentos > 0 && `${s.totalAgendamentos} agendamento${s.totalAgendamentos > 1 ? 's' : ''}`,
                            s.totalPacotes > 0 && `${s.totalPacotes} pacote${s.totalPacotes > 1 ? 's' : ''}`,
                          ].filter(Boolean).join(', ')})
                        </span>
                      </li>
                    ))}
                  </ul>
                  <p className="text-[11px] text-amber-700 mt-1">Serviços desativados ficam ocultos mas preservam o histórico.</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeleteModalOpen(false); setDeleteInfo(null); }} disabled={isDeletePending}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmarDelete} disabled={isDeletePending}>
              {isDeletePending ? "Processando..." : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de serviço */}
      <Dialog open={modalOpen} onOpenChange={open => { setModalOpen(open); if (!open) { setEditando(null); setForm({ ...emptyForm }); } }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-bold tracking-tight">{editando ? "Editar Serviço" : "Novo Serviço"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Nome do serviço *</Label>
              <Input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Ex: Corte feminino" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Descrição</Label>
              <Input value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Descrição do serviço" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Valor (R$) *</Label>
                <Input type="number" min="0" step="0.01" value={form.valor} onChange={e => setForm(f => ({ ...f, valor: e.target.value }))} placeholder="0,00" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Duração (min)</Label>
                <Input type="number" min="15" step="15" value={form.duracaoMinutos} onChange={e => setForm(f => ({ ...f, duracaoMinutos: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Categoria / Tipo</Label>
                <div className="flex flex-col gap-1.5">
                  <Select
                    value={(tipos ?? []).some(t => t.nome === form.categoria) ? form.categoria : form.categoria ? '__custom__' : ''}
                    onValueChange={val => {
                      if (val === '__custom__') return;
                      setForm(f => ({ ...f, categoria: val }));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione ou digite..." />
                    </SelectTrigger>
                    <SelectContent>
                      {(tipos ?? []).map(t => (
                        <SelectItem key={t.id} value={t.nome}>{t.nome}</SelectItem>
                      ))}
                      {(tipos ?? []).length === 0 && (
                        <div className="px-3 py-2 text-xs text-muted-foreground">Nenhum tipo cadastrado. Crie em "Tipos de Profissional".</div>
                      )}
                    </SelectContent>
                  </Select>
                  <Input
                    value={form.categoria}
                    onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}
                    placeholder="Ou digite livremente..."
                    className="text-xs h-8"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">
                  <span className="flex items-center gap-1">
                    <Percent className="w-3 h-3" /> % Comissão padrão
                  </span>
                </Label>
                <Input
                  type="number" min="0" max="100" step="0.5"
                  value={form.percentualComissao}
                  onChange={e => setForm(f => ({ ...f, percentualComissao: e.target.value }))}
                  placeholder="Ex: 40"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">
                <span className="flex items-center gap-1">
                  Custo do serviço (R$)
                </span>
              </Label>
              <Input
                type="number" min="0" step="0.01"
                value={form.custoFixo}
                onChange={e => setForm(f => ({ ...f, custoFixo: e.target.value }))}
                placeholder="Ex: 15,00 (insumos, produtos)"
              />
              <p className="text-xs text-muted-foreground mt-1">Custo de insumos ou produtos usados neste serviço. Será pré-preenchido ao registrar comissão.</p>
            </div>
            {form.percentualComissao && parseFloat(form.percentualComissao) > 0 && (
              <p className="text-xs text-muted-foreground bg-secondary/50 rounded-md px-3 py-2">
                Ao concluir um agendamento com este serviço, a comissão de <strong>{parseFloat(form.percentualComissao).toFixed(1)}%</strong> será preenchida automaticamente.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setModalOpen(false); setEditando(null); }}>Cancelar</Button>
            <Button onClick={salvar} disabled={!form.nome || !form.valor || isPending}>
              {isPending ? "Salvando..." : editando ? "Salvar alterações" : "Cadastrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Tipos de Profissional */}
      <Dialog open={tiposModalOpen} onOpenChange={open => { setTiposModalOpen(open); if (!open) { setEditandoTipo(null); setTipoForm({ ...emptyTipoForm }); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-bold tracking-tight flex items-center gap-2">
              <Tag className="w-4 h-4" />
              Tipos de Profissional
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground -mt-2">
            Categorias como "Manicure", "Cabeleireiro", "Maquiadora". Usadas para agrupar serviços e vincular profissionais.
          </p>

          <div className="border border-border rounded-lg p-4 space-y-3 bg-secondary/20">
            <p className="text-xs font-medium text-foreground">{editandoTipo ? "Editar tipo" : "Novo tipo"}</p>
            <div className="flex gap-2">
              <Input
                value={tipoForm.nome}
                onChange={e => setTipoForm(f => ({ ...f, nome: e.target.value }))}
                placeholder="Ex: Manicure, Cabeleireiro..."
                className="flex-1"
              />
              <Button onClick={salvarTipo} disabled={!tipoForm.nome.trim() || isTipoPending} size="sm">
                {isTipoPending ? "..." : editandoTipo ? "Salvar" : "Adicionar"}
              </Button>
              {editandoTipo && (
                <Button variant="outline" size="sm" onClick={() => { setEditandoTipo(null); setTipoForm({ ...emptyTipoForm }); }}>
                  Cancelar
                </Button>
              )}
            </div>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">Cor do grupo</p>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded" style={{ color: tipoForm.cor, background: tipoForm.cor + "18" }}>
                    {tipoForm.nome || "Prévia"}
                  </span>
                  <div className="w-5 h-5 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: tipoForm.cor }} />
                </div>
              </div>
              <div className="grid grid-cols-8 gap-1.5">
                {COR_PRESETS.map(cor => (
                  <button
                    key={cor} type="button" onClick={() => setTipoForm(f => ({ ...f, cor }))} title={cor}
                    className={`w-7 h-7 rounded-lg transition-all hover:scale-110 ${tipoForm.cor === cor ? "ring-2 ring-offset-1 ring-foreground scale-110" : "ring-1 ring-transparent hover:ring-border"}`}
                    style={{ backgroundColor: cor }}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg border border-border flex-shrink-0 cursor-pointer relative overflow-hidden" style={{ backgroundColor: tipoForm.cor }}>
                  <input type="color" value={tipoForm.cor} onChange={e => setTipoForm(f => ({ ...f, cor: e.target.value }))} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
                </div>
                <Input
                  value={tipoForm.cor}
                  onChange={e => { const val = e.target.value; if (/^#[0-9a-fA-F]{0,6}$/.test(val)) setTipoForm(f => ({ ...f, cor: val })); }}
                  placeholder="#7c3aed" className="font-mono text-xs h-8 flex-1" maxLength={7}
                />
                <span className="text-[10px] text-muted-foreground whitespace-nowrap">ou cole um hex</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            {(tipos ?? []).length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">Nenhum tipo cadastrado</p>
            ) : (
              (tipos ?? []).map(t => (
                <div key={t.id} className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-secondary/30 transition-colors">
                  <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: t.cor ?? "#7c3aed" }} />
                  <span className="text-sm font-medium flex-1">{t.nome}</span>
                  <button onClick={() => abrirEditarTipo(t)} className="p-1 rounded hover:bg-secondary transition-colors">
                    <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                  <button
                    onClick={() => { if (confirm(`Remover o tipo "${t.nome}"?`)) excluirTipoMutation.mutate({ id: t.id }); }}
                    className="p-1 rounded hover:bg-destructive/10 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </button>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
