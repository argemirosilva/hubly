export function normalizarLimiteSync(input: unknown, max: number, fallback = 200) {
  const parsed = Number(input);
  if (!Number.isFinite(parsed)) return Math.min(fallback, max);
  return Math.max(1, Math.min(Math.floor(parsed), max));
}

export function normalizarCursorSync(input: unknown) {
  const parsed = Number(input);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : 0;
}

export function paginaSync<T extends { id: unknown }>(rows: T[], requestedLimit: number, after: number) {
  const hasMore = rows.length > requestedLimit;
  const records = rows.slice(0, requestedLimit);
  const nextCursor = Number(records.at(-1)?.id ?? after);
  return { records, hasMore, nextCursor };
}
