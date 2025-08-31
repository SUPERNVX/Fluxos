import { useState, useEffect, useCallback, useRef, useReducer } from 'react';
import { AUDIO_CONFIG, DEFAULT_SURROUND_POSITIONS } from '../constants/audioConfig';
import { bufferToWav } from '../utils/audioHelpers';
import { audioReducer } from '../reducers/audioReducer';

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
  }>({});
  const timeRef = useRef({ start: 0, pause: 0 });
  const animationFrameRef = useRef<number>(0);
  const eightDAngleRef = useRef(0); // Para animação automática do 8D

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

  // Função para criar panners para 7.1 surround com posições personalizadas
  const createSurroundPanners = useCallback((ctx: AudioContext, positions: { angle: number; elevation: number }[]) => {
    const panners: PannerNode[] = [];
    
    for (let i = 0; i < AUDIO_CONFIG.SURROUND_CHANNELS; i++) {
      const panner = ctx.createPanner();
      panner.panningModel = 'HRTF';
      panner.distanceModel = 'inverse';
      panner.refDistance = 1;
      panner.maxDistance = 10000;
      panner.rolloffFactor = 1;
      panner.coneInnerAngle = 360;
      panner.coneOuterAngle = 0;
      panner.coneOuterGain = 0;
      
      const pos = positions[i];
      const x = Math.sin(pos.angle);
      const z = -Math.cos(pos.angle); // Negativo para frente
      panner.setPosition(x, pos.elevation, z);
      
      panners.push(panner);
    }
    return panners;
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

  const setupAudioGraph = useCallback(() => {
    if (!audioContextRef.current || !audioBufferRef.current) return;
    const ctx = audioContextRef.current;
    
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

    // Configura o 7.1 surround se habilitado
    if (state.surround) {
      // Cria splitter e merger para manipular canais
      const splitter = ctx.createChannelSplitter(2);
      const merger = ctx.createChannelMerger(AUDIO_CONFIG.SURROUND_CHANNELS);
      
      // Cria panners e filtros HRTF para cada canal
      const panners = createSurroundPanners(ctx, state.surroundPositions);
      const hrtfFilters = createHRTFFilters(ctx);
      
      // Cria ganhos para controlar a distribuição espacial
      const leftGain = ctx.createGain();
      const rightGain = ctx.createGain();
      const centerGain = ctx.createGain();
      const rearGain = ctx.createGain();
      
      // Ajusta os ganhos para uma distribuição equilibrada
      leftGain.gain.value = 0.8;
      rightGain.gain.value = 0.8;
      centerGain.gain.value = 0.6;
      rearGain.gain.value = 0.7;
      
      // Conecta: bassBoost -> splitter
      bassBoost.connect(splitter);
      
      // Distribui os canais de entrada para melhor cobertura espacial com filtros HRTF
      // Canal esquerdo (0) vai para os alto-falantes da esquerda com ganho e filtros
      splitter.connect(leftGain, 0);
      leftGain.connect(hrtfFilters[2]); // Filtro HRTF para front left
      hrtfFilters[2].connect(panners[2]); // Front left
      
      leftGain.connect(hrtfFilters[4]); // Filtro HRTF para side left
      hrtfFilters[4].connect(panners[4]); // Side left
      
      leftGain.connect(hrtfFilters[6]); // Filtro HRTF para rear left
      hrtfFilters[6].connect(panners[6]); // Rear left
      
      // Canal direito (1) vai para os alto-falantes da direita com ganho e filtros
      splitter.connect(rightGain, 1);
      rightGain.connect(hrtfFilters[1]); // Filtro HRTF para front right
      hrtfFilters[1].connect(panners[1]); // Front right
      
      rightGain.connect(hrtfFilters[3]); // Filtro HRTF para side right
      hrtfFilters[3].connect(panners[3]); // Side right
      
      rightGain.connect(hrtfFilters[5]); // Filtro HRTF para rear right
      hrtfFilters[5].connect(panners[5]); // Rear right
      
      // Canal central e traseiro recebem ambos os canais para manter o centro
      splitter.connect(centerGain, 0);
      splitter.connect(centerGain, 1);
      centerGain.connect(hrtfFilters[0]); // Filtro HRTF para front center
      hrtfFilters[0].connect(panners[0]); // Front center
      
      splitter.connect(rearGain, 0);
      splitter.connect(rearGain, 1);
      rearGain.connect(hrtfFilters[7]); // Filtro HRTF para rear center
      hrtfFilters[7].connect(panners[7]); // Rear center
      
      // Conecta todos os panners ao merger
      panners.forEach((panner, index) => {
        panner.connect(merger, 0, index);
      });
      
      outputNode = merger;
      nodesRef.current.splitter = splitter;
      nodesRef.current.merger = merger;
      nodesRef.current.panners = panners;
      nodesRef.current.hrtfFilters = hrtfFilters;
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
    
    return source;
  }, [state.speed, state.reverb, state.volume, state.bass, state.surround, state.surroundPositions, state.eightD.enabled, createImpulseResponse, createSurroundPanners, createEightDPanner, createHRTFFilters]);

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

  // Update panner positions
  useEffect(() => {
    // Atualiza posição do 8D
    if (nodesRef.current.eightDPanner && state.eightD.enabled) {
      const angleRad = (state.eightD.manualPosition * Math.PI) / 180;
      const x = Math.sin(angleRad);
      const z = -Math.cos(angleRad); // Negativo para frente
      nodesRef.current.eightDPanner.setPosition(x, 0, z);
    }
  }, [state.eightD.enabled, state.eightD.manualPosition]);

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

  // Update audio nodes
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

  // Função para resetar as posições do surround para o padrão
  const resetSurroundPositions = useCallback(() => {
    dispatch({ type: 'SET_SURROUND_POSITIONS', value: [...DEFAULT_SURROUND_POSITIONS] });
  }, []);

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
  };
};