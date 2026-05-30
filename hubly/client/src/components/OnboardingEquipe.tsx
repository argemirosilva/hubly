/**
 * OnboardingEquipe — Wizard guiado para cadastro do primeiro membro da equipe.
 *
 * Exibido automaticamente quando a equipe está vazia (sem membros).
 * Pode ser acionado manualmente pelo botão "Guia de Cadastro".
 * Persiste o estado de conclusão em localStorage para não reaparecer.
 *
 * Passos:
 *  1. Boas-vindas / Visão geral
 *  2. Dados básicos (nome, telefone, e-mail, especialidade)
 *  3. Configurações de profissional (cor, aparece na agenda, tipos)
 *  4. Acesso ao sistema (grupo, senha)
 *  5. Conclusão
 */

import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
  Users,
  UserCog,
  Shield,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Calendar,
  Tag,
  Lock,
  Palette,
} from "lucide-react";

const STORAGE_KEY = "onboarding-equipe-concluido";

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface OnboardingEquipeProps {
  /** Controle externo: se true o wizard abre independente do localStorage */
  open?: boolean;
  onClose?: () => void;
  onConcluido?: () => void;
  grupos: { id: number; nome: string; cor: string | null }[];
  tiposProfissional: { id: number; nome: string; cor: string | null }[];
}

// ─── Constantes de passos ─────────────────────────────────────────────────────
const PASSOS = [
  { id: 1, titulo: "Bem-vindo",      icone: Sparkles,      descricao: "Veja como funciona" },
  { id: 2, titulo: "Dados básicos",  icone: UserCog,       descricao: "Nome, telefone e e-mail" },
  { id: 3, titulo: "Profissional",   icone: Calendar,      descricao: "Agenda e tipos" },
  { id: 4, titulo: "Acesso",         icone: Shield,        descricao: "Grupo e senha" },
  { id: 5, titulo: "Pronto!",        icone: CheckCircle2,  descricao: "Membro cadastrado" },
];

