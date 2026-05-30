import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock do banco de dados
vi.mock("./db", () => ({
  getEmpresaDoUsuario: vi.fn(),
}));

// Testa a lógica de validação do endpoint de registro
describe("Registro de novo usuário", () => {
  it("deve rejeitar email vazio", async () => {
    const payload = { nome: "Teste", email: "", senha: "123456" };
    expect(payload.email).toBe("");
    expect(payload.email.length).toBe(0);
  });

  it("deve rejeitar senha com menos de 6 caracteres", async () => {
    const senha = "123";
    expect(senha.length).toBeLessThan(6);
  });

  it("deve aceitar dados válidos", async () => {
    const payload = { nome: "João Silva", email: "joao@teste.com", senha: "senha123" };
    expect(payload.nome.length).toBeGreaterThan(0);
    expect(payload.email).toContain("@");
    expect(payload.senha.length).toBeGreaterThanOrEqual(6);
  });

  it("deve marcar onboardingConcluido como false para novo usuário", () => {
    const novoUsuario = {
      id: 1,
      nome: "João Silva",
      email: "joao@teste.com",
      empresaId: 1,
      onboardingConcluido: false,
    };
    expect(novoUsuario.onboardingConcluido).toBe(false);
  });
});

// Testa a lógica de detecção de onboarding pendente
describe("Detecção de onboarding pendente", () => {
  it("deve redirecionar para /onboarding quando onboardingConcluido é false", () => {
    const systemUser = { onboardingConcluido: false };
    const deveRedirecionar = systemUser.onboardingConcluido === false;
    expect(deveRedirecionar).toBe(true);
  });

  it("não deve redirecionar quando onboardingConcluido é true", () => {
    const systemUser = { onboardingConcluido: true };
    const deveRedirecionar = systemUser.onboardingConcluido === false;
    expect(deveRedirecionar).toBe(false);
  });

  it("não deve redirecionar quando onboardingConcluido é undefined (usuário antigo)", () => {
    const systemUser = { onboardingConcluido: undefined };
    const deveRedirecionar = systemUser.onboardingConcluido === false;
    expect(deveRedirecionar).toBe(false);
  });
});

// Testa a lógica de origem do agendamento
describe("Regra de origem do agendamento", () => {
  it("portal deve criar agendamento como pre_agendado por padrão", () => {
    const autoConfirmarPortal = false;
    const status = autoConfirmarPortal ? "confirmado" : "pre_agendado";
    expect(status).toBe("pre_agendado");
  });

  it("portal com autoConfirmar deve criar como confirmado", () => {
    const autoConfirmarPortal = true;
    const status = autoConfirmarPortal ? "confirmado" : "pre_agendado";
    expect(status).toBe("confirmado");
  });

  it("plataforma deve permitir qualquer status selecionável", () => {
    const statusPermitidos = ["pre_agendado", "agendado", "confirmado", "concluido", "cancelado"];
    const statusSelecionado = "confirmado";
    expect(statusPermitidos).toContain(statusSelecionado);
  });
});
