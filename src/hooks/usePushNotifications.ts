import { useState, useEffect, useCallback } from 'react';
import { pushNotificationService, PushNotificationState } from '@/services/pushNotifications';
import { Capacitor } from '@capacitor/core';

export const usePushNotifications = () => {
  const [state, setState] = useState<PushNotificationState>({
    isSupported: Capacitor.isNativePlatform(),
    isRegistered: false,
    token: null,
    error: null,
  });
  const [isInitializing, setIsInitializing] = useState(false);

  useEffect(() => {
    const listener = (newState: PushNotificationState) => {
      setState(newState);
    };

    pushNotificationService.addListener(listener);
    setState(pushNotificationService.getState());

    return () => {
      pushNotificationService.removeListener(listener);
    };
  }, []);

  const initialize = useCallback(async () => {
    setIsInitializing(true);
    try {
      await pushNotificationService.initialize();
    } catch (error) {
      console.error('Failed to initialize push notifications:', error);
    } finally {
      setIsInitializing(false);
    }
  }, []);

  const showLocalNotification = useCallback(async (title: string, body: string) => {
    await pushNotificationService.showLocalNotification(title, body);
  }, []);

  return {
    ...state,
    isInitializing,
    initialize,
    showLocalNotification,
  };
};
