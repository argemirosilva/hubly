import type { ApiResponse, AppConfig, User, LocationData, LoginTipo, ContatoRedeApoio } from '@/types/app';

const API_BASE_URL = 'https://ilikiajeduezvvanjejz.supabase.co/functions/v1/mobile-api';

// Mantido para compatibilidade
export const setApiBaseUrl = (url: string) => {};

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
  session?: {
    token: string;
    expires_at: string;
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

// Evento customizado para sessão expirada
export const SESSION_EXPIRED_EVENT = 'session-expired';

export function dispatchSessionExpired() {
  window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT));
}

async function apiRequest<T>(action: string, body: object): Promise<{ data: T | null; error: Error | null; isSessionExpired?: boolean }> {
  try {
    const response = await fetch(API_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action, ...body }),
    });
    
    const data = await response.json();
    
    // Detectar sessão expirada
    if (response.status === 401 || (data && !data.success && data.error?.includes('Sessão inválida'))) {
      console.warn('[API] Sessão expirada detectada');
      dispatchSessionExpired();
      return { data: null, error: new Error('Sessão expirada'), isSessionExpired: true };
    }
    
    if (!response.ok) {
      throw new Error(data?.error || `HTTP error! status: ${response.status}`);
    }
    
    return { data, error: null };
  } catch (error) {
    console.error(`[API] Erro em ${action}:`, error);
    return { data: null, error: error as Error };
  }
}

