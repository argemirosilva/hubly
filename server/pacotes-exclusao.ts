export type ElegibilidadeExclusaoPacote = {
  permitido: boolean;
  motivo?: string;
};

export function avaliarExclusaoDefinitivaPacote(input: {
  status: string;
  possuiAgendamentos: boolean;
  possuiPagamentos: boolean;
}): ElegibilidadeExclusaoPacote {
  if (input.status !== "cancelado") {
    return { permitido: false, motivo: "A exclusão definitiva está disponível somente para pacotes cancelados." };
  }
  if (input.possuiAgendamentos) {
    return { permitido: false, motivo: "Este pacote possui agendamentos vinculados e precisa permanecer no histórico." };
  }
  if (input.possuiPagamentos) {
    return { permitido: false, motivo: "Este pacote possui pagamentos registrados e precisa permanecer no histórico financeiro." };
  }
  return { permitido: true };
}
