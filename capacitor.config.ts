import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.orizontech.hubly',
  appName: 'Hubly',
  zoomEnabled: false,
  webDir: 'dist/public',
  server: {
    // Shell de gestão: AdminLayout apresenta login ou painel conforme a sessão.
    url: 'https://hubly.orizontech.com.br/admin',
    cleartext: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#fdf7ee',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_INSIDE',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#fdf7ee',
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
  ios: {
    contentInset: 'automatic',
    backgroundColor: '#fdf7ee',
    preferredContentMode: 'mobile',
  },
  android: {
    backgroundColor: '#fdf7ee',
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
};

export default config;
