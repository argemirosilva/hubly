import React from 'react';
import { MapPin, Navigation, Clock, AlertCircle } from 'lucide-react';
import { useScheduledGPS } from '@/hooks/useScheduledGPS';
import { useAppStore } from '@/store/appStore';

const GPSControl: React.FC = () => {
  const { config } = useAppStore();
  const { isTracking, currentLocation, isInMonitoringPeriod, toggleTracking } = useScheduledGPS();

  // Info do período de monitoramento
  const scheduledStart = config?.gravacaoInicio || '';
  const scheduledEnd = config?.gravacaoFim || '';
  const scheduledDays = config?.gravacaoDias || [];

  return (
    <div className="card-ampara !p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-base font-bold text-foreground font-display">Localização GPS</h3>
          <p className="text-xs text-muted-foreground">
            {isInMonitoringPeriod 
              ? (isTracking ? 'Enviando em tempo real' : 'Pronto para rastrear')
              : 'Fora do período de monitoramento'}
          </p>
        </div>
        {isTracking && (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-secondary/10">
            <Navigation className="w-3 h-3 text-secondary animate-pulse" />
            <span className="text-[10px] text-secondary font-semibold">ATIVO</span>
          </div>
        )}
      </div>

      {/* Status do período de monitoramento */}
      <div className={`mb-3 p-2.5 rounded-lg border ${
        isInMonitoringPeriod 
          ? 'bg-success/10 border-success/20' 
          : 'bg-muted/50 border-border'
      }`}>
        <div className="flex items-center gap-1.5 mb-1">
          {isInMonitoringPeriod ? (
            <>
              <Clock className="w-3 h-3 text-success" />
              <span className="text-[10px] font-semibold text-success">Dentro do período</span>
            </>
          ) : (
            <>
              <AlertCircle className="w-3 h-3 text-muted-foreground" />
              <span className="text-[10px] font-semibold text-muted-foreground">Fora do período</span>
            </>
          )}
        </div>
        
        {scheduledStart && scheduledEnd ? (
          <p className="text-[10px] text-muted-foreground">
            Monitoramento: {scheduledStart} - {scheduledEnd}
            {scheduledDays.length > 0 && ` (${scheduledDays.join(', ')})`}
          </p>
        ) : (
          <p className="text-[10px] text-muted-foreground">
            Horários não configurados no servidor
          </p>
        )}
      </div>

      {currentLocation && isTracking && (
        <div className="mb-3 p-2.5 bg-accent/50 rounded-lg">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="w-3 h-3 text-primary" />
            <span className="font-mono text-[10px]">
              {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}
            </span>
          </div>
          {currentLocation.accuracy && (
            <p className="text-[10px] text-muted-foreground mt-1">
              Precisão: ±{Math.round(currentLocation.accuracy)}m
            </p>
          )}
        </div>
      )}

      <button
        onClick={toggleTracking}
        disabled={!isInMonitoringPeriod}
        className={`w-full h-10 rounded-xl flex items-center justify-center gap-1.5 transition-all duration-300 shadow-soft disabled:opacity-50 disabled:cursor-not-allowed ${
          isTracking
            ? 'gradient-secondary text-secondary-foreground hover:shadow-medium'
            : isInMonitoringPeriod
              ? 'bg-accent border border-border text-foreground hover:bg-accent/80 hover:text-primary'
              : 'bg-muted border border-border text-muted-foreground'
        }`}
      >
        <MapPin className="w-4 h-4" />
        <span className="text-sm font-semibold">
          {!isInMonitoringPeriod 
            ? 'Aguardando período' 
            : isTracking 
              ? 'GPS Ativo' 
              : 'Ativar GPS'}
        </span>
      </button>
    </div>
  );
};

export default GPSControl;
