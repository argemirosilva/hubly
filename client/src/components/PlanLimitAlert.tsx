import { AlertCircle, X } from "lucide-react";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { usePermissoes } from "@/hooks/usePermissoes";

export function PlanLimitAlert() {
  const [dismissed, setDismissed] = useState(false);
  const { isOwner, isAdmin } = usePermissoes();
  const { data: alertData } = trpc.planos.checkAlerts.useQuery(undefined, {
    refetchInterval: 60000, // Recarrega a cada 1 minuto
    enabled: isOwner || isAdmin, // Só busca para admins/owners
  });

  // Alertas de plano só para admins e owners
  if (!isOwner && !isAdmin) return null;
  if (dismissed || !alertData?.temAlerta || !alertData.alertas.length) {
    return null;
  }

  const primeiroAlerta = alertData.alertas[0];
  const totalAlertas = alertData.alertas.length;

  return (
    <div className="fixed top-4 right-4 max-w-sm z-50 animate-in slide-in-from-top-2">
      <div className="bg-white rounded-lg shadow-lg border-l-4" style={{ borderLeftColor: "oklch(60% 0.20 30)" }}>
        <div className="p-4 flex gap-3">
          <div className="flex-shrink-0">
            <AlertCircle className="w-5 h-5" style={{ color: "oklch(60% 0.20 30)" }} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm" style={{ color: "oklch(28.5% 0.035 55)" }}>
              Limite de Plano Próximo
            </h3>
            <p className="text-xs mt-1" style={{ color: "oklch(40% 0.050 55)" }}>
              {primeiroAlerta.mensagem}
            </p>
            {totalAlertas > 1 && (
              <p className="text-xs mt-2 font-medium" style={{ color: "oklch(60% 0.20 30)" }}>
                +{totalAlertas - 1} outro(s) alerta(s)
              </p>
            )}
            <a
              href="/admin/assinatura"
              className="text-xs font-semibold mt-3 inline-block px-3 py-1.5 rounded-md transition-colors"
              style={{
                background: "oklch(60% 0.20 30)",
                color: "white",
              }}
            >
              Fazer upgrade
            </a>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="flex-shrink-0 p-1 hover:bg-gray-100 rounded-md transition-colors"
          >
            <X className="w-4 h-4" style={{ color: "oklch(40% 0.050 55)" }} />
          </button>
        </div>
      </div>
    </div>
  );
}
