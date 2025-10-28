import type { FlangerEffect } from '../../types/audio';
import { createLFO } from './lfo';

// Função para criar flanger com interface consistente
export const createFlangerEffect = (
  context: AudioContext | OfflineAudioContext,
  rate: number,
  depth: number,
  feedback: number,
  delayTime: number
): FlangerEffect => {
  const delayNode = context.createDelay(0.02);
  const lfo = createLFO(context, rate);
  const lfoGain = context.createGain();
  const feedbackGain = context.createGain();
  const wetGain = context.createGain();
  const dryGain = context.createGain();
  const outputGain = context.createGain();

  // Configurações para flanger (delay mais curto que chorus)
  delayNode.delayTime.setValueAtTime(delayTime / 1000, context.currentTime);
  lfoGain.gain.setValueAtTime((depth / 100) * (delayTime / 1000), context.currentTime);
  feedbackGain.gain.setValueAtTime(feedback / 100, context.currentTime);
  wetGain.gain.setValueAtTime(0.5, context.currentTime);
  dryGain.gain.setValueAtTime(0.5, context.currentTime);

  // Conecta LFO
  lfo.connect(lfoGain);
  lfoGain.connect(delayNode.delayTime);
  lfo.start();

  // Conecta feedback (mais intenso que chorus)
  delayNode.connect(feedbackGain);
  feedbackGain.connect(delayNode);

  // Conecta wet/dry
  delayNode.connect(wetGain);
  wetGain.connect(outputGain);
  dryGain.connect(outputGain);

  return {
    input: delayNode,
    output: outputGain,
    dry: dryGain,
    lfo,
    updateRate: (r: number) => lfo.frequency.setValueAtTime(r, context.currentTime),
    updateDepth: (d: number) => lfoGain.gain.setValueAtTime((d / 100) * (delayTime / 1000), context.currentTime),
    updateFeedback: (fb: number) => feedbackGain.gain.setValueAtTime(fb / 100, context.currentTime)
  };
};