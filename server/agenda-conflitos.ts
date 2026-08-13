/** Status que não reservam horário e, portanto, não podem gerar conflito de agenda. */
export const STATUS_NAO_OCUPAM_HORARIO = [
  "cancelado",
  "cancelado_pelo_cliente",
  "faltou",
  "remarcado",
] as const;

export type StatusNaoOcupaHorario = typeof STATUS_NAO_OCUPAM_HORARIO[number];

export function statusOcupaHorario(status: string | null | undefined): boolean {
  return !STATUS_NAO_OCUPAM_HORARIO.includes(status as StatusNaoOcupaHorario);
}

export const SQL_STATUS_NAO_OCUPAM_HORARIO = STATUS_NAO_OCUPAM_HORARIO.map(status => `'${status}'`).join(", ");
