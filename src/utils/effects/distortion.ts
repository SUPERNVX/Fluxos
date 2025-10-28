import type { DistortionEffect } from '../../types/audio';

// Função para criar efeito de distorção com todos os componentes necessários
export const createDistortionEffect = (context: AudioContext | OfflineAudioContext, amount: number, tone: number, level: number): DistortionEffect => {
  const waveshaper = context.createWaveShaper();
  const inputGain = context.createGain();
  const toneFilter = context.createBiquadFilter();
  const levelGain = context.createGain();
  const outputGain = context.createGain();

  // Configuração inicial
  inputGain.gain.setValueAtTime(1 + amount / 100, context.currentTime);
  toneFilter.type = 'lowpass';
  toneFilter.frequency.setValueAtTime(1000 + (tone / 100) * 4000, context.currentTime);
  levelGain.gain.setValueAtTime(level / 100, context.currentTime);

  // Define a curva de distorção
  const makeDistortionCurve = (distAmount: number, samples: number = 44100) => {
    const curve = new Float32Array(samples);
    
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      // Hard clipping para distortion
      curve[i] = Math.sign(x) * (1 - Math.exp(-Math.abs(x * distAmount)));
    }
    return curve;
  };

  waveshaper.curve = makeDistortionCurve(amount);
  waveshaper.oversample = '4x';

  // Conecta os nós
  inputGain.connect(waveshaper);
  waveshaper.connect(toneFilter);
  toneFilter.connect(levelGain);
  levelGain.connect(outputGain);

  return {
    input: inputGain,
    output: outputGain,
    toneFilter,
    levelGain,
    updateAmount: (distAmount: number) => {
      waveshaper.curve = makeDistortionCurve(distAmount);
      inputGain.gain.setValueAtTime(1 + distAmount / 100, context.currentTime);
    }
  };
};