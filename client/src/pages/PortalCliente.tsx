import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
import { useRoute } from "wouter";
import {
  Calendar, Clock, CheckCircle2, ChevronRight, ChevronLeft,
  User, Phone, Mail, Sparkles, ArrowRight, Scissors, Star,
  AlertCircle, Loader2, ShieldCheck, Share2,
} from "lucide-react";
import { toast } from "sonner";

function formatCurrency(v: number | string) {
  const num = typeof v === "string" ? parseFloat(v) : v;
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(isNaN(num) ? 0 : num);
}

function formatarData(data: string) {
  const [ano, mes, dia] = data.split("-").map(Number);
  return new Date(ano, mes - 1, dia).toLocaleDateString("pt-BR", {
    weekday: "long", day: "numeric", month: "long",
  });
}

function diasDaSemanaStr(diasFuncionamento: number[]) {
  const nomes = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  return diasFuncionamento.map(d => nomes[d]).join(", ");
}

function gerarDatasDisponiveis(diasFuncionamento: number[]): string[] {
  const datas: string[] = [];
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  for (let i = 0; i < 60 && datas.length < 30; i++) {
    const d = new Date(hoje);
    d.setDate(hoje.getDate() + i);
    if (diasFuncionamento.includes(d.getDay())) {
      datas.push(d.toISOString().split("T")[0]);
    }
  }
  return datas;
}

type Step = "identificacao" | "servico" | "profissional" | "data" | "confirmacao" | "sucesso";
const STEPS: Step[] = ["identificacao", "servico", "profissional", "data", "confirmacao"];
const STEP_LABELS = ["Identificação", "Serviço", "Profissional", "Data & Hora", "Confirmar"];
const STEP_ICONS = [User, Scissors, User, Calendar, CheckCircle2];

