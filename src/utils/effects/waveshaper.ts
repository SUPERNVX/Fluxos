import type { WaveShaperEffect } from '../../types/audio';

// Função para criar waveshaper (distorção) com interface consistente
export const createWaveShaper = (context: AudioContext, amount: number, type: 'overdrive' | 'distortion' | 'fuzz'): WaveShaperEffect => {
  const waveshaper = context.createWaveShaper();
  const inputGain = context.createGain();
  const outputGain = context.createGain();

  const makeDistortionCurve = (amount: number, samples: number = 44100) => {
    const curve = new Float32Array(samples);
    const deg = Math.PI / 180;
    
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      
      switch (type) {
        case 'overdrive':
          // Soft clipping para overdrive
          curve[i] = ((3 + amount) * x * 20 * deg) / (Math.PI + amount * Math.abs(x));
          break;
        case 'distortion':
          // Hard clipping para distortion
          curve[i] = Math.sign(x) * (1 - Math.exp(-Math.abs(x * amount)));
          break;
        case 'fuzz':
          // Extreme clipping para fuzz
          curve[i] = x > 0 ? 1 : -1;
          if (Math.abs(x) < amount / 100) curve[i] = x * (100 / amount);
          break;
        default:
          curve[i] = x;
      }
    }
    return curve;
  };

  waveshaper.curve = makeDistortionCurve(amount);
  waveshaper.oversample = '4x';

  inputGain.connect(waveshaper);
  waveshaper.connect(outputGain);

  return {
    input: inputGain,
    output: outputGain,
    updateAmount: (amt: number) => {
      waveshaper.curve = makeDistortionCurve(amt);
      inputGain.gain.setValueAtTime(1 + amt / 100, context.currentTime);
    }
  };
};