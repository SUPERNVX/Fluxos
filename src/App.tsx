import React, { useState, useEffect, useCallback, useRef, useMemo, useReducer, memo } from 'react';
import { type Track } from './types';

// --- CONSTANTS --- //
const AUDIO_CONFIG = {
  WAVEFORM_SAMPLES: 200,
  DEFAULT_SPEED: 1.0,
  DEFAULT_REVERB: 0,
  DEFAULT_VOLUME: 100,
  DEFAULT_BASS: 0,
  MIN_SPEED: 0.5,
  MAX_SPEED: 2.0,
  SPEED_STEP: 0.05,
  REVERB_IMPULSE_DURATION: 1,
  REVERB_IMPULSE_DECAY: 4,
  BASS_BOOST_FREQUENCY: 250, // Hz
  BASS_BOOST_MAX_GAIN: 20, // dB
} as const;

// --- ICONS (Memoized) --- //
const icons = {
  Play: memo(({ className }: { className?: string }) => <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>),
  Pause: memo(({ className }: { className?: string }) => <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>),
  SkipNext: memo(({ className }: { className?: string }) => <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>),
  SkipPrevious: memo(({ className }: { className?: string }) => <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>),
  Settings: memo(({ className }: { className?: string }) => <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>),
  Upload: memo(({ className }: { className?: string }) => <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>),
  Download: memo(({ className }: { className?: string }) => <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>),
  Share: memo(({ className }: { className?: string }) => <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>),
  Trash: memo(({ className }: { className?: string }) => <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>),
  Close: memo(({ className }: { className?: string }) => <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>),
};

