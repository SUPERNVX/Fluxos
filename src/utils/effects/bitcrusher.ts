import type { BitCrusherEffect } from '../../types/audio';

// Função para criar bitcrusher usando AudioWorklet
export const createBitCrusher = async (context: AudioContext, bits: number, sampleRateValue: number): Promise<BitCrusherEffect> => {
  try {
    // Create a properly formatted worklet code
    const workletCode = `
class BitCrusherProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      {
        name: 'bits',
        defaultValue: 8,
        minValue: 1,
        maxValue: 16
      },
      {
        name: 'sampleRate',
        defaultValue: 8000,
        minValue: 1000,
        maxValue: 44100
      }
    ];
  }

  constructor() {
    super();
    this.phase = 0;
    this.lastValue = 0;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const output = outputs[0];
    
    if (input.length === 0 || output.length === 0) {
      return true;
    }
    
    const bits = parameters.bits.length > 0 ? parameters.bits[0] : 8;
    const targetSampleRate = parameters.sampleRate.length > 0 ? parameters.sampleRate[0] : 8000;
    
    // Improved quantization algorithm for better bit crushing effect
    const quantizationLevels = Math.pow(2, Math.floor(Math.max(1, bits)));
    
    // Sample rate reduction calculation (using standard 44.1kHz as reference)
    const samplesPerUpdate = Math.max(1, Math.floor(44100 / targetSampleRate));

    for (let channel = 0; channel < Math.min(input.length, output.length); channel++) {
      const inputChannel = input[channel];
      const outputChannel = output[channel];
      
      for (let i = 0; i < inputChannel.length; i++) {
        this.phase++;
        
        if (this.phase >= samplesPerUpdate) {
          const inputSample = inputChannel[i];
          
          // Apply bit depth reduction with proper bitcrusher algorithm
          // Convert from [-1, 1] to [0, quantizationLevels-1] range, quantize, then back
          const normalized = (inputSample + 1) * 0.5; // Convert to [0, 1]
          const quantized = Math.floor(normalized * (quantizationLevels - 1)) / (quantizationLevels - 1);
          let quantizedValue = quantized * 2 - 1; // Convert back to [-1, 1]
          quantizedValue = Math.max(-1, Math.min(1, quantizedValue));
          
          this.lastValue = quantizedValue;
          this.phase = 0;
        }
        
        outputChannel[i] = this.lastValue;
      }
    }

    return true;
  }
}

registerProcessor('bit-crusher-processor', BitCrusherProcessor);
`;
      
    const workletBlob = new Blob([workletCode], { type: 'application/javascript' });
    const workletUrl = URL.createObjectURL(workletBlob);
    
    await context.audioWorklet.addModule(workletUrl);
    
    // Clean up the blob URL after successful loading
    URL.revokeObjectURL(workletUrl);
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