// ─── Componente de indicador de progresso ────────────────────────────────────
function IndicadorPassos({ passoAtual }: { passoAtual: number }) {
  const total = PASSOS.length;
  const percent = Math.round(((passoAtual - 1) / (total - 1)) * 100);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        {PASSOS.map((p, idx) => {
          const concluido = p.id < passoAtual;
          const ativo = p.id === passoAtual;
          const Icon = p.icone;
          return (
            <div key={p.id} className="flex flex-col items-center gap-1 flex-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all text-xs font-bold
                  ${concluido ? "bg-primary text-primary-foreground" : ativo ? "bg-primary/15 border-2 border-primary text-primary" : "bg-muted text-muted-foreground"}`}
              >
                {concluido ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <Icon className="w-3.5 h-3.5" />
                )}
              </div>
              <span className={`text-[10px] font-medium hidden sm:block ${ativo ? "text-primary" : concluido ? "text-foreground/70" : "text-muted-foreground"}`}>
                {p.titulo}
              </span>
            </div>
          );
        })}
      </div>
      <Progress value={percent} className="h-1.5" />
    </div>
  );
}

// ─── Passo 1: Boas-vindas ─────────────────────────────────────────────────────
function Passo1({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex flex-col items-center text-center gap-5 py-4">
      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
        <Users className="w-8 h-8 text-primary" />
      </div>
      <div>
        <h2 className="text-xl font-bold tracking-tight mb-2">Cadastre sua equipe</h2>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-sm">
          Este guia vai te ajudar a adicionar o primeiro membro da equipe em poucos passos.
          Você poderá configurar dados pessoais, agenda, tipos de profissional e acesso ao sistema.
        </p>
      </div>
      <div className="w-full space-y-2.5 text-left">
        {[
          { icon: UserCog,      label: "Dados básicos",          desc: "Nome, telefone e e-mail" },
          { icon: Calendar,     label: "Configurações de agenda", desc: "Cor, visibilidade e tipos" },
          { icon: Shield,       label: "Acesso ao sistema",       desc: "Grupo de permissões e senha" },
        ].map(({ icon: Icon, label, desc }) => (
          <div key={label} className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Icon className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold">{label}</p>
              <p className="text-xs text-muted-foreground">{desc}</p>
            </div>
          </div>
        ))}
      </div>
      <Button className="w-full" onClick={onNext}>
        Começar <ChevronRight className="w-4 h-4 ml-1" />
      </Button>
    </div>
  );
}

// ─── Passo 2: Dados básicos ───────────────────────────────────────────────────
function Passo2({
  nome, setNome,
  telefone, setTelefone,
  email, setEmail,
  especialidade, setEspecialidade,
  onNext, onBack,
}: {
  nome: string; setNome: (v: string) => void;
  telefone: string; setTelefone: (v: string) => void;
  email: string; setEmail: (v: string) => void;
  especialidade: string; setEspecialidade: (v: string) => void;
  onNext: () => void; onBack: () => void;
}) {
  const handleNext = () => {
    if (!nome.trim()) { toast.error("Nome é obrigatório"); return; }
    onNext();
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-bold mb-0.5">Dados básicos</h2>
        <p className="text-xs text-muted-foreground">Informações de identificação do membro</p>
      </div>

      <div className="space-y-3">
        <div>
          <Label className="text-xs text-muted-foreground mb-1.5 block">Nome completo *</Label>
          <Input placeholder="Ex: Ana Paula Silva" value={nome} onChange={e => setNome(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-1.5 block">Telefone / WhatsApp</Label>
          <Input placeholder="(11) 99999-9999" value={telefone} onChange={e => setTelefone(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-1.5 block">E-mail</Label>
          <Input type="email" placeholder="ana@exemplo.com" value={email} onChange={e => setEmail(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-1.5 block">Especialidade / Cargo</Label>
          <Input placeholder="Ex: Cabeleireira, Recepcionista..." value={especialidade} onChange={e => setEspecialidade(e.target.value)} />
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <Button variant="outline" className="flex-1" onClick={onBack}>
          <ChevronLeft className="w-4 h-4 mr-1" /> Voltar
        </Button>
        <Button className="flex-1" onClick={handleNext}>
          Próximo <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}

// ─── Passo 3: Configurações de profissional ───────────────────────────────────
function Passo3({
  isProfissional, setIsProfissional,
  corCalendario, setCorCalendario,
  tiposIds, setTiposIds,
  tiposProfissional,
  onNext, onBack,
}: {
  isProfissional: boolean; setIsProfissional: (v: boolean) => void;
  corCalendario: string; setCorCalendario: (v: string) => void;
  tiposIds: number[]; setTiposIds: (v: number[]) => void;
  tiposProfissional: { id: number; nome: string; cor: string | null }[];
  onNext: () => void; onBack: () => void;
}) {
  const toggleTipo = (id: number) => {
    if (tiposIds.includes(id)) {
      setTiposIds(tiposIds.filter(t => t !== id));
    } else {
      setTiposIds([...tiposIds, id]);
    }
  };

  const CORES = [
    "#7c3aed", "#2563eb", "#059669", "#d97706",
    "#dc2626", "#db2777", "#0891b2", "#65a30d",
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-bold mb-0.5">Configurações de profissional</h2>
        <p className="text-xs text-muted-foreground">Defina como este membro aparece na agenda</p>
      </div>

      {/* Aparece na agenda */}
      <div className="flex items-center justify-between p-3 rounded-xl border bg-card">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Calendar className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold">Aparece na agenda</p>
            <p className="text-xs text-muted-foreground">Pode receber agendamentos</p>
          </div>
        </div>
        <Switch checked={isProfissional} onCheckedChange={setIsProfissional} />
      </div>

      {isProfissional && (
        <>
          {/* Cor do calendário */}
          <div>
            <Label className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5 block">
              <Palette className="w-3.5 h-3.5" /> Cor na agenda
            </Label>
            <div className="flex flex-wrap gap-2">
              {CORES.map(cor => (
                <button
                  key={cor}
                  type="button"
                  onClick={() => setCorCalendario(cor)}
                  className={`w-8 h-8 rounded-full transition-transform ${corCalendario === cor ? "scale-125 ring-2 ring-offset-2 ring-primary" : "hover:scale-110"}`}
                  style={{ backgroundColor: cor }}
                />
              ))}
              <div className="flex items-center gap-1.5 ml-1">
                <input
                  type="color"
                  value={corCalendario}
                  onChange={e => setCorCalendario(e.target.value)}
                  className="w-8 h-8 rounded-full cursor-pointer border-0 p-0 bg-transparent"
                  title="Cor personalizada"
                />
                <span className="text-xs text-muted-foreground">Personalizada</span>
              </div>
            </div>
          </div>

          {/* Tipos de profissional */}
          {tiposProfissional.length > 0 && (
            <div>
              <Label className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5 block">
                <Tag className="w-3.5 h-3.5" /> Tipos de profissional
              </Label>
              <div className="space-y-1.5">
                {tiposProfissional.map(tipo => {
                  const sel = tiposIds.includes(tipo.id);
                  return (
                    <div
                      key={tipo.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => toggleTipo(tipo.id)}
                      onKeyDown={e => e.key === " " && toggleTipo(tipo.id)}
                      className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors select-none ${sel ? "border-primary/40 bg-primary/5" : "border-border hover:bg-muted/50"}`}
                    >
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${sel ? "bg-primary border-primary" : "border-muted-foreground/40"}`}>
                        {sel && (
                          <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 10" fill="none">
                            <path d="M1.5 5l2.5 2.5 4.5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: tipo.cor ?? "#7c3aed" }} />
                      <span className="text-sm font-medium flex-1">{tipo.nome}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      <div className="flex gap-2 pt-2">
        <Button variant="outline" className="flex-1" onClick={onBack}>
          <ChevronLeft className="w-4 h-4 mr-1" /> Voltar
        </Button>
        <Button className="flex-1" onClick={onNext}>
          Próximo <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}

// ─── Passo 4: Acesso ao sistema ───────────────────────────────────────────────
function Passo4({
  temAcesso, setTemAcesso,
  grupoId, setGrupoId,
  senha, setSenha,
  grupos,
  onSalvar, onBack,
  isPending,
}: {
  temAcesso: boolean; setTemAcesso: (v: boolean) => void;
  grupoId: string; setGrupoId: (v: string) => void;
  senha: string; setSenha: (v: string) => void;
  grupos: { id: number; nome: string; cor: string | null }[];
  onSalvar: () => void; onBack: () => void;
  isPending: boolean;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-bold mb-0.5">Acesso ao sistema</h2>
        <p className="text-xs text-muted-foreground">Configure o login e as permissões deste membro</p>
      </div>

      {/* Acesso ao sistema */}
      <div className="flex items-center justify-between p-3 rounded-xl border bg-card">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Lock className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold">Acesso ao sistema</p>
            <p className="text-xs text-muted-foreground">Pode fazer login no painel</p>
          </div>
        </div>
        <Switch checked={temAcesso} onCheckedChange={setTemAcesso} />
      </div>

      {temAcesso && (
        <div className="space-y-3">
          {/* Grupo de permissões */}
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Grupo de permissões</Label>
            {grupos.length === 0 ? (
              <p className="text-xs text-muted-foreground italic p-2 rounded-lg bg-muted">
                Nenhum grupo criado. Você pode criar grupos na aba "Grupos" da tela de Equipe.
              </p>
            ) : (
              <Select value={grupoId} onValueChange={setGrupoId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um grupo (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem grupo</SelectItem>
                  {grupos.map(g => (
                    <SelectItem key={g.id} value={String(g.id)}>{g.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Senha */}
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Senha de acesso *</Label>
            <Input
              type="password"
              placeholder="Mínimo 6 caracteres"
              value={senha}
              onChange={e => setSenha(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1">
              O membro usará o e-mail e esta senha para fazer login.
            </p>
          </div>
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <Button variant="outline" className="flex-1" onClick={onBack}>
          <ChevronLeft className="w-4 h-4 mr-1" /> Voltar
        </Button>
        <Button className="flex-1" onClick={onSalvar} disabled={isPending}>
          {isPending ? "Salvando..." : "Salvar membro"}
          {!isPending && <ChevronRight className="w-4 h-4 ml-1" />}
        </Button>
      </div>
    </div>
  );
}

// ─── Passo 5: Conclusão ───────────────────────────────────────────────────────
function Passo5({ nome, onClose, onAdicionarOutro }: { nome: string; onClose: () => void; onAdicionarOutro: () => void }) {
  return (
    <div className="flex flex-col items-center text-center gap-5 py-4">
      <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
        <CheckCircle2 className="w-8 h-8 text-green-600" />
      </div>
      <div>
        <h2 className="text-xl font-bold tracking-tight mb-2">
          {nome ? `${nome.split(" ")[0]} foi adicionado!` : "Membro adicionado!"}
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-sm">
          O membro foi cadastrado com sucesso. Agora você pode vincular serviços, editar permissões ou adicionar mais membros à equipe.
        </p>
      </div>
      <div className="w-full space-y-2">
        <Button className="w-full" onClick={onAdicionarOutro}>
          <Users className="w-4 h-4 mr-2" /> Adicionar outro membro
        </Button>
        <Button variant="outline" className="w-full" onClick={onClose}>
          Concluir e fechar
        </Button>
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function OnboardingEquipe({
  open,
  onClose,
  onConcluido,
  grupos,
  tiposProfissional,
}: OnboardingEquipeProps) {
  const [passo, setPasso] = useState(1);

  // Campos do formulário
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [especialidade, setEspecialidade] = useState("");
  const [isProfissional, setIsProfissional] = useState(true);
  const [corCalendario, setCorCalendario] = useState("#7c3aed");
  const [tiposIds, setTiposIds] = useState<number[]>([]);
  const [temAcesso, setTemAcesso] = useState(false);
  const [grupoId, setGrupoId] = useState("");
  const [senha, setSenha] = useState("");
  const [nomeSalvo, setNomeSalvo] = useState("");

  const utils = trpc.useUtils();
  const setTiposMutation = trpc.tiposProfissional.setProfissional.useMutation();

  const criar = trpc.equipe.criar.useMutation({
    onSuccess: (data: any) => {
      setNomeSalvo(nome);
      if (isProfissional && data?.id && tiposIds.length > 0) {
        setTiposMutation.mutate({ profissionalId: data.id, tipoIds: tiposIds });
      }
      utils.equipe.list.invalidate();
      onConcluido?.();
      setPasso(5);
    },
    onError: (err) => toast.error(err.message),
  });

  // Resetar ao abrir
  useEffect(() => {
    if (open) {
      setPasso(1);
      setNome("");
      setEmail("");
      setTelefone("");
      setEspecialidade("");
      setIsProfissional(true);
      setCorCalendario("#7c3aed");
      setTiposIds([]);
      setTemAcesso(false);
      setGrupoId("");
      setSenha("");
      setNomeSalvo("");
    }
  }, [open]);

  const handleSalvar = () => {
    if (!nome.trim()) { toast.error("Nome é obrigatório"); return; }
    if (temAcesso && !email) { toast.error("E-mail obrigatório para acesso ao sistema"); return; }
    if (temAcesso && !senha) { toast.error("Senha obrigatória para acesso ao sistema"); return; }

    criar.mutate({
      nome: nome.trim(),
      email: email || undefined,
      telefone: telefone || undefined,
      especialidade: especialidade || undefined,
      corCalendario,
      isProfissional,
      temAcesso,
      grupoId: grupoId && grupoId !== "none" ? parseInt(grupoId) : undefined,
      senha: senha || undefined,
    });
  };

  const handleAdicionarOutro = () => {
    setPasso(1);
    setNome("");
    setEmail("");
    setTelefone("");
    setEspecialidade("");
    setIsProfissional(true);
    setCorCalendario("#7c3aed");
    setTiposIds([]);
    setTemAcesso(false);
    setGrupoId("");
    setSenha("");
  };

  const handleClose = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    onClose?.();
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && handleClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            Guia de Cadastro da Equipe
          </DialogTitle>
        </DialogHeader>

        {/* Indicador de progresso (oculto no passo 5) */}
        {passo < 5 && (
          <div className="px-1">
            <IndicadorPassos passoAtual={passo} />
          </div>
        )}

        {/* Conteúdo do passo */}
        <div className="pt-2">
          {passo === 1 && <Passo1 onNext={() => setPasso(2)} />}
          {passo === 2 && (
            <Passo2
              nome={nome} setNome={setNome}
              telefone={telefone} setTelefone={setTelefone}
              email={email} setEmail={setEmail}
              especialidade={especialidade} setEspecialidade={setEspecialidade}
              onNext={() => setPasso(3)}
              onBack={() => setPasso(1)}
            />
          )}
          {passo === 3 && (
            <Passo3
              isProfissional={isProfissional} setIsProfissional={setIsProfissional}
              corCalendario={corCalendario} setCorCalendario={setCorCalendario}
              tiposIds={tiposIds} setTiposIds={setTiposIds}
              tiposProfissional={tiposProfissional}
              onNext={() => setPasso(4)}
              onBack={() => setPasso(2)}
            />
          )}
          {passo === 4 && (
            <Passo4
              temAcesso={temAcesso} setTemAcesso={setTemAcesso}
              grupoId={grupoId} setGrupoId={setGrupoId}
              senha={senha} setSenha={setSenha}
              grupos={grupos}
              onSalvar={handleSalvar}
              onBack={() => setPasso(3)}
              isPending={criar.isPending}
            />
          )}
          {passo === 5 && (
            <Passo5
              nome={nomeSalvo}
              onClose={handleClose}
              onAdicionarOutro={handleAdicionarOutro}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Hook de controle de exibição automática ──────────────────────────────────
export function useOnboardingEquipe(membrosCount: number) {
  const [aberto, setAberto] = useState(false);

  useEffect(() => {
    const concluido = localStorage.getItem(STORAGE_KEY);
    if (!concluido && membrosCount === 0) {
      // Pequeno delay para não abrir imediatamente
      const timer = setTimeout(() => setAberto(true), 800);
      return () => clearTimeout(timer);
    }
  }, [membrosCount]);

  return {
    aberto,
    abrir: () => setAberto(true),
    fechar: () => { localStorage.setItem(STORAGE_KEY, "1"); setAberto(false); },
  };
}
