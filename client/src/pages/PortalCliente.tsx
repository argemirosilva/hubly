import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Calendar, Clock, CheckCircle2, ChevronRight, ChevronLeft, User, Phone, Mail, Sparkles, ArrowRight } from "lucide-react";
import { toast } from "sonner";

function formatCurrency(v: number | string) {
  const num = typeof v === "string" ? parseFloat(v) : v;
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(isNaN(num) ? 0 : num);
}

function calcHoraFim(horaInicio: string, duracaoMinutos: number): string {
  const [h, m] = horaInicio.split(":").map(Number);
  const total = h * 60 + m + duracaoMinutos;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

const HORARIOS = [
  "08:00","08:30","09:00","09:30","10:00","10:30","11:00","11:30",
  "13:00","13:30","14:00","14:30","15:00","15:30","16:00","16:30","17:00","17:30","18:00"
];

const STEPS = ["servico", "data", "dados"] as const;
type Step = typeof STEPS[number] | "confirmado";
const STEP_LABELS = ["Serviço", "Data & Hora", "Seus dados"];

export default function PortalCliente() {
  const [step, setStep] = useState<Step>("servico");
  const [servicoId, setServicoId] = useState<number | null>(null);
  const [profId, setProfId] = useState<number | null>(null);
  const [data, setData] = useState("");
  const [hora, setHora] = useState("");
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");

  const { data: empresa } = trpc.portal.getEmpresa.useQuery({ empresaId: 1 });
  const { data: servicos } = trpc.portal.getServicos.useQuery({ empresaId: 1 });
  const { data: profissionais } = trpc.portal.getProfissionais.useQuery({ empresaId: 1 });

  const agendarMutation = trpc.portal.criarAgendamento.useMutation({
    onSuccess: () => { toast.success("Pré-agendamento realizado!"); setStep("confirmado"); },
    onError: (err: { message: string }) => toast.error(err.message),
  });

  const servicoSelecionado = servicos?.find(s => s.id === servicoId);
  const profSelecionado = profissionais?.find(p => p.id === profId);
  const minDate = new Date().toISOString().split("T")[0];
  const stepIdx = STEPS.indexOf(step as typeof STEPS[number]);

  function resetar() {
    setStep("servico"); setServicoId(null); setProfId(null);
    setData(""); setHora(""); setNome(""); setTelefone(""); setEmail("");
  }

  function handleAgendar() {
    if (!servicoId || !profId || !data || !hora || !nome || !telefone) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }
    agendarMutation.mutate({
      empresaId: 1,
      servicoId,
      profissionalId: profId,
      data,
      horaInicio: hora,
      horaFim: calcHoraFim(hora, servicoSelecionado?.duracaoMinutos ?? 60),
      clienteNome: nome,
      clienteWhatsapp: telefone,
      clienteEmail: email || undefined,
      valorTotal: servicoSelecionado?.valor ?? "0",
    });
  }

  /* ── Confirmado ─────────────────────────────────────────────────────── */
  if (step === "confirmado") {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: "oklch(98% 0.004 250)" }}>
        <PortalHeader empresa={empresa} />
        <div className="flex-1 flex items-center justify-center px-6 py-16">
          <div className="text-center max-w-md animate-in-up space-y-6">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto"
              style={{ background: "oklch(62% 0.18 155 / 15%)" }}>
              <CheckCircle2 className="w-8 h-8" style={{ color: "oklch(38% 0.14 155)" }} />
            </div>
            <div>
              <h2 className="font-bold tracking-tight mb-2" style={{ fontSize: "1.6rem" }}>
                Pré-agendamento realizado! 🎉
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Em breve você receberá uma mensagem no WhatsApp com as instruções para confirmar seu horário com o pagamento da reserva.
              </p>
            </div>

            {servicoSelecionado && (
              <div className="rounded-2xl p-4 text-left space-y-2"
                style={{ background: "oklch(55% 0.22 264 / 6%)", border: "1px solid oklch(55% 0.22 264 / 15%)" }}>
                <p className="text-xs font-semibold uppercase tracking-wider"
                  style={{ color: "oklch(45% 0.18 264)" }}>Resumo</p>
                <p className="text-sm font-semibold">{servicoSelecionado.nome}</p>
                <p className="text-xs text-muted-foreground">
                  {profSelecionado?.nome} · {new Date(data + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })} às {hora}
                </p>
                <p className="text-sm font-bold" style={{ color: "oklch(45% 0.18 264)" }}>
                  {formatCurrency(servicoSelecionado.valor)}
                </p>
              </div>
            )}

            <button onClick={resetar} className="btn-primary mx-auto">
              Fazer outro agendamento <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "oklch(98% 0.004 250)" }}>
      <PortalHeader empresa={empresa} />

      <div className="flex-1 flex flex-col items-center px-4 py-8">
        {/* Progress steps */}
        <div className="w-full max-w-lg mb-8">
          <div className="flex items-center justify-between relative">
            <div className="absolute left-0 right-0 top-4 h-0.5 -z-0"
              style={{ background: "oklch(90% 0.012 250)" }} />
            <div className="absolute left-0 top-4 h-0.5 -z-0 transition-all duration-500"
              style={{
                background: "oklch(55% 0.22 264)",
                width: stepIdx === 0 ? "0%" : stepIdx === 1 ? "50%" : "100%"
              }} />
            {STEP_LABELS.map((label, i) => (
              <div key={label} className="flex flex-col items-center gap-1.5 z-10">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300"
                  style={{
                    background: i < stepIdx ? "oklch(55% 0.22 264)" : i === stepIdx ? "oklch(55% 0.22 264)" : "white",
                    color: i <= stepIdx ? "white" : "oklch(65% 0.012 260)",
                    border: i > stepIdx ? "2px solid oklch(88% 0.012 250)" : "none",
                    boxShadow: i === stepIdx ? "0 0 0 4px oklch(55% 0.22 264 / 20%)" : "none"
                  }}>
                  {i < stepIdx ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                </div>
                <span className="text-[11px] font-medium"
                  style={{ color: i === stepIdx ? "oklch(45% 0.18 264)" : "oklch(60% 0.012 260)" }}>
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Card principal */}
        <div className="w-full max-w-lg card-elegant overflow-hidden animate-in-up">

          {/* Step 1: Serviço */}
          {step === "servico" && (
            <div>
              <div className="px-6 py-5" style={{ borderBottom: "1px solid oklch(90% 0.012 250)" }}>
                <h2 className="font-bold tracking-tight">Escolha o serviço</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Selecione o que você deseja agendar</p>
              </div>
              <div className="p-4 space-y-2 max-h-[400px] overflow-y-auto">
                {!servicos ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                  </div>
                ) : servicos.length === 0 ? (
                  <div className="text-center py-12 text-sm text-muted-foreground">
                    Nenhum serviço disponível no momento.
                  </div>
                ) : servicos.map(s => (
                  <button key={s.id} onClick={() => setServicoId(s.id)}
                    className="w-full text-left p-4 rounded-xl transition-all duration-150"
                    style={{
                      background: servicoId === s.id ? "oklch(55% 0.22 264 / 8%)" : "oklch(98% 0.004 250)",
                      border: `2px solid ${servicoId === s.id ? "oklch(55% 0.22 264)" : "oklch(90% 0.012 250)"}`,
                    }}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm">{s.nome}</p>
                        {s.descricao && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{s.descricao}</p>}
                        <div className="flex items-center gap-3 mt-2">
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="w-3 h-3" /> {s.duracaoMinutos} min
                          </span>
                        </div>
                      </div>
                      <div className="flex-shrink-0 text-right">
              <p className="font-bold text-sm" style={{ color: "oklch(45% 0.18 264)" }}>
                {formatCurrency(s.valor)}
              </p>
                        {servicoId === s.id && (
                          <div className="w-5 h-5 rounded-full flex items-center justify-center mt-1 ml-auto"
                            style={{ background: "oklch(55% 0.22 264)" }}>
                            <CheckCircle2 className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {/* Profissional */}
              {servicoId && profissionais && profissionais.length > 0 && (
                <div className="px-4 pb-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-1">
                    Profissional
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    <button onClick={() => setProfId(null)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                      style={{
                        background: profId === null ? "oklch(55% 0.22 264 / 10%)" : "oklch(96% 0.008 250)",
                        color: profId === null ? "oklch(45% 0.18 264)" : "oklch(52% 0.016 260)",
                        border: `1.5px solid ${profId === null ? "oklch(55% 0.22 264 / 40%)" : "oklch(90% 0.012 250)"}`,
                      }}>
                      Sem preferência
                    </button>
                    {profissionais.map(p => (
                      <button key={p.id} onClick={() => setProfId(p.id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5"
                        style={{
                          background: profId === p.id ? "oklch(55% 0.22 264 / 10%)" : "oklch(96% 0.008 250)",
                          color: profId === p.id ? "oklch(45% 0.18 264)" : "oklch(52% 0.016 260)",
                          border: `1.5px solid ${profId === p.id ? "oklch(55% 0.22 264 / 40%)" : "oklch(90% 0.012 250)"}`,
                        }}>
                        <div className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                          style={{ background: p.corCalendario ?? "oklch(55% 0.22 264)" }}>
                          {p.nome.charAt(0)}
                        </div>
                        {p.nome.split(" ")[0]}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="px-4 pb-4">
                <button onClick={() => setStep("data")} disabled={!servicoId}
                  className="btn-primary w-full justify-center py-3">
                  Continuar <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Data & Hora */}
          {step === "data" && (
            <div>
              <div className="px-6 py-5 flex items-center gap-3" style={{ borderBottom: "1px solid oklch(90% 0.012 250)" }}>
                <button onClick={() => setStep("servico")}
                  className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                  <ChevronLeft className="w-4 h-4 text-muted-foreground" />
                </button>
                <div>
                  <h2 className="font-bold tracking-tight">Data & Horário</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {servicoSelecionado?.nome} · {formatCurrency(servicoSelecionado?.valor ?? "0")}
                  </p>
                </div>
              </div>
              <div className="p-5 space-y-5">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-2">
                    Data
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="date"
                      value={data}
                      min={minDate}
                      onChange={e => { setData(e.target.value); setHora(""); }}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm font-medium transition-all"
                      style={{
                        border: "2px solid oklch(90% 0.012 250)",
                        background: "oklch(98% 0.004 250)",
                        outline: "none",
                      }}
                    />
                  </div>
                </div>

                {data && (
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-2">
                      Horário disponível
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {HORARIOS.map(h => (
                        <button key={h} onClick={() => setHora(h)}
                          className="py-2 rounded-xl text-xs font-semibold transition-all"
                          style={{
                            background: hora === h ? "oklch(55% 0.22 264)" : "oklch(96% 0.008 250)",
                            color: hora === h ? "white" : "oklch(40% 0.016 260)",
                            border: `1.5px solid ${hora === h ? "oklch(55% 0.22 264)" : "oklch(90% 0.012 250)"}`,
                          }}>
                          {h}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="px-5 pb-5">
                <button onClick={() => setStep("dados")} disabled={!data || !hora}
                  className="btn-primary w-full justify-center py-3">
                  Continuar <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Dados pessoais */}
          {step === "dados" && (
            <div>
              <div className="px-6 py-5 flex items-center gap-3" style={{ borderBottom: "1px solid oklch(90% 0.012 250)" }}>
                <button onClick={() => setStep("data")}
                  className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                  <ChevronLeft className="w-4 h-4 text-muted-foreground" />
                </button>
                <div>
                  <h2 className="font-bold tracking-tight">Seus dados</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {new Date(data + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "short", day: "numeric", month: "short" })} às {hora}
                  </p>
                </div>
              </div>

              {/* Resumo */}
              <div className="mx-5 mt-5 p-4 rounded-xl space-y-1"
                style={{ background: "oklch(55% 0.22 264 / 6%)", border: "1px solid oklch(55% 0.22 264 / 15%)" }}>
                <p className="text-xs font-semibold" style={{ color: "oklch(45% 0.18 264)" }}>
                  {servicoSelecionado?.nome}
                </p>
                <p className="text-xs text-muted-foreground">
                  {profSelecionado ? profSelecionado.nome : "Qualquer profissional"} · {servicoSelecionado?.duracaoMinutos} min
                </p>
                <p className="text-sm font-bold" style={{ color: "oklch(45% 0.18 264)" }}>
                  {formatCurrency(servicoSelecionado?.valor ?? "0")}
                </p>
              </div>

              <div className="p-5 space-y-4">
                {[
                  { label: "Nome completo *", value: nome, onChange: setNome, icon: User, placeholder: "Seu nome" },
                  { label: "WhatsApp *", value: telefone, onChange: setTelefone, icon: Phone, placeholder: "(11) 99999-9999" },
                  { label: "E-mail (opcional)", value: email, onChange: setEmail, icon: Mail, placeholder: "seu@email.com" },
                ].map(field => {
                  const Icon = field.icon;
                  return (
                    <div key={field.label}>
                      <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">
                        {field.label}
                      </label>
                      <div className="relative">
                        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                          type="text"
                          value={field.value}
                          onChange={e => field.onChange(e.target.value)}
                          placeholder={field.placeholder}
                          className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm transition-all"
                          style={{
                            border: "2px solid oklch(90% 0.012 250)",
                            background: "oklch(98% 0.004 250)",
                            outline: "none",
                          }}
                          onFocus={e => { e.currentTarget.style.borderColor = "oklch(55% 0.22 264)"; }}
                          onBlur={e => { e.currentTarget.style.borderColor = "oklch(90% 0.012 250)"; }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="px-5 pb-5">
                <button
                  onClick={handleAgendar}
                  disabled={!nome || !telefone || agendarMutation.isPending}
                  className="btn-primary w-full justify-center py-3">
                  {agendarMutation.isPending ? (
                    <><div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" /> Aguarde...</>
                  ) : (
                    <>Confirmar pré-agendamento <CheckCircle2 className="w-4 h-4" /></>
                  )}
                </button>
                <p className="text-[11px] text-center text-muted-foreground mt-3 leading-relaxed">
                  Após confirmar, você receberá instruções no WhatsApp para pagar a reserva e garantir seu horário.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PortalHeader({ empresa }: { empresa?: { nome: string; logoUrl?: string | null } | null }) {
  return (
    <header className="sticky top-0 z-20"
      style={{ background: "white", borderBottom: "1px solid oklch(90% 0.012 250)" }}>
      <div className="max-w-lg mx-auto px-4 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl gradient-primary flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="font-bold text-sm tracking-tight leading-tight">
              {empresa?.nome ?? "Agendamento Online"}
            </p>
            <p className="text-[10px] text-muted-foreground">Powered by Agendei</p>
          </div>
        </div>
        <a href="/admin" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
          Área restrita →
        </a>
      </div>
    </header>
  );
}
