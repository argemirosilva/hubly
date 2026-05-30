import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, Smartphone, Share, Plus } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Verificar se já está instalado como PWA
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    // Detectar iOS
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const safari = /safari/i.test(navigator.userAgent) && !/chrome/i.test(navigator.userAgent);
    setIsIOS(ios && safari);

    // Verificar se já foi dispensado
    const dismissed = localStorage.getItem("pwa-banner-dismissed");
    if (dismissed) return;

    // iOS: mostrar instruções manuais
    if (ios && safari) {
      setTimeout(() => setShowBanner(true), 3000);
      return;
    }

    // Android/Chrome: capturar evento de instalação
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShowBanner(false);
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem("pwa-banner-dismissed", "1");
  };

  if (isInstalled || !showBanner) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-80 animate-in slide-in-from-bottom-4 duration-300">
      <div className="rounded-2xl shadow-2xl border overflow-hidden" style={{ borderColor: "oklch(78.5% 0.075 85)" }}>
        {/* Header colorido */}
        <div className="px-4 py-3 flex items-center justify-between" style={{ background: "linear-gradient(135deg, oklch(28.5% 0.035 55), oklch(78.5% 0.075 85))" }}>
          <div className="flex items-center gap-2">
            <img
              src="/manus-storage/hubly-icon-gold_40021193.png"
              alt="Hubly"
              className="w-8 h-8 rounded-xl object-contain"
            />
            <span className="text-white font-semibold text-sm">Instalar Hubly</span>
          </div>
          <button
            onClick={handleDismiss}
            className="text-white/70 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="p-4 bg-white">
          {isIOS ? (
            // Instruções iOS
            <div className="space-y-3">
              <p className="text-sm text-slate-600">
                Instale o Hubly na tela inicial para receber <strong>notificações push</strong> de novos agendamentos e mensagens.
              </p>
              <ol className="space-y-2">
                {[
                  { icon: Share, text: 'Toque no botão "Compartilhar" na barra do Safari' },
                  { icon: Plus, text: 'Selecione "Adicionar à Tela de Início"' },
                  { icon: Smartphone, text: 'Toque em "Adicionar" para confirmar' },
                ].map((step, i) => {
                  const Icon = step.icon;
                  return (
                    <li key={i} className="flex items-start gap-2.5">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 text-white"
                        style={{ background: "oklch(78.5% 0.075 85)" }}>
                        {i + 1}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-600">
                        <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: "oklch(78.5% 0.075 85)" }} />
                        {step.text}
                      </div>
                    </li>
                  );
                })}
              </ol>
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs"
                onClick={handleDismiss}
              >
                Entendido
              </Button>
            </div>
          ) : (
            // Banner Android/Chrome
            <div className="space-y-3">
              <p className="text-sm text-slate-600">
                Instale o Hubly na sua tela inicial para acesso rápido, mesmo sem internet.
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1 text-white text-xs"
                  style={{ background: "oklch(28.5% 0.035 55)" }}
                  onClick={handleInstall}
                >
                  <Smartphone className="w-3.5 h-3.5 mr-1.5" />
                  Instalar agora
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-slate-500"
                  onClick={handleDismiss}
                >
                  Agora não
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
