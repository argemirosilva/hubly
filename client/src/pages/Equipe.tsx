import { useState, useMemo, useCallback, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { usePermissoes } from "@/hooks/usePermissoes";
import OnboardingEquipe, { useOnboardingEquipe } from "@/components/OnboardingEquipe";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
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
  Sparkles,
  Clock,
  CheckCircle2,
  Tag,
  X,
  Trash2,
  Settings2,
  ChevronRight,
  Check,
  BarChart3,
  Zap,
  DollarSign,
  Users2,
  Wrench,
  Package,
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
  percentualComissao: string | null;
};

type Servico = {
  id: number;
  nome: string;
  valor: string;
  duracaoMinutos: number | null;
  cor: string | null;
  categoria: string | null;
  ativo: boolean | null;
};

type FiltroAba = "todos" | "profissionais" | "acesso" | "grupos";

// ─── Permissões ───────────────────────────────────────────────────────────────
const PERMISSION_GROUPS = [
  {
    key: "atendimentos", label: "Atendimentos", icon: CheckCircle2, color: "oklch(55% 0.22 264)",
    items: [
      { key: "agendamentosVer", label: "Visualizar agendamentos" },
      { key: "agendamentosCriar", label: "Criar agendamentos" },
      { key: "agendamentosEditar", label: "Editar agendamentos" },
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
    key: "pacotes", label: "Pacotes", icon: Package, color: "oklch(60% 0.20 200)",
    items: [
      { key: "pacotesVer", label: "Visualizar pacotes" },
      { key: "pacotesEditar", label: "Criar e editar pacotes" },
      { key: "pacotesExcluir", label: "Excluir pacotes" },
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
    key: "relatorios", label: "Relatórios e Dashboard", icon: BarChart3, color: "oklch(55% 0.22 220)",
    items: [
      { key: "dashboardVer", label: "Acessar dashboard" },
      { key: "dashboardVerMetricas", label: "Ver métricas do dashboard" },
      { key: "relatoriosVer", label: "Visualizar relatórios" },
      { key: "relatoriosExportar", label: "Exportar relatórios" },
    ],
  },
  {
    key: "sistema", label: "Sistema e Usuários", icon: Settings2, color: "oklch(45% 0.12 260)",
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

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getInitials(nome: string) {
  return nome
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

function formatDuracao(minutos: number | null) {
  if (!minutos) return "";
  if (minutos < 60) return `${minutos}min`;
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return m > 0 ? `${h}h${m}min` : `${h}h`;
}
function formatValor(valor: string) {
  return parseFloat(valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// ─── Editor de Permissões ───────────────────────────────────────────────────────────────
function PermissoesEditor({ grupoId, permissoesIniciais, onClose }: {
  grupoId: number;
  permissoesIniciais: Record<string, boolean>;
  onClose: () => void;
}) {
  const utils = trpc.useUtils();
  const [local, setLocal] = useState<Record<string, boolean>>(permissoesIniciais);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [escopos, setEscopos] = useState<Record<string, 'proprio' | 'todos'>>(() => ({
    notificacoesEscopo: (permissoesIniciais as any).notificacoesEscopo ?? 'proprio',
    agendaEscopo: (permissoesIniciais as any).agendaEscopo ?? 'proprio',
    calendarioEscopo: (permissoesIniciais as any).calendarioEscopo ?? 'proprio',
  }));
  const updateMutation = trpc.grupos.updatePermissoes.useMutation({
    onSuccess: () => { toast.success("Permissões salvas!"); utils.grupos.list.invalidate(); onClose(); },
    onError: (err) => toast.error(err.message),
  });
  const toggle = (key: string) => setLocal(prev => ({ ...prev, [key]: !prev[key] }));
  const toggleGroup = (items: { key: string }[], value: boolean) => {
    setLocal(prev => { const n = { ...prev }; items.forEach(i => { n[i.key] = value; }); return n; });
  };
  const isAllChecked = (items: { key: string }[]) => items.every(i => local[i.key]);
  const isPartial = (items: { key: string }[]) => items.some(i => local[i.key]) && !isAllChecked(items);
  const activeTotal = Object.values(local).filter(Boolean).length;
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-2 px-1">
        <span className="text-xs text-muted-foreground">{activeTotal} de {TOTAL_PERMS} permissões ativas</span>
        <div className="flex gap-1.5">
          <Button size="sm" variant="outline" className="h-6 text-xs px-2" onClick={() => {
            const all: Record<string, boolean> = {};
            PERMISSION_GROUPS.flatMap(g => g.items).forEach(i => { all[i.key] = true; });
            setLocal(all);
          }}>Marcar todas</Button>
          <Button size="sm" variant="outline" className="h-6 text-xs px-2" onClick={() => setLocal({})}>Limpar todas</Button>
        </div>
      </div>
      <div className="space-y-1.5">
        {PERMISSION_GROUPS.map((group) => {
          const Icon = group.icon;
          const allChecked = isAllChecked(group.items);
          const partial = isPartial(group.items);
          const expanded = expandedGroups.has(group.key);
          const activeCount = group.items.filter(i => local[i.key]).length;
          return (
            <div key={group.key} className="border border-border rounded-lg overflow-hidden">
              <div
                className="flex items-center gap-2.5 px-3 py-2 cursor-pointer select-none hover:bg-accent/20 transition-colors"
                style={{ background: expanded ? `${group.color}08` : undefined }}
                onClick={() => setExpandedGroups(prev => {
                  const next = new Set(prev);
                  next.has(group.key) ? next.delete(group.key) : next.add(group.key);
                  return next;
                })}
              >
                <div className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: `${group.color}20` }}>
                  <Icon className="w-3.5 h-3.5" style={{ color: group.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground">{group.label}</p>
                  <p className="text-[10px] text-muted-foreground">{activeCount}/{group.items.length} ativas</p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    className="text-[10px] px-1.5 py-0.5 rounded border border-border hover:bg-accent transition-colors"
                    onClick={(e) => { e.stopPropagation(); toggleGroup(group.items, !allChecked); }}
                  >
                    {allChecked ? "Remover" : "Marcar"}
                  </button>
                  <div className={`w-3.5 h-3.5 rounded flex items-center justify-center border-2 transition-colors ${allChecked ? "bg-primary border-primary" : partial ? "border-primary/50" : "border-border"}`}>
                    {(allChecked || partial) && <Check className="w-2 h-2 text-white" />}
                  </div>
                  <ChevronRight className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${expanded ? "rotate-90" : ""}`} />
                </div>
              </div>
              {expanded && (
                <div className="divide-y divide-border/50" style={{ background: "oklch(98.5% 0.003 264)" }}>
                  {group.items.map((item) => (
                    <div key={item.key} className="flex items-center justify-between px-3 py-1.5 hover:bg-accent/20 transition-colors">
                      <label htmlFor={item.key} className="text-xs text-foreground cursor-pointer flex-1 pr-3">{item.label}</label>
                      <Switch id={item.key} checked={!!local[item.key]} onCheckedChange={() => toggle(item.key)} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {/* Seção de Escopo de Visibilidade */}
      <div className="mt-2 border border-border rounded-lg overflow-hidden">
        <div className="px-3 py-2 bg-accent/10 border-b border-border">
          <p className="text-xs font-semibold text-foreground">Escopo de Visibilidade</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Defina se os membros verão apenas seus próprios dados ou de todos</p>
        </div>
        <div className="divide-y divide-border/50">
          {[
            { key: 'notificacoesEscopo', label: 'Notificações', desc: 'Notificações visíveis' },
            { key: 'agendaEscopo', label: 'Agenda', desc: 'Agendamentos na agenda' },
            { key: 'calendarioEscopo', label: 'Calendário', desc: 'Agendamentos no calendário' },
          ].map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between px-3 py-2">
              <div className="flex-1 min-w-0 pr-3">
                <p className="text-xs font-medium text-foreground">{label}</p>
                <p className="text-[10px] text-muted-foreground">{desc}</p>
              </div>
              <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
                <button
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                    escopos[key] === 'proprio'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  onClick={() => setEscopos(prev => ({ ...prev, [key]: 'proprio' }))}
                >
                  Próprio
                </button>
                <button
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                    escopos[key] === 'todos'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  onClick={() => setEscopos(prev => ({ ...prev, [key]: 'todos' }))}
                >
                  Todos
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="flex gap-2 pt-3 border-t border-border mt-3">
        <Button variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
        <Button className="flex-1" onClick={() => updateMutation.mutate({ grupoId, permissoes: { ...local, ...escopos } as any })} disabled={updateMutation.isPending}>
          {updateMutation.isPending ? "Salvando..." : "Salvar permissões"}
        </Button>
      </div>
    </div>
  );
}

// ─── Aba de Grupos de Permissões ──────────────────────────────────────────────────────────
function AbaGrupos() {
  const utils = trpc.useUtils();
  const { data: grupos = [], isLoading } = trpc.grupos.list.useQuery();
  const [modalCriar, setModalCriar] = useState(false);
  const [formGrupo, setFormGrupo] = useState({ nome: "", descricao: "", cor: "#6366f1" });
  const [permissoesModal, setPermissoesModal] = useState<{ open: boolean; grupoId: number; nome: string; permissoes: Record<string, boolean> } | null>(null);

  const createMutation = trpc.grupos.create.useMutation({
    onSuccess: () => { toast.success("Grupo criado!"); utils.grupos.list.invalidate(); setModalCriar(false); setFormGrupo({ nome: "", descricao: "", cor: "#6366f1" }); },
    onError: (err) => toast.error(err.message),
  });
  const deleteMutation = trpc.grupos.delete.useMutation({
    onSuccess: () => { toast.success("Grupo excluído!"); utils.grupos.list.invalidate(); },
    onError: (err) => toast.error(err.message),
  });

  const membrosCount = (grupo: any) => {
    return grupo.totalMembros ?? 0;
  };

  if (isLoading) {
    return <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Defina os níveis de acesso da sua equipe</p>
        <Button size="sm" onClick={() => setModalCriar(true)} className="gap-1.5">
          <Plus className="w-4 h-4" /> Novo grupo
        </Button>
      </div>

      {grupos.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border border-dashed rounded-xl">
          <Shield className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Nenhum grupo criado</p>
          <p className="text-sm mt-1">Crie grupos para definir o que cada usuário pode acessar</p>
          <Button variant="outline" className="mt-4" onClick={() => setModalCriar(true)}>
            <Plus className="w-4 h-4 mr-2" /> Criar primeiro grupo
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {grupos.map((grupo: any) => (
            <div key={grupo.id} className={`border rounded-xl p-4 ${grupo.isAdmin ? 'border-amber-500/40 bg-amber-500/5' : 'border-border'}`}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm" style={{ background: `${grupo.cor ?? "#6366f1"}25`, color: grupo.cor ?? "#6366f1" }}>
                  {(grupo.nome ?? 'G').charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-sm">{grupo.nome}</h3>
                    {grupo.isAdmin && (
                      <span className="text-xs px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 border border-amber-500/30 font-medium flex items-center gap-1">
                        <Lock className="w-2.5 h-2.5" /> Protegido
                      </span>
                    )}
                  </div>
                  {grupo.descricao && <p className="text-xs text-muted-foreground truncate">{grupo.descricao}</p>}
                </div>
                {!grupo.isAdmin && (
                  <div className="flex gap-1">
                    <button
                      className="p-1.5 rounded-lg hover:bg-accent transition-colors text-muted-foreground"
                      onClick={() => setPermissoesModal({ open: true, grupoId: grupo.id, nome: grupo.nome, permissoes: grupo.permissoes ?? {} })}
                      title="Editar permissões"
                    >
                      <Settings2 className="w-4 h-4" />
                    </button>
                    <button
                      className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
                      onClick={() => { if (confirm("Excluir este grupo? Os membros perderão o grupo vinculado.")) deleteMutation.mutate({ id: grupo.id }); }}
                      title="Excluir grupo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {grupo.isAdmin ? (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-600">Acesso total ao sistema</span>
                ) : (
                  <>
                    {PERMISSION_GROUPS.filter(g => g.items.some(i => grupo.permissoes?.[i.key])).map(g => (
                      <span key={g.key} className="text-xs px-2 py-0.5 rounded-full border border-border text-muted-foreground">{g.label}</span>
                    ))}
                    {!PERMISSION_GROUPS.some(g => g.items.some(i => grupo.permissoes?.[i.key])) && (
                      <span className="text-xs text-muted-foreground italic">Sem permissões definidas</span>
                    )}
                  </>
                )}
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-border">
                <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  {membrosCount(grupo)} {membrosCount(grupo) === 1 ? "membro" : "membros"}
                </span>
                {grupo.isAdmin ? (
                  <span className="text-xs text-amber-600/80 italic flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Permissões imutáveis
                  </span>
                ) : (
                  <Button variant="outline" size="sm" className="text-xs h-7 gap-1"
                    onClick={() => setPermissoesModal({ open: true, grupoId: grupo.id, nome: grupo.nome, permissoes: grupo.permissoes ?? {} })}>
                    <Pencil className="w-3 h-3" /> Editar permissões
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Criar Grupo */}
      <Dialog open={modalCriar} onOpenChange={setModalCriar}>
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
            <div className="rounded-lg p-3 text-xs" style={{ background: "oklch(96% 0.01 264)", color: "oklch(40% 0.08 264)" }}>
              Após criar o grupo, clique em "Editar permissões" para definir o que cada grupo pode acessar.
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setModalCriar(false)}>Cancelar</Button>
              <Button className="flex-1" disabled={!formGrupo.nome || createMutation.isPending}
                onClick={() => createMutation.mutate(formGrupo)}>
                {createMutation.isPending ? "Criando..." : "Criar grupo"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Permissões */}
      {permissoesModal && (
        <Dialog open={permissoesModal.open} onOpenChange={(o) => !o && setPermissoesModal(null)}>
          <DialogContent className="max-w-2xl p-0" showCloseButton={false} style={{ maxHeight: "min(92vh, 720px)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div className="px-5 pt-4 pb-3 border-b border-border flex-shrink-0">
              <DialogTitle className="text-base font-semibold">Permissões: {permissoesModal.nome}</DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Defina o que os membros deste grupo podem acessar</p>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-3">
              <PermissoesEditor
                grupoId={permissoesModal.grupoId}
                permissoesIniciais={permissoesModal.permissoes}
                onClose={() => setPermissoesModal(null)}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// ─── Aba de Serviços ──────────────────────────────────────────────────────────────────
function AbaServicos({ membroId,
  isProfissional,
}: {
  membroId: number;
  isProfissional: boolean;
}) {
  const { data: todosServicos = [], isLoading: loadingServicos } =
    trpc.servicos.list.useQuery();

  const { data: servicosVinculados = [], isLoading: loadingVinculados, refetch } =
    trpc.profissionalServicos.getByProfissional.useQuery({ profissionalId: membroId });

  const setServicos = trpc.profissionalServicos.set.useMutation({
    onSuccess: () => {
      toast.success("Serviços atualizados!");
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const vinculadosIds = useMemo(
    () => new Set(servicosVinculados.map((s) => s.servicoId)),
    [servicosVinculados]
  );

  const [selecionados, setSelecionados] = useState<Set<number>>(new Set());

  // Sincroniza selecionados quando os dados chegam
  useEffect(() => {
    setSelecionados(new Set<number>(servicosVinculados.map((s) => s.servicoId)));
  }, [servicosVinculados]);

  const handleToggle = (servicoId: number) => {
    setSelecionados((prev) => {
      const next = new Set(prev);
      if (next.has(servicoId)) {
        next.delete(servicoId);
      } else {
        next.add(servicoId);
      }
      return next;
    });
  };

  const handleSalvar = () => {
    setServicos.mutate({
      profissionalId: membroId,
      servicoIds: Array.from(selecionados.values()),
    });
  };

  const houveMudanca = useMemo(() => {
    if (selecionados.size !== vinculadosIds.size) return true;
    const arr = Array.from(selecionados.values());
    return arr.some((id) => !vinculadosIds.has(id));
  }, [selecionados, vinculadosIds]);

  const servicosAtivos = (todosServicos as Servico[]).filter((s) => s.ativo);

  // Agrupar por categoria
  const porCategoria = useMemo(() => {
    const mapa = new Map<string, Servico[]>();
    for (const s of servicosAtivos) {
      const cat = s.categoria ?? "Sem categoria";
      if (!mapa.has(cat)) mapa.set(cat, []);
      mapa.get(cat)!.push(s);
    }
    return mapa;
  }, [servicosAtivos]);

  if (!isProfissional) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        <Briefcase className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p className="text-sm font-medium">Membro não é profissional</p>
        <p className="text-xs mt-1">Ative "Aparece na agenda" para vincular serviços</p>
      </div>
    );
  }

  if (loadingServicos || loadingVinculados) {
    return (
      <div className="space-y-2 py-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-12 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (servicosAtivos.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        <Sparkles className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p className="text-sm font-medium">Nenhum serviço cadastrado</p>
        <p className="text-xs mt-1">Cadastre serviços em Gestão → Serviços</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Resumo */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{selecionados.size}</span> de{" "}
          {servicosAtivos.length} serviços selecionados
        </p>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-7"
            onClick={() => setSelecionados(new Set(servicosAtivos.map((s) => s.id)))}
          >
            Todos
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-7"
            onClick={() => setSelecionados(new Set())}
          >
            Nenhum
          </Button>
        </div>
      </div>

      {/* Lista agrupada por categoria */}
      <div className="space-y-4 max-h-64 overflow-y-auto pr-1">
        {Array.from(porCategoria.entries()).map(([categoria, lista]) => (
          <div key={categoria}>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              {categoria}
            </p>
            <div className="space-y-1">
              {lista.map((servico) => {
                const checked = selecionados.has(servico.id);
                return (
                  <label
                    key={servico.id}
                    className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                      checked
                        ? "border-primary/40 bg-primary/5"
                        : "border-transparent hover:bg-muted/50"
                    }`}
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => handleToggle(servico.id)}
                      className="shrink-0"
                    />
                    {/* Cor do serviço */}
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: servico.cor ?? "#7c3aed" }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-tight">{servico.nome}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {servico.duracaoMinutos && (
                          <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                            <Clock className="w-3 h-3" />
                            {formatDuracao(servico.duracaoMinutos)}
                          </span>
                        )}
                        <span className="text-xs font-medium text-primary">
                          {formatValor(servico.valor)}
                        </span>
                      </div>
                    </div>
                    {checked && (
                      <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                    )}
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Botão salvar */}
      <Button
        className="w-full"
        onClick={handleSalvar}
        disabled={!houveMudanca || setServicos.isPending}
      >
        {setServicos.isPending ? "Salvando..." : "Salvar serviços"}
      </Button>
    </div>
  );
}

// ─── Aba de Tipos de Profissional ───────────────────────────────────────────────
function AbaTipos({
  tiposIds,
  setTiposIds,
  todosTipos,
}: {
  tiposIds: number[];
  setTiposIds: (ids: number[]) => void;
  todosTipos: { id: number; nome: string; cor: string | null }[];
}) {
  const toggleTipo = (id: number) => {
    if (tiposIds.includes(id)) {
      setTiposIds(tiposIds.filter((t) => t !== id));
    } else {
      setTiposIds([...tiposIds, id]);
    }
  };

  if (todosTipos.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        <Tag className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p className="text-sm font-medium">Nenhum tipo cadastrado</p>
        <p className="text-xs mt-1">Cadastre tipos em Gestão → Serviços → Tipos de Profissional</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Selecione os tipos de profissional que este membro realiza. Usado para agrupar serviços.
      </p>
      <div className="space-y-2">
        {todosTipos.map((tipo) => {
          const selecionado = tiposIds.includes(tipo.id);
          return (
            <div
              key={tipo.id}
              role="button"
              tabIndex={0}
              onClick={() => toggleTipo(tipo.id)}
              onKeyDown={(e) => e.key === " " && toggleTipo(tipo.id)}
              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors select-none ${
                selecionado ? "border-primary/40 bg-primary/5" : "border-border hover:bg-muted/50"
              }`}
            >
              <div
                className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                  selecionado ? "bg-primary border-primary" : "border-muted-foreground/40"
                }`}
              >
                {selecionado && (
                  <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 10" fill="none">
                    <path d="M1.5 5l2.5 2.5 4.5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
              <span
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: tipo.cor ?? "#7c3aed" }}
              />
              <span className="text-sm font-medium flex-1">{tipo.nome}</span>
              {selecionado && (
                <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
              )}
            </div>
          );
        })}
      </div>
      {tiposIds.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {tiposIds.map((id) => {
            const tipo = todosTipos.find((t) => t.id === id);
            if (!tipo) return null;
            return (
              <span
                key={id}
                className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full text-white"
                style={{ backgroundColor: tipo.cor ?? "#7c3aed" }}
              >
                {tipo.nome}
                <button onClick={() => toggleTipo(id)} className="hover:opacity-70">
                  <X className="w-3 h-3" />
                </button>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
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
  const [abaModal, setAbaModal] = useState("dados");

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [especialidade, setEspecialidade] = useState("");
  const [corCalendario, setCorCalendario] = useState("#7c3aed");
  const [isProfissional, setIsProfissional] = useState(true);
  const [temAcesso, setTemAcesso] = useState(false);
  const [grupoId, setGrupoId] = useState("");
  const [senha, setSenha] = useState("");
  const [ativo, setAtivo] = useState(true);
  const [tiposIds, setTiposIds] = useState<number[]>([]);
  const [percentualComissao, setPercentualComissao] = useState("");
  const formDadosProps = { nome, setNome, email, setEmail, telefone, setTelefone, especialidade, setEspecialidade, corCalendario, setCorCalendario, isProfissional, setIsProfissional, temAcesso, setTemAcesso, grupoId, setGrupoId, senha, setSenha, ativo, setAtivo, isEdit, grupos, percentualComissao, setPercentualComissao };

  // Buscar tipos vinculados ao profissional (apenas na edição)
  const { data: tiposVinculados } = trpc.tiposProfissional.getByProfissional.useQuery(
    { profissionalId: membro?.id ?? 0 },
    { enabled: isEdit && open }
  );
  const { data: todosTipos = [] } = trpc.tiposProfissional.list.useQuery();

  // Reset ao abrir/fechar — agora inicializa TODOS os campos a partir de `membro`
  useEffect(() => {
    if (open) {
      setAbaModal("dados");
      setNome(membro?.nome ?? "");
      setEmail(membro?.email ?? "");
      setTelefone(membro?.telefone ?? "");
      setEspecialidade(membro?.especialidade ?? "");
      setCorCalendario(membro?.corCalendario ?? "#7c3aed");
      setIsProfissional(membro?.isProfissional ?? true);
      setTemAcesso(membro?.temAcesso ?? false);
      setGrupoId(membro?.grupoId?.toString() ?? "");
      setSenha("");
      setAtivo(membro?.ativo ?? true);
      setTiposIds([]);
      setPercentualComissao(membro?.percentualComissao ? String(parseFloat(String(membro.percentualComissao))) : "");
    }
  }, [open, membro]);

  // Sincroniza tipos vinculados quando chegam do servidor
  useEffect(() => {
    if (tiposVinculados) {
      setTiposIds(tiposVinculados.map((t) => t.id));
    }
  }, [tiposVinculados]);

  const setTiposMutation = trpc.tiposProfissional.setProfissional.useMutation();

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

    const payloadBase = {
      nome: nome.trim(),
      email: email || undefined,
      corCalendario,
      isProfissional,
      temAcesso,
      senha: senha || undefined,
    };

    if (isEdit) {
      const payloadAtualizar = {
        ...payloadBase,
        telefone: telefone || null,
        especialidade: especialidade || null,
        grupoId: grupoId && grupoId !== "none" ? parseInt(grupoId) : null,
        percentualComissao: percentualComissao || null,
      };
      atualizar.mutate({ id: membro.id, ...payloadAtualizar, ativo }, {
        onSuccess: () => {
          // Salvar tipos de profissional após atualizar o membro
          if (isProfissional) {
            setTiposMutation.mutate({ profissionalId: membro.id, tipoIds: tiposIds });
          }
        }
      });
    } else {
      const payloadCriar = {
        ...payloadBase,
        telefone: telefone || undefined,
        especialidade: especialidade || undefined,
        grupoId: grupoId && grupoId !== "none" ? parseInt(grupoId) : undefined,
        percentualComissao: percentualComissao || undefined,
      };
      criar.mutate(payloadCriar, {
        onSuccess: (data: any) => {
          // Salvar tipos de profissional após criar o membro
          if (isProfissional && data?.id && tiposIds.length > 0) {
            setTiposMutation.mutate({ profissionalId: data.id, tipoIds: tiposIds });
          }
        }
      });
    }
  };
  const isPending = criar.isPending || atualizar.isPending;
  // Mostrar aba de serviços apenas na edição de profissionais
  const mostrarAbaServicos = isEdit && isProfissional;;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar Membro" : "Novo Membro da Equipe"}</DialogTitle>
        </DialogHeader>

        {mostrarAbaServicos ? (
          <Tabs value={abaModal} onValueChange={setAbaModal} className="flex-1 flex flex-col min-h-0">
            <TabsList className="w-full shrink-0">
              <TabsTrigger value="dados" className="flex-1 gap-1.5">
                <UserCog className="w-3.5 h-3.5" />
                Dados
              </TabsTrigger>
              <TabsTrigger value="tipos" className="flex-1 gap-1.5">
                <Tag className="w-3.5 h-3.5" />
                Tipos
              </TabsTrigger>
              <TabsTrigger value="servicos" className="flex-1 gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Serviços
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto">
              <TabsContent value="dados" className="mt-0 space-y-4 py-2">
                <FormDados {...formDadosProps} />
              </TabsContent>

              <TabsContent value="tipos" className="mt-0 py-2">
                <AbaTipos
                  tiposIds={tiposIds}
                  setTiposIds={setTiposIds}
                  todosTipos={todosTipos as { id: number; nome: string; cor: string | null }[]}
                />
              </TabsContent>

              <TabsContent value="servicos" className="mt-0 py-2">
                <AbaServicos membroId={membro!.id} isProfissional={isProfissional} />
              </TabsContent>
            </div>

            {(abaModal === "dados" || abaModal === "tipos") && (
              <DialogFooter className="shrink-0 pt-2">
                <Button variant="outline" onClick={onClose} disabled={isPending}>Cancelar</Button>
                <Button onClick={handleSubmit} disabled={isPending}>
                  {isPending ? "Salvando..." : "Salvar alterações"}
                </Button>
              </DialogFooter>
            )}
          </Tabs>
        ) : (
          <>
            <div className="overflow-y-auto flex-1">
              <div className="space-y-4 py-2">
                <FormDados {...formDadosProps} />
              </div>
            </div>
            <DialogFooter className="shrink-0 pt-2">
              <Button variant="outline" onClick={onClose} disabled={isPending}>Cancelar</Button>
              <Button onClick={handleSubmit} disabled={isPending}>
                {isPending ? "Salvando..." : isEdit ? "Salvar alterações" : "Adicionar membro"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Formulário de Dados (extraído para reutilização) ─────────────────────────
function FormDados({
  nome, setNome,
  email, setEmail,
  telefone, setTelefone,
  especialidade, setEspecialidade,
  corCalendario, setCorCalendario,
  isProfissional, setIsProfissional,
  temAcesso, setTemAcesso,
  grupoId, setGrupoId,
  senha, setSenha,
  ativo, setAtivo,
  isEdit,
  grupos,
  percentualComissao, setPercentualComissao,
}: {
  nome: string; setNome: (v: string) => void;
  email: string; setEmail: (v: string) => void;
  telefone: string; setTelefone: (v: string) => void;
  especialidade: string; setEspecialidade: (v: string) => void;
  corCalendario: string; setCorCalendario: (v: string) => void;
  isProfissional: boolean; setIsProfissional: (v: boolean) => void;
  temAcesso: boolean; setTemAcesso: (v: boolean) => void;
  grupoId: string; setGrupoId: (v: string) => void;
  senha: string; setSenha: (v: string) => void;
  ativo: boolean; setAtivo: (v: boolean) => void;
  isEdit: boolean;
  grupos: { id: number; nome: string; cor: string | null }[];
  percentualComissao: string; setPercentualComissao: (v: string) => void;
}) {
  return (
    <div className="space-y-4">
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
          <div className="space-y-1">
            <Label>% Comissão padrão</Label>
            <Input
              type="number" min="0" max="100" step="0.5"
              value={percentualComissao}
              onChange={(e) => setPercentualComissao(e.target.value)}
              placeholder="Ex: 40 (sobreposto pelo % do serviço)"
            />
            <p className="text-xs text-muted-foreground">Usado quando o serviço não tem comissão definida. Não pode ser alterado pelo profissional.</p>
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
  const { pode } = usePermissoes();
  const [busca, setBusca] = useState("");
  const [filtroAba, setFiltroAba] = useState<FiltroAba>("todos");
  const [mostrarInativos, setMostrarInativos] = useState(false);
  const [modalAberto, setModalAberto] = useState(false);
  const [membroEditando, setMembroEditando] = useState<MembroEquipe | null>(null);
  const [modalResetSenha, setModalResetSenha] = useState(false);
  const [membroResetSenha, setMembroResetSenha] = useState<MembroEquipe | null>(null);

  const { data: membros = [], refetch } = trpc.equipe.list.useQuery();
  const { data: grupos = [] } = trpc.grupos.list.useQuery();
  const { data: tiposProfissional = [] } = trpc.tiposProfissional.list.useQuery();

  // Onboarding
  const onboarding = useOnboardingEquipe((membros as MembroEquipe[]).length);

  const atualizar = trpc.equipe.atualizar.useMutation({
    onSuccess: () => {
      toast.success("Status atualizado!");
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const membrosFiltrados = useMemo(() => {
    let lista = membros as MembroEquipe[];

    // Por padrão, ocultar inativos (a menos que mostrarInativos esteja ativo)
    if (!mostrarInativos) {
      lista = lista.filter((m) => m.ativo !== false);
    }

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
  }, [membros, filtroAba, busca, mostrarInativos]);

  const totalAtivos = (membros as MembroEquipe[]).filter((m) => m.ativo).length;
  const totalInativos = (membros as MembroEquipe[]).filter((m) => m.ativo === false).length;
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

  const handleAbrirGuia = () => {
    onboarding.abrir();
  };

  // Guarda de permissão: apenas quem tem profissionaisVer pode acessar Equipe
  if (!pode("profissionaisVer")) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center p-8">
        <Users className="w-12 h-12 text-muted-foreground/30" />
        <p className="text-sm font-medium text-muted-foreground">Você não tem permissão para acessar a Equipe.</p>
      </div>
    );
  }

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
        {filtroAba !== "grupos" && (
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={handleAbrirGuia} className="hidden sm:flex gap-1.5 text-xs">
              <Sparkles className="w-3.5 h-3.5" />
              Guia de cadastro
            </Button>
            <Button onClick={handleNovoMembro}>
              <Plus className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Novo membro</span>
              <span className="sm:hidden">Novo</span>
            </Button>
          </div>
        )}
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
        {/* Toggle para mostrar inativos */}
        {totalInativos > 0 && filtroAba !== "grupos" && (
          <button
            onClick={() => setMostrarInativos(!mostrarInativos)}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors shrink-0 ${
              mostrarInativos
                ? "bg-muted text-foreground border-border"
                : "bg-transparent text-muted-foreground border-border hover:bg-muted/50"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-muted-foreground/50 inline-block" />
            {mostrarInativos ? "Ocultar" : "Ver"} inativos ({totalInativos})
          </button>
        )}
        <Tabs value={filtroAba} onValueChange={(v) => { setFiltroAba(v as FiltroAba); setBusca(""); }}>
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
            <TabsTrigger value="grupos" className="gap-1.5">
              <Settings2 className="w-3.5 h-3.5" />
              Grupos
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Aba de Grupos */}
      {filtroAba === "grupos" ? (
        <AbaGrupos />
      ) : (
        /* Lista de Membros */
        membrosFiltrados.length === 0 ? (
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
        )
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

      {/* Wizard de Onboarding */}
      <OnboardingEquipe
        open={onboarding.aberto}
        onClose={onboarding.fechar}
        onConcluido={() => refetch()}
        grupos={grupos as { id: number; nome: string; cor: string | null }[]}
        tiposProfissional={tiposProfissional as { id: number; nome: string; cor: string | null }[]}
      />
    </div>
  );
}
