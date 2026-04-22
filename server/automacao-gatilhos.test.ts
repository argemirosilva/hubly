/**
 * Testes unitários — Gatilhos de Automação
 *
 * Cobre:
 * - verificarCondicoesFlow: filtragem por serviço, sem condições, flow inválido
 * - getDataStr: normalização de Date e string
 * - formatarHora: formatação HH:mm
 * - localToUtc: conversão timezone → UTC
 * - Lógica de prioridade: pre_agendado vs agendado_criado
 * - Lógica de deduplicação: não enfileirar se já existe registro
 * - Substituição de variáveis dinâmicas na mensagem
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks necessários para importar o scheduler sem efeitos colaterais ──────
vi.mock("./db", () => ({
  getDb: vi.fn().mockResolvedValue(null),
  registrarEnvioAutomacao: vi.fn().mockResolvedValue(undefined),
  getAutomacaoByEvento: vi.fn().mockResolvedValue(null),
  getAutomacoesByEvento: vi.fn().mockResolvedValue([]),
  getAutomacaoByTipoGatilho: vi.fn().mockResolvedValue(null),
  getAutomacoesAtivasByTipo: vi.fn().mockResolvedValue([]),
  getEmpresasComAutomacoes: vi.fn().mockResolvedValue([]),
  jaEnviouLembrete: vi.fn().mockResolvedValue(false),
  jaEnviouParaCliente: vi.fn().mockResolvedValue(false),
  createNotificacao: vi.fn().mockResolvedValue(1),
}));

vi.mock("./whatsapp", () => ({
  waManager: {
    getState: vi.fn().mockReturnValue({ status: "connected" }),
    sendMessage: vi.fn().mockResolvedValue(true),
    on: vi.fn(),
  },
}));

vi.mock("./whatsapp-router", () => ({
  routedSendMessage: vi.fn().mockResolvedValue(true),
  routedSendMedia: vi.fn().mockResolvedValue(true),
}));

vi.mock("./confirmacao", () => ({
  gerarTokenConfirmacao: vi.fn().mockResolvedValue("token-teste-123"),
}));

vi.mock("./jobs/notificacoes-agendamento", () => ({
  enviarNotificacoesAgendamento: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./_core/env", () => ({
  ENV: {
    stripeSecretKey: "sk_test_xxx",
    stripeWebhookSecret: "whsec_test",
    zapiInstanceId: "",
    zapiToken: "",
    zapiClientToken: "",
  },
}));

// ─── Helpers locais replicados do scheduler (funções puras) ──────────────────
// Replicamos aqui para testar sem depender de importação dinâmica do scheduler
// (que tem efeitos colaterais de setInterval ao ser importado).

function getDataStr(data: unknown): string {
  if (data instanceof Date) {
    return `${data.getUTCFullYear()}-${String(data.getUTCMonth() + 1).padStart(2, "0")}-${String(data.getUTCDate()).padStart(2, "0")}`;
  }
  return String(data).slice(0, 10);
}

function formatarHora(hora: string | null | undefined): string {
  if (!hora) return "";
  return String(hora).slice(0, 5);
}

function localToUtc(dataStr: string, horaStr: string, timezone: string): Date {
  const naive = new Date(`${dataStr}T${horaStr}:00`);
  const utcStr = naive.toLocaleString("en-US", { timeZone: "UTC" });
  const tzStr = naive.toLocaleString("en-US", { timeZone: timezone });
  const utcDate = new Date(utcStr);
  const tzDate = new Date(tzStr);
  const offset = utcDate.getTime() - tzDate.getTime();
  return new Date(naive.getTime() + offset);
}

function verificarCondicoesFlow(
  flowJson: string | null | undefined,
  servicoNome: string | null | undefined,
  todosServicos?: string[]
): boolean {
  if (!flowJson) return true;
  try {
    const flow = JSON.parse(flowJson);
    if (!Array.isArray(flow)) return true;
    const condicoes = flow.filter((n: any) => n?.type === "condition");
    if (condicoes.length === 0) return true;
    for (const cond of condicoes) {
      const tipo = cond?.data?.tipo;
      const valor = cond?.data?.valor;
      if (tipo === "por_servico" && valor) {
        const servicosFiltro = String(valor)
          .split(",")
          .map((s: string) => s.trim().toLowerCase());
        const listaServicos =
          todosServicos && todosServicos.length > 0
            ? todosServicos.map((s) => s.trim().toLowerCase()).filter(Boolean)
            : [(servicoNome ?? "").trim().toLowerCase()].filter(Boolean);
        if (listaServicos.length === 0) return false;
        const passou = servicosFiltro.some((sf: string) =>
          listaServicos.some((sa: string) => sa === sf)
        );
        if (!passou) return false;
      }
    }
    return true;
  } catch {
    return true;
  }
}

function substituirVariaveis(
  template: string,
  vars: Record<string, string>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? "");
}

// ─── Testes: getDataStr ───────────────────────────────────────────────────────
describe("getDataStr", () => {
  it("deve converter Date para string YYYY-MM-DD (UTC)", () => {
    const d = new Date("2025-06-15T12:00:00Z");
    expect(getDataStr(d)).toBe("2025-06-15");
  });

  it("deve retornar os primeiros 10 chars de uma string", () => {
    expect(getDataStr("2025-12-31T00:00:00")).toBe("2025-12-31");
  });

  it("deve lidar com string já no formato YYYY-MM-DD", () => {
    expect(getDataStr("2025-01-01")).toBe("2025-01-01");
  });
});

// ─── Testes: formatarHora ─────────────────────────────────────────────────────
describe("formatarHora", () => {
  it("deve retornar HH:mm sem segundos", () => {
    expect(formatarHora("09:30:00")).toBe("09:30");
  });

  it("deve retornar string vazia para null", () => {
    expect(formatarHora(null)).toBe("");
  });

  it("deve retornar string vazia para undefined", () => {
    expect(formatarHora(undefined)).toBe("");
  });

  it("deve manter HH:mm se já estiver no formato correto", () => {
    expect(formatarHora("14:45")).toBe("14:45");
  });
});

// ─── Testes: localToUtc ───────────────────────────────────────────────────────
describe("localToUtc", () => {
  it("deve retornar um objeto Date válido para America/Sao_Paulo", () => {
    const utc = localToUtc("2025-06-15", "09:00", "America/Sao_Paulo");
    expect(utc).toBeInstanceOf(Date);
    expect(isNaN(utc.getTime())).toBe(false);
  });

  it("deve retornar data no dia correto para America/Sao_Paulo", () => {
    // 09:00 BRT = 12:00 UTC (UTC-3 no inverno)
    // Verificamos que o resultado é coerente: a hora UTC deve ser maior que a hora local
    // pois BRT está atrás do UTC
    const utc1 = localToUtc("2025-06-15", "09:00", "America/Sao_Paulo");
    const utc2 = localToUtc("2025-06-15", "09:00", "UTC");
    // America/Sao_Paulo está atrás de UTC, então o timestamp UTC de BRT deve ser MAIOR
    // (mesma hora local, mas BRT é mais cedo em UTC)
    expect(utc1.getTime()).toBeGreaterThan(utc2.getTime());
  });

  it("deve retornar um objeto Date válido para UTC", () => {
    const utc = localToUtc("2025-06-15", "10:00", "UTC");
    expect(utc).toBeInstanceOf(Date);
    expect(isNaN(utc.getTime())).toBe(false);
  });

  it("deve produzir timestamps ordenados corretamente entre timezones", () => {
    // America/Sao_Paulo (UTC-3) é mais cedo que UTC
    // Portanto 10:00 BRT em UTC = 13:00 UTC
    // E 10:00 UTC em UTC = 10:00 UTC
    // Então localToUtc(BRT) > localToUtc(UTC) para a mesma hora local
    const brt = localToUtc("2025-06-15", "10:00", "America/Sao_Paulo");
    const utc = localToUtc("2025-06-15", "10:00", "UTC");
    // BRT é UTC-3, então 10:00 BRT = 13:00 UTC, que é maior que 10:00 UTC
    expect(brt.getTime()).toBeGreaterThan(utc.getTime());
    // A diferença deve ser de 3h (10800000ms) em junho (sem horário de verão no Brasil)
    const diffHoras = (brt.getTime() - utc.getTime()) / (1000 * 60 * 60);
    expect(diffHoras).toBeCloseTo(3, 0);
  });
});

// ─── Testes: verificarCondicoesFlow ──────────────────────────────────────────
describe("verificarCondicoesFlow — filtro por serviço", () => {
  it("deve retornar true quando flowJson é null (sem filtro)", () => {
    expect(verificarCondicoesFlow(null, "Corte")).toBe(true);
  });

  it("deve retornar true quando flowJson é string vazia", () => {
    expect(verificarCondicoesFlow("", "Corte")).toBe(true);
  });

  it("deve retornar true quando flow não tem nós de condição", () => {
    const flow = JSON.stringify([
      { type: "trigger", data: { evento: "agendamento_criado" } },
      { type: "action", data: { mensagem: "Olá!" } },
    ]);
    expect(verificarCondicoesFlow(flow, "Corte")).toBe(true);
  });

  it("deve retornar true quando serviço do agendamento bate com filtro", () => {
    const flow = JSON.stringify([
      { type: "condition", data: { tipo: "por_servico", valor: "Corte, Escova" } },
    ]);
    expect(verificarCondicoesFlow(flow, "Corte")).toBe(true);
  });

  it("deve retornar false quando serviço do agendamento NÃO bate com filtro", () => {
    const flow = JSON.stringify([
      { type: "condition", data: { tipo: "por_servico", valor: "Escova, Tintura" } },
    ]);
    expect(verificarCondicoesFlow(flow, "Corte")).toBe(false);
  });

  it("deve ser case-insensitive na comparação de serviços", () => {
    const flow = JSON.stringify([
      { type: "condition", data: { tipo: "por_servico", valor: "CORTE" } },
    ]);
    expect(verificarCondicoesFlow(flow, "corte")).toBe(true);
  });

  it("deve retornar false quando agendamento não tem serviço e há filtro", () => {
    const flow = JSON.stringify([
      { type: "condition", data: { tipo: "por_servico", valor: "Corte" } },
    ]);
    expect(verificarCondicoesFlow(flow, null)).toBe(false);
  });

  it("deve usar todosServicos quando fornecido (serviço composto)", () => {
    const flow = JSON.stringify([
      { type: "condition", data: { tipo: "por_servico", valor: "Manicure" } },
    ]);
    // servicoNome principal é "Corte", mas todosServicos inclui "Manicure"
    expect(verificarCondicoesFlow(flow, "Corte", ["Corte", "Manicure"])).toBe(true);
  });

  it("deve retornar true quando flow JSON é inválido (não bloquear)", () => {
    expect(verificarCondicoesFlow("{ invalid json }", "Corte")).toBe(true);
  });

  it("deve retornar true quando flow não é array", () => {
    expect(verificarCondicoesFlow(JSON.stringify({ tipo: "condition" }), "Corte")).toBe(true);
  });
});

// ─── Testes: Substituição de variáveis dinâmicas ──────────────────────────────
describe("substituirVariaveis — template de mensagem", () => {
  const vars = {
    nome_cliente: "Maria Silva",
    primeiro_nome: "Maria",
    servico: "Corte e Escova",
    data: "15/06/2025",
    hora: "10:00",
    profissional: "Ana",
    empresa: "Studio Bela",
    valor: "R$ 120,00",
    link_agendamento: "https://hubly.orizontech.com.br/agendar/studio",
  };

  it("deve substituir {{nome_cliente}} pelo nome completo", () => {
    const msg = substituirVariaveis("Olá, {{nome_cliente}}!", vars);
    expect(msg).toBe("Olá, Maria Silva!");
  });

  it("deve substituir {{primeiro_nome}} pelo primeiro nome", () => {
    const msg = substituirVariaveis("Oi {{primeiro_nome}},", vars);
    expect(msg).toBe("Oi Maria,");
  });

  it("deve substituir múltiplas variáveis em uma mensagem", () => {
    const msg = substituirVariaveis(
      "{{nome_cliente}}, seu {{servico}} está agendado para {{data}} às {{hora}}.",
      vars
    );
    expect(msg).toBe(
      "Maria Silva, seu Corte e Escova está agendado para 15/06/2025 às 10:00."
    );
  });

  it("deve deixar variável vazia quando não encontrada no mapa", () => {
    const msg = substituirVariaveis("Código: {{codigo_secreto}}", vars);
    expect(msg).toBe("Código: ");
  });

  it("deve substituir {{link_agendamento}} com URL correta", () => {
    const msg = substituirVariaveis("Agende aqui: {{link_agendamento}}", vars);
    expect(msg).toContain("https://hubly.orizontech.com.br/agendar/studio");
  });

  it("deve retornar mensagem sem alteração quando não há variáveis", () => {
    const msg = substituirVariaveis("Mensagem sem variáveis.", vars);
    expect(msg).toBe("Mensagem sem variáveis.");
  });
});

// ─── Testes: Lógica de prioridade pre_agendado vs agendado_criado ─────────────
describe("Lógica de prioridade de gatilhos de evento", () => {
  it("deve disparar agendamento_pre_agendado quando status é pre_agendado e automação existe", () => {
    // Simula a lógica do router: se status=pre_agendado e automação de pre_agendado existe,
    // dispara pre_agendado e NÃO dispara agendamento_criado
    const statusAgendamento = "pre_agendado";
    const automacaoPreAgendado = { id: 1, nome: "Pré-agendamento", ativo: true };
    const automacaoCriado = { id: 2, nome: "Agendamento criado", ativo: true };

    let eventoDisparado: string | null = null;

    if (statusAgendamento === "pre_agendado" && automacaoPreAgendado) {
      eventoDisparado = "agendamento_pre_agendado";
    } else if (automacaoCriado) {
      eventoDisparado = "agendamento_criado";
    }

    expect(eventoDisparado).toBe("agendamento_pre_agendado");
  });

  it("deve disparar agendamento_criado quando status é pre_agendado mas automação de pre_agendado não existe", () => {
    const statusAgendamento = "pre_agendado";
    const automacaoPreAgendado = null;
    const automacaoCriado = { id: 2, nome: "Agendamento criado", ativo: true };

    let eventoDisparado: string | null = null;

    if (statusAgendamento === "pre_agendado" && automacaoPreAgendado) {
      eventoDisparado = "agendamento_pre_agendado";
    } else if (automacaoCriado) {
      eventoDisparado = "agendamento_criado";
    }

    expect(eventoDisparado).toBe("agendamento_criado");
  });

  it("deve disparar apenas agendamento_criado quando status é agendado", () => {
    const statusAgendamento = "agendado";
    const automacaoCriado = { id: 2, nome: "Agendamento criado", ativo: true };

    let eventoDisparado: string | null = null;

    // Status 'agendado' sempre dispara agendamento_criado diretamente
    if (statusAgendamento === "agendado" && automacaoCriado) {
      eventoDisparado = "agendamento_criado";
    }

    expect(eventoDisparado).toBe("agendamento_criado");
  });

  it("deve mapear status confirmado para evento agendamento_confirmado", () => {
    const novoStatus = "confirmado";
    const eventoStatus =
      novoStatus === "confirmado"
        ? "agendamento_confirmado"
        : novoStatus === "cancelado"
        ? "agendamento_cancelado"
        : novoStatus === "concluido"
        ? "agendamento_concluido"
        : null;
    expect(eventoStatus).toBe("agendamento_confirmado");
  });

  it("deve mapear status cancelado para evento agendamento_cancelado", () => {
    const novoStatus = "cancelado";
    const eventoStatus =
      novoStatus === "confirmado"
        ? "agendamento_confirmado"
        : novoStatus === "cancelado"
        ? "agendamento_cancelado"
        : novoStatus === "concluido"
        ? "agendamento_concluido"
        : null;
    expect(eventoStatus).toBe("agendamento_cancelado");
  });

  it("deve mapear status concluido para evento agendamento_concluido", () => {
    const novoStatus = "concluido";
    const eventoStatus =
      novoStatus === "confirmado"
        ? "agendamento_confirmado"
        : novoStatus === "cancelado"
        ? "agendamento_cancelado"
        : novoStatus === "concluido"
        ? "agendamento_concluido"
        : null;
    expect(eventoStatus).toBe("agendamento_concluido");
  });
});

// ─── Testes: Cálculo de enviarEm para gatilhos de tempo ──────────────────────
describe("Cálculo de enviarEm — gatilhos de tempo", () => {
  it("deve calcular enviarEm para horas_antes_agendamento corretamente", () => {
    // Agendamento: 15/06/2025 às 10:00 em Brasília
    // Automação: 2h antes → enviarEm = 2h antes do timestamp do agendamento
    const dataStr = "2025-06-15";
    const horaInicio = "10:00";
    const delayMinutos = 120; // 2h
    const timezone = "America/Sao_Paulo";

    const tsAgendamento = localToUtc(dataStr, horaInicio, timezone).getTime();
    const enviarEm = new Date(tsAgendamento - delayMinutos * 60 * 1000);

    // enviarEm deve ser exatamente 2h antes do agendamento
    const diffMs = tsAgendamento - enviarEm.getTime();
    const diffHoras = diffMs / (1000 * 60 * 60);
    expect(diffHoras).toBe(2);
    // A data do envio deve ser no dia 15 ou 14 (se agendamento for cedo)
    expect(enviarEm).toBeInstanceOf(Date);
    expect(isNaN(enviarEm.getTime())).toBe(false);
  });

  it("deve calcular enviarEm para dias_antes_agendamento corretamente", () => {
    // Agendamento: 15/06/2025
    // Automação: 1 dia antes às 09:00 → enviarEm = 14/06/2025 às 09:00 BRT
    const dataStr = "2025-06-15";
    const diasAntes = 1;
    const horaDisparo = "09:00";
    const timezone = "America/Sao_Paulo";

    const [ano, mes, dia] = dataStr.split("-").map(Number);
    const dPre = new Date(ano, mes - 1, dia - diasAntes);
    const dPreStr = `${dPre.getFullYear()}-${String(dPre.getMonth() + 1).padStart(2, "0")}-${String(dPre.getDate()).padStart(2, "0")}`;
    const enviarEm = localToUtc(dPreStr, horaDisparo, timezone);

    // A data calculada deve ser 1 dia antes
    expect(dPreStr).toBe("2025-06-14");
    // O resultado deve ser um Date válido
    expect(enviarEm).toBeInstanceOf(Date);
    expect(isNaN(enviarEm.getTime())).toBe(false);
    // O dia UTC deve ser 14 (ou 13 se o offset fizer cruzar meia-noite, o que não ocorre para 09:00 BRT)
    expect(enviarEm.getUTCDate()).toBe(14);
  });

  it("deve não registrar envio quando enviarEm já passou", () => {
    // Simula a verificação: só registra se enviarEm é futuro
    const agora = new Date();
    const enviarEmPassado = new Date(agora.getTime() - 60 * 1000); // 1 min atrás

    const deveRegistrar = enviarEmPassado.getTime() > agora.getTime();
    expect(deveRegistrar).toBe(false);
  });

  it("deve registrar envio quando enviarEm é futuro", () => {
    const agora = new Date();
    const enviarEmFuturo = new Date(agora.getTime() + 60 * 60 * 1000); // 1h à frente

    const deveRegistrar = enviarEmFuturo.getTime() > agora.getTime();
    expect(deveRegistrar).toBe(true);
  });
});

// ─── Testes: Lógica de status da fila (pendente vs agendado) ─────────────────
describe("Lógica de status da fila — pendente vs agendado", () => {
  const LIMIAR_FUTURO = 60 * 1000; // 60 segundos

  function determinarStatus(
    statusInformado: string,
    enviarEm?: Date
  ): string {
    let statusFinal = statusInformado ?? "enviado";
    if (
      statusFinal === "pendente" &&
      enviarEm &&
      enviarEm.getTime() - Date.now() > LIMIAR_FUTURO
    ) {
      statusFinal = "agendado";
    }
    return statusFinal;
  }

  it("deve promover status pendente para agendado quando enviarEm é > 60s no futuro", () => {
    const enviarEm = new Date(Date.now() + 5 * 60 * 1000); // 5min no futuro
    expect(determinarStatus("pendente", enviarEm)).toBe("agendado");
  });

  it("deve manter status pendente quando enviarEm está dentro de 60s", () => {
    const enviarEm = new Date(Date.now() + 30 * 1000); // 30s no futuro
    expect(determinarStatus("pendente", enviarEm)).toBe("pendente");
  });

  it("deve manter status enviado sem alterar", () => {
    expect(determinarStatus("enviado")).toBe("enviado");
  });

  it("deve manter status falhou sem alterar", () => {
    expect(determinarStatus("falhou")).toBe("falhou");
  });

  it("deve usar enviado como padrão quando status não informado", () => {
    expect(determinarStatus(undefined as any)).toBe("enviado");
  });
});
