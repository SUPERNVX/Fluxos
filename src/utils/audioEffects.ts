// Utilitários para criação de efeitos de áudio
import type { FlangerEffect, PhaserEffect, TremoloEffect, WaveShaperEffect, BitCrusherEffect } from '../types/audio';

// Interface para efeitos de distorção
interface DistortionEffect {
  input: AudioNode;
  output: AudioNode;
  updateAmount: (amount: number) => void;
  toneFilter: BiquadFilterNode;
  levelGain: GainNode;
}

// Interface para efeito fuzz
interface FuzzEffect {
  input: AudioNode;
  output: AudioNode;
  updateAmount: (amount: number) => void;
  toneFilter: BiquadFilterNode;
  gateGain: GainNode;
  levelGain: GainNode;
}

// Função para criar um LFO (Low Frequency Oscillator) para modulação
export const createLFO = (context: AudioContext, frequency: number, shape: OscillatorType = 'sine'): OscillatorNode => {
  const lfo = context.createOscillator();
  lfo.type = shape;
  lfo.frequency.setValueAtTime(frequency, context.currentTime);
  return lfo;
};

// Função para criar um delay node customizado
export const createDelayEffect = (
  context: AudioContext,
  delayTime: number,
  feedback: number,
  wetLevel: number,
  pingPong: boolean = false
) => {
  const delayNode = context.createDelay(2.0);
  const feedbackGain = context.createGain();
  const wetGain = context.createGain();
  const dryGain = context.createGain();
  const outputGain = context.createGain();

  delayNode.delayTime.setValueAtTime(delayTime / 1000, context.currentTime);
  feedbackGain.gain.setValueAtTime(feedback / 100, context.currentTime);
  wetGain.gain.setValueAtTime(wetLevel / 100, context.currentTime);
  dryGain.gain.setValueAtTime(1 - wetLevel / 100, context.currentTime);

  // Conecta o feedback
  delayNode.connect(feedbackGain);
  feedbackGain.connect(delayNode);

  // Conecta wet/dry
  delayNode.connect(wetGain);
  wetGain.connect(outputGain);
  dryGain.connect(outputGain);

  if (pingPong) {
    // Para ping-pong, precisamos de dois delays alternando entre canais
    const leftDelay = context.createDelay(2.0);
    const rightDelay = context.createDelay(2.0);
    const splitter = context.createChannelSplitter(2);
    const merger = context.createChannelMerger(2);

    leftDelay.delayTime.setValueAtTime(delayTime / 1000, context.currentTime);
    rightDelay.delayTime.setValueAtTime(delayTime / 1000, context.currentTime);

    delayNode.connect(splitter);
    splitter.connect(leftDelay, 0);
    splitter.connect(rightDelay, 1);
    leftDelay.connect(merger, 0, 1); // Left to right
    rightDelay.connect(merger, 0, 0); // Right to left
    merger.connect(wetGain);
  }

  return {
    input: delayNode,
    output: outputGain,
    dry: dryGain,
    updateTime: (time: number) => delayNode.delayTime.setValueAtTime(time / 1000, context.currentTime),
    updateFeedback: (fb: number) => feedbackGain.gain.setValueAtTime(fb / 100, context.currentTime),
    updateWetLevel: (wet: number) => {
      wetGain.gain.setValueAtTime(wet / 100, context.currentTime);
      dryGain.gain.setValueAtTime(1 - wet / 100, context.currentTime);
    }
  };
};

// Função para criar flanger com interface consistente
export const createFlangerEffect = (
  context: AudioContext,
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

// Função para criar tremolo com interface consistente
export const createTremoloEffect = (
  context: AudioContext,
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

// Função para criar waveshaper (distorção) com interface consistente
export const createWaveShaper = (context: AudioContext, amount: number, type: 'overdrive' | 'distortion' | 'fuzz'): WaveShaperEffect => {
  const waveshaper = context.createWaveShaper();
  const inputGain = context.createGain();
  const outputGain = context.createGain();

  const makeDistortionCurve = (amount: number, samples: number = 44100) => {
    const curve = new Float32Array(samples);
    const deg = Math.PI / 180;
    
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      
      switch (type) {
        case 'overdrive':
          // Soft clipping para overdrive
          curve[i] = ((3 + amount) * x * 20 * deg) / (Math.PI + amount * Math.abs(x));
          break;
        case 'distortion':
          // Hard clipping para distortion
          curve[i] = Math.sign(x) * (1 - Math.exp(-Math.abs(x * amount)));
          break;
        case 'fuzz':
          // Extreme clipping para fuzz
          curve[i] = x > 0 ? 1 : -1;
          if (Math.abs(x) < amount / 100) curve[i] = x * (100 / amount);
          break;
        default:
          curve[i] = x;
      }
    }
    return curve;
  };

  waveshaper.curve = makeDistortionCurve(amount);
  waveshaper.oversample = '4x';

  inputGain.connect(waveshaper);
  waveshaper.connect(outputGain);

  return {
    input: inputGain,
    output: outputGain,
    updateAmount: (amt: number) => {
      waveshaper.curve = makeDistortionCurve(amt);
      inputGain.gain.setValueAtTime(1 + amt / 100, context.currentTime);
    }
  };
};

// Função para criar efeito de overdrive com todos os componentes necessários
export const createOverdriveEffect = (context: AudioContext, gain: number, tone: number, level: number): DistortionEffect => {
  const waveshaper = context.createWaveShaper();
  const inputGain = context.createGain();
  const toneFilter = context.createBiquadFilter();
  const levelGain = context.createGain();
  const outputGain = context.createGain();

  // Configuração inicial
  inputGain.gain.setValueAtTime(1 + gain / 100, context.currentTime);
  toneFilter.type = 'lowpass';
  toneFilter.frequency.setValueAtTime(1000 + (tone / 100) * 4000, context.currentTime);
  levelGain.gain.setValueAtTime(level / 100, context.currentTime);

  // Define a curva de distorção
  const makeDistortionCurve = (gainAmount: number, samples: number = 44100) => {
    const curve = new Float32Array(samples);
    const deg = Math.PI / 180;
    
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      // Soft clipping para overdrive
      curve[i] = ((3 + gainAmount) * x * 20 * deg) / (Math.PI + gainAmount * Math.abs(x));
    }
    return curve;
  };

  waveshaper.curve = makeDistortionCurve(gain);
  waveshaper.oversample = '4x';

  // Conecta os nós
  inputGain.connect(waveshaper);
  waveshaper.connect(toneFilter);
  toneFilter.connect(levelGain);
  levelGain.connect(outputGain);

  return {
    input: inputGain,
    output: outputGain,
    toneFilter,
    levelGain,
    updateAmount: (gainAmount: number) => {
      waveshaper.curve = makeDistortionCurve(gainAmount);
      inputGain.gain.setValueAtTime(1 + gainAmount / 100, context.currentTime);
    }
  };
};

