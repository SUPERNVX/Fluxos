import type { DistortionEffect } from '../../types/audio';

// Função para criar efeito de overdrive com todos os componentes necessários
export const createOverdriveEffect = (context: AudioContext | OfflineAudioContext, gain: number, tone: number, level: number): DistortionEffect => {
  const waveshaper = context.createWaveShaper();
  const inputGain = context.createGain();
  const toneFilter = context.createBiquadFilter();
  const levelGain = context.createGain();
  const outputGain = context.createGain();

  // Configuração inicial
  inputGain.gain.setValueAtTime(1 + gain / 100, context.currentTime);
  toneFilter.type = 'lowpass';
  toneFilter.frequency.setValueAtTime(1000 + (tone / 100) * 4000, context.currentTime);
  levelGain.gain.setValueAtTime(level / 100, context.currentTime);

  // Define a curva de distorção
  const makeDistortionCurve = (gainAmount: number, samples: number = 44100) => {
    const curve = new Float32Array(samples);
    const deg = Math.PI / 180;
    
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      // Soft clipping para overdrive
      curve[i] = ((3 + gainAmount) * x * 20 * deg) / (Math.PI + gainAmount * Math.abs(x));
    }
    return curve;
  };

  waveshaper.curve = makeDistortionCurve(gain);
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
    updateAmount: (gainAmount: number) => {
      waveshaper.curve = makeDistortionCurve(gainAmount);
      inputGain.gain.setValueAtTime(1 + gainAmount / 100, context.currentTime);
    }
  };
};