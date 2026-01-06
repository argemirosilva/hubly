import React, { useState } from 'react';
import { RefreshCw, Check, X, Clock, Calendar } from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { useConfigRefresh } from '@/hooks/useConfigRefresh';
import { Button } from '@/components/ui/button';

/**
 * Componente de teste para verificar o sincronismo de configurações via API
 * REMOVER APÓS TESTES
 */
export const ConfigRefreshTest: React.FC = () => {
  const { config } = useAppStore();
  const { refreshConfig } = useConfigRefresh();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastResult, setLastResult] = useState<'success' | 'error' | null>(null);
  const [lastRefreshTime, setLastRefreshTime] = useState<string | null>(null);

  const handleForceRefresh = async () => {
    setIsRefreshing(true);
    setLastResult(null);
    
    try {
      const success = await refreshConfig();
      setLastResult(success ? 'success' : 'error');
      setLastRefreshTime(new Date().toLocaleTimeString('pt-BR'));
    } catch (error) {
      console.error('[ConfigRefreshTest] Erro:', error);
      setLastResult('error');
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="card-ampara !p-4 border-2 border-dashed border-warning/50 bg-warning/5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <RefreshCw className="w-4 h-4 text-warning" />
          <h3 className="text-sm font-bold text-foreground">
            Teste de Sync Config
          </h3>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-warning/20 text-warning font-bold">
            DEBUG
          </span>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={handleForceRefresh}
          disabled={isRefreshing}
          className="h-7 text-xs"
        >
          {isRefreshing ? (
            <RefreshCw className="w-3 h-3 animate-spin mr-1" />
          ) : lastResult === 'success' ? (
            <Check className="w-3 h-3 text-success mr-1" />
          ) : lastResult === 'error' ? (
            <X className="w-3 h-3 text-destructive mr-1" />
          ) : (
            <RefreshCw className="w-3 h-3 mr-1" />
          )}
          Forçar Refresh
        </Button>
      </div>

      {/* Configurações atuais */}
      <div className="space-y-2 text-xs">
        <div className="flex items-center gap-2 p-2 bg-background rounded-lg">
          <Clock className="w-3.5 h-3.5 text-primary" />
          <span className="text-muted-foreground">Horário:</span>
          <span className="font-mono font-semibold text-foreground">
            {config?.gravacaoInicio || '---'} - {config?.gravacaoFim || '---'}
          </span>
        </div>
        
        <div className="flex items-center gap-2 p-2 bg-background rounded-lg">
          <Calendar className="w-3.5 h-3.5 text-primary" />
          <span className="text-muted-foreground">Dias:</span>
          <span className="font-mono font-semibold text-foreground">
            {config?.gravacaoDias?.length 
              ? config.gravacaoDias.join(', ') 
              : '---'}
          </span>
        </div>

        {lastRefreshTime && (
          <div className="flex items-center gap-2 p-2 bg-accent/50 rounded-lg">
            <span className="text-muted-foreground">Último refresh:</span>
            <span className="font-mono text-foreground">{lastRefreshTime}</span>
            {lastResult === 'success' && (
              <span className="text-success text-[10px]">✓ OK</span>
            )}
            {lastResult === 'error' && (
              <span className="text-destructive text-[10px]">✗ Erro</span>
            )}
          </div>
        )}
      </div>

      <p className="mt-2 text-[10px] text-muted-foreground">
        Configurações são atualizadas automaticamente a cada 15 min
      </p>
    </div>
  );
};
