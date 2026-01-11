import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Upload, FileAudio, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { supabase } from '@/integrations/supabase/client';
import { apiService } from '@/services/api';
import { toast } from 'sonner';

/**
 * Converte um arquivo de áudio para WAV com callback de progresso
 */
const convertToWav = async (
  file: File, 
  onProgress?: (progress: number) => void
): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const audioContext = new AudioContext();
    const reader = new FileReader();

    // Fase 1: Leitura do arquivo (0-30%)
    reader.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        const readProgress = (e.loaded / e.total) * 30;
        onProgress(readProgress);
      }
    };

    reader.onload = async (e) => {
      try {
        onProgress?.(30); // Leitura concluída
        
        const arrayBuffer = e.target?.result as ArrayBuffer;
        
        // Fase 2: Decodificação (30-60%)
        onProgress?.(40);
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        onProgress?.(60);
        
        // Fase 3: Conversão para WAV (60-100%)
        const wavBlob = audioBufferToWav(audioBuffer, onProgress);
        onProgress?.(100);
        
        resolve(wavBlob);
      } catch (error) {
        reject(error);
      } finally {
        audioContext.close();
      }
    };

    reader.onerror = () => reject(new Error('Falha ao ler arquivo'));
    reader.readAsArrayBuffer(file);
  });
};

/**
 * Converte AudioBuffer para WAV Blob
 */
const audioBufferToWav = (
  buffer: AudioBuffer, 
  onProgress?: (progress: number) => void
): Blob => {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  
  const samples = buffer.length;
  const dataSize = samples * blockAlign;
  const headerSize = 44;
  const totalSize = headerSize + dataSize;
  
  const arrayBuffer = new ArrayBuffer(totalSize);
  const view = new DataView(arrayBuffer);
  
  // WAV header
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };
  
  writeString(0, 'RIFF');
  view.setUint32(4, totalSize - 8, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // fmt chunk size
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);
  
  // Write audio data with progress updates
  let offset = 44;
  const channelData: Float32Array[] = [];
  for (let ch = 0; ch < numChannels; ch++) {
    channelData.push(buffer.getChannelData(ch));
  }
  
  const progressInterval = Math.floor(samples / 10); // Update every 10%
  
  for (let i = 0; i < samples; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = Math.max(-1, Math.min(1, channelData[ch][i]));
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
      view.setInt16(offset, intSample, true);
      offset += 2;
    }
    
    // Update progress (60-100% range)
    if (onProgress && i % progressInterval === 0) {
      const writeProgress = 60 + (i / samples) * 40;
      onProgress(writeProgress);
    }
  }
  
  return new Blob([arrayBuffer], { type: 'audio/wav' });
};

/**
 * Componente de teste para upload de arquivos de áudio
 * REMOVER APÓS TESTES
 */
export const AudioUploadTest = () => {
  const { user } = useAppStore();
  const [isUploading, setIsUploading] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [conversionProgress, setConversionProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Verificar se é WAV ou MP3
      const validTypes = ['audio/wav', 'audio/x-wav', 'audio/mpeg', 'audio/mp3'];
      if (!validTypes.includes(file.type) && !file.name.match(/\.(wav|mp3)$/i)) {
        toast.error('Por favor, selecione um arquivo WAV ou MP3');
        return;
      }
      setSelectedFile(file);
      setUploadStatus('idle');
    }
  };

  const getAudioDuration = (file: File | Blob): Promise<number> => {
    return new Promise((resolve) => {
      const audio = new Audio();
      audio.onloadedmetadata = () => {
        URL.revokeObjectURL(audio.src);
        resolve(Math.round(audio.duration));
      };
      audio.onerror = () => resolve(0);
      audio.src = URL.createObjectURL(file);
    });
  };

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        // Remove data:audio/wav;base64, prefix
        const base64Data = base64.split(',')[1];
        resolve(base64Data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
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
      let wavBlob: Blob;
      const isWav = selectedFile.type === 'audio/wav' || 
                    selectedFile.type === 'audio/x-wav' || 
                    selectedFile.name.toLowerCase().endsWith('.wav');

      if (isWav) {
        // Já é WAV, usar diretamente
        wavBlob = selectedFile;
        console.log('[AudioUploadTest] Arquivo já é WAV, enviando diretamente');
      } else {
        // Converter MP3 para WAV
        setIsConverting(true);
        setConversionProgress(0);
        toast.info('Convertendo MP3 para WAV...');
        console.log('[AudioUploadTest] Convertendo MP3 para WAV...');
        wavBlob = await convertToWav(selectedFile, (progress) => {
          setConversionProgress(Math.round(progress));
        });
        setIsConverting(false);
        setConversionProgress(0);
        console.log('[AudioUploadTest] Conversão concluída');
      }

      const duration = await getAudioDuration(wavBlob);
      const fileName = selectedFile.name.replace(/\.(mp3|wav)$/i, '.wav');
      
      // Convert blob to base64
      toast.info('Preparando áudio...');
      const base64Data = await blobToBase64(wavBlob);
      
      console.log('[AudioUploadTest] Áudio convertido para base64, tamanho:', Math.round(base64Data.length / 1024), 'KB');

      // Send directly to API with base64 content
      toast.info('Enviando para API do Ampara...');
      
      const payload = {
        file_base64: base64Data,
        file_name: fileName,
        duracao_segundos: duration || 60,
        tamanho_mb: wavBlob.size / (1024 * 1024),
        email_usuario: user.email,
      };

      console.log('[AudioUploadTest] Enviando para API:', {
        nome_original: selectedFile.name,
        file_name: fileName,
        tamanho_mb: payload.tamanho_mb.toFixed(2),
        duracao_segundos: payload.duracao_segundos,
        email: payload.email_usuario,
        base64_length: base64Data.length,
      });

      const result = await apiService.sendAudio(payload);

      console.log('[AudioUploadTest] Resposta da API:', result);

      if (result.success) {
        setUploadStatus('success');
        toast.success('Áudio WAV enviado com sucesso!', {
          description: `Gravação ID: ${result.data?.gravacao_id || 'N/A'}`,
        });
        console.log('[AudioUploadTest] Sucesso:', result.data);
      } else {
        setUploadStatus('error');
        toast.error('Falha ao enviar áudio', {
          description: result.error || 'Erro desconhecido',
        });
        console.error('[AudioUploadTest] Erro:', result.error);
      }
    } catch (error) {
      setUploadStatus('error');
      toast.error('Erro ao processar arquivo');
      console.error('[AudioUploadTest] Erro:', error);
    } finally {
      setIsUploading(false);
      setIsConverting(false);
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
          accept="audio/wav,audio/x-wav,audio/mpeg,audio/mp3,.wav,.mp3"
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

            {isConverting && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Convertendo para WAV...</span>
                  <span>{conversionProgress}%</span>
                </div>
                <Progress value={conversionProgress} className="h-2" />
              </div>
            )}

            <div className="flex gap-2">
              <Button
                onClick={handleUpload}
                disabled={isUploading}
                className="flex-1"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {isConverting ? 'Convertendo...' : 'Enviando...'}
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
          Formatos aceitos: WAV, MP3 (convertido para WAV automaticamente)
        </p>
      </CardContent>
    </Card>
  );
};
