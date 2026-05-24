import { useEffect } from "react";
import { trpc } from "@/lib/trpc";

/**
 * Hook que atualiza o badge do ícone do app (PWA Badging API)
 * com o número de pré-agendamentos pendentes de confirmação.
 * Funciona apenas em PWA instalada (Chrome Android, Edge, etc).
 */
export function useBadge() {
  const { data } = trpc.agendamentos.contarPreAgendamentosPendentes.useQuery(
    undefined,
    {
      refetchInterval: 60_000, // Atualiza a cada 1 minuto
      staleTime: 30_000,
    }
  );

  useEffect(() => {
    const nav = navigator as any;
    if (!nav.setAppBadge) return; // API não suportada

    const total = data?.total ?? 0;

    if (total > 0) {
      nav.setAppBadge(total).catch(() => {});
    } else {
      nav.clearAppBadge().catch(() => {});
    }
  }, [data?.total]);
}
