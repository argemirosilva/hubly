import React from 'react';
import { MapPin, Navigation } from 'lucide-react';
import { useGeolocation } from '@/hooks/useGeolocation';

const GPSControl: React.FC = () => {
  const { isTracking, currentLocation, toggleTracking } = useGeolocation();

  return (
    <div className="bg-card rounded-2xl p-6 border border-border">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Localização GPS</h3>
          <p className="text-sm text-muted-foreground">
            {isTracking ? 'Enviando em tempo real' : 'Rastreamento pausado'}
          </p>
        </div>
        {isTracking && (
          <div className="flex items-center gap-2">
            <Navigation className="w-4 h-4 text-primary animate-pulse" />
            <span className="text-xs text-primary font-medium">ATIVO</span>
          </div>
        )}
      </div>

      {currentLocation && (
        <div className="mb-4 p-3 bg-secondary/50 rounded-lg">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="w-4 h-4" />
            <span className="font-mono text-xs">
              {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}
            </span>
          </div>
          {currentLocation.accuracy && (
            <p className="text-xs text-muted-foreground mt-1">
              Precisão: ±{Math.round(currentLocation.accuracy)}m
            </p>
          )}
        </div>
      )}

      <button
        onClick={toggleTracking}
        className={`w-full h-14 rounded-xl flex items-center justify-center gap-2 transition-all duration-300 ${
          isTracking
            ? 'bg-primary text-primary-foreground'
            : 'bg-secondary border border-border text-foreground hover:bg-secondary/80'
        }`}
      >
        <MapPin className="w-5 h-5" />
        <span className="font-medium">
          {isTracking ? 'GPS Ativo' : 'Ativar GPS'}
        </span>
      </button>
    </div>
  );
};

export default GPSControl;
