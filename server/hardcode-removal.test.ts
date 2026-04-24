import { describe, expect, it } from "vitest";
import * as fs from "fs";
import * as path from "path";

/**
 * Testes de validação: Remoção de mensagens hardcoded.
 *
 * Garante que:
 * 1. As funções helper legadas foram removidas do whatsapp.ts
 * 2. O confirmarReserva não contém fallback hardcoded (mensagemPadraoReserva)
 * 3. O creditos.registrar não envia mensagem direta (routedSendMessage com texto fixo)
 * 4. Os novos eventos (reserva_paga, credito_gerado) estão nos templates
 * 5. O frontend inclui os novos tipos de trigger
 */

const SERVER_DIR = path.resolve(__dirname);
const CLIENT_DIR = path.resolve(__dirname, "../client/src");

function readFile(filePath: string): string {
  return fs.readFileSync(filePath, "utf-8");
}

describe("Remoção de mensagens hardcoded", () => {
  describe("whatsapp.ts — funções helper legadas removidas", () => {
    const whatsappContent = readFile(path.join(SERVER_DIR, "whatsapp.ts"));

    it("não deve conter sendAgendamentoConfirmacao como função exportada", () => {
      expect(whatsappContent).not.toMatch(/export\s+async\s+function\s+sendAgendamentoConfirmacao/);
    });

    it("não deve conter sendAgendamentoCancelado como função exportada", () => {
      expect(whatsappContent).not.toMatch(/export\s+async\s+function\s+sendAgendamentoCancelado/);
    });

    it("não deve conter sendPacoteVencendo como função exportada", () => {
      expect(whatsappContent).not.toMatch(/export\s+async\s+function\s+sendPacoteVencendo/);
    });

    it("não deve conter sendCreditoGerado como função exportada", () => {
      expect(whatsappContent).not.toMatch(/export\s+async\s+function\s+sendCreditoGerado/);
    });

    it("deve conter comentário indicando a remoção", () => {
      expect(whatsappContent).toContain("Funções helper de mensagem hardcoded foram REMOVIDAS");
    });
  });

  describe("routers.ts — confirmarReserva sem fallback hardcoded", () => {
    const routersContent = readFile(path.join(SERVER_DIR, "routers.ts"));

    it("não deve conter mensagemPadraoReserva (fallback hardcoded)", () => {
      expect(routersContent).not.toContain("mensagemPadraoReserva");
    });

    it("deve conter lógica de fallback para agendamento_criado", () => {
      expect(routersContent).toContain("getAutomacaoByEvento(empresa.id, 'agendamento_criado')");
    });

    it("deve conter log de 'envio ignorado' quando não há automação", () => {
      expect(routersContent).toContain("Nenhuma automação ativa para reserva_paga/agendamento_criado");
    });
  });

  describe("routers.ts — creditos.registrar sem envio direto", () => {
    const routersContent = readFile(path.join(SERVER_DIR, "routers.ts"));

    it("deve buscar automação credito_gerado antes de enviar", () => {
      expect(routersContent).toContain("getAutomacaoByEvento(empresa.id, 'credito_gerado')");
    });

    it("deve conter log de 'envio ignorado' para crédito sem automação", () => {
      expect(routersContent).toContain("Nenhuma automação ativa para credito_gerado");
    });

    it("não deve chamar routedSendMessage diretamente no bloco de crédito", () => {
      // Buscar o trecho entre "Notificar cliente via automação" e "return { success: true, novoSaldo }"
      const creditoBlock = routersContent.match(
        /Notificar cliente via automação configurada[\s\S]*?return \{ success: true, novoSaldo \}/
      );
      expect(creditoBlock).toBeTruthy();
      if (creditoBlock) {
        expect(creditoBlock[0]).not.toContain("routedSendMessage");
      }
    });
  });

  describe("automation-templates.ts — novos eventos incluídos", () => {
    const templatesContent = readFile(path.join(SERVER_DIR, "automation-templates.ts"));

    it("deve conter template para reserva_paga", () => {
      expect(templatesContent).toContain('evento: "reserva_paga"');
    });

    it("deve conter template para credito_gerado", () => {
      expect(templatesContent).toContain('evento: "credito_gerado"');
    });

    it("deve exportar função de provisionamento para empresas existentes", () => {
      expect(templatesContent).toContain("provisionarNovosTemplatesParaEmpresasExistentes");
    });
  });

  describe("Frontend — novos triggers disponíveis", () => {
    const automacoesContent = readFile(path.join(CLIENT_DIR, "pages/Automacoes.tsx"));

    it("deve conter trigger evento_credito_gerado no TRIGGER_OPTIONS", () => {
      expect(automacoesContent).toContain('"evento_credito_gerado"');
    });

    it("deve conter label 'Crédito gerado' no evtLabels", () => {
      expect(automacoesContent).toContain('credito_gerado: "Crédito gerado"');
    });

    it("deve conter template quick-start para crédito gerado", () => {
      expect(automacoesContent).toContain('nome: "Crédito gerado"');
    });
  });
});
