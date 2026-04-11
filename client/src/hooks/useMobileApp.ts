import { useEffect } from "react";
import { useLocation } from "wouter";

/**
 * Hook que inicializa os recursos nativos do Capacitor:
 * - Notificações push (solicita permissão, registra token, trata notificações recebidas)
 * - Deep links (hubly:// e https://hubly.orizontech.com.br/...)
 *
 * Só ativa quando rodando dentro do app nativo (Capacitor).
 */
export function useMobileApp() {
  const [, navigate] = useLocation();

  useEffect(() => {
    // Detectar se está rodando no Capacitor (app nativo)
    const isNative = !!(window as any).Capacitor?.isNativePlatform?.();
    if (!isNative) return;

    let cleanupPush: (() => void) | undefined;
    let cleanupDeepLink: (() => void) | undefined;

    async function initPushNotifications() {
      try {
        const { PushNotifications } = await import("@capacitor/push-notifications");

        // Solicitar permissão
        const permission = await PushNotifications.requestPermissions();
        if (permission.receive !== "granted") {
          console.log("[Push] Permissão negada pelo usuário");
          return;
        }

        // Registrar para receber token
        await PushNotifications.register();

        // Receber token do dispositivo
        const tokenListener = await PushNotifications.addListener(
          "registration",
          (token) => {
            console.log("[Push] Token registrado:", token.value);
            // Enviar token ao backend para armazenar
            fetch("/api/trpc/notificacoes.registrarToken", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ json: { token: token.value, plataforma: (window as any).Capacitor?.getPlatform?.() ?? "unknown" } }),
            }).catch(console.error);
          }
        );

        // Notificação recebida com app aberto (foreground)
        const foregroundListener = await PushNotifications.addListener(
          "pushNotificationReceived",
          (notification) => {
            console.log("[Push] Notificação recebida (foreground):", notification);
          }
        );

        // Usuário tocou na notificação (background/killed)
        const actionListener = await PushNotifications.addListener(
          "pushNotificationActionPerformed",
          (action) => {
            const data = action.notification.data;
            console.log("[Push] Ação na notificação:", data);
            // Navegar para o agendamento se tiver ID
            if (data?.agendamentoId) {
              navigate(`/admin/agendamentos?id=${data.agendamentoId}`);
            } else if (data?.url) {
              navigate(data.url);
            }
          }
        );

        cleanupPush = () => {
          tokenListener.remove();
          foregroundListener.remove();
          actionListener.remove();
        };
      } catch (err) {
        console.warn("[Push] Capacitor PushNotifications não disponível:", err);
      }
    }

    async function initDeepLinks() {
      try {
        const { App } = await import("@capacitor/app");

        // Deep link recebido com app aberto
        const listener = await App.addListener("appUrlOpen", (event) => {
          console.log("[DeepLink] URL recebida:", event.url);
          const url = new URL(event.url);

          // hubly://agendamento/123 → /admin/agendamentos?id=123
          if (url.protocol === "hubly:") {
            const parts = url.pathname.replace(/^\/\//, "").split("/");
            if (parts[0] === "agendamento" && parts[1]) {
              navigate(`/admin/agendamentos?id=${parts[1]}`);
            } else if (parts[0] === "cliente" && parts[1]) {
              navigate(`/admin/clientes?id=${parts[1]}`);
            } else {
              navigate("/admin");
            }
            return;
          }

          // https://hubly.orizontech.com.br/admin/... → navegar para o path
          if (url.hostname === "hubly.orizontech.com.br") {
            const path = url.pathname + url.search;
            navigate(path);
          }
        });

        cleanupDeepLink = () => listener.remove();
      } catch (err) {
        console.warn("[DeepLink] Capacitor App não disponível:", err);
      }
    }

    initPushNotifications();
    initDeepLinks();

    return () => {
      cleanupPush?.();
      cleanupDeepLink?.();
    };
  }, [navigate]);
}
