// Função para criar o efeito de muffle (som abafado)
export const createMuffleEffect = (context: AudioContext, intensity: number) => {
  const muffleFilter = context.createBiquadFilter();
  muffleFilter.type = 'lowpass';

  // A intensidade (0-100) controla a frequência de corte.
  // A curva foi ajustada para ser mais perceptível.
  const maxFreq = 12000; // Começa a cortar mais cedo
  const minFreq = 400;   // Corte final mais profundo
  const frequency = maxFreq - (intensity / 100) * (maxFreq - minFreq);
  
  muffleFilter.frequency.setValueAtTime(frequency, context.currentTime);
  muffleFilter.Q.setValueAtTime(1.2, context.currentTime); // Q levemente aumentado para um som mais característico

  return muffleFilter;
};