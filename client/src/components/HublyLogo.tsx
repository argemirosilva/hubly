import React from "react";

export const HUBLY_LOGO_ASSETS = {
  iconGold: "/manus-storage/hubly-icon-gold_40021193.png",
} as const;

export type HublyLogoTone = "light" | "dark";

export function getHublyLogoTextColor(tone: HublyLogoTone) {
  return tone === "dark" ? "#45291a" : "#ffffff";
}

type HublyLogoProps = {
  tone?: HublyLogoTone;
  height?: number;
  className?: string;
};

/** Logo oficial compartilhado entre a área pública e a plataforma. */
export function HublyLogo({ tone = "dark", height = 40, className }: HublyLogoProps) {
  return (
    <span
      className={`inline-flex items-center gap-2 ${className ?? ""}`}
      role="img"
      aria-label="Hubly"
    >
      <img
        src={HUBLY_LOGO_ASSETS.iconGold}
        alt=""
        aria-hidden="true"
        style={{ height, width: "auto", objectFit: "contain", display: "block" }}
      />
      <span
        style={{
          fontFamily: "'Poppins', 'Plus Jakarta Sans', sans-serif",
          fontWeight: 300,
          letterSpacing: "0.18em",
          fontSize: `${height * 0.55}px`,
          color: getHublyLogoTextColor(tone),
          lineHeight: 1,
          userSelect: "none",
        }}
      >
        hubly
      </span>
    </span>
  );
}
