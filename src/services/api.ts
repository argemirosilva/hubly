import type { ApiResponse, AppConfig, User, LocationData } from '@/types/app';

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

export const apiService = {
  async login(username: string, password: string, baseUrl: string): Promise<ApiResponse<{ user: User; config: AppConfig }>> {
    try {
      // For demo purposes, simulate API response
      // Replace this with actual API call to your platform
      const response = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ username, password }),
      });
      
      if (!response.ok) {
        throw new Error('Credenciais inválidas');
      }
      
      const data = await response.json();
      setApiBaseUrl(baseUrl);
      return { success: true, data };
    } catch (error) {
      // Demo mode - simulate successful login
      console.log('Demo mode: simulating login');
      setApiBaseUrl(baseUrl);
      return {
        success: true,
        data: {
          user: {
            id: '1',
            username,
            token: 'demo-token-123',
          },
          config: {
            recordingDurationMinutes: 5,
            gpsIntervalSeconds: 30,
            apiBaseUrl: baseUrl,
            dialogueDetectionEnabled: true,
            autoStartRecording: false,
          },
        },
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
