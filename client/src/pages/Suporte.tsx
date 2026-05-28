import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  TicketPlus, ChevronLeft, Bot, User, Loader2, Star,
  Clock, CheckCircle2, AlertCircle, XCircle, MessageSquare,
  BookOpen, ChevronRight, Search, ExternalLink,
  Calendar, Users, DollarSign, Zap, Bell, Settings, UserCog, Package, Kanban,
} from "lucide-react";
import { Link } from "wouter";

const STATUS_LABELS: Record<string, string> = {
  aberto: "Aberto",
  em_atendimento: "Em atendimento",
  aguardando_cliente: "Aguardando você",
  resolvido: "Resolvido",
  fechado: "Fechado",
};

const STATUS_COLORS: Record<string, string> = {
  aberto: "bg-amber-100 text-blue-700 dark:bg-stone-900/30 dark:text-blue-300",
  em_atendimento: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  aguardando_cliente: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  resolvido: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  fechado: "bg-stone-100 text-gray-600 dark:bg-stone-800 dark:text-gray-400",
};

const STATUS_ICONS: Record<string, React.ElementType> = {
  aberto: AlertCircle,
  em_atendimento: Clock,
  aguardando_cliente: MessageSquare,
  resolvido: CheckCircle2,
  fechado: XCircle,
};

const PRIORIDADE_LABELS: Record<string, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
  critica: "Crítica",
};

const PRIORIDADE_COLORS: Record<string, string> = {
  baixa: "bg-stone-100 text-gray-600",
  media: "bg-amber-100 text-amber-700",
  alta: "bg-orange-100 text-orange-600",
  critica: "bg-red-100 text-red-600",
};

type View = "lista" | "detalhe" | "novo";

