export interface AppConfig {
  recordingDurationMinutes: number;
  gpsIntervalSeconds: number;
  apiBaseUrl: string;
  dialogueDetectionEnabled: boolean;
  autoStartRecording: boolean;
  // Comandos de voz personalizáveis
  voiceCommand?: string; // Comando de voz de pânico
  panicCancelCommand?: string; // Comando para cancelar pânico
  recordingStartCommand?: string; // Comando para iniciar gravação
  recordingStopCommand?: string; // Comando para parar gravação
}

export interface User {
  id: string;
  username: string;
  token: string;
}

export interface LocationData {
  latitude: number;
  longitude: number;
  timestamp: number;
  accuracy?: number;
}

export interface AudioRecording {
  id: string;
  blob: Blob;
  duration: number;
  timestamp: number;
  hasDialogue?: boolean;
  sent: boolean;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
