import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Users, Shield, Plus, Trash2, Edit2, Mail, UserCog,
  ChevronRight, Check, Settings2, Eye, EyeOff,
  CalendarDays, DollarSign, Users2, Wrench, Bell, BarChart3, Lock, Zap,
  Key, Search, Clock, ToggleLeft, ToggleRight, CheckCircle2
} from "lucide-react";

// ─── Mapa completo de permissões por módulo ───────────────────────────────────
const PERMISSION_GROUPS = [
  {
    key: "agendamentos", label: "Agendamentos", icon: CalendarDays, color: "oklch(78.5% 0.075 85)",
    items: [
      { key: "agendamentosVer", label: "Visualizar agendamentos" },
      { key: "agendamentosVerTodos", label: "Ver agendamentos de todos os profissionais" },
      { key: "agendamentosCriar", label: "Criar agendamentos" },
      { key: "agendamentosEditar", label: "Editar agendamentos" },
      { key: "agendamentosConfirmar", label: "Confirmar agendamentos" },
      { key: "agendamentosConcluir", label: "Concluir atendimentos" },
      { key: "agendamentosRemarcar", label: "Remarcar agendamentos" },
      { key: "agendamentosCancelar", label: "Cancelar agendamentos" },
    ],
  },
  {
    key: "clientes", label: "Clientes", icon: Users2, color: "oklch(62% 0.18 155)",
    items: [
      { key: "clientesVer", label: "Visualizar clientes" },
      { key: "clientesVerContato", label: "Ver telefone e e-mail dos clientes" },
      { key: "clientesCriar", label: "Cadastrar novos clientes" },
      { key: "clientesEditar", label: "Editar dados dos clientes" },
      { key: "clientesVerHistorico", label: "Ver histórico de atendimentos" },
      { key: "clientesVerProntuario", label: "Ver prontuários e documentos" },
      { key: "clientesEditarProntuario", label: "Editar prontuários e documentos" },
      { key: "clientesExcluir", label: "Excluir clientes" },
    ],
  },
  {
    key: "agenda", label: "Agenda e Bloqueios", icon: Lock, color: "oklch(72% 0.16 80)",
    items: [
      { key: "agendaSolicitarBloqueio", label: "Solicitar bloqueio de agenda" },
      { key: "agendaAprovarBloqueio", label: "Aprovar/recusar bloqueios" },
      { key: "agendaVerBloqueiosTodos", label: "Ver bloqueios de todos os profissionais" },
    ],
  },
  {
    key: "financeiro", label: "Financeiro", icon: DollarSign, color: "oklch(62% 0.18 140)",
    items: [
      { key: "financeiroVer", label: "Acessar módulo financeiro" },
      { key: "financeiroVerComissoes", label: "Ver comissões" },
      { key: "financeiroEditarComissoes", label: "Editar comissões" },
      { key: "financeiroMarcarPago", label: "Marcar comissões como pagas" },
      { key: "financeiroVerReceita", label: "Ver receita da empresa" },
      { key: "financeiroVerCustos", label: "Ver custos e despesas" },
      { key: "financeiroVerRelatorios", label: "Ver relatórios financeiros" },
    ],
  },
  {
    key: "profissionais", label: "Profissionais", icon: Users, color: "oklch(55% 0.22 300)",
    items: [
      { key: "profissionaisVer", label: "Visualizar profissionais" },
      { key: "profissionaisCriar", label: "Cadastrar profissionais" },
      { key: "profissionaisEditar", label: "Editar profissionais" },
      { key: "profissionaisGerenciarPermissoes", label: "Gerenciar permissões de profissionais" },
      { key: "profissionaisExcluir", label: "Excluir profissionais" },
    ],
  },
  {
    key: "servicos", label: "Serviços", icon: Wrench, color: "oklch(55% 0.22 30)",
    items: [
      { key: "servicosVer", label: "Visualizar serviços" },
      { key: "servicosCriar", label: "Cadastrar serviços" },
      { key: "servicosEditar", label: "Editar serviços" },
      { key: "servicosExcluir", label: "Excluir serviços" },
    ],
  },
  {
    key: "automacoes", label: "Automações", icon: Zap, color: "oklch(72% 0.16 60)",
    items: [
      { key: "automacoesVer", label: "Visualizar automações" },
      { key: "automacoesCriar", label: "Criar automações" },
      { key: "automacoesEditar", label: "Editar automações" },
      { key: "automacoesAtivar", label: "Ativar/desativar automações" },
      { key: "automacoesExcluir", label: "Excluir automações" },
    ],
  },
  {
    key: "relatorios", label: "Relatórios e Dashboard", icon: BarChart3, color: "oklch(78.5% 0.075 85)",
    items: [
      { key: "dashboardVer", label: "Acessar dashboard" },
      { key: "dashboardVerMetricas", label: "Ver métricas do dashboard" },
      { key: "relatoriosVer", label: "Visualizar relatórios" },
      { key: "relatoriosExportar", label: "Exportar relatórios" },
    ],
  },
  {
    key: "sistema", label: "Sistema e Usuários", icon: Settings2, color: "oklch(45% 0.050 55)",
    items: [
      { key: "notificacoesVer", label: "Receber notificações" },
      { key: "configuracoesVer", label: "Ver configurações" },
      { key: "configuracoesEditar", label: "Editar configurações da empresa" },
      { key: "usuariosVer", label: "Ver usuários do sistema" },
      { key: "usuariosConvidar", label: "Cadastrar novos usuários" },
      { key: "usuariosEditar", label: "Editar usuários" },
      { key: "usuariosRemover", label: "Remover usuários" },
      { key: "gruposVer", label: "Ver grupos de permissões" },
      { key: "gruposCriar", label: "Criar grupos" },
      { key: "gruposEditar", label: "Editar grupos" },
      { key: "gruposExcluir", label: "Excluir grupos" },
    ],
  },
];

