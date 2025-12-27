export interface AppConfig {
  recordingDurationMinutes: number;
  gpsIntervalSeconds: number;
  apiBaseUrl: string;
  dialogueDetectionEnabled: boolean;
  autoStartRecording: boolean;
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
