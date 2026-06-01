import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Megaphone, Sparkles, Image, Calendar, Copy, Check, RefreshCw,
  Wand2, Hash, Clock, ChevronDown, Trash2, Eye, Instagram,
  Star, Lightbulb, Gift, TrendingUp, Sun, MoreHorizontal
} from "lucide-react";

// ─── Tipos ────────────────────────────────────────────────────────────────────
type TipoPost = "promocao" | "servico" | "dica" | "depoimento" | "novidade" | "sazonal" | "outro";
type TomPost = "descontraido" | "profissional" | "emocional" | "urgente";

const TIPOS_POST: { value: TipoPost; label: string; icon: React.ReactNode; cor: string }[] = [
  { value: "promocao", label: "Promoção", icon: <Gift className="w-4 h-4" />, cor: "bg-rose-50 text-rose-600 border-rose-200" },
  { value: "servico", label: "Serviço", icon: <Star className="w-4 h-4" />, cor: "bg-violet-50 text-violet-600 border-violet-200" },
  { value: "dica", label: "Dica", icon: <Lightbulb className="w-4 h-4" />, cor: "bg-amber-50 text-amber-600 border-amber-200" },
  { value: "novidade", label: "Novidade", icon: <TrendingUp className="w-4 h-4" />, cor: "bg-blue-50 text-blue-600 border-blue-200" },
  { value: "sazonal", label: "Sazonal", icon: <Sun className="w-4 h-4" />, cor: "bg-orange-50 text-orange-600 border-orange-200" },
  { value: "outro", label: "Outro", icon: <MoreHorizontal className="w-4 h-4" />, cor: "bg-gray-50 text-gray-600 border-gray-200" },
];

const TONS_POST: { value: TomPost; label: string; desc: string }[] = [
  { value: "descontraido", label: "Descontraído", desc: "Próximo e amigável" },
  { value: "profissional", label: "Profissional", desc: "Sofisticado e elegante" },
  { value: "emocional", label: "Emocional", desc: "Inspirador e tocante" },
  { value: "urgente", label: "Urgente", desc: "Senso de escassez" },
];

