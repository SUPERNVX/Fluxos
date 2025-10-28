import type { BitCrusherEffect } from '../../types/audio';

// Função para criar bitcrusher usando AudioWorklet
export const createBitCrusher = async (context: AudioContext, bits: number, sampleRateValue: number): Promise<BitCrusherEffect> => {
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

  // Set initial values - clamp to valid ranges
  if (bitsParam) bitsParam.value = Math.max(1, Math.min(16, bits));
  if (sampleRateParam) sampleRateParam.value = Math.max(1000, Math.min(44100, sampleRateValue));

  return {
    input: bitCrusherNode,
    output: bitCrusherNode,
    updateBits: (b: number) => {
      if (bitsParam) {
        const clampedBits = Math.max(1, Math.min(16, b));
        bitsParam.setValueAtTime(clampedBits, context.currentTime);
      }
    },
    updateSampleRate: (sr: number) => {
      if (sampleRateParam) {
        const clampedSampleRate = Math.max(1000, Math.min(44100, sr));
        sampleRateParam.setValueAtTime(clampedSampleRate, context.currentTime);
      }
    },
  };
};