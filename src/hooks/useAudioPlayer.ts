import { useState, useEffect, useCallback, useRef, useReducer } from 'react';
import type { AudioNodes, FlangerEffect, TremoloEffect } from '../types/audio';
import {
  AUDIO_CONFIG,
  DEFAULT_MODULATION,
  DEFAULT_DISTORTION,
  DEFAULT_SPATIAL_AUDIO
} from '../constants/audioConfig';
import { ErrorHandler, ERROR_CODES } from '../utils/errorHandler';
import { MemoryManager } from '../utils/memoryManager';
import { bufferToWav } from '../utils/audioHelpers';
import { audioReducer } from '../reducers/audioReducer';
import {
  createFlangerEffect,
  createTremoloEffect,
  createBitCrusher,
  createOverdriveEffect,
  createDistortionEffect,
  createMuffleEffect
} from '../utils/effects';
import * as audioActions from '../actions/audioActions';

export const useAudioPlayer = (audioFile: File | null) => {
  const [state, dispatch] = useReducer(audioReducer, {
    isPlaying: false,
    progress: 0,
    currentTime: 0,
    duration: 0,
    speed: AUDIO_CONFIG.DEFAULT_SPEED,
    reverb: AUDIO_CONFIG.DEFAULT_REVERB,
    reverbType: 'default',
    volume: AUDIO_CONFIG.DEFAULT_VOLUME,
    bass: AUDIO_CONFIG.DEFAULT_BASS,
    eightD: {
      enabled: false,
      autoRotate: true,
      rotationSpeed: AUDIO_CONFIG.EIGHT_D_ROTATION_SPEED,
      manualPosition: 0,
    },
    modulation: { ...DEFAULT_MODULATION },
    distortion: { ...DEFAULT_DISTORTION },
    spatialAudio: { ...DEFAULT_SPATIAL_AUDIO, muffle: { enabled: false, intensity: 0 } },
  });

  const [visualizerData, setVisualizerData] = useState<number[]>(() => 
    Array(AUDIO_CONFIG.WAVEFORM_SAMPLES).fill(0.05)
  );

  const audioNodesRef = useRef<AudioNodes>({});

  const audioContextRef = useRef<AudioContext | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const timeRef = useRef({ start: 0, pause: 0 });
  const animationFrameRef = useRef<number>(0);
  const eightDAngleRef = useRef(0); // Para animação automática do 8D

  const createImpulseResponse = useCallback((context: AudioContext | OfflineAudioContext, reverbType: 'default' | 'hall' | 'room' | 'plate' = 'default') => {
    let duration, decay;
    
    switch(reverbType) {
      case 'hall':
        duration = 3.0; // Longer for concert hall
        decay = 4.0;   // More pronounced decay
        break;
      case 'room':
        duration = 1.0; // Shorter for room
        decay = 2.0;   // Less decay
        break;
      case 'plate':
        duration = 2.0; // Medium duration
        decay = 3.0;   // Dense decay for plate-like effect
        break;
      default:
        duration = AUDIO_CONFIG.REVERB_IMPULSE_DURATION;
        decay = AUDIO_CONFIG.REVERB_IMPULSE_DECAY;
    }
    
    const length = context.sampleRate * duration;
    const impulse = context.createBuffer(2, length, context.sampleRate);
    
    for (let channel = 0; channel < 2; channel++) {
      const data = impulse.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        // Add some variation based on reverb type to simulate different acoustic characteristics
        let value = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
        
        // For plate reverb, add some more metallic/dense characteristics
        if (reverbType === 'plate') {
          // Add some harmonics and reflections to simulate plate reverb
          value *= 1.0 + 0.3 * Math.sin(i * 0.02);
        }
        
        data[i] = value;
      }
    }
    return impulse;
  }, []);

  // Função específica para criar impulse response binaural com roomSize e damping
  const createBinauralImpulseResponse = useCallback((context: AudioContext | OfflineAudioContext, roomSize: number, damping: number) => {
    // roomSize afeta a duração (0-100 -> 0.5-4.0 segundos)
    const duration = 0.5 + (roomSize / 100) * 3.5;
    // damping afeta o decay e a densidade das reflexões (0-100 -> 1.5-6.0)
    const decay = 1.5 + (damping / 100) * 4.5;
    
    const length = context.sampleRate * duration;
    const impulse = context.createBuffer(2, length, context.sampleRate);
    
    for (let channel = 0; channel < 2; channel++) {
      const data = impulse.getChannelData(channel);
      
      // Diferenciação entre canais para efeito binaural mais realista
      const channelDelay = channel === 0 ? 0 : Math.floor(context.sampleRate * 0.0006); // 0.6ms delay for right ear
      
      for (let i = 0; i < length; i++) {
        let value = 0;
        
        // Early reflections baseadas no roomSize
        const earlyReflectionCount = Math.floor(3 + (roomSize / 100) * 12);
        for (let j = 0; j < earlyReflectionCount; j++) {
          const reflectionDelay = Math.floor((j + 1) * (roomSize / 100) * 1000 + channelDelay);
          if (i === reflectionDelay && i < length) {
            const reflectionGain = Math.pow(0.7, j) * (1 - damping / 200);
            value += (Math.random() * 2 - 1) * reflectionGain;
          }
        }
        
        // Late reverb tail com decay baseado no damping
        const lateReverbStart = Math.floor(context.sampleRate * 0.05); // 50ms
        if (i > lateReverbStart) {
          const timeRatio = (i - lateReverbStart) / (length - lateReverbStart);
          const dampingCurve = Math.pow(1 - timeRatio, decay);
          const densityFactor = 1 + (damping / 100) * 2; // Mais damping = mais densidade
          value += (Math.random() * 2 - 1) * dampingCurve * 0.3 * densityFactor;
        }
        
        // HRTF simulation básica para diferenciação espacial
        if (channel === 1) {
          // Right ear: slight high-frequency attenuation
          if (i > 0 && i < length - 1) {
            value = value * 0.9 + (data[i-1] || 0) * 0.1;
          }
        }
        
        data[i] = Math.max(-1, Math.min(1, value));
      }
    }
    return impulse;
  }, []);

  const generateWaveform = useCallback((buffer: AudioBuffer) => {
    // Extract the channel data to send to worker (this can be cloned)
    const channelData = buffer.getChannelData(0);
    
    // Create a copy of the audio buffer data to send to worker
    const worker = new Worker(new URL('../workers/waveformWorker.ts', import.meta.url));
    
    worker.postMessage({
      channelData: channelData,
      samples: AUDIO_CONFIG.WAVEFORM_SAMPLES
    });
    
    worker.onmessage = (e) => {
      const { success, waveform, error } = e.data;
      
      if (success) {
        setVisualizerData(waveform);
      } else {
        console.error('Error generating waveform:', error);
        // Fallback to synchronous generation if worker fails
        const data = channelData; // Use the already extracted data
        const blockSize = Math.floor(data.length / AUDIO_CONFIG.WAVEFORM_SAMPLES);
        const fallbackWaveform = Array.from({ length: AUDIO_CONFIG.WAVEFORM_SAMPLES }, (_, i) => {
          const blockStart = blockSize * i;
          let sum = 0;
          for (let j = 0; j < blockSize; j++) {
            sum += Math.abs(data[blockStart + j]);
          }
          return sum / blockSize;
        });
        
        const maxVal = Math.max(...fallbackWaveform);
        if (maxVal > 0) {
          setVisualizerData(fallbackWaveform.map(v => v / maxVal));
        } else {
          setVisualizerData(fallbackWaveform);
        }
      }
      
      worker.terminate();
    };
    
    worker.onerror = (error) => {
      console.error('Worker error:', error);
      // Fallback to synchronous generation on error
      const data = channelData;
      const blockSize = Math.floor(data.length / AUDIO_CONFIG.WAVEFORM_SAMPLES);
      const fallbackWaveform = Array.from({ length: AUDIO_CONFIG.WAVEFORM_SAMPLES }, (_, i) => {
        const blockStart = blockSize * i;
        let sum = 0;
        for (let j = 0; j < blockSize; j++) {
          sum += Math.abs(data[blockStart + j]);
        }
        return sum / blockSize;
      });
      
      const maxVal = Math.max(...fallbackWaveform);
      if (maxVal > 0) {
        setVisualizerData(fallbackWaveform.map(v => v / maxVal));
      } else {
        setVisualizerData(fallbackWaveform);
      }
      worker.terminate();
    };
  }, []);

  const createEightDPanner = useCallback((ctx: AudioContext) => {
    const panner = ctx.createPanner();
    panner.panningModel = 'HRTF';
    panner.distanceModel = 'inverse';
    panner.refDistance = 1;
    panner.maxDistance = 10000;
    panner.rolloffFactor = 0; // Minimal rolloff when disabled
    panner.coneInnerAngle = 360;
    panner.coneOuterAngle = 360; // Same as inner to avoid directional effects
    panner.coneOuterGain = 1;   // No attenuation
    return panner;
  }, []);

  // Setup de nós básicos (não muda com os efeitos)
  const setupBasicAudioGraph = useCallback(() => {
    if (!audioContextRef.current || !audioBufferRef.current) return;
    const ctx = audioContextRef.current;

    // Cria os nós de efeito básico
    const mainGain = ctx.createGain();
    mainGain.gain.value = 1; // Will be updated in real-time update effect
    
    // Cria convolvers para cada tipo de reverb
    const defaultConvolver = ctx.createConvolver();
    defaultConvolver.buffer = createImpulseResponse(ctx, 'default');
    
    const hallConvolver = ctx.createConvolver();
    hallConvolver.buffer = createImpulseResponse(ctx, 'hall');
    
    const roomConvolver = ctx.createConvolver();
    roomConvolver.buffer = createImpulseResponse(ctx, 'room');
    
    const plateConvolver = ctx.createConvolver();
    plateConvolver.buffer = createImpulseResponse(ctx, 'plate');
    
    // Cria ganhos para cada tipo de reverb para permitir switching em tempo real
    const defaultReverbGain = ctx.createGain();
    const hallReverbGain = ctx.createGain();
    const roomReverbGain = ctx.createGain();
    const plateReverbGain = ctx.createGain();
    
    // Set initial values to 0, will be updated in real-time update effect
    defaultReverbGain.gain.value = 0;
    hallReverbGain.gain.value = 0;
    roomReverbGain.gain.value = 0;
    plateReverbGain.gain.value = 0;
    
    const dryGain = ctx.createGain();
    dryGain.gain.value = 1; // Will be updated in real-time update effect

    const bassBoost = ctx.createBiquadFilter();
    bassBoost.type = 'lowshelf';
    bassBoost.frequency.setValueAtTime(AUDIO_CONFIG.BASS_BOOST_FREQUENCY, 0);
    bassBoost.gain.setValueAtTime(state.bass / 100 * AUDIO_CONFIG.BASS_BOOST_MAX_GAIN, 0); // Initialize with current bass value

    // Salva referências
    audioNodesRef.current = {
      ...audioNodesRef.current,
      defaultConvolver,
      hallConvolver,
      roomConvolver,
      plateConvolver,
      defaultReverbGain,
      hallReverbGain,
      roomReverbGain,
      plateReverbGain,
      dryGain,
      mainGain,
      bassBoost
    };

    return { 
      mainGain, 
      defaultConvolver,
      hallConvolver,
      roomConvolver,
      plateConvolver,
      defaultReverbGain,
      hallReverbGain,
      roomReverbGain,
      plateReverbGain,
      dryGain, 
      bassBoost 
    };
  }, [createImpulseResponse]); // Only depend on createImpulseResponse, not state values



  const setupAudioGraph = useCallback(async (preservePlayback = false) => {
    if (!audioContextRef.current || !audioBufferRef.current) return;
    const ctx = audioContextRef.current;
    
    // Properly disconnect and clean up existing audio nodes before creating new ones
    Object.values(audioNodesRef.current).forEach(node => {
      if (node && typeof node === 'object' && 'disconnect' in node) {
        try {
          (node as AudioNode).disconnect();
        } catch (error) {
          console.warn('Disconnect error:', error);
        }
      }
    });
    
    const wasPlaying = state.isPlaying;
    const currentTime = timeRef.current.pause + (wasPlaying ? (ctx.currentTime - timeRef.current.start) * state.speed : 0);
    
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.stop();
      } catch (error) {
        console.warn('Stop error:', error);
      }
      sourceNodeRef.current = null;
    }
    
    const source = ctx.createBufferSource();
    source.buffer = audioBufferRef.current;
    source.playbackRate.value = state.speed;
    sourceNodeRef.current = source;

    const mainGain = ctx.createGain();
    mainGain.gain.value = 1;
    
    const defaultConvolver = ctx.createConvolver();
    defaultConvolver.buffer = createImpulseResponse(ctx, 'default');
    
    const hallConvolver = ctx.createConvolver();
    hallConvolver.buffer = createImpulseResponse(ctx, 'hall');
    
    const roomConvolver = ctx.createConvolver();
    roomConvolver.buffer = createImpulseResponse(ctx, 'room');
    
    const plateConvolver = ctx.createConvolver();
    plateConvolver.buffer = createImpulseResponse(ctx, 'plate');
    
    const defaultReverbGain = ctx.createGain();
    const hallReverbGain = ctx.createGain();
    const roomReverbGain = ctx.createGain();
    const plateReverbGain = ctx.createGain();
    
    defaultReverbGain.gain.value = 0;
    hallReverbGain.gain.value = 0;
    roomReverbGain.gain.value = 0;
    plateReverbGain.gain.value = 0;
    
    const dryGain = ctx.createGain();
    dryGain.gain.value = 1;

    const bassBoost = ctx.createBiquadFilter();
    bassBoost.type = 'lowshelf';
    bassBoost.frequency.setValueAtTime(AUDIO_CONFIG.BASS_BOOST_FREQUENCY, 0);
    bassBoost.gain.setValueAtTime(state.bass / 100 * AUDIO_CONFIG.BASS_BOOST_MAX_GAIN, 0);

    // --- Bass bypass nodes ---
    const bassWetGain = ctx.createGain();
    const bassDryGain = ctx.createGain();
    const bassMerger = ctx.createGain();
    bassWetGain.gain.value = state.bass > 0 ? 1 : 0;
    bassDryGain.gain.value = state.bass > 0 ? 0 : 1;

    // --- 8D bypass nodes ---
    const eightDPanner = createEightDPanner(ctx);
    const eightDWetGain = ctx.createGain();
    const eightDDryGain = ctx.createGain();
    const eightDMerger = ctx.createGain();
    eightDWetGain.gain.value = state.eightD.enabled ? 1 : 0;
    eightDDryGain.gain.value = state.eightD.enabled ? 0 : 1;


    source.connect(dryGain);
    source.connect(defaultReverbGain);
    source.connect(hallReverbGain);
    source.connect(roomReverbGain);
    source.connect(plateReverbGain);
    
    defaultReverbGain.connect(defaultConvolver);
    hallReverbGain.connect(hallConvolver);
    roomReverbGain.connect(roomConvolver);
    plateReverbGain.connect(plateConvolver);
    
    defaultConvolver.connect(mainGain);
    hallConvolver.connect(mainGain);
    roomConvolver.connect(mainGain);
    plateConvolver.connect(mainGain);
    dryGain.connect(mainGain);
    
    let currentNode: AudioNode = mainGain;
    
    type EffectMap = {
      flanger: FlangerEffect;
      tremolo: TremoloEffect;
    };

    const connectEffect = <K extends keyof EffectMap>(inputNode: AudioNode, effect: EffectMap[K], effectName: K) => {
      inputNode.connect(effect.input);
      if ('dry' in effect && effect.dry) {
        inputNode.connect(effect.dry);
      }
      audioNodesRef.current[effectName] = effect;
      return effect.output;
    };

    // === EFEITOS DE MODULAÇÃO ===
    if (state.modulation.flanger.enabled) {
      const flanger = createFlangerEffect(ctx, state.modulation.flanger.rate, state.modulation.flanger.depth, state.modulation.flanger.feedback, state.modulation.flanger.delay);
      currentNode = connectEffect(currentNode, flanger, 'flanger');
    }
    if (state.modulation.tremolo.enabled) {
      const tremolo = createTremoloEffect(ctx, state.modulation.tremolo.rate, state.modulation.tremolo.depth, state.modulation.tremolo.shape);
      currentNode = connectEffect(currentNode, tremolo, 'tremolo');
    }

    // === EFEITOS DE DISTORÇÃO ===
    if (state.distortion.overdrive.enabled) {
      const overdrive = createOverdriveEffect(ctx, state.distortion.overdrive.gain, state.distortion.overdrive.tone, state.distortion.overdrive.level);
      currentNode.connect(overdrive.input);
      currentNode = overdrive.output;
      audioNodesRef.current.overdrive = overdrive;
    }
    if (state.distortion.distortion.enabled) {
      const distortion = createDistortionEffect(ctx, state.distortion.distortion.amount, state.distortion.distortion.tone, state.distortion.distortion.level);
      currentNode.connect(distortion.input);
      currentNode = distortion.output;
      audioNodesRef.current.distortion = distortion;
    }
    if (state.distortion.bitcrusher.enabled) {
      const bitcrusher = createBitCrusher(ctx, state.distortion.bitcrusher.bits, state.distortion.bitcrusher.sampleRate);
      currentNode.connect(bitcrusher.input);
      currentNode = bitcrusher.output;
      audioNodesRef.current.bitcrusher = bitcrusher;
    }

    // === EFEITOS ESPACIAIS AVANÇADOS ===
    if (state.spatialAudio.binaural.enabled) {
      const binauralConvolver = ctx.createConvolver();
      const binauralGain = ctx.createGain();
      const binauralImpulse = createBinauralImpulseResponse(ctx, state.spatialAudio.binaural.roomSize, state.spatialAudio.binaural.damping);
      binauralConvolver.buffer = binauralImpulse;
      binauralGain.gain.setValueAtTime(state.spatialAudio.binaural.width / 100, ctx.currentTime);
      currentNode.connect(binauralConvolver);
      binauralConvolver.connect(binauralGain);
      currentNode = binauralGain;
      audioNodesRef.current.binauralProcessor = { convolver: binauralConvolver, gain: binauralGain };
    }

    // --- Muffle Bypass Graph ---
    const muffleInput = currentNode;
    const muffleFilter = createMuffleEffect(ctx, state.spatialAudio.muffle.intensity);
    const muffleWetGain = ctx.createGain();
    const muffleDryGain = ctx.createGain();
    const muffleMerger = ctx.createGain();
    muffleWetGain.gain.value = state.spatialAudio.muffle.enabled ? 1 : 0;
    muffleDryGain.gain.value = state.spatialAudio.muffle.enabled ? 0 : 1;

    muffleInput.connect(muffleFilter);
    muffleFilter.connect(muffleWetGain);
    muffleWetGain.connect(muffleMerger);

    muffleInput.connect(muffleDryGain);
    muffleDryGain.connect(muffleMerger);
    currentNode = muffleMerger;

    // --- 8D Audio Bypass Graph ---
    const eightDInput = currentNode;
    // Wet path
    eightDInput.connect(eightDPanner);
    eightDPanner.connect(eightDWetGain);
    eightDWetGain.connect(eightDMerger);
    // Dry path
    eightDInput.connect(eightDDryGain);
    eightDDryGain.connect(eightDMerger);
    currentNode = eightDMerger;


    // --- Bass Boost Bypass Graph ---
    const bassInput = currentNode;
    // Wet path
    bassInput.connect(bassBoost);
    bassBoost.connect(bassWetGain);
    bassWetGain.connect(bassMerger);
    // Dry path
    bassInput.connect(bassDryGain);
    bassDryGain.connect(bassMerger);
    currentNode = bassMerger;


    // Connect to destination
    currentNode.connect(ctx.destination);

    audioNodesRef.current = {
      ...audioNodesRef.current,
      defaultConvolver,
      hallConvolver,
      roomConvolver,
      plateConvolver,
      defaultReverbGain,
      hallReverbGain,
      roomReverbGain,
      plateReverbGain,
      dryGain,
      mainGain,
      bassBoost,
      bassWetGain,
      bassDryGain,
      eightDPanner,
      eightDWetGain,
      eightDDryGain,
      muffle: muffleFilter,
      muffleWetGain,
      muffleDryGain
    };

    if (preservePlayback && wasPlaying) {
      timeRef.current.pause = Math.min(currentTime, audioBufferRef.current.duration);
      timeRef.current.start = ctx.currentTime;
      source.start(0, timeRef.current.pause);
    }
    
    return source;
  }, [
    // Only include state properties that change the graph structure (enable/disable states)
    state.spatialAudio.binaural.enabled,
    // Include modulation effect enables
    state.modulation.flanger.enabled,
    state.modulation.tremolo.enabled,
    // Include distortion effect enables
    state.distortion.overdrive.enabled,
    state.distortion.distortion.enabled,
    state.distortion.bitcrusher.enabled,
    // Include the speed for the source node
    state.speed,
    createImpulseResponse,
    createBinauralImpulseResponse,
    createEightDPanner
  ]);

  const play = useCallback(async () => {
    if (!audioContextRef.current || !audioBufferRef.current) return;
    
    // Se já temos um source ativo, paramos antes de criar um novo
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.stop();
      } catch (error) {
        console.warn('Stop error:', error);
      }
      sourceNodeRef.current = null;
    }
    
    const source = await setupAudioGraph();
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
    try { sourceNodeRef.current.stop(); } catch (error) { console.warn('Pause stop error:', error); }
    
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
    if (state.isPlaying) {
      pause();
    } else {
      play();
    }
  }, [state.isPlaying, play, pause]);

  const seek = useCallback(async (newProgress: number) => {
    if (!audioBufferRef.current) return;

    const newTime = (newProgress / 100) * audioBufferRef.current.duration;
    timeRef.current.pause = newTime;
    dispatch({ type: 'SET_TIME', current: newTime, progress: newProgress });

    // Se estiver tocando, reinicia a reprodução na nova posição
    if (state.isPlaying) {
      try { sourceNodeRef.current?.stop(); } catch (error) { console.warn('Seek stop error:', error); }
      sourceNodeRef.current = null;
      await play();
    }
  }, [state.isPlaying, play]);

  const download = useCallback(async (trackName: string, onProgress?: (progress: number) => void) => {
    if (!audioBufferRef.current) return false;

    try {
      const buffer = audioBufferRef.current;
      const offlineCtx = new OfflineAudioContext(
        buffer.numberOfChannels,
        Math.ceil(buffer.length / state.speed),
        buffer.sampleRate
      );

      // Set up the same audio graph as during playback
      const source = offlineCtx.createBufferSource();
      source.buffer = buffer;
      source.playbackRate.value = state.speed;

      // Basic processing nodes
      const mainGain = offlineCtx.createGain();
      mainGain.gain.value = state.volume / 100;

      // Create convolvers for each reverb type
      const defaultConvolver = offlineCtx.createConvolver();
      defaultConvolver.buffer = createImpulseResponse(offlineCtx, 'default');
      
      const hallConvolver = offlineCtx.createConvolver();
      hallConvolver.buffer = createImpulseResponse(offlineCtx, 'hall');
      
      const roomConvolver = offlineCtx.createConvolver();
      roomConvolver.buffer = createImpulseResponse(offlineCtx, 'room');
      
      const plateConvolver = offlineCtx.createConvolver();
      plateConvolver.buffer = createImpulseResponse(offlineCtx, 'plate');
      
      // Create gains for each reverb type
      const defaultReverbGain = offlineCtx.createGain();
      const hallReverbGain = offlineCtx.createGain();
      const roomReverbGain = offlineCtx.createGain();
      const plateReverbGain = offlineCtx.createGain();
      
      // Set gains based on current reverb type
      defaultReverbGain.gain.value = state.reverbType === 'default' ? state.reverb / 100 : 0;
      hallReverbGain.gain.value = state.reverbType === 'hall' ? state.reverb / 100 : 0;
      roomReverbGain.gain.value = state.reverbType === 'room' ? state.reverb / 100 : 0;
      plateReverbGain.gain.value = state.reverbType === 'plate' ? state.reverb / 100 : 0;
      
      const dryGain = offlineCtx.createGain();
      dryGain.gain.value = 1 - state.reverb / 100;

      const bassBoost = offlineCtx.createBiquadFilter();
      bassBoost.type = 'lowshelf';
      bassBoost.frequency.setValueAtTime(AUDIO_CONFIG.BASS_BOOST_FREQUENCY, 0);
      bassBoost.gain.setValueAtTime(state.bass / 100 * AUDIO_CONFIG.BASS_BOOST_MAX_GAIN, 0);

      // Create a complete effects pipeline like the real-time version
      let currentNode: AudioNode = source;

      // === MODULATION EFFECTS ===
      if (state.modulation.flanger.enabled) {
        const flanger = createFlangerEffect(offlineCtx, state.modulation.flanger.rate, state.modulation.flanger.depth, state.modulation.flanger.feedback, state.modulation.flanger.delay);
        currentNode.connect(flanger.input);
        currentNode = flanger.output;
      }
      if (state.modulation.tremolo.enabled) {
        const tremolo = createTremoloEffect(offlineCtx, state.modulation.tremolo.rate, state.modulation.tremolo.depth, state.modulation.tremolo.shape);
        currentNode.connect(tremolo.input);
        currentNode = tremolo.output;
      }

      // === DISTORTION EFFECTS ===
      if (state.distortion.overdrive.enabled) {
        const overdrive = createOverdriveEffect(offlineCtx, state.distortion.overdrive.gain, state.distortion.overdrive.tone, state.distortion.overdrive.level);
        currentNode.connect(overdrive.input);
        currentNode = overdrive.output;
      }
      if (state.distortion.distortion.enabled) {
        const distortion = createDistortionEffect(offlineCtx, state.distortion.distortion.amount, state.distortion.distortion.tone, state.distortion.distortion.level);
        currentNode.connect(distortion.input);
        currentNode = distortion.output;
      }
      if (state.distortion.bitcrusher.enabled) {
        const bitcrusher = createBitCrusher(offlineCtx, state.distortion.bitcrusher.bits, state.distortion.bitcrusher.sampleRate);
        currentNode.connect(bitcrusher.input);
        currentNode = bitcrusher.output;
      }

      // === SPATIAL EFFECTS ===
      if (state.spatialAudio.binaural.enabled) {
        const binauralConvolver = offlineCtx.createConvolver();
        const binauralGain = offlineCtx.createGain();
        const binauralImpulse = createBinauralImpulseResponse(offlineCtx, state.spatialAudio.binaural.roomSize, state.spatialAudio.binaural.damping);
        binauralConvolver.buffer = binauralImpulse;
        binauralGain.gain.setValueAtTime(state.spatialAudio.binaural.width / 100, 0);
        currentNode.connect(binauralConvolver);
        binauralConvolver.connect(binauralGain);
        currentNode = binauralGain;
      }

      if (state.spatialAudio.muffle.enabled) {
        const muffleFilter = createMuffleEffect(offlineCtx, state.spatialAudio.muffle.intensity);
        currentNode.connect(muffleFilter);
        currentNode = muffleFilter;
      }


      // === REVERB AND FINAL CHAIN ===
      // Connect to reverb system
      currentNode.connect(dryGain);
      currentNode.connect(defaultReverbGain);
      currentNode.connect(hallReverbGain);
      currentNode.connect(roomReverbGain);
      currentNode.connect(plateReverbGain);
      
      defaultReverbGain.connect(defaultConvolver);
      hallReverbGain.connect(hallConvolver);
      roomReverbGain.connect(roomConvolver);
      plateReverbGain.connect(plateConvolver);
      
      // Create merger for reverb
      const reverbMerger = offlineCtx.createGain();
      defaultConvolver.connect(reverbMerger);
      hallConvolver.connect(reverbMerger);
      roomConvolver.connect(reverbMerger);
      plateConvolver.connect(reverbMerger);
      
      // Final connections
      dryGain.connect(bassBoost);
      reverbMerger.connect(bassBoost);
      bassBoost.connect(mainGain);
      mainGain.connect(offlineCtx.destination);

      source.start(0);

      // For granular progress, simulate progress updates for longer files
      const totalFrames = buffer.length;
      const duration = totalFrames / buffer.sampleRate;
      
      // For longer audio files (> 10 seconds), show progress simulation
      if (duration > 10 && onProgress) {
        // Update progress at intervals based on duration
        const updateInterval = Math.max(500, (duration * 1000) / 100); // Max 100 updates
        let progress = 0;
        
        const progressInterval = setInterval(() => {
          if (progress < 95) { // Don't go to 100% until actual completion
            progress = Math.min(95, progress + 5);
            onProgress(progress);
          }
        }, updateInterval);

        const renderedBuffer = await offlineCtx.startRendering();
        
        // Clear the interval and set to 100% on completion
        clearInterval(progressInterval);
        onProgress(100);
        
        // Slight delay to show 100% progress
        await new Promise(resolve => setTimeout(resolve, 200));
        
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
      } else {
        // For shorter files, just render without progress updates
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
      }
    } catch (error) {
      console.error("Error rendering audio:", error);
      return false;
    }
  }, [
    state.speed, state.reverb, state.reverbType, state.volume, state.bass,
    state.modulation.flanger.enabled, state.modulation.flanger.rate, state.modulation.flanger.depth, state.modulation.flanger.feedback, state.modulation.flanger.delay,
    state.modulation.tremolo.enabled, state.modulation.tremolo.rate, state.modulation.tremolo.depth, state.modulation.tremolo.shape,
    state.distortion.overdrive.enabled, state.distortion.overdrive.gain, state.distortion.overdrive.tone, state.distortion.overdrive.level,
    state.distortion.distortion.enabled, state.distortion.distortion.amount, state.distortion.distortion.tone, state.distortion.distortion.level,
    state.distortion.bitcrusher.enabled, state.distortion.bitcrusher.bits, state.distortion.bitcrusher.sampleRate,
    state.spatialAudio.binaural.enabled, state.spatialAudio.binaural.roomSize, state.spatialAudio.binaural.damping, state.spatialAudio.binaural.width,
    state.spatialAudio.muffle.enabled, state.spatialAudio.muffle.intensity,
    createImpulseResponse, createBinauralImpulseResponse
  ]);

  // Load audio file
  useEffect(() => {
    if (!audioFile) return;
    
    // Aggressive cleanup of previous audio resources
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.stop();
      } catch (error) {
        console.warn('Stop error:', error);
      }
      sourceNodeRef.current = null;
    }
    
    // Disconnect and clean up existing audio nodes
    Object.values(audioNodesRef.current).forEach(node => {
      if (node && typeof node === 'object' && 'disconnect' in node) {
        const audioNode = node as AudioNode;
        try {
          audioNode.disconnect();
        } catch (e) {
          console.warn('Error disconnecting audio node:', e);
        }
      }
    });
    
    // Clear all audio node references
    audioNodesRef.current = {};
    
    dispatch({ type: 'NEW_TRACK_RESET' });
    timeRef.current = { start: 0, pause: 0 };

    // Resume context if suspended
    if (audioContextRef.current?.state === 'suspended') {
      audioContextRef.current.resume();
    } else if (!audioContextRef.current) {
      type WindowWithWebkitAudio = Window & { webkitAudioContext?: typeof AudioContext };
      const w = window as WindowWithWebkitAudio;
      audioContextRef.current = new (window.AudioContext || w.webkitAudioContext!)();
    }
    
    audioFile.arrayBuffer().then(buffer => {
      // Check memory before processing (com thresholds adaptativos)
      const memoryStats = MemoryManager.checkMemoryUsage();
      if (memoryStats && memoryStats.memoryUsagePercentage > 96) { // Threshold mais alto e adaptativo
        const fileSizeMB = audioFile.size / (1024 * 1024);
        // Só mostra erro para arquivos > 70MB ou memória realmente crítica (>98%)
        if (fileSizeMB > 70 || memoryStats.memoryUsagePercentage > 98) {
          ErrorHandler.logError(
            ERROR_CODES.OUT_OF_MEMORY,
            'Memória insuficiente para carregar arquivo',
            `Uso atual: ${memoryStats.memoryUsagePercentage.toFixed(1)}% | Arquivo: ${fileSizeMB.toFixed(1)}MB`,
            { fileName: audioFile.name, fileSize: audioFile.size }
          );
        }
        return Promise.reject(new Error('Insufficient memory'));
      }

      // Register arrayBuffer in memory manager
      MemoryManager.registerResource(
        `audio-buffer-${Date.now()}`,
        'audioBuffer',
        buffer,
        buffer.byteLength
      );

      return audioContextRef.current?.decodeAudioData(buffer);
    }).then(decoded => {
      if (!decoded) return;
      
      // Register decoded buffer
      MemoryManager.registerResource(
        `decoded-buffer-${Date.now()}`,
        'audioBuffer',
        decoded,
        decoded.length * decoded.numberOfChannels * 4
      );
      
      audioBufferRef.current = decoded;
      dispatch({ type: 'SET_DURATION', value: decoded.duration });
      generateWaveform(decoded);
      
      // Configura o grafo de áudio inicial
      setupBasicAudioGraph();
    }).catch(error => {
      if (error instanceof Error) {
        if (error.name === 'EncodingError' || error.message.includes('decode')) {
          ErrorHandler.logError(
            ERROR_CODES.AUDIO_DECODE_FAILED,
            'Erro ao decodificar arquivo de áudio',
            error.message,
            { fileName: audioFile.name, error }
          );
        } else if (error.name === 'NotSupportedError') {
          ErrorHandler.logError(
            ERROR_CODES.AUDIO_CONTEXT_FAILED,
            'Navegador não suporta este formato de áudio',
            error.message,
            { fileName: audioFile.name, error }
          );
        } else if (error.message === 'Insufficient memory') {
          // Already handled above
        } else {
          ErrorHandler.logError(
            ERROR_CODES.FILE_CORRUPTED,
            'Arquivo de áudio corrompido ou inválido',
            error.message,
            { fileName: audioFile.name, error }
          );
        }
      }
    });

    // Return cleanup function
    return () => {
      // Stop any playing audio
      if (sourceNodeRef.current) {
        try {
          sourceNodeRef.current.stop();
        } catch (error) {
          console.warn('Cleanup stop error:', error);
        }
        sourceNodeRef.current = null;
      }
      
      // Clean up all audio nodes
      Object.values(audioNodesRef.current).forEach(node => {
        if (node && typeof node === 'object' && 'disconnect' in node) {
          const audioNode = node as AudioNode;
          try {
            audioNode.disconnect();
          } catch (e) {
            console.warn('Error disconnecting audio node during cleanup:', e);
          }
        }
      });
      
      // Clear all audio node references
      audioNodesRef.current = {};
      
      // Close audio context only if this is the last component using it
      // This is a simplified cleanup - in a real app you might want to track context usage
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, [audioFile, generateWaveform, setupBasicAudioGraph]);

  // Update 8D position (auto rotação)
  useEffect(() => {
    if (!state.eightD.enabled || !state.eightD.autoRotate || !state.isPlaying) return;

    const intervalId: ReturnType<typeof setInterval> = setInterval(() => {
      eightDAngleRef.current = (eightDAngleRef.current + (state.eightD.rotationSpeed * 360 * 0.05)) % 360;
      dispatch({ type: 'SET_EIGHT_D_MANUAL_POSITION', value: eightDAngleRef.current });
    }, 50);

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [state.eightD.enabled, state.eightD.autoRotate, state.eightD.rotationSpeed, state.isPlaying]);

  // Update UI during playback
  useEffect(() => {
    if (!state.isPlaying) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = 0;
      }
      return;
    }

    const updateUI = async () => {
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
        await play();
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

  // Update audio nodes em tempo real (consolidated)
  useEffect(() => {
    if (!audioContextRef.current) return;
    const ctx = audioContextRef.current;
    const now = ctx.currentTime;
    const rampTime = 0.05; // 50ms crossfade

    if (sourceNodeRef.current?.playbackRate) {
      sourceNodeRef.current.playbackRate.setValueAtTime(state.speed, now);
    }
    
    if (audioNodesRef.current.defaultReverbGain && 
        audioNodesRef.current.hallReverbGain && 
        audioNodesRef.current.roomReverbGain && 
        audioNodesRef.current.plateReverbGain && 
        audioNodesRef.current.dryGain && 
        audioNodesRef.current.mainGain) {
      
      audioNodesRef.current.defaultReverbGain.gain.linearRampToValueAtTime(state.reverbType === 'default' ? state.reverb / 100 : 0, now + rampTime);
      audioNodesRef.current.hallReverbGain.gain.linearRampToValueAtTime(state.reverbType === 'hall' ? state.reverb / 100 : 0, now + rampTime);
      audioNodesRef.current.roomReverbGain.gain.linearRampToValueAtTime(state.reverbType === 'room' ? state.reverb / 100 : 0, now + rampTime);
      audioNodesRef.current.plateReverbGain.gain.linearRampToValueAtTime(state.reverbType === 'plate' ? state.reverb / 100 : 0, now + rampTime);
      audioNodesRef.current.dryGain.gain.linearRampToValueAtTime(1 - (state.reverb / 100), now + rampTime);
    }
    
    if (audioNodesRef.current.mainGain) {
      audioNodesRef.current.mainGain.gain.linearRampToValueAtTime(state.volume / 100, now + rampTime);
    }
    
    // --- Bass Boost Bypass Logic ---
    if (audioNodesRef.current.bassBoost && audioNodesRef.current.bassWetGain && audioNodesRef.current.bassDryGain && state.bass != null) {
      const bassGainValue = state.bass / 100 * AUDIO_CONFIG.BASS_BOOST_MAX_GAIN;
      audioNodesRef.current.bassBoost.gain.linearRampToValueAtTime(bassGainValue, now + rampTime);

      if (state.bass > 0) {
        // Activate effect: fade wet in, fade dry out
        audioNodesRef.current.bassWetGain.gain.linearRampToValueAtTime(1, now + rampTime);
        audioNodesRef.current.bassDryGain.gain.linearRampToValueAtTime(0, now + rampTime);
      } else {
        // Bypass effect: fade wet out, fade dry in
        audioNodesRef.current.bassWetGain.gain.linearRampToValueAtTime(0, now + rampTime);
        audioNodesRef.current.bassDryGain.gain.linearRampToValueAtTime(1, now + rampTime);
      }
    }
    
    // Modulation effects updates...
    if (audioNodesRef.current.flanger) {
      const flanger = audioNodesRef.current.flanger;
      if (flanger.updateRate) flanger.updateRate(state.modulation.flanger.rate);
      if (flanger.updateDepth) flanger.updateDepth(state.modulation.flanger.depth);
      if (flanger.updateFeedback) flanger.updateFeedback(state.modulation.flanger.feedback);
    }
    
    
    if (audioNodesRef.current.tremolo) {
      const tremolo = audioNodesRef.current.tremolo;
      if (tremolo.updateRate) tremolo.updateRate(state.modulation.tremolo.rate);
      if (tremolo.updateDepth) tremolo.updateDepth(state.modulation.tremolo.depth);
      if (tremolo.updateShape) tremolo.updateShape(state.modulation.tremolo.shape);
    }
    
    // Distortion effects updates...
    if (audioNodesRef.current.overdrive) {
      const overdrive = audioNodesRef.current.overdrive;
      if (overdrive.updateAmount) overdrive.updateAmount(state.distortion.overdrive.gain);
      if (overdrive.toneFilter) {
        overdrive.toneFilter.frequency.linearRampToValueAtTime(1000 + (state.distortion.overdrive.tone / 100) * 4000, now + rampTime);
      }
      if (overdrive.levelGain) {
        overdrive.levelGain.gain.linearRampToValueAtTime(state.distortion.overdrive.level / 100, now + rampTime);
      }
    }
    
    if (audioNodesRef.current.distortion) {
      const distortion = audioNodesRef.current.distortion;
      if (distortion.updateAmount) distortion.updateAmount(state.distortion.distortion.amount);
      if (distortion.toneFilter) {
        distortion.toneFilter.frequency.linearRampToValueAtTime(1000 + (state.distortion.distortion.tone / 100) * 4000, now + rampTime);
      }
      if (distortion.levelGain) {
        distortion.levelGain.gain.linearRampToValueAtTime(state.distortion.distortion.level / 100, now + rampTime);
      }
    }
    
    
    if (audioNodesRef.current.bitcrusher) {
      const bitcrusher = audioNodesRef.current.bitcrusher;
      if (bitcrusher.updateBits) bitcrusher.updateBits(state.distortion.bitcrusher.bits);
      if (bitcrusher.updateSampleRate) bitcrusher.updateSampleRate(state.distortion.bitcrusher.sampleRate);
    }


    // Binaural real-time updates (recria o impulse response quando parâmetros mudam)
    if (audioNodesRef.current.binauralProcessor && state.spatialAudio.binaural.enabled) {
      const processor = audioNodesRef.current.binauralProcessor;
      try {
        const newImpulse = createBinauralImpulseResponse(audioContextRef.current!, state.spatialAudio.binaural.roomSize, state.spatialAudio.binaural.damping);
        processor.convolver.buffer = newImpulse;
        processor.gain.gain.setValueAtTime(state.spatialAudio.binaural.width / 100, audioContextRef.current!.currentTime);
      } catch (error) {
        console.warn('Error updating binaural parameters:', error);
      }
    }
    
    // Spatial audio updates... (removido - já tratado acima)

    // --- Muffle Bypass Logic ---
    if (audioNodesRef.current.muffle && audioNodesRef.current.muffleWetGain && audioNodesRef.current.muffleDryGain) {
      const muffle = state.spatialAudio.muffle;
      if (muffle.enabled) {
        audioNodesRef.current.muffleWetGain.gain.linearRampToValueAtTime(1, now + rampTime);
        audioNodesRef.current.muffleDryGain.gain.linearRampToValueAtTime(0, now + rampTime);
        
        const maxFreq = 12000; // Começa a cortar mais cedo
        const minFreq = 400;   // Corte final mais profundo
        const frequency = maxFreq - (muffle.intensity / 100) * (maxFreq - minFreq);
        audioNodesRef.current.muffle.frequency.linearRampToValueAtTime(frequency, now + rampTime);
        audioNodesRef.current.muffle.Q.linearRampToValueAtTime(1.2, now + rampTime); // Q levemente aumentado

      } else {
        audioNodesRef.current.muffleWetGain.gain.linearRampToValueAtTime(0, now + rampTime);
        audioNodesRef.current.muffleDryGain.gain.linearRampToValueAtTime(1, now + rampTime);
      }
    }
    
    // --- 8D Audio Bypass Logic ---
    if (audioNodesRef.current.eightDPanner && audioNodesRef.current.eightDWetGain && audioNodesRef.current.eightDDryGain) {
      if (state.eightD.enabled) {
        audioNodesRef.current.eightDWetGain.gain.linearRampToValueAtTime(1, now + rampTime);
        audioNodesRef.current.eightDDryGain.gain.linearRampToValueAtTime(0, now + rampTime);

        const angleInRadians = (state.eightD.manualPosition * Math.PI) / 180;
        const x = Math.sin(angleInRadians);
        const y = 0;
        const z = Math.cos(angleInRadians);
        audioNodesRef.current.eightDPanner.positionX.linearRampToValueAtTime(x, now + rampTime);
        audioNodesRef.current.eightDPanner.positionY.linearRampToValueAtTime(y, now + rampTime);
        audioNodesRef.current.eightDPanner.positionZ.linearRampToValueAtTime(z, now + rampTime);
      } else {
        audioNodesRef.current.eightDWetGain.gain.linearRampToValueAtTime(0, now + rampTime);
        audioNodesRef.current.eightDDryGain.gain.linearRampToValueAtTime(1, now + rampTime);
      }
    }

  }, [
    // Core parameters that affect real-time audio
    state.speed, state.reverb, state.reverbType, state.volume, state.bass,
    state.eightD.enabled, state.eightD.manualPosition,
    
    // Only include enabled effect parameters to avoid unnecessary re-renders
    state.modulation.flanger.rate, state.modulation.flanger.depth, state.modulation.flanger.feedback,
    state.modulation.tremolo.rate, state.modulation.tremolo.depth, state.modulation.tremolo.shape,
    state.distortion.overdrive.gain, state.distortion.overdrive.tone, state.distortion.overdrive.level,
    state.distortion.distortion.amount, state.distortion.distortion.tone, state.distortion.distortion.level,
    state.distortion.bitcrusher.bits, state.distortion.bitcrusher.sampleRate,
    state.spatialAudio.binaural.width, state.spatialAudio.binaural.roomSize, state.spatialAudio.binaural.damping,
    state.spatialAudio.muffle.intensity,
    
    // Include enabled states to trigger re-render when effects are toggled
    state.spatialAudio.muffle.enabled
  ]);



  // Grouped setters for effects using action creators
  const setEffectControls = {
    // Playback controls
    setSpeed: (value: number) => dispatch(audioActions.setSpeed(value)),
    setReverb: (value: number) => dispatch(audioActions.setReverb(value)),
    setReverbType: (value: 'default' | 'hall' | 'room' | 'plate') => dispatch(audioActions.setReverbType(value)),
    setVolume: (value: number) => dispatch(audioActions.setVolume(value)),
    setBass: (value: number) => dispatch(audioActions.setBass(value)),
    
    // 8D Audio controls
    setEightDEnabled: (value: boolean) => dispatch(audioActions.setEightDEnabled(value)),
    setEightDAutoRotate: (value: boolean) => dispatch(audioActions.setEightDAutoRotate(value)),
    setEightDRotationSpeed: (value: number) => dispatch(audioActions.setEightDRotationSpeed(value)),
    setEightDManualPosition: (value: number) => dispatch(audioActions.setEightDManualPosition(value)),
    

    
    // Modulation Effects
    setFlangerEnabled: (value: boolean) => dispatch(audioActions.setFlangerEnabled(value)),
    setFlangerRate: (value: number) => dispatch(audioActions.setFlangerRate(value)),
    setFlangerDepth: (value: number) => dispatch(audioActions.setFlangerDepth(value)),
    setFlangerFeedback: (value: number) => dispatch(audioActions.setFlangerFeedback(value)),
    setFlangerDelay: (value: number) => dispatch(audioActions.setFlangerDelay(value)),
    setTremoloEnabled: (value: boolean) => dispatch(audioActions.setTremoloEnabled(value)),
    setTremoloRate: (value: number) => dispatch(audioActions.setTremoloRate(value)),
    setTremoloDepth: (value: number) => dispatch(audioActions.setTremoloDepth(value)),
    setTremoloShape: (value: 'sine' | 'square' | 'triangle' | 'sawtooth') => dispatch(audioActions.setTremoloShape(value)),
    
    // Distortion Effects
    setOverdriveEnabled: (value: boolean) => dispatch(audioActions.setOverdriveEnabled(value)),
    setOverdriveGain: (value: number) => dispatch(audioActions.setOverdriveGain(value)),
    setOverdriveTone: (value: number) => dispatch(audioActions.setOverdriveTone(value)),
    setOverdriveLevel: (value: number) => dispatch(audioActions.setOverdriveLevel(value)),
    setDistortionEnabled: (value: boolean) => dispatch(audioActions.setDistortionEnabled(value)),
    setDistortionAmount: (value: number) => dispatch(audioActions.setDistortionAmount(value)),
    setDistortionTone: (value: number) => dispatch(audioActions.setDistortionTone(value)),
    setDistortionLevel: (value: number) => dispatch(audioActions.setDistortionLevel(value)),
    setBitcrusherEnabled: (value: boolean) => dispatch(audioActions.setBitcrusherEnabled(value)),
    setBitcrusherBits: (value: number) => dispatch(audioActions.setBitcrusherBits(value)),
    setBitcrusherSampleRate: (value: number) => dispatch(audioActions.setBitcrusherSampleRate(value)),
    
    // Spatial Audio
    setBinauralEnabled: (value: boolean) => dispatch(audioActions.setBinauralEnabled(value)),
    setBinauralRoomSize: (value: number) => dispatch(audioActions.setBinauralRoomSize(value)),
    setBinauralDamping: (value: number) => dispatch(audioActions.setBinauralDamping(value)),
    setBinauralWidth: (value: number) => dispatch(audioActions.setBinauralWidth(value)),
    setMuffleEnabled: (value: boolean) => dispatch(audioActions.setMuffleEnabled(value)),
    setMuffleIntensity: (value: number) => dispatch(audioActions.setMuffleIntensity(value)),
    resetMuffledEffects: () => dispatch(audioActions.resetMuffledEffects()),

    
    // Reset Functions
    resetModulationEffects: () => dispatch(audioActions.resetModulationEffects()),
    resetDistortionEffects: () => dispatch(audioActions.resetDistortionEffects()),

    resetSpatialAudioEffects: () => dispatch(audioActions.resetSpatialAudioEffects()),
  };

  // Recria o grafo quando efeitos são habilitados/desabilitados (otimização)
  useEffect(() => {
    // Só reconstrói o grafo se o contexto estiver ativo e tivermos um arquivo de áudio
    if (audioContextRef.current && audioBufferRef.current) {
      // Reconstrói o grafo mantendo a reprodução atual
      setupAudioGraph(true);
    }
  }, [
    // Parâmetros que afetam a conexão do grafo (enable/disabled states)
    state.modulation.flanger.enabled,
    state.modulation.tremolo.enabled,
    state.distortion.overdrive.enabled,
    state.distortion.distortion.enabled,
    state.distortion.bitcrusher.enabled,
    state.spatialAudio.binaural.enabled,
    state.speed, // Re-build graph on speed change
  ]);

  return {
    ...state,
    visualizerData,
    togglePlayPause,
    seek,
    download: (trackName: string, onProgress?: (progress: number) => void) => download(trackName, onProgress),
    ...setEffectControls
  };
};