// Função para criar efeito de distorção com todos os componentes necessários
export const createDistortionEffect = (context: AudioContext, amount: number, tone: number, level: number): DistortionEffect => {
  const waveshaper = context.createWaveShaper();
  const inputGain = context.createGain();
  const toneFilter = context.createBiquadFilter();
  const levelGain = context.createGain();
  const outputGain = context.createGain();

  // Configuração inicial
  inputGain.gain.setValueAtTime(1 + amount / 100, context.currentTime);
  toneFilter.type = 'lowpass';
  toneFilter.frequency.setValueAtTime(1000 + (tone / 100) * 4000, context.currentTime);
  levelGain.gain.setValueAtTime(level / 100, context.currentTime);

  // Define a curva de distorção
  const makeDistortionCurve = (distAmount: number, samples: number = 44100) => {
    const curve = new Float32Array(samples);
    
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      // Hard clipping para distortion
      curve[i] = Math.sign(x) * (1 - Math.exp(-Math.abs(x * distAmount)));
    }
    return curve;
  };

  waveshaper.curve = makeDistortionCurve(amount);
  waveshaper.oversample = '4x';

  // Conecta os nós
  inputGain.connect(waveshaper);
  waveshaper.connect(toneFilter);
  toneFilter.connect(levelGain);
  levelGain.connect(outputGain);

  return {
    input: inputGain,
    output: outputGain,
    toneFilter,
    levelGain,
    updateAmount: (distAmount: number) => {
      waveshaper.curve = makeDistortionCurve(distAmount);
      inputGain.gain.setValueAtTime(1 + distAmount / 100, context.currentTime);
    }
  };
};

// Função para criar efeito de fuzz com todos os componentes necessários
export const createFuzzEffect = (context: AudioContext, amount: number, tone: number, gate: number): FuzzEffect => {
  const waveshaper = context.createWaveShaper();
  const inputGain = context.createGain();
  const toneFilter = context.createBiquadFilter();
  const gateGain = context.createGain();
  const levelGain = context.createGain();
  const outputGain = context.createGain();

  // Configuração inicial
  inputGain.gain.setValueAtTime(1 + amount / 100, context.currentTime);
  toneFilter.type = 'lowpass';
  toneFilter.frequency.setValueAtTime(500 + (tone / 100) * 2000, context.currentTime);
  gateGain.gain.setValueAtTime(gate / 100, context.currentTime);
  levelGain.gain.setValueAtTime(0.3, context.currentTime); // Fuzz é naturalmente alto

  // Define a curva de distorção
  const makeFuzzCurve = (fuzzAmount: number, samples: number = 44100) => {
    const curve = new Float32Array(samples);
    
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      // Extreme clipping para fuzz
      curve[i] = x > 0 ? 1 : -1;
      if (Math.abs(x) < fuzzAmount / 100) curve[i] = x * (100 / fuzzAmount);
    }
    return curve;
  };

  waveshaper.curve = makeFuzzCurve(amount);
  waveshaper.oversample = '4x';

  // Conecta os nós
  inputGain.connect(waveshaper);
  waveshaper.connect(toneFilter);
  toneFilter.connect(gateGain);
  gateGain.connect(levelGain);
  levelGain.connect(outputGain);

  return {
    input: inputGain,
    output: outputGain,
    toneFilter,
    gateGain,
    levelGain,
    updateAmount: (fuzzAmount: number) => {
      waveshaper.curve = makeFuzzCurve(fuzzAmount);
      inputGain.gain.setValueAtTime(1 + fuzzAmount / 100, context.currentTime);
    }
  };
};

// Função para criar bitcrusher verdadeiro com redução de bits e taxa de amostragem
export const createBitCrusher = (context: AudioContext, bits: number, sampleRate: number): BitCrusherEffect => {
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