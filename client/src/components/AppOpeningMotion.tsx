import { useEffect, useState } from "react";
import { allowsHublyMotion, HUBLY_MOTION } from "@/lib/motion";

const INTRO_STORAGE_KEY = "hubly-opening-motion-seen-v1";

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function AppOpeningMotion({ active }: { active: boolean }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!active || prefersReducedMotion() || sessionStorage.getItem(INTRO_STORAGE_KEY)) return;
    sessionStorage.setItem(INTRO_STORAGE_KEY, "true");
    setVisible(true);
    const timeout = window.setTimeout(() => setVisible(false), HUBLY_MOTION.appIntroDurationMs);
    return () => window.clearTimeout(timeout);
  }, [active]);

  if (!visible) return null;

  return (
    <div className="hubly-opening-motion pointer-events-none" aria-hidden="true">
      <div className="hubly-opening-motion__mark">
        <span className="hubly-opening-motion__spark" />
        <span className="hubly-opening-motion__word">hubly</span>
      </div>
    </div>
  );
}
