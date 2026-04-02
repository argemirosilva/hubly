import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Link } from "wouter";
import { Crown, Zap, AlertTriangle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function UsageWidget() {
  const { user } = useAuth();
  const { data: status } = trpc.planos.getStatus.useQuery(undefined, {
    enabled: !!user,
    refetchInterval: 60_000, // Atualizar a cada minuto
  });

  if (!status) return null;

  // Só mostrar o widget se o plano for FREE ou TRIAL
  const isFree = status.plan === "FREE";
  const isTrial = status.status === "trial";
  if (!isFree && !isTrial) return null;

  const { usage } = status;
  const agendamentosLimit = usage.agendamentosLimit;
  const agendamentosCount = usage.agendamentosCount;
  const percent = usage.agendamentosPercent;

  // Calcular dias restantes do trial
  const trialDaysLeft = status.trialEnd
    ? Math.max(0, Math.ceil((new Date(status.trialEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  const isWarning = percent >= 80;
  const isDanger = percent >= 100;

  const barColor = isDanger
    ? "bg-red-500"
    : isWarning
    ? "bg-amber-500"
    : "bg-primary";

  return (
    <div className={`rounded-xl border p-4 mb-4 ${isDanger ? "border-red-500/40 bg-red-500/5" : isWarning ? "border-amber-500/40 bg-amber-500/5" : "border-border bg-muted/30"}`}>
      {/* Trial banner */}
      {isTrial && trialDaysLeft !== null && (
        <div className="flex items-center gap-2 mb-3 text-sm">
          <Clock className="w-4 h-4 text-amber-500 shrink-0" />
          <span className="text-amber-600 dark:text-amber-400 font-medium">
            Período de teste: {trialDaysLeft} dia{trialDaysLeft !== 1 ? "s" : ""} restante{trialDaysLeft !== 1 ? "s" : ""}
          </span>
          <Badge variant="outline" className="ml-auto text-xs border-amber-500/40 text-amber-600 dark:text-amber-400">Solo Trial</Badge>
        </div>
      )}

      {/* Uso de agendamentos (só para FREE) */}
      {isFree && agendamentosLimit > 0 && (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5 text-sm font-medium">
              {isDanger ? (
                <AlertTriangle className="w-4 h-4 text-red-500" />
              ) : isWarning ? (
                <AlertTriangle className="w-4 h-4 text-amber-500" />
              ) : (
                <Zap className="w-4 h-4 text-primary" />
              )}
              <span>Agendamentos este mês</span>
            </div>
            <span className={`text-sm font-semibold ${isDanger ? "text-red-500" : isWarning ? "text-amber-500" : "text-foreground"}`}>
              {agendamentosCount} / {agendamentosLimit}
            </span>
          </div>

          {/* Barra de progresso */}
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${barColor}`}
              style={{ width: `${Math.min(100, percent)}%` }}
            />
          </div>

          {isDanger && (
            <p className="text-xs text-red-500 mt-1.5 font-medium">
              Limite atingido. Faça upgrade para continuar agendando.
            </p>
          )}
          {isWarning && !isDanger && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1.5">
              Você está próximo do limite. Considere fazer upgrade.
            </p>
          )}
        </div>
      )}

      {/* CTA de upgrade */}
      <div className="flex items-center gap-2 mt-3">
        <Link href="/admin/planos">
          <Button size="sm" variant={isDanger ? "default" : "outline"} className="gap-1.5 text-xs h-8">
            <Crown className="w-3.5 h-3.5" />
            {isDanger ? "Fazer upgrade agora" : "Ver planos"}
          </Button>
        </Link>
        {isFree && !isDanger && (
          <span className="text-xs text-muted-foreground">
            Plano Free · Sem custo
          </span>
        )}
      </div>
    </div>
  );
}
