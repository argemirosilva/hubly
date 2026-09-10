import { useEffect } from "react";
import { Capacitor, type PluginListenerHandle } from "@capacitor/core";
import { useLocation } from "wouter";
import { resolveMobileLink } from "@/lib/mobile-links";

/** Links nativos. Push aguarda integração autenticada APNs/FCM no backend. */
export function useMobileApp() {
  const [, navigate] = useLocation();
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let disposed = false;
    let listener: PluginListenerHandle | undefined;
    const openLink = (url: string) => {
      const route = resolveMobileLink(url);
      if (!disposed && route) navigate(route);
    };
    async function init() {
      const { App } = await import("@capacitor/app");
      if (disposed) return;
      listener = await App.addListener("appUrlOpen", event => openLink(event.url));
      if (disposed) {
        await listener.remove();
        return;
      }
      const launch = await App.getLaunchUrl();
      if (launch) openLink(launch.url);
    }
    void init().catch(() => console.warn("[Mobile] Não foi possível inicializar os links nativos."));
    return () => {
      disposed = true;
      void listener?.remove();
    };
  }, [navigate]);
}
