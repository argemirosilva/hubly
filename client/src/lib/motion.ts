export const HUBLY_MOTION = {
  appIntroDurationMs: 650,
  chartDurationMs: 650,
} as const;

/** Mantém movimentos decorativos desligados quando a pessoa prefere menos animação. */
export function allowsHublyMotion(prefersReducedMotion: boolean): boolean {
  return !prefersReducedMotion;
}
