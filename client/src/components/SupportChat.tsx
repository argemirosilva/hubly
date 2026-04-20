import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  MessageCircle, X, Send, Bot, User, Loader2,
  TicketPlus, ListChecks, ChevronLeft, Star,
} from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

type Tab = "chat" | "chamados" | "novo_chamado" | "detalhe_chamado";

const PAGE_LABELS: Record<string, string> = {
  "/admin": "Dashboard",
  "/admin/calendario": "Calendário",
  "/admin/agendamentos": "Agendamentos",
  "/admin/clientes": "Clientes",
  "/admin/profissionais": "Profissionais",
  "/admin/servicos": "Serviços",
  "/admin/financeiro": "Financeiro",
  "/admin/automacoes": "Automações",
  "/admin/pipeline": "Pipeline",
  "/admin/bloqueios": "Bloqueios de Agenda",
  "/admin/usuarios": "Usuários",
  "/admin/configuracoes": "Configurações",
  "/admin/importacao-zandu": "Importação Zandu",
  "/admin/ia-financeiro": "IA Financeira",
  "/admin/ia-clientes": "IA Clientes",
};

const QUICK_QUESTIONS = [
  "Como criar um agendamento?",
  "Como confirmar um pré-agendamento?",
  "Como cadastrar um novo cliente?",
  "Como criar uma automação de WhatsApp?",
  "Como importar dados do Zandu?",
  "Como funciona o Score Financeiro?",
];

const STATUS_LABELS: Record<string, string> = {
  aberto: "Aberto",
  em_atendimento: "Em atendimento",
  aguardando_cliente: "Aguardando você",
  resolvido: "Resolvido",
  fechado: "Fechado",
};

const STATUS_COLORS: Record<string, string> = {
  aberto: "bg-blue-100 text-blue-700",
  em_atendimento: "bg-yellow-100 text-yellow-700",
  aguardando_cliente: "bg-orange-100 text-orange-700",
  resolvido: "bg-green-100 text-green-700",
  fechado: "bg-gray-100 text-gray-600",
};

