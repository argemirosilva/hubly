import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Crown, Zap, Check, ArrowRight, X } from "lucide-react";
import { Link } from "wouter";

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  resource?: "agendamentos" | "profissionais";
  currentPlan?: string;
  currentCount?: number;
  limit?: number;
}

export function UpgradeModal({
  open,
  onClose,
  resource = "agendamentos",
  currentPlan = "FREE",
  currentCount = 0,
  limit = 15,
}: UpgradeModalProps) {
  const isAgendamentos = resource === "agendamentos";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        {/* Header colorido */}
        <div className="bg-gradient-to-br from-primary to-primary/70 p-6 text-primary-foreground relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 opacity-70 hover:opacity-100 transition-opacity"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-white/20 rounded-full p-2">
              <Crown className="w-6 h-6" />
            </div>
            <Badge variant="secondary" className="bg-white/20 text-white border-white/30 text-xs">
              Plano {currentPlan}
            </Badge>
          </div>
          <DialogHeader>
            <DialogTitle className="text-white text-xl font-bold">
              {isAgendamentos
                ? "Limite de agendamentos atingido"
                : "Limite de profissionais atingido"}
            </DialogTitle>
          </DialogHeader>
          <p className="text-white/80 text-sm mt-1">
            {isAgendamentos
              ? `Você utilizou ${currentCount} de ${limit} agendamentos este mês no plano Free.`
              : `Você atingiu o limite de ${limit} profissional(is) no plano Free.`}
          </p>
        </div>

        {/* Corpo */}
        <div className="p-6">
          <p className="text-sm text-muted-foreground mb-4">
            Faça upgrade para o plano <strong>Solo</strong> e continue crescendo sem limites:
          </p>

          <ul className="space-y-2 mb-5">
            {[
              isAgendamentos ? "Agendamentos ilimitados" : "Até 1 profissional (Solo) ou 5 (Plus)",
              "Pacotes de serviços",
              "Comissões automáticas",
              "Relatórios avançados",
              "Link de agendamento personalizado",
              "IA de Marketing",
            ].map((feature) => (
              <li key={feature} className="flex items-center gap-2 text-sm">
                <Check className="w-4 h-4 text-green-500 shrink-0" />
                {feature}
              </li>
            ))}
          </ul>

          {/* Preço destaque */}
          <div className="bg-muted/50 rounded-xl p-4 mb-5 border border-border">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-bold text-lg">Plano Solo</div>
                <div className="text-xs text-muted-foreground">Para profissionais autônomos</div>
              </div>
              <div className="text-right">
                <div className="flex items-end gap-0.5">
                  <span className="text-xs text-muted-foreground">R$</span>
                  <span className="text-2xl font-bold">29</span>
                  <span className="text-base font-semibold text-muted-foreground">,90</span>
                  <span className="text-xs text-muted-foreground mb-0.5">/mês</span>
                </div>
                <div className="text-xs text-green-600 dark:text-green-400 font-medium">ou R$ 19,42/mês no anual</div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Link href="/admin/planos" onClick={onClose}>
              <Button className="w-full gap-2">
                <Zap className="w-4 h-4" />
                Ver todos os planos
                <ArrowRight className="w-4 h-4 ml-auto" />
              </Button>
            </Link>
            <Button variant="ghost" className="w-full text-muted-foreground text-sm" onClick={onClose}>
              Continuar no plano Free
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
