import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { usePermissoes } from "@/hooks/usePermissoes";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings, Building2, Save, Globe, Clock, Palette, ExternalLink, Copy, Check, CheckCircle2, Loader2, Upload, Image, Bell, AlertCircle, AlertTriangle, Trash2, Calendar, Link2, Unlink } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { ImageCropEditor } from "@/components/ImageCropEditor";


const DIAS_SEMANA = [
  { value: 0, label: "Dom" },
  { value: 1, label: "Seg" },
  { value: 2, label: "Ter" },
  { value: 3, label: "Qua" },
  { value: 4, label: "Qui" },
  { value: 5, label: "Sex" },
  { value: 6, label: "Sáb" },
];

export default function Configuracoes() {
  const { pode } = usePermissoes();
  const utils = trpc.useUtils();
  const [, setLocation] = useLocation();
  const { data: empresa } = trpc.empresa.get.useQuery();
  const [copied, setCopied] = useState(false);

  // ─── Exclusão de conta ─────────────────────────────────────────────────────
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const excluirContaMutation = trpc.perfil.excluirMinhaConta.useMutation({
    onSuccess: () => {
      toast.success("Conta excluída com sucesso. Todos os dados foram removidos.");
      setShowDeleteDialog(false);
      setTimeout(() => setLocation("/"), 1500);
    },
    onError: (err: any) => toast.error(err.message),
  });
  function handleExcluirConta() {
    if (deleteConfirmText !== "EXCLUIR MINHA CONTA") {
      toast.error("Digite exatamente: EXCLUIR MINHA CONTA");
      return;
    }
    excluirContaMutation.mutate({ confirmacao: "EXCLUIR MINHA CONTA" });
  }
  // ─────────────────────────────────────────────────────────────────────────

  // ─── Editor de imagem (crop/zoom/rotação) ─────────────────────────────────
  const [cropEditor, setCropEditor] = useState<{
    imageSrc: string;
    aspect: number;
    title: string;
    onConfirm: (blob: Blob, mimeType: string) => Promise<void>;
  } | null>(null);

  function abrirEditorImagem(
    file: File,
    aspect: number,
    title: string,
    onConfirm: (blob: Blob, mimeType: string) => Promise<void>
  ) {
    const url = URL.createObjectURL(file);
    setCropEditor({ imageSrc: url, aspect, title, onConfirm });
  }
  // ─────────────────────────────────────────────────────────────────────────

  const [form, setForm] = useState({
    nome: "", telefone: "", email: "", endereco: "",
    whatsappNumero: "", reservaPercentual: "30", reservaHorasExpiracao: "24",
    corPrimaria: "#4f46e5", corSecundaria: "#e0e7ff", logoUrl: "",
    // Portal
    portalAtivo: false,
    autoConfirmarPortal: false,
    portalCobraSinal: true,
    portalHeaderUrl: "",
    portalMensagemBemVindo: "",
    portalSlug: "",
    horaAbertura: "08:00",
    horaFechamento: "18:00",
    diasFuncionamento: [1, 2, 3, 4, 5] as number[],
    intervaloMinutos: "30",
    timezone: "America/Sao_Paulo",
  });

  useEffect(() => {
    if (empresa) {
      setForm({
        nome: empresa.nome ?? "",
        telefone: empresa.telefone ?? "",
        email: empresa.email ?? "",
        endereco: empresa.endereco ?? "",
        whatsappNumero: empresa.whatsappNumero ?? "",
        reservaPercentual: String(empresa.reservaPercentual ?? 30),
        reservaHorasExpiracao: String(empresa.reservaHorasExpiracao ?? 24),
        corPrimaria: empresa.corPrimaria ?? "#4f46e5",
        corSecundaria: empresa.corSecundaria ?? "#e0e7ff",
        logoUrl: empresa.logoUrl ?? "",
        portalAtivo: empresa.portalAtivo ?? false,
        autoConfirmarPortal: empresa.autoConfirmarPortal ?? false,
        portalCobraSinal: (empresa as any).portalCobraSinal !== false,
        portalHeaderUrl: (empresa as any).portalHeaderUrl ?? "",
        portalMensagemBemVindo: (empresa as any).portalMensagemBemVindo ?? "",
        portalSlug: (empresa as any).portalSlug ?? "",
        horaAbertura: (empresa as any).horaAbertura ?? "08:00",
        horaFechamento: (empresa as any).horaFechamento ?? "18:00",
        diasFuncionamento: (empresa as any).diasFuncionamento ?? [1, 2, 3, 4, 5],
        intervaloMinutos: String((empresa as any).intervaloMinutos ?? 30),
        timezone: (empresa as any).timezone ?? "America/Sao_Paulo",
      });
    }
  }, [empresa]);

  // ─── Preferências de Notificações Push ─────────────────────────────────────
  const { data: prefNotif, isLoading: loadingPref } = trpc.push.getPreferencias.useQuery();
  const [notifPrefs, setNotifPrefs] = useState({
    novoAgendamento: true,
    confirmacao: true,
    cancelamento: true,
    lembrete: true,
    pagamento: true,
    comissao: true,
  });
  useEffect(() => {
    if (prefNotif) setNotifPrefs(prefNotif);
  }, [prefNotif]);
  const salvarPrefsMutation = trpc.push.salvarPreferencias.useMutation({
    // Toast unificado no botão principal (handleSave)
    onError: (err: any) => toast.error("Erro ao salvar preferências: " + err.message),
  });
  // ─────────────────────────────────────────────────────────────────────────────
  const updateMutation = trpc.empresa.update.useMutation({
    onSuccess: () => { toast.success("Todas as configurações foram salvas!"); utils.empresa.get.invalidate(); },
    onError: (err: any) => toast.error(err.message),
  });

  const uploadLogoMutation = trpc.empresa.uploadLogo.useMutation({
    onSuccess: () => utils.empresa.get.invalidate(),
    onError: (err: any) => toast.error(err.message),
  });

  const uploadCapaMutation = trpc.empresa.uploadCapa.useMutation({
    onSuccess: () => utils.empresa.get.invalidate(),
    onError: (err: any) => toast.error(err.message),
  });
  

  

  

  // Validação de slug em tempo real
  const [slugParaVerificar, setSlugParaVerificar] = useState("");
  const [slugDigitando, setSlugDigitando] = useState(false);
  const { data: slugCheck, isFetching: verificandoSlug } = trpc.empresa.checkSlugDisponivel.useQuery(
    { slug: slugParaVerificar },
    { enabled: slugParaVerificar.length >= 2, staleTime: 5000 }
  );

  // Debounce: atualiza slugParaVerificar 600ms após parar de digitar
  useEffect(() => {
    if (!slugDigitando) return;
    const timer = setTimeout(() => {
      setSlugParaVerificar(form.portalSlug);
      setSlugDigitando(false);
    }, 600);
    return () => clearTimeout(timer);
  }, [form.portalSlug, slugDigitando]);

  const slugOcupado = slugParaVerificar === form.portalSlug && slugCheck?.disponivel === false;
  const slugDisponivel = slugParaVerificar === form.portalSlug && slugCheck?.disponivel === true && form.portalSlug.length >= 2;

  function handleSave() {
    if (slugOcupado) {
      toast.error("Este slug já está em uso por outra empresa. Escolha outro.");
      return;
    }
    // Salvar preferências de notificações junto com as configurações
    salvarPrefsMutation.mutate(notifPrefs);
    updateMutation.mutate({
      nome: form.nome,
      telefone: form.telefone,
      email: form.email,
      endereco: form.endereco,
      whatsappNumero: form.whatsappNumero,
      reservaPercentual: form.reservaPercentual,
      reservaHorasExpiracao: parseInt(form.reservaHorasExpiracao) || 24,
      corPrimaria: form.corPrimaria,
      corSecundaria: form.corSecundaria,
      logoUrl: form.logoUrl || undefined,
      portalAtivo: form.portalAtivo,
      autoConfirmarPortal: form.autoConfirmarPortal,
      portalCobraSinal: form.portalCobraSinal,
      portalHeaderUrl: form.portalHeaderUrl || undefined,
      portalMensagemBemVindo: form.portalMensagemBemVindo || undefined,
      portalSlug: form.portalSlug || undefined,
      horaAbertura: form.horaAbertura,
      horaFechamento: form.horaFechamento,
      diasFuncionamento: form.diasFuncionamento,
      intervaloMinutos: parseInt(form.intervaloMinutos) || 30,
      timezone: form.timezone,
    });
  }

  // Comprime imagem via canvas antes de enviar ao S3
  async function comprimirImagem(file: File, maxWidth: number, maxHeight: number, quality = 0.85): Promise<{ base64: string; mimeType: string }> {
    // SVG não precisa de compressão
    if (file.type === 'image/svg+xml') {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (ev) => resolve({ base64: (ev.target?.result as string).split(',')[1], mimeType: file.type });
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }
    return new Promise((resolve, reject) => {
      const img = new window.Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        let { width, height } = img;
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, width, height);
        const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        const dataUrl = canvas.toDataURL(mimeType, quality);
        resolve({ base64: dataUrl.split(',')[1], mimeType });
      };
      img.onerror = reject;
      img.src = url;
    });
  }

  function toggleDia(dia: number) {
    setForm(f => ({
      ...f,
      diasFuncionamento: f.diasFuncionamento.includes(dia)
        ? f.diasFuncionamento.filter(d => d !== dia)
        : [...f.diasFuncionamento, dia].sort(),
    }));
  }

  const portalSlugAtual = (empresa as any)?.portalSlug;
  const portalUrl = portalSlugAtual
    ? `${window.location.origin}/agendar/${portalSlugAtual}`
    : `${window.location.origin}/agendar?e=${empresa?.id ?? 1}`;

  function copiarLink() {
    navigator.clipboard.writeText(portalUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Link copiado!");
  }

  // Guarda de permissão: apenas quem tem configuracoesVer pode acessar Configurações
  if (!pode("configuracoesVer")) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center p-8">
        <Settings className="w-12 h-12 text-muted-foreground/30" />
        <p className="text-sm font-medium text-muted-foreground">Você não tem permissão para acessar as Configurações.</p>
      </div>
    );
  }

  return (
    <>
    <div className="p-4 lg:p-6 space-y-4 lg:space-y-6 max-w-3xl mx-auto animate-in-up">
      <h1 className="font-bold tracking-tight text-xl lg:text-2xl">Configurações</h1>

      {/* Dados da Empresa */}
      <div className="card-elegant">
        <div className="flex items-center gap-2 px-5 py-4" style={{ borderBottom: "1px solid oklch(89.5% 0.018 80)" }}>
          <Building2 className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-semibold text-sm">Dados da Empresa</h3>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Label className="text-xs text-muted-foreground mb-1.5 block">Nome do estabelecimento</Label>
              <Input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Telefone</Label>
              <Input value={form.telefone} onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">WhatsApp</Label>
              <Input value={form.whatsappNumero} onChange={e => setForm(f => ({ ...f, whatsappNumero: e.target.value }))} placeholder="5511999999999" />
            </div>
            <div className="sm:col-span-2">
              <Label className="text-xs text-muted-foreground mb-1.5 block">Email</Label>
              <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="sm:col-span-2">
              <Label className="text-xs text-muted-foreground mb-1.5 block">Endereço</Label>
              <Input value={form.endereco} onChange={e => setForm(f => ({ ...f, endereco: e.target.value }))} />
            </div>
          </div>
        </div>
      </div>

      {/* Identidade Visual */}
      <div className="card-elegant">
        <div className="flex items-center gap-2 px-5 py-4" style={{ borderBottom: "1px solid oklch(89.5% 0.018 80)" }}>
          <Palette className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-semibold text-sm">Identidade Visual</h3>
        </div>
        <div className="p-5 space-y-5">

          {/* Cores */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Cor primária</Label>
              <div className="flex items-center gap-2">
                <input type="color" value={form.corPrimaria}
                  onChange={e => setForm(f => ({ ...f, corPrimaria: e.target.value }))}
                  className="w-10 h-9 rounded-lg border border-border cursor-pointer p-0.5" />
                <Input value={form.corPrimaria} onChange={e => setForm(f => ({ ...f, corPrimaria: e.target.value }))}
                  className="font-mono text-sm" placeholder="#4f46e5" />
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Cor secundária</Label>
              <div className="flex items-center gap-2">
                <input type="color" value={form.corSecundaria}
                  onChange={e => setForm(f => ({ ...f, corSecundaria: e.target.value }))}
                  className="w-10 h-9 rounded-lg border border-border cursor-pointer p-0.5" />
                <Input value={form.corSecundaria} onChange={e => setForm(f => ({ ...f, corSecundaria: e.target.value }))}
                  className="font-mono text-sm" placeholder="#e0e7ff" />
              </div>
            </div>
          </div>

          {/* Preview das cores */}
          <div className="rounded-xl p-4 border" style={{ background: form.corPrimaria + "10", borderColor: form.corPrimaria + "30" }}>
            <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: form.corPrimaria }}>
              Preview das cores
            </p>
            <div className="flex items-center gap-3">
              {form.logoUrl
                ? <img src={form.logoUrl || "/manus-storage/hubly-logo-dark_ecdf0ad5.png"} alt="Logo" className="w-10 h-10 rounded-xl object-contain border" style={{ borderColor: form.corPrimaria + "40" }} />
                : <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold" style={{ background: form.corPrimaria }}>A</div>
              }
              <div className="flex-1 h-3 rounded-full" style={{ background: form.corSecundaria }} />
              <div className="px-3 py-1.5 rounded-lg text-white text-xs font-semibold" style={{ background: form.corPrimaria }}>Botão</div>
            </div>
          </div>

          {/* Logo */}
          <div>
            <Label className="text-xs text-muted-foreground mb-2 block flex items-center gap-1">
              <Image className="w-3 h-3" /> Logo da empresa
            </Label>
            <div className="space-y-2">
              {/* Upload de arquivo */}
              <label className="flex items-center gap-2 cursor-pointer group">
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-sm text-muted-foreground group-hover:text-foreground">
                  <Upload className="w-3.5 h-3.5" />
                  <span className="text-xs">Enviar arquivo (PNG, SVG, JPG)</span>
                </div>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (!file) return;
                    if (file.size > 10 * 1024 * 1024) { toast.error('Arquivo muito grande. Máximo 10MB.'); return; }
                    abrirEditorImagem(file, 1, "Editar logo", async (blob, mimeType) => {
                      try {
                        toast.info('Enviando logo...');
                        const reader = new FileReader();
                        const base64 = await new Promise<string>((res, rej) => {
                          reader.onload = ev => res((ev.target?.result as string).split(',')[1]);
                          reader.onerror = rej;
                          reader.readAsDataURL(blob);
                        });
                        const result = await uploadLogoMutation.mutateAsync({ imagemBase64: base64, mimeType });
                        setForm(f => ({ ...f, logoUrl: result.url }));
                        setCropEditor(null);
                        toast.success('Logo enviado com sucesso!');
                      } catch { toast.error('Erro ao enviar logo'); }
                    });
                  }}
                />
              </label>
              {/* Ou URL */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground whitespace-nowrap">ou cole a URL:</span>
                <Input value={form.logoUrl} onChange={e => setForm(f => ({ ...f, logoUrl: e.target.value }))}
                  placeholder="https://..." className="text-xs h-8" />
              </div>
              {uploadLogoMutation.isPending && <p className="text-xs text-muted-foreground flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Enviando logo...</p>}
            </div>
          </div>

          {/* Imagem de capa */}
          <div>
            <Label className="text-xs text-muted-foreground mb-2 block flex items-center gap-1">
              <Image className="w-3 h-3" /> Imagem de capa do portal
            </Label>
            <p className="text-[11px] text-muted-foreground mb-2">Exibida no topo do portal de agendamento público (1200×400px recomendado)</p>
            {form.portalHeaderUrl && (
              <div className="mb-2 rounded-xl overflow-hidden border border-border" style={{ maxHeight: 100 }}>
                <img src={form.portalHeaderUrl} alt="Capa" className="w-full h-24 object-cover" />
              </div>
            )}
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer group">
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-sm text-muted-foreground group-hover:text-foreground">
                  <Upload className="w-3.5 h-3.5" />
                  <span className="text-xs">Enviar arquivo (JPG, PNG, WebP)</span>
                </div>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (!file) return;
                    if (file.size > 20 * 1024 * 1024) { toast.error('Arquivo muito grande. Máximo 20MB.'); return; }
                    abrirEditorImagem(file, 3, "Editar imagem de capa", async (blob, mimeType) => {
                      try {
                        toast.info('Enviando imagem de capa...');
                        const reader = new FileReader();
                        const base64 = await new Promise<string>((res, rej) => {
                          reader.onload = ev => res((ev.target?.result as string).split(',')[1]);
                          reader.onerror = rej;
                          reader.readAsDataURL(blob);
                        });
                        const result = await uploadCapaMutation.mutateAsync({ imagemBase64: base64, mimeType });
                        setForm(f => ({ ...f, portalHeaderUrl: result.url }));
                        setCropEditor(null);
                        toast.success('Imagem de capa enviada!');
                      } catch { toast.error('Erro ao enviar imagem de capa'); }
                    });
                  }}
                />
              </label>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground whitespace-nowrap">ou cole a URL:</span>
                <Input value={form.portalHeaderUrl} onChange={e => setForm(f => ({ ...f, portalHeaderUrl: e.target.value }))}
                  placeholder="https://..." className="text-xs h-8" />
              </div>
              {uploadCapaMutation.isPending && <p className="text-xs text-muted-foreground flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Enviando capa...</p>}
            </div>
          </div>

        </div>
      </div>

      {/* Portal de Agendamento Público */}
      <div className="card-elegant">
        <div className="flex items-center gap-2 px-5 py-4" style={{ borderBottom: "1px solid oklch(89.5% 0.018 80)" }}>
          <Globe className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-semibold text-sm">Portal de Agendamento Público</h3>
        </div>
        <div className="p-5 space-y-5">

          {/* Ativar portal */}
          <div className="flex items-center justify-between p-4 rounded-xl border"
            style={{ background: form.portalAtivo ? "oklch(62% 0.18 155 / 6%)" : "oklch(96.2% 0.012 75)", borderColor: form.portalAtivo ? "oklch(62% 0.18 155 / 30%)" : "oklch(89.5% 0.018 80)" }}>
            <div>
              <p className="font-semibold text-sm">Ativar portal público</p>
              <p className="text-xs text-muted-foreground mt-0.5">Permite que clientes agendem online sem precisar ligar</p>
            </div>
            <button
              onClick={() => setForm(f => ({ ...f, portalAtivo: !f.portalAtivo }))}
              className="relative w-11 h-6 rounded-full transition-all flex-shrink-0"
              style={{ background: form.portalAtivo ? "oklch(62% 0.18 155)" : "oklch(82% 0.090 80)" }}>
              <div className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all"
                style={{ left: form.portalAtivo ? "22px" : "2px" }} />
            </button>
          </div>

          {/* Link do portal */}
          {form.portalAtivo && (
            <div className="rounded-xl p-4 space-y-3" style={{ background: "oklch(96.2% 0.012 75)", border: "1px solid oklch(89.5% 0.018 80)" }}>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Link do portal</p>

              {/* Campo de slug personalizado */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground block">URL personalizada (slug)</Label>
                <div
                  className="flex items-center gap-1.5 rounded-lg border bg-background overflow-hidden transition-colors"
                  style={{
                    borderColor: slugOcupado
                      ? "oklch(55% 0.18 25)"
                      : slugDisponivel
                      ? "oklch(55% 0.15 145)"
                      : "oklch(89.5% 0.018 80)"
                  }}
                >
                  <span className="text-xs text-muted-foreground px-2 py-2 bg-muted border-r whitespace-nowrap" style={{ borderColor: "oklch(89.5% 0.018 80)" }}>
                    /agendar/
                  </span>
                  <input
                    type="text"
                    value={form.portalSlug}
                    onChange={e => {
                      setForm(f => ({ ...f, portalSlug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/--+/g, "-") }));
                      setSlugDigitando(true);
                    }}
                    placeholder="meu-salao"
                    className="flex-1 text-xs px-2 py-2 bg-transparent outline-none"
                  />
                  {/* Ícone de status */}
                  <span className="pr-2 flex-shrink-0">
                    {(verificandoSlug || slugDigitando) && form.portalSlug.length >= 2 ? (
                      <Loader2 className="w-3.5 h-3.5 text-muted-foreground animate-spin" />
                    ) : slugOcupado ? (
                      <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                    ) : slugDisponivel ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                    ) : null}
                  </span>
                </div>
                {slugOcupado && (
                  <p className="text-[10px] font-medium" style={{ color: "oklch(55% 0.18 25)" }}>
                    ⚠️ Este slug já está em uso por outra empresa. Escolha outro.
                  </p>
                )}
                {slugDisponivel && (
                  <p className="text-[10px] font-medium" style={{ color: "oklch(45% 0.15 145)" }}>
                    ✓ Slug disponível!
                  </p>
                )}
                {!slugOcupado && !slugDisponivel && (
                  <p className="text-[10px] text-muted-foreground">Use apenas letras minúsculas, números e hífens. Salve para ativar.</p>
                )}
              </div>

              {/* Link atual */}
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs bg-muted px-3 py-2 rounded-lg truncate">{portalUrl}</code>
                <button onClick={copiarLink}
                  className="p-2 rounded-lg hover:bg-muted transition-colors flex-shrink-0">
                  {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
                </button>
                <a href={portalUrl} target="_blank" rel="noopener noreferrer"
                  className="p-2 rounded-lg hover:bg-muted transition-colors flex-shrink-0">
                  <ExternalLink className="w-4 h-4 text-muted-foreground" />
                </a>
              </div>
            </div>
          )}

          {/* Confirmação automática */}
          <div className="flex items-center justify-between p-4 rounded-xl border"
            style={{ background: "oklch(96.2% 0.012 75)", borderColor: "oklch(89.5% 0.018 80)" }}>
            <div>
              <p className="font-semibold text-sm">Confirmação automática</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {form.autoConfirmarPortal
                  ? "Agendamentos do portal são confirmados automaticamente"
                  : "Agendamentos do portal ficam pendentes para sua aprovação"}
              </p>
            </div>
            <button
              onClick={() => setForm(f => ({ ...f, autoConfirmarPortal: !f.autoConfirmarPortal }))}
              className="relative w-11 h-6 rounded-full transition-all flex-shrink-0"
              style={{ background: form.autoConfirmarPortal ? "oklch(78.5% 0.075 85)" : "oklch(82% 0.090 80)" }}>
              <div className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all"
                style={{ left: form.autoConfirmarPortal ? "22px" : "2px" }} />
            </button>
          </div>

          {/* Cobrar sinal no portal */}
          <div className="flex items-center justify-between p-4 rounded-xl border"
            style={{ background: "oklch(96.2% 0.012 75)", borderColor: "oklch(89.5% 0.018 80)" }}>
            <div>
              <p className="font-semibold text-sm">Cobrar sinal no portal</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {form.portalCobraSinal
                  ? `Sinal de ${form.reservaPercentual ?? 30}% será exibido e cobrado nos agendamentos pelo portal`
                  : "Agendamentos pelo portal não exigirão pagamento de sinal"}
              </p>
            </div>
            <button
              onClick={() => setForm(f => ({ ...f, portalCobraSinal: !f.portalCobraSinal }))}
              className="relative w-11 h-6 rounded-full transition-all flex-shrink-0"
              style={{ background: form.portalCobraSinal ? "oklch(78.5% 0.075 85)" : "oklch(82% 0.090 80)" }}>
              <div className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all"
                style={{ left: form.portalCobraSinal ? "22px" : "2px" }} />
            </button>
          </div>

          {/* Mensagem de boas-vindas */}
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Mensagem de boas-vindas (opcional)</Label>
            <textarea
              value={form.portalMensagemBemVindo}
              onChange={e => setForm(f => ({ ...f, portalMensagemBemVindo: e.target.value }))}
              placeholder="Ex: Bem-vindo ao nosso salão! Agende seu horário com facilidade."
              rows={2}
              className="w-full px-3 py-2.5 rounded-xl text-sm resize-none border outline-none transition-all bg-background text-foreground"
              style={{ borderColor: "oklch(89.5% 0.018 80)" }}
            />
          </div>

          {/* Política de cancelamento */}
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Política de cancelamento (opcional)</Label>
            <textarea
              value={(form as any).portalPoliticaCancelamento ?? ""}
              onChange={e => setForm(f => ({ ...f, portalPoliticaCancelamento: e.target.value }))}
              placeholder="Ex: Cancelamentos com menos de 24h de antecedência não serão reembolsados."
              rows={2}
              className="w-full px-3 py-2.5 rounded-xl text-sm resize-none border outline-none transition-all bg-background text-foreground"
              style={{ borderColor: "oklch(89.5% 0.018 80)" }}
            />
            <p className="text-xs text-muted-foreground mt-1">Exibida para o cliente na etapa de confirmação do agendamento.</p>
          </div>


        </div>
      </div>

      {/* Horário de Funcionamento */}
      <div className="card-elegant">
        <div className="flex items-center gap-2 px-5 py-4" style={{ borderBottom: "1px solid oklch(89.5% 0.018 80)" }}>
          <Clock className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-semibold text-sm">Horário de Funcionamento</h3>
        </div>
        <div className="p-5 space-y-4">
          {/* Dias da semana */}
          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">Dias de funcionamento</Label>
            <div className="flex gap-2 flex-wrap">
              {DIAS_SEMANA.map(dia => (
                <button key={dia.value}
                  onClick={() => toggleDia(dia.value)}
                  className="w-12 h-10 rounded-xl text-xs font-semibold border-2 transition-all"
                  style={{
                    borderColor: form.diasFuncionamento.includes(dia.value) ? "oklch(78.5% 0.075 85)" : "oklch(89.5% 0.018 80)",
                    background: form.diasFuncionamento.includes(dia.value) ? "oklch(78.5% 0.075 85 / 10%)" : "oklch(96.2% 0.012 75)",
                    color: form.diasFuncionamento.includes(dia.value) ? "oklch(45% 0.060 55)" : "oklch(52% 0.016 55)",
                  }}>
                  {dia.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Hora de abertura</Label>
              <Input type="time" value={form.horaAbertura} onChange={e => setForm(f => ({ ...f, horaAbertura: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Hora de fechamento</Label>
              <Input type="time" value={form.horaFechamento} onChange={e => setForm(f => ({ ...f, horaFechamento: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Intervalo entre slots (min)</Label>
              <Input type="number" min="15" max="120" step="15" value={form.intervaloMinutos}
                onChange={e => setForm(f => ({ ...f, intervaloMinutos: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Fuso horário</Label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={form.timezone}
                onChange={e => setForm(f => ({ ...f, timezone: e.target.value }))}
              >
                <option value="America/Sao_Paulo">Brasília (UTC-3)</option>
                <option value="America/Manaus">Manaus (UTC-4)</option>
                <option value="America/Cuiaba">Cuiabá (UTC-4)</option>
                <option value="America/Belem">Belém (UTC-3)</option>
                <option value="America/Fortaleza">Fortaleza (UTC-3)</option>
                <option value="America/Recife">Recife (UTC-3)</option>
                <option value="America/Bahia">Salvador (UTC-3)</option>
                <option value="America/Campo_Grande">Campo Grande (UTC-4)</option>
                <option value="America/Porto_Velho">Porto Velho (UTC-4)</option>
                <option value="America/Boa_Vista">Boa Vista (UTC-4)</option>
                <option value="America/Rio_Branco">Rio Branco (UTC-5)</option>
                <option value="America/Noronha">Fernando de Noronha (UTC-2)</option>
                <option value="America/Araguaina">Araguaina (UTC-3)</option>
                <option value="America/Maceio">Maceió (UTC-3)</option>
                <option value="America/Santarem">Santarém (UTC-3)</option>
                <option value="America/Buenos_Aires">Buenos Aires (UTC-3)</option>
                <option value="America/Montevideo">Montevideo (UTC-3)</option>
                <option value="America/Santiago">Santiago (UTC-3)</option>
                <option value="America/Asuncion">Assunção (UTC-4)</option>
                <option value="America/Bogota">Bogotá (UTC-5)</option>
                <option value="America/Lima">Lima (UTC-5)</option>
                <option value="America/New_York">New York (UTC-5)</option>
                <option value="America/Los_Angeles">Los Angeles (UTC-8)</option>
                <option value="Europe/Lisbon">Lisboa (UTC+0)</option>
                <option value="Europe/London">Londres (UTC+0)</option>
              </select>
              <p className="text-xs text-muted-foreground mt-1">Usado para disparar automações no horário correto</p>
            </div>
          </div>
        </div>
      </div>

      {/* Regras de Agendamento */}
      <div className="card-elegant">
        <div className="flex items-center gap-2 px-5 py-4" style={{ borderBottom: "1px solid oklch(89.5% 0.018 80)" }}>
          <Settings className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-semibold text-sm">Regras de Agendamento</h3>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">% de reserva antecipada</Label>
              <Input type="number" min="0" max="100" value={form.reservaPercentual}
                onChange={e => setForm(f => ({ ...f, reservaPercentual: e.target.value }))} />
              <p className="text-xs text-muted-foreground mt-1">% do valor cobrado como reserva. Usado na variável <code className="bg-muted px-1 rounded text-xs font-mono">{'{{'+'valor_reserva'+'}}'}</code> das automações.</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Expiração do pré-agendamento (h)</Label>
              <Input type="number" min="1" max="72" value={form.reservaHorasExpiracao}
                onChange={e => setForm(f => ({ ...f, reservaHorasExpiracao: e.target.value }))} />
              <p className="text-xs text-muted-foreground mt-1">Horas até cancelar automaticamente</p>
            </div>
          </div>
        </div>
      </div>

      {/* Notificações Push */}
      <div className="card-elegant">
        <div className="flex items-center gap-2 px-5 py-4" style={{ borderBottom: "1px solid oklch(89.5% 0.018 80)" }}>
          <Bell className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-semibold text-sm">Notificações Push</h3>
          <span className="ml-auto text-xs text-muted-foreground">Escolha quais alertas receber no dispositivo</span>
        </div>
        <div className="p-5 space-y-3">
          {loadingPref ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm"><Loader2 className="w-4 h-4 animate-spin" /> Carregando preferências...</div>
          ) : (
            <>
              {([
                { key: "novoAgendamento" as const, label: "Novo agendamento", desc: "Quando um novo agendamento é criado" },
                { key: "confirmacao" as const, label: "Confirmação de agendamento", desc: "Quando o cliente confirma o horário" },
                { key: "cancelamento" as const, label: "Cancelamento", desc: "Quando um agendamento é cancelado" },
                { key: "lembrete" as const, label: "Lembretes", desc: "Lembretes automáticos antes do horário" },
                { key: "pagamento" as const, label: "Pagamentos e financeiro", desc: "Contas a pagar/receber e movimentações" },
                { key: "comissao" as const, label: "Comissões", desc: "Atualizações de comissões dos profissionais" },
              ] as const).map(({ key, label, desc }) => (
                <div key={key} className="flex items-center justify-between py-2.5 border-b border-border/50 last:border-0">
                  <div>
                    <p className="text-sm font-medium">{label}</p>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </div>
                  <Switch
                    checked={notifPrefs[key]}
                    onCheckedChange={(val) => setNotifPrefs(prev => ({ ...prev, [key]: val }))}
                  />
                </div>
              ))}

            </>
          )}
        </div>
      </div>

      {/* Google Calendar Integration */}
      <GoogleCalendarCard />

      <button onClick={handleSave} disabled={updateMutation.isPending || salvarPrefsMutation.isPending} className="btn-primary">
        <Save className="w-4 h-4" />
        {(updateMutation.isPending || salvarPrefsMutation.isPending) ? "Salvando..." : "Salvar configurações"}
      </button>

      {/* Zona de Perigo — Exclusão de Conta */}
      <div className="rounded-xl border-2 border-red-200 dark:border-red-900/50 overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 bg-red-50 dark:bg-red-950/30" style={{ borderBottom: "1px solid oklch(89.5% 0.018 0)" }}>
          <AlertTriangle className="w-4 h-4 text-red-600" />
          <h3 className="font-semibold text-sm text-red-700 dark:text-red-400">Zona de Perigo</h3>
        </div>
        <div className="p-5 space-y-3">
          <p className="text-sm text-muted-foreground">
            A exclusão da conta remove permanentemente todos os dados da empresa, incluindo agendamentos, clientes, profissionais, financeiro e automações. <strong>Esta ação é irreversível.</strong>
          </p>
          <p className="text-xs text-muted-foreground">
            Apenas o proprietário da conta pode executar esta ação. Assinaturas ativas serão canceladas automaticamente.
          </p>
          <button
            onClick={() => { setDeleteConfirmText(""); setShowDeleteDialog(true); }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-red-600 border border-red-300 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Excluir minha conta e todos os dados
          </button>
        </div>
      </div>
    </div>

      {/* Modal de confirmação de exclusão de conta */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Excluir conta permanentemente
            </DialogTitle>
            <DialogDescription className="text-sm pt-2">
              Esta ação <strong>não pode ser desfeita</strong>. Todos os dados da empresa serão excluídos permanentemente:
              agendamentos, clientes, profissionais, financeiro, automações e assinaturas.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm font-medium">Para confirmar, digite exatamente:</p>
            <p className="font-mono text-sm bg-muted rounded px-3 py-2 select-all">EXCLUIR MINHA CONTA</p>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={e => setDeleteConfirmText(e.target.value)}
              placeholder="Digite aqui para confirmar"
              className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
              autoComplete="off"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)} disabled={excluirContaMutation.isPending}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleExcluirConta}
              disabled={deleteConfirmText !== "EXCLUIR MINHA CONTA" || excluirContaMutation.isPending}
            >
              {excluirContaMutation.isPending ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-2" />Excluindo...</>
              ) : (
                <><Trash2 className="w-4 h-4 mr-2" />Excluir permanentemente</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Editor de imagem (crop/zoom/rotação) */}
      {cropEditor && (
        <ImageCropEditor
          imageSrc={cropEditor.imageSrc}
          aspect={cropEditor.aspect}
          title={cropEditor.title}
          onConfirm={cropEditor.onConfirm}
          onCancel={() => {
            URL.revokeObjectURL(cropEditor.imageSrc);
            setCropEditor(null);
          }}
        />
      )}
    </>
  );
}

// ─── Google Calendar Card ─────────────────────────────────────────────────────
function GoogleCalendarCard() {
  const utils = trpc.useUtils();
  const { data: status, isLoading } = trpc.googleCalendar.getStatus.useQuery();

  const gerarUrlMut = trpc.googleCalendar.gerarUrlAutorizacao.useMutation({
    onSuccess: (data) => {
      // Redirecionar para o Google OAuth
      window.location.href = data.url;
    },
    onError: (err: any) => {
      import("sonner").then(({ toast }) => toast.error(err.message ?? "Erro ao conectar Google"));
    },
  });

  const desconectarMut = trpc.googleCalendar.desconectar.useMutation({
    onSuccess: () => {
      utils.googleCalendar.getStatus.invalidate();
      import("sonner").then(({ toast }) => toast.success("Google Calendar desconectado"));
    },
  });

  return (
    <div className="card-elegant">
      <div className="flex items-center gap-2 px-5 py-4" style={{ borderBottom: "1px solid oklch(89.5% 0.018 80)" }}>
        <Calendar className="w-4 h-4 text-muted-foreground" />
        <h3 className="font-semibold text-sm">Google Agenda</h3>
        <span className="ml-auto text-xs text-muted-foreground">Sincronize agendamentos automaticamente</span>
      </div>
      <div className="p-5 space-y-4">
        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="w-4 h-4 animate-spin" /> Verificando conexão...
          </div>
        ) : status?.conectado ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-green-50 border border-green-200">
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                <Check className="w-4 h-4 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-green-800">Google Agenda conectado</p>
                {status.email && <p className="text-xs text-green-600 truncate">{status.email}</p>}
                {status.calendarNome && <p className="text-xs text-green-600 truncate">Calendário: {status.calendarNome}</p>}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Novos agendamentos e bloqueios serão sincronizados automaticamente com o Google Agenda.
              Compromissos pessoais do Google <strong>não</strong> afetam a agenda do Hubly.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 text-red-600 border-red-200 hover:bg-red-50"
              onClick={() => desconectarMut.mutate()}
              disabled={desconectarMut.isPending}
            >
              {desconectarMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Unlink className="w-3.5 h-3.5" />}
              Desconectar Google Agenda
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Conecte sua conta Google para sincronizar agendamentos e bloqueios automaticamente com o Google Agenda.
              Um calendário dedicado "Hubly" será criado na sua conta.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-muted-foreground">
              {[
                "Agendamentos aparecem automaticamente",
                "Bloqueios sincronizados em tempo real",
                "Calendário dedicado separado",
                "Compromissos pessoais não interferem",
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <Check className="w-3 h-3 text-green-500 shrink-0" />
                  {item}
                </div>
              ))}
            </div>
            <Button
              className="gap-2"
              onClick={() => gerarUrlMut.mutate()}
              disabled={gerarUrlMut.isPending}
            >
              {gerarUrlMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
              Conectar Google Agenda
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
