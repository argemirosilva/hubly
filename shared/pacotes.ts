export const FILTROS_STATUS_PACOTES = ["ativo", "concluido", "vencido", "cancelado", "todos"] as const;

export type FiltroStatusPacote = typeof FILTROS_STATUS_PACOTES[number];

/** Exibe o histórico inteiro para que alterações de status não ocultem pacotes da equipe. */
export const FILTRO_STATUS_PACOTES_PADRAO: FiltroStatusPacote = "todos";
