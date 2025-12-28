import { useAppStore } from '@/store/appStore';

// Verifica se o som está habilitado antes de reproduzir
const canPlaySound = (): boolean => {
  return useAppStore.getState().soundEnabled;
};

// Vibração para feedback tátil (funciona mesmo no modo silencioso)
export const vibrate = (pattern: number | number[]) => {
  try {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  } catch (e) {
    console.log('Vibration not available:', e);
  }
};

// Som de confirmação para gravação
export const playConfirmationSound = (type: 'start' | 'stop') => {
  // Vibração sempre funciona (respeita config do dispositivo)
  if (type === 'start') {
    vibrate(100);
  } else {
    vibrate([100, 50, 100]);
  }
  
  // Som só toca se habilitado
  if (!canPlaySound()) return;
  
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    if (type === 'start') {
      oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(880, audioContext.currentTime + 0.1);
    } else {
      oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(440, audioContext.currentTime + 0.1);
    }
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.2);
  } catch (e) {
    console.log('Audio feedback not available:', e);
  }
};

// Som de ativação do modo de escuta
export const playActivationSound = () => {
  vibrate([50, 30, 50, 30, 50]);
  
  if (!canPlaySound()) return;
  
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.setValueAtTime(523, audioContext.currentTime);
    oscillator.frequency.setValueAtTime(659, audioContext.currentTime + 0.08);
    oscillator.frequency.setValueAtTime(784, audioContext.currentTime + 0.16);
    gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.24);
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.24);
  } catch (e) {
    console.log('Audio feedback not available:', e);
  }
};

// Bipe de contagem regressiva para pânico
export const playCountdownBeep = (secondsRemaining: number, countdownTotal: number = 5) => {
  vibrate(150);
  
  if (!canPlaySound()) return;
  
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Tom mais agudo conforme o tempo diminui
    const baseFreq = 600 + (countdownTotal - secondsRemaining) * 100;
    oscillator.frequency.setValueAtTime(baseFreq, audioContext.currentTime);
    gainNode.gain.setValueAtTime(0.4, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  } catch (e) {
    console.log('Audio feedback not available:', e);
  }
};

// Som de pânico confirmado (mais urgente)
export const playPanicConfirmedSound = () => {
  vibrate([200, 100, 200, 100, 200, 100, 200]);
  
  if (!canPlaySound()) return;
  
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Som de sirene
    oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
    oscillator.frequency.setValueAtTime(660, audioContext.currentTime + 0.2);
    oscillator.frequency.setValueAtTime(880, audioContext.currentTime + 0.4);
    oscillator.frequency.setValueAtTime(660, audioContext.currentTime + 0.6);
    gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.8);
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.8);
  } catch (e) {
    console.log('Audio feedback not available:', e);
  }
};

// Som de cancelamento (alívio)
export const playCancelSound = () => {
  vibrate([50, 50, 50]);
  
  if (!canPlaySound()) return;
  
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Tom descendente (alívio)
    oscillator.frequency.setValueAtTime(784, audioContext.currentTime);
    oscillator.frequency.setValueAtTime(523, audioContext.currentTime + 0.15);
    oscillator.frequency.setValueAtTime(392, audioContext.currentTime + 0.3);
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.4);
  } catch (e) {
    console.log('Audio feedback not available:', e);
  }
};
