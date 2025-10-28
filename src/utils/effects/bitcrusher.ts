import type { BitCrusherEffect } from '../../types/audio';

// Função para criar bitcrusher verdadeiro com redução de bits e taxa de amostragem
export const createBitCrusher = (context: AudioContext | OfflineAudioContext, bits: number, sampleRate: number): BitCrusherEffect => {
  // Nó de entrada
  const inputGain = context.createGain();
  
  // Nó para controlar a taxa de amostragem
  const processor = context.createScriptProcessor(4096, 2, 2);
  
  // Nó para controlar a resolução de bits
  const waveshaper = context.createWaveShaper();
  
  // Nó de saída
  const outputGain = context.createGain();
  
  // Parâmetros
  let currentBits = bits;
  let currentSampleRate = sampleRate;
  let counter = 0;
  let lastValues = [0, 0]; // Para os dois canais (estéreo)

  // Função para criar a curva de bitcrushing
  const createBitcrushCurve = (bits: number, samples: number = 44100) => {
    const curve = new Float32Array(samples);
    const step = Math.pow(2, bits) - 1; // Número de passos baseado nos bits

    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1; 
      // Redução de resolução de bits
      curve[i] = Math.round(x * step) / step;
    }
    return curve;
  };

  // Atualiza o efeito
  const updateEffect = () => {
    waveshaper.curve = createBitcrushCurve(currentBits);
  };

  // Configura o ScriptProcessor para reduzir a taxa de amostragem
  processor.onaudioprocess = (audioProcessingEvent) => {
    const inputData = audioProcessingEvent.inputBuffer;
    const outputData = audioProcessingEvent.outputBuffer;

    // Processa cada canal
    for (let channel = 0; channel < outputData.numberOfChannels; channel++) {
      const inputDataChannel = inputData.getChannelData(channel);
      const outputDataChannel = outputData.getChannelData(channel);

      for (let i = 0; i < outputData.length; i++) {
        counter++;
        
        // Aplica redução de taxa de amostragem
        if (counter >= context.sampleRate / currentSampleRate) {
          lastValues[channel] = inputDataChannel[i];
          counter = 0;
        }
        
        // Aplica ao output
        outputDataChannel[i] = lastValues[channel];
      }
    }
  };

  // Conecta os nós
  inputGain.connect(processor);
  processor.connect(waveshaper);
  waveshaper.connect(outputGain);

  // Inicializa
  updateEffect();

  return {
    input: inputGain,
    output: outputGain,
    updateBits: (b: number) => {
      currentBits = b;
      updateEffect();
    },
    updateSampleRate: (sr: number) => {
      currentSampleRate = sr;
    }
  };
};