import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Building2, Clock, User, Scissors, CheckCircle2,
  ChevronRight, ChevronLeft, Sparkles, Calendar,
  Stethoscope, Dumbbell, Coffee, Store
} from "lucide-react";

const TIPOS_NEGOCIO = [
  { value: "salao", label: "Salão de Beleza", icon: Scissors, color: "oklch(65% 0.18 330)" },
  { value: "barbearia", label: "Barbearia", icon: Scissors, color: "oklch(55% 0.050 55)" },
  { value: "clinica", label: "Clínica", icon: Stethoscope, color: "oklch(55% 0.18 200)" },
  { value: "consultorio", label: "Consultório", icon: Stethoscope, color: "oklch(55% 0.15 160)" },
  { value: "outro", label: "Outro", icon: Store, color: "oklch(55% 0.12 80)" },
];

const DIAS_SEMANA = [
  { value: 0, label: "Dom" },
  { value: 1, label: "Seg" },
  { value: 2, label: "Ter" },
  { value: 3, label: "Qua" },
  { value: 4, label: "Qui" },
  { value: 5, label: "Sex" },
  { value: 6, label: "Sáb" },
];

const STEPS = [
  { id: 1, title: "Seu negócio", icon: Building2 },
  { id: 2, title: "Horários", icon: Clock },
  { id: 3, title: "Profissional", icon: User },
  { id: 4, title: "Serviço", icon: Scissors },
  { id: 5, title: "Tudo pronto!", icon: CheckCircle2 },
];

