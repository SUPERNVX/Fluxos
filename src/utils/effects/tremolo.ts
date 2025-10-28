import type { TremoloEffect } from '../../types/audio';
import { createLFO } from './lfo';

// Função para criar tremolo com interface consistente
export const createTremoloEffect = (
  context: AudioContext | OfflineAudioContext,
  rate: number,
  depth: number,
  shape: OscillatorType
): TremoloEffect => {
  const lfo = createLFO(context, rate, shape);
  const lfoGain = context.createGain();
  const depthGain = context.createGain();
  const outputGain = context.createGain();

  // Configurações
  lfoGain.gain.setValueAtTime(depth / 200, context.currentTime); // Divide por 200 para range 0-0.5
  depthGain.gain.setValueAtTime(1 - depth / 200, context.currentTime); // Offset para evitar silêncio total

  // Conecta LFO
  lfo.connect(lfoGain);
  lfoGain.connect(outputGain.gain);
  lfo.start();

  return {
    input: outputGain,
    output: outputGain,
    lfo,
    updateRate: (r: number) => lfo.frequency.setValueAtTime(r, context.currentTime),
    updateDepth: (d: number) => {
      lfoGain.gain.setValueAtTime(d / 200, context.currentTime);
      depthGain.gain.setValueAtTime(1 - d / 200, context.currentTime);
    },
    updateShape: (s: OscillatorType) => {
      lfo.type = s;
    }
  };
};