const TOTAL_PERMS = PERMISSION_GROUPS.flatMap(g => g.items).length;
const COR_PRESETS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#f97316", "#ec4899", "#64748b", "#0ea5e9"];

// Filtra apenas os campos booleanos de um objeto de permissões (remove id, grupoId, createdAt, updatedAt, etc.)
function filtrarPermissoesBooleanas(obj: Record<string, any> | null | undefined): Record<string, boolean> {
  if (!obj) return {};
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => typeof v === 'boolean')
  ) as Record<string, boolean>;
}

// ─── Editor de Permissões ─────────────────────────────────────────────────────
function PermissoesEditor({ grupoId, permissoes, onClose }: {
  grupoId: number;
  permissoes: Record<string, boolean> | null;
  onClose: () => void;
}) {
  const utils = trpc.useUtils();
  // Filtrar apenas campos booleanos para evitar erro de validação ao salvar
  const [local, setLocal] = useState<Record<string, boolean>>(() => filtrarPermissoesBooleanas(permissoes));
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(PERMISSION_GROUPS.map(g => g.key)));

  const updateMutation = trpc.grupos.updatePermissoes.useMutation({
    onSuccess: () => { toast.success("Permissões salvas!"); utils.grupos.list.invalidate(); onClose(); },
    onError: (e: any) => toast.error(e.message),
  });

  const toggle = (key: string) => setLocal(p => ({ ...p, [key]: !p[key] }));
  const toggleGroup = (items: { key: string }[], value: boolean) => {
    setLocal(p => { const n = { ...p }; items.forEach(i => { n[i.key] = value; }); return n; });
  };
  const isAllChecked = (items: { key: string }[]) => items.every(i => local[i.key]);
  const isPartial = (items: { key: string }[]) => items.some(i => local[i.key]) && !isAllChecked(items);
  const activeTotal = Object.values(local).filter(Boolean).length;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4 px-1">
        <span className="text-xs text-muted-foreground">{activeTotal} de {TOTAL_PERMS} permissões ativas</span>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => {
            const all: Record<string, boolean> = {};
            PERMISSION_GROUPS.flatMap(g => g.items).forEach(i => { all[i.key] = true; });
            setLocal(all);
          }}>Marcar todas</Button>
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setLocal({})}>Limpar todas</Button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {PERMISSION_GROUPS.map((group) => {
          const Icon = group.icon;
          const allChecked = isAllChecked(group.items);
          const partial = isPartial(group.items);
          const expanded = expandedGroups.has(group.key);
          const activeCount = group.items.filter(i => local[i.key]).length;

          return (
            <div key={group.key} className="border border-border rounded-xl overflow-hidden">
              <div
                className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none hover:bg-accent/20 transition-colors"
                style={{ background: expanded ? `${group.color}08` : undefined }}
                onClick={() => setExpandedGroups(prev => {
                  const next = new Set(prev);
                  next.has(group.key) ? next.delete(group.key) : next.add(group.key);
                  return next;
                })}
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${group.color}20` }}>
                  <Icon className="w-4 h-4" style={{ color: group.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{group.label}</p>
                  <p className="text-xs text-muted-foreground">{activeCount}/{group.items.length} ativas</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    className="text-xs px-2 py-1 rounded-md border border-border hover:bg-accent transition-colors"
                    onClick={(e) => { e.stopPropagation(); toggleGroup(group.items, !allChecked); }}
                  >
                    {allChecked ? "Remover todas" : "Marcar todas"}
                  </button>
                  <div className={`w-4 h-4 rounded flex items-center justify-center border-2 transition-colors ${allChecked ? "bg-primary border-primary" : partial ? "border-primary/50" : "border-border"}`}>
                    {(allChecked || partial) && <Check className="w-2.5 h-2.5 text-white" />}
                  </div>
                  <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${expanded ? "rotate-90" : ""}`} />
                </div>
              </div>
              {expanded && (
                <div className="divide-y divide-border/50" style={{ background: "oklch(96.2% 0.012 75)" }}>
                  {group.items.map((item) => (
                    <div key={item.key} className="flex items-center justify-between px-4 py-2.5 hover:bg-accent/20 transition-colors">
                      <label htmlFor={item.key} className="text-sm text-foreground cursor-pointer flex-1 pr-4">{item.label}</label>
                      <Switch id={item.key} checked={!!local[item.key]} onCheckedChange={() => toggle(item.key)} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex gap-3 pt-4 border-t border-border mt-4">
        <Button variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
        <Button className="flex-1" onClick={() => updateMutation.mutate({ grupoId, permissoes: local })} disabled={updateMutation.isPending}>
          {updateMutation.isPending ? "Salvando..." : "Salvar permissões"}
        </Button>
      </div>
    </div>
  );
}

// ─── Modal Cadastrar/Editar Usuário ───────────────────────────────────────────
function UsuarioModal({ user, grupos, onClose, onSave }: {
  user: any | null; grupos: any[]; onClose: () => void; onSave: () => void;
}) {
  const isNew = !user;
  const [nome, setNome] = useState(user?.nome ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [senha, setSenha] = useState("");
  const [grupoId, setGrupoId] = useState<string>(user?.grupoId?.toString() ?? "");
  // No modelo unificado: isProfissional=true significa que aparece na agenda
  const [isProfissional, setIsProfissional] = useState<boolean>(user?.isProfissional ?? false);
  const [showSenha, setShowSenha] = useState(false);

  const criarMutation = trpc.usuarios.systemUsers.criar.useMutation({
    onSuccess: () => { toast.success("Usuário cadastrado!"); onSave(); onClose(); },
    onError: (e: any) => toast.error(e.message),
  });
  const atualizarMutation = trpc.usuarios.systemUsers.atualizar.useMutation({
    onSuccess: () => { toast.success("Usuário atualizado!"); onSave(); onClose(); },
    onError: (e: any) => toast.error(e.message),
  });

  const handleSave = () => {
    if (!nome.trim()) return toast.error("Nome é obrigatório");
    if (!email.trim()) return toast.error("E-mail é obrigatório");
    if (isNew && senha.length < 6) return toast.error("Senha deve ter pelo menos 6 caracteres");
    const gId = grupoId && grupoId !== "none" ? parseInt(grupoId) : undefined;
    if (isNew) {
      criarMutation.mutate({ nome, email, senha, grupoId: gId, isProfissional });
    } else {
      atualizarMutation.mutate({ id: user.id, nome, email, grupoId: gId ?? null, isProfissional, ...(senha ? { senha } : {}) });
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCog className="w-4 h-4 text-primary" />
            {isNew ? "Cadastrar Novo Usuário" : "Editar Usuário"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-1">
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Nome completo *</Label>
            <Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Ana Paula Silva" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">E-mail *</Label>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="ana@exemplo.com" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">
              {isNew ? "Senha *" : "Nova senha (deixe em branco para manter)"}
            </Label>
            <div className="relative">
              <Input
                type={showSenha ? "text" : "password"}
                value={senha}
                onChange={e => setSenha(e.target.value)}
                placeholder={isNew ? "Mínimo 6 caracteres" : "Deixe em branco para não alterar"}
              />
              <button type="button" onClick={() => setShowSenha(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <p className="text-sm font-medium">Profissional (aparece na agenda)</p>
              <p className="text-xs text-muted-foreground mt-0.5">Ativando, este usuário aparecerá como profissional nos agendamentos e verá apenas sua própria agenda e comissões.</p>
            </div>
            <button
              type="button"
              onClick={() => setIsProfissional(v => !v)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                isProfissional ? 'bg-primary' : 'bg-muted'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                isProfissional ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Grupo de permissões</Label>
            <select
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={grupoId}
              onChange={e => setGrupoId(e.target.value)}
            >
              <option value="none">Sem grupo (acesso mínimo)</option>
              {grupos.map((g: any) => (
                <option key={g.id} value={g.id}>{g.nome}</option>
              ))}
            </select>
          </div>
          <div className="rounded-lg p-3 text-xs" style={{ background: "oklch(96.2% 0.012 75)", color: "oklch(40% 0.060 55)" }}>
            <p className="font-medium mb-1">Como funciona o acesso</p>
            <p>O usuário acessa com e-mail e senha. As permissões são definidas pelo grupo atribuído. Sem grupo, o acesso é mínimo.</p>
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
          <Button className="flex-1" onClick={handleSave} disabled={criarMutation.isPending || atualizarMutation.isPending}>
            <CheckCircle2 className="w-4 h-4 mr-2" />
            {isNew ? "Cadastrar" : "Salvar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Modal Reset de Senha ─────────────────────────────────────────────────────
function ResetSenhaModal({ userId, userName, onClose }: { userId: number; userName: string; onClose: () => void; }) {
  const [novaSenha, setNovaSenha] = useState("");
  const [show, setShow] = useState(false);
  const resetMutation = trpc.usuarios.systemUsers.resetarSenha.useMutation({
    onSuccess: () => { toast.success("Senha redefinida!"); onClose(); },
    onError: (e: any) => toast.error(e.message),
  });
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Key className="w-4 h-4" />Redefinir Senha</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">Nova senha para <strong>{userName}</strong></p>
        <div className="relative">
          <Input type={show ? "text" : "password"} value={novaSenha} onChange={e => setNovaSenha(e.target.value)} placeholder="Mínimo 6 caracteres" />
          <button type="button" onClick={() => setShow(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
          <Button className="flex-1" onClick={() => resetMutation.mutate({ id: userId, novaSenha })} disabled={novaSenha.length < 6 || resetMutation.isPending}>
            <Key className="w-4 h-4 mr-2" />Redefinir
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Página Principal ─────────────────────────────────────────────────────────
export default function Usuarios() {
  const utils = trpc.useUtils();
  const [tab, setTab] = useState<"usuarios" | "grupos">("usuarios");
  const [search, setSearch] = useState("");
  const [usuarioModal, setUsuarioModal] = useState<{ open: boolean; user: any | null }>({ open: false, user: null });
  const [grupoModal, setGrupoModal] = useState<{ open: boolean; editId?: number }>({ open: false });
  const [permissoesModal, setPermissoesModal] = useState<{ open: boolean; grupoId?: number; nome?: string; permissoes?: any }>({ open: false });
  const [resetModal, setResetModal] = useState<{ open: boolean; userId: number; userName: string } | null>(null);
  const [formGrupo, setFormGrupo] = useState({ nome: "", descricao: "", cor: "#6366f1" });

  const { data: systemUsers = [], refetch: refetchUsers } = trpc.usuarios.systemUsers.list.useQuery();
  const { data: grupos = [] } = trpc.grupos.list.useQuery();

  const excluirUserMutation = trpc.usuarios.systemUsers.excluir.useMutation({
    onSuccess: () => { toast.success("Usuário removido"); refetchUsers(); },
    onError: (e: any) => toast.error(e.message),
  });
  const toggleAtivoMutation = trpc.usuarios.systemUsers.atualizar.useMutation({
    onSuccess: () => { toast.success("Status atualizado"); refetchUsers(); },
  });
  const createGrupoMutation = trpc.grupos.create.useMutation({
    onSuccess: () => { toast.success("Grupo criado!"); utils.grupos.list.invalidate(); setGrupoModal({ open: false }); setFormGrupo({ nome: "", descricao: "", cor: "#6366f1" }); },
    onError: (e: any) => toast.error(e.message),
  });
  const deleteGrupoMutation = trpc.grupos.delete.useMutation({
    onSuccess: () => { toast.success("Grupo excluído!"); utils.grupos.list.invalidate(); },
    onError: (e: any) => toast.error(e.message),
  });

  const filteredUsers = systemUsers.filter((u: any) =>
    u.nome?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground tracking-widest uppercase mb-1">Sistema</p>
          <h1 className="text-2xl font-bold text-foreground">Usuários & Permissões</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Gerencie quem acessa o sistema e o que cada um pode fazer</p>
        </div>
        <Button onClick={() => tab === "usuarios" ? setUsuarioModal({ open: true, user: null }) : setGrupoModal({ open: true })} className="gap-2">
          <Plus className="w-4 h-4" />
          {tab === "usuarios" ? "Novo Usuário" : "Novo Grupo"}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total de usuários", value: systemUsers.length, icon: Users, color: "oklch(78.5% 0.075 85)" },
          { label: "Usuários ativos", value: systemUsers.filter((u: any) => u.ativo).length, icon: CheckCircle2, color: "oklch(55% 0.22 155)" },
          { label: "Grupos criados", value: grupos.length, icon: Shield, color: "oklch(62% 0.18 60)" },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${stat.color}15` }}>
                <Icon className="w-5 h-5" style={{ color: stat.color }} />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList>
          <TabsTrigger value="usuarios" className="gap-2"><Users className="w-4 h-4" />Usuários</TabsTrigger>
          <TabsTrigger value="grupos" className="gap-2"><Shield className="w-4 h-4" />Grupos e Permissões</TabsTrigger>
        </TabsList>

        {/* ─── ABA USUÁRIOS ────────────────────────────────────────────────── */}
        <TabsContent value="usuarios" className="mt-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Buscar por nome ou e-mail..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>

          {filteredUsers.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground border-2 border-dashed border-border rounded-xl">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Nenhum usuário cadastrado</p>
              <p className="text-sm mb-4">Cadastre o primeiro usuário do sistema</p>
              <Button size="sm" onClick={() => setUsuarioModal({ open: true, user: null })}>
                <Plus className="w-4 h-4 mr-2" />Cadastrar Usuário
              </Button>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Usuário</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Grupo</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Último acesso</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredUsers.map((u: any) => (
                    <tr key={u.id} className="hover:bg-accent/20 transition-colors" style={{ opacity: u.ativo ? 1 : 0.6 }}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full flex items-center justify-center font-semibold text-sm flex-shrink-0"
                            style={{ background: u.grupoCor ? `${u.grupoCor}20` : "oklch(94% 0.010 75)", color: u.grupoCor ?? "oklch(45% 0.060 55)" }}>
                            {u.nome?.charAt(0).toUpperCase() ?? "?"}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="text-sm font-medium text-foreground">{u.nome}</p>
                              {u.isProfissional && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ background: "oklch(55% 0.22 155 / 12%)", color: "oklch(35% 0.14 155)" }}>Profissional</span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="w-3 h-3" />{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {u.grupoNome ? (
                          <Badge style={{ background: `${u.grupoCor}20`, color: u.grupoCor, border: `1px solid ${u.grupoCor}40` }}>
                            {u.grupoNome}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">Sem grupo</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Switch checked={u.ativo} onCheckedChange={val => toggleAtivoMutation.mutate({ id: u.id, ativo: val })} />
                          <span className="text-xs text-muted-foreground">{u.ativo ? "Ativo" : "Inativo"}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {u.ultimoAcesso ? (
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(u.ultimoAcesso).toLocaleDateString("pt-BR")}</span>
                        ) : "Nunca acessou"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button className="p-1.5 rounded-lg hover:bg-accent transition-colors text-muted-foreground" title="Redefinir senha"
                            onClick={() => setResetModal({ open: true, userId: u.id, userName: u.nome })}>
                            <Key className="w-4 h-4" />
                          </button>
                          <button className="p-1.5 rounded-lg hover:bg-accent transition-colors text-muted-foreground" title="Editar usuário"
                            onClick={() => setUsuarioModal({ open: true, user: u })}>
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive" title="Remover usuário"
                            onClick={() => { if (confirm(`Remover "${u.nome}"?`)) excluirUserMutation.mutate({ id: u.id }); }}>
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* ─── ABA GRUPOS ─────────────────────────────────────────────────── */}
        <TabsContent value="grupos" className="mt-4">
          {grupos.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground border-2 border-dashed border-border rounded-xl">
              <Shield className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Nenhum grupo criado</p>
              <p className="text-sm mb-4">Crie grupos para definir permissões por função</p>
              <Button size="sm" onClick={() => setGrupoModal({ open: true })}>
                <Plus className="w-4 h-4 mr-2" />Criar Grupo
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {grupos.map((grupo: any) => {
                const membrosCount = systemUsers.filter((u: any) => u.grupoId === grupo.id).length;

                return (
                  <div key={grupo.id} className="bg-card border border-border rounded-xl p-5 hover:border-primary/30 transition-colors">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${grupo.cor}20` }}>
                          <Shield className="w-5 h-5" style={{ color: grupo.cor }} />
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground">{grupo.nome}</h3>
                          {grupo.descricao && <p className="text-xs text-muted-foreground">{grupo.descricao}</p>}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button className="p-1.5 rounded-lg hover:bg-accent transition-colors text-muted-foreground"
                          onClick={() => setPermissoesModal({ open: true, grupoId: grupo.id, nome: grupo.nome, permissoes: grupo.permissoes })}
                          title="Editar permissões">
                          <Settings2 className="w-4 h-4" />
                        </button>
                        <button className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
                          onClick={() => { if (confirm("Excluir este grupo?")) deleteGrupoMutation.mutate({ id: grupo.id }); }}
                          title="Excluir grupo">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {PERMISSION_GROUPS.filter(g => g.items.some(i => grupo.permissoes?.[i.key])).map(g => (
                        <span key={g.key} className="text-xs px-2 py-0.5 rounded-full border border-border text-muted-foreground">{g.label}</span>
                      ))}
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-border">
                      <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5" />{membrosCount} {membrosCount === 1 ? "usuário" : "usuários"}
                      </span>
                      <Button variant="outline" size="sm" className="text-xs h-7 gap-1"
                        onClick={() => setPermissoesModal({ open: true, grupoId: grupo.id, nome: grupo.nome, permissoes: grupo.permissoes })}>
                        <Edit2 className="w-3 h-3" /> Editar permissões
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ─── MODAL CRIAR GRUPO ────────────────────────────────────────────── */}
      <Dialog open={grupoModal.open} onOpenChange={(o) => setGrupoModal({ open: o })}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Novo Grupo de Permissões</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Nome do grupo *</Label>
              <Input placeholder="Ex: Recepcionista, Profissional, Gerente..." value={formGrupo.nome} onChange={e => setFormGrupo(f => ({ ...f, nome: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Descrição</Label>
              <Input placeholder="Descreva o perfil deste grupo..." value={formGrupo.descricao} onChange={e => setFormGrupo(f => ({ ...f, descricao: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Cor do grupo</Label>
              <div className="flex gap-2 flex-wrap">
                {COR_PRESETS.map(cor => (
                  <button key={cor} className={`w-8 h-8 rounded-lg transition-transform hover:scale-110 ${formGrupo.cor === cor ? "ring-2 ring-offset-2 ring-primary scale-110" : ""}`}
                    style={{ background: cor }} onClick={() => setFormGrupo(f => ({ ...f, cor }))} />
                ))}
              </div>
            </div>
            <div className="rounded-lg p-3 text-xs" style={{ background: "oklch(96.2% 0.012 75)", color: "oklch(40% 0.060 55)" }}>
              Após criar o grupo, você poderá definir as permissões detalhadas clicando em "Editar permissões".
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setGrupoModal({ open: false })}>Cancelar</Button>
              <Button className="flex-1" disabled={!formGrupo.nome || createGrupoMutation.isPending}
                onClick={() => createGrupoMutation.mutate(formGrupo)}>
                {createGrupoMutation.isPending ? "Criando..." : "Criar grupo"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {/* ─── MODAL PERMISSÕES ─────────────────────────────────────────────────────── */}
      <Dialog open={permissoesModal.open} onOpenChange={(o) => setPermissoesModal({ open: o })}>
        <DialogContent className="max-w-2xl p-0" style={{ maxHeight: "min(90vh, 700px)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {/* Header fixo */}
          <div className="flex items-center gap-2 px-6 py-4 border-b border-border flex-shrink-0">
            <Shield className="w-5 h-5 text-primary" />
            <span className="text-lg font-semibold">Permissões — {permissoesModal.nome}</span>
          </div>
          {/* Conteúdo com scroll */}
          {permissoesModal.grupoId && (
            <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", padding: "16px 24px" }}>
              <PermissoesEditor
                grupoId={permissoesModal.grupoId}
                permissoes={permissoesModal.permissoes}
                onClose={() => setPermissoesModal({ open: false })}
              />
            </div>
          )}
        </DialogContent>
      </Dialog> {/* ─── MODAL USUÁRIO ────────────────────────────────────────────────── */}
      {usuarioModal.open && (
        <UsuarioModal
          user={usuarioModal.user}
          grupos={grupos}
          onClose={() => setUsuarioModal({ open: false, user: null })}
          onSave={refetchUsers}
        />
      )}

      {/* ─── MODAL RESET SENHA ────────────────────────────────────────────── */}
      {resetModal?.open && (
        <ResetSenhaModal
          userId={resetModal.userId}
          userName={resetModal.userName}
          onClose={() => setResetModal(null)}
        />
      )}
    </div>
  );
}
