import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
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
import AdminLayout from "./components/AdminLayout";

function AdminRoutes() {
  return (
    <AdminLayout>
      <Switch>
        <Route path="/admin" component={Dashboard} />
        <Route path="/admin/calendario" component={Calendario} />
        <Route path="/admin/agendamentos" component={Agendamentos} />
        <Route path="/admin/clientes" component={Clientes} />
        <Route path="/admin/clientes/:id" component={ClienteDetalhe} />
        <Route path="/admin/profissionais" component={Profissionais} />
        <Route path="/admin/servicos" component={Servicos} />
        <Route path="/admin/financeiro" component={Financeiro} />
        <Route path="/admin/automacoes" component={Automacoes} />
        <Route path="/admin/notificacoes" component={Notificacoes} />
        <Route path="/admin/bloqueios" component={Bloqueios} />
        <Route path="/admin/configuracoes" component={Configuracoes} />
        <Route component={NotFound} />
      </Switch>
    </AdminLayout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={PortalCliente} />
      <Route path="/agendar" component={PortalCliente} />
      <Route path="/setup" component={Setup} />
      <Route path="/admin" component={AdminRoutes} />
      <Route path="/admin/:rest*" component={AdminRoutes} />
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
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
