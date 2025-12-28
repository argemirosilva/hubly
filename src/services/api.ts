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

export const apiService = {
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
        token: data.usuario.id, // Usar ID como token temporário
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

  async sendLocation(location: LocationData, token: string): Promise<ApiResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/location`, {
        method: 'POST',
        headers: getHeaders(token),
        body: JSON.stringify(location),
      });
      
      if (!response.ok) throw new Error('Falha ao enviar localização');
      return { success: true };
    } catch (error) {
      console.error('Error sending location:', error);
      return { success: false, error: 'Falha ao enviar localização' };
    }
  },

  async sendAudio(audioBlob: Blob, token: string): Promise<ApiResponse> {
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, `recording-${Date.now()}.webm`);
      formData.append('timestamp', Date.now().toString());
      
      const response = await fetch(`${API_BASE_URL}/api/audio`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });
      
      if (!response.ok) throw new Error('Falha ao enviar áudio');
      return { success: true };
    } catch (error) {
      console.error('Error sending audio:', error);
      return { success: false, error: 'Falha ao enviar áudio' };
    }
  },

  async sendPanicAlert(location: LocationData, token: string): Promise<ApiResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/panic`, {
        method: 'POST',
        headers: getHeaders(token),
        body: JSON.stringify({
          location,
          timestamp: Date.now(),
          type: 'EMERGENCY',
        }),
      });
      
      if (!response.ok) throw new Error('Falha ao enviar alerta');
      return { success: true };
    } catch (error) {
      console.error('Error sending panic alert:', error);
      // Even if API fails, consider it triggered locally
      return { success: true };
    }
  },
};
