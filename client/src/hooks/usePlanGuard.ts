/**
 * usePlanGuard
 * Hook que verifica se a assinatura está cancelada e bloqueia ações de criação.
 * Quando o plano está cancelado (status "canceled"), redireciona para /admin/assinatura
 * com uma mensagem clara explicando o motivo.
 */
import { useLocation } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

export type PlanGuardModule =
  | "agendamento"
  | "cliente"
  | "profissional"
  | "conta_pagar"
  | "conta_receber";

const MODULE_LABELS: Record<PlanGuardModule, string> = {
  agendamento: "agendamentos",
  cliente: "clientes",
  profissional: "profissionais",
  conta_pagar: "contas a pagar",
  conta_receber: "contas a receber",
};

export function usePlanGuard() {
  const [, navigate] = useLocation();
  const { data: planStatus } = trpc.planos.getStatus.useQuery(undefined, {
    staleTime: 60_000,
    retry: 1,
  });

  /**
   * Verifica se a ação é permitida.
   * - Se o plano estiver cancelado (status "canceled"), bloqueia e redireciona.
   * - Caso contrário, executa o callback normalmente.
   */
  function guard(module: PlanGuardModule, onAllowed: () => void) {
    const status = planStatus?.status;

    if (status === "canceled") {
      const label = MODULE_LABELS[module];
      toast.error(
        `Assinatura cancelada — não é possível adicionar novos ${label}`,
        {
          description: "Reative sua assinatura para continuar usando todos os recursos.",
          action: {
            label: "Reativar agora",
            onClick: () => navigate("/admin/assinatura"),
          },
          duration: 6000,
        }
      );
      navigate("/admin/assinatura");
      return;
    }

    onAllowed();
  }

  const isCanceled = planStatus?.status === "canceled";

  return { guard, isCanceled, planStatus };
}
