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
      // LIGHT descreve o fundo: horário e ícones ficam escuros.
      style: 'LIGHT',
      overlaysWebView: true,
      backgroundColor: '#fdf7ee',
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
  ios: {
    // A página já reserva as safe areas; não somar outro recuo nativo.
    contentInset: 'never',
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