export const apiService = {
  async recuperarSenha(email: string, baseUrl?: string): Promise<ApiResponse<{ message: string }>> {
    try {
      const { data, error } = await apiRequest<{ success: boolean; message?: string; error?: string }>('recuperarSenha', { email });
      
      if (error) {
        console.error('[API] Erro recuperarSenha:', error);
        return { success: false, error: error.message || 'Não foi possível processar a solicitação' };
      }
      
      if (!data?.success) {
        return { success: false, error: data?.error || 'Não foi possível processar a solicitação' };
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
    baseUrl?: string,
    tipoAcao: 'login' | 'desinstalacao' = 'login'
  ): Promise<ApiResponse<{ user: User; config: AppConfig; loginTipo: LoginTipo }>> {
    try {
      console.log('[API] Tentando login para:', email);
      
      const { data, error } = await apiRequest<LoginApiResponse>('loginCustomizado', { 
        email, 
        senha, 
        tipo_acao: tipoAcao 
      });
      
      console.log('[API] Resposta login:', data, error);
      
      if (error) {
        console.error('[API] Erro login:', error);
        return { success: false, error: error.message || 'Credenciais inválidas' };
      }
      
      if (!data?.success || !data?.usuario) {
        return { 
          success: false, 
          error: data?.error || 'Credenciais inválidas' 
        };
      }
      
      const user: User = {
        id: data.usuario.id,
        email: data.usuario.email,
        nome: data.usuario.nome_vitima,
        telefone: data.usuario.telefone_vitima,
        token: data.usuario.id,
        sessionToken: data.session?.token,
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
    try {
      const { data, error } = await apiRequest<GPSApiResponse>('receberLocalizacaoGPS', payload);
      
      if (error) {
        console.error('[API] Erro GPS:', error);
        return { success: false, error: error.message || 'Falha ao enviar localização' };
      }
      
      if (!data?.success) {
        return { success: false, error: data?.error || 'Falha ao enviar localização' };
      }
      
      return { success: true, data };
    } catch (error) {
      console.error('Erro ao enviar GPS:', error);
      return { success: false, error: 'Falha ao enviar localização' };
    }
  },

  async sendPanicAlert(payload: PanicPayload): Promise<ApiResponse<PanicApiResponse>> {
    try {
      const { data, error } = await apiRequest<PanicApiResponse>('acionarPanicoMobile', payload);
      
      if (error) {
        console.error('[API] Erro pânico:', error);
        return { success: true };
      }
      
      if (!data?.success) {
        return { success: true };
      }
      
      return { success: true, data };
    } catch (error) {
      console.error('Erro ao enviar alerta de pânico:', error);
      return { success: true };
    }
  },

  async sendAudio(payload: AudioPayload): Promise<ApiResponse<AudioApiResponse>> {
    try {
      const { data, error } = await apiRequest<AudioApiResponse>('receberAudioMobile', payload);
      
      if (error) {
        console.error('[API] Erro áudio:', error);
        return { success: false, error: error.message || 'Falha ao enviar áudio' };
      }
      
      if (!data?.success) {
        return { success: false, error: data?.error || 'Falha ao enviar áudio' };
      }
      
      return { success: true, data };
    } catch (error) {
      console.error('Erro ao enviar áudio:', error);
      return { success: false, error: 'Falha ao enviar áudio' };
    }
  },

  async sendPing(payload: { email_usuario: string; dispositivo_info: string; bateria_percentual: number; versao_app: string; token_sessao?: string }): Promise<ApiResponse<{ message: string }>> {
    try {
      const { data, error } = await apiRequest<{ success: boolean; message?: string; error?: string }>('pingMobile', payload);
      
      if (error) {
        console.error('[API] Erro ping:', error);
        return { success: false, error: error.message || 'Falha ao enviar ping' };
      }
      
      if (!data?.success) {
        return { success: false, error: data?.error || 'Falha ao enviar ping' };
      }
      
      return { success: true, data: { message: data.message || 'Ping recebido' } };
    } catch (error) {
      console.error('Erro ao enviar ping:', error);
      return { success: false, error: 'Falha ao enviar ping' };
    }
  },

  async refreshConfig(email: string, sessionToken?: string): Promise<ApiResponse<{ 
    gravacao_inicio?: string; 
    gravacao_fim?: string; 
    gravacao_dias?: string[]; 
    contatos_rede_apoio?: ContatoRedeApoio[];
  }>> {
    try {
      const { data, error } = await apiRequest<{ 
        success: boolean; 
        usuario?: {
          gravacao_inicio?: string;
          gravacao_fim?: string;
          gravacao_dias?: string[];
          contatos_rede_apoio?: ContatoRedeApoio[];
        };
        error?: string;
      }>('refreshConfig', { 
        email_usuario: email,
        token_sessao: sessionToken
      });
      
      if (error) {
        console.error('[API] Erro refreshConfig:', error);
        return { success: false, error: error.message || 'Falha ao atualizar configurações' };
      }
      
      if (!data?.success || !data?.usuario) {
        return { success: false, error: data?.error || 'Falha ao atualizar configurações' };
      }
      
      return { 
        success: true, 
        data: {
          gravacao_inicio: data.usuario.gravacao_inicio,
          gravacao_fim: data.usuario.gravacao_fim,
          gravacao_dias: data.usuario.gravacao_dias,
          contatos_rede_apoio: data.usuario.contatos_rede_apoio,
        }
      };
    } catch (error) {
      console.error('Erro ao atualizar configurações:', error);
      return { success: false, error: 'Falha ao atualizar configurações' };
    }
  },

  async logout(email: string, sessionToken?: string): Promise<ApiResponse<{ message: string }>> {
    try {
      console.log('[API] Enviando logout para:', email);
      
      const { data, error } = await apiRequest<{ success: boolean; message?: string; error?: string }>('logoutMobile', { 
        email_usuario: email,
        token_sessao: sessionToken
      });
      
      if (error) {
        console.error('[API] Erro logout:', error);
        return { success: false, error: error.message || 'Falha ao fazer logout' };
      }
      
      if (!data?.success) {
        return { success: false, error: data?.error || 'Falha ao fazer logout' };
      }
      
      return { success: true, data: { message: data.message || 'Logout realizado' } };
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      return { success: false, error: 'Falha ao fazer logout' };
    }
  },

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
