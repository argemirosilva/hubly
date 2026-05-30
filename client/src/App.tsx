import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
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
import Equipe from "./pages/Equipe";
import Servicos from "./pages/Servicos";
import Agendamentos from "./pages/Agendamentos";
import Financeiro from "./pages/Financeiro";
import Automacoes from "./pages/Automacoes";
import Configuracoes from "./pages/Configuracoes";
import Notificacoes from "./pages/Notificacoes";
import Bloqueios from "./pages/Bloqueios";
import RelatoriosBloqueios from "./pages/admin/RelatoriosBloqueios";
import PortalCliente from "./pages/PortalCliente";
import Setup from "./pages/Setup";
import Usuarios from "./pages/Usuarios";
import ImportacaoZandu from "./pages/ImportacaoZandu";
import ImportacaoInteligente from "./pages/ImportacaoInteligente";
import Pipeline from "./pages/Pipeline";
import IAFinanceiro from "./pages/IAFinanceiro";
import ContasPagar from "./pages/ContasPagar";
import ContasReceber from "./pages/ContasReceber";
import IAClientes from "./pages/IAClientes";
import Insights from "./pages/Insights";
import Manual from "./pages/Manual";
import Pacotes from "./pages/Pacotes";
import WhatsAppPage from "./pages/WhatsApp";
import Planos from "./pages/Planos";
import PlanosSuccesso from "./pages/PlanosSuccesso";
import Assinatura from "./pages/Assinatura";
import ConfirmarAgendamento from "./pages/ConfirmarAgendamento";
import Perfil from "./pages/Perfil";
import MeiosPagamento from "./pages/MeiosPagamento";
import ComissoesPagar from "./pages/ComissoesPagar";
import Relatorios from "./pages/Relatorios";
import FilaAutomacoes from "./pages/FilaAutomacoes";
import Onboarding from "./pages/Onboarding";
import PoliticaPrivacidade from "./pages/PoliticaPrivacidade";
import PainelOrizontech from "./pages/orizontech/PainelOrizontech";
import Suporte from "./pages/Suporte";
import SuporteAdmin from "./pages/SuporteAdmin";
import Atendimento from "./pages/Atendimento";
import PreAgendamentosPendentes from "./pages/PreAgendamentosPendentes";
import NovoAgendamento from "./pages/NovoAgendamento";
import { SupportChat } from "./components/SupportChat";
import { OfflineIndicator } from "./components/OfflineIndicator";
import { useMobileApp } from "./hooks/useMobileApp";
import AdminLayout from "./components/AdminLayout";
import { PlanLimitAlert } from "./components/PlanLimitAlert";
import { ReactNode, useEffect } from "react";

function WithAdmin({ children }: { children: ReactNode }) {
  return (
    <AdminLayout>
      <PlanLimitAlert />
      <SupportChat />
      {children}
    </AdminLayout>
  );
}

function MobileAppInit() {
  useMobileApp();
  return null;
}

