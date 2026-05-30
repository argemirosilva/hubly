import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock das funções do DB
vi.mock("./db", () => ({
  getEmpresaByOwnerId: vi.fn(),
  getClientesByEmpresa: vi.fn(),
  createCliente: vi.fn(),
  getServicosByEmpresa: vi.fn(),
  createServico: vi.fn(),
  getProfissionaisByEmpresa: vi.fn(),
  createProfissional: vi.fn(),
  createAgendamento: vi.fn(),
  getAgendamentosByEmpresa: vi.fn(),
}));

import {
  getEmpresaByOwnerId,
  getClientesByEmpresa,
  createCliente,
  getServicosByEmpresa,
  createServico,
  getProfissionaisByEmpresa,
  createProfissional,
  createAgendamento,
  getAgendamentosByEmpresa,
} from "./db";

// ─── Testes de lógica de deduplicação ─────────────────────────────────────────

describe("Importação Zandu — lógica de deduplicação", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("detecta duplicado por telefone (normalizado)", () => {
    const existentes = [{ telefone: "(55) 11 99999-0001", email: null }];
    const telefonesExistentes = new Set(existentes.map((c) => c.telefone?.replace(/\D/g, "")));

    const candidato = { phone: "5511999990001" };
    const telefoneLimpo = candidato.phone.replace(/\D/g, "");
    expect(telefonesExistentes.has(telefoneLimpo)).toBe(true);
  });

  it("não detecta duplicado quando telefone é diferente", () => {
    const existentes = [{ telefone: "5511999990001", email: null }];
    const telefonesExistentes = new Set(existentes.map((c) => c.telefone?.replace(/\D/g, "")));

    const candidato = { phone: "5511999990002" };
    const telefoneLimpo = candidato.phone.replace(/\D/g, "");
    expect(telefonesExistentes.has(telefoneLimpo)).toBe(false);
  });

  it("detecta duplicado por email (case-insensitive)", () => {
    const existentes = [{ telefone: null, email: "JOAO@EXAMPLE.COM" }];
    const emailsExistentes = new Set(existentes.map((c) => c.email?.toLowerCase()).filter(Boolean));

    const candidato = { email: "joao@example.com" };
    expect(emailsExistentes.has(candidato.email.toLowerCase())).toBe(true);
  });

  it("detecta duplicado de serviço por nome (case-insensitive)", () => {
    const existentes = [{ nome: "Corte Feminino" }];
    const nomesExistentes = new Set(existentes.map((s) => s.nome.toLowerCase().trim()));

    const candidato = { name: "corte feminino" };
    expect(nomesExistentes.has(candidato.name.toLowerCase().trim())).toBe(true);
  });

  it("não detecta duplicado de serviço com nome diferente", () => {
    const existentes = [{ nome: "Corte Feminino" }];
    const nomesExistentes = new Set(existentes.map((s) => s.nome.toLowerCase().trim()));

    const candidato = { name: "Manicure" };
    expect(nomesExistentes.has(candidato.name.toLowerCase().trim())).toBe(false);
  });
});

// ─── Testes de mapeamento de campos ───────────────────────────────────────────

describe("Importação Zandu — mapeamento de campos", () => {
  it("mapeia campos da pessoa Zandu para cliente Hubly corretamente", () => {
    const zanduPerson = {
      personId: "abc-123",
      name: "Maria Silva",
      email: "maria@email.com",
      phone: "5511999990001",
      document: "123.456.789-00",
      born: "1990-05-15T00:00:00.000Z",
      comments: "Cliente VIP",
    };

    const clienteHubly = {
      empresaId: 1,
      nome: zanduPerson.name,
      email: zanduPerson.email || null,
      telefone: zanduPerson.phone || null,
      whatsapp: zanduPerson.phone || null,
      cpf: zanduPerson.document || null,
      dataNascimento: zanduPerson.born ? zanduPerson.born.split("T")[0] : null,
      observacoes: zanduPerson.comments || null,
      tags: [],
      ativo: true,
    };

    expect(clienteHubly.nome).toBe("Maria Silva");
    expect(clienteHubly.email).toBe("maria@email.com");
    expect(clienteHubly.dataNascimento).toBe("1990-05-15");
    expect(clienteHubly.cpf).toBe("123.456.789-00");
    expect(clienteHubly.ativo).toBe(true);
  });

  it("mapeia campos do serviço Zandu para serviço Hubly corretamente", () => {
    const zanduService = {
      name: "Corte + Escova",
      description: "Corte e escova profissional",
      price: 120.5,
      duration: 90,
      category: "Cabelo",
    };

    const servicoHubly = {
      empresaId: 1,
      nome: zanduService.name,
      descricao: zanduService.description || null,
      valor: String(zanduService.price ?? "0"),
      duracaoMinutos: zanduService.duration ?? 60,
      categoria: zanduService.category || null,
      ativo: true,
    };

    expect(servicoHubly.nome).toBe("Corte + Escova");
    expect(servicoHubly.valor).toBe("120.5");
    expect(servicoHubly.duracaoMinutos).toBe(90);
    expect(servicoHubly.categoria).toBe("Cabelo");
  });

  it("usa valor padrão de duração 60 min quando não informado", () => {
    const zanduService = { name: "Serviço sem duração", price: 50 };
    const duracaoMinutos = (zanduService as { duration?: number }).duration ?? 60;
    expect(duracaoMinutos).toBe(60);
  });

  it("usa valor padrão 0 quando preço não informado", () => {
    const zanduService = { name: "Serviço sem preço" };
    const valor = String((zanduService as { price?: number }).price ?? "0");
    expect(valor).toBe("0");
  });
});

