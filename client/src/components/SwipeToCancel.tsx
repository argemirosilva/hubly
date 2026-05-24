import { useRef, useState, useCallback } from "react";
import { X } from "lucide-react";

interface Props {
  children: React.ReactNode;
  onCancel: () => void;
  disabled?: boolean;
}

/**
 * Componente que permite deslizar para a esquerda para revelar botão de cancelar.
 * Ao confirmar, anima slide-out + fade antes de remover da lista.
 */
export function SwipeToCancel({ children, onCancel, disabled }: Props) {
  const [offsetX, setOffsetX] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [height, setHeight] = useState<number | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);
  const startX = useRef(0);
  const startY = useRef(0);
  const swiping = useRef(false);
  const isHorizontal = useRef<boolean | null>(null);

  const REVEAL_THRESHOLD = 70;
  const BUTTON_WIDTH = 80;

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled || removing) return;
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    swiping.current = true;
    isHorizontal.current = null;
  }, [disabled, removing]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!swiping.current || disabled || removing) return;
    const dx = e.touches[0].clientX - startX.current;
    const dy = e.touches[0].clientY - startY.current;

    // Determinar direção no primeiro movimento significativo
    if (isHorizontal.current === null && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
      isHorizontal.current = Math.abs(dx) > Math.abs(dy);
    }

    if (!isHorizontal.current) return;

    if (revealed) {
      // Se já está revelado, permitir fechar (swipe para direita)
      const newOffset = Math.min(0, Math.max(-BUTTON_WIDTH, dx - BUTTON_WIDTH));
      setOffsetX(newOffset);
    } else {
      // Só permitir swipe para esquerda
      if (dx < 0) {
        const newOffset = Math.max(-BUTTON_WIDTH - 10, dx * 0.6);
        setOffsetX(newOffset);
      }
    }
  }, [disabled, revealed, removing]);

  const handleTouchEnd = useCallback(() => {
    swiping.current = false;
    isHorizontal.current = null;

    if (Math.abs(offsetX) >= REVEAL_THRESHOLD) {
      setOffsetX(-BUTTON_WIDTH);
      setRevealed(true);
    } else {
      setOffsetX(0);
      setRevealed(false);
    }
  }, [offsetX]);

  const handleCancelClick = () => {
    // Capturar altura antes de animar
    if (containerRef.current) {
      setHeight(containerRef.current.offsetHeight);
    }
    // Iniciar animação de slide-out
    setRemoving(true);

    // Após a animação, executar o cancelamento
    setTimeout(() => {
      onCancel();
    }, 400);
  };

  const handleContentClick = () => {
    if (revealed && !removing) {
      setOffsetX(0);
      setRevealed(false);
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden rounded-lg"
      style={{
        height: removing ? 0 : height ?? "auto",
        opacity: removing ? 0 : 1,
        marginBottom: removing ? 0 : undefined,
        transition: removing
          ? "height 0.3s ease-out 0.1s, opacity 0.25s ease-out, margin-bottom 0.3s ease-out 0.1s"
          : undefined,
      }}
    >
      {/* Botão de cancelar (background) */}
      <div
        className="absolute inset-y-0 right-0 flex items-center justify-center bg-red-500 text-white"
        style={{ width: BUTTON_WIDTH }}
      >
        <button
          onClick={handleCancelClick}
          className="flex flex-col items-center gap-0.5 text-xs font-medium active:scale-90 transition-transform"
          disabled={removing}
        >
          <X className="w-4 h-4" />
          Cancelar
        </button>
      </div>

      {/* Conteúdo principal (deslizável) */}
      <div
        className="relative bg-white"
        style={{
          transform: removing
            ? "translateX(-100%)"
            : `translateX(${offsetX}px)`,
          transition: removing
            ? "transform 0.3s ease-in"
            : swiping.current
              ? "none"
              : "transform 0.25s ease-out",
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleContentClick}
      >
        {children}
      </div>
    </div>
  );
}
