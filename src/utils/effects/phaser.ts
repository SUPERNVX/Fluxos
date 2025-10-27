import type { PhaserEffect } from '../../types/audio';
import { createLFO } from './lfo';

// Função para criar phaser com interface consistente
export const createPhaserEffect = (
  context: AudioContext,
  rate: number,
  depth: number,
  stages: number,
  feedback: number
): PhaserEffect => {
  const lfo = createLFO(context, rate);
  const lfoGain = context.createGain();
  const feedbackGain = context.createGain();
  const wetGain = context.createGain();
  const dryGain = context.createGain();
  const outputGain = context.createGain();

  // Cria filtros all-pass em série
  const allPassFilters: BiquadFilterNode[] = [];
  for (let i = 0; i < stages; i++) {
    const filter = context.createBiquadFilter();
    filter.type = 'allpass';
    filter.frequency.setValueAtTime(1000 + i * 200, context.currentTime);
    filter.Q.setValueAtTime(1, context.currentTime);
    allPassFilters.push(filter);
  }

  // Conecta filtros em série
  for (let i = 0; i < allPassFilters.length - 1; i++) {
    allPassFilters[i].connect(allPassFilters[i + 1]);
  }

  // Configurações do LFO
  lfoGain.gain.setValueAtTime(depth * 10, context.currentTime);
  lfo.connect(lfoGain);
  lfo.start();

  // Conecta LFO aos filtros
  allPassFilters.forEach(filter => {
    lfoGain.connect(filter.frequency);
  });

  // Conecta feedback
  const lastFilter = allPassFilters[allPassFilters.length - 1];
  lastFilter.connect(feedbackGain);
  feedbackGain.gain.setValueAtTime(feedback / 100, context.currentTime);
  feedbackGain.connect(allPassFilters[0]);

  // Conecta wet/dry
  lastFilter.connect(wetGain);
  wetGain.gain.setValueAtTime(0.5, context.currentTime);
  dryGain.gain.setValueAtTime(0.5, context.currentTime);
  wetGain.connect(outputGain);
  dryGain.connect(outputGain);

  return {
    input: allPassFilters[0],
    output: outputGain,
    dry: dryGain,
    lfo,
    filters: allPassFilters,
    updateRate: (r: number) => lfo.frequency.setValueAtTime(r, context.currentTime),
    updateDepth: (d: number) => lfoGain.gain.setValueAtTime(d * 10, context.currentTime),
    updateFeedback: (fb: number) => feedbackGain.gain.setValueAtTime(fb / 100, context.currentTime)
  };
};