function Router() {
  return (
    <Switch>
      <Route path="/">{() => <Redirect to="/admin" />}</Route>
      <Route path="/agendar" component={PortalCliente} />
      <Route path="/agendar/:slug" component={PortalCliente} />
      <Route path="/setup" component={Setup} />
      <Route path="/confirmar/:token" component={ConfirmarAgendamento} />
      <Route path="/onboarding" component={Onboarding} />
      <Route path="/politica-de-privacidade" component={PoliticaPrivacidade} />

      {/* Rotas admin — todas no mesmo Switch para garantir matching correto */}
      <Route path="/admin/clientes/:id">{(p) => <WithAdmin><ClienteDetalhe id={Number(p.id)} /></WithAdmin>}</Route>
      <Route path="/admin/calendario">{() => <WithAdmin><Calendario /></WithAdmin>}</Route>
      <Route path="/admin/agendamentos">{() => <WithAdmin><Agendamentos /></WithAdmin>}</Route>
      <Route path="/admin/clientes">{() => <WithAdmin><Clientes /></WithAdmin>}</Route>
      <Route path="/admin/profissionais">{() => <WithAdmin><Profissionais /></WithAdmin>}</Route>
      <Route path="/admin/equipe">{() => <WithAdmin><Equipe /></WithAdmin>}</Route>
      <Route path="/admin/servicos">{() => <WithAdmin><Servicos /></WithAdmin>}</Route>
      <Route path="/admin/financeiro">{() => <WithAdmin><Financeiro /></WithAdmin>}</Route>
      <Route path="/admin/automacoes">{() => <WithAdmin><Automacoes /></WithAdmin>}</Route>
      <Route path="/admin/notificacoes">{() => <WithAdmin><Notificacoes /></WithAdmin>}</Route>
      <Route path="/admin/bloqueios">{() => <WithAdmin><Bloqueios /></WithAdmin>}</Route>
      <Route path="/admin/relatorios/bloqueios">{() => <WithAdmin><RelatoriosBloqueios /></WithAdmin>}</Route>
      <Route path="/admin/configuracoes">{() => <WithAdmin><Configuracoes /></WithAdmin>}</Route>
      <Route path="/admin/usuarios">{() => <WithAdmin><Usuarios /></WithAdmin>}</Route>
      <Route path="/admin/pipeline">{() => <WithAdmin><Pipeline /></WithAdmin>}</Route>
      <Route path="/admin/importacao">{() => <WithAdmin><ImportacaoZandu /></WithAdmin>}</Route>
      <Route path="/admin/importacao-inteligente">{() => <WithAdmin><ImportacaoInteligente /></WithAdmin>}</Route>
      <Route path="/admin/ia-financeiro">{() => <Redirect to="/admin/insights" />}</Route>
      <Route path="/admin/contas-pagar">{() => <WithAdmin><ContasPagar /></WithAdmin>}</Route>
      <Route path="/admin/contas-receber">{() => <WithAdmin><ContasReceber /></WithAdmin>}</Route>
      <Route path="/admin/ia-clientes">{() => <Redirect to="/admin/insights" />}</Route>
      <Route path="/admin/insights">{() => <WithAdmin><Insights /></WithAdmin>}</Route>
      <Route path="/admin/manual">{() => <WithAdmin><Manual /></WithAdmin>}</Route>
      <Route path="/admin/suporte">{() => <WithAdmin><Suporte /></WithAdmin>}</Route>
      <Route path="/admin/pacotes">{() => <WithAdmin><Pacotes /></WithAdmin>}</Route>
      <Route path="/admin/whatsapp">{() => <WithAdmin><WhatsAppPage /></WithAdmin>}</Route>
      <Route path="/admin/planos">{() => <WithAdmin><Planos /></WithAdmin>}</Route>
      <Route path="/admin/planos/sucesso">{() => <WithAdmin><PlanosSuccesso /></WithAdmin>}</Route>
      <Route path="/admin/assinatura">{() => <WithAdmin><Assinatura /></WithAdmin>}</Route>
      <Route path="/admin/perfil">{() => <WithAdmin><Perfil /></WithAdmin>}</Route>
      <Route path="/admin/meios-pagamento">{() => <WithAdmin><MeiosPagamento /></WithAdmin>}</Route>
      <Route path="/admin/comissoes-pagar">{() => <WithAdmin><ComissoesPagar /></WithAdmin>}</Route>
      <Route path="/admin/relatorios">{() => <WithAdmin><Relatorios /></WithAdmin>}</Route>
      <Route path="/admin/automacoes/fila">{() => <WithAdmin><FilaAutomacoes /></WithAdmin>}</Route>
      <Route path="/admin/pre-agendamentos">{() => <WithAdmin><PreAgendamentosPendentes /></WithAdmin>}</Route>
      <Route path="/admin/novo-agendamento">{() => <WithAdmin><NovoAgendamento /></WithAdmin>}</Route>
      <Route path="/admin">{() => <WithAdmin><Dashboard /></WithAdmin>}</Route>

      <Route path="/orizontech">{() => <PainelOrizontech />}</Route>
      <Route path="/suporte-admin">{() => <SuporteAdmin />}</Route>
      <Route path="/atendimento">{() => <Atendimento />}</Route>
      {/* Alias curto para criar atalho no celular: hubly.orizontech.com.br/ca */}
      <Route path="/ca">{() => <Redirect to="/atendimento" />}</Route>
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  useEffect(() => {
    document.title = "Hubly - Gestão de Agendamentos e Clientes";
  }, []);

  // Listener para atualização do Service Worker
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'SW_UPDATED') {
        toast.info('Nova versão disponível', {
          description: 'Atualize para a versão mais recente do Hubly.',
          action: { label: 'Atualizar', onClick: () => window.location.reload() },
          duration: 15000,
        });
      }
    };
    navigator.serviceWorker.addEventListener('message', handler);
    return () => navigator.serviceWorker.removeEventListener('message', handler);
  }, []);
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster richColors position="top-right" />
          <OfflineIndicator />
          <MobileAppInit />
          <PWAInstallBanner />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
