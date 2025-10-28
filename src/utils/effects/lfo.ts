// Função para criar um LFO (Low Frequency Oscillator) para modulação
export const createLFO = (context: AudioContext | OfflineAudioContext, frequency: number, shape: OscillatorType = 'sine'): OscillatorNode => {
  const lfo = context.createOscillator();
  lfo.type = shape;
  lfo.frequency.setValueAtTime(frequency, context.currentTime);
  return lfo;
};