import { useEffect, useState } from "react";
import { useParams, useSearch } from "wouter";
import { CheckCircle, XCircle, Clock, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type Status = "loading" | "confirmado" | "ja_confirmado" | "expirado" | "invalido" | "erro";

export default function ConfirmarAgendamento() {
  const params = useParams<{ token: string }>();
  const search = useSearch();
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    // O status vem como query param após o redirect do servidor
    const searchParams = new URLSearchParams(search);
    const statusParam = searchParams.get("status");

    if (statusParam) {
      switch (statusParam) {
        case "confirmado":
          setStatus("confirmado");
          break;
        case "ja_confirmado":
          setStatus("ja_confirmado");
          break;
        case "expirado":
          setStatus("expirado");
          break;
        case "invalido":
          setStatus("invalido");
          break;
        case "erro":
          setStatus("erro");
          break;
        default:
          // Se não tem status na URL, redirecionar para o endpoint do servidor
          if (params.token) {
            window.location.href = `/api/confirmar/${params.token}`;
          } else {
            setStatus("invalido");
          }
      }
    } else if (params.token) {
      // Redirecionar para o endpoint do servidor para processar a confirmação
      window.location.href = `/api/confirmar/${params.token}`;
    } else {
      setStatus("invalido");
    }
  }, [params.token, search]);

  const config: Record<Status, {
    icon: React.ReactNode;
    title: string;
    description: string;
    color: string;
    bgColor: string;
  }> = {
    loading: {
      icon: <Loader2 className="w-16 h-16 animate-spin text-primary" />,
      title: "Processando...",
      description: "Aguarde enquanto confirmamos seu agendamento.",
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    confirmado: {
      icon: <CheckCircle className="w-16 h-16 text-green-500" />,
      title: "Agendamento Confirmado! ✅",
      description: "Seu agendamento foi confirmado com sucesso. Nos vemos em breve!",
      color: "text-green-600",
      bgColor: "bg-green-50 dark:bg-green-950/30",
    },
    ja_confirmado: {
      icon: <CheckCircle className="w-16 h-16 text-blue-500" />,
      title: "Já Confirmado",
      description: "Este agendamento já foi confirmado anteriormente. Tudo certo!",
      color: "text-blue-600",
      bgColor: "bg-blue-50 dark:bg-blue-950/30",
    },
    expirado: {
      icon: <Clock className="w-16 h-16 text-amber-500" />,
      title: "Link Expirado",
      description: "Este link de confirmação expirou. Entre em contato conosco para confirmar seu agendamento.",
      color: "text-amber-600",
      bgColor: "bg-amber-50 dark:bg-amber-950/30",
    },
    invalido: {
      icon: <XCircle className="w-16 h-16 text-red-500" />,
      title: "Link Inválido",
      description: "Este link de confirmação não é válido. Verifique se o link está correto.",
      color: "text-red-600",
      bgColor: "bg-red-50 dark:bg-red-950/30",
    },
    erro: {
      icon: <AlertCircle className="w-16 h-16 text-red-500" />,
      title: "Erro ao Confirmar",
      description: "Ocorreu um erro ao processar sua confirmação. Por favor, entre em contato conosco.",
      color: "text-red-600",
      bgColor: "bg-red-50 dark:bg-red-950/30",
    },
  };

  const current = config[status];

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo / Header */}
        <div className="text-center mb-8">
          <img
            src="https://d2xsxph8kpxj0f.cloudfront.net/310419663029250418/BkCt9rpSQdtCMrvdCmsRG4/hubly-logo-completo_b33cf08a.png"
            alt="Hubly"
            className="h-10 w-auto object-contain mx-auto mb-2"
          />
          <p className="text-muted-foreground text-sm mt-1">Centralize Your Service Management</p>
        </div>

        <Card className={`border-0 shadow-lg ${current.bgColor}`}>
          <CardContent className="pt-8 pb-8 px-8 text-center">
            {/* Ícone */}
            <div className="flex justify-center mb-6">
              {current.icon}
            </div>

            {/* Título */}
            <h2 className={`text-2xl font-bold mb-3 ${current.color}`}>
              {current.title}
            </h2>

            {/* Descrição */}
            <p className="text-muted-foreground text-base leading-relaxed mb-6">
              {current.description}
            </p>

            {/* Mensagem adicional para confirmado */}
            {status === "confirmado" && (
              <div className="bg-white dark:bg-card rounded-lg p-4 text-sm text-muted-foreground border border-green-200 dark:border-green-800">
                <p className="font-medium text-foreground mb-1">Próximos passos:</p>
                <p>Você receberá uma mensagem com mais detalhes sobre seu agendamento em breve.</p>
              </div>
            )}

            {/* Botão de fechar (para mobile) */}
            {status !== "loading" && (
              <Button
                variant="outline"
                className="mt-6 w-full"
                onClick={() => window.close()}
              >
                Fechar
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          Powered by Hubly — Centralize Your Service Management
        </p>
      </div>
    </div>
  );
}
