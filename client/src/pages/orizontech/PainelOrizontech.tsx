import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Building2, Users, TrendingUp, MessageSquare, AlertCircle,
  Search, RefreshCw, ChevronRight, Wifi, WifiOff, Crown,
  Clock, CheckCircle2, XCircle, BookOpen, Plus, Edit, Trash2,
  BarChart3, DollarSign, Headphones, Settings2
} from "lucide-react";

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

  // Redirecionar se não for owner
  if (!user) return <div className="flex items-center justify-center h-screen text-muted-foreground">Carregando...</div>;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <div className="border-b border-slate-800 bg-slate-900 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center">
            <Crown className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-white text-lg leading-none">Painel Orizontech</h1>
            <p className="text-xs text-slate-400 mt-0.5">Gestão interna do sistema Hubly</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white" onClick={() => navigate("/admin")}>
          Voltar ao app
        </Button>
      </div>

      {/* Nav */}
      <div className="border-b border-slate-800 bg-slate-900 px-6">
        <nav className="flex gap-1">
          {[
            { id: "dashboard", label: "Dashboard", icon: BarChart3 },
            { id: "empresas", label: "Empresas", icon: Building2 },
            { id: "chamados", label: "Chamados", icon: Headphones },
            { id: "conhecimento", label: "Base de Conhecimento", icon: BookOpen },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setAba(id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                aba === id
                  ? "border-violet-500 text-violet-400"
                  : "border-transparent text-slate-400 hover:text-slate-200"
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
        {aba === "chamados" && <TabChamados />}
        {aba === "conhecimento" && <TabConhecimento />}
      </div>
    </div>
  );
}

// ─── Tab Dashboard ────────────────────────────────────────────────────────────
function TabDashboard() {
  const { data: metricas, isLoading } = trpc.orizontech.getMetricas.useQuery();

  if (isLoading) return <div className="text-slate-400 text-sm">Carregando métricas...</div>;
  if (!metricas) return <div className="text-red-400 text-sm">Erro ao carregar métricas. Verifique as permissões.</div>;

  const cards = [
    { label: "Total de empresas", value: metricas.totalEmpresas, icon: Building2, color: "text-violet-400" },
    { label: "Assinaturas ativas", value: metricas.ativas, icon: CheckCircle2, color: "text-green-400" },
    { label: "Em trial", value: metricas.trial, icon: Clock, color: "text-blue-400" },
    { label: "Inadimplentes", value: metricas.inadimplentes, icon: AlertCircle, color: "text-red-400" },
    { label: "MRR estimado", value: `R$ ${metricas.mrr.toLocaleString("pt-BR")}`, icon: DollarSign, color: "text-emerald-400" },
    { label: "Chamados abertos", value: metricas.chamadosAbertos, icon: MessageSquare, color: "text-yellow-400" },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-white">Visão geral</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {cards.map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="bg-slate-900 border-slate-800">
            <CardContent className="p-4">
              <Icon className={`w-5 h-5 mb-2 ${color}`} />
              <div className="text-2xl font-bold text-white">{value}</div>
              <div className="text-xs text-slate-400 mt-1">{label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-300">Distribuição de status</CardTitle>
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
                <span className="text-sm text-slate-300 flex-1">{label}</span>
                <span className="text-sm font-medium text-white">{value}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-300">Receita mensal recorrente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-400">
              R$ {metricas.mrr.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-slate-500 mt-1">Baseado em assinaturas ativas</p>
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

  const { data, isLoading, refetch } = trpc.orizontech.listarEmpresas.useQuery({ busca, status });
  const { data: planos } = trpc.orizontech.listarPlanos.useQuery();
  const { data: detalhe } = trpc.orizontech.getEmpresa.useQuery(
    { empresaId: empresaSelecionada! },
    { enabled: !!empresaSelecionada }
  );

  const utils = trpc.useUtils();
  const atualizarAssinatura = trpc.orizontech.atualizarAssinatura.useMutation({
    onSuccess: () => { toast("Assinatura atualizada!"); setModalAssinatura(false); utils.orizontech.listarEmpresas.invalidate(); },
  });
  const atualizarWhatsapp = trpc.orizontech.atualizarApiWhatsapp.useMutation({
    onSuccess: () => { toast("Configuração WhatsApp salva!"); setModalWhatsapp(false); utils.orizontech.listarEmpresas.invalidate(); },
  });

  const [formAssinatura, setFormAssinatura] = useState({ planoId: 1, status: "ativa" as const, ciclo: "mensal" as const });
  const [formWa, setFormWa] = useState({ zapiInstanceId: "", zapiToken: "", zapiAtivo: false });

  type EmpItem = NonNullable<typeof data>["empresas"][number];
  function abrirModalAssinatura(e: EmpItem) {
    setEmpresaSelecionada(e.id);
    setFormAssinatura({
      planoId: e.planoId ?? 1,
      status: (e.assinaturaStatus as any) ?? "trial",
      ciclo: "mensal",
    });
    setModalAssinatura(true);
  }

  function abrirModalWhatsapp(e: EmpItem) {
    setEmpresaSelecionada(e.id);
    setFormWa({ zapiInstanceId: "", zapiToken: "", zapiAtivo: e.zapiAtivo ?? false });
    setModalWhatsapp(true);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input
            placeholder="Buscar empresa, email..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
            className="pl-9 bg-slate-900 border-slate-700 text-white placeholder:text-slate-500"
          />
        </div>
        <Select value={status} onValueChange={v => setStatus(v as any)}>
          <SelectTrigger className="w-40 bg-slate-900 border-slate-700 text-white">
            <SelectValue />
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
        <Button variant="ghost" size="icon" onClick={() => refetch()} className="text-slate-400 hover:text-white">
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {isLoading ? (
        <div className="text-slate-400 text-sm">Carregando...</div>
      ) : (
        <div className="rounded-lg border border-slate-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-900 border-b border-slate-800">
                <th className="text-left px-4 py-3 text-slate-400 font-medium">Empresa</th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium">Plano</th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium">Status</th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium">WhatsApp</th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium">Cadastro</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {(data?.empresas ?? []).map(e => (
                <tr key={e.id} className="border-b border-slate-800 hover:bg-slate-900/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-white">{e.nome}</div>
                    <div className="text-xs text-slate-500">{e.email}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-300">{e.planoNome ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badgeStatus(e.assinaturaStatus ?? "")}`}>
                      {e.assinaturaStatus ?? "sem plano"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {e.zapiAtivo ? (
                      <span className="flex items-center gap-1 text-green-400 text-xs"><Wifi className="w-3 h-3" /> Z-API</span>
                    ) : (
                      <span className="flex items-center gap-1 text-slate-500 text-xs"><WifiOff className="w-3 h-3" /> Baileys</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {e.createdAt ? new Date(e.createdAt).toLocaleDateString("pt-BR") : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="ghost" className="text-slate-400 hover:text-white h-7 px-2 text-xs"
                        onClick={() => abrirModalAssinatura(e)}>
                        <Settings2 className="w-3 h-3 mr-1" /> Assinatura
                      </Button>
                      <Button size="sm" variant="ghost" className="text-slate-400 hover:text-white h-7 px-2 text-xs"
                        onClick={() => abrirModalWhatsapp(e)}>
                        <Wifi className="w-3 h-3 mr-1" /> WhatsApp
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {(data?.empresas ?? []).length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">Nenhuma empresa encontrada</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Assinatura */}
      <Dialog open={modalAssinatura} onOpenChange={setModalAssinatura}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle>Gerenciar Assinatura</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-slate-300">Plano</Label>
              <Select value={String(formAssinatura.planoId)} onValueChange={v => setFormAssinatura(f => ({ ...f, planoId: Number(v) }))}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white mt-1">
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
              <Label className="text-slate-300">Status</Label>
              <Select value={formAssinatura.status} onValueChange={v => setFormAssinatura(f => ({ ...f, status: v as any }))}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white mt-1">
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
              <Label className="text-slate-300">Ciclo</Label>
              <Select value={formAssinatura.ciclo} onValueChange={v => setFormAssinatura(f => ({ ...f, ciclo: v as any }))}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white mt-1">
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
            <Button className="bg-violet-600 hover:bg-violet-700"
              disabled={atualizarAssinatura.isPending}
              onClick={() => atualizarAssinatura.mutate({ empresaId: empresaSelecionada!, ...formAssinatura })}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal WhatsApp */}
      <Dialog open={modalWhatsapp} onOpenChange={setModalWhatsapp}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle>Configuração WhatsApp — Uso Interno</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-slate-800 text-xs text-slate-400">
              Esta configuração é interna. O cliente não vê qual API está sendo usada.
            </div>
            <div className="flex items-center gap-3">
              <input type="checkbox" id="zapiAtivo" checked={formWa.zapiAtivo}
                onChange={e => setFormWa(f => ({ ...f, zapiAtivo: e.target.checked }))}
                className="w-4 h-4" />
              <Label htmlFor="zapiAtivo" className="text-slate-300">Usar Z-API (WhatsApp estável na nuvem)</Label>
            </div>
            {formWa.zapiAtivo && (
              <>
                <div>
                  <Label className="text-slate-300">Instance ID</Label>
                  <Input value={formWa.zapiInstanceId} onChange={e => setFormWa(f => ({ ...f, zapiInstanceId: e.target.value }))}
                    placeholder="ex: 3C6A8B..." className="bg-slate-800 border-slate-700 text-white mt-1" />
                </div>
                <div>
                  <Label className="text-slate-300">Token</Label>
                  <Input value={formWa.zapiToken} onChange={e => setFormWa(f => ({ ...f, zapiToken: e.target.value }))}
                    placeholder="Token da instância Z-API" className="bg-slate-800 border-slate-700 text-white mt-1" />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setModalWhatsapp(false)}>Cancelar</Button>
            <Button className="bg-violet-600 hover:bg-violet-700"
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

// ─── Tab Chamados ─────────────────────────────────────────────────────────────
function TabChamados() {
  const [statusFiltro, setStatusFiltro] = useState<"todos" | "aberto" | "em_atendimento" | "aguardando_cliente" | "resolvido" | "fechado">("aberto");
  const [chamadoAberto, setChamadoAberto] = useState<number | null>(null);
  const [resposta, setResposta] = useState("");
  const [novoStatus, setNovoStatus] = useState<"em_atendimento" | "aguardando_cliente" | "resolvido" | "fechado" | "">("");

  const { data: chamados, isLoading, refetch } = trpc.orizontech.listarChamados.useQuery(
    { status: statusFiltro },
    { refetchInterval: 30000 }
  );
  const { data: detalhe } = trpc.orizontech.getChamado.useQuery(
    { chamadoId: chamadoAberto! },
    { enabled: !!chamadoAberto, refetchInterval: 15000 }
  );
  const utils = trpc.useUtils();
  const responderMut = trpc.orizontech.responderChamado.useMutation({
    onSuccess: () => {
      toast.success("Resposta enviada!");
      setResposta("");
      setNovoStatus("");
      utils.orizontech.getChamado.invalidate({ chamadoId: chamadoAberto! });
      utils.orizontech.listarChamados.invalidate();
    },
    onError: () => toast.error("Erro ao enviar resposta"),
  });

  return (
    <div className="flex gap-4 h-[calc(100vh-200px)]">
      {/* Lista */}
      <div className="w-80 flex-shrink-0 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Select value={statusFiltro} onValueChange={v => setStatusFiltro(v as any)}>
            <SelectTrigger className="bg-slate-900 border-slate-700 text-white text-sm">
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
          <Button variant="ghost" size="icon" onClick={() => refetch()} className="text-slate-400 hover:text-white flex-shrink-0">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2">
          {isLoading && <div className="text-slate-500 text-sm">Carregando...</div>}
          {!isLoading && (chamados ?? []).length > 0 && (
            <p className="text-xs text-slate-500 px-1">{(chamados ?? []).length} chamado{(chamados ?? []).length !== 1 ? "s" : ""}</p>
          )}
          {(chamados ?? []).map(c => (
            <button key={c.id} onClick={() => setChamadoAberto(c.id)}
              className={`w-full text-left p-3 rounded-lg border transition-colors ${
                chamadoAberto === c.id
                  ? "bg-violet-900/30 border-violet-700"
                  : "bg-slate-900 border-slate-800 hover:border-slate-700"
              }`}>
              <div className="flex items-start justify-between gap-2 mb-1">
                <span className="text-sm font-medium text-white line-clamp-1">{c.titulo}</span>
                <span className={`flex-shrink-0 text-xs px-1.5 py-0.5 rounded-full font-medium ${badgePrioridade(c.prioridade ?? "")}`}>
                  {c.prioridade}
                </span>
              </div>
              <div className="text-xs text-slate-400 font-medium">{c.empresaNome}</div>
              <div className="flex items-center gap-2 mt-1.5">
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${badgeStatus(c.status ?? "")}`}>{c.status?.replace("_", " ")}</span>
                <span className="text-xs text-slate-600 ml-auto">{c.createdAt ? new Date(c.createdAt).toLocaleDateString("pt-BR") : ""}</span>
              </div>
              {c.prioridade === "critica" && (
                <div className="mt-1.5 flex items-center gap-1 text-red-400 text-[10px] font-medium">
                  <AlertCircle className="w-3 h-3" /> URGENTE
                </div>
              )}
            </button>
          ))}
          {!isLoading && (chamados ?? []).length === 0 && (
            <div className="text-slate-500 text-sm text-center py-8">Nenhum chamado</div>
          )}
        </div>
      </div>

      {/* Detalhe */}
      <div className="flex-1 flex flex-col bg-slate-900 rounded-lg border border-slate-800 overflow-hidden">
        {!chamadoAberto ? (
          <div className="flex-1 flex items-center justify-center text-slate-500">
            <div className="text-center">
              <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Selecione um chamado</p>
            </div>
          </div>
        ) : !detalhe ? (
          <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">Carregando...</div>
        ) : (
          <>
            {/* Header do chamado */}
            <div className="p-4 border-b border-slate-800">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-white">{detalhe.chamado.titulo}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">{detalhe.empresaNome} · #{detalhe.chamado.id}</p>
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

            {/* Mensagens */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {detalhe.mensagens.map(m => (
                <div key={m.id} className={`flex ${m.autorTipo === "agente" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[75%] rounded-lg p-3 text-sm ${
                    m.autorTipo === "agente"
                      ? "bg-violet-700 text-white"
                      : m.autorTipo === "ia"
                      ? "bg-slate-700 text-slate-200 border border-slate-600"
                      : "bg-slate-800 text-slate-200"
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
                <div className="text-center text-slate-500 text-sm py-4">Sem mensagens ainda</div>
              )}
            </div>

            {/* Resposta */}
            <div className="p-4 border-t border-slate-800 space-y-2">
              <Textarea
                value={resposta}
                onChange={e => setResposta(e.target.value)}
                placeholder="Digite sua resposta..."
                className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 resize-none"
                rows={3}
              />
              <div className="flex items-center gap-2">
                <Select value={novoStatus} onValueChange={v => setNovoStatus(v as any)}>
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white text-sm w-48">
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
                <Button className="bg-violet-600 hover:bg-violet-700 ml-auto"
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
        <h2 className="text-lg font-semibold text-white">Base de Conhecimento</h2>
        <Button onClick={abrirNovo} className="bg-violet-600 hover:bg-violet-700">
          <Plus className="w-4 h-4 mr-2" /> Novo artigo
        </Button>
      </div>

      {isLoading ? (
        <div className="text-slate-400 text-sm">Carregando...</div>
      ) : (
        <div className="space-y-3">
          {categorias.map(cat => (
            <div key={cat}>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">{cat}</h3>
              <div className="space-y-2">
                {(artigos ?? []).filter(a => a.categoria === cat).map(a => (
                  <div key={a.id} className="bg-slate-900 border border-slate-800 rounded-lg p-4 flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-white">{a.titulo}</h4>
                      <p className="text-sm text-slate-400 mt-1 line-clamp-2">{a.conteudo}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button size="sm" variant="ghost" className="text-slate-400 hover:text-white h-7 w-7 p-0"
                        onClick={() => abrirEditar(a)}>
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-300 h-7 w-7 p-0"
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
            <div className="text-center text-slate-500 py-12">
              <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Nenhum artigo ainda. Crie o primeiro!</p>
            </div>
          )}
        </div>
      )}

      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle>{editando ? "Editar artigo" : "Novo artigo"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-slate-300">Título</Label>
              <Input value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
                className="bg-slate-800 border-slate-700 text-white mt-1" />
            </div>
            <div>
              <Label className="text-slate-300">Categoria</Label>
              <Input value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}
                placeholder="ex: agendamentos, financeiro, whatsapp..."
                className="bg-slate-800 border-slate-700 text-white mt-1" />
            </div>
            <div>
              <Label className="text-slate-300">Conteúdo</Label>
              <Textarea value={form.conteudo} onChange={e => setForm(f => ({ ...f, conteudo: e.target.value }))}
                rows={8} className="bg-slate-800 border-slate-700 text-white mt-1 resize-none" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setModalAberto(false)}>Cancelar</Button>
            <Button className="bg-violet-600 hover:bg-violet-700"
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
