export interface ContextoFiltroAutomacao {
  servicoNome?: string | null;
  todosServicos?: string[];
  categoriaServico?: string | null;
  todasCategorias?: string[];
}

export function temSegmentacaoDeServicoOuCategoria(flowJson: string | null | undefined): boolean {
  if (!flowJson) return false;
  try {
    const flow = JSON.parse(flowJson);
    return Array.isArray(flow) && flow.some((no: any) =>
      no?.type === "condition" && ["por_servico", "por_categoria"].includes(no?.data?.tipo),
    );
  } catch {
    return false;
  }
}

function normalizarLista(valor: unknown): string[] {
  return (Array.isArray(valor) ? valor : String(valor ?? "").split(","))
    .map((item: string) => item.trim().toLowerCase())
    .filter(Boolean);
}

export function verificarFiltroAutomacao(
  flowJson: string | null | undefined,
  contexto: ContextoFiltroAutomacao,
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
      if (!valor) continue;

      if (tipo === "por_servico") {
        const servicosFiltro = normalizarLista(valor);
        const servicosAgendamento = contexto.todosServicos && contexto.todosServicos.length > 0
          ? normalizarLista(contexto.todosServicos)
          : normalizarLista(contexto.servicoNome);

        if (servicosAgendamento.length === 0) return false;
        const passou = servicosFiltro.some((filtro) =>
          servicosAgendamento.some((servico) => servico === filtro)
        );
        if (!passou) return false;
      }

      if (tipo === "por_categoria") {
        const categoriasFiltro = normalizarLista(valor);
        const categoriasAgendamento = contexto.todasCategorias && contexto.todasCategorias.length > 0
          ? normalizarLista(contexto.todasCategorias)
          : normalizarLista(contexto.categoriaServico);

        // Uma regra segmentada por categoria nunca deve alcançar um atendimento
        // cuja categoria não foi identificada. É mais seguro bloquear que enviar
        // mensagem de curso para um atendimento comum.
        if (categoriasAgendamento.length === 0) return false;
        const passou = categoriasFiltro.some((filtro) =>
          categoriasAgendamento.some((categoria) => categoria === filtro)
        );
        if (!passou) return false;
      }
    }
    return true;
  } catch {
    return true;
  }
}

export function verificarFiltroServicoAutomacao(
  flowJson: string | null | undefined,
  servicoNome: string | null | undefined,
  todosServicos?: string[],
): boolean {
  return verificarFiltroAutomacao(flowJson, { servicoNome, todosServicos });
}
