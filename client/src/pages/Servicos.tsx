import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Layers, Clock, Percent, Pencil, Tag, Trash2, ChevronDown, ChevronRight, Sparkles } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { usePermissoes } from "@/hooks/usePermissoes";

function formatCurrency(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

const emptyForm = { nome: "", descricao: "", valor: "", duracaoMinutos: "60", categoria: "", percentualComissao: "", custoFixo: "" };
const emptyTipoForm = { nome: "", cor: "#7c3aed" };

const COR_PRESETS = [
  // Roxos / Violetas
  "#7c3aed", "#9333ea", "#a855f7", "#c026d3",
  // Azuis
  "#2563eb", "#0891b2", "#0284c7", "#6366f1",
  // Verdes
  "#16a34a", "#059669", "#0d9488", "#65a30d",
  // Vermelhos / Rosas
  "#dc2626", "#e11d48", "#be185d", "#db2777",
  // Laranjas / Amarelos
  "#d97706", "#ea580c", "#ca8a04", "#84cc16",
  // Neutros elegantes
  "#475569", "#64748b", "#78716c", "#292524",
];

export default function Servicos() {
  const utils = trpc.useUtils();
  const { pode, isAdmin, profissionalId: meuProfissionalId } = usePermissoes();

  // ─── Serviços ──────────────────────────────────────────────────────────────
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<number | null>(null);
  const [form, setForm] = useState({ ...emptyForm });

  // ─── Tipos de Profissional ─────────────────────────────────────────────────
  const [tiposModalOpen, setTiposModalOpen] = useState(false);
  const [editandoTipo, setEditandoTipo] = useState<number | null>(null);
  const [tipoForm, setTipoForm] = useState({ ...emptyTipoForm });
  const [gruposExpandidos, setGruposExpandidos] = useState<Record<string, boolean>>({});

  const { data: servicos } = trpc.servicos.list.useQuery();
  const { data: tipos } = trpc.tiposProfissional.list.useQuery();

  // IDs dos serviços vinculados ao profissional logado (para controle de visibilidade)
  const { data: meusServicosVinculados } = trpc.profissionalServicos.getByProfissional.useQuery(
    { profissionalId: meuProfissionalId! },
    { enabled: !isAdmin && !!meuProfissionalId }
  );
  const meusServicosIds = useMemo(() => {
    if (isAdmin) return null; // Admin vê tudo
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
    // Tipos de profissional cadastrados primeiro
    for (const tipo of (tipos ?? [])) {
      if (grupos[tipo.nome]) {
        result.push({ label: tipo.nome, items: grupos[tipo.nome]!, cor: tipo.cor ?? undefined });
        delete grupos[tipo.nome];
      }
    }
    // Categorias livres (não vinculadas a tipo)
    for (const [cat, items] of Object.entries(grupos)) {
      result.push({ label: cat, items: items! });
    }
    if (semCategoria.length > 0) {
      result.push({ label: "Sem categoria", items: semCategoria });
    }
    return result;
  }, [servicos, tipos]);

  function toggleGrupo(label: string) {
    setGruposExpandidos(prev => ({ ...prev, [label]: !(prev[label] ?? true) }));
  }

  function isExpandido(label: string) {
    return gruposExpandidos[label] ?? true;
  }

  // Verifica se o profissional pode editar um serviço específico
  function podeEditarServico(servicoId: number): boolean {
    if (isAdmin) return true;
    if (!meusServicosIds) return false;
    return meusServicosIds.has(servicoId);
  }

  // Verifica se pode ver dados financeiros de um serviço específico
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

  const isPending = criarMutation.isPending || editarMutation.isPending;
  const isTipoPending = criarTipoMutation.isPending || atualizarTipoMutation.isPending;

  // Guarda de permissão: apenas quem tem servicosVer pode acessar Serviços
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
          {isAdmin && (
            <button onClick={() => setTiposModalOpen(true)} className="btn-ghost py-2 px-3 text-xs border border-border rounded-lg flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Tipos de Profissional</span>
              <span className="sm:hidden">Tipos</span>
            </button>
          )}
          {isAdmin && (
            <button onClick={abrirNovo} className="btn-primary py-2 px-3 text-xs">
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Novo Serviço</span>
              <span className="sm:hidden">Novo</span>
            </button>
          )}
        </div>
      </div>

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
              {/* Cabeçalho do grupo */}
              <button
                onClick={() => toggleGrupo(grupo.label)}
                className="flex items-center gap-2 mb-3 w-full text-left group"
              >
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: grupo.cor ?? "#94a3b8" }}
                />
                <span className="text-sm font-semibold text-foreground">{grupo.label}</span>
                <Badge variant="secondary" className="text-xs">{grupo.items?.length ?? 0}</Badge>
                <span className="ml-auto text-muted-foreground">
                  {isExpandido(grupo.label) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </span>
              </button>

              {isExpandido(grupo.label) && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                  {(grupo.items ?? []).map(s => (
                    <Card key={s.id} className="border-border shadow-none hover:shadow-sm transition-all duration-150 group">
                      <CardContent className="px-2 py-1">
                        {/* Linha topo: categoria + status + editar */}
                        <div className="flex items-center justify-between mb-0.5">
                          <span
                            className="text-[9px] font-semibold uppercase tracking-wider leading-none"
                            style={{ color: grupo.cor ?? "oklch(55% 0.22 264)" }}
                          >
                            {grupo.label === "Sem categoria" ? "Geral" : grupo.label}
                          </span>
                          <div className="flex items-center gap-0.5">
                            <span className={`text-[9px] font-medium px-1 py-0.5 rounded-full leading-none ${
                              s.ativo ? "bg-emerald-50 text-emerald-600" : "bg-gray-100 text-gray-400"
                            }`}>
                              {s.ativo ? "Ativo" : "Inativo"}
                            </span>
                            {podeEditarServico(s.id) && (
                              <button
                                onClick={() => abrirEditar(s)}
                                className="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-secondary transition-all"
                              >
                                <Pencil className="w-2.5 h-2.5 text-muted-foreground" />
                              </button>
                            )}
                          </div>
                        </div>
                        {/* Nome do serviço */}
                        <p className="text-xs font-semibold text-foreground leading-snug mb-1">{s.nome}</p>
                        {/* Rodapé: duração + comissão + valor */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                              <Clock className="w-2.5 h-2.5" />
                              {s.duracaoMinutos ?? 60}m
                            </span>
                            {podeVerDadosFinanceiros(s.id) && (s as any).percentualComissao && parseFloat(String((s as any).percentualComissao)) > 0 && (
                              <span className="flex items-center gap-0.5 text-[10px] font-medium" style={{ color: grupo.cor ?? "oklch(55% 0.22 264)" }}>
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
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

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
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Valor (R$) *</Label>
                <Input type="number" min="0" step="0.01" value={form.valor} onChange={e => setForm(f => ({ ...f, valor: e.target.value }))} placeholder="0,00" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Duração (min)</Label>
                <Input type="number" min="15" step="15" value={form.duracaoMinutos} onChange={e => setForm(f => ({ ...f, duracaoMinutos: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
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

          {/* Formulário de criação/edição */}
          <div className="border border-border rounded-lg p-4 space-y-3 bg-secondary/20">
            <p className="text-xs font-medium text-foreground">{editandoTipo ? "Editar tipo" : "Novo tipo"}</p>
            <div className="flex gap-2">
              <Input
                value={tipoForm.nome}
                onChange={e => setTipoForm(f => ({ ...f, nome: e.target.value }))}
                placeholder="Ex: Manicure, Cabeleireiro..."
                className="flex-1"
              />
              <Button
                onClick={salvarTipo}
                disabled={!tipoForm.nome.trim() || isTipoPending}
                size="sm"
              >
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
                {/* Preview da cor escolhida */}
                <div className="flex items-center gap-2">
                  <span
                    className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded"
                    style={{ color: tipoForm.cor, background: tipoForm.cor + "18" }}
                  >
                    {tipoForm.nome || "Prévia"}
                  </span>
                  <div
                    className="w-5 h-5 rounded-full border-2 border-white shadow-sm"
                    style={{ backgroundColor: tipoForm.cor }}
                  />
                </div>
              </div>

              {/* Paleta de swatches */}
              <div className="grid grid-cols-8 gap-1.5">
                {COR_PRESETS.map(cor => (
                  <button
                    key={cor}
                    type="button"
                    onClick={() => setTipoForm(f => ({ ...f, cor }))}
                    title={cor}
                    className={`w-7 h-7 rounded-lg transition-all hover:scale-110 ${
                      tipoForm.cor === cor
                        ? "ring-2 ring-offset-1 ring-foreground scale-110"
                        : "ring-1 ring-transparent hover:ring-border"
                    }`}
                    style={{ backgroundColor: cor }}
                  />
                ))}
              </div>

              {/* Input hex personalizado */}
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-lg border border-border flex-shrink-0 cursor-pointer relative overflow-hidden"
                  style={{ backgroundColor: tipoForm.cor }}
                  title="Clique para abrir o seletor de cor"
                >
                  <input
                    type="color"
                    value={tipoForm.cor}
                    onChange={e => setTipoForm(f => ({ ...f, cor: e.target.value }))}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                </div>
                <Input
                  value={tipoForm.cor}
                  onChange={e => {
                    const val = e.target.value;
                    if (/^#[0-9a-fA-F]{0,6}$/.test(val)) setTipoForm(f => ({ ...f, cor: val }));
                  }}
                  placeholder="#7c3aed"
                  className="font-mono text-xs h-8 flex-1"
                  maxLength={7}
                />
                <span className="text-[10px] text-muted-foreground whitespace-nowrap">ou cole um hex</span>
              </div>
            </div>
          </div>

          {/* Lista de tipos */}
          <div className="space-y-2">
            {(tipos ?? []).length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">Nenhum tipo cadastrado</p>
            ) : (
              (tipos ?? []).map(t => (
                <div key={t.id} className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-secondary/30 transition-colors">
                  <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: t.cor ?? "#7c3aed" }} />
                  <span className="text-sm font-medium flex-1">{t.nome}</span>
                  <button
                    onClick={() => abrirEditarTipo(t)}
                    className="p-1 rounded hover:bg-secondary transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Remover o tipo "${t.nome}"?`)) {
                        excluirTipoMutation.mutate({ id: t.id });
                      }
                    }}
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
