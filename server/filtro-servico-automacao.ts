export function verificarFiltroServicoAutomacao(
  flowJson: string | null | undefined,
  servicoNome: string | null | undefined,
  todosServicos?: string[]
): boolean {
  if (!flowJson) return true;
  try {
    const flow = JSON.parse(flowJson);
    if (!Array.isArray(flow)) return true;
    const condicoes = flow.filter((no: any) => no?.type === "condition");
    if (condicoes.length === 0) return true;

    for (const condicao of condicoes) {
      const tipo = condicao?.data?.tipo;
      const valor = condicao?.data?.valor ?? condicao?.data?.servicos;
      if (tipo !== "por_servico" || !valor) continue;

      const servicosFiltro = (Array.isArray(valor) ? valor : String(valor).split(","))
        .map((servico: string) => servico.trim().toLowerCase())
        .filter(Boolean);
      const servicosAgendamento = todosServicos && todosServicos.length > 0
        ? todosServicos.map((servico) => servico.trim().toLowerCase()).filter(Boolean)
        : [(servicoNome ?? "").trim().toLowerCase()].filter(Boolean);

      if (servicosAgendamento.length === 0) return false;
      const passou = servicosFiltro.some((filtro: string) =>
        servicosAgendamento.some((servico: string) => servico === filtro)
      );
      if (!passou) return false;
    }
    return true;
  } catch {
    return true;
  }
}
