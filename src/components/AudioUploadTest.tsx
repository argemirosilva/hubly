import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, FileAudio, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { apiService, type AudioPayload } from '@/services/api';
import { toast } from 'sonner';

/**
 * Componente de teste para upload de arquivos de áudio
 * REMOVER APÓS TESTES
 */
export const AudioUploadTest = () => {
  const { user, config } = useAppStore();
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Verificar se é um arquivo de áudio
      if (!file.type.startsWith('audio/')) {
        toast.error('Por favor, selecione um arquivo de áudio');
        return;
      }
      setSelectedFile(file);
      setUploadStatus('idle');
    }
  };

  const getAudioDuration = (file: File): Promise<number> => {
    return new Promise((resolve) => {
      const audio = new Audio();
      audio.onloadedmetadata = () => {
        resolve(Math.round(audio.duration));
      };
      audio.onerror = () => resolve(0);
      audio.src = URL.createObjectURL(file);
    });
  };

  const handleUpload = async () => {
    if (!selectedFile || !user?.email) {
      toast.error('Selecione um arquivo e faça login');
      return;
    }

    setIsUploading(true);
    setUploadStatus('idle');

    try {
      const duration = await getAudioDuration(selectedFile);
      
      // Criar uma URL simulada para teste (a API espera uma URL, não base64)
      // Em produção, o arquivo deveria ser enviado para um storage primeiro
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const simulatedUrl = `https://storage.ampara.org/audios/${user.email}/${timestamp}_${selectedFile.name}`;

      const payload: AudioPayload = {
        file_url: simulatedUrl,
        duracao_segundos: duration || 60,
        tamanho_mb: selectedFile.size / (1024 * 1024),
        email_usuario: user.email,
      };

      console.log('[AudioUploadTest] Enviando áudio:', {
        nome: selectedFile.name,
        tipo: selectedFile.type,
        tamanho_mb: payload.tamanho_mb.toFixed(2),
        duracao_segundos: payload.duracao_segundos,
        email: payload.email_usuario,
        file_url: payload.file_url,
      });

      const result = await apiService.sendAudio(payload);

      if (result.success) {
        setUploadStatus('success');
        toast.success('Áudio enviado com sucesso!', {
          description: `Gravação ID: ${result.data?.gravacao_id || 'N/A'}`,
        });
        console.log('[AudioUploadTest] Sucesso:', result.data);
      } else {
        setUploadStatus('error');
        toast.error('Falha ao enviar áudio', {
          description: result.error,
        });
        console.error('[AudioUploadTest] Erro:', result.error);
      }
    } catch (error) {
      setUploadStatus('error');
      toast.error('Erro ao processar arquivo');
      console.error('[AudioUploadTest] Erro:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleClear = () => {
    setSelectedFile(null);
    setUploadStatus('idle');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Card className="border-dashed border-yellow-500/50 bg-yellow-500/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2 text-yellow-600">
          <FileAudio className="h-4 w-4" />
          Teste de Upload de Áudio
          <span className="text-xs text-muted-foreground">(remover após testes)</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          onChange={handleFileSelect}
          className="hidden"
        />

        {!selectedFile ? (
          <Button
            variant="outline"
            className="w-full border-dashed"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-4 w-4 mr-2" />
            Selecionar arquivo de áudio
          </Button>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 overflow-hidden">
                <FileAudio className="h-4 w-4 flex-shrink-0 text-primary" />
                <span className="text-sm truncate">{selectedFile.name}</span>
              </div>
              <span className="text-xs text-muted-foreground flex-shrink-0">
                {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
              </span>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleUpload}
                disabled={isUploading}
                className="flex-1"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : uploadStatus === 'success' ? (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Enviado!
                  </>
                ) : uploadStatus === 'error' ? (
                  <>
                    <XCircle className="h-4 w-4 mr-2" />
                    Tentar novamente
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Enviar para API
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={handleClear}>
                Limpar
              </Button>
            </div>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Formatos aceitos: MP3, WAV, WebM, M4A, OGG
        </p>
      </CardContent>
    </Card>
  );
};
