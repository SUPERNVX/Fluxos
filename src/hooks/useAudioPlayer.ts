import { useState, useEffect, useCallback, useRef, useReducer } from 'react';
import { 
  AUDIO_CONFIG, 
  DEFAULT_SURROUND_POSITIONS, 
  DEFAULT_MODULATION, 
  DEFAULT_DISTORTION, 
  DEFAULT_SPATIAL_AUDIO 
} from '../constants/audioConfig';
import { bufferToWav } from '../utils/audioHelpers';
import { audioReducer } from '../reducers/audioReducer';
import {
  createFlangerEffect,
  createPhaserEffect,
  createTremoloEffect,
  createWaveShaper,
  createBitCrusher
} from '../utils/audioEffects';

export const useAudioPlayer = (audioFile: File | null) => {
  const [state, dispatch] = useReducer(audioReducer, {
    isPlaying: false,
    progress: 0,
    currentTime: 0,
    duration: 0,
    speed: AUDIO_CONFIG.DEFAULT_SPEED,
    reverb: AUDIO_CONFIG.DEFAULT_REVERB,
    volume: AUDIO_CONFIG.DEFAULT_VOLUME,
    bass: AUDIO_CONFIG.DEFAULT_BASS,
    surround: false,
    surroundPositions: [...DEFAULT_SURROUND_POSITIONS],
    eightD: {
      enabled: false,
      autoRotate: true,
      rotationSpeed: AUDIO_CONFIG.EIGHT_D_ROTATION_SPEED,
      manualPosition: 0,
    },
    modulation: { ...DEFAULT_MODULATION },
    distortion: { ...DEFAULT_DISTORTION },
    spatialAudio: { ...DEFAULT_SPATIAL_AUDIO },
  });

  const [visualizerData, setVisualizerData] = useState<number[]>(() => 
    Array(AUDIO_CONFIG.WAVEFORM_SAMPLES).fill(0.05)
  );

  const audioContextRef = useRef<AudioContext | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const nodesRef = useRef<{
    convolver?: ConvolverNode;
    wetGain?: GainNode;
    dryGain?: GainNode;
    mainGain?: GainNode;
    bassBoost?: BiquadFilterNode;
    splitter?: ChannelSplitterNode; // Para surround
    merger?: ChannelMergerNode; // Para surround
    panners?: PannerNode[]; // Para surround (8 canais)
    hrtfFilters?: BiquadFilterNode[]; // Filtros HRTF
    eightDPanner?: PannerNode; // Para 8D
    // Novos efeitos
    flanger?: any;
    phaser?: any;
    tremolo?: any;
    overdrive?: any;
    distortion?: any;
    bitcrusher?: any;
    fuzz?: any;
    binauralProcessor?: any;
    panning3D?: PannerNode;
    panning3DGain?: GainNode;
    surroundGains?: GainNode[];
    surroundDelays?: DelayNode[];
  }>({});
  const timeRef = useRef({ start: 0, pause: 0 });
  const animationFrameRef = useRef<number>(0);
  const eightDAngleRef = useRef(0); // Para animação automática do 8D
  const panning3DTimeRef = useRef(0); // Para controle de tempo do movimento 3D

  const createImpulseResponse = useCallback((context: AudioContext | OfflineAudioContext) => {
    const { REVERB_IMPULSE_DURATION: duration, REVERB_IMPULSE_DECAY: decay } = AUDIO_CONFIG;
    const length = context.sampleRate * duration;
    const impulse = context.createBuffer(2, length, context.sampleRate);
    
    for (let channel = 0; channel < 2; channel++) {
      const data = impulse.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
      }
    }
    return impulse;
  }, []);

  const generateWaveform = useCallback((buffer: AudioBuffer) => {
    const data = buffer.getChannelData(0);
    const blockSize = Math.floor(data.length / AUDIO_CONFIG.WAVEFORM_SAMPLES);
    const waveform = Array.from({ length: AUDIO_CONFIG.WAVEFORM_SAMPLES }, (_, i) => {
      const blockStart = blockSize * i;
      let sum = 0;
      for (let j = 0; j < blockSize; j++) {
        sum += Math.abs(data[blockStart + j]);
      }
      return sum / blockSize;
    });
    
    const maxVal = Math.max(...waveform);
    if (maxVal > 0) {
      setVisualizerData(waveform.map(v => v / maxVal));
    }
  }, []);

  // Função para criar filtros HRTF para cada canal
  const createHRTFFilters = useCallback((ctx: AudioContext) => {
    const filters: BiquadFilterNode[] = [];
    
    // Filtros HRTF personalizados para cada canal (valores típicos)
    const hrtfSettings = [
      // Front center - neutro
      { type: 'peaking', frequency: 2000, Q: 1.0, gain: 0 },
      // Front right - acentua agudos
      { type: 'peaking', frequency: 4000, Q: 0.8, gain: 2 },
      // Front left - acentua agudos
      { type: 'peaking', frequency: 4000, Q: 0.8, gain: 2 },
      // Side right - acentua médios
      { type: 'peaking', frequency: 1000, Q: 1.2, gain: 3 },
      // Side left - acentua médios
      { type: 'peaking', frequency: 1000, Q: 1.2, gain: 3 },
      // Rear right - atenua graves
      { type: 'highshelf', frequency: 500, Q: 1.0, gain: -2 },
      // Rear left - atenua graves
      { type: 'highshelf', frequency: 500, Q: 1.0, gain: -2 },
      // Rear center - atenua graves
      { type: 'highshelf', frequency: 300, Q: 1.0, gain: -3 }
    ];
    
    for (let i = 0; i < AUDIO_CONFIG.SURROUND_CHANNELS; i++) {
      const filter = ctx.createBiquadFilter();
      const settings = hrtfSettings[i];
      
      filter.type = settings.type as BiquadFilterType;
      filter.frequency.setValueAtTime(settings.frequency, 0);
      filter.Q.setValueAtTime(settings.Q, 0);
      filter.gain.setValueAtTime(settings.gain, 0);
      
      filters.push(filter);
    }
    
    return filters;
  }, []);

  // Função melhorada para criar sistema 7.1 surround de alta qualidade
  const createAdvancedSurroundSystem = useCallback((ctx: AudioContext, positions: { angle: number; elevation: number }[]) => {
    // Cria splitter para separar canais estéreo
    const splitter = ctx.createChannelSplitter(2);
    const merger = ctx.createChannelMerger(2);
    
    // Cria panners para cada canal surround
    const panners: PannerNode[] = [];
    const channelGains: GainNode[] = [];
    const delays: DelayNode[] = [];
    
    // Configurações específicas para cada canal 7.1
    const channelConfigs = [
      { name: 'Front Center', gain: 0.8, delay: 0 },
      { name: 'Front Right', gain: 0.9, delay: 0.001 },
      { name: 'Front Left', gain: 0.9, delay: 0.001 },
      { name: 'Side Right', gain: 0.7, delay: 0.003 },
      { name: 'Side Left', gain: 0.7, delay: 0.003 },
      { name: 'Rear Right', gain: 0.6, delay: 0.008 },
      { name: 'Rear Left', gain: 0.6, delay: 0.008 },
      { name: 'Rear Center', gain: 0.5, delay: 0.012 }
    ];
    
    for (let i = 0; i < AUDIO_CONFIG.SURROUND_CHANNELS; i++) {
      // Cria panner com configurações otimizadas
      const panner = ctx.createPanner();
      panner.panningModel = 'HRTF';
      panner.distanceModel = 'linear';
      panner.refDistance = 0.5;
      panner.maxDistance = 3;
      panner.rolloffFactor = 0.8;
      panner.coneInnerAngle = 60;
      panner.coneOuterAngle = 120;
      panner.coneOuterGain = 0.3;
      
      // Posicionamento 3D melhorado
      const pos = positions[i];
      const distance = 1.2; // Distância otimizada para HRTF
      const x = Math.sin(pos.angle) * distance;
      const z = -Math.cos(pos.angle) * distance;
      const y = pos.elevation * 0.5; // Elevação mais sutil
      
      panner.setPosition(x, y, z);
      panner.setOrientation(0, 0, -1);
      
      // Cria gain para controle individual do canal
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(channelConfigs[i].gain, ctx.currentTime);
      
      // Cria delay para simular tempo de chegada realístico
      const delay = ctx.createDelay(0.02);
      delay.delayTime.setValueAtTime(channelConfigs[i].delay, ctx.currentTime);
      
      panners.push(panner);
      channelGains.push(gain);
      delays.push(delay);
    }
    
    return { panners, channelGains, delays, splitter, merger };
  }, []);

  // Função para criar um panner node para 8D
  const createEightDPanner = useCallback((ctx: AudioContext) => {
    const panner = ctx.createPanner();
    panner.panningModel = 'HRTF';
    panner.distanceModel = 'inverse';
    panner.refDistance = 1;
    panner.maxDistance = 10000;
    panner.rolloffFactor = 1;
    panner.coneInnerAngle = 360;
    panner.coneOuterAngle = 0;
    panner.coneOuterGain = 0;
    return panner;
  }, []);

  const setupAudioGraph = useCallback((preservePlayback = false) => {
    if (!audioContextRef.current || !audioBufferRef.current) return;
    const ctx = audioContextRef.current;
    
    // Salva o estado atual de reprodução
    const wasPlaying = state.isPlaying;
    const currentTime = timeRef.current.pause + (wasPlaying ? (ctx.currentTime - timeRef.current.start) * state.speed : 0);
    
    // Limpa o nó anterior se existir
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.stop();
      } catch (e) {}
      sourceNodeRef.current = null;
    }
    
    const source = ctx.createBufferSource();
    source.buffer = audioBufferRef.current;
    source.playbackRate.value = state.speed;
    sourceNodeRef.current = source;

    // Cria os nós de efeito básico
    const mainGain = ctx.createGain();
    mainGain.gain.value = state.volume / 100;
    
    const convolver = ctx.createConvolver();
    convolver.buffer = createImpulseResponse(ctx);
    
    const wetGain = ctx.createGain();
    const dryGain = ctx.createGain();
    const wetValue = state.reverb / 100;
    wetGain.gain.value = wetValue;
    dryGain.gain.value = 1 - wetValue;

    const bassBoost = ctx.createBiquadFilter();
    bassBoost.type = 'lowshelf';
    bassBoost.frequency.setValueAtTime(AUDIO_CONFIG.BASS_BOOST_FREQUENCY, 0);
    bassBoost.gain.setValueAtTime(state.bass / 100 * AUDIO_CONFIG.BASS_BOOST_MAX_GAIN, 0);

    // Conecta os nós básicos
    source.connect(dryGain);
    source.connect(wetGain);
    wetGain.connect(convolver);
    dryGain.connect(mainGain);
    convolver.connect(mainGain);
    mainGain.connect(bassBoost);

    let outputNode: AudioNode = bassBoost;

    // === EFEITOS DE MODULAÇÃO ===
    
    // Flanger
    if (state.modulation.flanger.enabled) {
      const flanger = createFlangerEffect(
        ctx,
        state.modulation.flanger.rate,
        state.modulation.flanger.depth,
        state.modulation.flanger.feedback,
        state.modulation.flanger.delay
      );
      outputNode.connect(flanger.input);
      outputNode.connect(flanger.dry);
      outputNode = flanger.output;
      nodesRef.current.flanger = flanger;
    }

    // Phaser
    if (state.modulation.phaser.enabled) {
      const phaser = createPhaserEffect(
        ctx,
        state.modulation.phaser.rate,
        state.modulation.phaser.depth,
        state.modulation.phaser.stages,
        state.modulation.phaser.feedback
      );
      outputNode.connect(phaser.input);
      outputNode.connect(phaser.dry);
      outputNode = phaser.output;
      nodesRef.current.phaser = phaser;
    }

    // Tremolo
    if (state.modulation.tremolo.enabled) {
      const tremolo = createTremoloEffect(
        ctx,
        state.modulation.tremolo.rate,
        state.modulation.tremolo.depth,
        state.modulation.tremolo.shape
      );
      outputNode.connect(tremolo.input);
      outputNode = tremolo.output;
      nodesRef.current.tremolo = tremolo;
    }

    // === EFEITOS DE DISTORÇÃO ===

    // Overdrive
    if (state.distortion.overdrive.enabled) {
      const overdrive = createWaveShaper(ctx, state.distortion.overdrive.gain, 'overdrive');
      const toneFilter = ctx.createBiquadFilter();
      const levelGain = ctx.createGain();
      
      toneFilter.type = 'lowpass';
      toneFilter.frequency.setValueAtTime(1000 + (state.distortion.overdrive.tone / 100) * 4000, ctx.currentTime);
      levelGain.gain.setValueAtTime(state.distortion.overdrive.level / 100, ctx.currentTime);
      
      outputNode.connect(overdrive.input);
      overdrive.output.connect(toneFilter);
      toneFilter.connect(levelGain);
      outputNode = levelGain;
      nodesRef.current.overdrive = { ...overdrive, toneFilter, levelGain };
    }

    // Distortion
    if (state.distortion.distortion.enabled) {
      const distortion = createWaveShaper(ctx, state.distortion.distortion.amount, 'distortion');
      const toneFilter = ctx.createBiquadFilter();
      const levelGain = ctx.createGain();
      
      toneFilter.type = 'lowpass';
      toneFilter.frequency.setValueAtTime(1000 + (state.distortion.distortion.tone / 100) * 4000, ctx.currentTime);
      levelGain.gain.setValueAtTime(state.distortion.distortion.level / 100, ctx.currentTime);
      
      outputNode.connect(distortion.input);
      distortion.output.connect(toneFilter);
      toneFilter.connect(levelGain);
      outputNode = levelGain;
      nodesRef.current.distortion = { ...distortion, toneFilter, levelGain };
    }

    // Fuzz
    if (state.distortion.fuzz.enabled) {
      const fuzz = createWaveShaper(ctx, state.distortion.fuzz.amount, 'fuzz');
      const toneFilter = ctx.createBiquadFilter();
      const gateGain = ctx.createGain();
      const levelGain = ctx.createGain();
      
      toneFilter.type = 'lowpass';
      toneFilter.frequency.setValueAtTime(500 + (state.distortion.fuzz.tone / 100) * 2000, ctx.currentTime);
      gateGain.gain.setValueAtTime(state.distortion.fuzz.gate / 100, ctx.currentTime);
      levelGain.gain.setValueAtTime(0.3, ctx.currentTime); // Fuzz é naturalmente alto
      
      outputNode.connect(fuzz.input);
      fuzz.output.connect(toneFilter);
      toneFilter.connect(gateGain);
      gateGain.connect(levelGain);
      outputNode = levelGain;
      nodesRef.current.fuzz = { ...fuzz, toneFilter, gateGain, levelGain };
    }

    // Bitcrusher
    if (state.distortion.bitcrusher.enabled) {
      const bitcrusher = createBitCrusher(ctx, state.distortion.bitcrusher.bits, state.distortion.bitcrusher.sampleRate);
      outputNode.connect(bitcrusher.input);
      outputNode = bitcrusher.output;
      nodesRef.current.bitcrusher = bitcrusher;
    }


    // Configura o 7.1 surround melhorado se habilitado
    if (state.surround) {
      const surroundSystem = createAdvancedSurroundSystem(ctx, state.surroundPositions);
      const { panners, channelGains, delays, splitter, merger } = surroundSystem;
      const hrtfFilters = createHRTFFilters(ctx);
      
      // Conecta o output anterior ao splitter
      outputNode.connect(splitter);
      
      // Cria ganhos principais para distribuição inteligente
      const leftMainGain = ctx.createGain();
      const rightMainGain = ctx.createGain();
      const centerMainGain = ctx.createGain();
      
      leftMainGain.gain.setValueAtTime(0.85, ctx.currentTime);
      rightMainGain.gain.setValueAtTime(0.85, ctx.currentTime);
      centerMainGain.gain.setValueAtTime(0.7, ctx.currentTime);
      
      // Conecta canais com processamento avançado
      splitter.connect(leftMainGain, 0);
      splitter.connect(rightMainGain, 1);
      
      // Canal central recebe mix dos dois canais
      splitter.connect(centerMainGain, 0);
      splitter.connect(centerMainGain, 1);
      
      // Conecta cada canal através da cadeia: gain -> delay -> hrtf -> panner -> merger
      const connectChannel = (sourceGain: GainNode, channelIndex: number) => {
        sourceGain.connect(channelGains[channelIndex]);
        channelGains[channelIndex].connect(delays[channelIndex]);
        delays[channelIndex].connect(hrtfFilters[channelIndex]);
        hrtfFilters[channelIndex].connect(panners[channelIndex]);
        panners[channelIndex].connect(merger);
      };
      
      // Front Center (0)
      connectChannel(centerMainGain, 0);
      
      // Front Right (1) e Side Right (3)
      connectChannel(rightMainGain, 1);
      connectChannel(rightMainGain, 3);
      
      // Front Left (2) e Side Left (4)
      connectChannel(leftMainGain, 2);
      connectChannel(leftMainGain, 4);
      
      // Rear channels recebem mix atenuado
      const rearLeftGain = ctx.createGain();
      const rearRightGain = ctx.createGain();
      rearLeftGain.gain.setValueAtTime(0.6, ctx.currentTime);
      rearRightGain.gain.setValueAtTime(0.6, ctx.currentTime);
      
      leftMainGain.connect(rearLeftGain);
      rightMainGain.connect(rearRightGain);
      centerMainGain.connect(rearLeftGain);
      centerMainGain.connect(rearRightGain);
      
      // Rear Right (5), Rear Left (6), Rear Center (7)
      connectChannel(rearRightGain, 5);
      connectChannel(rearLeftGain, 6);
      connectChannel(centerMainGain, 7);
      
      outputNode = merger;
      
      // Armazena referências para atualizações em tempo real
      nodesRef.current.splitter = splitter;
      nodesRef.current.merger = merger;
      nodesRef.current.panners = panners;
      nodesRef.current.hrtfFilters = hrtfFilters;
      nodesRef.current.surroundGains = channelGains;
      nodesRef.current.surroundDelays = delays;
    }

    // === EFEITOS ESPACIAIS AVANÇADOS ===

    // Binaural Processing
    if (state.spatialAudio.binaural.enabled) {
      const binauralConvolver = ctx.createConvolver();
      const binauralGain = ctx.createGain();
      
      // Cria impulse response para binaural (simulação simples)
      const binauralImpulse = createImpulseResponse(ctx);
      binauralConvolver.buffer = binauralImpulse;
      binauralGain.gain.setValueAtTime(state.spatialAudio.binaural.width / 100, ctx.currentTime);
      
      outputNode.connect(binauralConvolver);
      binauralConvolver.connect(binauralGain);
      outputNode = binauralGain;
      nodesRef.current.binauralProcessor = { convolver: binauralConvolver, gain: binauralGain };
    }

    // 3D Panning - configuração otimizada para evitar distorção
    if (state.spatialAudio.panning3D.enabled) {
      const panner3D = ctx.createPanner();
      panner3D.panningModel = 'HRTF';
      panner3D.distanceModel = 'linear';
      panner3D.refDistance = 0.1;
      panner3D.maxDistance = 2;
      panner3D.rolloffFactor = 0.3;
      panner3D.coneInnerAngle = 180;
      panner3D.coneOuterAngle = 360;
      panner3D.coneOuterGain = 0.8;
      
      // Posições mais suaves para evitar distorção
      const smoothX = Math.max(-0.8, Math.min(0.8, state.spatialAudio.panning3D.x));
      const smoothY = Math.max(-0.5, Math.min(0.5, state.spatialAudio.panning3D.y));
      const smoothZ = Math.max(-0.8, Math.min(0.8, state.spatialAudio.panning3D.z));
      
      panner3D.setPosition(smoothX, smoothY, smoothZ);
      panner3D.setOrientation(0, 0, -1);
      
      // Adiciona um gain para controlar o volume e evitar clipping
      const panning3DGain = ctx.createGain();
      panning3DGain.gain.setValueAtTime(0.8, ctx.currentTime);
      
      outputNode.connect(panner3D);
      panner3D.connect(panning3DGain);
      outputNode = panning3DGain;
      nodesRef.current.panning3D = panner3D;
      nodesRef.current.panning3DGain = panning3DGain;
    }

    // Configura o 8D se habilitado
    if (state.eightD.enabled) {
      if (!nodesRef.current.eightDPanner) {
        nodesRef.current.eightDPanner = createEightDPanner(ctx);
      }
      
      // Conecta ao panner 8D
      outputNode.connect(nodesRef.current.eightDPanner);
      outputNode = nodesRef.current.eightDPanner;
    }

    // Conecta ao destino final
    outputNode.connect(ctx.destination);

    nodesRef.current = { 
      ...nodesRef.current, 
      convolver, 
      wetGain, 
      dryGain, 
      mainGain, 
      bassBoost 
    };
    
    // Se preservePlayback for true, restaura a reprodução
    if (preservePlayback && wasPlaying) {
      timeRef.current.pause = Math.min(currentTime, audioBufferRef.current.duration);
      timeRef.current.start = ctx.currentTime;
      source.start(0, timeRef.current.pause);
    }
    
    return source;
  }, [
    state.speed, state.reverb, state.volume, state.bass, 
    state.surround, state.surroundPositions, state.eightD.enabled,
    state.modulation, state.distortion, state.spatialAudio,
    createImpulseResponse, createAdvancedSurroundSystem, createEightDPanner, createHRTFFilters
  ]);

  const play = useCallback(() => {
    if (!audioContextRef.current || !audioBufferRef.current) return;
    
    // Se já temos um source ativo, paramos antes de criar um novo
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.stop();
      } catch (e) {}
      sourceNodeRef.current = null;
    }
    
    const source = setupAudioGraph();
    if (!source) return;

    const offset = Math.max(0, timeRef.current.pause);
    if (offset >= audioBufferRef.current.duration) {
      // Se o offset for maior que a duração, reinicia do início
      timeRef.current.pause = 0;
      timeRef.current.start = audioContextRef.current.currentTime;
    }

    source.start(0, timeRef.current.pause);
    timeRef.current.start = audioContextRef.current.currentTime;
    dispatch({ type: 'SET_PLAYING', value: true });
  }, [setupAudioGraph]);

  const pause = useCallback(() => {
    if (!sourceNodeRef.current || !audioContextRef.current) return;

    const elapsed = (audioContextRef.current.currentTime - timeRef.current.start) * state.speed;
    try { sourceNodeRef.current.stop(); } catch(e) {}
    
    timeRef.current.pause = Math.min(
      timeRef.current.pause + elapsed,
      audioBufferRef.current?.duration || 0
    );
    
    dispatch({ type: 'SET_PLAYING', value: false });
  }, [state.speed]);

  const togglePlayPause = useCallback(() => {
    if (audioContextRef.current?.state === 'suspended') {
      audioContextRef.current.resume();
    }
    state.isPlaying ? pause() : play();
  }, [state.isPlaying, play, pause]);

  const seek = useCallback((newProgress: number) => {
    if (!audioBufferRef.current) return;

    const newTime = (newProgress / 100) * audioBufferRef.current.duration;
    timeRef.current.pause = newTime;
    dispatch({ type: 'SET_TIME', current: newTime, progress: newProgress });

    // Se estiver tocando, reinicia a reprodução na nova posição
    if (state.isPlaying) {
      try { sourceNodeRef.current?.stop(); } catch(e) {}
      sourceNodeRef.current = null;
      play();
    }
  }, [state.isPlaying, play]);

  const download = useCallback(async (trackName: string) => {
    if (!audioBufferRef.current) return false;

    try {
      const buffer = audioBufferRef.current;
      const offlineCtx = new OfflineAudioContext(
        buffer.numberOfChannels,
        Math.ceil(buffer.length / state.speed),
        buffer.sampleRate
      );

      const source = offlineCtx.createBufferSource();
      source.buffer = buffer;
      source.playbackRate.value = state.speed;

      const mainGain = offlineCtx.createGain();
      mainGain.gain.value = state.volume / 100;

      const convolver = offlineCtx.createConvolver();
      convolver.buffer = createImpulseResponse(offlineCtx);

      const wetGain = offlineCtx.createGain();
      const dryGain = offlineCtx.createGain();
      const wetValue = state.reverb / 100;
      wetGain.gain.value = wetValue;
      dryGain.gain.value = 1 - wetValue;

      const bassBoost = offlineCtx.createBiquadFilter();
      bassBoost.type = 'lowshelf';
      bassBoost.frequency.setValueAtTime(AUDIO_CONFIG.BASS_BOOST_FREQUENCY, 0);
      bassBoost.gain.setValueAtTime(state.bass / 100 * AUDIO_CONFIG.BASS_BOOST_MAX_GAIN, 0);

      source.connect(dryGain);
      source.connect(wetGain);
      wetGain.connect(convolver);
      dryGain.connect(mainGain);
      convolver.connect(mainGain);
      mainGain.connect(bassBoost);
      bassBoost.connect(offlineCtx.destination);

      source.start(0);

      const renderedBuffer = await offlineCtx.startRendering();
      const wavBlob = bufferToWav(renderedBuffer);
      const url = URL.createObjectURL(wavBlob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `${trackName}-edited.wav`;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      a.remove();
      return true;
    } catch (error) {
      console.error("Error rendering audio:", error);
      return false;
    }
  }, [state.speed, state.reverb, state.volume, state.bass, createImpulseResponse]);

  // Load audio file
  useEffect(() => {
    if (!audioFile) return;
    
    // Limpa os recursos anteriores
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.stop();
      } catch(e) {}
      sourceNodeRef.current = null;
    }
    
    dispatch({ type: 'NEW_TRACK_RESET' });
    timeRef.current = { start: 0, pause: 0 };

    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    audioFile.arrayBuffer().then(buffer => 
      audioContextRef.current?.decodeAudioData(buffer)
    ).then(decoded => {
      if (!decoded) return;
      audioBufferRef.current = decoded;
      dispatch({ type: 'SET_DURATION', value: decoded.duration });
      generateWaveform(decoded);
    }).catch(console.error);

    return () => { 
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, [audioFile, generateWaveform]);

  // Update 8D position (auto rotação)
  useEffect(() => {
    if (!state.eightD.enabled || !state.eightD.autoRotate || !state.isPlaying) return;

    let intervalId: ReturnType<typeof setInterval>;
    
    // Atualiza a posição do panner a cada 50ms para animação suave
    intervalId = setInterval(() => {
      eightDAngleRef.current = (eightDAngleRef.current + (state.eightD.rotationSpeed * 360 * 0.05)) % 360;
      dispatch({ type: 'SET_EIGHT_D_MANUAL_POSITION', value: eightDAngleRef.current });
    }, 50);

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [state.eightD.enabled, state.eightD.autoRotate, state.eightD.rotationSpeed, state.isPlaying]);

  // Update 3D panning auto movement
  useEffect(() => {
    if (!state.spatialAudio.panning3D.enabled || !state.spatialAudio.panning3D.autoMove || !state.isPlaying) return;

    let intervalId: ReturnType<typeof setInterval>;
    
    intervalId = setInterval(() => {
      panning3DTimeRef.current += 0.05 * state.spatialAudio.panning3D.moveSpeed;
      let x = 0, y = 0, z = 0;
      
      switch (state.spatialAudio.panning3D.movePattern) {
        case 'circle':
          x = Math.sin(panning3DTimeRef.current) * 0.6;
          z = Math.cos(panning3DTimeRef.current) * 0.6;
          break;
        case 'figure8':
          x = Math.sin(panning3DTimeRef.current) * 0.6;
          z = Math.sin(panning3DTimeRef.current * 2) * 0.3;
          break;
        case 'pendulum':
          x = Math.sin(panning3DTimeRef.current) * 0.5;
          break;
        case 'random':
          x = (Math.random() - 0.5) * 1.2;
          y = (Math.random() - 0.5) * 0.8;
          z = (Math.random() - 0.5) * 1.2;
          break;
      }
      
      dispatch({ type: 'SET_PANNING_3D_X', value: x });
      dispatch({ type: 'SET_PANNING_3D_Y', value: y });
      dispatch({ type: 'SET_PANNING_3D_Z', value: z });
    }, 50);

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [state.spatialAudio.panning3D.enabled, state.spatialAudio.panning3D.autoMove, state.spatialAudio.panning3D.moveSpeed, state.spatialAudio.panning3D.movePattern, state.isPlaying]);

  // Update panner positions
  useEffect(() => {
    // Atualiza posição do 8D
    if (nodesRef.current.eightDPanner && state.eightD.enabled) {
      const angleRad = (state.eightD.manualPosition * Math.PI) / 180;
      const x = Math.sin(angleRad);
      const z = -Math.cos(angleRad); // Negativo para frente
      nodesRef.current.eightDPanner.setPosition(x, 0, z);
    }

    // Atualiza posição do 3D panning com suavização
    if (nodesRef.current.panning3D && state.spatialAudio.panning3D.enabled) {
      // Aplica suavização para evitar distorção
      const smoothX = Math.max(-0.8, Math.min(0.8, state.spatialAudio.panning3D.x));
      const smoothY = Math.max(-0.5, Math.min(0.5, state.spatialAudio.panning3D.y));
      const smoothZ = Math.max(-0.8, Math.min(0.8, state.spatialAudio.panning3D.z));
      
      nodesRef.current.panning3D.setPosition(smoothX, smoothY, smoothZ);
    }
  }, [
    state.eightD.enabled, state.eightD.manualPosition,
    state.spatialAudio.panning3D.enabled, state.spatialAudio.panning3D.x, 
    state.spatialAudio.panning3D.y, state.spatialAudio.panning3D.z
  ]);

  // Update UI during playback
  useEffect(() => {
    if (!state.isPlaying) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = 0;
      }
      return;
    }

    const updateUI = () => {
      if (!audioContextRef.current || !audioBufferRef.current) {
        return;
      }

      const elapsed = (audioContextRef.current.currentTime - timeRef.current.start) * state.speed;
      const current = timeRef.current.pause + elapsed;
      const total = audioBufferRef.current.duration;

      // Verifica se o áudio terminou e precisa reiniciar (loop)
      if (current >= total) {
        // Reinicia o tempo
        timeRef.current.pause = 0;
        timeRef.current.start = audioContextRef.current.currentTime;
        
        // Atualiza a interface imediatamente
        dispatch({ type: 'SET_TIME', current: 0, progress: 0 });
        
        // Reinicia a reprodução
        play();
      } else {
        dispatch({ type: 'SET_TIME', current, progress: (current / total) * 100 });
      }
      
      animationFrameRef.current = requestAnimationFrame(updateUI);
    };

    animationFrameRef.current = requestAnimationFrame(updateUI);
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = 0;
      }
    };
  }, [state.isPlaying, state.speed, play]);

  // Update audio nodes em tempo real
  useEffect(() => {
    if (sourceNodeRef.current?.playbackRate && audioContextRef.current) {
      sourceNodeRef.current.playbackRate.setValueAtTime(state.speed, audioContextRef.current.currentTime);
    }
  }, [state.speed]);

  useEffect(() => {
    if (nodesRef.current.wetGain && nodesRef.current.dryGain && audioContextRef.current) {
      const wet = state.reverb / 100;
      nodesRef.current.wetGain.gain.setValueAtTime(wet, audioContextRef.current.currentTime);
      nodesRef.current.dryGain.gain.setValueAtTime(1 - wet, audioContextRef.current.currentTime);
    }
  }, [state.reverb]);

  useEffect(() => {
    if (nodesRef.current.mainGain && audioContextRef.current) {
      nodesRef.current.mainGain.gain.setValueAtTime(state.volume / 100, audioContextRef.current.currentTime);
    }
  }, [state.volume]);

  useEffect(() => {
    if (nodesRef.current.bassBoost && audioContextRef.current) {
      nodesRef.current.bassBoost.gain.setValueAtTime(state.bass / 100 * AUDIO_CONFIG.BASS_BOOST_MAX_GAIN, audioContextRef.current.currentTime);
    }
  }, [state.bass]);

  // Atualizações em tempo real para efeitos de modulação
  useEffect(() => {
    if (nodesRef.current.flanger && audioContextRef.current) {
      const flanger = nodesRef.current.flanger;
      if (flanger.updateRate) flanger.updateRate(state.modulation.flanger.rate);
      if (flanger.updateDepth) flanger.updateDepth(state.modulation.flanger.depth);
      if (flanger.updateFeedback) flanger.updateFeedback(state.modulation.flanger.feedback);
    }
  }, [state.modulation.flanger.rate, state.modulation.flanger.depth, state.modulation.flanger.feedback]);

  useEffect(() => {
    if (nodesRef.current.phaser && audioContextRef.current) {
      const phaser = nodesRef.current.phaser;
      if (phaser.updateRate) phaser.updateRate(state.modulation.phaser.rate);
      if (phaser.updateDepth) phaser.updateDepth(state.modulation.phaser.depth);
      if (phaser.updateFeedback) phaser.updateFeedback(state.modulation.phaser.feedback);
    }
  }, [state.modulation.phaser.rate, state.modulation.phaser.depth, state.modulation.phaser.feedback]);

  useEffect(() => {
    if (nodesRef.current.tremolo && audioContextRef.current) {
      const tremolo = nodesRef.current.tremolo;
      if (tremolo.updateRate) tremolo.updateRate(state.modulation.tremolo.rate);
      if (tremolo.updateDepth) tremolo.updateDepth(state.modulation.tremolo.depth);
      if (tremolo.updateShape) tremolo.updateShape(state.modulation.tremolo.shape);
    }
  }, [state.modulation.tremolo.rate, state.modulation.tremolo.depth, state.modulation.tremolo.shape]);

  // Atualizações em tempo real para efeitos de distorção
  useEffect(() => {
    if (nodesRef.current.overdrive && audioContextRef.current) {
      const overdrive = nodesRef.current.overdrive;
      if (overdrive.updateAmount) overdrive.updateAmount(state.distortion.overdrive.gain);
      if (overdrive.toneFilter) {
        overdrive.toneFilter.frequency.setValueAtTime(
          1000 + (state.distortion.overdrive.tone / 100) * 4000, 
          audioContextRef.current.currentTime
        );
      }
      if (overdrive.levelGain) {
        overdrive.levelGain.gain.setValueAtTime(
          state.distortion.overdrive.level / 100, 
          audioContextRef.current.currentTime
        );
      }
    }
  }, [state.distortion.overdrive.gain, state.distortion.overdrive.tone, state.distortion.overdrive.level]);

  useEffect(() => {
    if (nodesRef.current.distortion && audioContextRef.current) {
      const distortion = nodesRef.current.distortion;
      if (distortion.updateAmount) distortion.updateAmount(state.distortion.distortion.amount);
      if (distortion.toneFilter) {
        distortion.toneFilter.frequency.setValueAtTime(
          1000 + (state.distortion.distortion.tone / 100) * 4000, 
          audioContextRef.current.currentTime
        );
      }
      if (distortion.levelGain) {
        distortion.levelGain.gain.setValueAtTime(
          state.distortion.distortion.level / 100, 
          audioContextRef.current.currentTime
        );
      }
    }
  }, [state.distortion.distortion.amount, state.distortion.distortion.tone, state.distortion.distortion.level]);

  useEffect(() => {
    if (nodesRef.current.fuzz && audioContextRef.current) {
      const fuzz = nodesRef.current.fuzz;
      if (fuzz.updateAmount) fuzz.updateAmount(state.distortion.fuzz.amount);
      if (fuzz.toneFilter) {
        fuzz.toneFilter.frequency.setValueAtTime(
          500 + (state.distortion.fuzz.tone / 100) * 2000, 
          audioContextRef.current.currentTime
        );
      }
      if (fuzz.gateGain) {
        fuzz.gateGain.gain.setValueAtTime(
          state.distortion.fuzz.gate / 100, 
          audioContextRef.current.currentTime
        );
      }
    }
  }, [state.distortion.fuzz.amount, state.distortion.fuzz.tone, state.distortion.fuzz.gate]);

  useEffect(() => {
    if (nodesRef.current.bitcrusher && audioContextRef.current) {
      const bitcrusher = nodesRef.current.bitcrusher;
      if (bitcrusher.updateBits) bitcrusher.updateBits(state.distortion.bitcrusher.bits);
      if (bitcrusher.updateSampleRate) bitcrusher.updateSampleRate(state.distortion.bitcrusher.sampleRate);
    }
  }, [state.distortion.bitcrusher.bits, state.distortion.bitcrusher.sampleRate]);

  // Atualizações em tempo real para áudio espacial
  useEffect(() => {
    if (nodesRef.current.binauralProcessor && audioContextRef.current) {
      const binaural = nodesRef.current.binauralProcessor;
      if (binaural.gain) {
        binaural.gain.gain.setValueAtTime(
          state.spatialAudio.binaural.width / 100, 
          audioContextRef.current.currentTime
        );
      }
    }
  }, [state.spatialAudio.binaural.roomSize, state.spatialAudio.binaural.damping, state.spatialAudio.binaural.width]);

  // Função para resetar as posições do surround para o padrão
  const resetSurroundPositions = useCallback(() => {
    dispatch({ type: 'SET_SURROUND_POSITIONS', value: [...DEFAULT_SURROUND_POSITIONS] });
  }, []);

  // Função para recriar o grafo de áudio mantendo a reprodução
  const recreateAudioGraph = useCallback(() => {
    if (audioContextRef.current && audioBufferRef.current) {
      setupAudioGraph(true);
    }
  }, [setupAudioGraph]);

  // Recria o grafo quando efeitos são habilitados/desabilitados
  useEffect(() => {
    recreateAudioGraph();
  }, [
    // Efeitos de modulação - enabled states
    state.modulation.flanger.enabled,
    state.modulation.phaser.enabled,
    state.modulation.tremolo.enabled,
    // Efeitos de distorção - enabled states
    state.distortion.overdrive.enabled,
    state.distortion.distortion.enabled,
    state.distortion.bitcrusher.enabled,
    state.distortion.fuzz.enabled,
    // Efeitos espaciais - enabled states
    state.spatialAudio.binaural.enabled,
    state.spatialAudio.panning3D.enabled,
    recreateAudioGraph
  ]);

  return {
    ...state,
    visualizerData,
    togglePlayPause,
    seek,
    download,
    setSpeed: (value: number) => dispatch({ type: 'SET_SPEED', value }),
    setReverb: (value: number) => dispatch({ type: 'SET_REVERB', value }),
    setVolume: (value: number) => dispatch({ type: 'SET_VOLUME', value }),
    setBass: (value: number) => dispatch({ type: 'SET_BASS', value }),
    setSurround: (value: boolean) => dispatch({ type: 'SET_SURROUND', value }),
    setSurroundPositions: (value: { angle: number; elevation: number }[]) => dispatch({ type: 'SET_SURROUND_POSITIONS', value }),
    resetSurroundPositions,
    setEightDEnabled: (value: boolean) => dispatch({ type: 'SET_EIGHT_D_ENABLED', value }),
    setEightDAutoRotate: (value: boolean) => dispatch({ type: 'SET_EIGHT_D_AUTO_ROTATE', value }),
    setEightDRotationSpeed: (value: number) => dispatch({ type: 'SET_EIGHT_D_ROTATION_SPEED', value }),
    setEightDManualPosition: (value: number) => dispatch({ type: 'SET_EIGHT_D_MANUAL_POSITION', value }),
    
    // Modulation Effects
    setFlangerEnabled: (value: boolean) => dispatch({ type: 'SET_FLANGER_ENABLED', value }),
    setFlangerRate: (value: number) => dispatch({ type: 'SET_FLANGER_RATE', value }),
    setFlangerDepth: (value: number) => dispatch({ type: 'SET_FLANGER_DEPTH', value }),
    setFlangerFeedback: (value: number) => dispatch({ type: 'SET_FLANGER_FEEDBACK', value }),
    setFlangerDelay: (value: number) => dispatch({ type: 'SET_FLANGER_DELAY', value }),
    setPhaserEnabled: (value: boolean) => dispatch({ type: 'SET_PHASER_ENABLED', value }),
    setPhaserRate: (value: number) => dispatch({ type: 'SET_PHASER_RATE', value }),
    setPhaserDepth: (value: number) => dispatch({ type: 'SET_PHASER_DEPTH', value }),
    setPhaserStages: (value: number) => dispatch({ type: 'SET_PHASER_STAGES', value }),
    setPhaserFeedback: (value: number) => dispatch({ type: 'SET_PHASER_FEEDBACK', value }),
    setTremoloEnabled: (value: boolean) => dispatch({ type: 'SET_TREMOLO_ENABLED', value }),
    setTremoloRate: (value: number) => dispatch({ type: 'SET_TREMOLO_RATE', value }),
    setTremoloDepth: (value: number) => dispatch({ type: 'SET_TREMOLO_DEPTH', value }),
    setTremoloShape: (value: 'sine' | 'square' | 'triangle' | 'sawtooth') => dispatch({ type: 'SET_TREMOLO_SHAPE', value }),
    
    // Distortion Effects
    setOverdriveEnabled: (value: boolean) => dispatch({ type: 'SET_OVERDRIVE_ENABLED', value }),
    setOverdriveGain: (value: number) => dispatch({ type: 'SET_OVERDRIVE_GAIN', value }),
    setOverdriveTone: (value: number) => dispatch({ type: 'SET_OVERDRIVE_TONE', value }),
    setOverdriveLevel: (value: number) => dispatch({ type: 'SET_OVERDRIVE_LEVEL', value }),
    setDistortionEnabled: (value: boolean) => dispatch({ type: 'SET_DISTORTION_ENABLED', value }),
    setDistortionAmount: (value: number) => dispatch({ type: 'SET_DISTORTION_AMOUNT', value }),
    setDistortionTone: (value: number) => dispatch({ type: 'SET_DISTORTION_TONE', value }),
    setDistortionLevel: (value: number) => dispatch({ type: 'SET_DISTORTION_LEVEL', value }),
    setBitcrusherEnabled: (value: boolean) => dispatch({ type: 'SET_BITCRUSHER_ENABLED', value }),
    setBitcrusherBits: (value: number) => dispatch({ type: 'SET_BITCRUSHER_BITS', value }),
    setBitcrusherSampleRate: (value: number) => dispatch({ type: 'SET_BITCRUSHER_SAMPLE_RATE', value }),
    setFuzzEnabled: (value: boolean) => dispatch({ type: 'SET_FUZZ_ENABLED', value }),
    setFuzzAmount: (value: number) => dispatch({ type: 'SET_FUZZ_AMOUNT', value }),
    setFuzzTone: (value: number) => dispatch({ type: 'SET_FUZZ_TONE', value }),
    setFuzzGate: (value: number) => dispatch({ type: 'SET_FUZZ_GATE', value }),
    
    // Spatial Audio
    setBinauralEnabled: (value: boolean) => dispatch({ type: 'SET_BINAURAL_ENABLED', value }),
    setBinauralRoomSize: (value: number) => dispatch({ type: 'SET_BINAURAL_ROOM_SIZE', value }),
    setBinauralDamping: (value: number) => dispatch({ type: 'SET_BINAURAL_DAMPING', value }),
    setBinauralWidth: (value: number) => dispatch({ type: 'SET_BINAURAL_WIDTH', value }),
    setPanning3DEnabled: (value: boolean) => dispatch({ type: 'SET_PANNING_3D_ENABLED', value }),
    setPanning3DX: (value: number) => dispatch({ type: 'SET_PANNING_3D_X', value }),
    setPanning3DY: (value: number) => dispatch({ type: 'SET_PANNING_3D_Y', value }),
    setPanning3DZ: (value: number) => dispatch({ type: 'SET_PANNING_3D_Z', value }),
    setPanning3DAutoMove: (value: boolean) => dispatch({ type: 'SET_PANNING_3D_AUTO_MOVE', value }),
    setPanning3DMoveSpeed: (value: number) => dispatch({ type: 'SET_PANNING_3D_MOVE_SPEED', value }),
    setPanning3DMovePattern: (value: 'circle' | 'figure8' | 'random' | 'pendulum') => dispatch({ type: 'SET_PANNING_3D_MOVE_PATTERN', value }),
    
    // Reset Functions
    resetModulationEffects: () => dispatch({ type: 'RESET_MODULATION_EFFECTS' }),
    resetDistortionEffects: () => dispatch({ type: 'RESET_DISTORTION_EFFECTS' }),
    resetSpatialAudioEffects: () => dispatch({ type: 'RESET_SPATIAL_AUDIO_EFFECTS' }),
  };
};