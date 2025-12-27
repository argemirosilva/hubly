import React from 'react';
import { MapPin, Navigation } from 'lucide-react';
import { useGeolocation } from '@/hooks/useGeolocation';

const GPSControl: React.FC = () => {
  const { isTracking, currentLocation, toggleTracking } = useGeolocation();

  return (
    <div className="card-ampara">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-foreground font-display">Localização GPS</h3>
          <p className="text-sm text-muted-foreground">
            {isTracking ? 'Enviando em tempo real' : 'Rastreamento pausado'}
          </p>
        </div>
        {isTracking && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/10">
            <Navigation className="w-4 h-4 text-secondary animate-pulse" />
            <span className="text-xs text-secondary font-semibold">ATIVO</span>
          </div>
        )}
      </div>

      {currentLocation && (
        <div className="mb-4 p-4 bg-accent/50 rounded-2xl">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="w-4 h-4 text-primary" />
            <span className="font-mono text-xs">
              {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}
            </span>
          </div>
          {currentLocation.accuracy && (
            <p className="text-xs text-muted-foreground mt-1.5">
              Precisão: ±{Math.round(currentLocation.accuracy)}m
            </p>
          )}
        </div>
      )}

      <button
        onClick={toggleTracking}
        className={`w-full h-14 rounded-2xl flex items-center justify-center gap-2 transition-all duration-300 shadow-soft ${
          isTracking
            ? 'gradient-secondary text-secondary-foreground hover:shadow-medium'
            : 'bg-accent border border-border text-foreground hover:bg-accent/80 hover:text-primary'
        }`}
      >
        <MapPin className="w-5 h-5" />
        <span className="font-semibold">
          {isTracking ? 'GPS Ativo' : 'Ativar GPS'}
        </span>
      </button>
    </div>
  );
};

export default GPSControl;