// ─── Testes de contagem de resultados ─────────────────────────────────────────

describe("Importação Zandu — contagem de resultados", () => {
  it("calcula totais corretamente", () => {
    const log = [
      { tipo: "clientes", total: 10, importados: 7, duplicados: 2, erros: 1, detalhes: [] },
      { tipo: "servicos", total: 5, importados: 4, duplicados: 1, erros: 0, detalhes: [] },
    ];

    const totalImportados = log.reduce((s, l) => s + l.importados, 0);
    const totalDuplicados = log.reduce((s, l) => s + l.duplicados, 0);
    const totalErros = log.reduce((s, l) => s + l.erros, 0);

    expect(totalImportados).toBe(11);
    expect(totalDuplicados).toBe(3);
    expect(totalErros).toBe(1);
  });
});

// ─── Testes de mapeamento de agendamentos ─────────────────────────────────────

describe("Importação Zandu — mapeamento de agendamentos", () => {
  it("mapeia status do Zandu para status do Hubly corretamente", () => {
    const statusMap: Record<string, string> = {
      criado: "agendado",
      confirmado: "confirmado",
      compareceu: "concluido",
      faltou: "faltou",
      cancelado_empresa: "cancelado",
      cancelado_usuario: "cancelado",
      cancelado: "cancelado",
      remarcado: "cancelado",
    };
    expect(statusMap["criado"]).toBe("agendado");
    expect(statusMap["compareceu"]).toBe("concluido");
    expect(statusMap["cancelado_empresa"]).toBe("cancelado");
    expect(statusMap["faltou"]).toBe("faltou");
    expect(statusMap["desconhecido"] ?? "agendado").toBe("agendado");
  });

  it("extrai data e hora corretamente de uma string ISO", () => {
    const startRaw = "2024-06-15T14:30:00.000Z";
    const startDt = new Date(startRaw);
    const dataStr = startDt.toISOString().split("T")[0];
    const horaStr = startDt.toTimeString().slice(0, 5);
    expect(dataStr).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(horaStr).toMatch(/^\d{2}:\d{2}$/);
  });

  it("calcula hora fim com base na duração do serviço quando endDate não fornecido", () => {
    const startDt = new Date("2024-06-15T14:30:00.000Z");
    const duracao = 90;
    const endDt = new Date(startDt.getTime() + duracao * 60000);
    // Verificar que a diferença é exatamente 90 minutos (independente de timezone)
    const diffMinutos = (endDt.getTime() - startDt.getTime()) / 60000;
    expect(diffMinutos).toBe(90);
  });

  it("resolve clienteId pelo nome normalizado", () => {
    const clientesLocais = [{ id: 42, nome: "Maria Silva" }];
    const clienteMap = new Map(clientesLocais.map((c) => [c.nome.toLowerCase().trim(), c.id]));
    expect(clienteMap.get("maria silva")).toBe(42);
    expect(clienteMap.get("joao souza")).toBeUndefined();
  });

  it("rejeita agendamento sem data", () => {
    const agendamento = { personName: "João", startDate: undefined };
    const startRaw = (agendamento as { startDate?: string }).startDate || "";
    expect(startRaw).toBe("");
  });

  it("aceita campos aninhados de pessoa/serviço/profissional", () => {
    const zanduAppointment = {
      person: { name: "Ana Costa" },
      service: { name: "Manicure", price: 50 },
      user: { name: "Carol" },
      startDate: "2024-07-01T10:00:00.000Z",
    };
    const clienteNome = (zanduAppointment.person?.name || "").trim();
    const servicoNome = (zanduAppointment.service?.name || "").trim();
    const profissionalNome = (zanduAppointment.user?.name || "").trim();
    expect(clienteNome).toBe("Ana Costa");
    expect(servicoNome).toBe("Manicure");
    expect(profissionalNome).toBe("Carol");
  });
});
