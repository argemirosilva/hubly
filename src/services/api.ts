import type { ApiResponse, AppConfig, User, LocationData, LoginTipo, ContatoRedeApoio } from '@/types/app';

// Base URL will be set from config
let API_BASE_URL = '';

export const setApiBaseUrl = (url: string) => {
  API_BASE_URL = url;
};

const getHeaders = (token?: string) => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

interface LoginApiResponse {
  success: boolean;
  usuario?: {
    id: string;
    email: string;
    nome_vitima: string;
    telefone_vitima?: string;
    gravacao_inicio?: string;
    gravacao_fim?: string;
    gravacao_dias?: string[];
    contatos_rede_apoio?: ContatoRedeApoio[];
  };
  loginTipo?: LoginTipo;
  error?: string;
}

interface GPSApiResponse {
  success: boolean;
  localizacao_id?: string;
  endereco_aproximado?: string;
  compartilhado_com?: string[];
  error?: string;
}

interface PanicApiResponse {
  success: boolean;
  alerta_id?: string;
  rede_apoio_notificada?: boolean;
  contatos_notificados?: number;
  autoridades_acionadas?: boolean;
  protocolo?: string;
  mensagem?: string;
  error?: string;
}

interface AudioApiResponse {
  success: boolean;
  gravacao_id?: string;
  message?: string;
  error?: string;
}

export interface GPSPayload {
  email_usuario: string;
  latitude: number;
  longitude: number;
  precisao_metros?: number;
  altitude?: number;
  velocidade?: number;
  timestamp_gps?: string;
  bateria_percentual?: number;
  em_movimento?: boolean;
  tipo_localizacao: 'automatico' | 'manual' | 'panico';
}

export interface PanicPayload {
  email_usuario: string;
  latitude: number;
  longitude: number;
  precisao_metros?: number;
  tipo_acionamento: 'botao_panico' | 'sensor_queda' | 'senha_coacao' | 'palavra_codigo';
  bateria_percentual?: number;
  gravacao_id?: string;
}

export interface AudioPayload {
  file_url: string;
  duracao_segundos: number;
  tamanho_mb: number;
  email_usuario: string;
}

export const apiService = {
  async recuperarSenha(email: string, baseUrl: string): Promise<ApiResponse<{ message: string }>> {
    try {
      const response = await fetch(`${baseUrl}/api/functions/recuperarSenha`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ email }),
      });
      
      const data = await response.json();
      
      if (!data.success) {
        return { success: false, error: data.error || 'Não foi possível processar a solicitação' };
      }
      
      return { success: true, data: { message: data.message || 'Instruções enviadas para seu e-mail' } };
    } catch (error) {
      console.error('Erro na recuperação de senha:', error);
      return { success: false, error: 'Não foi possível conectar ao servidor' };
    }
  },

  async login(
    email: string, 
    senha: string, 
    baseUrl: string,
    tipoAcao: 'login' | 'desinstalacao' = 'login'
  ): Promise<ApiResponse<{ user: User; config: AppConfig; loginTipo: LoginTipo }>> {
    try {
      setApiBaseUrl(baseUrl);
      
      const response = await fetch(`${baseUrl}/api/functions/loginCustomizado`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ 
          email, 
          senha,
          tipo_acao: tipoAcao
        }),
      });
      
      const data: LoginApiResponse = await response.json();
      
      if (!data.success || !data.usuario) {
        return { 
          success: false, 
          error: data.error || 'Credenciais inválidas' 
        };
      }
      
      const user: User = {
        id: data.usuario.id,
        email: data.usuario.email,
        nome: data.usuario.nome_vitima,
        telefone: data.usuario.telefone_vitima,
        token: data.usuario.id,
      };
      
      const config: AppConfig = {
        recordingDurationMinutes: 5,
        gpsIntervalSeconds: 30,
        apiBaseUrl: baseUrl,
        dialogueDetectionEnabled: true,
        autoStartRecording: false,
        gravacaoInicio: data.usuario.gravacao_inicio,
        gravacaoFim: data.usuario.gravacao_fim,
        gravacaoDias: data.usuario.gravacao_dias,
        contatosRedeApoio: data.usuario.contatos_rede_apoio,
      };
      
      return { 
        success: true, 
        data: { 
          user, 
          config, 
          loginTipo: data.loginTipo || 'normal' 
        } 
      };
    } catch (error) {
      console.error('Erro no login:', error);
      return { 
        success: false, 
        error: 'Não foi possível conectar ao servidor' 
      };
    }
  },

  async sendLocation(payload: GPSPayload): Promise<ApiResponse<GPSApiResponse>> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/functions/receberLocalizacaoGPS`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });
      
      const data: GPSApiResponse = await response.json();
      
      if (!data.success) {
        return { success: false, error: data.error || 'Falha ao enviar localização' };
      }
      
      return { 
        success: true, 
        data 
      };
    } catch (error) {
      console.error('Erro ao enviar GPS:', error);
      return { success: false, error: 'Falha ao enviar localização' };
    }
  },

  async sendPanicAlert(payload: PanicPayload): Promise<ApiResponse<PanicApiResponse>> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/functions/acionarPanicoMobile`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });
      
      const data: PanicApiResponse = await response.json();
      
      if (!data.success) {
        return { success: false, error: data.error || 'Falha ao enviar alerta' };
      }
      
      return { 
        success: true, 
        data 
      };
    } catch (error) {
      console.error('Erro ao enviar alerta de pânico:', error);
      // Em caso de erro, ainda considerar como acionado localmente
      return { success: true };
    }
  },

  async sendAudio(payload: AudioPayload): Promise<ApiResponse<AudioApiResponse>> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/functions/receberAudioMobile`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });
      
      const data: AudioApiResponse = await response.json();
      
      if (!data.success) {
        return { success: false, error: data.error || 'Falha ao enviar áudio' };
      }
      
      return { 
        success: true, 
        data 
      };
    } catch (error) {
      console.error('Erro ao enviar áudio:', error);
      return { success: false, error: 'Falha ao enviar áudio' };
    }
  },

  // Helper para obter nível de bateria
  async getBatteryLevel(): Promise<number | undefined> {
    try {
      if ('getBattery' in navigator) {
        // @ts-ignore
        const battery = await navigator.getBattery();
        return Math.round(battery.level * 100);
      }
    } catch {
      // Battery API não disponível
    }
    return undefined;
  },
};
