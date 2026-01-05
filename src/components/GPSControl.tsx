import React from 'react';
import { MapPin, Navigation } from 'lucide-react';
import { useGeolocation } from '@/hooks/useGeolocation';

const GPSControl: React.FC = () => {
  const { isTracking, currentLocation, toggleTracking } = useGeolocation();

  return (
    <div className="card-ampara !p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-base font-bold text-foreground font-display">Localização GPS</h3>
          <p className="text-xs text-muted-foreground">
            {isTracking ? 'Enviando em tempo real' : 'Rastreamento pausado'}
          </p>
        </div>
        {isTracking && (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-secondary/10">
            <Navigation className="w-3 h-3 text-secondary animate-pulse" />
            <span className="text-[10px] text-secondary font-semibold">ATIVO</span>
          </div>
        )}
      </div>

      {currentLocation && (
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
        className={`w-full h-10 rounded-xl flex items-center justify-center gap-1.5 transition-all duration-300 shadow-soft ${
          isTracking
            ? 'gradient-secondary text-secondary-foreground hover:shadow-medium'
            : 'bg-accent border border-border text-foreground hover:bg-accent/80 hover:text-primary'
        }`}
      >
        <MapPin className="w-4 h-4" />
        <span className="text-sm font-semibold">
          {isTracking ? 'GPS Ativo' : 'Ativar GPS'}
        </span>
      </button>
    </div>
  );
};

export default GPSControl;
