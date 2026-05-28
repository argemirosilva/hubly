import { useLocation } from "wouter";
import NovaAgendaModal from "@/components/NovaAgendaModal";

/**
 * Página full-screen de novo agendamento (usada no mobile via botão +).
 * No mobile: o modal ocupa toda a tela (inlinePage=true).
 * No desktop: o modal aparece centralizado como de costume.
 */
export default function NovoAgendamento() {
  const [, navigate] = useLocation();

  return (
    <NovaAgendaModal
      open={true}
      onClose={() => navigate("/admin/agendamentos")}
      inlinePage={true}
    />
  );
}
