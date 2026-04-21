import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { Link } from "wouter";
import {
  Plus, MoreHorizontal, Pencil, Trash2, GripVertical,
  User, Calendar, DollarSign, Loader2, KanbanSquare,
  CalendarDays, UserCircle
} from "lucide-react";

type StatusCartao = "em_andamento" | "congelado" | "cancelado" | "concluido";

const STATUS_CONFIG: Record<StatusCartao, { label: string; color: string }> = {
  em_andamento: { label: "Em andamento", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  congelado: { label: "Congelado", color: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400" },
  cancelado: { label: "Cancelado", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  concluido: { label: "Concluído", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
};

interface CartaoForm {
  titulo: string;
  descricao: string;
  status: StatusCartao;
  clienteNome: string;
  responsavelNome: string;
  lembrete: string;
  valor: string;
}

const CARTAO_FORM_INICIAL: CartaoForm = {
  titulo: "",
  descricao: "",
  status: "em_andamento",
  clienteNome: "",
  responsavelNome: "",
  lembrete: "",
  valor: "",
};

export default function Pipeline() {
  const utils = trpc.useUtils();

  const { data: pipelines = [], isLoading } = trpc.pipeline.listar.useQuery();

  const [pipelineAtivo, setPipelineAtivo] = useState<number | null>(null);

  // Ao carregar a página, verificar se há um pipeline gerado pela IA para selecionar
  useEffect(() => {
    if (pipelines.length === 0) return;
    const pipelineIdSalvo = localStorage.getItem("hubly_pipeline_ativo");
    if (pipelineIdSalvo) {
      const id = parseInt(pipelineIdSalvo, 10);
      const existe = pipelines.find((p) => p.id === id);
      if (existe) {
        setPipelineAtivo(id);
        localStorage.removeItem("hubly_pipeline_ativo");
      }
    }
  }, [pipelines]);
  const [modalNovoPipeline, setModalNovoPipeline] = useState(false);
  const [nomePipeline, setNomePipeline] = useState(""); // mantido para compatibilidade futura
  const [modalNovaColuna, setModalNovaColuna] = useState(false);
  const [nomeColuna, setNomeColuna] = useState("");
  const [corColuna, setCorColuna] = useState("#6366f1");
  const [modalCartao, setModalCartao] = useState<{ open: boolean; colunaId?: number; cartaoId?: number }>({ open: false });
  const [cartaoForm, setCartaoForm] = useState<CartaoForm>(CARTAO_FORM_INICIAL);
  const [draggingCartao, setDraggingCartao] = useState<number | null>(null);
  const [dragOverColuna, setDragOverColuna] = useState<number | null>(null);

  const criarPipeline = trpc.pipeline.criar.useMutation({
    onSuccess: () => { utils.pipeline.listar.invalidate(); setModalNovoPipeline(false); setNomePipeline(""); toast.success("Pipeline criado!"); },
    onError: (e) => toast.error(e.message),
  });

  const excluirPipeline = trpc.pipeline.excluir.useMutation({
    onSuccess: () => { utils.pipeline.listar.invalidate(); setPipelineAtivo(null); toast.success("Pipeline excluído"); },
    onError: (e) => toast.error(e.message),
  });

  const criarColuna = trpc.pipeline.criarColuna.useMutation({
    onSuccess: () => { utils.pipeline.listar.invalidate(); setModalNovaColuna(false); setNomeColuna(""); toast.success("Coluna criada!"); },
    onError: (e) => toast.error(e.message),
  });

  const excluirColuna = trpc.pipeline.excluirColuna.useMutation({
    onSuccess: () => { utils.pipeline.listar.invalidate(); toast.success("Coluna excluída"); },
    onError: (e) => toast.error(e.message),
  });

  const criarCartao = trpc.pipeline.criarCartao.useMutation({
    onSuccess: () => { utils.pipeline.listar.invalidate(); setModalCartao({ open: false }); setCartaoForm(CARTAO_FORM_INICIAL); toast.success("Cartão criado!"); },
    onError: (e) => toast.error(e.message),
  });

  const atualizarCartao = trpc.pipeline.atualizarCartao.useMutation({
    onSuccess: () => { utils.pipeline.listar.invalidate(); setModalCartao({ open: false }); setCartaoForm(CARTAO_FORM_INICIAL); toast.success("Cartão atualizado!"); },
    onError: (e) => toast.error(e.message),
  });

  const excluirCartao = trpc.pipeline.excluirCartao.useMutation({
    onSuccess: () => { utils.pipeline.listar.invalidate(); toast.success("Cartão excluído"); },
    onError: (e) => toast.error(e.message),
  });

  const moverCartao = trpc.pipeline.atualizarCartao.useMutation({
    onSuccess: () => utils.pipeline.listar.invalidate(),
  });

  // Pipeline favorita
  const { data: dashboardPipeline } = trpc.pipeline.getDashboardPipeline.useQuery();
  const pipelineFavoritaId = (dashboardPipeline as any)?.pipelineFavoritaId ?? null;

  const setPipelineFavorita = trpc.pipeline.setPipelineFavorita.useMutation({
    onSuccess: () => {
      utils.pipeline.getDashboardPipeline.invalidate();
      toast.success("Pipeline favorita atualizada!");
    },
    onError: (e) => toast.error(e.message),
  });

  const handleToggleFavorita = (pipelineId: number) => {
    const novoId = pipelineFavoritaId === pipelineId ? null : pipelineId;
    setPipelineFavorita.mutate({ pipelineId: novoId });
  };

  const pipelineAtivoData = pipelines.find((p) => p.id === pipelineAtivo) ?? pipelines[0];

  const handleSalvarCartao = () => {
    if (!cartaoForm.titulo.trim()) { toast.error("Título é obrigatório"); return; }
    if (modalCartao.cartaoId) {
      atualizarCartao.mutate({ id: modalCartao.cartaoId, ...cartaoForm });
    } else if (modalCartao.colunaId && pipelineAtivoData) {
      criarCartao.mutate({ colunaId: modalCartao.colunaId, pipelineId: pipelineAtivoData.id, ...cartaoForm });
    }
  };

  const abrirEdicaoCartao = (cartao: { id: number; titulo: string; descricao?: string | null; status: StatusCartao; clienteNome?: string | null; responsavelNome?: string | null; lembrete?: string | null; valor?: string | null }) => {
    setCartaoForm({
      titulo: cartao.titulo,
      descricao: cartao.descricao ?? "",
      status: cartao.status,
      clienteNome: cartao.clienteNome ?? "",
      responsavelNome: cartao.responsavelNome ?? "",
      lembrete: cartao.lembrete ?? "",
      valor: cartao.valor ?? "",
    });
    setModalCartao({ open: true, cartaoId: cartao.id });
  };

  const handleDrop = (colunaId: number) => {
    if (draggingCartao === null) return;
    moverCartao.mutate({ id: draggingCartao, colunaId });
    setDraggingCartao(null);
    setDragOverColuna(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 md:p-6 border-b flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <KanbanSquare className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-semibold">Pipeline</h1>
        </div>
        {/* Nome da pipeline ativa como título fixo */}
        {pipelineAtivoData && (
          <span className="text-sm text-muted-foreground">{pipelineAtivoData.nome}</span>
        )}
      </div>

      {/* Board */}
      {!pipelineAtivoData ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-8">
          <KanbanSquare className="w-12 h-12 text-muted-foreground/30" />
          <div>
            <p className="font-medium text-muted-foreground">Pipeline sendo configurado</p>
            <p className="text-sm text-muted-foreground/70 mt-1">Seu pipeline será criado automaticamente. Aguarde um momento.</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-x-auto">
          <div className="flex gap-4 p-4 md:p-6 h-full min-h-[500px]" style={{ minWidth: "max-content" }}>
            {pipelineAtivoData.colunas.map((coluna) => (
              <div
                key={coluna.id}
                className={`flex flex-col w-56 flex-shrink-0 rounded-lg border bg-muted/30 transition-colors ${dragOverColuna === coluna.id ? "border-primary bg-primary/5" : "border-border"}`}
                onDragOver={(e) => { e.preventDefault(); setDragOverColuna(coluna.id); }}
                onDragLeave={() => setDragOverColuna(null)}
                onDrop={() => handleDrop(coluna.id)}
              >
                {/* Coluna header */}
                <div className="flex items-center justify-between p-2 border-b">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: coluna.cor ?? "#6366f1" }} />
                    <span className="font-medium text-xs">{coluna.nome}</span>
                    <Badge variant="secondary" className="text-xs h-5 px-1.5">{coluna.cartoes.length}</Badge>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <MoreHorizontal className="w-3.5 h-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => { if (confirm(`Excluir coluna "${coluna.nome}" e todos os cartões?`)) excluirColuna.mutate({ id: coluna.id }); }}
                      >
                        <Trash2 className="w-4 h-4 mr-2" /> Excluir coluna
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Cartões */}
                <div className="flex-1 overflow-y-auto p-1.5 space-y-1.5">
                  {coluna.cartoes.map((cartao) => (
                    <div
                      key={cartao.id}
                      draggable
                      onDragStart={() => setDraggingCartao(cartao.id)}
                      onDragEnd={() => { setDraggingCartao(null); setDragOverColuna(null); }}
                      className={`bg-background rounded-md border p-2 cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md transition-all group ${draggingCartao === cartao.id ? "opacity-40" : ""}`}
                    >
                      <div className="flex items-start justify-between gap-1.5">
                        <div className="flex items-start gap-2 flex-1 min-w-0">
                          <GripVertical className="w-3 h-3 text-muted-foreground/40 mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium leading-snug truncate">{cartao.titulo}</p>
                            {cartao.descricao && (
                              <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{cartao.descricao}</p>
                            )}
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 flex-shrink-0">
                              <MoreHorizontal className="w-3 h-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => abrirEdicaoCartao(cartao as Parameters<typeof abrirEdicaoCartao>[0])}>
                              <Pencil className="w-4 h-4 mr-2" /> Editar
                            </DropdownMenuItem>
                            {(cartao as any).agendamentoId && (
                              <DropdownMenuItem asChild>
                                <Link href={`/admin/agendamentos?id=${(cartao as any).agendamentoId}`}>
                                  <CalendarDays className="w-4 h-4 mr-2" /> Ver agendamento
                                </Link>
                              </DropdownMenuItem>
                            )}
                            {(cartao as any).clienteId && (
                              <DropdownMenuItem asChild>
                                <Link href={`/admin/clientes/${(cartao as any).clienteId}`}>
                                  <UserCircle className="w-4 h-4 mr-2" /> Ver cliente
                                </Link>
                              </DropdownMenuItem>
                            )}
                            {((cartao as any).agendamentoId || (cartao as any).clienteId) && (
                              <DropdownMenuSeparator />
                            )}
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => { if (confirm("Excluir este cartão?")) excluirCartao.mutate({ id: cartao.id }); }}
                            >
                              <Trash2 className="w-4 h-4 mr-2" /> Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {/* Meta info */}
                      <div className="mt-1 flex flex-wrap gap-1">
                        <span className={`text-[10px] px-1 py-0.5 rounded-full font-medium ${STATUS_CONFIG[cartao.status as StatusCartao]?.color}`}>
                          {STATUS_CONFIG[cartao.status as StatusCartao]?.label}
                        </span>
                        {cartao.clienteNome && (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                            <User className="w-2.5 h-2.5" /> {cartao.clienteNome}
                          </span>
                        )}
                        {cartao.lembrete && (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                            <Calendar className="w-2.5 h-2.5" /> {cartao.lembrete}
                          </span>
                        )}
                        {cartao.valor && (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                            <DollarSign className="w-2.5 h-2.5" /> R$ {Number(cartao.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Adicionar cartão */}
                <div className="p-1.5 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-muted-foreground hover:text-foreground justify-start"
                    onClick={() => { setCartaoForm(CARTAO_FORM_INICIAL); setModalCartao({ open: true, colunaId: coluna.id }); }}
                  >
                    <Plus className="w-4 h-4 mr-2" /> Adicionar cartão
                  </Button>
                </div>
              </div>
            ))}

            {/* Adicionar coluna */}
            <div className="w-56 flex-shrink-0">
              <Button
                variant="outline"
                className="w-full h-12 border-dashed text-muted-foreground"
                onClick={() => setModalNovaColuna(true)}
              >
                <Plus className="w-4 h-4 mr-2" /> Nova coluna
              </Button>
            </div>
          </div>
        </div>
      )}



      {/* Modal: Novo Pipeline */}
      <Dialog open={modalNovoPipeline} onOpenChange={setModalNovoPipeline}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Novo Pipeline</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Nome do pipeline</Label>
              <Input
                placeholder="Ex: Vendas, Atendimento..."
                value={nomePipeline}
                onChange={(e) => setNomePipeline(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && criarPipeline.mutate({ nome: nomePipeline })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalNovoPipeline(false)}>Cancelar</Button>
            <Button onClick={() => criarPipeline.mutate({ nome: nomePipeline })} disabled={!nomePipeline.trim() || criarPipeline.isPending}>
              {criarPipeline.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Nova Coluna */}
      <Dialog open={modalNovaColuna} onOpenChange={setModalNovaColuna}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Nova Coluna</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Nome da coluna</Label>
              <Input
                placeholder="Ex: Em negociação..."
                value={nomeColuna}
                onChange={(e) => setNomeColuna(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Cor</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={corColuna}
                  onChange={(e) => setCorColuna(e.target.value)}
                  className="w-10 h-10 rounded cursor-pointer border"
                />
                <span className="text-sm text-muted-foreground font-mono">{corColuna}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalNovaColuna(false)}>Cancelar</Button>
            <Button
              onClick={() => pipelineAtivoData && criarColuna.mutate({ pipelineId: pipelineAtivoData.id, nome: nomeColuna, cor: corColuna })}
              disabled={!nomeColuna.trim() || criarColuna.isPending}
            >
              {criarColuna.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Cartão */}
      <Dialog open={modalCartao.open} onOpenChange={(open) => { if (!open) { setModalCartao({ open: false }); setCartaoForm(CARTAO_FORM_INICIAL); } }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{modalCartao.cartaoId ? "Editar cartão" : "Novo cartão"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Título *</Label>
              <Input
                placeholder="Título do cartão"
                value={cartaoForm.titulo}
                onChange={(e) => setCartaoForm((f) => ({ ...f, titulo: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Textarea
                placeholder="Detalhes adicionais..."
                value={cartaoForm.descricao}
                onChange={(e) => setCartaoForm((f) => ({ ...f, descricao: e.target.value }))}
                rows={3}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={cartaoForm.status} onValueChange={(v) => setCartaoForm((f) => ({ ...f, status: v as StatusCartao }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Cliente</Label>
                <Input
                  placeholder="Nome do cliente"
                  value={cartaoForm.clienteNome}
                  onChange={(e) => setCartaoForm((f) => ({ ...f, clienteNome: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Responsável</Label>
                <Input
                  placeholder="Nome do responsável"
                  value={cartaoForm.responsavelNome}
                  onChange={(e) => setCartaoForm((f) => ({ ...f, responsavelNome: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Lembrete</Label>
                <Input
                  type="date"
                  value={cartaoForm.lembrete}
                  onChange={(e) => setCartaoForm((f) => ({ ...f, lembrete: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Valor (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={cartaoForm.valor}
                  onChange={(e) => setCartaoForm((f) => ({ ...f, valor: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setModalCartao({ open: false }); setCartaoForm(CARTAO_FORM_INICIAL); }}>
              Cancelar
            </Button>
            <Button onClick={handleSalvarCartao} disabled={criarCartao.isPending || atualizarCartao.isPending}>
              {(criarCartao.isPending || atualizarCartao.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {modalCartao.cartaoId ? "Salvar" : "Criar cartão"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