export default function Onboarding() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Step 1 — Empresa
  const [nomeEmpresa, setNomeEmpresa] = useState("");
  const [tipoNegocio, setTipoNegocio] = useState("salao");
  const [telefoneEmpresa, setTelefoneEmpresa] = useState("");

  // Step 2 — Horários
  const [horaAbertura, setHoraAbertura] = useState("08:00");
  const [horaFechamento, setHoraFechamento] = useState("18:00");
  const [diasFuncionamento, setDiasFuncionamento] = useState<number[]>([1, 2, 3, 4, 5]);
  const [intervalo, setIntervalo] = useState(30);

  // Step 3 — Profissional
  const [nomeProfissional, setNomeProfissional] = useState("");
  const [especialidade, setEspecialidade] = useState("");

  // Step 4 — Serviço
  const [nomeServico, setNomeServico] = useState("");
  const [duracaoServico, setDuracaoServico] = useState(60);
  const [precoServico, setPrecoServico] = useState("");

  const concluirOnboarding = trpc.onboarding.concluir.useMutation();

  const toggleDia = (dia: number) => {
    setDiasFuncionamento(prev =>
      prev.includes(dia) ? prev.filter(d => d !== dia) : [...prev, dia].sort()
    );
  };

  const handleNext = () => {
    if (step === 1 && !nomeEmpresa.trim()) {
      toast.error("Informe o nome do seu negócio");
      return;
    }
    if (step === 3 && !nomeProfissional.trim()) {
      toast.error("Informe o nome do profissional");
      return;
    }
    if (step === 4 && !nomeServico.trim()) {
      toast.error("Informe o nome do serviço");
      return;
    }
    if (step < 5) setStep(s => s + 1);
  };

  const handleConcluir = async () => {
    setLoading(true);
    try {
      await concluirOnboarding.mutateAsync({
        nomeEmpresa: nomeEmpresa.trim(),
        tipoNegocio: tipoNegocio as any,
        telefoneEmpresa: telefoneEmpresa.trim() || undefined,
        horaAbertura,
        horaFechamento,
        diasFuncionamento,
        intervaloMinutos: intervalo,
        nomeProfissional: nomeProfissional.trim(),
        especialidade: especialidade.trim() || undefined,
        nomeServico: nomeServico.trim(),
        duracaoServico,
        precoServico: precoServico ? parseFloat(precoServico.replace(",", ".")) : 0,
      });
      toast.success("Configuração concluída! Bem-vindo ao Hubly!");
      navigate("/admin");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao salvar configurações");
    } finally {
      setLoading(false);
    }
  };

  const progress = ((step - 1) / (STEPS.length - 1)) * 100;

  return (
    <div className="min-h-screen flex bg-background">
      {/* Painel esquerdo */}
      <div className="hidden lg:flex w-80 flex-col justify-between p-10 relative overflow-hidden flex-shrink-0"
        style={{ background: "oklch(22% 0.030 55)" }}>
        <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full opacity-10"
          style={{ background: "oklch(78.5% 0.075 85)" }} />
        <div className="absolute -bottom-16 -left-16 w-56 h-56 rounded-full opacity-8"
          style={{ background: "oklch(62% 0.18 145)" }} />

        <div className="relative">
          <div className="flex items-center gap-2.5 mb-12">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <img src="/manus-storage/hubly-icon-gold_40021193.png" alt="Hubly" style={{ height: 36, width: 'auto', objectFit: 'contain' }} />
              <span style={{ fontFamily: "'Poppins', 'Plus Jakarta Sans', sans-serif", fontWeight: 300, letterSpacing: '0.18em', fontSize: '1.2rem', color: '#ffffff', lineHeight: 1, userSelect: 'none' }}>hubly</span>
            </div>
          </div>

          <div className="space-y-2 mb-10">
            <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: "oklch(78.5% 0.075 85)" }}>
              Configuração inicial
            </p>
            <h2 className="text-2xl font-bold leading-tight" style={{ color: "oklch(96.2% 0.012 75)" }}>
              Vamos configurar sua plataforma
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: "oklch(55% 0.050 55)" }}>
              Em poucos passos você estará pronto para receber agendamentos.
            </p>
          </div>

          {/* Steps */}
          <div className="space-y-3">
            {STEPS.map((s) => {
              const Icon = s.icon;
              const isActive = s.id === step;
              const isDone = s.id < step;
              return (
                <div key={s.id} className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                    isDone ? "bg-green-500" : isActive ? "bg-amber-500" : "bg-white/10"
                  }`}>
                    {isDone ? (
                      <CheckCircle2 className="w-4 h-4 text-white" />
                    ) : (
                      <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-white/40"}`} />
                    )}
                  </div>
                  <span className={`text-sm font-medium ${
                    isActive ? "text-white" : isDone ? "text-green-400" : "text-white/40"
                  }`}>
                    {s.title}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="relative">
          <div className="flex items-center gap-2 text-xs" style={{ color: "oklch(45% 0.050 55)" }}>
            <Sparkles className="w-3 h-3" />
            <span>Você pode alterar tudo depois nas configurações</span>
          </div>
        </div>
      </div>

      {/* Painel direito */}
      <div className="flex-1 flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-lg">
          {/* Progress bar mobile */}
          <div className="lg:hidden mb-8">
            <div className="flex items-center gap-2 mb-3">
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <img src="/manus-storage/hubly-icon-gold_40021193.png" alt="Hubly" style={{ height: 28, width: 'auto', objectFit: 'contain' }} />
                <span style={{ fontFamily: "'Poppins', 'Plus Jakarta Sans', sans-serif", fontWeight: 300, letterSpacing: '0.18em', fontSize: '1rem', color: '#ffffff', lineHeight: 1, userSelect: 'none' }}>hubly</span>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
              <span>Passo {step} de {STEPS.length}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-amber-500 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
          </div>

          {/* Step 1 — Empresa */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold tracking-tight mb-1">Sobre seu negócio</h1>
                <p className="text-sm text-muted-foreground">Como se chama seu estabelecimento?</p>
              </div>

              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Nome do negócio *</Label>
                  <Input
                    value={nomeEmpresa}
                    onChange={e => setNomeEmpresa(e.target.value)}
                    placeholder="Ex: Studio Beleza, Barbearia do João..."
                    className="mt-1.5"
                    autoFocus
                  />
                </div>

                <div>
                  <Label className="text-sm font-medium mb-3 block">Tipo de negócio</Label>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {TIPOS_NEGOCIO.map(tipo => {
                      const Icon = tipo.icon;
                      const selected = tipoNegocio === tipo.value;
                      return (
                        <button
                          key={tipo.value}
                          type="button"
                          onClick={() => setTipoNegocio(tipo.value)}
                          className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all text-sm font-medium ${
                            selected
                              ? "border-amber-500 bg-amber-50 text-amber-800"
                              : "border-border hover:border-amber-300 hover:bg-muted/50"
                          }`}
                        >
                          <Icon className="w-5 h-5" style={{ color: selected ? tipo.color : undefined }} />
                          {tipo.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium">Telefone (opcional)</Label>
                  <Input
                    value={telefoneEmpresa}
                    onChange={e => setTelefoneEmpresa(e.target.value)}
                    placeholder="(11) 99999-9999"
                    className="mt-1.5"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2 — Horários */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold tracking-tight mb-1">Horário de funcionamento</h1>
                <p className="text-sm text-muted-foreground">Quando seu negócio está aberto?</p>
              </div>

              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Abre às</Label>
                    <Input type="time" value={horaAbertura} onChange={e => setHoraAbertura(e.target.value)} className="mt-1.5" />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Fecha às</Label>
                    <Input type="time" value={horaFechamento} onChange={e => setHoraFechamento(e.target.value)} className="mt-1.5" />
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium mb-3 block">Dias de funcionamento</Label>
                  <div className="flex gap-2 flex-wrap">
                    {DIAS_SEMANA.map(dia => (
                      <button
                        key={dia.value}
                        type="button"
                        onClick={() => toggleDia(dia.value)}
                        className={`w-12 h-12 rounded-xl text-sm font-semibold border-2 transition-all ${
                          diasFuncionamento.includes(dia.value)
                            ? "border-amber-500 bg-amber-500 text-white"
                            : "border-border hover:border-amber-300 text-muted-foreground"
                        }`}
                      >
                        {dia.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium">Intervalo entre agendamentos</Label>
                  <div className="flex gap-2 mt-1.5 flex-wrap">
                    {[15, 30, 45, 60, 90].map(min => (
                      <button
                        key={min}
                        type="button"
                        onClick={() => setIntervalo(min)}
                        className={`px-4 py-2 rounded-xl text-sm font-medium border-2 transition-all ${
                          intervalo === min
                            ? "border-amber-500 bg-amber-500 text-white"
                            : "border-border hover:border-amber-300"
                        }`}
                      >
                        {min}min
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3 — Profissional */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold tracking-tight mb-1">Primeiro profissional</h1>
                <p className="text-sm text-muted-foreground">Adicione o primeiro membro da sua equipe (pode ser você mesmo).</p>
              </div>

              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Nome completo *</Label>
                  <Input
                    value={nomeProfissional}
                    onChange={e => setNomeProfissional(e.target.value)}
                    placeholder="Ex: Maria Silva"
                    className="mt-1.5"
                    autoFocus
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">Especialidade (opcional)</Label>
                  <Input
                    value={especialidade}
                    onChange={e => setEspecialidade(e.target.value)}
                    placeholder="Ex: Cabeleireira, Manicure, Barbeiro..."
                    className="mt-1.5"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 4 — Serviço */}
          {step === 4 && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold tracking-tight mb-1">Primeiro serviço</h1>
                <p className="text-sm text-muted-foreground">Cadastre o primeiro serviço que você oferece.</p>
              </div>

              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Nome do serviço *</Label>
                  <Input
                    value={nomeServico}
                    onChange={e => setNomeServico(e.target.value)}
                    placeholder="Ex: Corte de cabelo, Manicure..."
                    className="mt-1.5"
                    autoFocus
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Duração (minutos)</Label>
                    <div className="flex gap-2 mt-1.5 flex-wrap">
                      {[30, 45, 60, 90, 120].map(min => (
                        <button
                          key={min}
                          type="button"
                          onClick={() => setDuracaoServico(min)}
                          className={`px-3 py-2 rounded-xl text-sm font-medium border-2 transition-all ${
                            duracaoServico === min
                              ? "border-blue-500 bg-amber-500 text-white"
                              : "border-border hover:border-blue-300"
                          }`}
                        >
                          {min}min
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Preço (R$)</Label>
                    <Input
                      value={precoServico}
                      onChange={e => setPrecoServico(e.target.value)}
                      placeholder="0,00"
                      className="mt-1.5"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 5 — Conclusão */}
          {step === 5 && (
            <div className="space-y-6 text-center">
              <div className="flex justify-center">
                <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-950/40 flex items-center justify-center">
                  <CheckCircle2 className="w-10 h-10 text-green-500" />
                </div>
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight mb-2">Tudo configurado!</h1>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                  Seu negócio está pronto. Você pode personalizar tudo isso depois nas configurações.
                </p>
              </div>

              <div className="bg-muted/50 rounded-2xl p-5 text-left space-y-3">
                <div className="flex items-center gap-3">
                  <Building2 className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Negócio</p>
                    <p className="text-sm font-semibold">{nomeEmpresa} · {TIPOS_NEGOCIO.find(t => t.value === tipoNegocio)?.label}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-orange-500 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Horário</p>
                    <p className="text-sm font-semibold">{horaAbertura} – {horaFechamento} · {diasFuncionamento.length} dias/semana</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <User className="w-4 h-4 text-purple-500 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Profissional</p>
                    <p className="text-sm font-semibold">{nomeProfissional}{especialidade ? ` · ${especialidade}` : ""}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Scissors className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Serviço</p>
                    <p className="text-sm font-semibold">{nomeServico} · {duracaoServico}min{precoServico ? ` · R$ ${precoServico}` : ""}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navegação */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
            <Button
              variant="ghost"
              onClick={() => setStep(s => s - 1)}
              disabled={step === 1}
              className="gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              Voltar
            </Button>

            {step < 5 ? (
              <Button onClick={handleNext} className="gap-2">
                Próximo
                <ChevronRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button onClick={handleConcluir} disabled={loading} className="gap-2 bg-green-600 hover:bg-green-700 text-white">
                {loading ? "Salvando..." : "Entrar na plataforma"}
                <Sparkles className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
