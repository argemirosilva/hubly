export interface ContatoRedeApoio {
  nome: string;
  telefone_ddd: string;
  telefone_numero: string;
}

export interface AppConfig {
  recordingDurationMinutes: number;
  gpsIntervalSeconds: number;
  apiBaseUrl: string;
  dialogueDetectionEnabled: boolean;
  autoStartRecording: boolean;
  // Horários de gravação automática
  gravacaoInicio?: string; // Ex: "19:00"
  gravacaoFim?: string; // Ex: "23:00"
  gravacaoDias?: string[]; // Ex: ["seg", "ter", "qua"]
  // Contatos de emergência
  contatosRedeApoio?: ContatoRedeApoio[];
  // Comandos de voz personalizáveis
  voiceCommand?: string; // Comando de voz de pânico
  panicCancelCommand?: string; // Comando para cancelar pânico
  recordingStartCommand?: string; // Comando para iniciar gravação
  recordingStopCommand?: string; // Comando para parar gravação
}

export interface User {
  id: string;
  email: string;
  nome: string;
  telefone?: string;
  token: string;
}

export type LoginTipo = 'normal' | 'coacao';

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
