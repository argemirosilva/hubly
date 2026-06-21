import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Megaphone, Sparkles, Image, Calendar, Copy, Check, RefreshCw,
  Wand2, Hash, Clock, Trash2, Instagram,
  Star, Lightbulb, Gift, TrendingUp, Sun, MoreHorizontal,
  ChevronLeft, ChevronRight, Plus, User, Video, Film,
  BookImage, Clapperboard, CheckCircle2, Circle, Edit3, X,
  Camera, Scissors, Play,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

// ─── Tipos ────────────────────────────────────────────────────────────────────
type TipoPost = "promocao" | "servico" | "dica" | "depoimento" | "novidade" | "sazonal" | "outro";
type TomPost = "descontraido" | "profissional" | "emocional" | "urgente";
type Plataforma = "instagram" | "tiktok" | "ambos";
type Formato = "feed" | "reels" | "stories" | "tiktok" | "outro";
type StatusProducao = "planejado" | "gravado" | "editado" | "postado";

// ─── Constantes visuais ───────────────────────────────────────────────────────
const TIPOS_POST: { value: TipoPost; label: string; icon: React.ReactNode; cor: string }[] = [
  { value: "promocao", label: "Promoção", icon: <Gift className="w-3.5 h-3.5" />, cor: "bg-rose-50 text-rose-600 border-rose-200" },
  { value: "servico", label: "Serviço", icon: <Star className="w-3.5 h-3.5" />, cor: "bg-violet-50 text-violet-600 border-violet-200" },
  { value: "dica", label: "Dica", icon: <Lightbulb className="w-3.5 h-3.5" />, cor: "bg-amber-50 text-amber-600 border-amber-200" },
  { value: "novidade", label: "Novidade", icon: <TrendingUp className="w-3.5 h-3.5" />, cor: "bg-blue-50 text-blue-600 border-blue-200" },
  { value: "sazonal", label: "Sazonal", icon: <Sun className="w-3.5 h-3.5" />, cor: "bg-orange-50 text-orange-600 border-orange-200" },
  { value: "outro", label: "Outro", icon: <MoreHorizontal className="w-3.5 h-3.5" />, cor: "bg-gray-50 text-gray-600 border-gray-200" },
];

const TONS_POST: { value: TomPost; label: string; desc: string }[] = [
  { value: "descontraido", label: "Descontraído", desc: "Próximo e amigável" },
  { value: "profissional", label: "Profissional", desc: "Sofisticado e elegante" },
  { value: "emocional", label: "Emocional", desc: "Inspirador e tocante" },
  { value: "urgente", label: "Urgente", desc: "Senso de escassez" },
];

const STATUS_PRODUCAO: {
  value: StatusProducao;
  label: string;
  icon: React.ReactNode;
  bgCor: string;
}[] = [
  { value: "planejado", label: "Planejado", icon: <Circle className="w-3.5 h-3.5" />, bgCor: "bg-slate-100 text-slate-600 border-slate-200" },
  { value: "gravado", label: "Gravado", icon: <Camera className="w-3.5 h-3.5" />, bgCor: "bg-amber-50 text-amber-700 border-amber-200" },
  { value: "editado", label: "Editado", icon: <Scissors className="w-3.5 h-3.5" />, bgCor: "bg-blue-50 text-blue-700 border-blue-200" },
  { value: "postado", label: "Postado", icon: <CheckCircle2 className="w-3.5 h-3.5" />, bgCor: "bg-green-50 text-green-700 border-green-200" },
];

const FORMATOS: { value: Formato; label: string; icon: React.ReactNode }[] = [
  { value: "feed", label: "Feed", icon: <BookImage className="w-3.5 h-3.5" /> },
  { value: "reels", label: "Reels", icon: <Film className="w-3.5 h-3.5" /> },
  { value: "stories", label: "Stories", icon: <Play className="w-3.5 h-3.5" /> },
  { value: "tiktok", label: "TikTok", icon: <Video className="w-3.5 h-3.5" /> },
  { value: "outro", label: "Outro", icon: <Clapperboard className="w-3.5 h-3.5" /> },
];

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

// ─── CopyButton ───────────────────────────────────────────────────────────────
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