export default function PortalCliente() {
  const [matchSlug, paramsSlug] = useRoute("/agendar/:slug");
  const slug = matchSlug ? paramsSlug?.slug : null;

  // Se tiver slug na URL, busca empresa por slug; caso contrário usa ?e=ID
  const empresaIdFromQuery = useMemo(() => {
    if (slug) return null;
    const params = new URLSearchParams(window.location.search);
    const id = parseInt(params.get("e") ?? "0");
    return isNaN(id) || id === 0 ? null : id;
  }, [slug]);

  // Query por slug
  const { data: empresaBySlug, isLoading: loadingSlug, error: errorSlug } =
    trpc.portal.getEmpresaBySlug.useQuery(
      { slug: slug ?? "" },
      { enabled: !!slug, retry: false }
    );

  // Query por ID (legado)
  const { data: empresaById, isLoading: loadingId, error: errorId } =
    trpc.portal.getEmpresa.useQuery(
      { empresaId: empresaIdFromQuery ?? 1 },
      { enabled: !slug && !!empresaIdFromQuery, retry: false }
    );

  const empresa = slug ? empresaBySlug : empresaById;
  const loadingEmpresa = slug ? loadingSlug : loadingId;
  const errorEmpresa = slug ? errorSlug : errorId;
  const empresaId = empresa?.id ?? (empresaIdFromQuery ?? 1);

  const [step, setStep] = useState<Step>("identificacao");

  const [telefone, setTelefone] = useState("");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [clienteIdentificado, setClienteIdentificado] = useState(false);

  // Fluxo de validação por CPF
  const [cpf, setCpf] = useState("");
  const [cpfErro, setCpfErro] = useState("");
  const [cpfValidado, setCpfValidado] = useState(false);
  const [clienteEncontrado, setClienteEncontrado] = useState<boolean | null>(null);
  const [temCpf, setTemCpf] = useState(false);
  const [buscandoTelefone, setBuscandoTelefone] = useState(false);
  const [validandoCpf, setValidandoCpf] = useState(false);

  const [servicosIds, setServicosIds] = useState<number[]>([]);
  // Compatibilidade: servicoId = primeiro serviço selecionado
  const servicoId = servicosIds[0] ?? null;
  const [profissionalId, setProfissionalId] = useState<number | null>(null);
  const [data, setData] = useState("");
  const [hora, setHora] = useState("");
  const [observacoes, setObservacoes] = useState("");

  // Toggle serviço na seleção múltipla
  const toggleServico = (id: number) => {
    setServicosIds(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const { data: servicos } = trpc.portal.getServicos.useQuery({ empresaId });
  const { data: profissionais } = trpc.portal.getProfissionais.useQuery({ empresaId });
  const { data: meusAgendamentos } = trpc.portal.getMeusAgendamentos.useQuery(
    { empresaId, telefone },
    { enabled: clienteIdentificado && !!telefone },
  );

  const utils = trpc.useUtils();

  // Busca cliente ao digitar telefone (debounced via blur)
  async function handleTelefoneBlur() {
    const tel = telefone.replace(/\D/g, "");
    if (tel.length < 8) return;
    setBuscandoTelefone(true);
    try {
      const res = await utils.portal.buscarClientePorTelefone.fetch({ empresaId, telefone });
      setClienteEncontrado(res.encontrado);
      setTemCpf(res.temCpf);
      if (!res.encontrado) {
        // Novo cliente: limpar campos de CPF
        setCpf(""); setCpfErro(""); setCpfValidado(false);
      }
    } catch {
      setClienteEncontrado(false);
    } finally {
      setBuscandoTelefone(false);
    }
  }

  const cadastrarCpfMutation = trpc.portal.cadastrarCpfCliente.useMutation();

  async function handleValidarCpf() {
    if (!cpf) return;
    setValidandoCpf(true);
    setCpfErro("");
    try {
      if (temCpf) {
        // Cliente já tem CPF: validar
        const res = await utils.portal.validarCpfCliente.fetch({ empresaId, telefone, cpf });
        if (res.valido) {
          setCpfValidado(true);
          setNome(res.nome);
          setEmail(res.email ?? "");
        } else {
          setCpfErro("CPF incorreto. Tente novamente.");
          setCpfValidado(false);
        }
      } else {
        // Cliente sem CPF: cadastrar
        const res = await cadastrarCpfMutation.mutateAsync({ empresaId, telefone, cpf });
        if (res.ok) {
          setCpfValidado(true);
          setNome(res.nome);
          setEmail(res.email ?? "");
          setTemCpf(true);
        } else {
          setCpfErro("Não foi possível cadastrar o CPF. Tente novamente.");
        }
      }
    } catch {
      setCpfErro("Erro ao validar CPF. Tente novamente.");
    } finally {
      setValidandoCpf(false);
    }
  }
  // ── Verificar limite de agendamentos do plano ──────────────────────────
  const { data: statusLimite } = trpc.portal.getStatusLimite.useQuery({ empresaId });

  const { data: slotsData, isLoading: loadingSlots } = trpc.portal.getHorariosDisponiveis.useQuery(
    { empresaId, data, servicoId: servicoId!, profissionalId: profissionalId ?? undefined },
    { enabled: !!data && !!servicoId },
  );

  const agendarMutation = trpc.portal.criarAgendamento.useMutation({
    onSuccess: () => setStep("sucesso"),
    onError: (err) => toast.error(err.message),
  });

  const servicoSelecionado = servicos?.find(s => s.id === servicoId);
  const servicosSelecionados = servicos?.filter(s => servicosIds.includes(s.id)) ?? [];
  const valorTotalServicos = servicosSelecionados.reduce((acc, s) => acc + parseFloat(String(s.valor ?? 0)), 0);
  const duracaoTotalServicos = servicosSelecionados.reduce((acc, s) => acc + (s.duracaoMinutos ?? 60), 0);
  const profSelecionado = profissionais?.find(p => p.id === profissionalId);
  const diasFuncionamento = (empresa?.diasFuncionamento as number[]) ?? [1, 2, 3, 4, 5];
  const datasDisponiveis = useMemo(
    () => gerarDatasDisponiveis(diasFuncionamento),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [diasFuncionamento.join(",")]
  );

  const slots = useMemo(() => {
    if (!slotsData) return [];
    if (profissionalId) {
      return slotsData.find(s => s.profissionalId === profissionalId)?.slots ?? [];
    }
    const all = new Set<string>();
    slotsData.forEach(s => s.slots.forEach(h => all.add(h)));
    return Array.from(all).sort();
  }, [slotsData, profissionalId]);

  const profissionalParaHora = useMemo(() => {
    if (profissionalId || !hora || !slotsData) return profissionalId;
    const entry = slotsData.find(s => s.slots.includes(hora));
    return entry?.profissionalId ?? null;
  }, [profissionalId, hora, slotsData]);

  const corPrimaria = empresa?.corPrimaria ?? "#4f46e5";
  const corSecundaria = empresa?.corSecundaria ?? "#e0e7ff";

  if (loadingEmpresa) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: corPrimaria }} />
          <p className="text-sm text-slate-500">Carregando portal...</p>
        </div>
      </div>
    );
  }

  if (errorEmpresa || !empresa) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="text-center max-w-sm space-y-4">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
          <h2 className="font-bold text-xl text-slate-800">Portal indisponível</h2>
          <p className="text-sm text-slate-500">
            {errorEmpresa?.message === "Portal de agendamento não está ativo"
              ? "O portal de agendamento online ainda não foi ativado. Entre em contato diretamente com o estabelecimento."
              : "Não foi possível carregar o portal. Tente novamente mais tarde."}
          </p>
        </div>
      </div>
    );
  }

  // ── Bloqueio por limite de plano ──────────────────────────────────────────
  if (statusLimite?.bloqueado) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        <PortalHeader empresa={empresa} corPrimaria={corPrimaria} />
        <div className="flex-1 flex items-center justify-center px-4 py-16">
          <div className="text-center max-w-sm space-y-6">
            <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto shadow-lg bg-amber-100">
              <AlertCircle className="w-10 h-10 text-amber-500" />
            </div>
            <div>
              <h2 className="font-bold text-2xl text-slate-800 mb-3">Agenda temporariamente indisponível</h2>
              <p className="text-sm text-slate-500 leading-relaxed">
                {statusLimite.mensagem ?? "Esta agenda atingiu o limite de agendamentos do mês. Por favor, entre em contato diretamente com o estabelecimento."}
              </p>
            </div>
            <div className="rounded-2xl p-5 text-left space-y-3 border border-amber-200 bg-amber-50">
              <p className="text-xs font-bold uppercase tracking-wider text-amber-700">O que fazer?</p>
              <ul className="text-sm text-slate-600 space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 mt-0.5">•</span>
                  <span>Entre em contato por telefone ou WhatsApp para agendar diretamente</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 mt-0.5">•</span>
                  <span>A agenda online será reaberta no início do próximo mês</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (step === "sucesso") {
    const profFinal = profissionais?.find(p => p.id === (profissionalParaHora ?? profissionalId));
    return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        <PortalHeader empresa={empresa} corPrimaria={corPrimaria} />
        <div className="flex-1 flex items-center justify-center px-4 py-16">
          <div className="text-center max-w-md space-y-6">
            <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto shadow-lg"
              style={{ background: corPrimaria }}>
              <CheckCircle2 className="w-10 h-10 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-2xl text-slate-800 mb-2">
                {agendarMutation.data?.confirmadoAutomaticamente ? "Agendamento confirmado!" : "Pré-agendamento realizado!"}
              </h2>
              <p className="text-sm text-slate-500 leading-relaxed">
                {agendarMutation.data?.confirmadoAutomaticamente
                  ? "Seu horário está confirmado. Até lá!"
                  : "Aguarde a confirmação do estabelecimento. Você será avisado em breve."}
              </p>
            </div>
            <div className="rounded-2xl p-5 text-left space-y-3 border"
              style={{ background: corSecundaria + "40", borderColor: corPrimaria + "30" }}>
              <p className="text-xs font-bold uppercase tracking-wider" style={{ color: corPrimaria }}>Resumo</p>
              <div className="space-y-1.5">
                <p className="font-semibold text-slate-800">{servicoSelecionado?.nome}</p>
                {profFinal && <p className="text-sm text-slate-600">com {profFinal.nome}</p>}
                <p className="text-sm text-slate-600">{formatarData(data)} às {hora}</p>
                <p className="font-bold text-base" style={{ color: corPrimaria }}>
                  {formatCurrency(servicoSelecionado?.valor ?? "0")}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setStep("identificacao"); setServicosIds([]); setProfissionalId(null);
                setData(""); setHora(""); setObservacoes("");
              }}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white font-semibold text-sm shadow-md"
              style={{ background: corPrimaria }}>
              Fazer outro agendamento <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
        <HublyFooter />
      </div>
    );
  }

  const stepIdx = STEPS.indexOf(step);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <PortalHeader empresa={empresa} corPrimaria={corPrimaria} />

      {empresa.portalHeaderUrl && step === "identificacao" && (
        <div className="relative w-full h-44 sm:h-60 overflow-hidden">
          <img src={empresa.portalHeaderUrl} alt="Capa" className="w-full h-full object-cover" />
          {/* Overlay gradiente Hubly */}
          <div className="absolute inset-0" style={{
            background: "linear-gradient(to bottom, rgba(26,58,107,0.55) 0%, rgba(26,58,107,0.15) 50%, rgba(26,58,107,0.7) 100%)"
          }} />
          {empresa.portalMensagemBemVindo && (
            <div className="absolute bottom-0 left-0 right-0 px-4 pb-4 max-w-lg mx-auto">
              <p className="text-white text-sm font-medium drop-shadow-md leading-relaxed">
                {empresa.portalMensagemBemVindo}
              </p>
            </div>
          )}
        </div>
      )}

      {step === "identificacao" && !empresa.portalHeaderUrl && empresa.portalMensagemBemVindo && (
        <div className="max-w-lg mx-auto w-full px-4 pt-6">
          <p className="text-sm text-slate-600 text-center leading-relaxed italic">
            "{empresa.portalMensagemBemVindo}"
          </p>
        </div>
      )}

      {/* Stepper visual redesenhado */}
      <div className="max-w-lg mx-auto w-full px-4 pt-5 pb-2">
        <div className="flex items-center">
          {STEPS.map((s, i) => {
            const Icon = STEP_ICONS[i];
            const isActive = i === stepIdx;
            const isDone = i < stepIdx;
            return (
              <div key={s} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center gap-1">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 shadow-sm"
                    style={{
                      background: isDone ? corPrimaria : isActive ? corPrimaria : "#f1f5f9",
                      border: isActive ? `2px solid ${corPrimaria}` : isDone ? "none" : "2px solid #e2e8f0",
                      transform: isActive ? "scale(1.15)" : "scale(1)",
                      boxShadow: isActive ? `0 0 0 4px ${corPrimaria}22` : "none",
                    }}>
                    {isDone
                      ? <CheckCircle2 className="w-4 h-4 text-white" />
                      : <Icon className="w-3.5 h-3.5" style={{ color: isActive ? "white" : "#94a3b8" }} />}
                  </div>
                  <span className="text-[9px] font-semibold whitespace-nowrap hidden sm:block"
                    style={{ color: isActive ? corPrimaria : isDone ? corPrimaria : "#94a3b8" }}>
                    {STEP_LABELS[i]}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className="flex-1 h-0.5 mx-1 rounded-full transition-all duration-300"
                    style={{ background: i < stepIdx ? corPrimaria : "#e2e8f0" }} />
                )}
              </div>
            );
          })}
        </div>
        <p className="text-center text-xs font-semibold mt-2 sm:hidden" style={{ color: corPrimaria }}>
          {STEP_LABELS[stepIdx]}
        </p>
      </div>

      <div className="max-w-lg mx-auto w-full px-4 py-6 flex-1">

        {step === "identificacao" && (
          <StepCard title="Quem é você?" subtitle="Informe seu telefone para começar">
            <div className="space-y-4">

              {/* Campo de telefone */}
              <div className="relative">
                <InputField label="WhatsApp / Telefone *" value={telefone}
                  onChange={(v) => {
                    setTelefone(v);
                    // Reset ao mudar telefone
                    setClienteEncontrado(null);
                    setCpf(""); setCpfErro(""); setCpfValidado(false);
                    setNome(""); setEmail("");
                  }}
                  onBlur={handleTelefoneBlur}
                  icon={Phone} placeholder="(11) 99999-9999" corPrimaria={corPrimaria} />
                {buscandoTelefone && (
                  <div className="absolute right-3 top-8 flex items-center gap-1 text-xs text-slate-400">
                    <Loader2 className="w-3 h-3 animate-spin" /> Buscando...
                  </div>
                )}
              </div>

              {/* Cliente encontrado: SEMPRE pedir CPF */}
              {clienteEncontrado === true && !cpfValidado && (
                <div className="rounded-xl p-4 space-y-3"
                  style={{ background: corSecundaria + "40", border: `1px solid ${corPrimaria}30` }}>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center shadow-sm"
                      style={{ background: corPrimaria }}>
                      <ShieldCheck className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">Bem-vindo de volta!</p>
                      <p className="text-xs text-slate-500">
                        {temCpf ? "Digite seu CPF para confirmar sua identidade" : "Cadastre seu CPF para continuar"}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <InputField
                      label={temCpf ? "CPF *" : "Cadastre seu CPF *"}
                      value={cpf}
                      onChange={(v) => { setCpf(v); setCpfErro(""); }}
                      icon={ShieldCheck}
                      placeholder="000.000.000-00"
                      corPrimaria={corPrimaria}
                    />
                    {cpfErro && (
                      <p className="text-xs text-red-500 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> {cpfErro}
                      </p>
                    )}
                    <button
                      onClick={handleValidarCpf}
                      disabled={!cpf || validandoCpf}
                      className="w-full py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-all"
                      style={{ background: !cpf || validandoCpf ? "#cbd5e1" : corPrimaria }}>
                      {validandoCpf
                        ? <><Loader2 className="w-4 h-4 animate-spin" /> Verificando...</>
                        : <><ShieldCheck className="w-4 h-4" /> {temCpf ? "Confirmar identidade" : "Cadastrar e continuar"}</>
                      }
                    </button>
                  </div>
                </div>
              )}

              {/* Cliente validado: mostrar dados pré-preenchidos */}
              {cpfValidado && (
                <div className="rounded-xl p-3 space-y-1"
                  style={{ background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <p className="text-sm font-semibold text-green-800">Identidade confirmada</p>
                  </div>
                  <p className="text-xs text-green-700 pl-6">{nome}{email ? ` · ${email}` : ""}</p>
                </div>
              )}

              {/* Novo cliente: mostrar campos de nome e email */}
              {clienteEncontrado === false && (
                <>
                  <InputField label="Nome completo *" value={nome} onChange={setNome}
                    icon={User} placeholder="Seu nome" corPrimaria={corPrimaria} />
                  <InputField label="E-mail (opcional)" value={email} onChange={setEmail}
                    icon={Mail} placeholder="seu@email.com" corPrimaria={corPrimaria} />
                </>
              )}

              {/* Agendamentos recentes (após identificação) */}
              {clienteIdentificado && meusAgendamentos && meusAgendamentos.length > 0 && (
                <div className="rounded-xl p-4 space-y-2"
                  style={{ background: corSecundaria + "50", border: `1px solid ${corPrimaria}25` }}>
                  <p className="text-xs font-bold uppercase tracking-wider" style={{ color: corPrimaria }}>
                    Seus agendamentos recentes
                  </p>
                  {meusAgendamentos.slice(0, 3).map(ag => {
                    const serv = servicos?.find(s => s.id === ag.servicoId);
                    return (
                      <div key={ag.id} className="flex items-center justify-between text-xs text-slate-600">
                        <span>{serv?.nome ?? "Serviço"}</span>
                        <span>{String(ag.data).substring(0, 10)} às {ag.horaInicio.substring(0, 5)}</span>
                        <StatusBadge status={ag.status} corPrimaria={corPrimaria} />
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Botão Continuar */}
              <BtnPrimary
                disabled={!telefone || !nome || (clienteEncontrado === true && temCpf && !cpfValidado)}
                onClick={() => { setClienteIdentificado(true); setStep("servico"); }}
                cor={corPrimaria}>
                Continuar <ChevronRight className="w-4 h-4" />
              </BtnPrimary>

              <p className="text-[11px] text-center text-slate-400">
                Funcionamos {diasDaSemanaStr(diasFuncionamento)} · {empresa.horaAbertura} às {empresa.horaFechamento}
              </p>
            </div>
          </StepCard>
        )}

        {step === "servico" && (
          <StepCard title="Qual serviço?" subtitle="Selecione um ou mais serviços">
            <div className="space-y-2">
              {servicos?.map(s => {
                const selecionado = servicosIds.includes(s.id);
                return (
                  <button key={s.id} onClick={() => toggleServico(s.id)}
                    className="w-full flex items-center gap-3 p-4 rounded-xl text-left transition-all border-2"
                    style={{
                      borderColor: selecionado ? corPrimaria : "#e2e8f0",
                      background: selecionado ? corSecundaria + "50" : "white",
                    }}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: s.cor ?? corPrimaria }}>
                      {selecionado
                        ? <CheckCircle2 className="w-5 h-5 text-white" />
                        : <Scissors className="w-5 h-5 text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-slate-800">{s.nome}</p>
                      {s.descricao && <p className="text-xs text-slate-500 truncate">{s.descricao}</p>}
                      <p className="text-xs text-slate-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {s.duracaoMinutos} min
                      </p>
                    </div>
                    <p className="font-bold text-sm flex-shrink-0" style={{ color: corPrimaria }}>
                      {formatCurrency(s.valor)}
                    </p>
                  </button>
                );
              })}
            </div>

            {/* Resumo dos serviços selecionados */}
            {servicosIds.length > 0 && (
              <div className="rounded-xl p-3 border-2 mt-1"
                style={{ borderColor: corPrimaria + "40", background: corSecundaria + "30" }}>
                <p className="text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: corPrimaria }}>
                  {servicosIds.length} serviço{servicosIds.length > 1 ? "s" : ""} selecionado{servicosIds.length > 1 ? "s" : ""}
                </p>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-600 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {duracaoTotalServicos} min no total
                  </p>
                  <p className="font-bold text-sm" style={{ color: corPrimaria }}>
                    {formatCurrency(valorTotalServicos)}
                  </p>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <BtnSecundario onClick={() => setStep("identificacao")} cor={corPrimaria}>
                <ChevronLeft className="w-4 h-4" /> Voltar
              </BtnSecundario>
              <BtnPrimary disabled={servicosIds.length === 0} onClick={() => setStep("profissional")} cor={corPrimaria}>
                Continuar <ChevronRight className="w-4 h-4" />
              </BtnPrimary>
            </div>
          </StepCard>
        )}

        {step === "profissional" && (
          <StepCard title="Com quem?" subtitle="Escolha o profissional ou deixe em aberto">
            <div className="space-y-2">
              <button onClick={() => { setProfissionalId(null); setStep("data"); }}
                className="w-full flex items-center gap-3 p-4 rounded-xl text-left transition-all border-2"
                style={{
                  borderColor: profissionalId === null ? corPrimaria : "#e2e8f0",
                  background: profissionalId === null ? corSecundaria + "50" : "white",
                }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: corPrimaria }}>
                  <Star className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-sm text-slate-800">Qualquer profissional</p>
                  <p className="text-xs text-slate-500">Primeiro horário disponível</p>
                </div>
              </button>
              {profissionais?.map(p => (
                <button key={p.id} onClick={() => { setProfissionalId(p.id); setStep("data"); }}
                  className="w-full flex items-center gap-3 p-4 rounded-xl text-left transition-all border-2"
                  style={{
                    borderColor: profissionalId === p.id ? corPrimaria : "#e2e8f0",
                    background: profissionalId === p.id ? corSecundaria + "50" : "white",
                  }}>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-sm overflow-hidden"
                    style={{ background: corPrimaria }}>
                    {p.avatarUrl
                      ? <img src={p.avatarUrl} alt={p.nome} className="w-full h-full object-cover" />
                      : p.nome.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-slate-800">{p.nome}</p>
                    {p.especialidade && <p className="text-xs text-slate-500">{p.especialidade}</p>}
                  </div>
                </button>
              ))}
            </div>
            <BtnSecundario onClick={() => setStep("servico")} cor={corPrimaria}>
              <ChevronLeft className="w-4 h-4" /> Voltar
            </BtnSecundario>
          </StepCard>
        )}

        {step === "data" && (
          <StepCard title="Quando?" subtitle="Escolha a data e horário">
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Data</p>
                <div className="grid grid-cols-3 gap-2">
                  {datasDisponiveis.slice(0, 12).map(d => {
                    const [ano, mes, dia] = d.split("-").map(Number);
                    const dt = new Date(ano, mes - 1, dia);
                    return (
                      <button key={d} onClick={() => { setData(d); setHora(""); }}
                        className="flex flex-col items-center p-2.5 rounded-xl border-2 transition-all text-sm"
                        style={{
                          borderColor: data === d ? corPrimaria : "#e2e8f0",
                          background: data === d ? corSecundaria + "50" : "white",
                          color: data === d ? corPrimaria : "#475569",
                        }}>
                        <span className="text-[10px] font-medium uppercase">
                          {dt.toLocaleDateString("pt-BR", { weekday: "short" })}
                        </span>
                        <span className="font-bold text-base">{dt.getDate()}</span>
                        <span className="text-[10px]">
                          {dt.toLocaleDateString("pt-BR", { month: "short" })}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {data && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Horário</p>
                  {loadingSlots ? (
                    <div className="flex items-center gap-2 text-sm text-slate-500 py-4">
                      <Loader2 className="w-4 h-4 animate-spin" /> Verificando disponibilidade...
                    </div>
                  ) : slots.length === 0 ? (
                    <p className="text-sm text-slate-500 py-4 text-center">
                      Nenhum horário disponível nesta data. Escolha outro dia.
                    </p>
                  ) : (
                    <div className="grid grid-cols-4 gap-2">
                      {slots.map(h => (
                        <button key={h} onClick={() => setHora(h)}
                          className="py-2 rounded-xl text-sm font-semibold border-2 transition-all"
                          style={{
                            borderColor: hora === h ? corPrimaria : "#e2e8f0",
                            background: hora === h ? corPrimaria : "white",
                            color: hora === h ? "white" : "#475569",
                          }}>
                          {h}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2">
                <BtnSecundario onClick={() => setStep("profissional")} cor={corPrimaria}>
                  <ChevronLeft className="w-4 h-4" /> Voltar
                </BtnSecundario>
                <BtnPrimary disabled={!data || !hora} onClick={() => setStep("confirmacao")} cor={corPrimaria}>
                  Continuar <ChevronRight className="w-4 h-4" />
                </BtnPrimary>
              </div>
            </div>
          </StepCard>
        )}

        {step === "confirmacao" && (
          <StepCard title="Confirmar agendamento" subtitle="Revise os detalhes antes de confirmar">
            <div className="space-y-4">
              <div className="rounded-xl p-4 space-y-3 border"
                style={{ background: corSecundaria + "30", borderColor: corPrimaria + "25" }}>
                {servicosSelecionados.length > 1 ? (
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ background: corPrimaria + "20" }}>
                      <Scissors className="w-4 h-4" style={{ color: corPrimaria }} />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-slate-500 mb-1">Serviços</p>
                      {servicosSelecionados.map(s => (
                        <div key={s.id} className="flex items-center justify-between">
                          <p className="text-sm font-medium text-slate-800">{s.nome}</p>
                          <p className="text-xs text-slate-500 ml-2">{formatCurrency(s.valor)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <ResumoItem icon={Scissors} label="Serviço" value={servicoSelecionado?.nome ?? ""} cor={corPrimaria} />
                )}
                <ResumoItem icon={User} label="Profissional"
                  value={profSelecionado?.nome ?? (profissionalId ? "—" : "Qualquer disponível")} cor={corPrimaria} />
                <ResumoItem icon={Calendar} label="Data" value={formatarData(data)} cor={corPrimaria} />
                <ResumoItem icon={Clock} label="Horário"
                  value={`${hora} · ${duracaoTotalServicos} min`} cor={corPrimaria} />
                <ResumoItem icon={User} label="Cliente" value={`${nome} · ${telefone}`} cor={corPrimaria} />
                <div className="pt-2 border-t" style={{ borderColor: corPrimaria + "20" }}>
                  <p className="text-xs text-slate-500">Valor total</p>
                  <p className="font-bold text-lg" style={{ color: corPrimaria }}>
                    {formatCurrency(valorTotalServicos)}
                  </p>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 block mb-1.5">
                  Observações (opcional)
                </label>
                <textarea
                  value={observacoes}
                  onChange={e => setObservacoes(e.target.value)}
                  placeholder="Alguma informação adicional?"
                  rows={2}
                  className="w-full px-3 py-2.5 rounded-xl text-sm resize-none border-2 outline-none transition-all bg-white text-slate-800"
                  style={{ borderColor: "#e2e8f0" }}
                  onFocus={e => { e.currentTarget.style.borderColor = corPrimaria; }}
                  onBlur={e => { e.currentTarget.style.borderColor = "#e2e8f0"; }}
                />
              </div>

              {!empresa.autoConfirmarPortal && (
                <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2 border border-amber-200">
                  Este agendamento ficará pendente até ser confirmado pelo estabelecimento.
                </p>
              )}

              <div className="flex gap-2">
                <BtnSecundario onClick={() => setStep("data")} cor={corPrimaria}>
                  <ChevronLeft className="w-4 h-4" /> Voltar
                </BtnSecundario>
                <BtnPrimary
                  disabled={agendarMutation.isPending}
                  onClick={() => {
                    const profFinalId = profissionalParaHora ?? profissionalId;
                    if (!profFinalId) {
                      toast.error("Nenhum profissional disponível para este horário.");
                      return;
                    }
                    agendarMutation.mutate({
                      empresaId,
                      servicoId: servicoId!,
                      servicos: servicosSelecionados.map(s => ({
                        servicoId: s.id,
                        valorUnitario: String(parseFloat(String(s.valor ?? 0)).toFixed(2)),
                      })),
                      profissionalId: profFinalId,
                      data,
                      horaInicio: hora,
                      clienteNome: nome,
                      clienteTelefone: telefone,
                      clienteEmail: email || undefined,
                      observacoes: observacoes || undefined,
                    });
                  }}
                  cor={corPrimaria}>
                  {agendarMutation.isPending
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Aguarde...</>
                    : <><CheckCircle2 className="w-4 h-4" /> Confirmar agendamento</>}
                </BtnPrimary>
              </div>
            </div>
          </StepCard>
        )}
      </div>

      <HublyFooter />
    </div>
  );
}

const HUBLY_LOGO_COMPLETO = "https://d2xsxph8kpxj0f.cloudfront.net/310419663029250418/BkCt9rpSQdtCMrvdCmsRG4/hubly-logo-completo_b33cf08a.png";
const HUBLY_LOGO_TRANSPARENTE = "https://d2xsxph8kpxj0f.cloudfront.net/310419663029250418/BkCt9rpSQdtCMrvdCmsRG4/hubly-logo-clean_9c312391.png";

function HublyFooter() {
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

function PortalHeader({ empresa, corPrimaria }: {
  empresa: { nome: string; logoUrl?: string | null };
  corPrimaria: string;
}) {
  const [copiado, setCopiado] = useState(false);

  function compartilhar() {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: empresa.nome, text: `Agende online em ${empresa.nome}`, url })
        .catch(() => copiarLink(url));
    } else {
      copiarLink(url);
    }
  }

  function copiarLink(url: string) {
    navigator.clipboard.writeText(url).then(() => {
      setCopiado(true);
      toast.success("Link copiado! Compartilhe com seus clientes.");
      setTimeout(() => setCopiado(false), 2500);
    }).catch(() => toast.error("Não foi possível copiar o link."));
  }

  return (
    <header className="sticky top-0 z-20 shadow-md" style={{
      background: `linear-gradient(135deg, #1a3a6b 0%, #1e6fa8 60%, #29abe2 100%)`,
    }}>
      <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {empresa.logoUrl ? (
            <img src={empresa.logoUrl} alt={empresa.nome}
              className="h-9 w-auto object-contain rounded-lg"
              style={{ filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.3))" }} />
          ) : (
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-white/20 backdrop-blur-sm border border-white/30">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
          )}
          <div>
            <p className="font-bold text-sm tracking-tight text-white drop-shadow-sm">{empresa.nome}</p>
            <p className="text-[10px] text-blue-100/80">Agendamento Online</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={compartilhar}
            title="Compartilhar link de agendamento"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 active:bg-white/30 transition-all text-white border border-white/20 text-[11px] font-medium"
          >
            {copiado
              ? <><CheckCircle2 className="w-3.5 h-3.5 text-green-300" /><span className="hidden sm:inline">Copiado!</span></>
              : <><Share2 className="w-3.5 h-3.5" /><span className="hidden sm:inline">Compartilhar</span></>
            }
          </button>
          <img src={HUBLY_LOGO_TRANSPARENTE} alt="Hubly"
            className="h-5 w-auto object-contain opacity-60 hover:opacity-90 transition-opacity"
            style={{ filter: "brightness(0) invert(1)" }} />
        </div>
      </div>
    </header>
  );
}

function StepCard({ title, subtitle, children }: {
  title: string; subtitle: string; children: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-bold text-xl text-slate-800">{title}</h2>
        <p className="text-sm text-slate-500">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

function InputField({ label, value, onChange, onBlur, icon: Icon, placeholder, corPrimaria }: {
  label: string; value: string; onChange: (v: string) => void;
  onBlur?: () => void;
  icon: React.ElementType; placeholder: string; corPrimaria: string;
}) {
  return (
    <div>
      <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 block mb-1.5">
        {label}
      </label>
      <div className="relative">
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input type="text" value={value} onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm border-2 outline-none transition-all bg-white text-slate-800"
          style={{ borderColor: "#e2e8f0" }}
          onFocus={e => { e.currentTarget.style.borderColor = corPrimaria; }}
          onBlur={e => { e.currentTarget.style.borderColor = "#e2e8f0"; onBlur?.(); }}
        />
      </div>
    </div>
  );
}

function BtnPrimary({ children, onClick, disabled, cor }: {
  children: React.ReactNode; onClick: () => void; disabled?: boolean; cor: string;
}) {
  return (
    <button onClick={onClick} disabled={disabled}
      className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-white font-semibold text-sm shadow-md transition-opacity"
      style={{ background: disabled ? "#cbd5e1" : cor, cursor: disabled ? "not-allowed" : "pointer" }}>
      {children}
    </button>
  );
}

function BtnSecundario({ children, onClick, cor }: {
  children: React.ReactNode; onClick: () => void; cor: string;
}) {
  return (
    <button onClick={onClick}
      className="flex items-center gap-1 px-4 py-3 rounded-xl text-sm font-semibold border-2 transition-all bg-white"
      style={{ borderColor: cor + "40", color: cor }}>
      {children}
    </button>
  );
}

function ResumoItem({ icon: Icon, label, value, cor }: {
  icon: React.ElementType; label: string; value: string; cor: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: cor + "15" }}>
        <Icon className="w-3.5 h-3.5" style={{ color: cor }} />
      </div>
      <div>
        <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">{label}</p>
        <p className="text-sm font-semibold text-slate-700">{value}</p>
      </div>
    </div>
  );
}

function StatusBadge({ status, corPrimaria }: { status: string; corPrimaria: string }) {
  const map: Record<string, { label: string; color: string }> = {
    pre_agendado: { label: "Pendente", color: "#f59e0b" },
    agendado: { label: "Agendado", color: corPrimaria },
    confirmado: { label: "Confirmado", color: "#10b981" },
    concluido: { label: "Concluído", color: "#6b7280" },
  };
  const info = map[status] ?? { label: status, color: "#6b7280" };
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
      style={{ background: info.color + "20", color: info.color }}>
      {info.label}
    </span>
  );
}
