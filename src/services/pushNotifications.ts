import { PushNotifications, Token, PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

export interface PushNotificationState {
  isSupported: boolean;
  isRegistered: boolean;
  token: string | null;
  error: string | null;
}

class PushNotificationService {
  private token: string | null = null;
  private isRegistered = false;
  private listeners: Set<(state: PushNotificationState) => void> = new Set();

  addListener(listener: (state: PushNotificationState) => void) {
    this.listeners.add(listener);
  }

  removeListener(listener: (state: PushNotificationState) => void) {
    this.listeners.delete(listener);
  }

  private notifyListeners() {
    const state = this.getState();
    this.listeners.forEach((listener) => listener(state));
  }

  getState(): PushNotificationState {
    return {
      isSupported: Capacitor.isNativePlatform(),
      isRegistered: this.isRegistered,
      token: this.token,
      error: null,
    };
  }

  async initialize(): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      console.log('Push notifications not supported on web');
      return;
    }

    try {
      // Request permission
      let permStatus = await PushNotifications.checkPermissions();

      if (permStatus.receive === 'prompt') {
        permStatus = await PushNotifications.requestPermissions();
      }

      if (permStatus.receive !== 'granted') {
        console.log('Push notification permission denied');
        return;
      }

      // Register for push notifications
      await PushNotifications.register();

      // Setup listeners
      this.setupListeners();

      // Also setup local notifications for foreground
      await this.setupLocalNotifications();

    } catch (error) {
      console.error('Error initializing push notifications:', error);
    }
  }

  private setupListeners() {
    // On registration success
    PushNotifications.addListener('registration', (token: Token) => {
      console.log('Push registration success, token:', token.value);
      this.token = token.value;
      this.isRegistered = true;
      this.notifyListeners();
      
      // TODO: Send token to your server
      this.sendTokenToServer(token.value);
    });

    // On registration error
    PushNotifications.addListener('registrationError', (error: any) => {
      console.error('Push registration error:', error);
      this.isRegistered = false;
      this.notifyListeners();
    });

    // On push notification received (foreground)
    PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
      console.log('Push notification received:', notification);
      
      // Show local notification when in foreground
      this.showLocalNotification(
        notification.title || 'Ampara',
        notification.body || 'Nova notificação'
      );
    });

    // On notification action performed (tap)
    PushNotifications.addListener('pushNotificationActionPerformed', (action: ActionPerformed) => {
      console.log('Push notification action:', action);
      
      // Handle notification tap - navigate to relevant screen
      const data = action.notification.data;
      if (data?.type === 'panic') {
        window.location.href = '/dashboard';
      }
    });
  }

  private async setupLocalNotifications() {
    try {
      const permission = await LocalNotifications.requestPermissions();
      if (permission.display === 'granted') {
        console.log('Local notifications enabled');
      }
    } catch (error) {
      console.error('Error setting up local notifications:', error);
    }
  }

  async showLocalNotification(title: string, body: string, data?: Record<string, any>) {
    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            id: Date.now(),
            title,
            body,
            schedule: { at: new Date(Date.now() + 100) },
            extra: data,
          },
        ],
      });
    } catch (error) {
      console.error('Error showing local notification:', error);
    }
  }

  private async sendTokenToServer(token: string) {
    // TODO: Implement sending token to your API
    // This token is needed to send push notifications to this device
    console.log('Should send token to server:', token);
    
    // Example:
    // await apiService.registerPushToken(token, userToken);
  }

  async unregister() {
    if (Capacitor.isNativePlatform()) {
      await PushNotifications.removeAllListeners();
      this.isRegistered = false;
      this.token = null;
      this.notifyListeners();
    }
  }

  getToken(): string | null {
    return this.token;
  }
}

export const pushNotificationService = new PushNotificationService();