// ─── PostCard no calendário ───────────────────────────────────────────────────
function PostCard({
  post,
  onStatusChange,
  onEdit,
  onDelete,
}: {
  post: any;
  onStatusChange: (id: number, status: StatusProducao) => void;
  onEdit: (post: any) => void;
  onDelete: (id: number) => void;
}) {
  const tipoInfo = TIPOS_POST.find(t => t.value === post.tipo);
  const statusInfo = STATUS_PRODUCAO.find(s => s.value === (post.statusProducao ?? "planejado"));
  const formatoInfo = FORMATOS.find(f => f.value === (post.formato ?? "feed"));
  const statusAtual = (post.statusProducao ?? "planejado") as StatusProducao;
  const proximoStatus: Record<StatusProducao, StatusProducao | null> = {
    planejado: "gravado", gravado: "editado", editado: "postado", postado: null,
  };
  const proximo = proximoStatus[statusAtual];

  return (
    <div className={`rounded-lg border bg-card p-2 space-y-1 text-xs group relative ${statusAtual === "postado" ? "opacity-60" : ""}`}>
      <div className="flex items-center justify-between gap-1">
        <div className="flex items-center gap-1 flex-wrap">
          {post.plataforma === "tiktok" ? (
            <span className="text-[10px] font-bold text-black bg-black/10 px-1.5 py-0.5 rounded">TK</span>
          ) : post.plataforma === "ambos" ? (
            <span className="text-[10px] font-bold text-pink-600 bg-pink-50 px-1.5 py-0.5 rounded">IG+TK</span>
          ) : (
            <span className="text-[10px] font-bold text-pink-600 bg-pink-50 px-1.5 py-0.5 rounded">IG</span>
          )}
          {formatoInfo && (
            <span className="text-[10px] text-muted-foreground">{formatoInfo.label}</span>
          )}
        </div>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => onEdit(post)} className="p-0.5 hover:text-primary rounded"><Edit3 className="w-3 h-3" /></button>
          <button onClick={() => onDelete(post.id)} className="p-0.5 hover:text-destructive rounded"><X className="w-3 h-3" /></button>
        </div>
      </div>
      <p className="font-medium leading-tight line-clamp-2">{post.tema}</p>
      {tipoInfo && (
        <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full border ${tipoInfo.cor}`}>
          {tipoInfo.icon} {tipoInfo.label}
        </span>
      )}
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        {post.horarioPublicacao && <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" />{post.horarioPublicacao}</span>}
        {post.responsavelNome && <span className="flex items-center gap-0.5"><User className="w-3 h-3" />{post.responsavelNome.split(" ")[0]}</span>}
      </div>
      <div className="flex items-center gap-1 pt-0.5">
        <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${statusInfo?.bgCor}`}>
          {statusInfo?.icon} {statusInfo?.label}
        </span>
        {proximo && (
          <button onClick={() => onStatusChange(post.id, proximo)} className="text-[10px] text-primary hover:underline ml-auto">
            → {STATUS_PRODUCAO.find(s => s.value === proximo)?.label}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Modal de Criar/Editar Post ───────────────────────────────────────────────
function ModalPost({
  post,
  profissionais,
  onSave,
  onClose,
  dataDefault,
}: {
  post?: any;
  profissionais: { id: number; nome: string }[];
  onSave: (data: any) => void;
  onClose: () => void;
  dataDefault?: string;
}) {
  const [tema, setTema] = useState(post?.tema ?? "");
  const [plataforma, setPlataforma] = useState<Plataforma>(post?.plataforma ?? "instagram");
  const [formato, setFormato] = useState<Formato>(post?.formato ?? "feed");
  const [tipo, setTipo] = useState<TipoPost>(post?.tipo ?? "outro");
  const [data, setData] = useState(post?.dataPublicacao ?? dataDefault ?? "");
  const [horario, setHorario] = useState(post?.horarioPublicacao ?? "18:00");
  const [responsavelId, setResponsavelId] = useState<string>(post?.responsavelId ? String(post.responsavelId) : "");
  const [observacoes, setObservacoes] = useState(post?.observacoes ?? "");

  const handleSave = () => {
    if (!tema.trim()) { toast.error("Informe o tema do post"); return; }
    if (!data) { toast.error("Informe a data de publicação"); return; }
    const resp = profissionais.find(p => p.id === Number(responsavelId));
    onSave({ tema: tema.trim(), plataforma, formato, tipo, dataPublicacao: data, horarioPublicacao: horario, responsavelId: resp?.id ?? null, responsavelNome: resp?.nome ?? null, observacoes: observacoes.trim() || null });
  };

  return (
    <DialogContent className="max-w-md">
      <DialogHeader><DialogTitle>{post ? "Editar Post" : "Novo Post no Calendário"}</DialogTitle></DialogHeader>
      <div className="space-y-3 pt-1">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Tema / Assunto *</label>
          <Input value={tema} onChange={e => setTema(e.target.value)} placeholder="Ex: Dica de hidratação para o verão" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Plataforma</label>
            <Select value={plataforma} onValueChange={v => setPlataforma(v as Plataforma)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="instagram">Instagram</SelectItem>
                <SelectItem value="tiktok">TikTok</SelectItem>
                <SelectItem value="ambos">Ambos</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Formato</label>
            <Select value={formato} onValueChange={v => setFormato(v as Formato)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {FORMATOS.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Data *</label>
            <Input type="date" value={data} onChange={e => setData(e.target.value)} className="h-8 text-xs" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Horário</label>
            <Input type="time" value={horario} onChange={e => setHorario(e.target.value)} className="h-8 text-xs" />
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Tipo de conteúdo</label>
          <Select value={tipo} onValueChange={v => setTipo(v as TipoPost)}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {TIPOS_POST.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {profissionais.length > 0 && (
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Responsável pela produção</label>
            <Select value={responsavelId} onValueChange={setResponsavelId}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Nenhum" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">Nenhum</SelectItem>
                {profissionais.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Observações</label>
          <Textarea value={observacoes} onChange={e => setObservacoes(e.target.value)} placeholder="Referências, ideias, detalhes..." rows={2} className="text-xs resize-none" />
        </div>
        <div className="flex gap-2 pt-1">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
          <Button className="flex-1" onClick={handleSave}>Salvar</Button>
        </div>
      </div>
    </DialogContent>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function IAMarketing() {
  const utils = trpc.useUtils();

  const hoje = new Date();
  const [anoAtual, setAnoAtual] = useState(hoje.getFullYear());
  const [mesAtual, setMesAtual] = useState(hoje.getMonth() + 1);
  const [abaAtiva, setAbaAtiva] = useState<"calendario" | "gerar" | "posts">("calendario");
  const [filtroPlatforma, setFiltroPlatforma] = useState<"todos" | Plataforma>("todos");
  const [modalPost, setModalPost] = useState<{ open: boolean; post?: any; dataDefault?: string }>({ open: false });

  // Form de geração de post avulso
  const [tipo, setTipo] = useState<TipoPost>("promocao");
  const [tema, setTema] = useState("");
  const [tom, setTom] = useState<TomPost>("descontraido");
  const [incluirEmoji, setIncluirEmoji] = useState(true);
  const [postGerado, setPostGerado] = useState<{ id: number | null; legenda: string; hashtags: string; imagemPrompt: string } | null>(null);
  const [imagemGerada, setImagemGerada] = useState<string | null>(null);

  // Pauta IA
  const [focoPauta, setFocoPauta] = useState("");
  const [periodoPauta, setPeriodoPauta] = useState<"semana" | "mes">("mes");

  // ── Queries ──
  const { data: calendario, isLoading: loadingCalendario, refetch: refetchCalendario } = trpc.iaMarketing.listarCalendario.useQuery(
    { ano: anoAtual, mes: mesAtual },
    { enabled: abaAtiva === "calendario" }
  );
  const { data: posts, isLoading: loadingPosts } = trpc.iaMarketing.listarPosts.useQuery(
    { limit: 30 },
    { enabled: abaAtiva === "posts" }
  );
  const { data: profissionais = [] } = trpc.iaMarketing.listarProfissionais.useQuery();

  // ── Mutations ──
  const gerarPostMut = trpc.iaMarketing.gerarPost.useMutation({
    onSuccess: (data) => { setPostGerado(data); setImagemGerada(null); toast.success("Post gerado!"); },
    onError: (err: any) => toast.error(err.message ?? "Erro ao gerar post"),
  });
  const gerarImagemMut = trpc.iaMarketing.gerarImagem.useMutation({
    onSuccess: (data) => { setImagemGerada(data.imagemUrl); toast.success("Imagem gerada!"); },
    onError: (err: any) => toast.error(err.message ?? "Erro ao gerar imagem"),
  });
  const gerarPautaMut = trpc.iaMarketing.gerarPauta.useMutation({
    onSuccess: () => { toast.success("Pauta gerada e salva no calendário!"); refetchCalendario(); },
    onError: (err: any) => toast.error(err.message ?? "Erro ao gerar pauta"),
  });
  const atualizarStatusMut = trpc.iaMarketing.atualizarStatusProducao.useMutation({
    onSuccess: () => { refetchCalendario(); utils.iaMarketing.listarPosts.invalidate(); },
    onError: (err: any) => toast.error(err.message ?? "Erro ao atualizar status"),
  });
  const criarPostMut = trpc.iaMarketing.criarPostCalendario.useMutation({
    onSuccess: () => { toast.success("Post adicionado!"); refetchCalendario(); setModalPost({ open: false }); },
    onError: (err: any) => toast.error(err.message ?? "Erro ao criar post"),
  });
  const atualizarPostMut = trpc.iaMarketing.atualizarPostCalendario.useMutation({
    onSuccess: () => { toast.success("Post atualizado!"); refetchCalendario(); utils.iaMarketing.listarPosts.invalidate(); setModalPost({ open: false }); },
    onError: (err: any) => toast.error(err.message ?? "Erro ao atualizar post"),
  });
  const excluirPostMut = trpc.iaMarketing.excluirPost.useMutation({
    onSuccess: () => { toast.success("Post removido"); refetchCalendario(); utils.iaMarketing.listarPosts.invalidate(); },
    onError: (err: any) => toast.error(err.message ?? "Erro ao excluir post"),
  });
  const atualizarPostLegadoMut = trpc.iaMarketing.atualizarPost.useMutation({
    onSuccess: () => { utils.iaMarketing.listarPosts.invalidate(); toast.success("Post atualizado"); },
  });

  // ── Navegação de mês ──
  const irParaMesAnterior = () => {
    if (mesAtual === 1) { setMesAtual(12); setAnoAtual(a => a - 1); }
    else setMesAtual(m => m - 1);
  };
  const irParaProximoMes = () => {
    if (mesAtual === 12) { setMesAtual(1); setAnoAtual(a => a + 1); }
    else setMesAtual(m => m + 1);
  };

  // ── Calendário ──
  const diasDoMes = useMemo(() => {
    const total = new Date(anoAtual, mesAtual, 0).getDate();
    return Array.from({ length: total }, (_, i) => i + 1);
  }, [anoAtual, mesAtual]);

  const postsPorDia = useMemo(() => {
    const mapa: Record<number, any[]> = {};
    (calendario ?? []).forEach(post => {
      if (!post.dataPublicacao) return;
      const dia = parseInt(post.dataPublicacao.split("-")[2], 10);
      if (!mapa[dia]) mapa[dia] = [];
      if (filtroPlatforma === "todos" || post.plataforma === filtroPlatforma || post.plataforma === "ambos") {
        mapa[dia].push(post);
      }
    });
    return mapa;
  }, [calendario, filtroPlatforma]);

  const stats = useMemo(() => {
    const todos = calendario ?? [];
    return {
      total: todos.length,
      planejado: todos.filter(p => (p.statusProducao ?? "planejado") === "planejado").length,
      gravado: todos.filter(p => p.statusProducao === "gravado").length,
      editado: todos.filter(p => p.statusProducao === "editado").length,
      postado: todos.filter(p => p.statusProducao === "postado").length,
    };
  }, [calendario]);

  const handleSalvarPost = (data: any) => {
    if (modalPost.post) atualizarPostMut.mutate({ id: modalPost.post.id, ...data });
    else criarPostMut.mutate(data);
  };

  const tipoInfo = TIPOS_POST.find(t => t.value === tipo);

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-pink-50 border border-pink-100">
          <Megaphone className="w-5 h-5 text-pink-500" />
        </div>
        <div>
          <h1 className="text-lg font-semibold">Marketing & Redes Sociais</h1>
          <p className="text-xs text-muted-foreground">Planeje, produza e acompanhe seu conteúdo</p>
        </div>
      </div>

      {/* Abas */}
      <div className="flex gap-1 mb-5 bg-muted/40 p-1 rounded-xl w-fit">
        {[
          { id: "calendario", label: "Calendário", icon: <Calendar className="w-3.5 h-3.5" /> },
          { id: "gerar", label: "Gerar Post", icon: <Sparkles className="w-3.5 h-3.5" /> },
          { id: "posts", label: "Meus Posts", icon: <Instagram className="w-3.5 h-3.5" /> },
        ].map(aba => (
          <button
            key={aba.id}
            onClick={() => setAbaAtiva(aba.id as any)}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
              abaAtiva === aba.id ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {aba.icon} {aba.label}
          </button>
        ))}
      </div>

      {/* ══ ABA: CALENDÁRIO EDITORIAL ══ */}
      {abaAtiva === "calendario" && (
        <div className="space-y-4">
          {/* Navegação + ações */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <button onClick={irParaMesAnterior} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-semibold min-w-[140px] text-center">
                {MESES[mesAtual - 1]} {anoAtual}
              </span>
              <button onClick={irParaProximoMes} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Select value={filtroPlatforma} onValueChange={v => setFiltroPlatforma(v as any)}>
                <SelectTrigger className="h-8 text-xs w-[120px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas</SelectItem>
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="tiktok">TikTok</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={() => setModalPost({ open: true })}>
                <Plus className="w-3.5 h-3.5" /> Novo Post
              </Button>
              <Button
                size="sm"
                className="h-8 gap-1.5 text-xs"
                onClick={() => gerarPautaMut.mutate({
                  periodo: periodoPauta,
                  foco: focoPauta || undefined,
                  anoMes: `${anoAtual}-${String(mesAtual).padStart(2, "0")}`,
                  salvarNoCalendario: true,
                })}
                disabled={gerarPautaMut.isPending}
              >
                {gerarPautaMut.isPending ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                Gerar Pauta com IA
              </Button>
            </div>
          </div>

          {/* Opções de pauta */}
          <div className="flex items-center gap-2 flex-wrap bg-muted/30 rounded-lg p-2.5">
            <span className="text-xs text-muted-foreground font-medium">Período:</span>
            {(["semana", "mes"] as const).map(p => (
              <button
                key={p}
                onClick={() => setPeriodoPauta(p)}
                className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                  periodoPauta === p ? "bg-primary text-primary-foreground border-primary" : "border-border bg-background hover:bg-muted"
                }`}
              >
                {p === "semana" ? "1 semana" : "Mês inteiro"}
              </button>
            ))}
            <Input
              value={focoPauta}
              onChange={e => setFocoPauta(e.target.value)}
              placeholder="Foco especial (ex: Dia das Mães, verão...)"
              className="h-7 text-xs max-w-[220px]"
            />
          </div>

          {/* Stats do mês */}
          {stats.total > 0 && (
            <div className="grid grid-cols-4 gap-2">
              {STATUS_PRODUCAO.map(s => (
                <div key={s.value} className={`rounded-lg border p-2.5 text-center ${s.bgCor}`}>
                  <div className="text-lg font-bold">{stats[s.value as keyof typeof stats]}</div>
                  <div className="text-[10px] font-medium flex items-center justify-center gap-1">{s.icon} {s.label}</div>
                </div>
              ))}
            </div>
          )}

          {/* Grade do calendário */}
          {loadingCalendario ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Carregando calendário...
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-1">
              {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map(d => (
                <div key={d} className="text-center text-[10px] font-semibold text-muted-foreground py-1">{d}</div>
              ))}
              {Array.from({ length: new Date(anoAtual, mesAtual - 1, 1).getDay() }).map((_, i) => (
                <div key={`e-${i}`} />
              ))}
              {diasDoMes.map(dia => {
                const postsNoDia = postsPorDia[dia] ?? [];
                const isHoje = dia === hoje.getDate() && mesAtual === hoje.getMonth() + 1 && anoAtual === hoje.getFullYear();
                const dataStr = `${anoAtual}-${String(mesAtual).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
                return (
                  <div
                    key={dia}
                    className={`min-h-[80px] rounded-lg border p-1.5 space-y-1 ${
                      isHoje ? "border-primary/50 bg-primary/5" : "border-border bg-card"
                    } transition-colors`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-[11px] font-semibold ${isHoje ? "text-primary" : "text-muted-foreground"}`}>{dia}</span>
                      <button
                        onClick={() => setModalPost({ open: true, dataDefault: dataStr })}
                        className="p-0.5 rounded hover:bg-muted transition-all"
                      >
                        <Plus className="w-3 h-3 text-muted-foreground/50 hover:text-muted-foreground" />
                      </button>
                    </div>
                    {postsNoDia.map(post => (
                      <PostCard
                        key={post.id}
                        post={post}
                        onStatusChange={(id, status) => atualizarStatusMut.mutate({ id, statusProducao: status })}
                        onEdit={p => setModalPost({ open: true, post: p })}
                        onDelete={id => { if (confirm("Remover este post?")) excluirPostMut.mutate({ id }); }}
                      />
                    ))}
                    {postsNoDia.length === 0 && (
                      <button
                        onClick={() => setModalPost({ open: true, dataDefault: dataStr })}
                        className="w-full h-7 rounded border border-dashed border-border/40 text-[10px] text-muted-foreground/40 hover:text-muted-foreground hover:border-border transition-all flex items-center justify-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Legenda */}
          <div className="flex items-center gap-3 flex-wrap pt-2 border-t">
            <span className="text-[11px] text-muted-foreground font-medium">Status de produção:</span>
            {STATUS_PRODUCAO.map(s => (
              <span key={s.value} className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border ${s.bgCor}`}>
                {s.icon} {s.label}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ══ ABA: GERAR POST COM IA ══ */}
      {abaAtiva === "gerar" && (
        <div className="space-y-5 max-w-xl">
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Tipo de post</p>
            <div className="flex flex-wrap gap-1.5">
              {TIPOS_POST.map(t => (
                <button
                  key={t.value}
                  onClick={() => setTipo(t.value)}
                  className={`inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border transition-all ${
                    tipo === t.value ? t.cor + " ring-1 ring-current/30" : "border-border hover:bg-muted"
                  }`}
                >
                  {t.icon} {t.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1.5">Tema do post *</p>
            <Textarea
              value={tema}
              onChange={e => setTema(e.target.value)}
              placeholder="Ex: Promoção de limpeza de pele para o verão, dica de hidratação capilar..."
              rows={2}
              className="resize-none text-sm"
            />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1.5">Tom de voz</p>
            <div className="grid grid-cols-2 gap-1.5">
              {TONS_POST.map(t => (
                <button
                  key={t.value}
                  onClick={() => setTom(t.value)}
                  className={`text-left p-2.5 rounded-lg border text-xs transition-all ${
                    tom === t.value ? "border-primary bg-primary/5" : "border-border hover:bg-muted"
                  }`}
                >
                  <span className="font-medium block">{t.label}</span>
                  <span className="text-muted-foreground">{t.desc}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIncluirEmoji(!incluirEmoji)}
              className={`w-8 h-4 rounded-full transition-colors relative ${incluirEmoji ? "bg-primary" : "bg-muted-foreground/30"}`}
            >
              <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-all ${incluirEmoji ? "left-4.5" : "left-0.5"}`} style={{ left: incluirEmoji ? "18px" : "2px" }} />
            </button>
            <span className="text-xs text-muted-foreground">Incluir emojis na legenda</span>
          </div>
          <Button
            className="w-full gap-2"
            onClick={() => { if (!tema.trim()) { toast.error("Informe o tema do post"); return; } gerarPostMut.mutate({ tipo, tema: tema.trim(), tom, incluirEmoji }); }}
            disabled={gerarPostMut.isPending}
          >
            {gerarPostMut.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Gerar Post com IA
          </Button>

          {postGerado && (
            <div className="space-y-3 rounded-xl border bg-card p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold flex items-center gap-2"><Check className="w-4 h-4 text-green-500" /> Post gerado!</p>
                {tipoInfo && (
                  <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${tipoInfo.cor}`}>
                    {tipoInfo.icon} {tipoInfo.label}
                  </span>
                )}
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground">Legenda</p>
                  <CopyButton text={postGerado.legenda} />
                </div>
                <p className="text-sm leading-relaxed whitespace-pre-wrap bg-muted/40 rounded-lg p-3">{postGerado.legenda}</p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground flex items-center gap-1"><Hash className="w-3 h-3" /> Hashtags</p>
                  <CopyButton text={postGerado.hashtags} />
                </div>
                <p className="text-xs text-blue-600 leading-relaxed bg-muted/40 rounded-lg p-2">{postGerado.hashtags}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2"
                onClick={() => gerarImagemMut.mutate({ postId: postGerado.id ?? undefined, prompt: postGerado.imagemPrompt })}
                disabled={gerarImagemMut.isPending}
              >
                {gerarImagemMut.isPending ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Image className="w-3.5 h-3.5" />}
                Gerar Imagem com IA
              </Button>
              {imagemGerada && (
                <div className="space-y-2">
                  <img src={imagemGerada} alt="Arte gerada" className="w-full rounded-xl aspect-square object-cover" />
                  <a href={imagemGerada} download="post-hubly.png" target="_blank" rel="noopener noreferrer">
                    <Button size="sm" className="w-full text-xs">Baixar imagem</Button>
                  </a>
                </div>
              )}
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => { setPostGerado(null); setImagemGerada(null); setTema(""); }}>
                  Novo post
                </Button>
                {postGerado.id && (
                  <Button size="sm" className="flex-1 text-xs" onClick={() => { atualizarPostLegadoMut.mutate({ id: postGerado.id!, status: "aprovado" }); toast.success("Post aprovado!"); }}>
                    <Check className="w-3 h-3 mr-1" /> Aprovar
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══ ABA: MEUS POSTS ══ */}
      {abaAtiva === "posts" && (
        <div className="space-y-3">
          {loadingPosts ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Carregando posts...
            </div>
          ) : !posts || posts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
              <Instagram className="w-10 h-10 text-muted-foreground/30" />
              <p className="text-sm">Nenhum post gerado ainda</p>
              <Button size="sm" variant="outline" onClick={() => setAbaAtiva("gerar")}>
                <Sparkles className="w-3.5 h-3.5 mr-1.5" /> Gerar primeiro post
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {posts.map(post => {
                const tipoInfoPost = TIPOS_POST.find(t => t.value === post.tipo);
                const statusProd = STATUS_PRODUCAO.find(s => s.value === (post.statusProducao ?? "planejado"));
                const statusCor: Record<string, string> = {
                  rascunho: "bg-gray-100 text-gray-600",
                  aprovado: "bg-green-100 text-green-700",
                  agendado: "bg-blue-100 text-blue-700",
                  publicado: "bg-purple-100 text-purple-700",
                  arquivado: "bg-orange-100 text-orange-700",
                };
                return (
                  <div key={post.id} className="rounded-xl border bg-card p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {tipoInfoPost && (
                          <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border ${tipoInfoPost.cor}`}>
                            {tipoInfoPost.icon} {tipoInfoPost.label}
                          </span>
                        )}
                        <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${statusCor[post.status] ?? "bg-gray-100 text-gray-600"}`}>
                          {post.status}
                        </span>
                        {statusProd && (
                          <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border ${statusProd.bgCor}`}>
                            {statusProd.icon} {statusProd.label}
                          </span>
                        )}
                      </div>
                      <button onClick={() => excluirPostMut.mutate({ id: post.id })} className="p-1 hover:text-destructive rounded">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {post.tema && <p className="text-xs font-medium text-muted-foreground">{post.tema}</p>}
                    {post.legenda && <p className="text-xs text-foreground line-clamp-3 leading-relaxed">{post.legenda}</p>}
                    {post.imagemUrl && <img src={post.imagemUrl} alt="Arte" className="w-full rounded-lg aspect-square object-cover" />}
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-muted-foreground">{new Date(post.createdAt).toLocaleDateString("pt-BR")}</span>
                      {post.status === "rascunho" && (
                        <Button size="sm" variant="outline" className="h-6 text-[11px] px-2" onClick={() => atualizarPostLegadoMut.mutate({ id: post.id, status: "aprovado" })}>
                          Aprovar
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modal de Criar/Editar Post */}
      <Dialog open={modalPost.open} onOpenChange={open => !open && setModalPost({ open: false })}>
        <ModalPost
          post={modalPost.post}
          profissionais={profissionais}
          onSave={handleSalvarPost}
          onClose={() => setModalPost({ open: false })}
          dataDefault={modalPost.dataDefault}
        />
      </Dialog>
    </div>
  );
}
