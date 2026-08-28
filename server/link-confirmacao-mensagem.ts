const URL_CONFIRMAR_REGEX = /https?:\/\/[^\s]+\/confirmar\/[a-z0-9_-]+/i;
const MARCADOR_LINK_CONFIRMAR = "__LINK_CONFIRMACAO__";
const PEDIDO_CONFIRMACAO_REGEX = /confirm(?:e|ar)(?:\s+o)?\s+(?:seu\s+)?(?:agendamento|hor[aá]rio|presen[cç]a)|confirmar\s+sua\s+presen[cç]a/i;

export function mensagemExigeLinkConfirmacao(mensagem: string): boolean {
  return PEDIDO_CONFIRMACAO_REGEX.test(mensagem) || mensagem.includes(MARCADOR_LINK_CONFIRMAR);
}

export function mensagemPossuiLinkConfirmacao(mensagem: string): boolean {
  return URL_CONFIRMAR_REGEX.test(mensagem);
}

export function inserirLinkConfirmacao(mensagem: string, linkConfirmacao: string): string {
  // O link é criado no instante do envio. Se uma fila antiga contém um link de
  // localhost, domínio anterior ou token vencido, substituímos esse link em vez
  // de manter uma confirmação que levaria a uma rota inválida.
  if (mensagemPossuiLinkConfirmacao(mensagem)) {
    return mensagem.replace(URL_CONFIRMAR_REGEX, linkConfirmacao);
  }
  if (mensagem.includes(MARCADOR_LINK_CONFIRMAR)) {
    return mensagem.replaceAll(MARCADOR_LINK_CONFIRMAR, linkConfirmacao);
  }

  const linhas = mensagem.split("\n");
  const indicePedido = linhas.findIndex((linha) => PEDIDO_CONFIRMACAO_REGEX.test(linha));
  if (indicePedido >= 0) {
    linhas.splice(indicePedido + 1, 0, linkConfirmacao);
    return linhas.join("\n");
  }

  return `${mensagem.trimEnd()}\n${linkConfirmacao}`;
}
