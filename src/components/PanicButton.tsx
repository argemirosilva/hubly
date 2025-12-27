import React, { useState, useCallback } from 'react';
import { AlertTriangle, Phone } from 'lucide-react';
import { Geolocation } from '@capacitor/geolocation';
import { useAppStore } from '@/store/appStore';
import { apiService } from '@/services/api';
import { useToast } from '@/hooks/use-toast';
import type { LocationData } from '@/types/app';

const PanicButton: React.FC = () => {
  const { user, isPanicActive, setIsPanicActive } = useAppStore();
  const { toast } = useToast();
  const [isTriggering, setIsTriggering] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const holdTimeRef = React.useRef<NodeJS.Timeout | null>(null);
  const progressRef = React.useRef<NodeJS.Timeout | null>(null);

  const triggerPanic = useCallback(async () => {
    setIsTriggering(true);
    setIsPanicActive(true);

    try {
      let location: LocationData = {
        latitude: 0,
        longitude: 0,
        timestamp: Date.now(),
      };

      try {
        const position = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
        });
        location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          timestamp: position.timestamp,
          accuracy: position.coords.accuracy,
        };
      } catch (error) {
        // Try web fallback
        if ('geolocation' in navigator) {
          await new Promise<void>((resolve) => {
            navigator.geolocation.getCurrentPosition(
              (pos) => {
                location = {
                  latitude: pos.coords.latitude,
                  longitude: pos.coords.longitude,
                  timestamp: pos.timestamp,
                  accuracy: pos.coords.accuracy,
                };
                resolve();
              },
              () => resolve()
            );
          });
        }
      }

      if (user?.token) {
        await apiService.sendPanicAlert(location, user.token);
      }

      toast({
        title: '🚨 ALERTA ENVIADO',
        description: 'Emergência acionada. Ajuda a caminho.',
      });
    } catch (error) {
      console.error('Error triggering panic:', error);
    } finally {
      setIsTriggering(false);
    }
  }, [user, setIsPanicActive, toast]);

  const handleTouchStart = () => {
    setHoldProgress(0);
    
    progressRef.current = setInterval(() => {
      setHoldProgress((prev) => {
        if (prev >= 100) {
          return 100;
        }
        return prev + 5;
      });
    }, 50);

    holdTimeRef.current = setTimeout(() => {
      triggerPanic();
      if (progressRef.current) clearInterval(progressRef.current);
    }, 1000);
  };

  const handleTouchEnd = () => {
    if (holdTimeRef.current) {
      clearTimeout(holdTimeRef.current);
      holdTimeRef.current = null;
    }
    if (progressRef.current) {
      clearInterval(progressRef.current);
      progressRef.current = null;
    }
    setHoldProgress(0);
  };

  const deactivatePanic = () => {
    setIsPanicActive(false);
    toast({
      title: 'Alerta desativado',
      description: 'Modo de emergência encerrado',
    });
  };

  if (isPanicActive) {
    return (
      <div className="bg-emergency/20 rounded-2xl p-6 border-2 border-emergency glow-emergency">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-emergency flex items-center justify-center pulse-emergency">
            <AlertTriangle className="w-5 h-5 text-foreground" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-emergency">EMERGÊNCIA ATIVA</h3>
            <p className="text-sm text-muted-foreground">Alerta enviado à central</p>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => window.open('tel:190')}
            className="flex-1 h-12 rounded-xl bg-secondary flex items-center justify-center gap-2 text-foreground font-medium"
          >
            <Phone className="w-5 h-5" />
            Ligar 190
          </button>
          <button
            onClick={deactivatePanic}
            className="flex-1 h-12 rounded-xl bg-card border border-border text-foreground font-medium"
          >
            Desativar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl p-6 border border-border">
      <div className="text-center mb-4">
        <h3 className="text-lg font-semibold text-foreground">Botão de Pânico</h3>
        <p className="text-sm text-muted-foreground">Segure por 1 segundo para ativar</p>
      </div>

      <button
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleTouchStart}
        onMouseUp={handleTouchEnd}
        onMouseLeave={handleTouchEnd}
        disabled={isTriggering}
        className="relative w-full h-24 rounded-2xl bg-emergency/10 border-2 border-emergency flex items-center justify-center overflow-hidden transition-all duration-200 hover:bg-emergency/20 active:scale-95"
      >
        {/* Progress overlay */}
        <div
          className="absolute inset-0 bg-emergency/30 transition-all duration-75"
          style={{ width: `${holdProgress}%` }}
        />
        
        <div className="relative z-10 flex items-center gap-3">
          <AlertTriangle className="w-8 h-8 text-emergency" />
          <span className="text-lg font-bold text-emergency">
            {isTriggering ? 'ENVIANDO...' : 'SOS'}
          </span>
        </div>
      </button>
    </div>
  );
};

export default PanicButton;
