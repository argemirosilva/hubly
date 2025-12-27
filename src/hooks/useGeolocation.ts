import { useState, useCallback, useRef, useEffect } from 'react';
import { Geolocation, Position } from '@capacitor/geolocation';
import { useAppStore } from '@/store/appStore';
import { apiService } from '@/services/api';
import { syncService } from '@/services/syncService';
import { useToast } from '@/hooks/use-toast';
import type { LocationData } from '@/types/app';

export const useGeolocation = () => {
  const { config, user, isTracking, setIsTracking } = useAppStore();
  const { toast } = useToast();
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const watchIdRef = useRef<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const sendLocationUpdate = useCallback(async (position: Position) => {
    const locationData: LocationData = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      timestamp: position.timestamp,
      accuracy: position.coords.accuracy,
    };
    
    setCurrentLocation(locationData);
    
    if (user?.token) {
      if (navigator.onLine) {
        const result = await apiService.sendLocation(locationData, user.token);
        if (!result.success) {
          // Failed, save offline
          await syncService.saveForOffline('location', {
            latitude: locationData.latitude,
            longitude: locationData.longitude,
            timestamp: locationData.timestamp,
            accuracy: locationData.accuracy,
          });
        }
      } else {
        // Offline, save locally
        await syncService.saveForOffline('location', {
          latitude: locationData.latitude,
          longitude: locationData.longitude,
          timestamp: locationData.timestamp,
          accuracy: locationData.accuracy,
        });
      }
    }
  }, [user]);

  const startTracking = useCallback(async () => {
    try {
      // Request permissions
      const permission = await Geolocation.requestPermissions();
      
      if (permission.location !== 'granted') {
        toast({
          title: 'Permissão negada',
          description: 'É necessário permitir acesso à localização',
          variant: 'destructive',
        });
        return;
      }

      // Get initial position
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
      });
      sendLocationUpdate(position);

      // Start watching position
      watchIdRef.current = await Geolocation.watchPosition(
        {
          enableHighAccuracy: true,
        },
        (position, err) => {
          if (position && !err) {
            sendLocationUpdate(position);
          }
        }
      );

      // Also send updates at configured interval
      const intervalMs = (config?.gpsIntervalSeconds || 30) * 1000;
      intervalRef.current = setInterval(async () => {
        try {
          const pos = await Geolocation.getCurrentPosition({
            enableHighAccuracy: true,
          });
          sendLocationUpdate(pos);
        } catch (error) {
          console.error('Error getting position:', error);
        }
      }, intervalMs);

      setIsTracking(true);
      const offlineNote = navigator.onLine ? '' : ' (modo offline)';
      toast({
        title: 'GPS ativado',
        description: `Enviando localização a cada ${config?.gpsIntervalSeconds || 30}s${offlineNote}`,
      });
    } catch (error) {
      console.error('Error starting tracking:', error);
      
      // Fallback for web
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const locationData: LocationData = {
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              timestamp: pos.timestamp,
              accuracy: pos.coords.accuracy,
            };
            setCurrentLocation(locationData);
          },
          (err) => {
            toast({
              title: 'Erro',
              description: 'Não foi possível obter localização',
              variant: 'destructive',
            });
          }
        );
        setIsTracking(true);
      }
    }
  }, [config, user, sendLocationUpdate, setIsTracking, toast]);

  const stopTracking = useCallback(async () => {
    if (watchIdRef.current) {
      await Geolocation.clearWatch({ id: watchIdRef.current });
      watchIdRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsTracking(false);
    toast({
      title: 'GPS desativado',
      description: 'Rastreamento pausado',
    });
  }, [setIsTracking, toast]);

  const toggleTracking = useCallback(() => {
    if (isTracking) {
      stopTracking();
    } else {
      startTracking();
    }
  }, [isTracking, startTracking, stopTracking]);

  useEffect(() => {
    return () => {
      if (watchIdRef.current) {
        Geolocation.clearWatch({ id: watchIdRef.current });
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    isTracking,
    currentLocation,
    startTracking,
    stopTracking,
    toggleTracking,
  };
};
