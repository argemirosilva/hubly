/**
 * Hook para gerenciar notificações push PWA.
 * Solicita permissão, cria subscription e sincroniza com o servidor.
 */
import { useState, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

type PushStatus = "unsupported" | "default" | "granted" | "denied" | "subscribed";

export function usePushNotifications() {
  const [status, setStatus] = useState<PushStatus>("default");
  const [isLoading, setIsLoading] = useState(false);

  const { data: vapidData } = trpc.push.getVapidPublicKey.useQuery();

  const subscribeMutation = trpc.push.subscribe.useMutation();
  const unsubscribeMutation = trpc.push.unsubscribe.useMutation();
  const sendTestMutation = trpc.push.sendTest.useMutation({
    onSuccess: (data) => {
      if (data.sent > 0) {
        toast.success("Notificação de teste enviada!", {
          description: "Você deve receber uma notificação em instantes.",
        });
      } else {
        toast.warning("Nenhum dispositivo encontrado", {
          description: "Ative as notificações neste dispositivo primeiro.",
        });
      }
    },
    onError: (err) => {
      toast.error("Erro ao enviar teste", { description: err.message });
    },
  });

  // Verificar estado atual ao montar
  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setStatus("unsupported");
      return;
    }

    const perm = Notification.permission;
    if (perm === "denied") {
      setStatus("denied");
      return;
    }

    // Verificar se já tem subscription ativa
    navigator.serviceWorker.ready.then((reg) => {
      reg.pushManager.getSubscription().then((sub) => {
        if (sub) {
          setStatus("subscribed");
        } else if (perm === "granted") {
          setStatus("granted");
        } else {
          setStatus("default");
        }
      });
    });
  }, []);

  const subscribe = useCallback(async () => {
    if (!vapidData?.publicKey) {
      toast.error("Configuração de notificações não disponível");
      return;
    }

    setIsLoading(true);
    try {
      // Solicitar permissão
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus("denied");
        toast.error("Permissão negada", {
          description: "Habilite as notificações nas configurações do navegador.",
        });
        return;
      }

      // Registrar SW e criar subscription
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidData.publicKey),
      });

      const subJson = sub.toJSON();
      const keys = subJson.keys as { p256dh: string; auth: string };

      // Enviar subscription para o servidor
      await subscribeMutation.mutateAsync({
        endpoint: sub.endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        userAgent: navigator.userAgent.substring(0, 500),
      });

      setStatus("subscribed");
      toast.success("Notificações ativadas!", {
        description: "Você receberá alertas mesmo com o app em segundo plano.",
      });
    } catch (err) {
      console.error("[Push] Erro ao ativar notificações:", err);
      toast.error("Erro ao ativar notificações", {
        description: "Tente novamente ou verifique as permissões do navegador.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [vapidData, subscribeMutation]);

  const unsubscribe = useCallback(async () => {
    setIsLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await sub.unsubscribe();
        await unsubscribeMutation.mutateAsync({ endpoint: sub.endpoint });
      }
      setStatus("default");
      toast.info("Notificações desativadas");
    } catch (err) {
      console.error("[Push] Erro ao desativar notificações:", err);
      toast.error("Erro ao desativar notificações");
    } finally {
      setIsLoading(false);
    }
  }, [unsubscribeMutation]);

  const sendTest = useCallback(() => {
    sendTestMutation.mutate();
  }, [sendTestMutation]);

  return {
    status,
    isLoading: isLoading || sendTestMutation.isPending,
    subscribe,
    unsubscribe,
    sendTest,
    isSupported: status !== "unsupported",
    isSubscribed: status === "subscribed",
    isDenied: status === "denied",
  };
}

// Converter chave VAPID base64 para Uint8Array
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
