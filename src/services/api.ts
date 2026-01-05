import type { ApiResponse, AppConfig, User, LocationData, LoginTipo, ContatoRedeApoio } from '@/types/app';

// URL do servidor API
const API_BASE_URL = 'https://amparamulher.lovable.app';

export const setApiBaseUrl = (url: string) => {
  // Mantido para compatibilidade, mas URL é fixa
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

// Função helper para fazer requisições ao servidor externo
async function apiRequest<T>(endpoint: string, payload: unknown): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_BASE_URL}/functions/v1/${endpoint}`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!data.success) {
      return { success: false, error: data.error || 'Erro na requisição' };
    }

    return { success: true, data };
  } catch (error) {
    console.error(`[API] Erro em ${endpoint}:`, error);
    return { success: false, error: 'Não foi possível conectar ao servidor' };
  }
}

export const apiService = {
  async recuperarSenha(email: string, baseUrl?: string): Promise<ApiResponse<{ message: string }>> {
    return apiRequest('recuperarSenha', { email });
  },

  async login(
    email: string, 
    senha: string, 
    baseUrl?: string,
    tipoAcao: 'login' | 'desinstalacao' = 'login'
  ): Promise<ApiResponse<{ user: User; config: AppConfig; loginTipo: LoginTipo }>> {
    try {
      const response = await fetch(`${API_BASE_URL}/functions/v1/loginCustomizado`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ email, senha, tipo_acao: tipoAcao }),
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
        apiBaseUrl: API_BASE_URL,
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
    return apiRequest('receberLocalizacaoGPS', payload);
  },

  async sendPanicAlert(payload: PanicPayload): Promise<ApiResponse<PanicApiResponse>> {
    try {
      const result = await apiRequest<PanicApiResponse>('acionarPanicoMobile', payload);
      // Em caso de erro de conexão, ainda considerar como acionado localmente
      if (!result.success) {
        return { success: true };
      }
      return result;
    } catch (error) {
      console.error('Erro ao enviar alerta de pânico:', error);
      return { success: true };
    }
  },

  async sendAudio(payload: AudioPayload): Promise<ApiResponse<AudioApiResponse>> {
    return apiRequest('receberAudioMobile', payload);
  },

  async sendPing(payload: { email_usuario: string; dispositivo_info: string; bateria_percentual: number; versao_app: string }): Promise<ApiResponse<{ message: string }>> {
    return apiRequest('pingMobile', payload);
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
