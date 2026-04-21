import { useEffect, useState } from "react";
import { useParams, useSearch } from "wouter";
import { CheckCircle, XCircle, Clock, AlertCircle, Loader2, Phone, Calendar, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";

type Status = "loading" | "confirmado" | "ja_confirmado" | "expirado" | "invalido" | "erro";

export default function ConfirmarAgendamento() {
  const params = useParams<{ token: string }>();
  const search = useSearch();
  const [status, setStatus] = useState<Status>("loading");
  const [dadosExtras, setDadosExtras] = useState<{
    empresaNome?: string | null;
    empresaContato?: string | null;
    agendamentoData?: Date | null;
    agendamentoHora?: string | null;
    usadoEm?: Date | null;
    expiresAt?: Date | null;
  }>({});

  // Buscar dados enriquecidos via tRPC quando temos token e status expirado/ja_confirmado
  const tokenQuery = trpc.confirmacao.verificarToken.useQuery(
    { token: params.token ?? "" },
    {
      enabled: !!params.token && !new URLSearchParams(search).get("status"),
      retry: false,
    }
  );

  useEffect(() => {
    const searchParams = new URLSearchParams(search);
    const statusParam = searchParams.get("status");

    if (statusParam) {
      switch (statusParam) {
        case "confirmado":   setStatus("confirmado"); break;
        case "ja_confirmado": setStatus("ja_confirmado"); break;
        case "expirado":    setStatus("expirado"); break;
        case "invalido":    setStatus("invalido"); break;
        case "erro":        setStatus("erro"); break;
        default:
          if (params.token) {
            window.location.href = `/api/confirmar/${params.token}`;
          } else {
            setStatus("invalido");
          }
      }
    } else if (params.token && !tokenQuery.isLoading) {
      if (tokenQuery.data) {
        const d = tokenQuery.data as any;
        setDadosExtras({
          empresaNome: d.empresaNome ?? null,
          empresaContato: d.empresaContato ?? null,
          agendamentoData: d.agendamentoData ? new Date(d.agendamentoData) : null,
          agendamentoHora: d.agendamentoHora ?? null,
          usadoEm: d.usadoEm ? new Date(d.usadoEm) : null,
          expiresAt: d.expiresAt ? new Date(d.expiresAt) : null,
        });
        if (d.status === 'pendente') {
          // Redirecionar para processar a confirmação
          window.location.href = `/api/confirmar/${params.token}`;
        } else {
          setStatus(d.status as Status);
        }
      } else if (tokenQuery.isError) {
        setStatus("erro");
      }
    } else if (!params.token) {
      setStatus("invalido");
    }
  }, [params.token, search, tokenQuery.data, tokenQuery.isLoading, tokenQuery.isError]);

  // Formatar data do agendamento
  const formatarData = (data: Date | null | undefined) => {
    if (!data) return null;
    return new Date(data).toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  // Formatar número de WhatsApp para link
  const formatarWhatsApp = (numero: string | null | undefined) => {
    if (!numero) return null;
    const limpo = numero.replace(/\D/g, "");
    return `https://wa.me/${limpo}`;
  };

  const config: Record<Status, {
    icon: React.ReactNode;
    title: string;
    description: string;
    color: string;
    bgColor: string;
    borderColor: string;
  }> = {
    loading: {
      icon: <Loader2 className="w-16 h-16 animate-spin text-primary" />,
      title: "Processando...",
      description: "Aguarde enquanto confirmamos seu agendamento.",
      color: "text-primary",
      bgColor: "bg-primary/5",
      borderColor: "border-primary/20",
    },
    confirmado: {
      icon: <CheckCircle className="w-16 h-16 text-green-500" />,
      title: "Agendamento Confirmado! ✅",
      description: "Seu agendamento foi confirmado com sucesso. Nos vemos em breve!",
      color: "text-green-700",
      bgColor: "bg-green-50",
      borderColor: "border-green-200",
    },
    ja_confirmado: {
      icon: <CheckCircle className="w-16 h-16 text-blue-500" />,
      title: "Já Confirmado",
      description: "Este agendamento já foi confirmado anteriormente. Tudo certo, até breve!",
      color: "text-blue-700",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200",
    },
    expirado: {
      icon: <Clock className="w-16 h-16 text-amber-500" />,
      title: "Link Expirado",
      description: "Este link de confirmação não está mais ativo. Links de confirmação são válidos por 48 horas.",
      color: "text-amber-700",
      bgColor: "bg-amber-50",
      borderColor: "border-amber-200",
    },
    invalido: {
      icon: <XCircle className="w-16 h-16 text-red-500" />,
      title: "Link Inválido",
      description: "Este link de confirmação não é válido. Verifique se o link está correto ou entre em contato conosco.",
      color: "text-red-700",
      bgColor: "bg-red-50",
      borderColor: "border-red-200",
    },
    erro: {
      icon: <AlertCircle className="w-16 h-16 text-red-500" />,
      title: "Erro ao Confirmar",
      description: "Ocorreu um erro ao processar sua confirmação. Por favor, entre em contato conosco.",
      color: "text-red-700",
      bgColor: "bg-red-50",
      borderColor: "border-red-200",
    },
  };

  const current = config[status];
  const whatsappLink = formatarWhatsApp(dadosExtras.empresaContato);
  const dataFormatada = formatarData(dadosExtras.agendamentoData);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo / Header */}
        <div className="text-center mb-8">
          <img
            src="https://d2xsxph8kpxj0f.cloudfront.net/310419663029250418/BkCt9rpSQdtCMrvdCmsRG4/hubly-logo-completo_b33cf08a.png"
            alt="Hubly"
            className="h-10 w-auto object-contain mx-auto mb-2"
          />
          <p className="text-slate-500 text-sm mt-1">Hub de Serviços Inteligentes</p>
        </div>

        <Card className={`border shadow-xl ${current.bgColor} ${current.borderColor}`}>
          <CardContent className="pt-8 pb-8 px-8 text-center">
            {/* Ícone */}
            <div className="flex justify-center mb-5">
              {current.icon}
            </div>

            {/* Título */}
            <h2 className={`text-2xl font-bold mb-3 ${current.color}`}>
              {current.title}
            </h2>

            {/* Descrição */}
            <p className="text-slate-600 text-base leading-relaxed mb-5">
              {current.description}
            </p>

            {/* Dados do agendamento (quando disponíveis) */}
            {(dataFormatada || dadosExtras.agendamentoHora) && (status === "confirmado" || status === "ja_confirmado" || status === "expirado") && (
              <div className="bg-white rounded-xl p-4 mb-5 border border-slate-200 text-left">
                <div className="flex items-center gap-2 text-slate-700">
                  <Calendar size={15} className="text-slate-400 shrink-0" />
                  <div>
                    {dataFormatada && (
                      <p className="text-sm font-medium capitalize">{dataFormatada}</p>
                    )}
                    {dadosExtras.agendamentoHora && (
                      <p className="text-xs text-slate-500">às {dadosExtras.agendamentoHora}</p>
                    )}
                  </div>
                </div>
                {dadosExtras.empresaNome && (
                  <p className="text-xs text-slate-400 mt-2 pl-5">{dadosExtras.empresaNome}</p>
                )}
              </div>
            )}

            {/* Mensagem adicional para confirmado */}
            {status === "confirmado" && (
              <div className="bg-white rounded-xl p-4 mb-5 border border-green-200 text-sm text-slate-600 text-left">
                <p className="font-semibold text-slate-800 mb-1">Próximos passos</p>
                <p>Você receberá uma mensagem com mais detalhes sobre seu agendamento em breve.</p>
              </div>
            )}

            {/* Já confirmado — quando foi confirmado */}
            {status === "ja_confirmado" && dadosExtras.usadoEm && (
              <div className="bg-white rounded-xl p-4 mb-5 border border-blue-200 text-sm text-slate-600 text-left">
                <p className="font-semibold text-slate-800 mb-1">Confirmado em</p>
                <p>{new Date(dadosExtras.usadoEm).toLocaleString("pt-BR")}</p>
              </div>
            )}

            {/* Link expirado — orientar o cliente a entrar em contato */}
            {(status === "expirado" || status === "invalido" || status === "erro") && (
              <div className="bg-white rounded-xl p-4 mb-5 border border-amber-200 text-sm text-slate-600 text-left">
                <p className="font-semibold text-slate-800 mb-2">O que fazer agora?</p>
                <p className="mb-3">Entre em contato diretamente com o estabelecimento para confirmar seu agendamento.</p>
                {whatsappLink && (
                  <a
                    href={whatsappLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors w-full justify-center"
                  >
                    <MessageCircle size={15} />
                    Falar pelo WhatsApp
                  </a>
                )}
                {!whatsappLink && dadosExtras.empresaContato && (
                  <a
                    href={`tel:${dadosExtras.empresaContato}`}
                    className="inline-flex items-center gap-2 bg-slate-700 hover:bg-slate-800 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors w-full justify-center"
                  >
                    <Phone size={15} />
                    Ligar agora
                  </a>
                )}
              </div>
            )}

            {/* Botão de fechar */}
            {status !== "loading" && (
              <Button
                variant="outline"
                className="w-full bg-white hover:bg-slate-50"
                onClick={() => window.close()}
              >
                Fechar
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-xs text-slate-400 mt-6">
          Powered by <span className="font-medium">Hubly</span> — Hub de Serviços Inteligentes
        </p>
      </div>
    </div>
  );
}
