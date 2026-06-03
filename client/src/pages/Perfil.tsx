import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Camera, Eye, EyeOff, Loader2, User, Lock, Mail, Calendar, CheckCircle2, AlertTriangle, Unlink, Pencil, X } from "lucide-react";
import { useSystemAuth } from "@/_core/hooks/useSystemAuth";

export default function Perfil() {
  const { user: systemUser } = useSystemAuth();
  const utils = trpc.useUtils();

  // Buscar dados do perfil
  const { data: perfil, isLoading } = trpc.perfil.getMe.useQuery(undefined, {
    enabled: !!systemUser,
  });

  // Estado do formulário de dados
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [dadosEditados, setDadosEditados] = useState(false);

  // Estado do formulário de senha
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [showSenhaAtual, setShowSenhaAtual] = useState(false);
  const [showNovaSenha, setShowNovaSenha] = useState(false);

  // Upload de avatar
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Sincronizar estado com dados do perfil
  const nomeAtual = nome || perfil?.nome || "";
  const emailAtual = email || perfil?.email || "";

  const updateMutation = trpc.perfil.update.useMutation({
    onSuccess: () => {
      toast.success("Dados atualizados com sucesso!");
      utils.perfil.getMe.invalidate();
      setDadosEditados(false);
      setNome("");
      setEmail("");
    },
    onError: (err) => {
      toast.error(err.message || "Erro ao atualizar dados");
    },
  });

  const uploadAvatarMutation = trpc.perfil.uploadAvatar.useMutation({
    onSuccess: () => {
      toast.success("Foto de perfil atualizada!");
      utils.perfil.getMe.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "Erro ao fazer upload da foto");
    },
  });

  const changePasswordMutation = trpc.perfil.changePassword.useMutation({
    onSuccess: () => {
      toast.success("Senha alterada com sucesso!");
      setSenhaAtual("");
      setNovaSenha("");
      setConfirmarSenha("");
    },
    onError: (err) => {
      toast.error(err.message || "Erro ao alterar senha");
    },
  });

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem muito grande. Máximo 5MB.");
      return;
    }
    setUploadingAvatar(true);
    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const base64 = (ev.target?.result as string).split(",")[1];
        await uploadAvatarMutation.mutateAsync({
          imagemBase64: base64,
          mimeType: file.type,
        });
        setUploadingAvatar(false);
      };
      reader.readAsDataURL(file);
    } catch {
      setUploadingAvatar(false);
    }
  };

  const handleSalvarDados = () => {
    const updates: { nome?: string; email?: string } = {};
    if (nome && nome !== perfil?.nome) updates.nome = nome;
    if (email && email !== perfil?.email) updates.email = email;
    if (Object.keys(updates).length === 0) {
      toast.info("Nenhuma alteração detectada");
      return;
    }
    updateMutation.mutate(updates);
  };

  // ── Google Agenda por usuário ──────────────────────────────────────────────
  const { data: googleStatus, refetch: refetchGoogle } = trpc.googleCalendarUsuario.getStatus.useQuery(
    undefined,
    { enabled: !!systemUser }
  );
  const [nomeAgenda, setNomeAgenda] = useState("");
  const [editandoNome, setEditandoNome] = useState(false);
  const [novoNomeAgenda, setNovoNomeAgenda] = useState("");

  const gerarUrlGoogle = trpc.googleCalendarUsuario.gerarUrlAutorizacao.useMutation({
    onSuccess: ({ url }) => {
      toast.info("Redirecionando para o Google...");
      window.location.href = url;
    },
    onError: (err) => toast.error(err.message || "Erro ao gerar URL do Google"),
  });
  const desconectarGoogle = trpc.googleCalendarUsuario.desconectar.useMutation({
    onSuccess: () => {
      toast.success("Google Agenda desconectado");
      refetchGoogle();
    },
    onError: (err) => toast.error(err.message || "Erro ao desconectar"),
  });
  const renomearAgenda = trpc.googleCalendarUsuario.renomearAgenda.useMutation({
    onSuccess: () => {
      toast.success("Nome da agenda atualizado!");
      refetchGoogle();
      setEditandoNome(false);
    },
    onError: (err) => toast.error(err.message || "Erro ao renomear agenda"),
  });

  // Cor dos eventos no Google Calendar
  const [corEvento, setCorEvento] = useState<string>("#039be5");
  const [corEventoInicial, setCorEventoInicial] = useState<string>("#039be5");
  useEffect(() => {
    if (googleStatus?.corEvento) {
      setCorEvento(googleStatus.corEvento);
      setCorEventoInicial(googleStatus.corEvento);
    }
  }, [googleStatus?.corEvento]);
  const configurarCor = trpc.googleCalendarUsuario.configurarCor.useMutation({
    onSuccess: () => {
      toast.success("Cor dos eventos atualizada!");
      setCorEventoInicial(corEvento);
      refetchGoogle();
    },
    onError: (err) => toast.error(err.message || "Erro ao salvar cor"),
  });

  // Detectar retorno do OAuth Google
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("google_user_success") === "1") {
      toast.success("Google Agenda conectado com sucesso!");
      refetchGoogle();
      const url = new URL(window.location.href);
      url.searchParams.delete("google_user_success");
      window.history.replaceState({}, "", url.toString());
    } else if (params.get("google_user_error")) {
      toast.error(`Erro ao conectar Google Agenda: ${params.get("google_user_error")}`);
      const url = new URL(window.location.href);
      url.searchParams.delete("google_user_error");
      window.history.replaceState({}, "", url.toString());
    }
  }, []);

  const handleAlterarSenha = () => {
    if (!senhaAtual) { toast.error("Informe a senha atual"); return; }
    if (novaSenha.length < 6) { toast.error("A nova senha deve ter pelo menos 6 caracteres"); return; }
    if (novaSenha !== confirmarSenha) { toast.error("As senhas não coincidem"); return; }
    changePasswordMutation.mutate({ senhaAtual, novaSenha });
  };

  if (!systemUser) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground text-sm text-center">
              Configurações de perfil disponíveis apenas para usuários do sistema (login por e-mail e senha).
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const initials = (perfil?.nome || "U").split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Meu Perfil</h1>
        <p className="text-muted-foreground text-sm mt-1">Gerencie suas informações pessoais e segurança da conta.</p>
      </div>

      {/* Foto de perfil */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <User className="w-4 h-4" />
            Foto de Perfil
          </CardTitle>
          <CardDescription>Sua foto aparece na barra lateral e em todo o sistema.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-5">
            <div className="relative">
              <div
                className="w-20 h-20 rounded-2xl overflow-hidden flex items-center justify-center flex-shrink-0"
                style={{ background: "oklch(78.5% 0.075 85)" }}
              >
                {perfil?.avatarUrl ? (
                  <img
                    src={perfil.avatarUrl}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-2xl font-bold text-white">{initials}</span>
                )}
              </div>
              {uploadingAvatar && (
                <div className="absolute inset-0 rounded-2xl bg-black/50 flex items-center justify-center">
                  <Loader2 className="w-5 h-5 animate-spin text-white" />
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="gap-2"
              >
                <Camera className="w-4 h-4" />
                {uploadingAvatar ? "Enviando..." : "Alterar foto"}
              </Button>
              <p className="text-xs text-muted-foreground">JPG, PNG ou GIF. Máximo 5MB.</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>
        </CardContent>
      </Card>

      {/* Dados pessoais */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Mail className="w-4 h-4" />
            Dados Pessoais
          </CardTitle>
          <CardDescription>Atualize seu nome e endereço de e-mail.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="nome">Nome completo</Label>
            <Input
              id="nome"
              value={dadosEditados ? nome : (perfil?.nome ?? "")}
              onChange={(e) => { setNome(e.target.value); setDadosEditados(true); }}
              placeholder="Seu nome completo"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              value={dadosEditados ? email : (perfil?.email ?? "")}
              onChange={(e) => { setEmail(e.target.value); setDadosEditados(true); }}
              placeholder="seu@email.com"
            />
          </div>
          <Button
            onClick={handleSalvarDados}
            disabled={updateMutation.isPending || !dadosEditados}
            className="w-full sm:w-auto"
          >
            {updateMutation.isPending ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Salvando...</>
            ) : "Salvar alterações"}
          </Button>
        </CardContent>
      </Card>

      {/* Google Agenda */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Google Agenda
          </CardTitle>
          <CardDescription>
            Conecte sua conta Google para sincronizar seus agendamentos automaticamente no Google Agenda.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {googleStatus?.conectado ? (
            <div className="space-y-4">
              {/* Conta conectada */}
              <div className="rounded-xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30 overflow-hidden">
                <div className="flex items-center gap-3 p-4">
                  <div className="w-9 h-9 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-green-800 dark:text-green-200">Google Agenda conectado</p>
                    {googleStatus.email && (
                      <p className="text-xs text-green-700 dark:text-green-400 truncate mt-0.5">{googleStatus.email}</p>
                    )}
                  </div>
                </div>
                {/* Agenda dedicada */}
                <div className="border-t border-green-200 dark:border-green-800 px-4 py-3 bg-white/50 dark:bg-white/5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-muted-foreground">Agenda no Google</p>
                      {editandoNome ? (
                        <div className="flex items-center gap-2 mt-1">
                          <Input
                            value={novoNomeAgenda}
                            onChange={(e) => setNovoNomeAgenda(e.target.value)}
                            className="h-7 text-sm"
                            placeholder="Nome da agenda"
                            autoFocus
                          />
                          <Button
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={() => renomearAgenda.mutate({ novoNome: novoNomeAgenda })}
                            disabled={renomearAgenda.isPending || !novoNomeAgenda.trim()}
                          >
                            {renomearAgenda.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Salvar"}
                          </Button>
                          <button
                            onClick={() => setEditandoNome(false)}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <p className="text-sm font-medium truncate">
                            {googleStatus.calendarNome ?? "Agenda principal"}
                          </p>
                          <button
                            onClick={() => {
                              setNovoNomeAgenda(googleStatus.calendarNome ?? "");
                              setEditandoNome(true);
                            }}
                            className="text-muted-foreground hover:text-foreground flex-shrink-0"
                            title="Renomear agenda"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Cor dos eventos */}
              <div className="rounded-xl border px-4 py-3 space-y-2">
                <p className="text-xs text-muted-foreground">Cor dos eventos no Google Agenda</p>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <input
                      type="color"
                      value={corEvento}
                      onChange={(e) => setCorEvento(e.target.value)}
                      className="w-9 h-9 rounded-lg cursor-pointer border border-border p-0.5 bg-transparent"
                      title="Escolher cor"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium" style={{ color: corEvento }}>{corEvento.toUpperCase()}</p>
                    <p className="text-xs text-muted-foreground">Clique na bolinha para abrir a paleta de cores</p>
                  </div>
                  {corEvento !== corEventoInicial && (
                    <Button
                      size="sm"
                      className="h-7 px-3 text-xs flex-shrink-0"
                      onClick={() => configurarCor.mutate({ cor: corEvento })}
                      disabled={configurarCor.isPending}
                    >
                      {configurarCor.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Salvar"}
                    </Button>
                  )}
                </div>
              </div>

              {/* Botão desconectar */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => desconectarGoogle.mutate()}
                disabled={desconectarGoogle.isPending}
                className="gap-2 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                {desconectarGoogle.isPending ? (
                  <><Loader2 className="w-4 h-4 animate-spin" />Desconectando...</>
                ) : (
                  <><Unlink className="w-4 h-4" />Desconectar Google Agenda</>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Nome personalizado da agenda */}
              <div className="space-y-1.5">
                <Label htmlFor="nomeAgenda">Nome da agenda (opcional)</Label>
                <Input
                  id="nomeAgenda"
                  value={nomeAgenda}
                  onChange={(e) => setNomeAgenda(e.target.value)}
                  placeholder={`Hubly — ${perfil?.nome ?? "Profissional"}`}
                />
                <p className="text-xs text-muted-foreground">
                  Este será o nome da agenda criada no seu Google Agenda. Deixe em branco para usar o padrão.
                </p>
              </div>

              {/* Aviso de verificação */}
              <div className="flex gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-sm">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-medium text-amber-800 dark:text-amber-300">Aviso sobre verificação do Google</p>
                  <p className="text-amber-700 dark:text-amber-400 text-xs">
                    O Google pode exibir a tela <strong>"O Google não verificou este app"</strong>. Isso é normal.
                    Clique em <strong>"Avançado"</strong> e depois em <strong>"Acessar orizontech.com.br (não seguro)"</strong> para continuar.
                  </p>
                </div>
              </div>

              <Button
                onClick={() => gerarUrlGoogle.mutate({
                  nomeCalendario: nomeAgenda.trim() || undefined,
                })}
                disabled={gerarUrlGoogle.isPending}
                className="gap-2 w-full sm:w-auto"
              >
                {gerarUrlGoogle.isPending ? (
                  <><Loader2 className="w-4 h-4 animate-spin" />Redirecionando...</>
                ) : (
                  <><Calendar className="w-4 h-4" />Conectar Google Agenda</>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Alterar senha */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Lock className="w-4 h-4" />
            Alterar Senha
          </CardTitle>
          <CardDescription>Escolha uma senha segura com pelo menos 6 caracteres.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="senhaAtual">Senha atual</Label>
            <div className="relative">
              <Input
                id="senhaAtual"
                type={showSenhaAtual ? "text" : "password"}
                value={senhaAtual}
                onChange={(e) => setSenhaAtual(e.target.value)}
                placeholder="••••••••"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowSenhaAtual(!showSenhaAtual)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showSenhaAtual ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <Separator />
          <div className="space-y-1.5">
            <Label htmlFor="novaSenha">Nova senha</Label>
            <div className="relative">
              <Input
                id="novaSenha"
                type={showNovaSenha ? "text" : "password"}
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
                placeholder="••••••••"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowNovaSenha(!showNovaSenha)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showNovaSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirmarSenha">Confirmar nova senha</Label>
            <Input
              id="confirmarSenha"
              type="password"
              value={confirmarSenha}
              onChange={(e) => setConfirmarSenha(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <Button
            onClick={handleAlterarSenha}
            disabled={changePasswordMutation.isPending || !senhaAtual || !novaSenha || !confirmarSenha}
            variant="outline"
            className="w-full sm:w-auto"
          >
            {changePasswordMutation.isPending ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Alterando...</>
            ) : "Alterar senha"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