// ─── Componente de cópia ──────────────────────────────────────────────────────
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={handleCopy} className="p-1.5 rounded-md hover:bg-muted transition-colors">
      {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
    </button>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function IAMarketing() {
  const utils = trpc.useUtils();

  // Form state
  const [tipo, setTipo] = useState<TipoPost>("promocao");
  const [tema, setTema] = useState("");
  const [tom, setTom] = useState<TomPost>("descontraido");
  const [incluirEmoji, setIncluirEmoji] = useState(true);

  // Resultado gerado
  const [postGerado, setPostGerado] = useState<{
    id: number | null;
    legenda: string;
    hashtags: string;
    imagemPrompt: string;
  } | null>(null);
  const [imagemGerada, setImagemGerada] = useState<string | null>(null);
  const [abaAtiva, setAbaAtiva] = useState<"gerar" | "posts" | "pauta">("gerar");

  // Queries
  const { data: posts, isLoading: loadingPosts } = trpc.iaMarketing.listarPosts.useQuery(
    { limit: 20 },
    { enabled: abaAtiva === "posts" }
  );
  const { data: servicos } = trpc.iaMarketing.listarPosts.useQuery({ limit: 1 }, { enabled: false }); // placeholder

  // Mutations
  const gerarPostMut = trpc.iaMarketing.gerarPost.useMutation({
    onSuccess: (data) => {
      setPostGerado(data);
      setImagemGerada(null);
      toast.success("Post gerado com sucesso!");
    },
    onError: (err: any) => toast.error(err.message ?? "Erro ao gerar post"),
  });

  const gerarImagemMut = trpc.iaMarketing.gerarImagem.useMutation({
    onSuccess: (data) => {
      setImagemGerada(data.imagemUrl);
      toast.success("Imagem gerada!");
    },
    onError: (err: any) => toast.error(err.message ?? "Erro ao gerar imagem"),
  });

  const excluirPostMut = trpc.iaMarketing.excluirPost.useMutation({
    onSuccess: () => {
      utils.iaMarketing.listarPosts.invalidate();
      toast.success("Post excluído");
    },
  });

  const atualizarPostMut = trpc.iaMarketing.atualizarPost.useMutation({
    onSuccess: () => {
      utils.iaMarketing.listarPosts.invalidate();
      toast.success("Post atualizado");
    },
  });

  const gerarPautaMut = trpc.iaMarketing.gerarPauta.useMutation({
    onSuccess: () => toast.success("Pauta gerada!"),
    onError: (err: any) => toast.error(err.message ?? "Erro ao gerar pauta"),
  });

  const handleGerarPost = () => {
    if (!tema.trim()) { toast.error("Informe o tema do post"); return; }
    gerarPostMut.mutate({ tipo, tema: tema.trim(), tom, incluirEmoji });
  };

  const handleGerarImagem = () => {
    if (!postGerado?.imagemPrompt) return;
    gerarImagemMut.mutate({
      postId: postGerado.id ?? undefined,
      prompt: postGerado.imagemPrompt,
    });
  };

  const tipoInfo = TIPOS_POST.find(t => t.value === tipo);

  return (
    <div className="p-4 lg:p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-pink-50 border border-pink-100">
          <Megaphone className="w-5 h-5 text-pink-600" />
        </div>
        <div>
          <h2 className="font-bold text-lg tracking-tight">IA de Marketing</h2>
          <p className="text-xs text-muted-foreground">Crie posts incríveis para o Instagram com inteligência artificial</p>
        </div>
      </div>

      {/* Abas */}
      <div className="flex gap-1 mb-6 bg-muted/50 rounded-xl p-1">
        {[
          { id: "gerar", label: "Criar Post", icon: <Wand2 className="w-3.5 h-3.5" /> },
          { id: "posts", label: "Meus Posts", icon: <Instagram className="w-3.5 h-3.5" /> },
          { id: "pauta", label: "Pauta", icon: <Calendar className="w-3.5 h-3.5" /> },
        ].map(aba => (
          <button
            key={aba.id}
            onClick={() => setAbaAtiva(aba.id as any)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium transition-all ${
              abaAtiva === aba.id
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {aba.icon} {aba.label}
          </button>
        ))}
      </div>

      {/* ── ABA: CRIAR POST ── */}
      {abaAtiva === "gerar" && (
        <div className="space-y-5">
          {/* Tipo de post */}
          <div>
            <p className="text-sm font-medium mb-2">Tipo de post</p>
            <div className="grid grid-cols-3 gap-2">
              {TIPOS_POST.map(t => (
                <button
                  key={t.value}
                  onClick={() => setTipo(t.value)}
                  className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs font-medium transition-all ${
                    tipo === t.value ? t.cor + " border-current" : "border-border hover:bg-muted/50"
                  }`}
                >
                  {t.icon} {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tema */}
          <div>
            <p className="text-sm font-medium mb-2">Tema / Assunto</p>
            <textarea
              value={tema}
              onChange={e => setTema(e.target.value)}
              placeholder={
                tipo === "promocao" ? "Ex: 20% de desconto em coloração este mês" :
                tipo === "servico" ? "Ex: Hidratação profunda com queratina" :
                tipo === "dica" ? "Ex: Como manter o cabelo saudável no verão" :
                tipo === "novidade" ? "Ex: Novo serviço de extensão de cílios" :
                "Descreva o tema do post..."
              }
              rows={3}
              className="w-full text-sm rounded-lg border border-border bg-background px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Tom de voz */}
          <div>
            <p className="text-sm font-medium mb-2">Tom de voz</p>
            <div className="grid grid-cols-2 gap-2">
              {TONS_POST.map(t => (
                <button
                  key={t.value}
                  onClick={() => setTom(t.value)}
                  className={`flex flex-col items-start p-3 rounded-lg border text-left transition-all ${
                    tom === t.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted/50"
                  }`}
                >
                  <span className="text-xs font-semibold">{t.label}</span>
                  <span className="text-[11px] text-muted-foreground">{t.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Opções */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIncluirEmoji(!incluirEmoji)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                incluirEmoji ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground"
              }`}
            >
              😊 Incluir emojis
            </button>
          </div>

          {/* Botão gerar */}
          <Button
            onClick={handleGerarPost}
            disabled={gerarPostMut.isPending || !tema.trim()}
            className="w-full gap-2"
          >
            {gerarPostMut.isPending ? (
              <><RefreshCw className="w-4 h-4 animate-spin" /> Gerando com IA...</>
            ) : (
              <><Sparkles className="w-4 h-4" /> Gerar Post com IA</>
            )}
          </Button>

          {/* Resultado */}
          {postGerado && (
            <div className="space-y-4 pt-2">
              <div className="h-px bg-border" />
              <p className="text-sm font-semibold flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" /> Post gerado!
              </p>

              {/* Legenda */}
              <div className="rounded-xl border bg-muted/30 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Legenda</span>
                  <CopyButton text={postGerado.legenda} />
                </div>
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{postGerado.legenda}</p>
              </div>

              {/* Hashtags */}
              <div className="rounded-xl border bg-muted/30 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                    <Hash className="w-3 h-3" /> Hashtags
                  </span>
                  <CopyButton text={postGerado.hashtags} />
                </div>
                <p className="text-xs text-blue-600 leading-relaxed">{postGerado.hashtags}</p>
              </div>

              {/* Imagem */}
              <div className="rounded-xl border bg-muted/30 p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                    <Image className="w-3 h-3" /> Arte do Post
                  </span>
                </div>
                {imagemGerada ? (
                  <div className="space-y-3">
                    <img src={imagemGerada} alt="Arte gerada" className="w-full rounded-lg aspect-square object-cover" />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 gap-1.5 text-xs"
                        onClick={handleGerarImagem}
                        disabled={gerarImagemMut.isPending}
                      >
                        <RefreshCw className={`w-3 h-3 ${gerarImagemMut.isPending ? "animate-spin" : ""}`} />
                        Regerar
                      </Button>
                      <a
                        href={imagemGerada}
                        download="post-hubly.png"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1"
                      >
                        <Button size="sm" className="w-full gap-1.5 text-xs">
                          Baixar imagem
                        </Button>
                      </a>
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full gap-2 text-sm"
                    onClick={handleGerarImagem}
                    disabled={gerarImagemMut.isPending}
                  >
                    {gerarImagemMut.isPending ? (
                      <><RefreshCw className="w-4 h-4 animate-spin" /> Gerando imagem com IA...</>
                    ) : (
                      <><Wand2 className="w-4 h-4" /> Gerar Arte com IA</>
                    )}
                  </Button>
                )}
              </div>

              {/* Ações */}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 gap-1.5 text-xs"
                  onClick={() => {
                    setPostGerado(null);
                    setImagemGerada(null);
                    setTema("");
                  }}
                >
                  Novo post
                </Button>
                {postGerado.id && (
                  <Button
                    size="sm"
                    className="flex-1 gap-1.5 text-xs"
                    onClick={() => {
                      atualizarPostMut.mutate({ id: postGerado.id!, status: "aprovado" });
                      toast.success("Post salvo como aprovado!");
                    }}
                  >
                    <Check className="w-3 h-3" /> Aprovar post
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── ABA: MEUS POSTS ── */}
      {abaAtiva === "posts" && (
        <div className="space-y-3">
          {loadingPosts ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span className="text-sm">Carregando posts...</span>
            </div>
          ) : !posts?.length ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <Instagram className="w-10 h-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">Nenhum post criado ainda.</p>
              <Button size="sm" variant="outline" onClick={() => setAbaAtiva("gerar")}>
                <Wand2 className="w-3.5 h-3.5 mr-1.5" /> Criar primeiro post
              </Button>
            </div>
          ) : (
            posts.map(post => {
              const tipoInfo = TIPOS_POST.find(t => t.value === post.tipo);
              const statusCor: Record<string, string> = {
                rascunho: "bg-gray-100 text-gray-600",
                aprovado: "bg-green-100 text-green-700",
                agendado: "bg-blue-100 text-blue-700",
                publicado: "bg-purple-100 text-purple-700",
                arquivado: "bg-orange-100 text-orange-700",
              };
              return (
                <div key={post.id} className="rounded-xl border bg-card p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${tipoInfo?.cor}`}>
                        {tipoInfo?.icon} {tipoInfo?.label}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusCor[post.status] ?? "bg-gray-100 text-gray-600"}`}>
                        {post.status}
                      </span>
                    </div>
                    <button
                      onClick={() => excluirPostMut.mutate({ id: post.id })}
                      className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {post.tema && <p className="text-xs font-medium text-muted-foreground">{post.tema}</p>}
                  {post.legenda && (
                    <p className="text-xs text-foreground line-clamp-3 leading-relaxed">{post.legenda}</p>
                  )}
                  {post.imagemUrl && (
                    <img src={post.imagemUrl} alt="Arte" className="w-full rounded-lg aspect-square object-cover" />
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground">
                      {new Date(post.createdAt).toLocaleDateString("pt-BR")}
                    </span>
                    {post.status === "rascunho" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 text-[11px] px-2"
                        onClick={() => atualizarPostMut.mutate({ id: post.id, status: "aprovado" })}
                      >
                        Aprovar
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── ABA: PAUTA ── */}
      {abaAtiva === "pauta" && (
        <div className="space-y-5">
          <div className="rounded-xl border bg-muted/30 p-4 space-y-4">
            <p className="text-sm font-medium">Gerar pauta de conteúdo com IA</p>
            <p className="text-xs text-muted-foreground">
              A IA cria um calendário completo de posts para a semana ou mês, com temas, tipos e melhores horários para publicação.
            </p>
            <div className="flex gap-2">
              <Button
                className="flex-1 gap-2"
                variant="outline"
                onClick={() => gerarPautaMut.mutate({ periodo: "semana" })}
                disabled={gerarPautaMut.isPending}
              >
                {gerarPautaMut.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />}
                Pauta da Semana
              </Button>
              <Button
                className="flex-1 gap-2"
                onClick={() => gerarPautaMut.mutate({ periodo: "mes" })}
                disabled={gerarPautaMut.isPending}
              >
                {gerarPautaMut.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Pauta do Mês
              </Button>
            </div>
          </div>

          {gerarPautaMut.data && gerarPautaMut.data.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-semibold">Pauta gerada ({gerarPautaMut.data.length} posts)</p>
              {gerarPautaMut.data.map((item, i) => {
                const tipoInfo = TIPOS_POST.find(t => t.value === item.tipo);
                return (
                  <div key={i} className="rounded-xl border bg-card p-3 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-muted-foreground">Dia {item.dia}</span>
                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${tipoInfo?.cor ?? ""}`}>
                          {tipoInfo?.icon} {tipoInfo?.label ?? item.tipo}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {item.melhorHorario}
                      </span>
                    </div>
                    <p className="text-sm font-medium">{item.tema}</p>
                    <p className="text-xs text-muted-foreground">{item.justificativa}</p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 text-[11px] px-2 gap-1"
                      onClick={() => {
                        setTipo(item.tipo as TipoPost);
                        setTema(item.tema);
                        setAbaAtiva("gerar");
                      }}
                    >
                      <Wand2 className="w-3 h-3" /> Criar este post
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
