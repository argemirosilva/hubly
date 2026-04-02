import { Link } from "wouter";
import { XCircle, ArrowLeft, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PlanosCancelado() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Ícone */}
        <div className="flex justify-center">
          <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center">
            <XCircle className="w-14 h-14 text-muted-foreground" />
          </div>
        </div>

        {/* Mensagem */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">
            Checkout cancelado
          </h1>
          <p className="text-muted-foreground text-lg">
            Nenhuma cobrança foi realizada. Você pode escolher um plano quando quiser.
          </p>
        </div>

        {/* Informações */}
        <div className="bg-card border rounded-xl p-5 text-left space-y-3">
          <div className="flex items-center gap-3">
            <HelpCircle className="w-5 h-5 text-muted-foreground shrink-0" />
            <span className="text-sm text-muted-foreground">
              Precisa de ajuda para escolher o plano certo? Fale com nosso suporte.
            </span>
          </div>
        </div>

        {/* Ações */}
        <div className="flex flex-col gap-3">
          <Button asChild size="lg" className="w-full">
            <Link href="/admin/planos">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar para os planos
            </Link>
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link href="/admin/dashboard">
              Ir para o Dashboard
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
