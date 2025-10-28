import type { FuzzEffect } from '../../types/audio';

// Função para criar efeito de fuzz com todos os componentes necessários
export const createFuzzEffect = (context: AudioContext | OfflineAudioContext, amount: number, tone: number, gate: number): FuzzEffect => {
  const waveshaper = context.createWaveShaper();
  const inputGain = context.createGain();
  const toneFilter = context.createBiquadFilter();
  const gateGain = context.createGain();
  const levelGain = context.createGain();
  const outputGain = context.createGain();

  // Configuração inicial
  inputGain.gain.setValueAtTime(1 + amount / 100, context.currentTime);
  toneFilter.type = 'lowpass';
  toneFilter.frequency.setValueAtTime(500 + (tone / 100) * 2000, context.currentTime);
  gateGain.gain.setValueAtTime(gate / 100, context.currentTime);
  levelGain.gain.setValueAtTime(0.3, context.currentTime); // Fuzz é naturalmente alto

  // Define a curva de distorção fuzz musical
  const makeFuzzCurve = (fuzzAmount: number, samples: number = 44100) => {
    const curve = new Float32Array(samples);
    const fuzzFactor = fuzzAmount / 100;
    
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      
      // Algoritmo de fuzz musical inspirado em pedais clássicos
      let output;
      
      if (fuzzFactor < 0.1) {
        // Pouco fuzz - soft saturation
        output = x * (1 + fuzzFactor * 2);
        output = Math.tanh(output) * 0.7;
      } else if (fuzzFactor < 0.5) {
        // Fuzz médio - asymmetric clipping
        const drive = 1 + fuzzFactor * 8;
        output = x * drive;
        
        // Asymmetric clipping para harmonics mais interessantes
        if (output > 0) {
          output = Math.tanh(output * 1.2) * 0.8;
        } else {
          output = Math.tanh(output * 0.8) * 0.9;
        }
      } else {
        // Fuzz intenso - squared wave style com suavização
        const drive = 1 + fuzzFactor * 15;
        output = x * drive;
        
        // Fuzz quadrático com limitação suave
        const sign = output >= 0 ? 1 : -1;
        const absOutput = Math.abs(output);
        
        if (absOutput < 0.3) {
          output = output * (1 + fuzzFactor);
        } else if (absOutput < 0.7) {
          output = sign * (0.3 + (absOutput - 0.3) * 2 * fuzzFactor);
        } else {
          // Soft limiting para evitar clipping extremo
          output = sign * Math.tanh(absOutput * 0.8) * 0.85;
        }
      }
      
      // Garante que o output está dentro dos limites [-1, 1]
      curve[i] = Math.max(-1, Math.min(1, output));
    }
    return curve;
  };

  waveshaper.curve = makeFuzzCurve(amount);
  waveshaper.oversample = '4x';

  // Conecta os nós
  inputGain.connect(waveshaper);
  waveshaper.connect(toneFilter);
  toneFilter.connect(gateGain);
  gateGain.connect(levelGain);
  levelGain.connect(outputGain);

  return {
    input: inputGain,
    output: outputGain,
    toneFilter,
    gateGain,
    levelGain,
    updateAmount: (fuzzAmount: number) => {
      waveshaper.curve = makeFuzzCurve(fuzzAmount);
      inputGain.gain.setValueAtTime(1 + fuzzAmount / 100, context.currentTime);
    }
  };
};