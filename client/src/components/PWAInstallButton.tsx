import { useState } from "react";
import { Smartphone, Download, Share, Plus, X } from "lucide-react";
import { usePWAInstall } from "@/hooks/usePWAInstall";

/**
 * Botão compacto de instalação do PWA.
 * Fica sempre visível enquanto o app não estiver instalado.
 * variant="header" → botão compacto para o header do sistema
 * variant="login"  → botão maior para a tela de login
 */
export function PWAInstallButton({ variant = "header" }: { variant?: "header" | "login" }) {
  const { canInstall, isIOS, isInstalled, install, hasPrompt } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // Não exibir se já instalado
  if (isInstalled) return null;

  // Não exibir se não puder instalar (nem iOS, nem prompt disponível)
  if (!canInstall) return null;

  const handleClick = async () => {
    if (isIOS) {
      setShowIOSGuide(true);
      return;
    }
    await install();
  };

  // ── Guia iOS (modal simples) ──────────────────────────────────────────────
  if (showIOSGuide) {
    return (
      <div className="fixed inset-0 z-[200] flex items-end justify-center p-4 sm:items-center"
        style={{ background: "oklch(0% 0 0 / 50%)" }}
        onClick={() => setShowIOSGuide(false)}
      >
        <div
          className="w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl"
          style={{ background: "white" }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4"
            style={{ background: "oklch(55% 0.22 264)", color: "white" }}>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                <Smartphone className="w-4 h-4" />
              </div>
              <span className="font-semibold text-sm">Instalar Agendei no iPhone</span>
            </div>
            <button onClick={() => setShowIOSGuide(false)} className="opacity-70 hover:opacity-100">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Passos */}
          <div className="p-5 space-y-4">
            <p className="text-sm text-slate-600">
              Adicione o Agendei à sua tela inicial para acesso rápido como um app nativo.
            </p>
            <ol className="space-y-3">
              {[
                { icon: Share, text: 'Toque no botão "Compartilhar" na barra do Safari' },
                { icon: Plus, text: 'Selecione "Adicionar à Tela de Início"' },
                { icon: Smartphone, text: 'Toque em "Adicionar" para confirmar' },
              ].map((step, i) => {
                const Icon = step.icon;
                return (
                  <li key={i} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5"
                      style={{ background: "oklch(55% 0.22 264 / 12%)", color: "oklch(40% 0.18 264)" }}>
                      {i + 1}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Icon className="w-4 h-4 shrink-0" style={{ color: "oklch(55% 0.22 264)" }} />
                      {step.text}
                    </div>
                  </li>
                );
              })}
            </ol>
            <button
              className="w-full py-2.5 rounded-xl text-sm font-semibold transition-colors"
              style={{ background: "oklch(55% 0.22 264 / 10%)", color: "oklch(40% 0.18 264)" }}
              onClick={() => setShowIOSGuide(false)}
            >
              Entendido
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Variante: header ──────────────────────────────────────────────────────
  if (variant === "header") {
    return (
      <button
        onClick={handleClick}
        className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
        style={{
          background: "oklch(55% 0.22 264 / 12%)",
          color: "oklch(40% 0.18 264)",
          border: "1px solid oklch(55% 0.22 264 / 25%)",
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.background = "oklch(55% 0.22 264 / 20%)";
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.background = "oklch(55% 0.22 264 / 12%)";
        }}
        title="Instalar Agendei como aplicativo"
      >
        <Download className="w-3.5 h-3.5" />
        <span>Instalar app</span>
      </button>
    );
  }

  // ── Variante: login ───────────────────────────────────────────────────────
  return (
    <button
      onClick={handleClick}
      className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-semibold transition-all mt-3"
      style={{
        background: "oklch(55% 0.22 264 / 8%)",
        color: "oklch(40% 0.18 264)",
        border: "1px solid oklch(55% 0.22 264 / 20%)",
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.background = "oklch(55% 0.22 264 / 15%)";
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.background = "oklch(55% 0.22 264 / 8%)";
      }}
    >
      <Download className="w-4 h-4" />
      Instalar aplicativo
    </button>
  );
}
