import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Building2, Users, TrendingUp, MessageSquare, AlertCircle,
  Search, RefreshCw, Wifi, WifiOff,
  Clock, CheckCircle2, XCircle, BookOpen, Plus, Edit, Trash2,
  BarChart3, DollarSign, Headphones, Settings2, Package, LogOut, Eye, EyeOff
} from "lucide-react";

// ─── Controle de acesso independente ─────────────────────────────────────────
const ORIZON_USER = "contato@orizontech.com.br";
const ORIZON_PASS = "Remoto!123";
const ORIZON_SESSION_KEY = "orizon_auth";

function LoginOrizontech({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setCarregando(true);
    setTimeout(() => {
      if (email.trim().toLowerCase() === ORIZON_USER && senha === ORIZON_PASS) {
        sessionStorage.setItem(ORIZON_SESSION_KEY, "1");
        onLogin();
      } else {
        setErro("E-mail ou senha incorretos.");
      }
      setCarregando(false);
    }, 400);
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center mb-4 shadow-sm">
            <img
              src="https://d2xsxph8kpxj0f.cloudfront.net/310419663029250418/BkCt9rpSQdtCMrvdCmsRG4/orizon-tech-icone_1f25ec5e.png"
              alt="Orizontech"
              className="w-10 h-10 object-contain"
            />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Painel Orizontech</h1>
          <p className="text-sm text-gray-500 mt-1">Acesso restrito à equipe interna</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="orizon-email" className="text-sm font-medium text-gray-700">E-mail</Label>
              <Input
                id="orizon-email"
                type="email"
                autoComplete="username"
                placeholder="contato@orizontech.com.br"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="mt-1"
                required
              />
            </div>
            <div>
              <Label htmlFor="orizon-senha" className="text-sm font-medium text-gray-700">Senha</Label>
              <div className="relative mt-1">
                <Input
                  id="orizon-senha"
                  type={mostrarSenha ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={senha}
                  onChange={e => setSenha(e.target.value)}
                  className="pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenha(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {mostrarSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            {erro && (
              <p className="text-sm text-red-600 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {erro}
              </p>
            )}
            <Button type="submit" className="w-full bg-orange-500 hover:bg-orange-600 text-white" disabled={carregando}>
              {carregando ? "Verificando..." : "Entrar"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

// ─── Cores de status ──────────────────────────────────────────────────────────
function badgeStatus(status: string) {
  const map: Record<string, string> = {
    ativa: "bg-green-100 text-green-800",
    trial: "bg-blue-100 text-blue-800",
    inadimplente: "bg-red-100 text-red-800",
    cancelada: "bg-gray-100 text-gray-600",
    suspensa: "bg-orange-100 text-orange-800",
    aberto: "bg-yellow-100 text-yellow-800",
    em_atendimento: "bg-blue-100 text-blue-800",
    aguardando_cliente: "bg-purple-100 text-purple-800",
    resolvido: "bg-green-100 text-green-800",
    fechado: "bg-gray-100 text-gray-600",
  };
  return map[status] ?? "bg-gray-100 text-gray-600";
}

function badgePrioridade(p: string) {
  const map: Record<string, string> = {
    critica: "bg-red-600 text-white",
    alta: "bg-orange-500 text-white",
    media: "bg-yellow-500 text-white",
    baixa: "bg-gray-200 text-gray-700",
  };
  return map[p] ?? "bg-gray-200 text-gray-700";
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function PainelOrizontech() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [aba, setAba] = useState("dashboard");
  const [autenticado, setAutenticado] = useState(() => sessionStorage.getItem(ORIZON_SESSION_KEY) === "1");

  useEffect(() => {
    const check = () => setAutenticado(sessionStorage.getItem(ORIZON_SESSION_KEY) === "1");
    window.addEventListener("storage", check);
    return () => window.removeEventListener("storage", check);
  }, []);

  if (!autenticado) {
    return <LoginOrizontech onLogin={() => setAutenticado(true)} />;
  }

  if (!user) return <div className="flex items-center justify-center h-screen text-muted-foreground">Carregando...</div>;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center overflow-hidden">
            <img
              src="https://d2xsxph8kpxj0f.cloudfront.net/310419663029250418/BkCt9rpSQdtCMrvdCmsRG4/orizon-tech-icone_1f25ec5e.png"
              alt="Orizontech"
              className="w-7 h-7 object-contain"
            />
          </div>
          <div>
            <h1 className="font-bold text-gray-900 text-lg leading-none">Painel Orizontech</h1>
            <p className="text-xs text-gray-500 mt-0.5">Gestão interna do sistema Hubly</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="text-gray-500 hover:text-gray-900" onClick={() => navigate("/admin")}>
            Voltar ao app
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-gray-400 hover:text-red-600"
            title="Sair do painel"
            onClick={() => { sessionStorage.removeItem(ORIZON_SESSION_KEY); setAutenticado(false); }}
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Nav */}
      <div className="border-b border-gray-200 bg-white px-6">
        <nav className="flex gap-1">
          {[
            { id: "dashboard", label: "Dashboard", icon: BarChart3 },
            { id: "empresas", label: "Empresas", icon: Building2 },
            { id: "planos", label: "Planos", icon: Package },
            { id: "chamados", label: "Chamados", icon: Headphones },
            { id: "conhecimento", label: "Base de Conhecimento", icon: BookOpen },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setAba(id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                aba === id
                  ? "border-orange-500 text-orange-600"
                  : "border-transparent text-gray-500 hover:text-gray-800"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="p-6">
        {aba === "dashboard" && <TabDashboard />}
        {aba === "empresas" && <TabEmpresas />}
        {aba === "planos" && <TabPlanos />}
        {aba === "chamados" && <TabChamados />}
        {aba === "conhecimento" && <TabConhecimento />}
      </div>
    </div>
  );
}

// ─── Tab Dashboard ────────────────────────────────────────────────────────────
function TabDashboard() {
  const { data: metricas, isLoading } = trpc.orizontech.getMetricas.useQuery();

  if (isLoading) return <div className="text-gray-500 text-sm">Carregando métricas...</div>;
  if (!metricas) return <div className="text-red-400 text-sm">Erro ao carregar métricas. Verifique as permissões.</div>;

  const cards = [
    { label: "Total de empresas", value: metricas.totalEmpresas, icon: Building2, color: "text-orange-500" },
    { label: "Assinaturas ativas", value: metricas.ativas, icon: CheckCircle2, color: "text-green-500" },
    { label: "Em trial", value: metricas.trial, icon: Clock, color: "text-blue-500" },
    { label: "Inadimplentes", value: metricas.inadimplentes, icon: AlertCircle, color: "text-red-500" },
    { label: "MRR estimado", value: `R$ ${metricas.mrr.toLocaleString("pt-BR")}`, icon: DollarSign, color: "text-emerald-500" },
    { label: "Chamados abertos", value: metricas.chamadosAbertos, icon: MessageSquare, color: "text-yellow-500" },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-900">Visão geral</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {cards.map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="bg-white border-gray-200">
            <CardContent className="p-4">
              <Icon className={`w-5 h-5 mb-2 ${color}`} />
              <div className="text-2xl font-bold text-gray-900">{value}</div>
              <div className="text-xs text-gray-500 mt-1">{label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-white border-gray-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-600">Distribuição de status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              { label: "Ativas", value: metricas.ativas, color: "bg-green-500" },
              { label: "Trial", value: metricas.trial, color: "bg-blue-500" },
              { label: "Inadimplentes", value: metricas.inadimplentes, color: "bg-red-500" },
              { label: "Canceladas", value: metricas.canceladas, color: "bg-gray-500" },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${color}`} />
                <span className="text-sm text-gray-600 flex-1">{label}</span>
                <span className="text-sm font-medium text-gray-900">{value}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="bg-white border-gray-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-600">Receita mensal recorrente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-500">
              R$ {metricas.mrr.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-gray-400 mt-1">Baseado em assinaturas ativas</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Tab Empresas ─────────────────────────────────────────────────────────────
function TabEmpresas() {
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState<"todas" | "trial" | "ativa" | "inadimplente" | "cancelada" | "suspensa">("todas");
  const [empresaSelecionada, setEmpresaSelecionada] = useState<number | null>(null);
  const [modalAssinatura, setModalAssinatura] = useState(false);
  const [modalWhatsapp, setModalWhatsapp] = useState(false);
  const [modalExcluir, setModalExcluir] = useState<{ id: number; nome: string } | null>(null);

  const { data, isLoading, refetch } = trpc.orizontech.listarEmpresas.useQuery({ busca, status });
  const { data: planos } = trpc.orizontech.listarPlanos.useQuery();

  const utils = trpc.useUtils();
  const atualizarAssinatura = trpc.orizontech.atualizarAssinatura.useMutation({
    onSuccess: () => { toast("Assinatura atualizada!"); setModalAssinatura(false); utils.orizontech.listarEmpresas.invalidate(); },
  });
  const atualizarWhatsapp = trpc.orizontech.atualizarApiWhatsapp.useMutation({
    onSuccess: () => { toast("Configuração WhatsApp salva!"); setModalWhatsapp(false); utils.orizontech.listarEmpresas.invalidate(); },
  });
  const excluirEmpresa = trpc.orizontech.excluirEmpresa.useMutation({
    onSuccess: () => { toast("Empresa excluída!"); setModalExcluir(null); utils.orizontech.listarEmpresas.invalidate(); utils.orizontech.getMetricas.invalidate(); },
    onError: (e) => toast.error(`Erro ao excluir: ${e.message}`),
  });

  const [formAssinatura, setFormAssinatura] = useState({ planoId: 1, status: "ativa" as const, ciclo: "mensal" as const });
  const [formWa, setFormWa] = useState({ zapiInstanceId: "", zapiToken: "", zapiAtivo: false });
  const [zapiStatusEmpresaId, setZapiStatusEmpresaId] = useState<number | null>(null);
  const { data: zapiStatus, isLoading: zapiStatusLoading, refetch: refetchZapiStatus } = trpc.orizontech.verificarStatusZapi.useQuery(
    { empresaId: zapiStatusEmpresaId! },
    { enabled: zapiStatusEmpresaId !== null && modalWhatsapp }
  );
  const reconectarZapi = trpc.orizontech.reconectarZapi.useMutation({
    onSuccess: (res) => { toast(res.message || 'Reconexão solicitada!'); setTimeout(() => refetchZapiStatus(), 3000); },
    onError: (e) => toast.error(`Erro ao reconectar: ${e.message}`),
  });
  type EmpItem = NonNullable<typeof data>["empresas"][number];;
  function abrirModalAssinatura(e: EmpItem) {
    setEmpresaSelecionada(e.id);
    setFormAssinatura({ planoId: e.planoId ?? 1, status: (e.assinaturaStatus as any) ?? "trial", ciclo: (e.ciclo as any) ?? "mensal" });
    setModalAssinatura(true);
  }

  function abrirModalWhatsapp(e: EmpItem) {
    setEmpresaSelecionada(e.id);
    setZapiStatusEmpresaId(e.id);
    setFormWa({
      zapiInstanceId: e.zapiInstanceId ?? "",
      zapiToken: "", // token nunca é retornado por segurança — deixar em branco para não sobrescrever se vazio
      zapiAtivo: e.zapiAtivo ?? false,
    });
    setModalWhatsapp(true);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Buscar empresa, email..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
            className="pl-9 bg-white border-gray-300 text-gray-900 placeholder:text-gray-400"
          />
        </div>
        <Select value={status} onValueChange={v => setStatus(v as any)}>
          <SelectTrigger className="w-40 bg-white border-gray-300 text-gray-900">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas</SelectItem>
            <SelectItem value="ativa">Ativas</SelectItem>
            <SelectItem value="trial">Trial</SelectItem>
            <SelectItem value="inadimplente">Inadimplentes</SelectItem>
            <SelectItem value="cancelada">Canceladas</SelectItem>
            <SelectItem value="suspensa">Suspensas</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="ghost" size="icon" onClick={() => refetch()} className="text-gray-500 hover:text-gray-900">
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {isLoading ? (
        <div className="text-gray-500 text-sm">Carregando...</div>
      ) : (
        <div className="rounded-lg border border-gray-200 overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Empresa</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Plano</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Status</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">WhatsApp / API</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Cliente desde</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Início</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Fim</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {(data?.empresas ?? []).map(e => (
                <tr key={e.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{e.nome}</div>
                    <div className="text-xs text-gray-400">{e.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    {e.planoNome ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                        {e.planoNome}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badgeStatus(e.assinaturaStatus ?? "")}`}>
                      {e.assinaturaStatus ?? "sem plano"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-0.5">
                      {e.zapiAtivo ? (
                        <span className="flex items-center gap-1 text-green-600 text-xs font-medium">
                          <Wifi className="w-3 h-3" /> Z-API {e.zapiInstanceId ? <span className="text-gray-400 font-normal">(configurada)</span> : null}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-gray-400 text-xs">
                          <WifiOff className="w-3 h-3" /> {e.apiWhatsapp === 'zapi' ? 'Z-API (inativa)' : 'Baileys'}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {e.createdAt ? new Date(e.createdAt).toLocaleDateString("pt-BR") : "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {e.periodoInicio ? new Date(e.periodoInicio).toLocaleDateString("pt-BR") : "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {e.periodoFim
                      ? new Date(e.periodoFim).toLocaleDateString("pt-BR")
                      : e.trialFim
                        ? new Date(e.trialFim).toLocaleDateString("pt-BR")
                        : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="ghost" className="text-gray-500 hover:text-gray-900 h-7 px-2 text-xs"
                        onClick={() => abrirModalAssinatura(e)}>
                        <Settings2 className="w-3 h-3 mr-1" /> Assinatura
                      </Button>
                      <Button size="sm" variant="ghost" className="text-gray-500 hover:text-gray-900 h-7 w-7 p-0" title="Configurar WhatsApp"
                        onClick={() => abrirModalWhatsapp(e)}>
                        <Wifi className="w-3 h-3" />
                      </Button>
                      <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-600 h-7 w-7 p-0"
                        onClick={() => setModalExcluir({ id: e.id, nome: e.nome ?? "" })}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {(data?.empresas ?? []).length === 0 && (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">Nenhuma empresa encontrada</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Excluir Empresa */}
      <Dialog open={!!modalExcluir} onOpenChange={() => setModalExcluir(null)}>
        <DialogContent className="bg-white border-gray-200 text-gray-900 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-red-600">Excluir empresa</DialogTitle>
            <DialogDescription className="text-gray-600">
              Tem certeza que deseja excluir <strong>{modalExcluir?.nome}</strong>? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setModalExcluir(null)}>Cancelar</Button>
            <Button
              variant="destructive"
              disabled={excluirEmpresa.isPending}
              onClick={() => modalExcluir && excluirEmpresa.mutate({ empresaId: modalExcluir.id })}>
              {excluirEmpresa.isPending ? "Excluindo..." : "Excluir empresa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Assinatura */}
      <Dialog open={modalAssinatura} onOpenChange={setModalAssinatura}>
        <DialogContent className="bg-white border-gray-200 text-gray-900">
          <DialogHeader>
            <DialogTitle>Gerenciar Assinatura</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-gray-600">Plano</Label>
              <Select value={String(formAssinatura.planoId)} onValueChange={v => setFormAssinatura(f => ({ ...f, planoId: Number(v) }))}>
                <SelectTrigger className="bg-white border-gray-300 text-gray-900 mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(planos ?? []).map(p => (
                    <SelectItem key={p.id} value={String(p.id)}>{p.nome} — R$ {p.precoMensal}/mês</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-gray-600">Status</Label>
              <Select value={formAssinatura.status} onValueChange={v => setFormAssinatura(f => ({ ...f, status: v as any }))}>
                <SelectTrigger className="bg-white border-gray-300 text-gray-900 mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="trial">Trial</SelectItem>
                  <SelectItem value="ativa">Ativa</SelectItem>
                  <SelectItem value="inadimplente">Inadimplente</SelectItem>
                  <SelectItem value="suspensa">Suspensa</SelectItem>
                  <SelectItem value="cancelada">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-gray-600">Ciclo</Label>
              <Select value={formAssinatura.ciclo} onValueChange={v => setFormAssinatura(f => ({ ...f, ciclo: v as any }))}>
                <SelectTrigger className="bg-white border-gray-300 text-gray-900 mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mensal">Mensal</SelectItem>
                  <SelectItem value="anual">Anual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setModalAssinatura(false)}>Cancelar</Button>
            <Button className="bg-orange-500 hover:bg-orange-600"
              disabled={atualizarAssinatura.isPending}
              onClick={() => atualizarAssinatura.mutate({ empresaId: empresaSelecionada!, ...formAssinatura })}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal WhatsApp */}
      <Dialog open={modalWhatsapp} onOpenChange={setModalWhatsapp}>
        <DialogContent className="bg-white border-gray-200 text-gray-900">
          <DialogHeader>
            <DialogTitle>Configuração WhatsApp — Uso Interno</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-gray-100 text-xs text-gray-500">
              Esta configuração é interna. O cliente não vê qual API está sendo usada.
            </div>
            <div className="flex items-center gap-3">
              <input type="checkbox" id="zapiAtivo" checked={formWa.zapiAtivo}
                onChange={e => setFormWa(f => ({ ...f, zapiAtivo: e.target.checked }))}
                className="w-4 h-4" />
              <Label htmlFor="zapiAtivo" className="text-gray-600">Usar Z-API (WhatsApp estável na nuvem)</Label>
            </div>
            {formWa.zapiAtivo && (
              <>
                {/* Status em tempo real da instância Z-API */}
                <div className="p-3 rounded-lg border border-gray-200 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {zapiStatusLoading ? (
                        <div className="w-2.5 h-2.5 rounded-full bg-yellow-400 animate-pulse" />
                      ) : zapiStatus?.connected ? (
                        <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                      ) : (
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                      )}
                      <span className="text-sm font-medium text-gray-700">
                        {zapiStatusLoading ? 'Verificando...' : zapiStatus?.connected ? 'Conectada' : 'Desconectada'}
                      </span>
                      {zapiStatus?.phone && (
                        <span className="text-xs text-gray-500">({zapiStatus.phone})</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" className="h-7 text-xs text-gray-500"
                        onClick={() => refetchZapiStatus()}>
                        Atualizar
                      </Button>
                      {!zapiStatus?.connected && !zapiStatusLoading && zapiStatus?.status !== 'not_configured' && (
                        <Button size="sm" className="h-7 text-xs bg-orange-500 hover:bg-orange-600"
                          disabled={reconectarZapi.isPending}
                          onClick={() => reconectarZapi.mutate({ empresaId: empresaSelecionada! })}>
                          {reconectarZapi.isPending ? 'Reconectando...' : 'Reconectar'}
                        </Button>
                      )}
                    </div>
                  </div>
                  {zapiStatus?.status && zapiStatus.status !== 'connected' && zapiStatus.status !== 'not_configured' && (
                    <p className="text-xs text-gray-400 mt-1">Status: {zapiStatus.status}</p>
                  )}
                </div>

                <div>
                  <Label className="text-gray-600">Instance ID</Label>
                  <Input value={formWa.zapiInstanceId} onChange={e => setFormWa(f => ({ ...f, zapiInstanceId: e.target.value }))}
                    placeholder="ex: 3C6A8B..." className="bg-white border-gray-300 text-gray-900 mt-1" />
                </div>
                <div>
                  <Label className="text-gray-600">Token</Label>
                  <Input value={formWa.zapiToken} onChange={e => setFormWa(f => ({ ...f, zapiToken: e.target.value }))}
                    placeholder="Deixe em branco para manter o token atual" className="bg-white border-gray-300 text-gray-900 mt-1" />
                  <p className="text-xs text-gray-400 mt-1">Por segurança, o token não é exibido. Preencha apenas para alterar.</p>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setModalWhatsapp(false)}>Cancelar</Button>
            <Button className="bg-orange-500 hover:bg-orange-600"
              disabled={atualizarWhatsapp.isPending}
              onClick={() => atualizarWhatsapp.mutate({ empresaId: empresaSelecionada!, ...formWa })}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Tab Planos ───────────────────────────────────────────────────────────────
type PlanoItem = {
  id: number; nome: string; descricao: string | null;
  precoMensal: string; precoAnual: string;
  limiteUsuarios: number; limiteAgendamentosMes: number;
  temAutomacoes: boolean; temPipeline: boolean;
  temIaFinanceira: boolean; temIaClientes: boolean;
  slaSuporteHoras: number; ordem: number; ativo: boolean;
  stripeProductId: string | null; stripePriceIdMensal: string | null; stripePriceIdAnual: string | null;
};

const planoVazio: Omit<PlanoItem, "id"> = {
  nome: "", descricao: "", precoMensal: "0", precoAnual: "0",
  limiteUsuarios: 3, limiteAgendamentosMes: 200,
  temAutomacoes: true, temPipeline: false, temIaFinanceira: false, temIaClientes: false,
  slaSuporteHoras: 48, ordem: 0, ativo: true,
  stripeProductId: "", stripePriceIdMensal: "", stripePriceIdAnual: "",
};

function TabPlanos() {
  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState<PlanoItem | null>(null);
  const [form, setForm] = useState<Omit<PlanoItem, "id">>(planoVazio);
  const [confirmarExcluir, setConfirmarExcluir] = useState<PlanoItem | null>(null);

  const { data: planos, isLoading } = trpc.orizontech.listarPlanosCompleto.useQuery();
  const utils = trpc.useUtils();

  const criar = trpc.orizontech.criarPlano.useMutation({
    onSuccess: () => { toast("Plano criado!"); setModalAberto(false); utils.orizontech.listarPlanosCompleto.invalidate(); utils.orizontech.listarPlanos.invalidate(); },
    onError: e => toast.error(`Erro: ${e.message}`),
  });
  const editar = trpc.orizontech.editarPlano.useMutation({
    onSuccess: () => { toast("Plano atualizado!"); setModalAberto(false); setEditando(null); utils.orizontech.listarPlanosCompleto.invalidate(); utils.orizontech.listarPlanos.invalidate(); },
    onError: e => toast.error(`Erro: ${e.message}`),
  });
  const excluir = trpc.orizontech.excluirPlano.useMutation({
    onSuccess: () => { toast("Plano desativado!"); setConfirmarExcluir(null); utils.orizontech.listarPlanosCompleto.invalidate(); utils.orizontech.listarPlanos.invalidate(); },
  });

  function abrirNovo() {
    setEditando(null);
    setForm(planoVazio);
    setModalAberto(true);
  }

  function abrirEditar(p: PlanoItem) {
    setEditando(p);
    setForm({
      nome: p.nome, descricao: p.descricao ?? "", precoMensal: p.precoMensal, precoAnual: p.precoAnual,
      limiteUsuarios: p.limiteUsuarios, limiteAgendamentosMes: p.limiteAgendamentosMes,
      temAutomacoes: p.temAutomacoes, temPipeline: p.temPipeline,
      temIaFinanceira: p.temIaFinanceira, temIaClientes: p.temIaClientes,
      slaSuporteHoras: p.slaSuporteHoras, ordem: p.ordem, ativo: p.ativo,
      stripeProductId: p.stripeProductId ?? "", stripePriceIdMensal: p.stripePriceIdMensal ?? "",
      stripePriceIdAnual: p.stripePriceIdAnual ?? "",
    });
    setModalAberto(true);
  }

  function salvar() {
    const payload = {
      ...form,
      precoMensal: Number(form.precoMensal),
      precoAnual: Number(form.precoAnual),
      descricao: form.descricao || undefined,
      stripeProductId: form.stripeProductId || undefined,
      stripePriceIdMensal: form.stripePriceIdMensal || undefined,
      stripePriceIdAnual: form.stripePriceIdAnual || undefined,
    };
    if (editando) {
      editar.mutate({ id: editando.id, ...payload });
    } else {
      criar.mutate(payload);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Planos</h2>
        <Button onClick={abrirNovo} className="bg-orange-500 hover:bg-orange-600">
          <Plus className="w-4 h-4 mr-2" /> Novo plano
        </Button>
      </div>

      {isLoading ? (
        <div className="text-gray-500 text-sm">Carregando...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(planos ?? []).map(p => (
            <Card key={p.id} className={`bg-white border-gray-200 ${!p.ativo ? "opacity-50" : ""}`}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base text-gray-900">{p.nome}</CardTitle>
                    {p.descricao && <p className="text-xs text-gray-500 mt-0.5">{p.descricao}</p>}
                  </div>
                  <div className="flex gap-1">
                    {!p.ativo && <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Inativo</span>}
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-gray-400 hover:text-gray-700"
                      onClick={() => abrirEditar(p as PlanoItem)}>
                      <Edit className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-400 hover:text-red-600"
                      onClick={() => setConfirmarExcluir(p as PlanoItem)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-4">
                  <div>
                    <div className="text-xl font-bold text-gray-900">R$ {Number(p.precoMensal).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
                    <div className="text-xs text-gray-400">por mês</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-gray-900">R$ {Number(p.precoAnual).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
                    <div className="text-xs text-gray-400">por ano</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-1 text-xs text-gray-600">
                  <span>👥 {p.limiteUsuarios} usuários</span>
                  <span>📅 {p.limiteAgendamentosMes}/mês</span>
                  <span>{p.temAutomacoes ? "✅" : "❌"} Automações</span>
                  <span>{p.temPipeline ? "✅" : "❌"} Pipeline</span>
                  <span>{p.temIaFinanceira ? "✅" : "❌"} IA Financeira</span>
                  <span>⏱ SLA {p.slaSuporteHoras}h</span>
                </div>
                {p.stripeProductId && (
                  <div className="text-xs text-gray-400 font-mono truncate">Stripe: {p.stripeProductId}</div>
                )}
              </CardContent>
            </Card>
          ))}
          {(planos ?? []).length === 0 && (
            <div className="col-span-3 text-center text-gray-400 py-12">
              <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Nenhum plano cadastrado. Crie o primeiro!</p>
            </div>
          )}
        </div>
      )}

      {/* Modal Criar/Editar Plano */}
      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent className="bg-white border-gray-200 text-gray-900 max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editando ? "Editar plano" : "Novo plano"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label className="text-gray-600">Nome do plano *</Label>
              <Input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                placeholder="ex: Starter, Pro, Enterprise" className="bg-white border-gray-300 text-gray-900 mt-1" />
            </div>
            <div className="col-span-2">
              <Label className="text-gray-600">Descrição</Label>
              <Input value={form.descricao ?? ""} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                placeholder="Descrição curta do plano" className="bg-white border-gray-300 text-gray-900 mt-1" />
            </div>
            <div>
              <Label className="text-gray-600">Preço mensal (R$)</Label>
              <Input type="number" value={form.precoMensal} onChange={e => setForm(f => ({ ...f, precoMensal: e.target.value }))}
                className="bg-white border-gray-300 text-gray-900 mt-1" />
            </div>
            <div>
              <Label className="text-gray-600">Preço anual (R$)</Label>
              <Input type="number" value={form.precoAnual} onChange={e => setForm(f => ({ ...f, precoAnual: e.target.value }))}
                className="bg-white border-gray-300 text-gray-900 mt-1" />
            </div>
            <div>
              <Label className="text-gray-600">Limite de usuários</Label>
              <Input type="number" value={form.limiteUsuarios} onChange={e => setForm(f => ({ ...f, limiteUsuarios: Number(e.target.value) }))}
                className="bg-white border-gray-300 text-gray-900 mt-1" />
            </div>
            <div>
              <Label className="text-gray-600">Agendamentos/mês</Label>
              <Input type="number" value={form.limiteAgendamentosMes} onChange={e => setForm(f => ({ ...f, limiteAgendamentosMes: Number(e.target.value) }))}
                className="bg-white border-gray-300 text-gray-900 mt-1" />
            </div>
            <div>
              <Label className="text-gray-600">SLA Suporte (horas)</Label>
              <Input type="number" value={form.slaSuporteHoras} onChange={e => setForm(f => ({ ...f, slaSuporteHoras: Number(e.target.value) }))}
                className="bg-white border-gray-300 text-gray-900 mt-1" />
            </div>
            <div>
              <Label className="text-gray-600">Ordem de exibição</Label>
              <Input type="number" value={form.ordem} onChange={e => setForm(f => ({ ...f, ordem: Number(e.target.value) }))}
                className="bg-white border-gray-300 text-gray-900 mt-1" />
            </div>
            <div className="col-span-2 grid grid-cols-2 gap-3">
              {[
                { key: "temAutomacoes", label: "Automações" },
                { key: "temPipeline", label: "Pipeline" },
                { key: "temIaFinanceira", label: "IA Financeira" },
                { key: "temIaClientes", label: "IA Clientes" },
                { key: "ativo", label: "Plano ativo" },
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center gap-2">
                  <Switch
                    checked={form[key as keyof typeof form] as boolean}
                    onCheckedChange={v => setForm(f => ({ ...f, [key]: v }))}
                  />
                  <Label className="text-gray-600">{label}</Label>
                </div>
              ))}
            </div>
            <div className="col-span-2 border-t border-gray-200 pt-4">
              <p className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">IDs Stripe (opcional)</p>
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <Label className="text-gray-600 text-xs">Product ID</Label>
                  <Input value={form.stripeProductId ?? ""} onChange={e => setForm(f => ({ ...f, stripeProductId: e.target.value }))}
                    placeholder="prod_..." className="bg-white border-gray-300 text-gray-900 mt-1 font-mono text-xs" />
                </div>
                <div>
                  <Label className="text-gray-600 text-xs">Price ID Mensal</Label>
                  <Input value={form.stripePriceIdMensal ?? ""} onChange={e => setForm(f => ({ ...f, stripePriceIdMensal: e.target.value }))}
                    placeholder="price_..." className="bg-white border-gray-300 text-gray-900 mt-1 font-mono text-xs" />
                </div>
                <div>
                  <Label className="text-gray-600 text-xs">Price ID Anual</Label>
                  <Input value={form.stripePriceIdAnual ?? ""} onChange={e => setForm(f => ({ ...f, stripePriceIdAnual: e.target.value }))}
                    placeholder="price_..." className="bg-white border-gray-300 text-gray-900 mt-1 font-mono text-xs" />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setModalAberto(false)}>Cancelar</Button>
            <Button className="bg-orange-500 hover:bg-orange-600"
              disabled={!form.nome.trim() || criar.isPending || editar.isPending}
              onClick={salvar}>
              Salvar plano
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Confirmar Excluir Plano */}
      <Dialog open={!!confirmarExcluir} onOpenChange={() => setConfirmarExcluir(null)}>
        <DialogContent className="bg-white border-gray-200 text-gray-900 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-red-600">Desativar plano</DialogTitle>
            <DialogDescription className="text-gray-600">
              Deseja desativar o plano <strong>{confirmarExcluir?.nome}</strong>? Empresas existentes não serão afetadas.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmarExcluir(null)}>Cancelar</Button>
            <Button variant="destructive" disabled={excluir.isPending}
              onClick={() => confirmarExcluir && excluir.mutate({ id: confirmarExcluir.id })}>
              Desativar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Tab Chamados ─────────────────────────────────────────────────────────────
function TabChamados() {
  const [statusFiltro, setStatusFiltro] = useState<"todos" | "aberto" | "em_atendimento" | "aguardando_cliente" | "resolvido" | "fechado">("aberto");
  const [chamadoAberto, setChamadoAberto] = useState<number | null>(null);
  const [resposta, setResposta] = useState("");
  const [novoStatus, setNovoStatus] = useState<string>("");

  const { data: chamados, isLoading } = trpc.orizontech.listarChamados.useQuery({ status: statusFiltro });
  const { data: detalhe } = trpc.orizontech.getChamado.useQuery(
    { chamadoId: chamadoAberto! },
    { enabled: !!chamadoAberto }
  );
  const utils = trpc.useUtils();
  const responderMut = trpc.orizontech.responderChamado.useMutation({
    onSuccess: () => {
      setResposta("");
      setNovoStatus("");
      utils.orizontech.getChamado.invalidate({ chamadoId: chamadoAberto! });
      utils.orizontech.listarChamados.invalidate();
    },
  });

  return (
    <div className="flex gap-4 h-[calc(100vh-200px)]">
      {/* Lista */}
      <div className="w-80 flex flex-col gap-3 flex-shrink-0">
        <Select value={statusFiltro} onValueChange={v => setStatusFiltro(v as any)}>
          <SelectTrigger className="bg-white border-gray-300 text-gray-900">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="aberto">Abertos</SelectItem>
            <SelectItem value="em_atendimento">Em atendimento</SelectItem>
            <SelectItem value="aguardando_cliente">Aguardando cliente</SelectItem>
            <SelectItem value="resolvido">Resolvidos</SelectItem>
            <SelectItem value="fechado">Fechados</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex-1 overflow-y-auto space-y-2">
          {isLoading ? (
            <div className="text-gray-500 text-sm">Carregando...</div>
          ) : (
            (chamados ?? []).map(c => (
              <div
                key={c.id}
                onClick={() => setChamadoAberto(c.id)}
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                  chamadoAberto === c.id
                    ? "border-orange-300 bg-orange-50"
                    : "border-gray-200 bg-white hover:bg-gray-50"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-gray-900 line-clamp-1">{c.titulo}</p>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 ${badgePrioridade(c.prioridade ?? "")}`}>
                    {c.prioridade}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">{c.empresaNome}</p>
                <span className={`text-xs px-1.5 py-0.5 rounded-full mt-1 inline-block ${badgeStatus(c.status ?? "")}`}>
                  {c.status}
                </span>
              </div>
            ))
          )}
          {!isLoading && (chamados ?? []).length === 0 && (
            <div className="text-center text-gray-400 py-8 text-sm">Nenhum chamado</div>
          )}
        </div>
      </div>

      {/* Detalhe */}
      <div className="flex-1 flex flex-col bg-white rounded-lg border border-gray-200 overflow-hidden">
        {!chamadoAberto ? (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Selecione um chamado</p>
            </div>
          </div>
        ) : !detalhe ? (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">Carregando...</div>
        ) : (
          <>
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">{detalhe.chamado.titulo}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{detalhe.empresaNome} · #{detalhe.chamado.id}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${badgePrioridade(detalhe.chamado.prioridade ?? "")}`}>
                    {detalhe.chamado.prioridade}
                  </span>
                  <span className={`text-xs px-2 py-1 rounded-full ${badgeStatus(detalhe.chamado.status ?? "")}`}>
                    {detalhe.chamado.status}
                  </span>
                </div>
              </div>
              {detalhe.chamado.slaVencidoEm && (
                <div className="mt-2 text-xs text-red-400 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  SLA vence em {new Date(detalhe.chamado.slaVencidoEm).toLocaleString("pt-BR")}
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {detalhe.mensagens.map(m => (
                <div key={m.id} className={`flex ${m.autorTipo === "agente" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[75%] rounded-lg p-3 text-sm ${
                    m.autorTipo === "agente"
                      ? "bg-orange-500 text-white"
                      : m.autorTipo === "ia"
                      ? "bg-blue-50 text-blue-900 border border-blue-200"
                      : "bg-gray-100 text-gray-800"
                  }`}>
                    <div className="text-xs opacity-70 mb-1">
                      {m.autorTipo === "ia" ? "🤖 IA" : m.autorNome}
                    </div>
                    <p className="whitespace-pre-wrap">{m.conteudo}</p>
                    <div className="text-xs opacity-50 mt-1 text-right">
                      {m.createdAt ? new Date(m.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : ""}
                    </div>
                  </div>
                </div>
              ))}
              {detalhe.mensagens.length === 0 && (
                <div className="text-center text-gray-400 text-sm py-4">Sem mensagens ainda</div>
              )}
            </div>

            <div className="p-4 border-t border-gray-200 space-y-2">
              <Textarea
                value={resposta}
                onChange={e => setResposta(e.target.value)}
                placeholder="Digite sua resposta..."
                className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 resize-none"
                rows={3}
              />
              <div className="flex items-center gap-2">
                <Select value={novoStatus} onValueChange={v => setNovoStatus(v as any)}>
                  <SelectTrigger className="bg-white border-gray-300 text-gray-900 text-sm w-48">
                    <SelectValue placeholder="Manter status atual" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Manter status atual</SelectItem>
                    <SelectItem value="em_atendimento">Em atendimento</SelectItem>
                    <SelectItem value="aguardando_cliente">Aguardando cliente</SelectItem>
                    <SelectItem value="resolvido">Resolvido</SelectItem>
                    <SelectItem value="fechado">Fechado</SelectItem>
                  </SelectContent>
                </Select>
                <Button className="bg-orange-500 hover:bg-orange-600 ml-auto"
                  disabled={!resposta.trim() || responderMut.isPending}
                  onClick={() => responderMut.mutate({
                    chamadoId: chamadoAberto!,
                    conteudo: resposta,
                    ...(novoStatus ? { novoStatus: novoStatus as any } : {}),
                  })}>
                  Enviar resposta
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Tab Base de Conhecimento ─────────────────────────────────────────────────
function TabConhecimento() {
  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState<{ id: number; titulo: string; conteudo: string; categoria: string | null } | null>(null);
  const [form, setForm] = useState({ titulo: "", conteudo: "", categoria: "geral" });

  const { data: artigos, isLoading } = trpc.orizontech.listarBaseConhecimento.useQuery();
  const utils = trpc.useUtils();

  const criar = trpc.orizontech.criarBaseConhecimento.useMutation({
    onSuccess: () => { toast("Artigo criado!"); setModalAberto(false); setForm({ titulo: "", conteudo: "", categoria: "geral" }); utils.orizontech.listarBaseConhecimento.invalidate(); },
  });
  const editar = trpc.orizontech.editarBaseConhecimento.useMutation({
    onSuccess: () => { toast("Artigo atualizado!"); setModalAberto(false); setEditando(null); utils.orizontech.listarBaseConhecimento.invalidate(); },
  });
  const excluir = trpc.orizontech.excluirBaseConhecimento.useMutation({
    onSuccess: () => { toast("Artigo removido!"); utils.orizontech.listarBaseConhecimento.invalidate(); },
  });

  function abrirNovo() {
    setEditando(null);
    setForm({ titulo: "", conteudo: "", categoria: "geral" });
    setModalAberto(true);
  }

  function abrirEditar(a: { id: number; titulo: string; conteudo: string; categoria: string | null }) {
    setEditando(a);
    setForm({ titulo: a.titulo, conteudo: a.conteudo, categoria: a.categoria ?? "geral" });
    setModalAberto(true);
  }

  function salvar() {
    if (editando) {
      editar.mutate({ id: editando.id, ...form });
    } else {
      criar.mutate(form);
    }
  }

  const categorias = [...new Set((artigos ?? []).map(a => a.categoria))];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Base de Conhecimento</h2>
        <Button onClick={abrirNovo} className="bg-orange-500 hover:bg-orange-600">
          <Plus className="w-4 h-4 mr-2" /> Novo artigo
        </Button>
      </div>

      {isLoading ? (
        <div className="text-gray-500 text-sm">Carregando...</div>
      ) : (
        <div className="space-y-3">
          {categorias.map(cat => (
            <div key={cat}>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{cat}</h3>
              <div className="space-y-2">
                {(artigos ?? []).filter(a => a.categoria === cat).map(a => (
                  <div key={a.id} className="bg-white border border-gray-200 rounded-lg p-4 flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900">{a.titulo}</h4>
                      <p className="text-sm text-gray-500 mt-1 line-clamp-2">{a.conteudo}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button size="sm" variant="ghost" className="text-gray-500 hover:text-gray-900 h-7 w-7 p-0"
                        onClick={() => abrirEditar(a)}>
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-600 h-7 w-7 p-0"
                        onClick={() => excluir.mutate({ id: a.id })}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {(artigos ?? []).length === 0 && (
            <div className="text-center text-gray-400 py-12">
              <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Nenhum artigo ainda. Crie o primeiro!</p>
            </div>
          )}
        </div>
      )}

      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent className="bg-white border-gray-200 text-gray-900 max-w-lg">
          <DialogHeader>
            <DialogTitle>{editando ? "Editar artigo" : "Novo artigo"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-gray-600">Título</Label>
              <Input value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
                className="bg-white border-gray-300 text-gray-900 mt-1" />
            </div>
            <div>
              <Label className="text-gray-600">Categoria</Label>
              <Input value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}
                placeholder="ex: agendamentos, financeiro, whatsapp..."
                className="bg-white border-gray-300 text-gray-900 mt-1" />
            </div>
            <div>
              <Label className="text-gray-600">Conteúdo</Label>
              <Textarea value={form.conteudo} onChange={e => setForm(f => ({ ...f, conteudo: e.target.value }))}
                rows={8} className="bg-white border-gray-300 text-gray-900 mt-1 resize-none" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setModalAberto(false)}>Cancelar</Button>
            <Button className="bg-orange-500 hover:bg-orange-600"
              disabled={!form.titulo.trim() || !form.conteudo.trim() || criar.isPending || editar.isPending}
              onClick={salvar}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
