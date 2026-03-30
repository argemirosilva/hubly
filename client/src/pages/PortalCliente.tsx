import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Clock, CheckCircle } from "lucide-react";
import { toast } from "sonner";

function formatCurrency(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

export default function PortalCliente() {
  const [step, setStep] = useState<"servico" | "data" | "dados" | "confirmado">("servico");
  const [servicoId, setServicoId] = useState<number | null>(null);
  const [profId, setProfId] = useState<number | null>(null);
  const [data, setData] = useState("");
  const [hora, setHora] = useState("");
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");

  const { data: servicos } = trpc.portal.getServicos.useQuery({ empresaId: 1 });
  const { data: profissionais } = trpc.portal.getProfissionais.useQuery({ empresaId: 1 });

  const agendarMutation = trpc.portal.criarAgendamento.useMutation({
    onSuccess: () => { toast.success("Pré-agendamento realizado!"); setStep("confirmado"); },
    onError: (err: any) => toast.error(err.message),
  });

  const servicoSelecionado = servicos?.find(s => s.id === servicoId);
  const profSelecionado = profissionais?.find(p => p.id === profId);

  function calcHoraFim(horaInicio: string, duracaoMinutos: number): string {
    const [h, m] = horaInicio.split(":").map(Number);
    const total = h * 60 + m + duracaoMinutos;
    return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
  }

  const horarios = ["09:00","09:30","10:00","10:30","11:00","11:30","13:00","13:30","14:00","14:30","15:00","15:30","16:00","16:30","17:00","17:30"];

  const minDate = new Date().toISOString().split("T")[0];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center gap-3">
          <div className="w-8 h-8 bg-foreground rounded-lg flex items-center justify-center">
            <span className="text-background font-bold text-sm" style={{ fontFamily: "'Playfair Display', serif" }}>A</span>
          </div>
          <span className="font-semibold text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>Agendei</span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-10">
        {step === "confirmado" ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-8 h-8 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>Pré-agendamento realizado!</h2>
            <p className="text-muted-foreground mb-2">Em breve você receberá uma mensagem no WhatsApp com as instruções para confirmar seu agendamento.</p>
            <p className="text-sm text-muted-foreground">Aguarde a confirmação após o pagamento da reserva.</p>
            <Button className="mt-8" onClick={() => { setStep("servico"); setServicoId(null); setProfId(null); setData(""); setHora(""); setNome(""); setTelefone(""); setEmail(""); }}>
              Fazer outro agendamento
            </Button>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>Agende seu horário</h1>
              <p className="text-muted-foreground mt-1">Escolha o serviço, profissional e horário de sua preferência</p>
            </div>

            {/* Steps */}
            <div className="flex items-center gap-2 mb-8">
              {(["servico","data","dados"] as const).map((s, i) => (
                <div key={s} className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${step === s ? "bg-foreground text-background" : (["servico","data","dados"] as const).indexOf(step) > i ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground"}`}>
                    {(["servico","data","dados"] as const).indexOf(step) > i ? <CheckCircle className="w-3.5 h-3.5" /> : i + 1}
                  </div>
                  {i < 2 && <div className="h-px bg-border w-8" />}
                </div>
              ))}
            </div>

            {step === "servico" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold mb-4">Escolha o serviço</h2>
                  <div className="grid grid-cols-1 gap-3">
                    {(servicos ?? []).map(s => (
                      <div key={s.id} className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${servicoId === s.id ? "border-foreground bg-secondary/30" : "border-border hover:border-foreground/30"}`}
                        onClick={() => setServicoId(s.id)}>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-foreground">{s.nome}</p>
                            {s.descricao && <p className="text-sm text-muted-foreground mt-0.5">{s.descricao}</p>}
                            <div className="flex items-center gap-3 mt-2">
                              <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" />{s.duracaoMinutos ?? 60} min</span>
                            </div>
                          </div>
                          <span className="text-lg font-bold text-foreground">{formatCurrency(parseFloat(String(s.valor)))}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                {servicoId && (
                  <div>
                    <h2 className="text-lg font-semibold mb-4">Escolha a profissional</h2>
                    <div className="grid grid-cols-2 gap-3">
                      <div className={`p-4 rounded-xl border-2 cursor-pointer transition-all text-center ${profId === null ? "border-foreground bg-secondary/30" : "border-border hover:border-foreground/30"}`}
                        onClick={() => setProfId(null)}>
                        <p className="font-medium text-sm">Sem preferência</p>
                      </div>
                      {(profissionais ?? []).map(p => (
                        <div key={p.id} className={`p-4 rounded-xl border-2 cursor-pointer transition-all text-center ${profId === p.id ? "border-foreground bg-secondary/30" : "border-border hover:border-foreground/30"}`}
                          onClick={() => setProfId(p.id)}>
                          <div className="w-10 h-10 rounded-full mx-auto mb-2 flex items-center justify-center text-white font-semibold"
                            style={{ backgroundColor: p.corCalendario ?? "#6366f1" }}>
                            {p.nome.charAt(0)}
                          </div>
                          <p className="font-medium text-sm">{p.nome}</p>
                          {p.especialidade && <p className="text-xs text-muted-foreground">{p.especialidade}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <Button className="w-full" disabled={!servicoId} onClick={() => setStep("data")}>Continuar</Button>
              </div>
            )}

            {step === "data" && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold">Escolha a data e horário</h2>
                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block">Data</Label>
                  <Input type="date" min={minDate} value={data} onChange={e => setData(e.target.value)} className="max-w-[200px]" />
                </div>
                {data && (
                  <div>
                    <Label className="text-xs text-muted-foreground mb-2 block">Horário disponível</Label>
                    <div className="grid grid-cols-4 gap-2">
                      {horarios.map(h => (
                        <button key={h} className={`py-2 px-3 rounded-lg text-sm font-medium border transition-all ${hora === h ? "bg-foreground text-background border-foreground" : "border-border hover:border-foreground/50"}`}
                          onClick={() => setHora(h)}>{h}</button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep("servico")}>Voltar</Button>
                  <Button className="flex-1" disabled={!data || !hora} onClick={() => setStep("dados")}>Continuar</Button>
                </div>
              </div>
            )}

            {step === "dados" && (
              <div className="space-y-5">
                <div className="p-4 bg-secondary/30 rounded-xl">
                  <p className="text-sm font-semibold">{servicoSelecionado?.nome}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {data.split("-").reverse().join("/")} às {hora}
                    {profSelecionado ? ` · ${profSelecionado.nome}` : ""}
                  </p>
                  <p className="text-base font-bold mt-1">{formatCurrency(parseFloat(String(servicoSelecionado?.valor ?? 0)))}</p>
                </div>
                <h2 className="text-lg font-semibold">Seus dados</h2>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Nome completo *</Label>
                  <Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Seu nome" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">WhatsApp *</Label>
                  <Input value={telefone} onChange={e => setTelefone(e.target.value)} placeholder="(11) 99999-9999" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Email</Label>
                  <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" />
                </div>
                <p className="text-xs text-muted-foreground">Após confirmar, você receberá as instruções para pagamento da reserva via WhatsApp.</p>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep("data")}>Voltar</Button>
                  <Button className="flex-1" disabled={!nome || !telefone || agendarMutation.isPending}
                    onClick={() => {
                      if (!servicoId || !data || !hora) return;
                      const duracao = servicoSelecionado?.duracaoMinutos ?? 60;
                      agendarMutation.mutate({
                        empresaId: 1,
                        clienteNome: nome,
                        clienteWhatsapp: telefone,
                        clienteEmail: email || undefined,
                        profissionalId: profId ?? (profissionais?.[0]?.id ?? 1),
                        servicoId,
                        data,
                        horaInicio: hora,
                        horaFim: calcHoraFim(hora, duracao),
                        valorTotal: String(servicoSelecionado?.valor ?? "0"),
                      });
                    }}>
                    {agendarMutation.isPending ? "Confirmando..." : "Confirmar pré-agendamento"}
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
