import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { avaliarConclusaoPacote } from "./pacotes-financeiro";

const router = readFileSync(new URL("./routers/pacotes.ts", import.meta.url), "utf8");
const page = readFileSync(new URL("../client/src/pages/Pacotes.tsx", import.meta.url), "utf8");

describe("status manual de Pacotes", () => {
  it("expõe alteração manual com os quatro estados operacionais", () => {
    expect(router).toContain("alterarStatus: protectedProcedure");
    expect(router).toContain('z.enum(["ativo", "concluido", "vencido", "cancelado"])');
    expect(page).toContain("Alterar status do pacote");
    expect(page).toContain('SelectItem value="concluido">Concluído');
  });

  it("não conclui o pacote automaticamente ao registrar uma sessão", () => {
    expect(router).toContain("O consumo registra somente a sessão");
    expect(router).not.toContain('set({ status: "concluido" })');
  });

  it("bloqueia conclusão enquanto houver sessão agendada ou pagamento pendente", () => {
    expect(avaliarConclusaoPacote({ totalSessoes: 2, sessoesConcluidas: 2, sessoesAgendadas: 1, statusPagamento: "pago" }))
      .toMatchObject({ permitido: false, motivo: expect.stringContaining("agendadas") });
    expect(avaliarConclusaoPacote({ totalSessoes: 2, sessoesConcluidas: 2, sessoesAgendadas: 0, statusPagamento: "parcial" }))
      .toMatchObject({ permitido: false, motivo: expect.stringContaining("quitado") });
  });

  it("mantém o gerenciamento de pagamentos disponível sem depender do status operacional", () => {
    expect(page).toContain("Gerenciar pagamentos");
    expect(page).toContain("Pagamentos continuam acessíveis em qualquer status.");
  });
});
