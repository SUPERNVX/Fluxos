import type { FuzzEffect } from '../../types/audio';

// Função para criar efeito de fuzz com todos os componentes necessários
export const createFuzzEffect = (context: AudioContext, amount: number, tone: number, gate: number): FuzzEffect => {
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

  // Define a curva de distorção
  const makeFuzzCurve = (fuzzAmount: number, samples: number = 44100) => {
    const curve = new Float32Array(samples);
    
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      // Extreme clipping para fuzz
      curve[i] = x > 0 ? 1 : -1;
      if (Math.abs(x) < fuzzAmount / 100) curve[i] = x * (100 / fuzzAmount);
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