export default function Suporte() {
  const [view, setView] = useState<View>("lista");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [respostaMsg, setRespostaMsg] = useState("");
  const [avaliacaoNota, setAvaliacaoNota] = useState(0);
  const [avaliacaoComentario, setAvaliacaoComentario] = useState("");

  // Novo chamado
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [prioridade, setPrioridade] = useState<"baixa" | "media" | "alta" | "critica">("media");

  const utils = trpc.useUtils();

  const chamadosQuery = trpc.suporte.listarMeusChamados.useQuery();
  const mensagensQuery = trpc.suporte.getChamadoMensagens.useQuery(
    { chamadoId: selectedId! },
    { enabled: view === "detalhe" && selectedId !== null, refetchInterval: 15000 }
  );

  const abrirChamadoMutation = trpc.suporte.abrirChamado.useMutation({
    onSuccess: (data) => {
      toast.success("Chamado aberto com sucesso!");
      setTitulo("");
      setDescricao("");
      setPrioridade("media");
      utils.suporte.listarMeusChamados.invalidate();
      setSelectedId(data.chamadoId);
      setView("detalhe");
    },
    onError: () => toast.error("Erro ao abrir chamado"),
  });

  const responderMutation = trpc.suporte.responderChamadoCliente.useMutation({
    onSuccess: () => {
      setRespostaMsg("");
      utils.suporte.getChamadoMensagens.invalidate({ chamadoId: selectedId! });
    },
    onError: () => toast.error("Erro ao enviar mensagem"),
  });

  const avaliarMutation = trpc.suporte.avaliarChamado.useMutation({
    onSuccess: () => {
      toast.success("Avaliação enviada!");
      setAvaliacaoNota(0);
      setAvaliacaoComentario("");
      utils.suporte.listarMeusChamados.invalidate();
      utils.suporte.getChamadoMensagens.invalidate({ chamadoId: selectedId! });
    },
    onError: () => toast.error("Erro ao enviar avaliação"),
  });

  const selectedChamado = chamadosQuery.data?.find((c) => c.id === selectedId);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {(view === "detalhe" || view === "novo") && (
            <button
              onClick={() => setView("lista")}
              className="p-2 rounded-lg hover:bg-accent transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
          )}
          <div>
            <h1 className="text-2xl font-bold">
              {view === "lista" && "Meus Chamados"}
              {view === "novo" && "Novo Chamado"}
              {view === "detalhe" && `Chamado #${selectedId}`}
            </h1>
            {view === "lista" && (
              <p className="text-sm text-muted-foreground mt-0.5">
                Acompanhe e gerencie suas solicitações de suporte
              </p>
            )}
          </div>
        </div>
        {view === "lista" && (
          <Button onClick={() => setView("novo")} style={{ background: "oklch(28.5% 0.035 55)", color: "white" }}>
            <TicketPlus size={16} className="mr-2" /> Abrir chamado
          </Button>
        )}
      </div>

      {/* ── MANUAL COMPLETO (topo da lista) ── */}
      {view === "lista" && (
        <div className="rounded-2xl border overflow-hidden" style={{ borderColor: "var(--border)" }}>
          {/* Cabeçalho do manual */}
          <div
            className="px-5 py-4 flex items-center justify-between"
            style={{ background: "oklch(45% 0.060 55)", color: "white" }}
          >
            <div className="flex items-center gap-3">
              <BookOpen size={20} />
              <div>
                <p className="font-semibold text-sm">Manual do Sistema Hubly</p>
                <p className="text-xs opacity-80">Consulte antes de abrir um chamado — a maioria das dúvidas já está respondida aqui</p>
              </div>
            </div>
            <Link href="/admin/manual">
              <button
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium"
                style={{ background: "rgba(255,255,255,0.15)", color: "white" }}
              >
                Abrir manual completo <ExternalLink size={12} />
              </button>
            </Link>
          </div>
          {/* Grid de seções */}
          <div className="p-4" style={{ background: "var(--card)" }}>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { href: "/admin/manual", icon: <Calendar size={15} />, label: "Agendamentos", color: "oklch(50% 0.060 55)" },
                { href: "/admin/manual", icon: <Users size={15} />, label: "Clientes", color: "oklch(50% 0.18 200)" },
                { href: "/admin/manual", icon: <DollarSign size={15} />, label: "Financeiro", color: "oklch(50% 0.18 155)" },
                { href: "/admin/manual", icon: <Zap size={15} />, label: "Automações", color: "oklch(50% 0.18 300)" },
                { href: "/admin/manual", icon: <UserCog size={15} />, label: "Equipe e Permissões", color: "oklch(50% 0.18 30)" },
                { href: "/admin/manual", icon: <Package size={15} />, label: "Pacotes", color: "oklch(50% 0.18 60)" },
                { href: "/admin/manual", icon: <Bell size={15} />, label: "Notificações", color: "oklch(50% 0.18 340)" },
                { href: "/admin/manual", icon: <Kanban size={15} />, label: "Pipeline", color: "oklch(50% 0.060 55)" },
                { href: "/admin/manual", icon: <Settings size={15} />, label: "Configurações", color: "oklch(50% 0.050 55)" },
              ].map((item) => (
                <Link key={item.label} href={item.href}>
                  <button
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-left hover:bg-accent/50 transition-colors"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <span
                      className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: item.color + "18", color: item.color }}
                    >
                      {item.icon}
                    </span>
                    <span className="text-xs font-medium text-foreground">{item.label}</span>
                    <ChevronRight size={12} className="ml-auto text-muted-foreground" />
                  </button>
                </Link>
              ))}
            </div>
            <p className="text-xs text-muted-foreground text-center mt-3">
              Não encontrou o que procura? Abra um chamado abaixo e nossa equipe responde em breve.
            </p>
          </div>
        </div>
      )}

      {/* ── LISTA ── */}
      {view === "lista" && (
        <div className="space-y-3">
          {chamadosQuery.isLoading && (
            <div className="flex justify-center py-12">
              <Loader2 size={24} className="animate-spin text-muted-foreground" />
            </div>
          )}
          {!chamadosQuery.isLoading && (!chamadosQuery.data || chamadosQuery.data.length === 0) && (
            <div className="text-center py-16 text-muted-foreground">
              <MessageSquare size={40} className="mx-auto mb-3 opacity-20" />
              <p className="font-medium">Nenhum chamado aberto</p>
              <p className="text-sm mt-1">Clique em "Abrir chamado" para criar sua primeira solicitação.</p>
            </div>
          )}
          {chamadosQuery.data?.map((c) => {
            const StatusIcon = STATUS_ICONS[c.status] ?? AlertCircle;
            return (
              <button
                key={c.id}
                onClick={() => { setSelectedId(c.id); setView("detalhe"); }}
                className="w-full text-left p-4 rounded-xl border hover:bg-accent/50 transition-colors group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-muted-foreground font-mono">#{c.id}</span>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium inline-flex items-center gap-1 ${PRIORIDADE_COLORS[c.prioridade] ?? ""}`}>
                        {PRIORIDADE_LABELS[c.prioridade] ?? c.prioridade}
                      </span>
                    </div>
                    <p className="font-medium text-sm group-hover:text-primary transition-colors">{c.titulo}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Aberto em {new Date(c.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
                    </p>
                  </div>
                  <span className={`text-[11px] px-2.5 py-1 rounded-full font-medium inline-flex items-center gap-1 shrink-0 ${STATUS_COLORS[c.status] ?? ""}`}>
                    <StatusIcon size={11} />
                    {STATUS_LABELS[c.status] ?? c.status}
                  </span>
                </div>
                {c.avaliacaoNota && (
                  <div className="flex items-center gap-1 mt-2">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star
                        key={n}
                        size={12}
                        className={n <= c.avaliacaoNota! ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground/30"}
                      />
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* ── NOVO CHAMADO ── */}
      {view === "novo" && (
        <div className="rounded-xl border p-6 space-y-5 max-w-2xl">
          <div className="space-y-1.5">
            <Label>Título <span className="text-red-500">*</span></Label>
            <Input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex: Não consigo criar agendamento"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Descrição <span className="text-red-500">*</span></Label>
            <Textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Descreva o problema com o máximo de detalhes possível..."
              className="min-h-[140px] resize-none"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Prioridade</Label>
            <Select value={prioridade} onValueChange={(v) => setPrioridade(v as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="baixa">Baixa — dúvidas gerais</SelectItem>
                <SelectItem value="media">Média — funcionalidade com problema</SelectItem>
                <SelectItem value="alta">Alta — impacto no atendimento</SelectItem>
                <SelectItem value="critica">Crítica — sistema indisponível</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => setView("lista")}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              className="flex-1"
              disabled={!titulo.trim() || !descricao.trim() || abrirChamadoMutation.isPending}
              onClick={() => abrirChamadoMutation.mutate({ titulo, descricao, prioridade })}
              style={{ background: "oklch(28.5% 0.035 55)", color: "white" }}
            >
              {abrirChamadoMutation.isPending ? (
                <Loader2 size={15} className="animate-spin mr-2" />
              ) : (
                <TicketPlus size={15} className="mr-2" />
              )}
              Enviar chamado
            </Button>
          </div>
        </div>
      )}

      {/* ── DETALHE ── */}
      {view === "detalhe" && selectedChamado && (
        <div className="space-y-4">
          {/* Info card */}
          <div className="rounded-xl border p-4 flex flex-wrap gap-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Status</p>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium inline-flex items-center gap-1 ${STATUS_COLORS[selectedChamado.status] ?? ""}`}>
                {STATUS_LABELS[selectedChamado.status] ?? selectedChamado.status}
              </span>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Prioridade</p>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${PRIORIDADE_COLORS[selectedChamado.prioridade] ?? ""}`}>
                {PRIORIDADE_LABELS[selectedChamado.prioridade] ?? selectedChamado.prioridade}
              </span>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Aberto em</p>
              <p className="text-xs font-medium">
                {new Date(selectedChamado.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
              </p>
            </div>
            {selectedChamado.avaliacaoNota && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Avaliação</p>
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star
                      key={n}
                      size={14}
                      className={n <= selectedChamado.avaliacaoNota! ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground/30"}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Thread */}
          <div className="rounded-xl border overflow-hidden">
            <div className="px-4 py-3 border-b" style={{ background: "var(--muted)" }}>
              <p className="text-sm font-medium">Conversa</p>
            </div>
            <div className="p-4 space-y-4 min-h-[200px] max-h-[400px] overflow-y-auto">
              {mensagensQuery.isLoading && (
                <div className="flex justify-center py-8">
                  <Loader2 size={20} className="animate-spin text-muted-foreground" />
                </div>
              )}
              {mensagensQuery.data?.map((m) => (
                <div
                  key={m.id}
                  className={`flex gap-3 ${m.autorTipo === "cliente" ? "flex-row-reverse" : "flex-row"}`}
                >
                  <div
                    className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-white text-xs mt-0.5"
                    style={{
                      background: m.autorTipo === "cliente"
                        ? "oklch(62% 0.18 145)"
                        : m.autorTipo === "ia"
                        ? "oklch(55% 0.15 300)"
                        : "oklch(28.5% 0.035 55)",
                    }}
                  >
                    {m.autorTipo === "cliente" ? <User size={14} /> : <Bot size={14} />}
                  </div>
                  <div className={`max-w-[75%] space-y-1 ${m.autorTipo === "cliente" ? "items-end" : "items-start"} flex flex-col`}>
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-muted-foreground">
                        {m.autorNome ?? (m.autorTipo === "ia" ? "IA" : "Suporte Hubly")}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(m.createdAt).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    <div
                      className="rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap"
                      style={{
                        background: m.autorTipo === "cliente"
                          ? "oklch(28.5% 0.035 55)"
                          : "var(--muted)",
                        color: m.autorTipo === "cliente" ? "white" : "var(--foreground)",
                        borderBottomRightRadius: m.autorTipo === "cliente" ? "4px" : undefined,
                        borderBottomLeftRadius: m.autorTipo !== "cliente" ? "4px" : undefined,
                      }}
                    >
                      {m.conteudo}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Reply */}
            {selectedChamado.status !== "fechado" && (
              <div className="px-4 py-3 border-t flex gap-3 items-end">
                <Textarea
                  value={respostaMsg}
                  onChange={(e) => setRespostaMsg(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      if (respostaMsg.trim() && !responderMutation.isPending) {
                        responderMutation.mutate({ chamadoId: selectedChamado.id, mensagem: respostaMsg });
                      }
                    }
                  }}
                  placeholder="Adicionar mensagem ao chamado..."
                  className="resize-none text-sm min-h-[60px] max-h-[120px] flex-1"
                  rows={2}
                  disabled={responderMutation.isPending}
                />
                <Button
                  onClick={() => {
                    if (respostaMsg.trim()) {
                      responderMutation.mutate({ chamadoId: selectedChamado.id, mensagem: respostaMsg });
                    }
                  }}
                  disabled={!respostaMsg.trim() || responderMutation.isPending}
                  style={{ background: "oklch(28.5% 0.035 55)", color: "white" }}
                >
                  {responderMutation.isPending ? <Loader2 size={15} className="animate-spin" /> : "Enviar"}
                </Button>
              </div>
            )}
          </div>

          {/* Avaliação */}
          {(selectedChamado.status === "resolvido" || selectedChamado.status === "fechado") &&
            !selectedChamado.avaliacaoNota && (
              <div className="rounded-xl border p-5 space-y-3">
                <p className="font-medium text-sm">Avalie o atendimento</p>
                <p className="text-xs text-muted-foreground">Sua opinião nos ajuda a melhorar o suporte.</p>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      onClick={() => setAvaliacaoNota(n)}
                      className="transition-transform hover:scale-110"
                    >
                      <Star
                        size={28}
                        className={n <= avaliacaoNota ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground/30"}
                      />
                    </button>
                  ))}
                </div>
                {avaliacaoNota > 0 && (
                  <>
                    <Textarea
                      value={avaliacaoComentario}
                      onChange={(e) => setAvaliacaoComentario(e.target.value)}
                      placeholder="Comentário opcional sobre o atendimento..."
                      className="resize-none text-sm min-h-[80px]"
                    />
                    <Button
                      disabled={avaliarMutation.isPending}
                      onClick={() =>
                        avaliarMutation.mutate({
                          chamadoId: selectedChamado.id,
                          nota: avaliacaoNota,
                          comentario: avaliacaoComentario || undefined,
                        })
                      }
                      style={{ background: "oklch(28.5% 0.035 55)", color: "white" }}
                    >
                      {avaliarMutation.isPending ? <Loader2 size={15} className="animate-spin mr-2" /> : null}
                      Enviar avaliação
                    </Button>
                  </>
                )}
              </div>
            )}
        </div>
      )}
    </div>
  );
}
