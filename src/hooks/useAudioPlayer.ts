import { useState, useEffect, useCallback, useRef, useReducer } from 'react';
import type { AudioNodes } from '../types/audio';
import { 
  AUDIO_CONFIG, 
  DEFAULT_MODULATION, 
  DEFAULT_DISTORTION, 
  DEFAULT_SPATIAL_AUDIO,
  DEFAULT_MUFFLED
} from '../constants/audioConfig';
import { bufferToWav } from '../utils/audioHelpers';
import { audioReducer } from '../reducers/audioReducer';
import {
  createFlangerEffect,
  createPhaserEffect,
  createTremoloEffect,
  createBitCrusher,
  createOverdriveEffect,
  createDistortionEffect,
  createFuzzEffect
} from '../utils/audioEffects';
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
    muffled: { ...DEFAULT_MUFFLED },
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
    panner.rolloffFactor = 1;
    panner.coneInnerAngle = 360;
    panner.coneOuterAngle = 0;
    panner.coneOuterGain = 0;
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
    // Inicialmente set to neutral value, will be updated in real-time effect
    mainGain.gain.value = 1; // Will be updated in real-time
    
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
    
    // Inicialmente set all to 0, will be updated in real-time effect
    defaultReverbGain.gain.value = 0;
    hallReverbGain.gain.value = 0;
    roomReverbGain.gain.value = 0;
    plateReverbGain.gain.value = 0;
    
    const dryGain = ctx.createGain();
    dryGain.gain.value = 1; // Will be updated in real-time

    const bassBoost = ctx.createBiquadFilter();
    bassBoost.type = 'lowshelf';
    bassBoost.frequency.setValueAtTime(AUDIO_CONFIG.BASS_BOOST_FREQUENCY, 0);
    // Initialize with current bass value
    bassBoost.gain.setValueAtTime(state.bass / 100 * AUDIO_CONFIG.BASS_BOOST_MAX_GAIN, 0);

    // Conecta os nós básicos - this is the main signal path
    source.connect(dryGain);
    // Connect source to each reverb path
    source.connect(defaultReverbGain);
    source.connect(hallReverbGain);
    source.connect(roomReverbGain);
    source.connect(plateReverbGain);
    
    // Conecta os convolvers
    defaultReverbGain.connect(defaultConvolver);
    hallReverbGain.connect(hallConvolver);
    roomReverbGain.connect(roomConvolver);
    plateReverbGain.connect(plateConvolver);
    
    // Conecta todos os convolvers ao gain principal
    defaultConvolver.connect(mainGain);
    hallConvolver.connect(mainGain);
    roomConvolver.connect(mainGain);
    plateConvolver.connect(mainGain);
    dryGain.connect(mainGain);
    
    // Inicializa com o nó básico
    let currentNode: AudioNode = mainGain; // mainGain já é o ponto de mistura agora
    
    // Função auxiliar para conectar efeitos
    const connectEffect = (inputNode: AudioNode, effect: any, effectName: keyof AudioNodes) => {
      // Conecta o nó de entrada ao efeito
      inputNode.connect(effect.input);
      // Se for um efeito com dry/wet, conecta também o dry path
      if (effect.dry) {
        inputNode.connect(effect.dry);
      }
      audioNodesRef.current[effectName] = effect;
      return effect.output;
    };

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
      currentNode = connectEffect(currentNode, flanger, 'flanger');
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
      currentNode = connectEffect(currentNode, phaser, 'phaser');
    }

    // Tremolo
    if (state.modulation.tremolo.enabled) {
      const tremolo = createTremoloEffect(
        ctx,
        state.modulation.tremolo.rate,
        state.modulation.tremolo.depth,
        state.modulation.tremolo.shape
      );
      currentNode = connectEffect(currentNode, tremolo, 'tremolo');
    }

    // === EFEITOS DE DISTORÇÃO ===

    // Overdrive
    if (state.distortion.overdrive.enabled) {
      const overdrive = createOverdriveEffect(
        ctx,
        state.distortion.overdrive.gain,
        state.distortion.overdrive.tone,
        state.distortion.overdrive.level
      );
      
      // Para efeitos que são objetos completos (com input/output)
      currentNode.connect(overdrive.input);
      currentNode = overdrive.output;
      audioNodesRef.current.overdrive = overdrive;
    }

    // Distortion
    if (state.distortion.distortion.enabled) {
      const distortion = createDistortionEffect(
        ctx,
        state.distortion.distortion.amount,
        state.distortion.distortion.tone,
        state.distortion.distortion.level
      );
      
      currentNode.connect(distortion.input);
      currentNode = distortion.output;
      audioNodesRef.current.distortion = distortion;
    }

    // Fuzz
    if (state.distortion.fuzz.enabled) {
      const fuzz = createFuzzEffect(
        ctx,
        state.distortion.fuzz.amount,
        state.distortion.fuzz.tone,
        state.distortion.fuzz.gate
      );
      
      currentNode.connect(fuzz.input);
      currentNode = fuzz.output;
      audioNodesRef.current.fuzz = fuzz;
    }

    // Bitcrusher
    if (state.distortion.bitcrusher.enabled) {
      const bitcrusher = createBitCrusher(ctx, state.distortion.bitcrusher.bits, state.distortion.bitcrusher.sampleRate);
      currentNode.connect(bitcrusher.input);
      currentNode = bitcrusher.output;
      audioNodesRef.current.bitcrusher = bitcrusher;
    }

    // === EFEITO MUFFLED ===
    if (state.muffled.enabled) {
      const muffledFilter = ctx.createBiquadFilter();
      muffledFilter.type = 'lowpass';
      
      // Mapeia a intensidade (0-100%) para uma faixa de frequência (200Hz - 8000Hz)
      // Quanto maior a intensidade, menor a frequência de corte (mais abafado)
      const minFreq = 200;  // Frequência mínima quando intensidade é 100%
      const maxFreq = 8000; // Frequência máxima quando intensidade é 0%
      const frequency = maxFreq - (state.muffled.intensity / 100) * (maxFreq - minFreq);
      
      muffledFilter.frequency.setValueAtTime(Math.max(minFreq, Math.min(maxFreq, frequency)), ctx.currentTime);
      muffledFilter.Q.setValueAtTime(1, ctx.currentTime); // Ressonância padrão
      
      currentNode.connect(muffledFilter);
      currentNode = muffledFilter;
      audioNodesRef.current.muffledFilter = muffledFilter;
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
      
      currentNode.connect(binauralConvolver);
      binauralConvolver.connect(binauralGain);
      currentNode = binauralGain;
      audioNodesRef.current.binauralProcessor = { convolver: binauralConvolver, gain: binauralGain };
    }

    // Configura o 8D se habilitado
    if (state.eightD.enabled) {
      if (!audioNodesRef.current.eightDPanner) {
        audioNodesRef.current.eightDPanner = createEightDPanner(ctx);
      }
      
      // Conecta ao panner 8D
      currentNode.connect(audioNodesRef.current.eightDPanner);
      currentNode = audioNodesRef.current.eightDPanner;
    }

    // Conecta o bass boost no final da cadeia de efeitos
    currentNode.connect(bassBoost);
    // Conecta o bass boost ao destino final
    bassBoost.connect(ctx.destination);

    // Atualiza referências de nós
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

    // Se preservePlayback for true, restaura a reprodução
    if (preservePlayback && wasPlaying) {
      timeRef.current.pause = Math.min(currentTime, audioBufferRef.current.duration);
      timeRef.current.start = ctx.currentTime;
      source.start(0, timeRef.current.pause);
    }
    
    return source;
  }, [
    // Only include state properties that change the graph structure (enable/disable states)
    state.muffled.enabled,
    state.eightD.enabled,
    state.spatialAudio.binaural.enabled,
    // Include modulation effect enables
    state.modulation.flanger.enabled,
    state.modulation.phaser.enabled,
    state.modulation.tremolo.enabled,
    // Include distortion effect enables  
    state.distortion.overdrive.enabled,
    state.distortion.distortion.enabled,
    state.distortion.bitcrusher.enabled,
    state.distortion.fuzz.enabled,
    // Include the speed for the source node
    state.speed,
    createImpulseResponse, 
    createEightDPanner
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

      // Connect basic nodes
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
      
      mainGain.connect(bassBoost);
      bassBoost.connect(offlineCtx.destination);

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
  }, [state.speed, state.reverb, state.reverbType, state.volume, state.bass, createImpulseResponse]);

  // Load audio file
  useEffect(() => {
    if (!audioFile) return;
    
    // Aggressive cleanup of previous audio resources
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.stop();
      } catch(e) {}
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
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    audioFile.arrayBuffer().then(buffer => 
      audioContextRef.current?.decodeAudioData(buffer)
    ).then(decoded => {
      if (!decoded) return;
      audioBufferRef.current = decoded;
      dispatch({ type: 'SET_DURATION', value: decoded.duration });
      generateWaveform(decoded);
      
      // Configura o grafo de áudio inicial
      setupBasicAudioGraph();
    }).catch(console.error);

    // Return cleanup function
    return () => {
      // Stop any playing audio
      if (sourceNodeRef.current) {
        try {
          sourceNodeRef.current.stop();
        } catch(e) {}
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

  // Update audio nodes em tempo real (consolidated)
  useEffect(() => {
    if (sourceNodeRef.current?.playbackRate && audioContextRef.current) {
      sourceNodeRef.current.playbackRate.setValueAtTime(state.speed, audioContextRef.current.currentTime);
    }
    
    // Real-time reverb type switching using gain nodes
    if (audioNodesRef.current.defaultReverbGain && 
        audioNodesRef.current.hallReverbGain && 
        audioNodesRef.current.roomReverbGain && 
        audioNodesRef.current.plateReverbGain && 
        audioNodesRef.current.dryGain && 
        audioNodesRef.current.mainGain &&
        audioContextRef.current) {
      
      // Set the appropriate reverb path to the current reverb value and others to 0
      audioNodesRef.current.defaultReverbGain.gain.setValueAtTime(
        state.reverbType === 'default' ? state.reverb / 100 : 0, 
        audioContextRef.current.currentTime
      );
      audioNodesRef.current.hallReverbGain.gain.setValueAtTime(
        state.reverbType === 'hall' ? state.reverb / 100 : 0, 
        audioContextRef.current.currentTime
      );
      audioNodesRef.current.roomReverbGain.gain.setValueAtTime(
        state.reverbType === 'room' ? state.reverb / 100 : 0, 
        audioContextRef.current.currentTime
      );
      audioNodesRef.current.plateReverbGain.gain.setValueAtTime(
        state.reverbType === 'plate' ? state.reverb / 100 : 0, 
        audioContextRef.current.currentTime
      );
      
      // Update dry path accordingly
      audioNodesRef.current.dryGain.gain.setValueAtTime(
        1 - (state.reverb / 100), 
        audioContextRef.current.currentTime
      );
    }
    
    if (audioNodesRef.current.mainGain && audioContextRef.current) {
      audioNodesRef.current.mainGain.gain.setValueAtTime(state.volume / 100, audioContextRef.current.currentTime);
    }
    
    if (audioNodesRef.current.bassBoost && audioContextRef.current && state.bass != null) {
      audioNodesRef.current.bassBoost.gain.setValueAtTime(state.bass / 100 * AUDIO_CONFIG.BASS_BOOST_MAX_GAIN, audioContextRef.current.currentTime);
    }
    
    // Atualizações em tempo real para efeitos de modulação
    if (audioNodesRef.current.flanger && audioContextRef.current) {
      const flanger = audioNodesRef.current.flanger;
      if (flanger.updateRate) flanger.updateRate(state.modulation.flanger.rate);
      if (flanger.updateDepth) flanger.updateDepth(state.modulation.flanger.depth);
      if (flanger.updateFeedback) flanger.updateFeedback(state.modulation.flanger.feedback);
    }
    
    if (audioNodesRef.current.phaser && audioContextRef.current) {
      const phaser = audioNodesRef.current.phaser;
      if (phaser.updateRate) phaser.updateRate(state.modulation.phaser.rate);
      if (phaser.updateDepth) phaser.updateDepth(state.modulation.phaser.depth);
      if (phaser.updateFeedback) phaser.updateFeedback(state.modulation.phaser.feedback);
    }
    
    if (audioNodesRef.current.tremolo && audioContextRef.current) {
      const tremolo = audioNodesRef.current.tremolo;
      if (tremolo.updateRate) tremolo.updateRate(state.modulation.tremolo.rate);
      if (tremolo.updateDepth) tremolo.updateDepth(state.modulation.tremolo.depth);
      if (tremolo.updateShape) tremolo.updateShape(state.modulation.tremolo.shape);
    }
    
    // Atualizações em tempo real para efeitos de distorção
    if (audioNodesRef.current.overdrive && audioContextRef.current) {
      const overdrive = audioNodesRef.current.overdrive;
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
    
    if (audioNodesRef.current.distortion && audioContextRef.current) {
      const distortion = audioNodesRef.current.distortion;
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
    
    if (audioNodesRef.current.fuzz && audioContextRef.current) {
      const fuzz = audioNodesRef.current.fuzz;
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
    
    if (audioNodesRef.current.bitcrusher && audioContextRef.current) {
      const bitcrusher = audioNodesRef.current.bitcrusher;
      if (bitcrusher.updateBits) bitcrusher.updateBits(state.distortion.bitcrusher.bits);
      if (bitcrusher.updateSampleRate) bitcrusher.updateSampleRate(state.distortion.bitcrusher.sampleRate);
    }
    
    // Atualizações em tempo real para efeito muffled
    if (audioNodesRef.current.muffledFilter && audioContextRef.current && state.muffled?.intensity != null) {
      // Mapeia a intensidade (0-100%) para uma faixa de frequência (200Hz - 8000Hz)
      const minFreq = 200;  // Frequência mínima quando intensidade é 100%
      const maxFreq = 8000; // Frequência máxima quando intensidade é 0%
      const frequency = maxFreq - (state.muffled.intensity / 100) * (maxFreq - minFreq);
      
      audioNodesRef.current.muffledFilter.frequency.setValueAtTime(
        Math.max(minFreq, Math.min(maxFreq, frequency)), 
        audioContextRef.current.currentTime
      );
    }
    
    // Atualizações em tempo real para áudio espacial
    if (audioNodesRef.current.binauralProcessor && audioContextRef.current) {
      const binaural = audioNodesRef.current.binauralProcessor;
      if (binaural.gain) {
        binaural.gain.gain.setValueAtTime(
          state.spatialAudio.binaural.width / 100, 
          audioContextRef.current.currentTime
        );
      }
    }
  }, [
    state.speed, state.reverb, state.reverbType, state.volume, state.bass,
    state.modulation.flanger.rate, state.modulation.flanger.depth, state.modulation.flanger.feedback,
    state.modulation.phaser.rate, state.modulation.phaser.depth, state.modulation.phaser.feedback,
    state.modulation.tremolo.rate, state.modulation.tremolo.depth, state.modulation.tremolo.shape,
    state.distortion.overdrive.gain, state.distortion.overdrive.tone, state.distortion.overdrive.level,
    state.distortion.distortion.amount, state.distortion.distortion.tone, state.distortion.distortion.level,
    state.distortion.fuzz.amount, state.distortion.fuzz.tone, state.distortion.fuzz.gate,
    state.distortion.bitcrusher.bits, state.distortion.bitcrusher.sampleRate,
    state.muffled.intensity,
    state.spatialAudio.binaural.width
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
    
    // Muffled controls
    setMuffledEnabled: (value: boolean) => dispatch(audioActions.setMuffledEnabled(value)),
    setMuffledIntensity: (value: number) => dispatch(audioActions.setMuffledIntensity(value)),
    
    // Modulation Effects
    setFlangerEnabled: (value: boolean) => dispatch(audioActions.setFlangerEnabled(value)),
    setFlangerRate: (value: number) => dispatch(audioActions.setFlangerRate(value)),
    setFlangerDepth: (value: number) => dispatch(audioActions.setFlangerDepth(value)),
    setFlangerFeedback: (value: number) => dispatch(audioActions.setFlangerFeedback(value)),
    setFlangerDelay: (value: number) => dispatch(audioActions.setFlangerDelay(value)),
    setPhaserEnabled: (value: boolean) => dispatch(audioActions.setPhaserEnabled(value)),
    setPhaserRate: (value: number) => dispatch(audioActions.setPhaserRate(value)),
    setPhaserDepth: (value: number) => dispatch(audioActions.setPhaserDepth(value)),
    setPhaserStages: (value: number) => dispatch(audioActions.setPhaserStages(value)),
    setPhaserFeedback: (value: number) => dispatch(audioActions.setPhaserFeedback(value)),
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
    setFuzzEnabled: (value: boolean) => dispatch(audioActions.setFuzzEnabled(value)),
    setFuzzAmount: (value: number) => dispatch(audioActions.setFuzzAmount(value)),
    setFuzzTone: (value: number) => dispatch(audioActions.setFuzzTone(value)),
    setFuzzGate: (value: number) => dispatch(audioActions.setFuzzGate(value)),
    
    // Spatial Audio
    setBinauralEnabled: (value: boolean) => dispatch(audioActions.setBinauralEnabled(value)),
    setBinauralRoomSize: (value: number) => dispatch(audioActions.setBinauralRoomSize(value)),
    setBinauralDamping: (value: number) => dispatch(audioActions.setBinauralDamping(value)),
    setBinauralWidth: (value: number) => dispatch(audioActions.setBinauralWidth(value)),
    
    // Reset Functions
    resetModulationEffects: () => dispatch(audioActions.resetModulationEffects()),
    resetDistortionEffects: () => dispatch(audioActions.resetDistortionEffects()),
    resetMuffledEffects: () => dispatch(audioActions.resetMuffledEffects()),
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
    state.modulation.phaser.enabled,
    state.modulation.tremolo.enabled,
    state.distortion.overdrive.enabled,
    state.distortion.distortion.enabled,
    state.distortion.bitcrusher.enabled,
    state.distortion.fuzz.enabled,
    state.muffled.enabled,
    state.spatialAudio.binaural.enabled,
    state.eightD.enabled,
    setupAudioGraph
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