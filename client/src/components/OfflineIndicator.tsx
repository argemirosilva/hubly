import { useState, useEffect } from "react";
import { WifiOff } from "lucide-react";

/**
 * Indicador de status offline — exibe uma barra no topo da tela quando sem internet.
 * Desaparece automaticamente quando a conexão é restabelecida.
 */
export function OfflineIndicator() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    const handleOffline = () => setIsOffline(true);
    const handleOnline = () => {
      setIsOffline(false);
      setShowReconnected(true);
      setTimeout(() => setShowReconnected(false), 3000);
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

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
