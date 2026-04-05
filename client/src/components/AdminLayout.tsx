import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import {
  Bell, Calendar, CalendarCheck, CreditCard, ReceiptText, TrendingUp, ChevronDown,
  LayoutDashboard, LogOut, Menu, MessageSquare, MessageCircle, Settings,
  UserCog, Users, X, Lock, Sparkles, Home, Download, KanbanSquare, Brain, BookOpen, Package, Headphones, Eye, EyeOff, UserCircle, ArrowDownCircle, Wallet, DollarSign, BarChart3, Send
} from "lucide-react";
import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useSystemAuth } from "@/_core/hooks/useSystemAuth";
import { usePermissoes } from "@/hooks/usePermissoes";

type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
  exact?: boolean;
  /** Campo de permissão necessário para ver este item. Undefined = sempre visível. */
  permissao?: string;
  children?: { href: string; label: string; icon: React.ElementType; permissao?: string }[];
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

const navGroups: NavGroup[] = [
  {
    label: "Principal",
    items: [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
      { href: "/admin/calendario", label: "Calendário", icon: Calendar, permissao: "agendamentosVer" },
      { href: "/admin/agendamentos", label: "Agendamentos", icon: CalendarCheck, permissao: "agendamentosVer" },
    ],
  },
  {
    label: "Gestão",
    items: [
      { href: "/admin/clientes", label: "Clientes", icon: Users, permissao: "clientesVer" },
      { href: "/admin/equipe", label: "Equipe e Permissões", icon: UserCog, permissao: "profissionaisVer" },
      { href: "/admin/servicos", label: "Serviços", icon: Sparkles, permissao: "servicosVer" },
      { href: "/admin/pacotes", label: "Pacotes", icon: Package, permissao: "clientesVer" },
    ],
  },
  {
    label: "Operações",
    items: [
      {
        href: "/admin/financeiro",
        label: "Financeiro",
        icon: CreditCard,
        permissao: "financeiroVer",
        children: [
          { href: "/admin/financeiro", label: "Visão Geral", icon: TrendingUp, permissao: "financeiroVer" },
          { href: "/admin/contas-pagar", label: "Contas a Pagar", icon: ReceiptText, permissao: "financeiroVer" },
          { href: "/admin/contas-receber", label: "Contas a Receber", icon: ArrowDownCircle, permissao: "financeiroVer" },
          { href: "/admin/comissoes-pagar", label: "Comissões a Pagar", icon: DollarSign, permissao: "financeiroVer" },
          { href: "/admin/relatorios", label: "Relatórios", icon: BarChart3, permissao: "financeiroVer" },
          { href: "/admin/meios-pagamento", label: "Meios de Pagamento", icon: Wallet, permissao: "configuracoesVer" },
        ],
      },
      {
        href: "/admin/automacoes",
        label: "Automações",
        icon: MessageSquare,
        permissao: "automacoesVer",
        children: [
          { href: "/admin/automacoes", label: "Configurar", icon: MessageSquare, permissao: "automacoesVer" },
          { href: "/admin/automacoes/fila", label: "Fila de Envios", icon: Send, permissao: "automacoesVer" },
        ],
      },
      { href: "/admin/whatsapp", label: "WhatsApp", icon: MessageCircle, permissao: "automacoesVer" },
      { href: "/admin/pipeline", label: "Pipeline", icon: KanbanSquare },
      {
        href: "/admin/bloqueios",
        label: "Bloqueios",
        icon: Lock,
        permissao: "agendamentosVer",
        children: [
          { href: "/admin/bloqueios", label: "Gerenciar Bloqueios", icon: Lock, permissao: "agendamentosVer" },
          { href: "/admin/relatorios/bloqueios", label: "Relatório de Bloqueios", icon: BarChart3, permissao: "agendamentosVer" },
        ],
      },
    ],
  },
  {
    label: "IA Inteligente",
    items: [
      { href: "/admin/insights", label: "Insights", icon: Brain, permissao: "__admin__" },
    ],
  },
  {
    label: "Sistema",
    items: [
      { href: "/admin/notificacoes", label: "Notificações", icon: Bell },
      { href: "/admin/importacao-inteligente", label: "Importar Dados", icon: Download, permissao: "configuracoesEditar" },
      { href: "/admin/configuracoes", label: "Configurações", icon: Settings, permissao: "configuracoesVer" },
      { href: "/admin/assinatura", label: "Assinatura", icon: CreditCard, permissao: "__admin__" },
      { href: "/admin/manual", label: "Manual do Sistema", icon: BookOpen },
    ],
  },
];

