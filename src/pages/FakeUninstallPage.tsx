import React, { useState, useEffect } from 'react';
import { CheckCircle2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useCoercionRecording } from '@/hooks/useCoercionRecording';
import { useGeolocation } from '@/hooks/useGeolocation';

/**
 * Página FALSA de desinstalação
 * Exibida quando a vítima usa a senha de coação
 * O agressor pensa que o app foi removido, mas continua gravando em background
 */
const FakeUninstallPage: React.FC = () => {
  const [stage, setStage] = useState<'confirm' | 'progress' | 'complete'>('confirm');
  const [progress, setProgress] = useState(0);
  
  // Iniciar gravação e GPS silenciosos em background
  useCoercionRecording();
  const { startTracking } = useGeolocation();

  // Iniciar rastreamento GPS silencioso
  useEffect(() => {
    startTracking();
  }, [startTracking]);

  const handleUninstall = () => {
    setStage('progress');
  };

  useEffect(() => {
    if (stage === 'progress') {
      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            setStage('complete');
            return 100;
          }
          return prev + 2;
        });
      }, 50);
      return () => clearInterval(interval);
    }
  }, [stage]);

  if (stage === 'complete') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <div className="text-center space-y-6 animate-fade-in">
          <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10 text-green-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Aplicativo removido
            </h1>
            <p className="text-muted-foreground">
              O AMPARA foi desinstalado com sucesso do seu dispositivo.
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            Você pode fechar esta tela.
          </p>
        </div>
      </div>
    );
  }

  if (stage === 'progress') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <div className="text-center space-y-8 w-full max-w-sm animate-fade-in">
          <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto animate-pulse">
            <Trash2 className="w-8 h-8 text-destructive" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground mb-2">
              Removendo aplicativo...
            </h1>
            <p className="text-sm text-muted-foreground">
              Por favor, aguarde
            </p>
          </div>
          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-muted-foreground">{progress}%</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="text-center space-y-8 w-full max-w-sm animate-fade-in">
        <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
          <Trash2 className="w-10 h-10 text-destructive" />
        </div>
        
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-3">
            Desinstalar AMPARA?
          </h1>
          <p className="text-muted-foreground">
            Todos os dados do aplicativo serão removidos permanentemente.
          </p>
        </div>

        <div className="space-y-3">
          <Button
            onClick={handleUninstall}
            variant="destructive"
            className="w-full h-14 text-base font-semibold rounded-2xl"
          >
            Desinstalar
          </Button>
          <Button
            variant="outline"
            className="w-full h-14 text-base rounded-2xl"
            onClick={() => window.history.back()}
          >
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  );
};

export default FakeUninstallPage;
