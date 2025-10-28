import type { BitCrusherEffect } from '../../types/audio';

// Função para criar bitcrusher usando AudioWorklet
export const createBitCrusher = async (context: AudioContext, bits: number, sampleRate: number): Promise<BitCrusherEffect> => {
  try {
    await context.audioWorklet.addModule(new URL('../../workers/bitCrusherWorklet.ts', import.meta.url));
  } catch (e) {
    console.error('Error loading bit crusher worklet', e);
    // Return a dummy effect if the worklet fails to load
    const dummyNode = context.createGain();
    return {
      input: dummyNode,
      output: dummyNode,
      updateBits: () => {},
      updateSampleRate: () => {},
    };
  }

  const bitCrusherNode = new AudioWorkletNode(context, 'bit-crusher-processor');

  const bitsParam = bitCrusherNode.parameters.get('bits');
  const sampleRateParam = bitCrusherNode.parameters.get('sampleRate');

  if (bitsParam) bitsParam.value = bits;
  if (sampleRateParam) sampleRateParam.value = sampleRate;

  return {
    input: bitCrusherNode,
    output: bitCrusherNode,
    updateBits: (b: number) => {
      if (bitsParam) bitsParam.setValueAtTime(b, context.currentTime);
    },
    updateSampleRate: (sr: number) => {
      if (sampleRateParam) sampleRateParam.setValueAtTime(sr, context.currentTime);
    },
  };
};