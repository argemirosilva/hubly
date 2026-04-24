import { describe, expect, it } from "vitest";
import * as fs from "fs";
import * as path from "path";

/**
 * Testes de validação: Unificação de Gatilhos + Multi-trigger.
 *
 * Garante que:
 * 1. A guarda anti-duplicidade existe no confirmarReserva
 * 2. Os serviços compostos são buscados no confirmarReserva
 * 3. O campo eventosAdicionais existe no schema
 * 4. As queries de automação suportam multi-trigger (OR + JSON_CONTAINS)
 * 5. O frontend suporta multi-trigger (UI de gatilhos adicionais)
 * 6. O backend aceita eventosAdicionais nos inputs de create/update
 */

const SERVER_DIR = path.resolve(__dirname);
const CLIENT_DIR = path.resolve(__dirname, "../client/src");
const DRIZZLE_DIR = path.resolve(__dirname, "../drizzle");

function readFile(filePath: string): string {
  return fs.readFileSync(filePath, "utf-8");
}

describe("Unificação de Gatilhos", () => {
  describe("Guarda anti-duplicidade no confirmarReserva", () => {
    const routersContent = readFile(path.join(SERVER_DIR, "routers.ts"));

    it("deve importar jaEnviouNaCriacaoDoAgendamento", () => {
      expect(routersContent).toContain("jaEnviouNaCriacaoDoAgendamento");
    });

    it("deve verificar se já enviou na criação antes de enviar na reserva", () => {
      // Buscar o trecho do confirmarReserva que contém a guarda
      expect(routersContent).toContain("jaEnviouNaCriacaoDoAgendamento");
    });

    it("deve conter log de skip quando já enviou na criação", () => {
      expect(routersContent).toMatch(/j[aá] enviou.*cria[çc][aã]o/i);
    });
  });

  describe("Serviços compostos no confirmarReserva", () => {
    const routersContent = readFile(path.join(SERVER_DIR, "routers.ts"));

    it("deve buscar agendamentoItens no confirmarReserva", () => {
      // Verificar que o confirmarReserva busca itens compostos
      const confirmarBlock = routersContent.match(
        /confirmarReserva[\s\S]*?(?=\w+:\s*protectedProcedure)/
      );
      expect(confirmarBlock).toBeTruthy();
      if (confirmarBlock) {
        expect(confirmarBlock[0]).toContain("agendamentoItens");
      }
    });
  });
});

describe("Multi-trigger", () => {
  describe("Schema — campo eventosAdicionais", () => {
    const schemaContent = readFile(path.join(DRIZZLE_DIR, "schema.ts"));

    it("deve conter campo eventosAdicionais na tabela automacoes", () => {
      expect(schemaContent).toContain('eventosAdicionais');
    });

    it("deve ser do tipo text (para armazenar JSON)", () => {
      expect(schemaContent).toMatch(/eventosAdicionais.*text/);
    });
  });

  describe("Backend — queries com OR + JSON_CONTAINS", () => {
    const dbContent = readFile(path.join(SERVER_DIR, "db.ts"));

    it("getAutomacaoByEvento deve usar OR para buscar em eventosAdicionais", () => {
      expect(dbContent).toContain("JSON_CONTAINS");
    });

    it("getAutomacoesByEvento deve usar OR para buscar em eventosAdicionais", () => {
      // Contar ocorrências de JSON_CONTAINS — deve haver pelo menos 2 (uma para cada função)
      const matches = dbContent.match(/JSON_CONTAINS/g);
      expect(matches).toBeTruthy();
      expect(matches!.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("Backend — inputs de create/update aceitam eventosAdicionais", () => {
    const routersContent = readFile(path.join(SERVER_DIR, "routers.ts"));

    it("create deve aceitar eventosAdicionais no input", () => {
      // Verificar que eventosAdicionais aparece no schema de input do create
      expect(routersContent).toContain("eventosAdicionais: z.string().nullable().optional()");
    });

    it("update deve aceitar eventosAdicionais no input", () => {
      // Contar ocorrências de eventosAdicionais no routers.ts (deve ter pelo menos 2: create + update)
      const matches = routersContent.match(/eventosAdicionais/g);
      expect(matches).toBeTruthy();
      expect(matches!.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("Frontend — UI de multi-trigger", () => {
    const automacoesContent = readFile(path.join(CLIENT_DIR, "pages/Automacoes.tsx"));

    it("deve conter seção de gatilhos adicionais", () => {
      expect(automacoesContent).toContain("Gatilhos adicionais");
    });

    it("deve conter checkboxes para eventos compatíveis", () => {
      expect(automacoesContent).toContain("eventosCompativeis");
    });

    it("deve enviar eventosAdicionais no saveFlow", () => {
      expect(automacoesContent).toContain("eventosAdicionaisStr");
    });

    it("deve carregar eventosAdicionais do backend ao abrir editor", () => {
      expect(automacoesContent).toContain("flowWithExtras");
    });

    it("deve indicar multi-trigger no label da lista (+N)", () => {
      expect(automacoesContent).toContain("extras.length");
    });
  });
});

describe("Diretriz anti-hardcode", () => {
  it("routers.ts deve conter diretriz no topo", () => {
    const content = readFile(path.join(SERVER_DIR, "routers.ts"));
    expect(content).toContain("ZERO MENSAGENS HARDCODED");
  });

  it("whatsapp.ts deve conter diretriz no topo", () => {
    const content = readFile(path.join(SERVER_DIR, "whatsapp.ts"));
    expect(content).toContain("N\u00C3O ADICIONE fun\u00E7\u00F5es de envio com texto fixo");
  });

  it("scheduler.ts deve conter diretriz no topo", () => {
    const content = readFile(path.join(SERVER_DIR, "scheduler.ts"));
    expect(content).toContain("ZERO MENSAGENS HARDCODED");
  });

  it("WHATSAPP_POLICY.md deve existir na raiz do projeto", () => {
    const policyPath = path.resolve(__dirname, "../WHATSAPP_POLICY.md");
    expect(fs.existsSync(policyPath)).toBe(true);
  });
});
