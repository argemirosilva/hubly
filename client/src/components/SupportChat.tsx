import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageCircle, X, Send, Bot, User, Loader2, BookOpen } from "lucide-react";
import { Link } from "wouter";

interface Message {
  role: "user" | "assistant";
  content: string;
}

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
  "/admin/manual": "Manual do Sistema",
};

const QUICK_QUESTIONS = [
  "Como criar um agendamento?",
  "Como confirmar um pré-agendamento?",
  "Como cadastrar um novo cliente?",
  "Como criar uma automação de WhatsApp?",
  "Como importar dados do Zandu?",
  "Como funciona o Score Financeiro?",
];

export function SupportChat() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Olá! Sou a assistente do Agendei. Pode me perguntar qualquer coisa sobre o sistema — estou aqui para ajudar!",
    },
  ]);
  const [location] = useLocation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const chatMutation = trpc.suporte.chat.useMutation({
    onSuccess: (data) => {
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
    },
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, chatMutation.isPending]);

  const paginaAtual = PAGE_LABELS[location] ?? location;

  const sendMessage = (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || chatMutation.isPending) return;
    const newMessages: Message[] = [...messages, { role: "user", content: msg }];
    setMessages(newMessages);
    setInput("");
    chatMutation.mutate({
      messages: newMessages,
      paginaAtual,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          title="Precisa de ajuda?"
          className="fixed bottom-6 right-6 z-50 flex items-center justify-center w-11 h-11 rounded-full shadow-lg text-sm font-bold transition-all hover:scale-105 active:scale-95"
          style={{
            background: "oklch(45% 0.18 264)",
            color: "white",
          }}
        >
          ?
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div
          className="fixed bottom-6 right-6 z-50 flex flex-col rounded-2xl shadow-2xl overflow-hidden"
          style={{
            width: "min(420px, calc(100vw - 2rem))",
            height: "min(580px, calc(100vh - 5rem))",
            background: "var(--background)",
            border: "1px solid var(--border)",
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3 shrink-0"
            style={{ background: "oklch(45% 0.18 264)", color: "white" }}
          >
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <Bot size={16} />
              </div>
              <div>
                <p className="text-sm font-semibold leading-none">Assistente Agendei</p>
                <p className="text-xs opacity-75 mt-0.5">Pagina atual: {paginaAtual}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Link href="/admin/manual">
                <button
                  onClick={() => setOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
                  title="Ver manual completo"
                >
                  <BookOpen size={16} />
                </button>
              </Link>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Messages */}
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
                      ? "oklch(55% 0.14 155)"
                      : "oklch(45% 0.18 264)",
                  }}
                >
                  {msg.role === "user" ? <User size={13} /> : <Bot size={13} />}
                </div>
                <div
                  className="max-w-[80%] rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap"
                  style={{
                    background: msg.role === "user"
                      ? "oklch(45% 0.18 264)"
                      : "var(--muted)",
                    color: msg.role === "user"
                      ? "white"
                      : "var(--foreground)",
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
                  style={{ background: "oklch(45% 0.18 264)" }}
                >
                  <Bot size={13} />
                </div>
                <div
                  className="rounded-2xl rounded-bl-[4px] px-4 py-3"
                  style={{ background: "var(--muted)" }}
                >
                  <Loader2 size={14} className="animate-spin text-muted-foreground" />
                </div>
              </div>
            )}

            {/* Quick questions — only show when just the welcome message */}
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
              style={{
                background: "oklch(45% 0.18 264)",
                color: "white",
              }}
            >
              <Send size={15} />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