// --- HELPERS --- //
const formatTime = (time: number): string => {
  const safeTime = Math.max(0, time || 0);
  const minutes = Math.floor(safeTime / 60);
  const seconds = Math.floor(safeTime % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const bufferToWav = (buffer: AudioBuffer): Blob => {
  const numOfChan = buffer.numberOfChannels;
  const length = buffer.length * numOfChan * 2 + 44;
  const bufferArr = new ArrayBuffer(length);
  const view = new DataView(bufferArr);
  const channels = Array.from({ length: numOfChan }, (_, i) => buffer.getChannelData(i));
  let pos = 0;

  const setUint16 = (data: number) => { view.setUint16(pos, data, true); pos += 2; };
  const setUint32 = (data: number) => { view.setUint32(pos, data, true); pos += 4; };

  setUint32(0x46464952); setUint32(length - 8); setUint32(0x45564157);
  setUint32(0x20746d66); setUint32(16); setUint16(1); setUint16(numOfChan);
  setUint32(buffer.sampleRate); setUint32(buffer.sampleRate * 2 * numOfChan);
  setUint16(numOfChan * 2); setUint16(16);
  setUint32(0x61746164); setUint32(length - pos - 4);

  let offset = 0;
  while (pos < length) {
    for (let i = 0; i < numOfChan; i++) {
      const sample = Math.max(-1, Math.min(1, channels[i][offset]));
      view.setInt16(pos, (sample * (sample < 0 ? 32768 : 32767)) | 0, true);
      pos += 2;
    }
    offset++;
  }
  return new Blob([view], { type: 'audio/wav' });
};

// --- AUDIO STATE REDUCER --- //
type AudioState = {
  isPlaying: boolean;
  progress: number;
  currentTime: number;
  duration: number;
  speed: number;
  reverb: number;
  volume: number;
  bass: number;
};

type AudioAction = 
  | { type: 'SET_PLAYING'; value: boolean }
  | { type: 'SET_PROGRESS'; value: number }
  | { type: 'SET_TIME'; current: number; progress: number }
  | { type: 'SET_DURATION'; value: number }
  | { type: 'SET_SPEED'; value: number }
  | { type: 'SET_REVERB'; value: number }
  | { type: 'SET_VOLUME'; value: number }
  | { type: 'SET_BASS'; value: number }
  | { type: 'RESET' }
  | { type: 'NEW_TRACK_RESET' };

const audioReducer = (state: AudioState, action: AudioAction): AudioState => {
  switch (action.type) {
    case 'SET_PLAYING': return { ...state, isPlaying: action.value };
    case 'SET_PROGRESS': return { ...state, progress: action.value };
    case 'SET_TIME': return { ...state, currentTime: action.current, progress: action.progress };
    case 'SET_DURATION': return { ...state, duration: action.value };
    case 'SET_SPEED': return { ...state, speed: action.value };
    case 'SET_REVERB': return { ...state, reverb: action.value };
    case 'SET_VOLUME': return { ...state, volume: action.value };
    case 'SET_BASS': return { ...state, bass: action.value };
    case 'RESET': return {
      isPlaying: false, progress: 0, currentTime: 0, duration: 0,
      speed: AUDIO_CONFIG.DEFAULT_SPEED, 
      reverb: AUDIO_CONFIG.DEFAULT_REVERB, 
      volume: AUDIO_CONFIG.DEFAULT_VOLUME,
      bass: AUDIO_CONFIG.DEFAULT_BASS,
    };
    case 'NEW_TRACK_RESET': return {
      ...state,
      isPlaying: false,
      progress: 0,
      currentTime: 0,
      duration: 0,
    };
    default: return state;
  }
};

// --- CUSTOM HOOKS --- //
const useFileHandler = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleFile = useCallback((file: File, onSelect: (file: File) => void) => {
    onSelect(file);
  }, []);

  const openFilePicker = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return { fileInputRef, handleFile, openFilePicker };
};

const useSliderTouchLock = () => {
  const onPointerDown = useCallback(() => {
    document.body.classList.add('overflow-hidden');
    const onPointerUp = () => {
      document.body.classList.remove('overflow-hidden');
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    };
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
  }, []);
  return onPointerDown;
};

function useThrottledCallback<A extends any[]>(
  callback: (...args: A) => void,
  delay: number
) {
  const callbackRef = useRef(callback);
  const throttleRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  return useCallback((...args: A) => {
    if (!throttleRef.current) {
      callbackRef.current(...args);
      throttleRef.current = setTimeout(() => {
        throttleRef.current = null;
      }, delay);
    }
  }, [delay]);
}

const usePresets = () => {
  const [presets, setPresets] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('fluxos-presets');
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.error("Error reading presets from localStorage", error);
      return [];
    }
  });

  const savePreset = useCallback((name: string, settings: Omit<AudioState, 'isPlaying' | 'progress' | 'currentTime' | 'duration'>) => {
    const newPreset = { id: Date.now(), name, settings };
    const updatedPresets = [...presets, newPreset];
    setPresets(updatedPresets);
    localStorage.setItem('fluxos-presets', JSON.stringify(updatedPresets));
  }, [presets]);

  const deletePreset = useCallback((id: number) => {
    const updatedPresets = presets.filter(p => p.id !== id);
    setPresets(updatedPresets);
    localStorage.setItem('fluxos-presets', JSON.stringify(updatedPresets));
  }, [presets]);

  return { presets, savePreset, deletePreset };
};

