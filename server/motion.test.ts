import { describe, expect, it } from "vitest";
import { allowsHublyMotion, HUBLY_MOTION } from "../client/src/lib/motion";

describe("motion preferences", () => {
  it("desativa movimentos decorativos quando o usuário prefere movimento reduzido", () => {
    expect(allowsHublyMotion(true)).toBe(false);
  });

  it("mantém animações curtas quando não há preferência de redução", () => {
    expect(allowsHublyMotion(false)).toBe(true);
    expect(HUBLY_MOTION.appIntroDurationMs).toBeLessThanOrEqual(800);
    expect(HUBLY_MOTION.chartDurationMs).toBeLessThanOrEqual(800);
  });
});
