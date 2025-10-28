/// <reference types="@types/audioworklet" />

class BitCrusherProcessor extends AudioWorkletProcessor {
  phase: number;
  lastSampleValue: number;

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

  constructor() {
    super();
    this.phase = 0;
    this.lastSampleValue = 0;
  }

  process(inputs: Float32Array[][], outputs: Float32Array[][], parameters: Record<string, Float32Array>): boolean {
    const input = inputs[0];
    const output = outputs[0];
    const bits = parameters.bits[0];
    const sampleRateReduction = parameters.sampleRate[0];

    const step = Math.pow(0.5, bits);
    let lastSample = 0;

    for (let channel = 0; channel < output.length; channel++) {
      const inputChannel = input[channel];
      const outputChannel = output[channel];
      let phase = 0;

      for (let i = 0; i < outputChannel.length; i++) {
        phase++;
        if (phase >= sampleRateReduction) {
          phase = 0;
          lastSample = step * Math.floor(inputChannel[i] / step + 0.5);
        }
        outputChannel[i] = lastSample;
      }
    }

    return true;
  }
}

registerProcessor('bit-crusher-processor', BitCrusherProcessor);