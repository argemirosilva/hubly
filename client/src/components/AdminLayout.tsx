import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import {
  Bell, Calendar, CalendarCheck, CreditCard,
  LayoutDashboard, LogOut, Menu, MessageSquare, MessageCircle, Settings,
  UserCog, Users, X, Lock, Sparkles, Shield, Home, Download, KanbanSquare, Brain, BookOpen, Package, Gem, Headphones, Eye, EyeOff, UserCircle
} from "lucide-react";
import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useSystemAuth } from "@/_core/hooks/useSystemAuth";

const navGroups = [
  {
    label: "Principal",
    items: [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
      { href: "/admin/calendario", label: "Calendário", icon: Calendar },
      { href: "/admin/agendamentos", label: "Agendamentos", icon: CalendarCheck },
    ],
  },
  {
    label: "Gestão",
    items: [
      { href: "/admin/clientes", label: "Clientes", icon: Users },
      { href: "/admin/equipe", label: "Equipe", icon: UserCog },
      { href: "/admin/servicos", label: "Serviços", icon: Sparkles },
      { href: "/admin/pacotes", label: "Pacotes", icon: Package },
    ],
  },
  {
    label: "Operações",
    items: [
      { href: "/admin/financeiro", label: "Financeiro", icon: CreditCard },
      { href: "/admin/automacoes", label: "Automações", icon: MessageSquare },
      { href: "/admin/whatsapp", label: "WhatsApp", icon: MessageCircle },
      { href: "/admin/pipeline", label: "Pipeline", icon: KanbanSquare },
      { href: "/admin/bloqueios", label: "Bloqueios", icon: Lock },
    ],
  },
  {
    label: "IA Inteligente",
    items: [
      { href: "/admin/ia-financeiro", label: "IA Financeira", icon: Brain },
      { href: "/admin/ia-clientes", label: "IA Clientes", icon: Users },
    ],
  },
  {
    label: "Sistema",
    items: [
      { href: "/admin/notificacoes", label: "Notificações", icon: Bell },
      { href: "/admin/importacao", label: "Importar Zandu", icon: Download },
      { href: "/admin/configuracoes", label: "Configurações", icon: Settings },
      { href: "/admin/planos", label: "Planos", icon: Gem },
      { href: "/admin/assinatura", label: "Minha Assinatura", icon: CreditCard },
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
  const { user: systemUser, loading: systemLoading, isAuthenticated: systemAuth, login: systemLogin, logout: systemLogout } = useSystemAuth();
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginSenha, setLoginSenha] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [showSenha, setShowSenha] = useState(false);

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

  const getPlanColor = (plan?: string) => {
    switch (plan) {
      case "PRO": return "oklch(45% 0.15 160)";
      case "PLUS": return "oklch(60% 0.20 30)";
      case "SOLO": return "oklch(65% 0.18 170)";
      default: return "oklch(52% 0.016 260)";
    }
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

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex bg-background">
        {/* Painel esquerdo */}
        <div className="hidden lg:flex w-1/2 flex-col justify-between p-14 relative overflow-hidden"
          style={{ background: "oklch(12% 0.020 260)" }}>
          <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full opacity-10"
            style={{ background: "oklch(55% 0.22 264)" }} />
          <div className="absolute -bottom-20 -left-20 w-72 h-72 rounded-full opacity-5"
            style={{ background: "oklch(60% 0.20 300)" }} />
          <div className="relative">
            <div className="flex items-center gap-3 mb-16">
              <span className="text-white font-bold text-2xl tracking-tight">Agendei</span>
            </div>
            <div className="space-y-5">
              <p className="text-xs font-semibold tracking-[0.18em] uppercase"
                style={{ color: "oklch(55% 0.22 264)" }}>
                Plataforma de Agendamentos
              </p>
              <h2 className="font-bold leading-tight"
                style={{ fontSize: "2.2rem", color: "oklch(95% 0.008 250)", letterSpacing: "-0.03em" }}>
                Gerencie seu negócio de forma inteligente
              </h2>
              <p className="text-sm leading-relaxed max-w-xs"
                style={{ color: "oklch(50% 0.012 260)" }}>
                Agendamentos, clientes, profissionais e financeiro em um único lugar.
              </p>
            </div>
          </div>
          <div className="relative flex gap-6">
            {[["500+", "Negócios"], ["98%", "Satisfação"], ["24/7", "Disponível"]].map(([val, label]) => (
              <div key={label}>
                <p className="text-white font-bold text-xl tracking-tight">{val}</p>
                <p className="text-xs" style={{ color: "oklch(45% 0.012 260)" }}>{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Painel direito — formulário de login */}
        <div className="flex-1 flex items-center justify-center px-8">
          <div className="w-full max-w-sm">
            <div className="flex items-center gap-2.5 mb-10 lg:hidden">
              <div className="w-8 h-8 rounded-xl gradient-primary flex items-center justify-center">
                <Calendar className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-lg tracking-tight">Agendei</span>
            </div>
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
        style={{ background: "oklch(12% 0.020 260)", borderRight: "1px solid oklch(20% 0.018 260)" }}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-4 py-4"
          style={{ borderBottom: "1px solid oklch(20% 0.018 260)" }}>
          <div className="flex items-center gap-2.5">
            <span className="font-bold text-white tracking-tight">Agendei</span>
          </div>
          <button onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 rounded-lg hover:bg-white/10 transition-colors"
            style={{ color: "oklch(50% 0.012 260)" }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-5">
          {navGroups.map((group) => (
            <div key={group.label}>
              <p className="px-2 mb-1.5 text-[10px] font-semibold tracking-[0.15em] uppercase"
                style={{ color: "oklch(35% 0.012 260)" }}>
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href, item.exact);
                  return (
                    <Link key={item.href} href={item.href}>
                      <div
                        className="flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-150"
                        style={{
                          background: active ? "oklch(55% 0.22 264 / 18%)" : "transparent",
                          color: active ? "oklch(75% 0.18 264)" : "oklch(52% 0.012 260)",
                        }}
                        onMouseEnter={e => {
                          if (!active) {
                            (e.currentTarget as HTMLElement).style.background = "oklch(20% 0.018 260)";
                            (e.currentTarget as HTMLElement).style.color = "oklch(80% 0.010 250)";
                          }
                        }}
                        onMouseLeave={e => {
                          if (!active) {
                            (e.currentTarget as HTMLElement).style.background = "transparent";
                            (e.currentTarget as HTMLElement).style.color = "oklch(52% 0.012 260)";
                          }
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className="w-4 h-4 flex-shrink-0" />
                          <span className="text-sm font-medium">{item.label}</span>
                        </div>
                        {item.href === "/admin/notificacoes" && naoLidas > 0 && (
                          <span className="text-[10px] rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center font-bold"
                            style={{ background: "oklch(55% 0.22 264)", color: "white" }}>
                            {naoLidas > 9 ? "9+" : naoLidas}
                          </span>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Suporte */}
        <div className="px-3 pb-2">
          <button
            onClick={() => {
              const event = new CustomEvent('open-support-chat');
              window.dispatchEvent(event);
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-150 text-left"
            style={{ color: "oklch(52% 0.012 260)" }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background = "oklch(20% 0.018 260)";
              (e.currentTarget as HTMLElement).style.color = "oklch(80% 0.010 250)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = "transparent";
              (e.currentTarget as HTMLElement).style.color = "oklch(52% 0.012 260)";
            }}
          >
            <Headphones className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm font-medium">Suporte</span>
          </button>
        </div>

        {/* User */}
        <div className="px-3 py-3" style={{ borderTop: "1px solid oklch(20% 0.018 260)" }}>
          <div className="flex items-center gap-2.5 px-2.5 py-2.5 rounded-xl"
            style={{ background: "oklch(18% 0.018 260)" }}>
            <Link href="/admin/perfil" className="flex-shrink-0">
              <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity"
                style={{ background: avatarUrl ? 'transparent' : 'oklch(55% 0.22 264)' }}>
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
              <p className="text-[13px] font-semibold truncate" style={{ color: "oklch(88% 0.010 250)" }}>
                {user?.name?.split(" ")[0] ?? "Usuário"}
              </p>
              <p className="text-[11px] truncate" style={{ color: "oklch(40% 0.010 260)" }}>
                {user?.role === "admin" ? "Administrador" : "Profissional"}
              </p>
            </div>
            <Link href="/admin/perfil" title="Meu perfil"
              className="p-1.5 rounded-md transition-colors hover:bg-white/10"
              style={{ color: "oklch(40% 0.010 260)" }}>
              <UserCircle className="w-4 h-4" />
            </Link>
            <button onClick={logout} title="Sair"
              className="p-1.5 rounded-md transition-colors hover:bg-white/10"
              style={{ color: "oklch(40% 0.010 260)" }}>
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
            <div className="w-7 h-7 rounded-lg gradient-primary flex items-center justify-center">
              <Calendar className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-sm tracking-tight">Agendei</span>
          </div>
          <div className="flex items-center gap-3">
            {planStatus && (
              <Link href="/admin/assinatura">
                <div className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white cursor-pointer hover:opacity-80 transition-opacity"
                  style={{ background: getPlanColor(planStatus.plan) }}>
                  Plano {planStatus.plan}
                </div>
              </Link>
            )}
            <Link href="/admin/notificacoes">
              <div className="relative p-2 rounded-xl hover:bg-muted transition-colors cursor-pointer -mr-1">
                <Bell className="w-5 h-5 text-foreground" />
                {naoLidas > 0 && (
                  <span className="absolute top-1 right-1 text-white text-[9px] rounded-full w-4 h-4 flex items-center justify-center font-bold"
                    style={{ background: "oklch(55% 0.22 264)" }}>
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
                    style={{ color: active ? "oklch(55% 0.22 264)" : "oklch(55% 0.010 260)" }}
                    strokeWidth={active ? 2.5 : 1.8}
                  />
                  {isNotif && naoLidas > 0 && (
                    <span className="absolute -top-1 -right-1.5 text-white text-[8px] rounded-full w-3.5 h-3.5 flex items-center justify-center font-bold"
                      style={{ background: "oklch(55% 0.22 264)" }}>
                      {naoLidas > 9 ? "9+" : naoLidas}
                    </span>
                  )}
                </div>
                <span
                  className="text-[10px] font-medium leading-none"
                  style={{ color: active ? "oklch(55% 0.22 264)" : "oklch(55% 0.010 260)" }}>
                  {item.label}
                </span>
                {active && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full"
                    style={{ background: "oklch(55% 0.22 264)" }} />
                )}
              </div>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
