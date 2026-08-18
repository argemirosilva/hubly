import { describe, expect, it } from "vitest";
import {
  inserirLinkConfirmacao,
  mensagemExigeLinkConfirmacao,
  mensagemPossuiLinkConfirmacao,
} from "./link-confirmacao-mensagem";

const link = "https://hubly.orizontech.com.br/confirmar/token-seguro";

describe("proteção de link de confirmação", () => {
  it("reconhece textos que pedem confirmação e não possuem link", () => {
    const mensagem = "Clique no link abaixo para confirmar sua presença\n\nAguardo você.";
    expect(mensagemExigeLinkConfirmacao(mensagem)).toBe(true);
    expect(mensagemPossuiLinkConfirmacao(mensagem)).toBe(false);
  });

  it("substitui o marcador por um token gerado no momento do envio", () => {
    expect(inserirLinkConfirmacao("Confirme seu agendamento: __LINK_CONFIRMACAO__", link))
      .toBe(`Confirme seu agendamento: ${link}`);
  });

  it("insere o link após o pedido de confirmação mesmo se o modelo usou outra variável", () => {
    const mensagem = "Clique no link abaixo para confirmar sua presença\nhttps://hubly.orizontech.com.br/agendar?e=1\n\nObrigada.";
    expect(inserirLinkConfirmacao(mensagem, link)).toBe(
      "Clique no link abaixo para confirmar sua presença\n" +
      `${link}\nhttps://hubly.orizontech.com.br/agendar?e=1\n\nObrigada.`
    );
  });

  it("não duplica um link de confirmação já presente", () => {
    const mensagem = `Confirme seu agendamento\n${link}`;
    expect(inserirLinkConfirmacao(mensagem, "https://hubly.orizontech.com.br/confirmar/outro-token")).toBe(mensagem);
  });
});