// Bottom nav: 5 atalhos mais usados no mobile
const bottomNav = [
  { href: "/admin", label: "Início", icon: Home, exact: true },
  { href: "/admin/calendario", label: "Agenda", icon: Calendar },
  { href: "/admin/agendamentos", label: "Atend.", icon: CalendarCheck },
  { href: "/admin/clientes", label: "Clientes", icon: Users },
  { href: "/admin/notificacoes", label: "Avisos", icon: Bell },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user: oauthUser, loading: oauthLoading, isAuthenticated: oauthAuth, logout: oauthLogout } = useAuth();
  const { user: systemUser, loading: systemLoading, isAuthenticated: systemAuth, login: systemLogin, logout: systemLogout, register: systemRegister } = useSystemAuth();
  const { pode, isOwner, isAdmin, hasFullAccess, permissoes: permsObj } = usePermissoes();
  const [location, navigate] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginSenha, setLoginSenha] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [showSenha, setShowSenha] = useState(false);
  const [modoLogin, setModoLogin] = useState<"login" | "cadastro">("login");
  const [cadastroNome, setCadastroNome] = useState("");
  const [cadastroEmail, setCadastroEmail] = useState("");
  const [cadastroSenha, setCadastroSenha] = useState("");
  const [cadastroConfirma, setCadastroConfirma] = useState("");
  const [cadastroLoading, setCadastroLoading] = useState(false);
  const [cadastroError, setCadastroError] = useState("");

  const isAuthenticated = oauthAuth || systemAuth;
  const loading = oauthLoading || systemLoading;
  const user = oauthUser || (systemUser ? { id: systemUser.id, name: systemUser.nome, email: systemUser.email, role: "user" as const, openId: `system_${systemUser.id}`, loginMethod: "email", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() } : null);

  // Buscar avatarUrl do perfil (apenas para system users)
  const { data: perfilData } = trpc.perfil.getMe.useQuery(undefined, {
    enabled: systemAuth && isAuthenticated,
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
  const avatarUrl = perfilData?.avatarUrl ?? null;

  const logout = async () => {
    if (systemAuth) await systemLogout();
    if (oauthAuth) await oauthLogout();
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setLoginLoading(true);
    const result = await systemLogin(loginEmail, loginSenha);
    setLoginLoading(false);
    if (!result.success) {
      setLoginError(result.error || "Erro ao fazer login");
    }
  };

  const handleCadastro = async (e: React.FormEvent) => {
    e.preventDefault();
    setCadastroError("");
    if (cadastroSenha !== cadastroConfirma) {
      setCadastroError("As senhas não coincidem");
      return;
    }
    if (cadastroSenha.length < 6) {
      setCadastroError("A senha deve ter pelo menos 6 caracteres");
      return;
    }
    setCadastroLoading(true);
    const result = await systemRegister(cadastroNome, cadastroEmail, cadastroSenha);
    setCadastroLoading(false);
    if (!result.success) {
      setCadastroError(result.error || "Erro ao criar conta");
    }
    // Se sucesso, o useSystemAuth já atualiza o estado e o redirect para onboarding acontece abaixo
  };

  const { data: notificacoes } = trpc.notificacoes.list.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchInterval: 30000,
  });

  const { data: notifPacotesCount } = trpc.pacotes.contarNaoLidas.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchInterval: 60000,
  });

  const { data: planStatus } = trpc.planos.getStatus.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const naoLidas = (notificacoes?.filter(n => !n.lida).length ?? 0) + (notifPacotesCount?.total ?? 0);

  // Status WhatsApp — poll a cada 30s para manter o ícone atualizado
  const { data: waStatus } = trpc.whatsapp.getStatus.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchInterval: 30000,
    staleTime: 15000,
  });
  const waConnected = waStatus?.status === "connected";
  const waPhoneNumber = waStatus?.phoneNumber ?? null;

  // Falhas recentes de automações — poll a cada 60s para badge no menu
  const { data: falhasAutomacoes } = trpc.automacoes.getFalhasRecentes.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchInterval: 60000,
    staleTime: 30000,
  });
  const totalFalhasAutomacoes = falhasAutomacoes?.total ?? 0;

  const getPlanColor = (plan?: string) => {
    switch (plan) {
      case "PRO": return "oklch(45% 0.15 160)";
      case "PLUS": return "oklch(60% 0.20 30)";
      case "SOLO": return "oklch(65% 0.18 170)";
      default: return "oklch(52% 0.016 260)";
    }
  };

  // Controla quais itens com submenu estão expandidos (deve ficar antes dos returns condicionais)
  const [expandedItems, setExpandedItems] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    navGroups.forEach(group => {
      group.items.forEach(item => {
        if (item.children && item.children.some(c => location.startsWith(c.href))) {
          initial.add(item.href);
        }
      });
    });
    return initial;
  });
  const toggleExpanded = (href: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(href)) next.delete(href);
      else next.add(href);
      return next;
    });
  };

  useEffect(() => { setSidebarOpen(false); }, [location]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-2xl gradient-primary flex items-center justify-center animate-pulse">
            <Calendar className="w-5 h-5 text-white" />
          </div>
          <p className="text-xs text-muted-foreground font-medium">Carregando...</p>
        </div>
      </div>
    );
  }

  // Redirect para onboarding se o usuário acabou de se cadastrar
  if (isAuthenticated && systemUser?.onboardingConcluido === false) {
    navigate("/onboarding");
    return null;
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex bg-background">
        {/* Painel esquerdo */}
        <div className="hidden lg:flex w-1/2 flex-col justify-between p-14 relative overflow-hidden"
          style={{ background: "oklch(16% 0.018 255)" }}>
          <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full opacity-15"
            style={{ background: "oklch(62% 0.16 225)" }} />
          <div className="absolute -bottom-20 -left-20 w-72 h-72 rounded-full opacity-10"
            style={{ background: "oklch(62% 0.18 145)" }} />
          <div className="relative">
            <div className="flex items-center gap-3 mb-16">
              <img
                src="https://d2xsxph8kpxj0f.cloudfront.net/310419663029250418/BkCt9rpSQdtCMrvdCmsRG4/hubly-logo-clean_9c312391.png"
                alt="Hubly"
                className="h-10 w-auto object-contain"
              />
            </div>
            <div className="space-y-5">
              <p className="text-xs font-semibold tracking-[0.18em] uppercase"
                style={{ color: "oklch(62% 0.16 225)" }}>
                Hub de Serviços Inteligentes
              </p>
              <h2 className="font-bold leading-tight"
                style={{ fontSize: "2.2rem", color: "oklch(95% 0.008 240)", letterSpacing: "-0.03em" }}>
                Gerencie seu negócio de forma inteligente
              </h2>
              <p className="text-sm leading-relaxed max-w-xs"
                style={{ color: "oklch(58% 0.025 255)" }}>
                Agendamentos, clientes, profissionais e financeiro em um único lugar.
              </p>
            </div>
          </div>
          <div className="relative flex gap-6">
            {[["500+", "Negócios"], ["98%", "Satisfação"], ["24/7", "Disponível"]].map(([val, label]) => (
              <div key={label}>
                <p className="text-white font-bold text-xl tracking-tight">{val}</p>
                <p className="text-xs" style={{ color: "oklch(50% 0.08 255)" }}>{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Painel direito — formulário de login */}
        <div className="flex-1 flex items-center justify-center px-8">
          <div className="w-full max-w-sm">
            <div className="flex items-center gap-2.5 mb-10 lg:hidden">
              <img
                src="https://d2xsxph8kpxj0f.cloudfront.net/310419663029250418/BkCt9rpSQdtCMrvdCmsRG4/hubly-logo-clean_9c312391.png"
                alt="Hubly"
                className="h-8 w-auto object-contain"
              />
            </div>
            {modoLogin === "login" ? (
              <>
                <div className="space-y-2 mb-8">
                  <h1 className="font-bold tracking-tight" style={{ fontSize: "1.8rem" }}>
                    Bem-vindo de volta
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Acesse o painel com seu e-mail e senha
                  </p>
                </div>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">E-mail</label>
                    <input
                      type="email"
                      value={loginEmail}
                      onChange={e => setLoginEmail(e.target.value)}
                      placeholder="seu@email.com"
                      required
                      className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">Senha</label>
                    <div className="relative">
                      <input
                        type={showSenha ? "text" : "password"}
                        value={loginSenha}
                        onChange={e => setLoginSenha(e.target.value)}
                        placeholder="Sua senha"
                        required
                        className="w-full px-4 py-3 pr-11 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
                      />
                      <button type="button" onClick={() => setShowSenha(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        {showSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  {loginError && (
                    <p className="text-sm text-red-500 bg-red-50 dark:bg-red-950/30 px-3 py-2 rounded-lg">{loginError}</p>
                  )}
                  <button
                    type="submit"
                    disabled={loginLoading}
                    className="btn-primary w-full justify-center py-3 text-sm rounded-xl"
                    style={{ display: "flex" }}>
                    {loginLoading ? "Entrando..." : "Entrar"}
                  </button>
                </form>
                <p className="text-center text-sm text-muted-foreground mt-6">
                  Ainda não tem conta?{" "}
                  <button
                    type="button"
                    onClick={() => { setModoLogin("cadastro"); setLoginError(""); }}
                    className="text-primary font-medium hover:underline">
                    Criar conta grátis
                  </button>
                </p>
              </>
            ) : (
              <>
                <div className="space-y-2 mb-8">
                  <h1 className="font-bold tracking-tight" style={{ fontSize: "1.8rem" }}>
                    Criar conta
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Configure sua plataforma em minutos
                  </p>
                </div>
                <form onSubmit={handleCadastro} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">Seu nome</label>
                    <input
                      type="text"
                      value={cadastroNome}
                      onChange={e => setCadastroNome(e.target.value)}
                      placeholder="Nome completo"
                      required
                      className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">E-mail</label>
                    <input
                      type="email"
                      value={cadastroEmail}
                      onChange={e => setCadastroEmail(e.target.value)}
                      placeholder="seu@email.com"
                      required
                      className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">Senha</label>
                    <input
                      type="password"
                      value={cadastroSenha}
                      onChange={e => setCadastroSenha(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      required
                      className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">Confirmar senha</label>
                    <input
                      type="password"
                      value={cadastroConfirma}
                      onChange={e => setCadastroConfirma(e.target.value)}
                      placeholder="Repita a senha"
                      required
                      className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
                    />
                  </div>
                  {cadastroError && (
                    <p className="text-sm text-red-500 bg-red-50 dark:bg-red-950/30 px-3 py-2 rounded-lg">{cadastroError}</p>
                  )}
                  <button
                    type="submit"
                    disabled={cadastroLoading}
                    className="btn-primary w-full justify-center py-3 text-sm rounded-xl"
                    style={{ display: "flex" }}>
                    {cadastroLoading ? "Criando conta..." : "Criar conta"}
                  </button>
                </form>
                <p className="text-center text-sm text-muted-foreground mt-6">
                  Já tem conta?{" "}
                  <button
                    type="button"
                    onClick={() => { setModoLogin("login"); setCadastroError(""); }}
                    className="text-primary font-medium hover:underline">
                    Fazer login
                  </button>
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return location === href;
    return location.startsWith(href);
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Overlay mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)} />
      )}

      {/*  Sidebar  */}
      <aside
        className={`
          fixed top-0 left-0 h-full z-50 w-64 flex flex-col
          transition-transform duration-300 ease-in-out
          lg:relative lg:translate-x-0 lg:z-auto lg:flex-shrink-0 lg:w-56
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        `}
        style={{ background: "oklch(16% 0.018 255)", borderRight: "1px solid oklch(22% 0.015 255)" }}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-4 py-4"
          style={{ borderBottom: "1px solid oklch(22% 0.015 255)" }}>
          <div className="flex items-center gap-2">
            <img
              src="https://d2xsxph8kpxj0f.cloudfront.net/310419663029250418/BkCt9rpSQdtCMrvdCmsRG4/hubly-logo-clean_9c312391.png"
              alt="Hubly"
              className="h-9 w-auto object-contain"
              style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.3))" }}
            />
          </div>
          <button onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 rounded-lg hover:bg-white/10 transition-colors"
            style={{ color: "oklch(58% 0.025 255)" }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-5">
          {navGroups.map((group) => {
            // Filtrar itens do grupo baseado nas permissões
            const visibleItems = group.items.filter(item => {
              if (!item.permissao) return true; // sem restrição = sempre visível
              return pode(item.permissao);
            });
            if (visibleItems.length === 0) return null;
            return (
            <div key={group.label}>
              <p className="px-2 mb-1.5 text-[10px] font-semibold tracking-[0.15em] uppercase"
                style={{ color: "oklch(48% 0.022 255)" }}>
                {group.label}
              </p>
              <div className="space-y-0.5">
                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  const hasChildren = !!(item.children && item.children.length > 0);
                  const isExpanded = expandedItems.has(item.href);
                  const isParentActive = hasChildren
                    ? item.children!.some(c => location.startsWith(c.href))
                    : isActive(item.href, item.exact);

                  if (hasChildren) {
                    return (
                      <div key={item.href}>
                        {/* Item pai expansível */}
                        <div
                          className="group flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-200 relative overflow-hidden"
                          style={{
                            background: isParentActive ? "oklch(55% 0.22 264 / 20%)" : "transparent",
                            color: isParentActive ? "oklch(78% 0.16 225)" : "oklch(58% 0.025 255)",
                            boxShadow: isParentActive ? "inset 3px 0 0 oklch(62% 0.18 225)" : "inset 3px 0 0 transparent",
                          }}
                          onClick={() => toggleExpanded(item.href)}
                          onMouseEnter={e => {
                            if (!isParentActive) {
                              const el = e.currentTarget as HTMLElement;
                              el.style.background = "oklch(24% 0.018 255)";
                              el.style.color = "oklch(88% 0.008 240)";
                              el.style.boxShadow = "inset 3px 0 0 oklch(62% 0.18 225 / 60%)";
                              el.style.transform = "translateX(2px)";
                            }
                          }}
                          onMouseLeave={e => {
                            if (!isParentActive) {
                              const el = e.currentTarget as HTMLElement;
                              el.style.background = "transparent";
                              el.style.color = "oklch(58% 0.025 255)";
                              el.style.boxShadow = "inset 3px 0 0 transparent";
                              el.style.transform = "translateX(0)";
                            }
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <Icon className="w-4 h-4 flex-shrink-0 transition-transform duration-200 group-hover:scale-110" />
                            <span className="text-sm font-medium">{item.label}</span>
                          </div>
                          <ChevronDown
                            className="w-3.5 h-3.5 flex-shrink-0 transition-transform duration-200"
                            style={{ transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)" }}
                          />
                        </div>
                        {/* Subitens */}
                        {isExpanded && (
                          <div className="mt-0.5 ml-3 pl-3 space-y-0.5" style={{ borderLeft: "1px solid oklch(26% 0.015 255)" }}>
                            {item.children!.filter(child => !child.permissao || pode(child.permissao)).map(child => {
                              const ChildIcon = child.icon;
                              const childActive = location === child.href || (child.href !== "/admin/financeiro" && location.startsWith(child.href));
                              return (
                                <Link key={child.href} href={child.href}>
                                  <div
                                    className="group flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer transition-all duration-200"
                                    style={{
                                      background: childActive ? "oklch(55% 0.22 264 / 15%)" : "transparent",
                                      color: childActive ? "oklch(72% 0.16 225)" : "oklch(50% 0.022 255)",
                                      boxShadow: childActive ? "inset 2px 0 0 oklch(62% 0.18 225 / 70%)" : "inset 2px 0 0 transparent",
                                    }}
                                    onMouseEnter={e => {
                                      if (!childActive) {
                                        const el = e.currentTarget as HTMLElement;
                                        el.style.background = "oklch(22% 0.016 255)";
                                        el.style.color = "oklch(82% 0.008 240)";
                                        el.style.boxShadow = "inset 2px 0 0 oklch(62% 0.18 225 / 40%)";
                                        el.style.transform = "translateX(2px)";
                                      }
                                    }}
                                    onMouseLeave={e => {
                                      if (!childActive) {
                                        const el = e.currentTarget as HTMLElement;
                                        el.style.background = "transparent";
                                        el.style.color = "oklch(50% 0.022 255)";
                                        el.style.boxShadow = "inset 2px 0 0 transparent";
                                        el.style.transform = "translateX(0)";
                                      }
                                    }}
                                  >
                                    <ChildIcon className="w-3.5 h-3.5 flex-shrink-0 transition-transform duration-200 group-hover:scale-110" />
                                    <span className="text-[13px] font-medium">{child.label}</span>
                                  </div>
                                </Link>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  }

                  // Item simples (sem filhos)
                  const active = isActive(item.href, item.exact);
                  return (
                    <Link key={item.href} href={item.href}>
                      <div
                        className="group flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-200 relative"
                        style={{
                          background: active ? "oklch(55% 0.22 264 / 20%)" : "transparent",
                          color: active ? "oklch(78% 0.16 225)" : "oklch(58% 0.025 255)",
                          boxShadow: active ? "inset 3px 0 0 oklch(62% 0.18 225)" : "inset 3px 0 0 transparent",
                        }}
                        onMouseEnter={e => {
                          if (!active) {
                            const el = e.currentTarget as HTMLElement;
                            el.style.background = "oklch(24% 0.018 255)";
                            el.style.color = "oklch(88% 0.008 240)";
                            el.style.boxShadow = "inset 3px 0 0 oklch(62% 0.18 225 / 60%)";
                            el.style.transform = "translateX(2px)";
                          }
                        }}
                        onMouseLeave={e => {
                          if (!active) {
                            const el = e.currentTarget as HTMLElement;
                            el.style.background = "transparent";
                            el.style.color = "oklch(58% 0.025 255)";
                            el.style.boxShadow = "inset 3px 0 0 transparent";
                            el.style.transform = "translateX(0)";
                          }
                        }}
                      >
                        <div className="flex items-center gap-3">
                          {/* Ícone com dot pulsante para WhatsApp */}
                          {item.href === "/admin/whatsapp" ? (
                            <div className="relative flex-shrink-0">
                              <Icon className="w-4 h-4 transition-transform duration-200 group-hover:scale-110"
                                style={{ color: waConnected ? "oklch(62% 0.22 145)" : undefined }} />
                              <span
                                className="absolute -bottom-0.5 -right-0.5 rounded-full"
                                style={{
                                  width: 6,
                                  height: 6,
                                  background: waConnected ? "oklch(62% 0.22 145)" : "oklch(55% 0.18 25)",
                                  boxShadow: "0 0 0 1.5px oklch(16% 0.018 255)",
                                  animation: waConnected ? "wa-pulse 2.4s ease-in-out infinite" : "none",
                                }}
                              />
                            </div>
                          ) : (
                            <Icon className="w-4 h-4 flex-shrink-0 transition-transform duration-200 group-hover:scale-110" />
                          )}
                          <span className="text-sm font-medium">{item.label}</span>
                        </div>
                        {item.href === "/admin/notificacoes" && naoLidas > 0 && (
                          <span className="text-[10px] rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center font-bold"
                            style={{ background: "oklch(62% 0.16 225)", color: "white" }}>
                            {naoLidas > 9 ? "9+" : naoLidas}
                          </span>
                        )}
                        {/* Badge vermelho no WhatsApp quando desconectado — apenas para admins/owners */}
                        {hasFullAccess && item.href === "/admin/whatsapp" && !waConnected && waStatus !== undefined && (
                          <span className="text-[9px] rounded-full px-1.5 py-0.5 font-bold leading-none"
                            style={{ background: "oklch(55% 0.18 25 / 20%)", color: "oklch(62% 0.20 25)" }}>
                            OFF
                          </span>
                        )}
                        {/* Badge de falhas de automações */}
                        {item.href === "/admin/automacoes" && totalFalhasAutomacoes > 0 && (
                          <span className="text-[9px] rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center font-bold"
                            style={{ background: "oklch(55% 0.22 25 / 15%)", color: "oklch(52% 0.22 25)" }}>
                            {totalFalhasAutomacoes > 9 ? "9+" : totalFalhasAutomacoes}
                          </span>
                        )}
                      </div>
                    </Link>
                  );
                 })}
              </div>
            </div>
            );
          })}
        </nav>

        {/* Suporte */}
        <div className="px-3 pb-2">
          <button
            onClick={() => {
              const event = new CustomEvent('open-support-chat');
              window.dispatchEvent(event);
            }}
            className="group w-full flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-200 text-left"
            style={{ color: "oklch(58% 0.025 255)", boxShadow: "inset 3px 0 0 transparent" }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLElement;
              el.style.background = "oklch(24% 0.018 255)";
              el.style.color = "oklch(88% 0.008 240)";
              el.style.boxShadow = "inset 3px 0 0 oklch(62% 0.18 225 / 60%)";
              el.style.transform = "translateX(2px)";
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLElement;
              el.style.background = "transparent";
              el.style.color = "oklch(58% 0.025 255)";
              el.style.boxShadow = "inset 3px 0 0 transparent";
              el.style.transform = "translateX(0)";
            }}
          >
            <Headphones className="w-4 h-4 flex-shrink-0 transition-transform duration-200 group-hover:scale-110" />
            <span className="text-sm font-medium">Suporte</span>
          </button>
        </div>

        {/* User */}
        <div className="px-3 py-3" style={{ borderTop: "1px solid oklch(22% 0.015 255)" }}>
          <div className="flex items-center gap-2.5 px-2.5 py-2.5 rounded-xl"
            style={{ background: "oklch(20% 0.016 255)" }}>
            <Link href="/admin/perfil" className="flex-shrink-0">
              <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity"
                style={{ background: avatarUrl ? 'transparent' : 'oklch(62% 0.16 225)' }}>
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[12px] font-bold text-white">
                    {user?.name?.charAt(0)?.toUpperCase() ?? "U"}
                  </span>
                )}
              </div>
            </Link>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold truncate" style={{ color: "oklch(90% 0.008 240)" }}>
                {user?.name?.split(" ")[0] ?? "Usuário"}
              </p>
              <p className="text-[11px] truncate" style={{ color: "oklch(48% 0.022 255)" }}>
                {user?.role === "admin" ? "Administrador" : "Profissional"}
              </p>
            </div>
            <Link href="/admin/perfil" title="Meu perfil"
              className="p-1.5 rounded-md transition-colors hover:bg-white/10"
              style={{ color: "oklch(48% 0.022 255)" }}>
              <UserCircle className="w-4 h-4" />
            </Link>
            <button onClick={logout} title="Sair"
              className="p-1.5 rounded-md transition-colors hover:bg-white/10"
              style={{ color: "oklch(48% 0.022 255)" }}>
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/*  Main  */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar mobile */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 sticky top-0 z-30"
          style={{ background: "white", borderBottom: "1px solid oklch(90% 0.012 250)" }}>
          <button onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-xl hover:bg-muted transition-colors -ml-1">
            <Menu className="w-5 h-5 text-foreground" />
          </button>
          <div className="flex items-center gap-2">
            <img
              src="https://d2xsxph8kpxj0f.cloudfront.net/310419663029250418/BkCt9rpSQdtCMrvdCmsRG4/hubly-logo-clean_9c312391.png"
              alt="Hubly"
              className="h-7 w-auto object-contain"
            />
          </div>
          <div className="flex items-center gap-3">
            {planStatus && (
              <Link href="/admin/assinatura">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full cursor-pointer hover:opacity-90 transition-all border"
                  style={{
                    background: getPlanColor(planStatus.plan) + "12",
                    borderColor: getPlanColor(planStatus.plan) + "30",
                    color: getPlanColor(planStatus.plan),
                  }}>
                  <CreditCard className="w-3 h-3" />
                  <span className="text-[11px] font-semibold tracking-wide">{planStatus.planLabel ?? planStatus.plan}</span>
                </div>
              </Link>
            )}
            {/* Ícone WhatsApp com status pulsante — apenas para admins/owners */}
            {hasFullAccess && <Link href="/admin/whatsapp" title={waConnected ? `WhatsApp conectado${waPhoneNumber ? ` — ${waPhoneNumber}` : ''}` : 'WhatsApp desconectado'}>
              <div className="relative p-2 rounded-xl hover:bg-muted transition-colors cursor-pointer">
                <MessageCircle className="w-5 h-5" style={{ color: waConnected ? "oklch(55% 0.22 145)" : "oklch(65% 0.015 255)" }} />
                {/* Dot de status */}
                <span
                  className="absolute bottom-1 right-1 rounded-full"
                  style={{
                    width: 8,
                    height: 8,
                    background: waConnected ? "oklch(62% 0.22 145)" : "oklch(55% 0.18 25)",
                    boxShadow: waConnected ? "0 0 0 2px white" : "0 0 0 2px white",
                    animation: waConnected ? "wa-pulse 2.4s ease-in-out infinite" : "none",
                  }}
                />
              </div>
            </Link>}
            <Link href="/admin/notificacoes">
              <div className="relative p-2 rounded-xl hover:bg-muted transition-colors cursor-pointer -mr-1">
                <Bell className="w-5 h-5 text-foreground" />
                {naoLidas > 0 && (
                  <span className="absolute top-1 right-1 text-white text-[9px] rounded-full w-4 h-4 flex items-center justify-center font-bold"
                    style={{ background: "oklch(62% 0.16 225)" }}>
                    {naoLidas > 9 ? "9+" : naoLidas}
                  </span>
                )}
              </div>
            </Link>
          </div>
        </header>

        {/* Page content — padding-bottom para não ficar atrás do bottom nav */}
        <main className="flex-1 overflow-auto pb-20 lg:pb-0">
          {children}
        </main>
      </div>

      {/*  Bottom Navigation Bar (mobile only)  */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 flex items-center"
        style={{
          background: "white",
          borderTop: "1px solid oklch(90% 0.012 250)",
          paddingBottom: "env(safe-area-inset-bottom)",
          boxShadow: "0 -4px 20px oklch(0% 0 0 / 8%)"
        }}>
        {bottomNav.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href, item.exact);
          const isNotif = item.href === "/admin/notificacoes";
          return (
            <Link key={item.href} href={item.href} className="flex-1">
              <div className="flex flex-col items-center justify-center py-2.5 gap-1 cursor-pointer transition-all relative">
                <div className="relative">
                  <Icon
                    className="w-5 h-5 transition-all"
                    style={{ color: active ? "oklch(62% 0.16 225)" : "oklch(58% 0.025 255)" }}
                    strokeWidth={active ? 2.5 : 1.8}
                  />
                  {isNotif && naoLidas > 0 && (
                    <span className="absolute -top-1 -right-1.5 text-white text-[8px] rounded-full w-3.5 h-3.5 flex items-center justify-center font-bold"
                      style={{ background: "oklch(62% 0.16 225)" }}>
                      {naoLidas > 9 ? "9+" : naoLidas}
                    </span>
                  )}
                </div>
                <span
                  className="text-[10px] font-medium leading-none"
                  style={{ color: active ? "oklch(62% 0.16 225)" : "oklch(58% 0.025 255)" }}>
                  {item.label}
                </span>
                {active && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full"
                    style={{ background: "oklch(62% 0.16 225)" }} />
                )}
              </div>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
