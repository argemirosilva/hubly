/**
 * usePlanGuard
 * Hook que verifica se a assinatura está cancelada ou suspensa e bloqueia ações de criação.
 * - "suspended": trial expirou sem assinatura → bloqueia criação, dados preservados para leitura
 * - "canceled": assinatura cancelada → redireciona para /admin/assinatura
 */
import { useLocation } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

export type PlanGuardModule =
  | "agendamento"
  | "cliente"
  | "profissional"
  | "conta_pagar"
  | "conta_receber"
  | "servico"
  | "usuario"
  | "automacao";

const MODULE_LABELS: Record<PlanGuardModule, string> = {
  agendamento: "agendamentos",
  cliente: "clientes",
  profissional: "profissionais",
  conta_pagar: "contas a pagar",
  conta_receber: "contas a receber",
  servico: "serviços",
  usuario: "usuários",
  automacao: "automações",
};

export function usePlanGuard() {
  const [, navigate] = useLocation();
  const { data: planStatus } = trpc.planos.getStatus.useQuery(undefined, {
    staleTime: 60_000,
    retry: 1,
  });

  /**
   * Verifica se a ação é permitida.
   * - Se suspenso: bloqueia e exibe modal de upgrade
   * - Se cancelado: bloqueia e redireciona para assinatura
   * - Caso contrário: executa o callback normalmente
   */
  function guard(module: PlanGuardModule, onAllowed: () => void) {
    const status = planStatus?.status;

    if (status === "suspended") {
      const label = MODULE_LABELS[module];
      toast.error(
        `Período de teste encerrado — assine para criar novos ${label}`,
        {
          description: "Seus dados estão preservados. Escolha um plano para continuar usando o Hubly.",
          action: {
            label: "Ver planos",
            onClick: () => navigate("/admin/assinatura"),
          },
          duration: 8000,
        }
      );
      return;
    }

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

  const isSuspended = planStatus?.status === "suspended";
  const isCanceled = planStatus?.status === "canceled";
  const isBlocked = isSuspended || isCanceled;

  return { guard, isCanceled, isSuspended, isBlocked, planStatus };
}
