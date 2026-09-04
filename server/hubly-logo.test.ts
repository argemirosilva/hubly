import { describe, expect, it } from "vitest";
import { getHublyLogoTextColor, HUBLY_LOGO_ASSETS } from "../client/src/components/HublyLogo";

describe("logo padrão do Hubly", () => {
  it("reutiliza o símbolo oficial e preserva contraste nos dois fundos suportados", () => {
    expect(HUBLY_LOGO_ASSETS.iconGold).toBe("/hubly-icon-gold.png");
    expect(getHublyLogoTextColor("dark")).toBe("#45291a");
    expect(getHublyLogoTextColor("light")).toBe("#ffffff");
  });
});
