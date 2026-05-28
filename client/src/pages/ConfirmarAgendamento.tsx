import { useState } from "react";
import { useParams } from "wouter";
import {
  CheckCircle, XCircle, Clock, AlertCircle, Loader2,
  Calendar, Scissors, User, Phone, MessageCircle, Sparkles,
} from "lucide-react";
import { trpc } from "@/lib/trpc";

const HUBLY_LOGO_COMPLETO = "https://d2xsxph8kpxj0f.cloudfront.net/310419663029250418/BkCt9rpSQdtCMrvdCmsRG4/hubly-logo-clean_9c312391.png";
const HUBLY_LOGO_TRANSPARENTE = "https://d2xsxph8kpxj0f.cloudfront.net/310419663029250418/BkCt9rpSQdtCMrvdCmsRG4/hubly-logo-clean_9c312391.png";

function formatarDataCompleta(data: string) {
  const [ano, mes, dia] = data.split("-").map(Number);
  return new Date(ano, mes - 1, dia).toLocaleDateString("pt-BR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

function formatCurrency(v: string | number | null | undefined) {
  const num = typeof v === "string" ? parseFloat(v) : (v ?? 0);
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(isNaN(num) ? 0 : num);
}

type ResultadoAcao = "confirmado" | "cancelado" | "ja_confirmado" | "ja_cancelado" | "expirado" | "erro" | null;

export default function ConfirmarAgendamento() {
  const params = useParams<{ token: string }>();
  const token = params.token ?? "";
  const [resultado, setResultado] = useState<ResultadoAcao>(null);
  const [confirmandoAcao, setConfirmandoAcao] = useState<"confirmar" | "cancelar" | null>(null);

  const { data, isLoading, isError } = trpc.confirmacao.detalhes.useQuery(
    { token },
    { enabled: !!token, retry: false }
  );

  const confirmarMut = trpc.confirmacao.confirmar.useMutation({
    onSuccess: (res) => { setResultado(res.resultado); setConfirmandoAcao(null); },
    onError: () => { setResultado("erro"); setConfirmandoAcao(null); },
  });

  const cancelarMut = trpc.confirmacao.cancelar.useMutation({
    onSuccess: (res) => {
      if (res.resultado === "cancelado") setResultado("cancelado");
      else if (res.resultado === "ja_cancelado") setResultado("ja_cancelado");
      else setResultado("erro");
      setConfirmandoAcao(null);
    },
    onError: () => { setResultado("erro"); setConfirmandoAcao(null); },
  });

  function handleConfirmar() {
    setConfirmandoAcao("confirmar");
    confirmarMut.mutate({ token });
  }

  function handleCancelar() {
    setConfirmandoAcao("cancelar");
    cancelarMut.mutate({ token });
  }

  const empresa = data?.empresa;
  const corPrimaria = empresa?.corPrimaria ?? "#1a3a6b";
  const isPreAgendado = data?.agendamentoStatus === 'pre_agendado';

  // ── Header da empresa ──────────────────────────────────────────────────────
  function Header() {
    return (
      <header className="sticky top-0 z-20 shadow-md" style={{
        background: "#231B10",
      }}>
        <div className="max-w-lg mx-auto px-4 py-3 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            {empresa?.logoUrl ? (
              <img src={empresa.logoUrl} alt={empresa.nome}
                className="h-9 w-auto object-contain rounded-lg"
                style={{ filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.3))" }} />
            ) : (
              <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-white/20 backdrop-blur-sm border border-white/30">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
            )}
            <div>
              <p className="font-bold text-sm tracking-tight text-white drop-shadow-sm">
                {empresa?.nome ?? "Agendamento"}
              </p>
              <p className="text-[10px] text-white/70">{isPreAgendado ? 'Confirmação de Pré-agendamento' : 'Confirmação de Presença'}</p>
            </div>
          </div>
          <img src={HUBLY_LOGO_TRANSPARENTE} alt="Hubly"
            className="h-5 w-auto object-contain opacity-60"
            style={{ filter: "brightness(0) invert(1)" }} />
        </div>
      </header>
    );
  }

  // ── Footer ─────────────────────────────────────────────────────────────────
  function Footer() {
    return (
      <footer className="mt-auto border-t border-slate-100 py-5 px-4">
        <div className="max-w-lg mx-auto flex flex-col items-center gap-2">
          <p className="text-[10px] text-slate-400 uppercase tracking-widest font-medium">Agendamento gerenciado por</p>
          <a href="https://hubly.com.br" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 opacity-70 hover:opacity-100 transition-opacity">
            <img src={HUBLY_LOGO_COMPLETO} alt="Hubly" className="h-5 w-auto object-contain" />
          </a>
          <p className="text-[9px] text-slate-300">Hub de Serviços Inteligentes</p>
        </div>
      </footer>
    );
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-slate-500">
            <Loader2 className="w-10 h-10 animate-spin" style={{ color: corPrimaria }} />
            <p className="text-sm font-medium">Carregando detalhes...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // ── Erro / token inválido ──────────────────────────────────────────────────
  if (isError || !data) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        <Header />
        <div className="flex-1 flex items-center justify-center p-4">
          <ResultCard
            icon={<XCircle className="w-14 h-14 text-red-500" />}
            title="Link Inválido"
            description="Este link de confirmação não é válido ou não foi encontrado."
            color="text-red-700"
            bgColor="bg-red-50"
            borderColor="border-red-200"
            empresa={empresa}
          />
        </div>
        <Footer />
      </div>
    );
  }

  // ── Resultado após ação ────────────────────────────────────────────────────
  if (resultado) {
    const configs: Record<string, { icon: React.ReactNode; title: string; description: string; color: string; bgColor: string; borderColor: string }> = {
      confirmado: {
        icon: <CheckCircle className="w-14 h-14 text-green-500" />,
        title: isPreAgendado ? 'Pré-agendamento Confirmado! ✅' : 'Presença Confirmada! ✅',
        description: isPreAgendado
          ? 'Ótimo! Seu pré-agendamento foi confirmado e está na agenda. Te esperamos na data marcada!'
          : 'Ótimo! Seu agendamento foi confirmado. Te esperamos na data marcada!',
        color: "text-green-700", bgColor: "bg-green-50", borderColor: "border-green-200",
      },
      cancelado: {
        icon: <XCircle className="w-14 h-14 text-slate-400" />,
        title: "Agendamento Cancelado",
        description: "Seu agendamento foi cancelado. Se quiser reagendar, entre em contato conosco.",
        color: "text-slate-700", bgColor: "bg-slate-50", borderColor: "border-slate-200",
      },
      ja_confirmado: {
        icon: <CheckCircle className="w-14 h-14 text-blue-500" />,
        title: "Já Confirmado",
        description: "Este agendamento já foi confirmado anteriormente. Tudo certo, até breve!",
        color: "text-blue-700", bgColor: "bg-blue-50", borderColor: "border-blue-200",
      },
      ja_cancelado: {
        icon: <XCircle className="w-14 h-14 text-slate-400" />,
        title: "Já Cancelado",
        description: "Este agendamento já estava cancelado.",
        color: "text-slate-700", bgColor: "bg-slate-50", borderColor: "border-slate-200",
      },
      expirado: {
        icon: <Clock className="w-14 h-14 text-amber-500" />,
        title: "Link Expirado",
        description: "Este link não está mais ativo. Entre em contato para confirmar.",
        color: "text-amber-700", bgColor: "bg-amber-50", borderColor: "border-amber-200",
      },
      erro: {
        icon: <AlertCircle className="w-14 h-14 text-red-500" />,
        title: "Erro ao Processar",
        description: "Ocorreu um erro. Por favor, entre em contato conosco.",
        color: "text-red-700", bgColor: "bg-red-50", borderColor: "border-red-200",
      },
    };
    const cfg = configs[resultado] ?? configs.erro;
    return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        <Header />
        <div className="flex-1 flex items-center justify-center p-4">
          <ResultCard {...cfg} empresa={empresa} />
        </div>
        <Footer />
      </div>
    );
  }

  // ── Status já definido (sem ação do usuário) ───────────────────────────────
  if (data.status === "ja_confirmado") {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        <Header />
        <div className="flex-1 flex items-center justify-center p-4">
          <ResultCard
            icon={<CheckCircle className="w-14 h-14 text-blue-500" />}
            title="Já Confirmado"
            description="Este agendamento já foi confirmado anteriormente. Tudo certo, até breve!"
            color="text-blue-700" bgColor="bg-blue-50" borderColor="border-blue-200"
            empresa={empresa}
            extra={data.usadoEm ? `Confirmado em ${new Date(data.usadoEm).toLocaleString("pt-BR")}` : undefined}
          />
        </div>
        <Footer />
      </div>
    );
  }

  if (data.status === "expirado") {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        <Header />
        <div className="flex-1 flex items-center justify-center p-4">
          <ResultCard
            icon={<Clock className="w-14 h-14 text-amber-500" />}
            title="Link Expirado"
            description="Este link de confirmação não está mais ativo. Links são válidos por 48 horas."
            color="text-amber-700" bgColor="bg-amber-50" borderColor="border-amber-200"
            empresa={empresa}
          />
        </div>
        <Footer />
      </div>
    );
  }

  if (data.status === "cancelado") {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        <Header />
        <div className="flex-1 flex items-center justify-center p-4">
          <ResultCard
            icon={<XCircle className="w-14 h-14 text-slate-400" />}
            title="Agendamento Cancelado"
            description="Este agendamento foi cancelado. Entre em contato para reagendar."
            color="text-slate-700" bgColor="bg-slate-50" borderColor="border-slate-200"
            empresa={empresa}
          />
        </div>
        <Footer />
      </div>
    );
  }

  // ── Tela principal: detalhes + botões ─────────────────────────────────────
  const dataFormatada = data.data ? formatarDataCompleta(data.data) : null;
  // Usar valorFinal (já com desconto aplicado) se disponível, senão calcular
  const valorFinal = data.valorFinal ?? data.valorTotal;
  const valorNum = parseFloat(valorFinal ?? "0");
  const temDesconto = parseFloat(data.desconto ?? "0") > 0;
  // Mostrar valor se houver valorTotal definido (mesmo que seja 0 por desconto total)
  const valorBrutoNum = parseFloat(data.valorTotal ?? "0");
  const temValor = !isNaN(valorBrutoNum) && valorBrutoNum > 0;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header />

      <main className="flex-1 flex flex-col items-center justify-center p-4 py-8">
        <div className="w-full max-w-md space-y-4">

          {/* Card principal de detalhes */}
          <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
            {/* Faixa colorida no topo */}
            <div className="h-2" style={{ background: `linear-gradient(90deg, ${corPrimaria}, #29abe2)` }} />

            <div className="p-5 space-y-4">
              {/* Título */}
              <div className="text-center">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1">{isPreAgendado ? 'Confirme seu pré-agendamento' : 'Confirme sua presença'}</p>
                <h1 className="text-xl font-bold text-slate-800">
                  {empresa?.nome ?? "Agendamento"}
                </h1>
              </div>

              <div className="border-t border-slate-100" />

              {/* Data e hora */}
              {dataFormatada && (
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: corPrimaria + "18" }}>
                    <Calendar className="w-4.5 h-4.5" style={{ color: corPrimaria }} />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Data & Horário</p>
                    <p className="font-semibold text-slate-800 capitalize">{dataFormatada}</p>
                    <p className="text-sm text-slate-500">{data.horaInicio} – {data.horaFim}</p>
                  </div>
                </div>
              )}

              {/* Serviços */}
              {data.servicos && data.servicos.length > 0 && (
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: corPrimaria + "18" }}>
                    <Scissors className="w-4.5 h-4.5" style={{ color: corPrimaria }} />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      {data.servicos.length > 1 ? "Serviços" : "Serviço"}
                    </p>
                    {data.servicos.map((s, i) => (
                      <p key={i} className="font-semibold text-slate-800">{s.nomeServico}</p>
                    ))}
                  </div>
                </div>
              )}

              {/* Profissional */}
              {data.profissionalNome && (
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: corPrimaria + "18" }}>
                    <User className="w-4.5 h-4.5" style={{ color: corPrimaria }} />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Profissional</p>
                    <p className="font-semibold text-slate-800">{data.profissionalNome}</p>
                  </div>
                </div>
              )}

              {/* Valor */}
              {temValor && (
                <div className="rounded-xl px-4 py-3 flex items-center justify-between" style={{ background: corPrimaria + "0f", border: `1px solid ${corPrimaria}22` }}>
                  <span className="text-sm font-medium text-slate-600">Valor total</span>
                  <span className="font-bold text-base" style={{ color: corPrimaria }}>
                    {valorNum === 0 ? 'R$ 0,00' : formatCurrency(valorFinal)}
                  </span>
                  {temDesconto && (
                    <span className="text-xs text-muted-foreground line-through ml-2">{formatCurrency(data.valorTotal)}</span>
                  )}
                </div>
              )}

              {/* Observações */}
              {data.observacoes && (
                <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-600 mb-1">Observações</p>
                  <p className="text-sm text-slate-700">{data.observacoes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Botões de ação */}
          <div className="space-y-3">
            <button
              onClick={handleConfirmar}
              disabled={confirmandoAcao !== null}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-white font-bold text-base shadow-lg active:scale-[0.98] transition-all disabled:opacity-60"
              style={{ background: `linear-gradient(135deg, #16a34a, #15803d)`, boxShadow: "0 4px 15px rgba(22,163,74,0.35)" }}
            >
              {confirmandoAcao === "confirmar"
                ? <><Loader2 className="w-5 h-5 animate-spin" /> Confirmando...</>
                : <><CheckCircle className="w-5 h-5" /> {isPreAgendado ? 'Confirmar Pré-agendamento' : 'Confirmar Presença'}</>
              }
            </button>

            <button
              onClick={handleCancelar}
              disabled={confirmandoAcao !== null}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-semibold text-sm border-2 border-slate-200 bg-white text-slate-500 hover:border-red-300 hover:text-red-600 hover:bg-red-50 active:scale-[0.98] transition-all disabled:opacity-60"
            >
              {confirmandoAcao === "cancelar"
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Cancelando...</>
                : <><XCircle className="w-4 h-4" /> Não poderei comparecer</>
              }
            </button>
          </div>

          {/* Contato da empresa */}
          {empresa?.contato && (
            <div className="text-center">
              <p className="text-xs text-slate-400 mb-2">Dúvidas? Fale conosco</p>
              <a
                href={`https://wa.me/${empresa.contato.replace(/\D/g, "")}`}
                target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-colors shadow-sm"
              >
                <MessageCircle className="w-4 h-4" />
                Falar pelo WhatsApp
              </a>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

// ── Componente de resultado ────────────────────────────────────────────────────
function ResultCard({
  icon, title, description, color, bgColor, borderColor, empresa, extra
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
  bgColor: string;
  borderColor: string;
  empresa?: { nome?: string; contato?: string | null; logoUrl?: string | null } | null;
  extra?: string;
}) {
  const whatsappLink = empresa?.contato
    ? `https://wa.me/${empresa.contato.replace(/\D/g, "")}`
    : null;

  return (
    <div className="w-full max-w-md">
      <div className={`rounded-2xl border shadow-xl ${bgColor} ${borderColor} p-8 text-center space-y-4`}>
        <div className="flex justify-center">{icon}</div>
        <h2 className={`text-2xl font-bold ${color}`}>{title}</h2>
        <p className="text-slate-600 leading-relaxed">{description}</p>
        {extra && (
          <p className="text-sm text-slate-500 bg-white/60 rounded-xl px-4 py-2">{extra}</p>
        )}
        {whatsappLink && (
          <a
            href={whatsappLink}
            target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-colors w-full justify-center"
          >
            <MessageCircle className="w-4 h-4" />
            Falar pelo WhatsApp
          </a>
        )}
        <button
          onClick={() => window.close()}
          className="w-full py-2.5 rounded-xl border border-slate-200 bg-white text-slate-500 text-sm font-medium hover:bg-slate-50 transition-colors"
        >
          Fechar
        </button>
      </div>
    </div>
  );
}
