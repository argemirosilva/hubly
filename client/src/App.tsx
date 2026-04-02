import { Toaster } from "@/components/ui/sonner";
import { PWAInstallBanner } from "./components/PWAInstallBanner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, Redirect } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Dashboard from "./pages/Dashboard";
import Calendario from "./pages/Calendario";
import Clientes from "./pages/Clientes";
import ClienteDetalhe from "./pages/ClienteDetalhe";
import Profissionais from "./pages/Profissionais";
import Servicos from "./pages/Servicos";
import Agendamentos from "./pages/Agendamentos";
import Financeiro from "./pages/Financeiro";
import Automacoes from "./pages/Automacoes";
import Configuracoes from "./pages/Configuracoes";
import Notificacoes from "./pages/Notificacoes";
import Bloqueios from "./pages/Bloqueios";
import PortalCliente from "./pages/PortalCliente";
import Setup from "./pages/Setup";
import Usuarios from "./pages/Usuarios";
import ImportacaoZandu from "./pages/ImportacaoZandu";
import Pipeline from "./pages/Pipeline";
import IAFinanceiro from "./pages/IAFinanceiro";
import IAClientes from "./pages/IAClientes";
import Manual from "./pages/Manual";
import Pacotes from "./pages/Pacotes";
import Planos from "./pages/Planos";
import { SupportChat } from "./components/SupportChat";
import AdminLayout from "./components/AdminLayout";
import { ReactNode } from "react";

function WithAdmin({ children }: { children: ReactNode }) {
  return (
    <AdminLayout>
      <SupportChat />
      {children}
    </AdminLayout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/">{() => <Redirect to="/admin" />}</Route>
      <Route path="/agendar" component={PortalCliente} />
      <Route path="/setup" component={Setup} />

      {/* Rotas admin — todas no mesmo Switch para garantir matching correto */}
      <Route path="/admin/clientes/:id">{(p) => <WithAdmin><ClienteDetalhe id={Number(p.id)} /></WithAdmin>}</Route>
      <Route path="/admin/calendario">{() => <WithAdmin><Calendario /></WithAdmin>}</Route>
      <Route path="/admin/agendamentos">{() => <WithAdmin><Agendamentos /></WithAdmin>}</Route>
      <Route path="/admin/clientes">{() => <WithAdmin><Clientes /></WithAdmin>}</Route>
      <Route path="/admin/profissionais">{() => <WithAdmin><Profissionais /></WithAdmin>}</Route>
      <Route path="/admin/servicos">{() => <WithAdmin><Servicos /></WithAdmin>}</Route>
      <Route path="/admin/financeiro">{() => <WithAdmin><Financeiro /></WithAdmin>}</Route>
      <Route path="/admin/automacoes">{() => <WithAdmin><Automacoes /></WithAdmin>}</Route>
      <Route path="/admin/notificacoes">{() => <WithAdmin><Notificacoes /></WithAdmin>}</Route>
      <Route path="/admin/bloqueios">{() => <WithAdmin><Bloqueios /></WithAdmin>}</Route>
      <Route path="/admin/configuracoes">{() => <WithAdmin><Configuracoes /></WithAdmin>}</Route>
      <Route path="/admin/usuarios">{() => <WithAdmin><Usuarios /></WithAdmin>}</Route>
      <Route path="/admin/pipeline">{() => <WithAdmin><Pipeline /></WithAdmin>}</Route>
      <Route path="/admin/importacao">{() => <WithAdmin><ImportacaoZandu /></WithAdmin>}</Route>
      <Route path="/admin/ia-financeiro">{() => <WithAdmin><IAFinanceiro /></WithAdmin>}</Route>
      <Route path="/admin/ia-clientes">{() => <WithAdmin><IAClientes /></WithAdmin>}</Route>
      <Route path="/admin/manual">{() => <WithAdmin><Manual /></WithAdmin>}</Route>
      <Route path="/admin/pacotes">{() => <WithAdmin><Pacotes /></WithAdmin>}</Route>
      <Route path="/admin/planos">{() => <WithAdmin><Planos /></WithAdmin>}</Route>
      <Route path="/admin">{() => <WithAdmin><Dashboard /></WithAdmin>}</Route>

      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster richColors position="top-right" />
          <PWAInstallBanner />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
