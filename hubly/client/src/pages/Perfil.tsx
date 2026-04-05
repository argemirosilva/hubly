import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Camera, Eye, EyeOff, Loader2, User, Lock, Mail } from "lucide-react";
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
                style={{ background: "oklch(55% 0.22 264)" }}
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
