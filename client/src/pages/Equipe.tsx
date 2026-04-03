import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Plus,
  Search,
  MoreVertical,
  UserCog,
  Shield,
  Users,
  KeyRound,
  Pencil,
  UserX,
  UserCheck,
  Briefcase,
  Lock,
} from "lucide-react";

// ─── Tipos ────────────────────────────────────────────────────────────────────
type MembroEquipe = {
  id: number;
  nome: string;
  email: string | null;
  telefone: string | null;
  especialidade: string | null;
  corCalendario: string | null;
  avatarUrl: string | null;
  ativo: boolean | null;
  isProfissional: boolean;
  temAcesso: boolean;
  grupoId: number | null;
  ultimoAcesso: Date | null;
  createdAt: Date;
  grupoNome: string | null;
  grupoCor: string | null;
};

type FiltroAba = "todos" | "profissionais" | "acesso";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getInitials(nome: string) {
  return nome
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

// ─── Modal de Criação / Edição ────────────────────────────────────────────────
function ModalMembro({
  open,
  onClose,
  membro,
  grupos,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  membro: MembroEquipe | null;
  grupos: { id: number; nome: string; cor: string | null }[];
  onSaved: () => void;
}) {
  const isEdit = !!membro;

  const [nome, setNome] = useState(membro?.nome ?? "");
  const [email, setEmail] = useState(membro?.email ?? "");
  const [telefone, setTelefone] = useState(membro?.telefone ?? "");
  const [especialidade, setEspecialidade] = useState(membro?.especialidade ?? "");
  const [corCalendario, setCorCalendario] = useState(membro?.corCalendario ?? "#7c3aed");
  const [isProfissional, setIsProfissional] = useState(membro?.isProfissional ?? true);
  const [temAcesso, setTemAcesso] = useState(membro?.temAcesso ?? false);
  const [grupoId, setGrupoId] = useState<string>(membro?.grupoId?.toString() ?? "");
  const [senha, setSenha] = useState("");
  const [ativo, setAtivo] = useState(membro?.ativo ?? true);

  const criar = trpc.equipe.criar.useMutation({
    onSuccess: () => {
      toast.success("Membro adicionado com sucesso!");
      onSaved();
      onClose();
    },
    onError: (err) => toast.error(err.message),
  });

  const atualizar = trpc.equipe.atualizar.useMutation({
    onSuccess: () => {
      toast.success("Membro atualizado com sucesso!");
      onSaved();
      onClose();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSubmit = () => {
    if (!nome.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }
    if (temAcesso && !isEdit && !senha) {
      toast.error("Senha obrigatória para usuários com acesso ao sistema");
      return;
    }
    if (temAcesso && !email) {
      toast.error("E-mail obrigatório para usuários com acesso ao sistema");
      return;
    }

    const payload = {
      nome: nome.trim(),
      email: email || undefined,
      telefone: telefone || undefined,
      especialidade: especialidade || undefined,
      corCalendario,
      isProfissional,
      temAcesso,
      grupoId: grupoId ? parseInt(grupoId) : undefined,
      senha: senha || undefined,
    };

    if (isEdit) {
      atualizar.mutate({ id: membro.id, ...payload, ativo });
    } else {
      criar.mutate(payload);
    }
  };

  const isPending = criar.isPending || atualizar.isPending;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar Membro" : "Novo Membro da Equipe"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Nome */}
          <div className="space-y-1">
            <Label>Nome *</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome completo" />
          </div>

          {/* E-mail */}
          <div className="space-y-1">
            <Label>E-mail</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@exemplo.com" type="email" />
          </div>

          {/* Telefone */}
          <div className="space-y-1">
            <Label>Telefone</Label>
            <Input value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(11) 99999-9999" />
          </div>

          {/* Flags de papel */}
          <div className="rounded-lg border p-4 space-y-3">
            <p className="text-sm font-medium text-muted-foreground">Papel na equipe</p>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-violet-500" />
                  Aparece na agenda
                </p>
                <p className="text-xs text-muted-foreground">Pode ser selecionado em agendamentos</p>
              </div>
              <Switch checked={isProfissional} onCheckedChange={setIsProfissional} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium flex items-center gap-2">
                  <Lock className="w-4 h-4 text-blue-500" />
                  Acesso ao sistema
                </p>
                <p className="text-xs text-muted-foreground">Pode fazer login no painel</p>
              </div>
              <Switch checked={temAcesso} onCheckedChange={setTemAcesso} />
            </div>
          </div>

          {/* Campos condicionais: profissional */}
          {isProfissional && (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Especialidade</Label>
                <Input value={especialidade} onChange={(e) => setEspecialidade(e.target.value)} placeholder="Ex: Cabeleireiro, Manicure..." />
              </div>
              <div className="space-y-1">
                <Label>Cor no calendário</Label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={corCalendario}
                    onChange={(e) => setCorCalendario(e.target.value)}
                    className="w-10 h-10 rounded cursor-pointer border border-border"
                  />
                  <span className="text-sm text-muted-foreground">{corCalendario}</span>
                </div>
              </div>
            </div>
          )}

          {/* Campos condicionais: acesso */}
          {temAcesso && (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Grupo de permissões</Label>
                <Select value={grupoId} onValueChange={setGrupoId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar grupo..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem grupo</SelectItem>
                    {grupos.map((g) => (
                      <SelectItem key={g.id} value={g.id.toString()}>
                        <span className="flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-full inline-block"
                            style={{ backgroundColor: g.cor ?? "#6366f1" }}
                          />
                          {g.nome}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>{isEdit ? "Nova senha (deixe em branco para manter)" : "Senha *"}</Label>
                <Input
                  type="password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder={isEdit ? "••••••••" : "Mínimo 6 caracteres"}
                />
              </div>
            </div>
          )}

          {/* Status (apenas edição) */}
          {isEdit && (
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Status</p>
                <p className="text-xs text-muted-foreground">Ativo ou inativo na equipe</p>
              </div>
              <Switch checked={ativo} onCheckedChange={setAtivo} />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? "Salvando..." : isEdit ? "Salvar alterações" : "Adicionar membro"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Modal de Reset de Senha ──────────────────────────────────────────────────
function ModalResetSenha({
  open,
  onClose,
  membro,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  membro: MembroEquipe | null;
  onSaved: () => void;
}) {
  const [novaSenha, setNovaSenha] = useState("");
  const resetar = trpc.equipe.resetarSenha.useMutation({
    onSuccess: () => {
      toast.success("Senha redefinida com sucesso!");
      setNovaSenha("");
      onSaved();
      onClose();
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Redefinir senha</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <p className="text-sm text-muted-foreground">
            Definir nova senha para <strong>{membro?.nome}</strong>
          </p>
          <div className="space-y-1">
            <Label>Nova senha</Label>
            <Input
              type="password"
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value)}
              placeholder="Mínimo 6 caracteres"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            onClick={() => {
              if (!membro || novaSenha.length < 6) {
                toast.error("Senha deve ter ao menos 6 caracteres");
                return;
              }
              resetar.mutate({ id: membro.id, novaSenha });
            }}
            disabled={resetar.isPending}
          >
            {resetar.isPending ? "Salvando..." : "Redefinir senha"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Card de Membro ───────────────────────────────────────────────────────────
function CardMembro({
  membro,
  onEdit,
  onResetSenha,
  onToggleAtivo,
}: {
  membro: MembroEquipe;
  onEdit: (m: MembroEquipe) => void;
  onResetSenha: (m: MembroEquipe) => void;
  onToggleAtivo: (m: MembroEquipe) => void;
}) {
  return (
    <div
      className={`flex items-center gap-4 p-4 rounded-xl border bg-card transition-opacity ${
        !membro.ativo ? "opacity-50" : ""
      }`}
    >
      {/* Avatar */}
      <Avatar className="w-11 h-11 shrink-0">
        {membro.avatarUrl && <AvatarImage src={membro.avatarUrl} alt={membro.nome} />}
        <AvatarFallback
          className="text-white text-sm font-semibold"
          style={{ backgroundColor: membro.corCalendario ?? "#6b7280" }}
        >
          {getInitials(membro.nome)}
        </AvatarFallback>
      </Avatar>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm truncate">{membro.nome}</span>
          {!membro.ativo && (
            <Badge variant="secondary" className="text-xs">Inativo</Badge>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {membro.email && (
            <span className="text-xs text-muted-foreground truncate">{membro.email}</span>
          )}
          {membro.especialidade && (
            <span className="text-xs text-muted-foreground">· {membro.especialidade}</span>
          )}
        </div>
        {/* Badges de papel */}
        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
          {membro.isProfissional && (
            <Badge className="text-[10px] px-1.5 py-0 gap-1 bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-700">
              <Briefcase className="w-2.5 h-2.5" />
              Profissional
            </Badge>
          )}
          {membro.temAcesso && (
            <Badge className="text-[10px] px-1.5 py-0 gap-1 bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700">
              <Shield className="w-2.5 h-2.5" />
              {membro.grupoNome ?? "Acesso"}
            </Badge>
          )}
        </div>
      </div>

      {/* Ações */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8">
            <MoreVertical className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onEdit(membro)}>
            <Pencil className="w-4 h-4 mr-2" />
            Editar
          </DropdownMenuItem>
          {membro.temAcesso && (
            <DropdownMenuItem onClick={() => onResetSenha(membro)}>
              <KeyRound className="w-4 h-4 mr-2" />
              Redefinir senha
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => onToggleAtivo(membro)} className={membro.ativo ? "text-destructive" : ""}>
            {membro.ativo ? (
              <>
                <UserX className="w-4 h-4 mr-2" />
                Desativar
              </>
            ) : (
              <>
                <UserCheck className="w-4 h-4 mr-2" />
                Reativar
              </>
            )}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// ─── Página Principal ─────────────────────────────────────────────────────────
export default function Equipe() {
  const [busca, setBusca] = useState("");
  const [filtroAba, setFiltroAba] = useState<FiltroAba>("todos");
  const [modalAberto, setModalAberto] = useState(false);
  const [membroEditando, setMembroEditando] = useState<MembroEquipe | null>(null);
  const [modalResetSenha, setModalResetSenha] = useState(false);
  const [membroResetSenha, setMembroResetSenha] = useState<MembroEquipe | null>(null);

  const { data: membros = [], refetch } = trpc.equipe.list.useQuery();
  const { data: grupos = [] } = trpc.grupos.list.useQuery();

  const atualizar = trpc.equipe.atualizar.useMutation({
    onSuccess: () => {
      toast.success("Status atualizado!");
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const membrosFiltrados = useMemo(() => {
    let lista = membros as MembroEquipe[];

    if (filtroAba === "profissionais") {
      lista = lista.filter((m) => m.isProfissional);
    } else if (filtroAba === "acesso") {
      lista = lista.filter((m) => m.temAcesso);
    }

    if (busca.trim()) {
      const q = busca.toLowerCase();
      lista = lista.filter(
        (m) =>
          m.nome.toLowerCase().includes(q) ||
          (m.email ?? "").toLowerCase().includes(q) ||
          (m.especialidade ?? "").toLowerCase().includes(q) ||
          (m.grupoNome ?? "").toLowerCase().includes(q)
      );
    }

    return lista;
  }, [membros, filtroAba, busca]);

  const totalAtivos = (membros as MembroEquipe[]).filter((m) => m.ativo).length;
  const totalProfissionais = (membros as MembroEquipe[]).filter((m) => m.isProfissional).length;
  const totalComAcesso = (membros as MembroEquipe[]).filter((m) => m.temAcesso).length;

  const handleEdit = (m: MembroEquipe) => {
    setMembroEditando(m);
    setModalAberto(true);
  };

  const handleResetSenha = (m: MembroEquipe) => {
    setMembroResetSenha(m);
    setModalResetSenha(true);
  };

  const handleToggleAtivo = (m: MembroEquipe) => {
    atualizar.mutate({ id: m.id, ativo: !m.ativo });
  };

  const handleNovoMembro = () => {
    setMembroEditando(null);
    setModalAberto(true);
  };

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" />
            Equipe
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Gerencie profissionais e usuários do sistema em um único lugar
          </p>
        </div>
        <Button onClick={handleNovoMembro} className="shrink-0">
          <Plus className="w-4 h-4 mr-2" />
          <span className="hidden sm:inline">Novo membro</span>
          <span className="sm:hidden">Novo</span>
        </Button>
      </div>

      {/* Estatísticas rápidas */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border bg-card p-3 text-center">
          <p className="text-2xl font-bold">{totalAtivos}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Ativos</p>
        </div>
        <div className="rounded-xl border bg-card p-3 text-center">
          <p className="text-2xl font-bold text-violet-600">{totalProfissionais}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Profissionais</p>
        </div>
        <div className="rounded-xl border bg-card p-3 text-center">
          <p className="text-2xl font-bold text-blue-600">{totalComAcesso}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Com acesso</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar por nome, e-mail, especialidade..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        <Tabs value={filtroAba} onValueChange={(v) => setFiltroAba(v as FiltroAba)}>
          <TabsList>
            <TabsTrigger value="todos" className="gap-1.5">
              <Users className="w-3.5 h-3.5" />
              Todos
            </TabsTrigger>
            <TabsTrigger value="profissionais" className="gap-1.5">
              <UserCog className="w-3.5 h-3.5" />
              Profissionais
            </TabsTrigger>
            <TabsTrigger value="acesso" className="gap-1.5">
              <Shield className="w-3.5 h-3.5" />
              Com acesso
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Lista */}
      {membrosFiltrados.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Nenhum membro encontrado</p>
          <p className="text-sm mt-1">
            {busca ? "Tente outro termo de busca" : "Adicione o primeiro membro da equipe"}
          </p>
          {!busca && (
            <Button variant="outline" className="mt-4" onClick={handleNovoMembro}>
              <Plus className="w-4 h-4 mr-2" />
              Adicionar membro
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {membrosFiltrados.map((m) => (
            <CardMembro
              key={m.id}
              membro={m}
              onEdit={handleEdit}
              onResetSenha={handleResetSenha}
              onToggleAtivo={handleToggleAtivo}
            />
          ))}
        </div>
      )}

      {/* Modais */}
      <ModalMembro
        open={modalAberto}
        onClose={() => {
          setModalAberto(false);
          setMembroEditando(null);
        }}
        membro={membroEditando}
        grupos={grupos as { id: number; nome: string; cor: string | null }[]}
        onSaved={() => refetch()}
      />

      <ModalResetSenha
        open={modalResetSenha}
        onClose={() => {
          setModalResetSenha(false);
          setMembroResetSenha(null);
        }}
        membro={membroResetSenha}
        onSaved={() => refetch()}
      />
    </div>
  );
}
