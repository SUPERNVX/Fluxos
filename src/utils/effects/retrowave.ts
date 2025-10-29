// Efeito Retrowave/Synthwave - Combinação de elementos clássicos dos anos 80

export interface RetrowaveEffect {
  input: AudioNode;
  output: AudioNode;
  updateSynthesis: (value: number) => void;
  updateGlow: (value: number) => void;
  updateChorus: (value: number) => void;
}

export const createRetrowaveEffect = (
  context: AudioContext | OfflineAudioContext,
  synthesis: number = 50,  // Síntese analog warmth (0-100)
  glow: number = 30,       // Saturação e brilho (0-100)
  chorus: number = 40      // Profundidade do chorus (0-100)
): RetrowaveEffect => {
  
  // === ANALOG SYNTHESIS WARMTH ===
  const inputGain = context.createGain();
  const analogWarmth = context.createWaveShaper();
  
  // Curva de saturação analógica suave
  const createAnalogCurve = (amount: number) => {
    const samples = 44100;
    const curve = new Float32Array(samples);
    const warmthFactor = amount / 100;
    
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      
      // Saturação de tubo vintage
      const drive = 1 + warmthFactor * 2;
      let warmed = Math.tanh(x * drive) * (1 + warmthFactor * 0.3);
      
      // Adiciona harmônicos de segunda ordem (característica dos sintetizadores analógicos)
      warmed += Math.sin(x * Math.PI) * warmthFactor * 0.1;
      
      curve[i] = Math.max(-1, Math.min(1, warmed));
    }
    return curve;
  };
  
  analogWarmth.curve = createAnalogCurve(synthesis);
  analogWarmth.oversample = '2x';

  // === NEON GLOW (Saturação + Exciter) ===
  const glowFilter = context.createBiquadFilter();
  glowFilter.type = 'highshelf';
  glowFilter.frequency.value = 3000; // Realça os agudos para "brilho neon"
  glowFilter.gain.value = glow / 100 * 8; // 0-8dB boost
  
  const glowSaturator = context.createWaveShaper();
  
  const createGlowCurve = (intensity: number) => {
    const samples = 44100;
    const curve = new Float32Array(samples);
    const glowFactor = intensity / 100;
    
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      
      // Saturação suave que adiciona "brilho"
      let glowed = x * (1 + glowFactor * 0.5);
      glowed = Math.tanh(glowed * (1 + glowFactor)) * 0.8;
      
      // Adiciona harmônicos para efeito "neon"
      if (Math.abs(x) > 0.3) {
        glowed += Math.sin(x * Math.PI * 3) * glowFactor * 0.05;
      }
      
      curve[i] = Math.max(-1, Math.min(1, glowed));
    }
    return curve;
  };
  
  glowSaturator.curve = createGlowCurve(glow);

  // === VINTAGE CHORUS ===
  const chorusDelay1 = context.createDelay(0.1);
  const chorusDelay2 = context.createDelay(0.1);
  const chorusLFO1 = context.createOscillator();
  const chorusLFO2 = context.createOscillator();
  const chorusGain1 = context.createGain();
  const chorusGain2 = context.createGain();
  const dryGain = context.createGain();
  const wetGain = context.createGain();
  const chorusOutput = context.createGain();
  
  // LFOs para modulação do chorus (frequências ligeiramente diferentes para efeito mais rico)
  chorusLFO1.frequency.value = 0.3; // 0.3 Hz
  chorusLFO2.frequency.value = 0.47; // 0.47 Hz (slightly detuned)
  chorusLFO1.type = 'sine';
  chorusLFO2.type = 'triangle';
  
  // Ganhos para controlar profundidade da modulação
  chorusGain1.gain.value = 0.002; // 2ms de variação máxima
  chorusGain2.gain.value = 0.003; // 3ms de variação máxima
  
  // Delays base (típico de chorus vintage)
  chorusDelay1.delayTime.value = 0.015; // 15ms
  chorusDelay2.delayTime.value = 0.025; // 25ms
  
  // Conecta LFOs aos delays
  chorusLFO1.connect(chorusGain1);
  chorusLFO2.connect(chorusGain2);
  chorusGain1.connect(chorusDelay1.delayTime);
  chorusGain2.connect(chorusDelay2.delayTime);
  
  // Mix do chorus
  const updateChorusMix = (depth: number) => {
    const wetLevel = depth / 100 * 0.4; // Máximo 40% wet
    wetGain.gain.value = wetLevel;
    dryGain.gain.value = 1 - wetLevel * 0.5; // Não corta muito o dry
  };
  
  updateChorusMix(chorus);

  // === OUTPUT FILTER (Vintage synth character) ===
  const outputFilter = context.createBiquadFilter();
  outputFilter.type = 'lowpass';
  outputFilter.frequency.value = 12000; // Suaviza digitais harsh
  outputFilter.Q.value = 0.7; // Slight resonance
  
  const outputGain = context.createGain();
  outputGain.gain.value = 0.8; // Compensação de ganho

  // === CONEXÕES ===
  inputGain.connect(analogWarmth);
  analogWarmth.connect(glowFilter);
  glowFilter.connect(glowSaturator);
  
  // Chorus path
  glowSaturator.connect(chorusDelay1);
  glowSaturator.connect(chorusDelay2);
  glowSaturator.connect(dryGain);
  
  chorusDelay1.connect(wetGain);
  chorusDelay2.connect(wetGain);
  
  dryGain.connect(chorusOutput);
  wetGain.connect(chorusOutput);
  
  chorusOutput.connect(outputFilter);
  outputFilter.connect(outputGain);

  // Inicia os LFOs
  chorusLFO1.start();
  chorusLFO2.start();

  return {
    input: inputGain,
    output: outputGain,
    updateSynthesis: (value: number) => {
      analogWarmth.curve = createAnalogCurve(value);
    },
    updateGlow: (value: number) => {
      glowFilter.gain.value = value / 100 * 8;
      glowSaturator.curve = createGlowCurve(value);
    },
    updateChorus: (value: number) => {
      updateChorusMix(value);
    }
  };
};