const useAudioPlayer = (audioFile: File | null) => {
  const [state, dispatch] = useReducer(audioReducer, {
    isPlaying: false,
    progress: 0,
    currentTime: 0,
    duration: 0,
    speed: AUDIO_CONFIG.DEFAULT_SPEED,
    reverb: AUDIO_CONFIG.DEFAULT_REVERB,
    volume: AUDIO_CONFIG.DEFAULT_VOLUME,
    bass: AUDIO_CONFIG.DEFAULT_BASS,
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
  }>({});
  const timeRef = useRef({ start: 0, pause: 0 });

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

  const setupAudioGraph = useCallback(() => {
    if (!audioContextRef.current || !audioBufferRef.current) return;
    const ctx = audioContextRef.current;
    
    const source = ctx.createBufferSource();
    source.buffer = audioBufferRef.current;
    source.playbackRate.value = state.speed;
    source.loop = true;
    sourceNodeRef.current = source;

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

    source.connect(dryGain);
    source.connect(wetGain);
    wetGain.connect(convolver);
    dryGain.connect(mainGain);
    convolver.connect(mainGain);
    mainGain.connect(bassBoost);
    bassBoost.connect(ctx.destination);

    nodesRef.current = { convolver, wetGain, dryGain, mainGain, bassBoost };
  }, [state.speed, state.reverb, state.volume, state.bass, createImpulseResponse]);

  const play = useCallback(() => {
    if (!audioContextRef.current || !audioBufferRef.current) return;
    
    setupAudioGraph();
    const source = sourceNodeRef.current;
    if (!source) return;

    const offset = Math.max(0, timeRef.current.pause);
    if (offset >= audioBufferRef.current.duration) return;

    source.start(0, offset);
    timeRef.current.start = audioContextRef.current.currentTime;
    dispatch({ type: 'SET_PLAYING', value: true });
  }, [setupAudioGraph]);

  const pause = useCallback(() => {
    if (!sourceNodeRef.current || !audioContextRef.current || !state.isPlaying) return;

    const elapsed = (audioContextRef.current.currentTime - timeRef.current.start) * state.speed;
    try { sourceNodeRef.current.stop(); } catch(e) {}
    
    timeRef.current.pause = Math.min(
      timeRef.current.pause + elapsed,
      audioBufferRef.current?.duration || 0
    );
    
    dispatch({ type: 'SET_PLAYING', value: false });
  }, [state.speed, state.isPlaying]);

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

    if (state.isPlaying) {
      try { sourceNodeRef.current?.stop(); } catch(e) {}
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
    
    sourceNodeRef.current?.stop?.();
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

    return () => { audioContextRef.current?.close(); };
  }, [audioFile, generateWaveform]);

  // Update UI during playback
  useEffect(() => {
    if (!state.isPlaying) return;

    let frameId: number;
    const updateUI = () => {
      if (!audioContextRef.current || !audioBufferRef.current || !state.isPlaying) {
        return;
      }

      const elapsed = (audioContextRef.current.currentTime - timeRef.current.start) * state.speed;
      const current = timeRef.current.pause + elapsed;
      const total = audioBufferRef.current.duration;

      if (current >= total) {
        try {
          sourceNodeRef.current?.stop();
        } catch (e) {
          // Ignora erros, o nó pode já ter sido parado.
        }
        
        // Reinicia o tempo e toca novamente do início.
        timeRef.current.pause = 0;
        play(); 
        return; 
      } else {
        dispatch({ type: 'SET_TIME', current, progress: (current / total) * 100 });
        frameId = requestAnimationFrame(updateUI);
      }
    };

    frameId = requestAnimationFrame(updateUI);
    return () => cancelAnimationFrame(frameId);
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
  };
};

// --- MEMOIZED COMPONENTS --- //
const Dropzone = memo<{ onFileSelect: (file: File) => void }>(({ onFileSelect }) => {
  const { fileInputRef, handleFile } = useFileHandler();

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files?.[0]) {
      handleFile(e.dataTransfer.files[0], onFileSelect);
    }
  }, [handleFile, onFileSelect]);

  return (
    <div 
      className="w-full max-w-lg h-64 border-2 border-dashed border-zinc-300 dark:border-zinc-600 rounded-2xl flex flex-col justify-center items-center text-center p-8 cursor-pointer transition-colors hover:border-accent dark:hover:border-accent hover:bg-zinc-50 dark:hover:bg-dark-bg-secondary"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0], onFileSelect)}
      />
      <icons.Upload className="w-16 h-16 text-accent mb-4" />
      <p className="text-zinc-600 dark:text-zinc-300 font-semibold">Drag and drop or click to upload</p>
      <p className="text-zinc-400 dark:text-zinc-500 text-sm mt-1">Audio files up to 100MB</p>
    </div>
  );
});

const Slider = memo<{
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  unit: string;
}>(({ label, value, onChange, min, max, step, unit }) => {
  const onPointerDown = useSliderTouchLock();
  const percentage = ((value - min) / (max - min)) * 100;
  const displayValue = label === 'Speed' && step < 0.1 ? value.toFixed(2) : value.toFixed(label === 'Speed' ? 1 : 0);

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-1">
        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{label}</label>
        <span className="text-sm text-zinc-500 dark:text-zinc-400 font-mono">{displayValue}{unit}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onPointerDown={onPointerDown}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer slider-thumb"
        style={{ background: `linear-gradient(to right, #d946ef ${percentage}%, rgb(203 213 225) ${percentage}%)` }}
      />
    </div>
  );
});

