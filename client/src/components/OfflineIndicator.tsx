import { useState, useEffect } from "react";
import { WifiOff } from "lucide-react";

/**
 * Indicador de status offline — exibe uma barra no topo da tela quando sem internet.
 * Desaparece automaticamente quando a conexão é restabelecida.
 * Usa detecção ativa de conexão ao invés de depender apenas de navigator.onLine
 */
export function OfflineIndicator() {
  const [isOffline, setIsOffline] = useState(false);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    // Verificar conexão real fazendo um ping para o servidor
    const checkConnection = async () => {
      try {
        const response = await fetch("/api/trpc", {
          method: "GET",
          cache: "no-store",
        });
        // Se conseguir conectar, está online
        if (!isOffline) return;
        setIsOffline(false);
        setShowReconnected(true);
        setTimeout(() => setShowReconnected(false), 3000);
      } catch {
        // Se falhar, está offline
        if (isOffline) return;
        setIsOffline(true);
      }
    };

    // Verificar conexão a cada 5 segundos
    const interval = setInterval(checkConnection, 5000);
    
    // Verificar imediatamente ao montar
    checkConnection();

    // Manter os event listeners como fallback
    const handleOffline = () => setIsOffline(true);
    const handleOnline = () => {
      setIsOffline(false);
      setShowReconnected(true);
      setTimeout(() => setShowReconnected(false), 3000);
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, [isOffline]);

  if (!isOffline && !showReconnected) return null;

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-[9999] flex items-center justify-center gap-2 py-1.5 px-4 text-xs font-medium text-white transition-all duration-300 ${
        isOffline
          ? "bg-red-500"
          : "bg-green-500"
      }`}
      style={{ paddingTop: "max(6px, env(safe-area-inset-top))" }}
    >
      {isOffline ? (
        <>
          <WifiOff className="w-3.5 h-3.5" />
          Sem conexão — dados em cache serão exibidos
        </>
      ) : (
        <>Conexão restabelecida</>
      )}
    </div>
  );
}