export function SupportChat() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("chat");
  const [selectedChamadoId, setSelectedChamadoId] = useState<number | null>(null);

  // Chat IA state
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Olá! Sou a assistente do Hubly. Pode me perguntar qualquer coisa sobre o sistema — estou aqui para ajudar!",
    },
  ]);

  // Novo chamado state
  const [novoChamadoTitulo, setNovoChamadoTitulo] = useState("");
  const [novoChamadoDescricao, setNovoChamadoDescricao] = useState("");
  const [novoChamadoPrioridade, setNovoChamadoPrioridade] = useState<"baixa" | "media" | "alta" | "critica">("media");

  // Resposta no chamado
  const [respostaMsg, setRespostaMsg] = useState("");

  // Avaliação
  const [avaliacaoNota, setAvaliacaoNota] = useState(0);
  const [avaliacaoComentario, setAvaliacaoComentario] = useState("");

  const [location] = useLocation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Queries
  const chamadosQuery = trpc.suporte.listarMeusChamados.useQuery(undefined, {
    enabled: open && (tab === "chamados" || tab === "detalhe_chamado"),
  });
  const mensagensQuery = trpc.suporte.getChamadoMensagens.useQuery(
    { chamadoId: selectedChamadoId! },
    { enabled: tab === "detalhe_chamado" && selectedChamadoId !== null, refetchInterval: 10000 }
  );

  // Mutations
  const chatMutation = trpc.suporte.chat.useMutation({
    onSuccess: (data) => {
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
    },
  });

  const abrirChamadoMutation = trpc.suporte.abrirChamado.useMutation({
    onSuccess: (data) => {
      toast.success("Chamado aberto com sucesso!");
      setNovoChamadoTitulo("");
      setNovoChamadoDescricao("");
      setNovoChamadoPrioridade("media");
      chamadosQuery.refetch();
      setSelectedChamadoId(data.chamadoId);
      setTab("detalhe_chamado");
    },
    onError: () => toast.error("Erro ao abrir chamado"),
  });

  const responderMutation = trpc.suporte.responderChamadoCliente.useMutation({
    onSuccess: () => {
      setRespostaMsg("");
      mensagensQuery.refetch();
    },
    onError: () => toast.error("Erro ao enviar resposta"),
  });

  const avaliarMutation = trpc.suporte.avaliarChamado.useMutation({
    onSuccess: () => {
      toast.success("Avaliação enviada!");
      setAvaliacaoNota(0);
      setAvaliacaoComentario("");
      chamadosQuery.refetch();
      mensagensQuery.refetch();
    },
    onError: () => toast.error("Erro ao enviar avaliação"),
  });

  // Open via event
  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("open-support-chat", handler);
    return () => window.removeEventListener("open-support-chat", handler);
  }, []);

  // Scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, chatMutation.isPending, mensagensQuery.data]);

  const paginaAtual = PAGE_LABELS[location] ?? location;

  const sendMessage = (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || chatMutation.isPending) return;
    const newMessages: Message[] = [...messages, { role: "user", content: msg }];
    setMessages(newMessages);
    setInput("");
    chatMutation.mutate({ messages: newMessages, paginaAtual });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const selectedChamado = chamadosQuery.data?.find((c) => c.id === selectedChamadoId);

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center text-white transition-transform hover:scale-110 active:scale-95"
          style={{ background: "oklch(32% 0.12 255)" }}
          aria-label="Abrir suporte"
        >
          <MessageCircle size={24} />
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div
          className="fixed bottom-6 right-6 z-50 flex flex-col rounded-2xl shadow-2xl overflow-hidden"
          style={{
            width: "min(420px, calc(100vw - 2rem))",
            height: "min(600px, calc(100vh - 5rem))",
            background: "var(--background)",
            border: "1px solid var(--border)",
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3 shrink-0"
            style={{ background: "oklch(32% 0.12 255)", color: "white" }}
          >
            <div className="flex items-center gap-2">
              {(tab === "novo_chamado" || tab === "detalhe_chamado") && (
                <button
                  onClick={() => setTab("chamados")}
                  className="p-1 rounded hover:bg-white/20 transition-colors mr-1"
                >
                  <ChevronLeft size={16} />
                </button>
              )}
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <Bot size={16} />
              </div>
              <div>
                <p className="text-sm font-semibold leading-none">
                  {tab === "chat" && "Assistente Hubly"}
                  {tab === "chamados" && "Meus Chamados"}
                  {tab === "novo_chamado" && "Novo Chamado"}
                  {tab === "detalhe_chamado" && `Chamado #${selectedChamadoId}`}
                </p>
                {tab === "chat" && (
                  <p className="text-xs opacity-75 mt-0.5">Página atual: {paginaAtual}</p>
                )}
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* Tabs */}
          <div
            className="flex shrink-0"
            style={{ borderBottom: "1px solid var(--border)" }}
          >
            <button
              onClick={() => setTab("chat")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors ${
                tab === "chat"
                  ? "border-b-2 border-blue-600 text-blue-600"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Bot size={13} /> Chat IA
            </button>
            <button
              onClick={() => setTab("chamados")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors ${
                tab === "chamados" || tab === "novo_chamado" || tab === "detalhe_chamado"
                  ? "border-b-2 border-blue-600 text-blue-600"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <ListChecks size={13} /> Chamados
            </button>
          </div>

          {/* ── TAB: CHAT IA ── */}
          {tab === "chat" && (
            <>
              <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto px-4 py-3 space-y-3"
                style={{ scrollBehavior: "smooth" }}
              >
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
                  >
                    <div
                      className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-white text-xs mt-0.5"
                      style={{
                        background: msg.role === "user"
                          ? "oklch(62% 0.18 145)"
                          : "oklch(32% 0.12 255)",
                      }}
                    >
                      {msg.role === "user" ? <User size={13} /> : <Bot size={13} />}
                    </div>
                    <div
                      className="max-w-[80%] rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap"
                      style={{
                        background: msg.role === "user"
                          ? "oklch(32% 0.12 255)"
                          : "var(--muted)",
                        color: msg.role === "user" ? "white" : "var(--foreground)",
                        borderBottomRightRadius: msg.role === "user" ? "4px" : undefined,
                        borderBottomLeftRadius: msg.role === "assistant" ? "4px" : undefined,
                      }}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}

                {chatMutation.isPending && (
                  <div className="flex gap-2 items-center">
                    <div
                      className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-white"
                      style={{ background: "oklch(32% 0.12 255)" }}
                    >
                      <Bot size={13} />
                    </div>
                    <div className="rounded-2xl rounded-bl-[4px] px-4 py-3" style={{ background: "var(--muted)" }}>
                      <Loader2 size={14} className="animate-spin text-muted-foreground" />
                    </div>
                  </div>
                )}

                {messages.length === 1 && !chatMutation.isPending && (
                  <div className="space-y-1.5 pt-1">
                    <p className="text-xs text-muted-foreground px-1">Perguntas frequentes:</p>
                    {QUICK_QUESTIONS.map((q) => (
                      <button
                        key={q}
                        onClick={() => sendMessage(q)}
                        className="w-full text-left text-xs px-3 py-2 rounded-xl border transition-colors hover:bg-accent"
                        style={{ borderColor: "var(--border)" }}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Abrir chamado banner */}
              {messages.length >= 3 && (
                <div
                  className="px-4 py-2 shrink-0 flex items-center justify-between text-xs"
                  style={{ borderTop: "1px solid var(--border)", background: "var(--muted)" }}
                >
                  <span className="text-muted-foreground">Problema não resolvido?</span>
                  <button
                    onClick={() => setTab("novo_chamado")}
                    className="flex items-center gap-1 text-blue-600 font-medium hover:underline"
                  >
                    <TicketPlus size={12} /> Abrir chamado
                  </button>
                </div>
              )}

              {/* Input */}
              <div
                className="px-3 py-3 shrink-0 flex gap-2 items-end"
                style={{ borderTop: "1px solid var(--border)" }}
              >
                <Textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Digite sua dúvida..."
                  className="resize-none text-sm min-h-[40px] max-h-[100px]"
                  rows={1}
                  disabled={chatMutation.isPending}
                />
                <Button
                  size="icon"
                  onClick={() => sendMessage()}
                  disabled={!input.trim() || chatMutation.isPending}
                  className="shrink-0"
                  style={{ background: "oklch(32% 0.12 255)", color: "white" }}
                >
                  <Send size={15} />
                </Button>
              </div>
            </>
          )}

          {/* ── TAB: LISTA DE CHAMADOS ── */}
          {tab === "chamados" && (
            <>
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
                {chamadosQuery.isLoading && (
                  <div className="flex justify-center py-8">
                    <Loader2 size={20} className="animate-spin text-muted-foreground" />
                  </div>
                )}
                {!chamadosQuery.isLoading && (!chamadosQuery.data || chamadosQuery.data.length === 0) && (
                  <div className="text-center py-10 text-muted-foreground text-sm">
                    <ListChecks size={32} className="mx-auto mb-2 opacity-30" />
                    <p>Nenhum chamado aberto ainda.</p>
                  </div>
                )}
                {chamadosQuery.data?.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => { setSelectedChamadoId(c.id); setTab("detalhe_chamado"); }}
                    className="w-full text-left p-3 rounded-xl border hover:bg-accent transition-colors"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium leading-snug line-clamp-2">{c.titulo}</p>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ${STATUS_COLORS[c.status] ?? ""}`}>
                        {STATUS_LABELS[c.status] ?? c.status}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(c.createdAt).toLocaleDateString("pt-BR")}
                    </p>
                  </button>
                ))}
              </div>
              <div className="px-4 py-3 shrink-0" style={{ borderTop: "1px solid var(--border)" }}>
                <Button
                  className="w-full"
                  onClick={() => setTab("novo_chamado")}
                  style={{ background: "oklch(32% 0.12 255)", color: "white" }}
                >
                  <TicketPlus size={15} className="mr-2" /> Abrir novo chamado
                </Button>
              </div>
            </>
          )}

          {/* ── TAB: NOVO CHAMADO ── */}
          {tab === "novo_chamado" && (
            <>
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Título</Label>
                  <Input
                    value={novoChamadoTitulo}
                    onChange={(e) => setNovoChamadoTitulo(e.target.value)}
                    placeholder="Ex: Não consigo criar agendamento"
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Descrição</Label>
                  <Textarea
                    value={novoChamadoDescricao}
                    onChange={(e) => setNovoChamadoDescricao(e.target.value)}
                    placeholder="Descreva o problema com detalhes..."
                    className="resize-none text-sm min-h-[100px]"
                    rows={4}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Prioridade</Label>
                  <Select
                    value={novoChamadoPrioridade}
                    onValueChange={(v) => setNovoChamadoPrioridade(v as any)}
                  >
                    <SelectTrigger className="text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="baixa">Baixa</SelectItem>
                      <SelectItem value="media">Média</SelectItem>
                      <SelectItem value="alta">Alta</SelectItem>
                      <SelectItem value="critica">Crítica</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="px-4 py-3 shrink-0" style={{ borderTop: "1px solid var(--border)" }}>
                <Button
                  className="w-full"
                  disabled={
                    !novoChamadoTitulo.trim() ||
                    !novoChamadoDescricao.trim() ||
                    abrirChamadoMutation.isPending
                  }
                  onClick={() =>
                    abrirChamadoMutation.mutate({
                      titulo: novoChamadoTitulo,
                      descricao: novoChamadoDescricao,
                      prioridade: novoChamadoPrioridade,
                    })
                  }
                  style={{ background: "oklch(32% 0.12 255)", color: "white" }}
                >
                  {abrirChamadoMutation.isPending ? (
                    <Loader2 size={15} className="animate-spin mr-2" />
                  ) : (
                    <TicketPlus size={15} className="mr-2" />
                  )}
                  Enviar chamado
                </Button>
              </div>
            </>
          )}

          {/* ── TAB: DETALHE DO CHAMADO ── */}
          {tab === "detalhe_chamado" && selectedChamado && (
            <>
              <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto px-4 py-3 space-y-3"
                style={{ scrollBehavior: "smooth" }}
              >
                {/* Status badge */}
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[selectedChamado.status] ?? ""}`}>
                    {STATUS_LABELS[selectedChamado.status] ?? selectedChamado.status}
                  </span>
                  <span className="text-xs text-muted-foreground">{selectedChamado.titulo}</span>
                </div>

                {/* Messages */}
                {mensagensQuery.isLoading && (
                  <div className="flex justify-center py-4">
                    <Loader2 size={18} className="animate-spin text-muted-foreground" />
                  </div>
                )}
                {mensagensQuery.data?.map((m) => (
                  <div
                    key={m.id}
                    className={`flex gap-2 ${m.autorTipo === "cliente" ? "flex-row-reverse" : "flex-row"}`}
                  >
                    <div
                      className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-white text-xs mt-0.5"
                      style={{
                        background: m.autorTipo === "cliente"
                          ? "oklch(62% 0.18 145)"
                          : m.autorTipo === "ia"
                          ? "oklch(55% 0.15 300)"
                          : "oklch(32% 0.12 255)",
                      }}
                    >
                      {m.autorTipo === "cliente" ? <User size={13} /> : <Bot size={13} />}
                    </div>
                    <div className="max-w-[80%] space-y-0.5">
                      <p className="text-[10px] text-muted-foreground px-1">
                        {m.autorNome ?? (m.autorTipo === "ia" ? "IA" : "Suporte")}
                      </p>
                      <div
                        className="rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap"
                        style={{
                          background: m.autorTipo === "cliente"
                            ? "oklch(32% 0.12 255)"
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

                {/* Avaliação — só para chamados resolvidos sem nota */}
                {(selectedChamado.status === "resolvido" || selectedChamado.status === "fechado") &&
                  !selectedChamado.avaliacaoNota && (
                    <div
                      className="rounded-xl p-3 space-y-2"
                      style={{ background: "var(--muted)", border: "1px solid var(--border)" }}
                    >
                      <p className="text-xs font-medium">Avalie o atendimento</p>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <button
                            key={n}
                            onClick={() => setAvaliacaoNota(n)}
                            className="transition-transform hover:scale-110"
                          >
                            <Star
                              size={20}
                              className={n <= avaliacaoNota ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground"}
                            />
                          </button>
                        ))}
                      </div>
                      {avaliacaoNota > 0 && (
                        <>
                          <Textarea
                            value={avaliacaoComentario}
                            onChange={(e) => setAvaliacaoComentario(e.target.value)}
                            placeholder="Comentário opcional..."
                            className="resize-none text-xs min-h-[60px]"
                            rows={2}
                          />
                          <Button
                            size="sm"
                            className="w-full text-xs"
                            disabled={avaliarMutation.isPending}
                            onClick={() =>
                              avaliarMutation.mutate({
                                chamadoId: selectedChamado.id,
                                nota: avaliacaoNota,
                                comentario: avaliacaoComentario || undefined,
                              })
                            }
                            style={{ background: "oklch(32% 0.12 255)", color: "white" }}
                          >
                            {avaliarMutation.isPending ? <Loader2 size={12} className="animate-spin mr-1" /> : null}
                            Enviar avaliação
                          </Button>
                        </>
                      )}
                    </div>
                  )}
              </div>

              {/* Reply input — só se não fechado */}
              {selectedChamado.status !== "fechado" && (
                <div
                  className="px-3 py-3 shrink-0 flex gap-2 items-end"
                  style={{ borderTop: "1px solid var(--border)" }}
                >
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
                    placeholder="Responder ao chamado..."
                    className="resize-none text-sm min-h-[40px] max-h-[100px]"
                    rows={1}
                    disabled={responderMutation.isPending}
                  />
                  <Button
                    size="icon"
                    onClick={() => {
                      if (respostaMsg.trim()) {
                        responderMutation.mutate({ chamadoId: selectedChamado.id, mensagem: respostaMsg });
                      }
                    }}
                    disabled={!respostaMsg.trim() || responderMutation.isPending}
                    className="shrink-0"
                    style={{ background: "oklch(32% 0.12 255)", color: "white" }}
                  >
                    {responderMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={15} />}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </>
  );
}
