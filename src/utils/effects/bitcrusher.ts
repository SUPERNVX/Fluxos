import type { BitCrusherEffect } from '../../types/audio';

// Inlined AudioWorklet processor code as a string - using proper algorithm
const bitCrusherWorkletCode = `
class BitCrusherProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      {
        name: 'bits',
        defaultValue: 8,
        minValue: 1,
        maxValue: 16,
      },
      {
        name: 'sampleRate',
        defaultValue: 8000,
        minValue: 1000,
        maxValue: 44100,
      },
    ];
  }

  // State variables to maintain between process calls
  phase = 0;
  lastValue = 0;

  constructor() {
    super();
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const output = outputs[0];
    
    if (input.length === 0 || output.length === 0) {
      return true; // No input or output channels
    }
    
    // Get current parameter values
    const bits = parameters.bits.length > 0 ? parameters.bits[0] : 8;
    const targetSampleRate = parameters.sampleRate.length > 0 ? parameters.sampleRate[0] : 8000;
    
    // Calculate quantization steps based on bits
    const quantizationSteps = Math.pow(2, Math.max(1, Math.floor(bits))) - 1;
    
    // Calculate sample rate reduction factor
    const samplesPerUpdate = Math.max(1, Math.floor(44100 / targetSampleRate));

    for (let channel = 0; channel < Math.min(input.length, output.length); channel++) {
      const inputChannel = input[channel];
      const outputChannel = output[channel];
      
      for (let i = 0; i < inputChannel.length; i++) {
        // Increment sample counter
        this.phase++;
        
        // Determine if we should sample a new value (for sample rate reduction)
        if (this.phase >= samplesPerUpdate) {
          // Get the input sample
          const inputSample = inputChannel[i];
          
          // Apply bit depth reduction using proper quantization
          // Calculate the step size based on bits (similar to original WaveShaper approach)
          const step = Math.pow(0.5, bits);
          // Quantize the input sample using floor function (original approach)
          let quantizedValue = step * Math.floor(inputSample / step + 0.5);
          // Clamp the result to [-1, 1] range
          quantizedValue = Math.max(-1, Math.min(1, quantizedValue));
          
          // Store this as our last value to be used until next update
          this.lastValue = quantizedValue;
          
          // Reset counter for next sample interval
          this.phase = 0;
        }
        
        // Output the stored value (this creates the sample rate reduction)
        outputChannel[i] = this.lastValue;
      }
    }

    // Keep the processor alive
    return true;
  }
}

registerProcessor('bit-crusher-processor', BitCrusherProcessor);
`;

// Função para criar bitcrusher usando AudioWorklet
export const createBitCrusher = async (context: AudioContext, bits: number, sampleRateValue: number): Promise<BitCrusherEffect> => {
  try {
    // Create a blob URL for the worklet code to ensure it works in deployed environments
    const workletBlob = new Blob([bitCrusherWorkletCode], { type: 'application/javascript' });
    const workletUrl = URL.createObjectURL(workletBlob);
    
    await context.audioWorklet.addModule(workletUrl);
    
    // Clean up the blob URL after use
    // Note: We can't revoke it immediately as it's used by the AudioWorkletNode
    // So we'll return a cleanup function or rely on garbage collection
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