const PlayerControls = memo<{
  isPlaying: boolean;
  onTogglePlay: () => void;
}>(({ isPlaying, onTogglePlay }) => (
  <div className="flex items-center space-x-6 mt-4">
    <button className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-white transition-colors">
      <icons.SkipPrevious className="w-8 h-8" />
    </button>
    <button 
      onClick={onTogglePlay}
      className="w-16 h-16 bg-accent text-white rounded-full flex items-center justify-center shadow-lg hover:bg-accent-hover transition-transform active:scale-95"
    >
      {isPlaying ? <icons.Pause className="w-8 h-8" /> : <icons.Play className="w-8 h-8" />}
    </button>
    <button className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-white transition-colors">
      <icons.SkipNext className="w-8 h-8" />
    </button>
  </div>
));

const Waveform = memo<{
  data: number[];
  progress: number;
  onSeek: (progress: number) => void;
}>(({ data, progress, onSeek }) => (
  <div 
    className="relative w-full h-24 bg-light-bg-secondary dark:bg-dark-bg-secondary rounded-lg flex items-end gap-px overflow-hidden cursor-pointer"
    onClick={(e) => {
      const rect = e.currentTarget.getBoundingClientRect();
      onSeek(Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100)));
    }}
  >
    {data.map((height, i) => (
      <div key={i} className="flex-1 bg-zinc-300 dark:bg-zinc-600 rounded-sm" style={{ height: `${height * 100}%` }} />
    ))}
    <div className="absolute top-0 bottom-0 w-0.5 bg-accent" style={{ left: `${progress}%` }} />
  </div>
));

const SettingsModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  presets: any[];
  onSave: (name: string) => void;
  onLoad: (settings: any) => void;
  onDelete: (id: number) => void;
}> = ({ isOpen, onClose, presets, onSave, onLoad, onDelete }) => {
  const [name, setName] = useState('');

  if (!isOpen) return null;

  const handleSave = () => {
    if (name.trim()) {
      onSave(name.trim());
      setName('');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
      <div className="bg-light-bg dark:bg-dark-bg-secondary w-full max-w-md rounded-2xl shadow-2xl p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-zinc-800 dark:text-zinc-100">Presets</h2>
          <button onClick={onClose} className="p-2 rounded-full text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">
            <icons.Close className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <h3 className="text-md font-semibold text-zinc-700 dark:text-zinc-300">Save Current Settings</h3>
          <div className="flex gap-2">
            <input 
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Preset name..."
              className="flex-1 bg-zinc-100 dark:bg-zinc-700 border border-zinc-300 dark:border-zinc-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
            <button 
              onClick={handleSave}
              className="px-4 py-2 bg-accent text-white font-semibold rounded-lg hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!name.trim()}
            >
              Save
            </button>
          </div>
        </div>

        <hr className="my-6 border-zinc-200 dark:border-zinc-700" />

        <div className="space-y-3">
          <h3 className="text-md font-semibold text-zinc-700 dark:text-zinc-300">Load Preset</h3>
          {presets.length > 0 ? (
            <ul className="max-h-60 overflow-y-auto space-y-2 pr-2">
              {presets.map(preset => (
                <li key={preset.id} className="flex items-center justify-between bg-zinc-100 dark:bg-zinc-700/50 p-3 rounded-lg">
                  <span className="font-medium text-sm text-zinc-800 dark:text-zinc-200">{preset.name}</span>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => onLoad(preset.settings)}
                      className="px-3 py-1 text-sm bg-zinc-200 dark:bg-zinc-600 text-zinc-700 dark:text-zinc-200 font-semibold rounded-md hover:bg-zinc-300 dark:hover:bg-zinc-500 transition-colors"
                    >
                      Load
                    </button>
                    <button 
                      onClick={() => onDelete(preset.id)}
                      className="p-2 text-zinc-500 dark:text-zinc-400 hover:text-red-500 dark:hover:text-red-500 transition-colors"
                    >
                      <icons.Trash className="w-4 h-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center py-4">No saved presets.</p>
          )}
        </div>
      </div>
    </div>
  );
};

// --- PAGES --- //
const LandingPage = memo<{ onFileSelect: (file: File) => void }>(({ onFileSelect }) => (
  <div className="min-h-screen flex flex-col justify-center items-center p-4 text-center">
    <h1 className="text-4xl md:text-5xl font-bold text-zinc-800 dark:text-zinc-100 mb-2">Fluxos</h1>
    <p className="text-lg text-zinc-500 dark:text-zinc-400 mb-12">Seu laboratório de música pessoal.</p>
    <Dropzone onFileSelect={onFileSelect} />
  </div>
));

const EditorPage: React.FC<{ 
  track: Track;
  audioFile: File;
  onFileSelect: (file: File) => void;
}> = ({ track, audioFile, onFileSelect }) => {
  const [isRendering, setIsRendering] = useState(false);
  const { fileInputRef, handleFile } = useFileHandler();
  const onSeekPointerDown = useSliderTouchLock();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  const player = useAudioPlayer(audioFile);
  const { presets, savePreset, deletePreset } = usePresets();

  const throttledSetSpeed = useThrottledCallback(player.setSpeed, 50);

  const handleDownload = useCallback(async () => {
    setIsRendering(true);
    await player.download(track.name);
    setIsRendering(false);
  }, [player, track.name]);

  const handleSavePreset = (name: string) => {
    const { speed, reverb, volume, bass } = player;
    savePreset(name, { speed, reverb, volume, bass });
  };

  const handleLoadPreset = (settings: any) => {
    player.setSpeed(settings.speed);
    player.setReverb(settings.reverb);
    player.setVolume(settings.volume);
    player.setBass(settings.bass);
    setIsSettingsOpen(false);
  };

  const progressBarStyle = useMemo(() => ({
    background: `linear-gradient(to right, #d946ef ${player.progress}%, rgb(203 213 225) ${player.progress}%)`
  }), [player.progress]);

  return (
    <div className="min-h-screen p-4 pb-32 md:p-8 md:pb-32 max-w-4xl mx-auto">
      <SettingsModal 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        presets={presets}
        onSave={handleSavePreset}
        onLoad={handleLoadPreset}
        onDelete={deletePreset}
      />

      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0], onFileSelect)}
      />

      <header className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-zinc-800 dark:text-zinc-100">Fluxos</h1>
        <div className="flex items-center space-x-2">
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 rounded-full text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-dark-bg-secondary transition-colors"
          >
            <icons.Settings className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="space-y-10">
        <section className="flex flex-col items-center text-center">
          <img 
            src={track.coverUrl} 
            alt="Album Cover" 
            className="w-48 h-48 md:w-64 md:h-64 rounded-xl shadow-lg mb-6 cursor-pointer transition-transform hover:scale-105"
            onClick={() => fileInputRef.current?.click()}
          />
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">{track.name}</h2>
          <p className="text-md text-zinc-500 dark:text-zinc-400 mb-6">{track.artist}</p>
          
          <div className="w-full max-w-md">
            <input
              type="range"
              min="0"
              max="100"
              step="0.1"
              value={player.progress}
              onPointerDown={onSeekPointerDown}
              onChange={(e) => player.seek(Number(e.target.value))}
              className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer slider-thumb"
              style={progressBarStyle}
            />
            <div className="flex justify-between text-xs text-zinc-500 dark:text-zinc-400 mt-1.5 font-mono">
              <span>{formatTime(player.currentTime / player.speed)}</span>
              <span>{formatTime(player.duration / player.speed)}</span>
            </div>
          </div>
          
          <PlayerControls isPlaying={player.isPlaying} onTogglePlay={player.togglePlayPause} />
        </section>

        <section>
          <Waveform data={player.visualizerData} progress={player.progress} onSeek={player.seek} />
        </section>

        {presets.length > 0 && (
          <section className="text-center">
            <h3 className="text-lg font-semibold text-zinc-800 dark:text-zinc-100 mb-4">Quick Presets</h3>
            <div className="flex justify-center items-center flex-wrap gap-3">
              {presets.map(preset => (
                <button
                  key={preset.id}
                  onClick={() => handleLoadPreset(preset.settings)}
                  className="px-4 py-2 bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-100 font-semibold rounded-lg hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors text-sm"
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </section>
        )}

        <section className="bg-light-bg-secondary dark:bg-dark-bg-secondary p-4 md:p-6 rounded-xl">
          <h3 className="text-lg font-semibold text-zinc-800 dark:text-zinc-100 mb-4">Audio Effects</h3>
          <div className="space-y-6">
            <Slider label="Speed" value={player.speed} onChange={throttledSetSpeed} 
              min={AUDIO_CONFIG.MIN_SPEED} max={AUDIO_CONFIG.MAX_SPEED} step={AUDIO_CONFIG.SPEED_STEP} unit="x" />
            <Slider label="Reverb" value={player.reverb} onChange={player.setReverb} 
              min={0} max={100} step={5} unit="%" />
            <Slider label="Volume" value={player.volume} onChange={player.setVolume} 
              min={0} max={200} step={1} unit="%" />
            <Slider label="Bass Boost" value={player.bass} onChange={player.setBass} 
              min={0} max={100} step={1} unit="%" />
          </div>
        </section>
      </main>
      
      <footer className="fixed bottom-0 left-0 right-0 bg-light-bg-secondary/80 dark:bg-dark-bg-secondary/80 backdrop-blur-sm border-t border-zinc-200 dark:border-zinc-700">
        <div className="max-w-4xl mx-auto p-4 flex justify-center items-center space-x-4">
          <button 
            onClick={handleDownload}
            disabled={isRendering}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-100 font-semibold hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRendering ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Rendering...
              </>
            ) : (
              <>
                <icons.Download className="w-5 h-5" />
                Download
              </>
            )}
          </button>
          <button className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-accent text-white font-semibold hover:bg-accent-hover transition-colors">
            <icons.Share className="w-5 h-5" />
            Share
          </button>
        </div>
      </footer>
    </div>
  );
};

// --- MAIN APP --- //
export default function App() {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [track, setTrack] = useState<Track | null>(null);

  useEffect(() => {
    document.documentElement.classList.add('dark');
    document.documentElement.style.backgroundColor = '#1a1a1a';
  }, []);

  const handleFileSelect = useCallback((file: File) => {
    setAudioFile(file);
    setTrack({
      name: file.name.replace(/\.[^/.]+$/, ""),
      artist: 'Unknown Artist',
      coverUrl: `https://picsum.photos/seed/${encodeURIComponent(file.name)}/300/300`
    });

    (window as any).jsmediatags.read(file, {
      onSuccess: (tag: any) => {
        let coverUrl = `https://picsum.photos/seed/${encodeURIComponent(file.name)}/300/300`;
        if (tag.tags.picture) {
          const { data, format } = tag.tags.picture;
          let base64String = "";
          for (let i = 0; i < data.length; i++) {
            base64String += String.fromCharCode(data[i]);
          }
          coverUrl = `data:${format};base64,${window.btoa(base64String)}`;
        }
        setTrack({
          name: tag.tags.title || file.name.replace(/\.[^/.]+$/, ""),
          artist: tag.tags.artist || 'Unknown Artist',
          coverUrl: coverUrl
        });
      },
      onError: (error: any) => {
        console.error("Could not read audio tags, using fallback.", error);
        setTrack({
          name: file.name.replace(/\.[^/.]+$/, ""),
          artist: 'Unknown Artist',
          coverUrl: `https://picsum.photos/seed/${encodeURIComponent(file.name)}/300/300`
        });
      }
    });
  }, []);

  return (
    <div className="bg-light-bg dark:bg-dark-bg min-h-screen text-zinc-900 dark:text-zinc-100 transition-colors duration-300">
      {!audioFile || !track ? (
        <LandingPage onFileSelect={handleFileSelect} />
      ) : (
        <EditorPage 
          audioFile={audioFile} 
          track={track} 
          onFileSelect={handleFileSelect} 
        />
      )}
    </div>
  );
}
