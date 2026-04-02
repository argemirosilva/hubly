import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { CheckCircle, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";

export default function PlanosSucesso() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  // Invalidar o status do plano para refletir a nova assinatura
  useEffect(() => {
    utils.planos.getStatus.invalidate();
  }, [utils]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Ícone de sucesso animado */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-green-500/10 flex items-center justify-center">
              <CheckCircle className="w-14 h-14 text-green-500" />
            </div>
            <div className="absolute -top-1 -right-1">
              <Sparkles className="w-6 h-6 text-amber-500" />
            </div>
          </div>
        </div>

        {/* Mensagem */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">
            Assinatura confirmada!
          </h1>
          <p className="text-muted-foreground text-lg">
            Seu plano foi ativado com sucesso. Aproveite todos os recursos
            desbloqueados do Agendei.
          </p>
        </div>

        {/* Informações */}
        <div className="bg-card border rounded-xl p-5 text-left space-y-3">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
            <span className="text-sm">Acesso imediato a todos os recursos do plano</span>
          </div>
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
            <span className="text-sm">Recibo enviado para o seu e-mail</span>
          </div>
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
            <span className="text-sm">Cancele quando quiser, sem multas</span>
          </div>
        </div>

        {/* Ações */}
        <div className="flex flex-col gap-3">
          <Button asChild size="lg" className="w-full">
            <Link href="/admin/dashboard">
              Ir para o Dashboard
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link href="/admin/planos">
              Ver minha assinatura
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
