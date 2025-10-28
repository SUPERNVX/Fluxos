import type { BitCrusherEffect } from '../../types/audio';

// Função para criar bitcrusher usando AudioWorklet
export const createBitCrusher = async (context: AudioContext, bits: number, sampleRateValue: number): Promise<BitCrusherEffect> => {
  try {
    // Create a blob URL for the worklet code to ensure it works in deployed environments
    // Using JSON.stringify to properly escape the code
    const workletCode = 
      'class BitCrusherProcessor extends AudioWorkletProcessor {' +
      '  static get parameterDescriptors() {' +
      '    return [' +
      '      {' +
      '        name: "bits",' +
      '        defaultValue: 8,' +
      '        minValue: 1,' +
      '        maxValue: 16' +
      '      },' +
      '      {' +
      '        name: "sampleRate",' +
      '        defaultValue: 8000,' +
      '        minValue: 1000,' +
      '        maxValue: 44100' +
      '      }' +
      '    ];' +
      '  }' +
      '' +
      '  phase = 0;' +
      '  lastValue = 0;' +
      '' +
      '  constructor() {' +
      '    super();' +
      '  }' +
      '' +
      '  process(inputs, outputs, parameters) {' +
      '    const input = inputs[0];' +
      '    const output = outputs[0];' +
      '    ' +
      '    if (input.length === 0 || output.length === 0) {' +
      '      return true;' +
      '    }' +
      '    ' +
      '    const bits = parameters.bits.length > 0 ? parameters.bits[0] : 8;' +
      '    const targetSampleRate = parameters.sampleRate.length > 0 ? parameters.sampleRate[0] : 8000;' +
      '    ' +
      '    const quantizationSteps = Math.pow(2, Math.floor(Math.max(1, bits))) - 1;' +
      '    const samplesPerUpdate = Math.max(1, Math.floor(44100 / targetSampleRate));' +
      '' +
      '    for (let channel = 0; channel < Math.min(input.length, output.length); channel++) {' +
      '      const inputChannel = input[channel];' +
      '      const outputChannel = output[channel];' +
      '      ' +
      '      for (let i = 0; i < inputChannel.length; i++) {' +
      '        this.phase++;' +
      '        ' +
      '        if (this.phase >= samplesPerUpdate) {' +
      '          const inputSample = inputChannel[i];' +
      '          let quantizedValue = Math.round(inputSample * quantizationSteps) / quantizationSteps;' +
      '          quantizedValue = Math.max(-1, Math.min(1, quantizedValue));' +
      '          this.lastValue = quantizedValue;' +
      '          this.phase = 0;' +
      '        }' +
      '        ' +
      '        outputChannel[i] = this.lastValue;' +
      '      }' +
      '    }' +
      '' +
      '    return true;' +
      '  }' +
      '}' +
      '' +
      'registerProcessor("bit-crusher-processor", BitCrusherProcessor);';
      
    const workletBlob = new Blob([workletCode], { type: 'application/javascript' });
    const workletUrl = URL.createObjectURL(workletBlob);
    
    await context.audioWorklet.addModule(workletUrl);
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