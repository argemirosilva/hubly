import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import {
  BarChart3, Bell, Calendar, ChevronRight, CreditCard, Home,
  LogOut, Menu, MessageSquare, Settings, Scissors, Users, X, Lock, Layers
} from "lucide-react";
import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: Home, exact: true },
  { href: "/admin/calendario", label: "Calendário", icon: Calendar },
  { href: "/admin/agendamentos", label: "Agendamentos", icon: Layers },
  { href: "/admin/clientes", label: "Clientes", icon: Users },
  { href: "/admin/profissionais", label: "Profissionais", icon: Scissors },
  { href: "/admin/servicos", label: "Serviços", icon: Layers },
  { href: "/admin/financeiro", label: "Financeiro", icon: CreditCard },
  { href: "/admin/automacoes", label: "Automações", icon: MessageSquare },
  { href: "/admin/bloqueios", label: "Bloqueios", icon: Lock },
  { href: "/admin/notificacoes", label: "Notificações", icon: Bell },
  { href: "/admin/configuracoes", label: "Configurações", icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { data: notificacoes } = trpc.notificacoes.list.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchInterval: 30000,
  });

  const naoLidas = notificacoes?.filter(n => !n.lida).length ?? 0;

  useEffect(() => {
    setSidebarOpen(false);
  }, [location]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-sm mx-auto px-6">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Scissors className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-semibold text-foreground mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
            Agendei
          </h1>
          <p className="text-muted-foreground text-sm mb-6">
            Sistema de gestão inteligente para o seu negócio
          </p>
          <a href={getLoginUrl()} className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
            Entrar no Sistema
          </a>
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
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full z-50 w-64 flex flex-col
          transition-transform duration-300 ease-in-out
          lg:relative lg:translate-x-0 lg:z-auto
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        `}
        style={{ background: "oklch(0.17 0.012 250)" }}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-5 py-5 border-b" style={{ borderColor: "oklch(0.28 0.012 250)" }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
              <Scissors className="w-4 h-4 text-white" />
            </div>
            <span className="text-white font-semibold text-lg" style={{ fontFamily: "'Playfair Display', serif" }}>
              Agendei
            </span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-white/60 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          <div className="space-y-0.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href, item.exact);
              return (
                <Link key={item.href} href={item.href}>
                  <div
                    className={`
                      flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer
                      transition-all duration-150 group
                      ${active
                        ? "bg-white/10 text-white"
                        : "text-white/60 hover:text-white hover:bg-white/5"
                      }
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 flex-shrink-0 ${active ? "text-white" : "text-white/50 group-hover:text-white/80"}`} />
                      <span className="text-sm font-medium">{item.label}</span>
                    </div>
                    {item.href === "/admin/notificacoes" && naoLidas > 0 && (
                      <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
                        {naoLidas > 9 ? "9+" : naoLidas}
                      </span>
                    )}
                    {active && <ChevronRight className="w-3 h-3 text-white/40" />}
                  </div>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* User info */}
        <div className="px-3 py-4 border-t" style={{ borderColor: "oklch(0.28 0.012 250)" }}>
          <div className="flex items-center gap-3 px-2 py-2 rounded-lg">
            <Avatar className="w-8 h-8">
              <AvatarFallback className="bg-white/10 text-white text-xs font-medium">
                {user?.name?.charAt(0)?.toUpperCase() ?? "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{user?.name ?? "Usuário"}</p>
              <p className="text-white/40 text-xs truncate">{user?.email ?? ""}</p>
            </div>
            <button
              onClick={logout}
              className="text-white/40 hover:text-white/80 transition-colors"
              title="Sair"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar mobile */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-card border-b border-border sticky top-0 z-30">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <Menu className="w-5 h-5 text-foreground" />
          </button>
          <span className="font-semibold text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>
            Agendei
          </span>
          <Link href="/admin/notificacoes">
            <div className="relative p-2 rounded-lg hover:bg-muted transition-colors cursor-pointer">
              <Bell className="w-5 h-5 text-foreground" />
              {naoLidas > 0 && (
                <span className="absolute top-1 right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                  {naoLidas}
                </span>
              )}
            </div>
          </Link>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
