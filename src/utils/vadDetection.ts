import { pipeline, env } from '@huggingface/transformers';

// Disable local model caching for browser
env.allowLocalModels = false;

let vadPipeline: any = null;
let isLoading = false;

export const initVAD = async (): Promise<boolean> => {
  if (vadPipeline) return true;
  if (isLoading) return false;

  isLoading = true;
  try {
    console.log('Initializing VAD model...');
    vadPipeline = await pipeline(
      'audio-classification',
      'onnx-community/silero-vad',
      { device: 'wasm' }
    );
    console.log('VAD model loaded successfully');
    isLoading = false;
    return true;
  } catch (error) {
    console.error('Failed to load VAD model:', error);
    isLoading = false;
    return false;
  }
};

export const analyzeAudioForSpeech = async (audioBlob: Blob): Promise<{
  hasSpeech: boolean;
  speechPercentage: number;
  avgConfidence: number;
}> => {
  try {
    // Convert blob to audio buffer
    const arrayBuffer = await audioBlob.arrayBuffer();
    const audioContext = new AudioContext({ sampleRate: 16000 });
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    
    // Get audio data
    const channelData = audioBuffer.getChannelData(0);
    
    // Analyze in chunks (each chunk ~0.5 seconds)
    const chunkSize = 8000; // 0.5s at 16kHz
    const chunks = Math.floor(channelData.length / chunkSize);
    
    let speechChunks = 0;
    let totalConfidence = 0;

    if (!vadPipeline) {
      // Fallback: simple energy-based detection
      return analyzeWithEnergyDetection(channelData);
    }

    for (let i = 0; i < chunks; i++) {
      const start = i * chunkSize;
      const chunk = channelData.slice(start, start + chunkSize);
      
      try {
        const result = await vadPipeline(chunk);
        
        if (Array.isArray(result) && result.length > 0) {
          const speechScore = result.find((r: any) => r.label === 'speech')?.score || 0;
          if (speechScore > 0.5) {
            speechChunks++;
          }
          totalConfidence += speechScore;
        }
      } catch (error) {
        console.warn('VAD chunk analysis error:', error);
      }
    }

    await audioContext.close();

    const speechPercentage = chunks > 0 ? (speechChunks / chunks) * 100 : 0;
    const avgConfidence = chunks > 0 ? totalConfidence / chunks : 0;
    
    // Consider it has speech if more than 10% of chunks contain speech
    const hasSpeech = speechPercentage > 10;

    return {
      hasSpeech,
      speechPercentage,
      avgConfidence,
    };
  } catch (error) {
    console.error('Error analyzing audio:', error);
    // On error, fall back to simple analysis
    return { hasSpeech: true, speechPercentage: 50, avgConfidence: 0.5 };
  }
};

// Fallback energy-based voice activity detection
const analyzeWithEnergyDetection = (audioData: Float32Array): {
  hasSpeech: boolean;
  speechPercentage: number;
  avgConfidence: number;
} => {
  const frameSize = 1600; // 100ms at 16kHz
  const frames = Math.floor(audioData.length / frameSize);
  
  let speechFrames = 0;
  const energyThreshold = 0.01; // Adjust based on typical ambient noise
  
  for (let i = 0; i < frames; i++) {
    const start = i * frameSize;
    const frame = audioData.slice(start, start + frameSize);
    
    // Calculate RMS energy
    let sumSquares = 0;
    for (let j = 0; j < frame.length; j++) {
      sumSquares += frame[j] * frame[j];
    }
    const rms = Math.sqrt(sumSquares / frame.length);
    
    // Check for zero-crossing rate (helps distinguish speech from noise)
    let zeroCrossings = 0;
    for (let j = 1; j < frame.length; j++) {
      if ((frame[j] >= 0 && frame[j - 1] < 0) || (frame[j] < 0 && frame[j - 1] >= 0)) {
        zeroCrossings++;
      }
    }
    const zcr = zeroCrossings / frame.length;
    
    // Speech typically has moderate ZCR (0.05-0.2) and higher energy
    if (rms > energyThreshold && zcr > 0.02 && zcr < 0.3) {
      speechFrames++;
    }
  }
  
  const speechPercentage = frames > 0 ? (speechFrames / frames) * 100 : 0;
  const hasSpeech = speechPercentage > 15;
  
  return {
    hasSpeech,
    speechPercentage,
    avgConfidence: hasSpeech ? 0.7 : 0.3,
  };
};

export const isVADReady = (): boolean => {
  return vadPipeline !== null;
};
