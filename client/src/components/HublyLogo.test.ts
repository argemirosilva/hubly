import { describe, expect, it } from "vitest";
import { getHublyLogoTextColor, HUBLY_LOGO_ASSETS } from "./HublyLogo";

describe("HublyLogo", () => {
  it("mantém o ícone oficial e os tons corretos do logo padrão", () => {
    expect(HUBLY_LOGO_ASSETS.iconGold).toBe("/hubly-icon-gold.png");
    expect(getHublyLogoTextColor("dark")).toBe("#45291a");
    expect(getHublyLogoTextColor("light")).toBe("#ffffff");
  });
});
