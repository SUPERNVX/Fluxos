import { useState, useEffect, useCallback, useRef } from 'react';
import { AUDIO_CONFIG } from '../constants/audioConfig';
import { ErrorHandler, ERROR_CODES } from '../utils/errorHandler';
import { MemoryManager } from '../utils/memoryManager';
import { useAudioLogic } from './useAudioLogic';
import { AudioEngine } from '../core/AudioEngine';

export const useAudioPlayer = (audioFile: File | null) => {
  const { state, dispatch, actions } = useAudioLogic();

  const [visualizerData, setVisualizerData] = useState<number[]>(() =>
    Array(AUDIO_CONFIG.WAVEFORM_SAMPLES).fill(0.05)
  );

  const audioEngineRef = useRef<AudioEngine | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const sourceStartedRef = useRef<boolean>(false);
  const timeRef = useRef({ start: 0, pause: 0 });
  const animationFrameRef = useRef<number>(0);

  const generateWaveform = useCallback((buffer: AudioBuffer) => {
    const channelData = buffer.getChannelData(0);
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
        // Fallback
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
        setVisualizerData(maxVal > 0 ? fallbackWaveform.map(v => v / maxVal) : fallbackWaveform);
      }
      worker.terminate();
    };

    worker.onerror = (error) => {
      console.error('Worker error:', error);
      worker.terminate();
    };
  }, []);

  const play = useCallback((offset: number = 0) => {
    if (!audioContextRef.current || !audioBufferRef.current || !audioEngineRef.current) return;
    const ctx = audioContextRef.current;

    if (sourceNodeRef.current && sourceStartedRef.current) {
      try {
        sourceNodeRef.current.onended = null;
        sourceNodeRef.current.stop();
      } catch { /* ignore */ }
    }
    sourceStartedRef.current = false;

    const source = ctx.createBufferSource();
    source.buffer = audioBufferRef.current;
    source.playbackRate.value = state.speed;
    sourceNodeRef.current = source;

    // Connect to AudioEngine
    audioEngineRef.current.connectSource(source);

    const cappedOffset = Math.max(0, Math.min(offset, audioBufferRef.current.duration));

    source.onended = () => {
      if (source === sourceNodeRef.current) {
        timeRef.current.pause = 0;
        play(0);
      }
    };

    source.start(0, cappedOffset);
    sourceStartedRef.current = true;
    timeRef.current.start = ctx.currentTime;
    timeRef.current.pause = cappedOffset;

    dispatch({ type: 'SET_PLAYING', value: true });
  }, [state.speed, dispatch]);

  const pause = useCallback(() => {
    if (!sourceNodeRef.current || !audioContextRef.current || !sourceStartedRef.current) return;

    const elapsed = (audioContextRef.current.currentTime - timeRef.current.start) * state.speed;
    timeRef.current.pause += elapsed;

    sourceNodeRef.current.onended = null;
    try {
      sourceNodeRef.current.stop();
    } catch { /* ignore */ }
    sourceStartedRef.current = false;

    dispatch({ type: 'SET_PLAYING', value: false });
  }, [state.speed, dispatch]);

  const togglePlayPause = useCallback(() => {
    if (audioContextRef.current?.state === 'suspended') {
      audioContextRef.current.resume();
    }
    if (state.isPlaying) {
      pause();
    } else {
      play(timeRef.current.pause);
    }
  }, [state.isPlaying, play, pause]);

  const seek = useCallback((newProgress: number) => {
    if (!audioBufferRef.current) return;

    const newTime = (newProgress / 100) * audioBufferRef.current.duration;
    timeRef.current.pause = newTime;
    dispatch({ type: 'SET_TIME', current: newTime, progress: newProgress });

    if (state.isPlaying) {
      play(newTime);
    }
  }, [state.isPlaying, play]);

  const download = useCallback(async (trackName: string, onProgress?: (progress: number) => void) => {
    if (!audioBufferRef.current || !audioEngineRef.current) return false;

    const blob = await audioEngineRef.current.renderOffline(audioBufferRef.current, state, onProgress);

    if (blob) {
      const url = URL.createObjectURL(blob);
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
    return false;
  }, [state]);

  // Load audio file
  useEffect(() => {
    if (!audioFile) return;

    // Cleanup
    if (sourceNodeRef.current) {
      try {
        if (sourceStartedRef.current) sourceNodeRef.current.stop();
      } catch { /* ignore */ }
      sourceNodeRef.current = null;
      sourceStartedRef.current = false;
    }

    dispatch({ type: 'NEW_TRACK_RESET' });
    timeRef.current = { start: 0, pause: 0 };

    // Initialize Context
    if (audioContextRef.current?.state === 'suspended') {
      audioContextRef.current.resume();
    } else if (!audioContextRef.current) {
      type WindowWithWebkitAudio = Window & { webkitAudioContext?: typeof AudioContext };
      const w = window as WindowWithWebkitAudio;
      // Use 'playback' latencyHint for smoother audio, especially in background/mobile
      const AudioCtx = window.AudioContext || w.webkitAudioContext!;
      audioContextRef.current = new AudioCtx({ latencyHint: 'playback' });
    }

    // Initialize Engine
    if (!audioEngineRef.current && audioContextRef.current) {
      audioEngineRef.current = new AudioEngine(audioContextRef.current, state);
    }

    audioFile.arrayBuffer().then(buffer => {
      const memoryStats = MemoryManager.checkMemoryUsage();
      if (memoryStats && memoryStats.memoryUsagePercentage > 96) {
        const fileSizeMB = audioFile.size / (1024 * 1024);
        if (fileSizeMB > 70 || memoryStats.memoryUsagePercentage > 98) {
          ErrorHandler.logError(
            ERROR_CODES.OUT_OF_MEMORY,
            'Memória insuficiente para carregar arquivo',
            `Uso atual: ${memoryStats.memoryUsagePercentage.toFixed(1)}%`,
            { fileName: audioFile.name }
          );
        }
        return Promise.reject(new Error('Insufficient memory'));
      }

      MemoryManager.registerResource(`audio-buffer-${Date.now()}`, 'audioBuffer', buffer, buffer.byteLength);
      return audioContextRef.current?.decodeAudioData(buffer);
    }).then(decoded => {
      if (!decoded) return;

      MemoryManager.registerResource(`decoded-buffer-${Date.now()}`, 'audioBuffer', decoded, decoded.length * decoded.numberOfChannels * 4);

      audioBufferRef.current = decoded;
      dispatch({ type: 'SET_DURATION', value: decoded.duration });
      generateWaveform(decoded);

      // Ensure engine is ready
      if (audioEngineRef.current) {
        // We don't need to connect source here, play() does it
      }
    }).catch(error => {
      console.error("Error loading audio:", error);
      ErrorHandler.logError(ERROR_CODES.AUDIO_DECODE_FAILED, 'Erro ao carregar áudio', error.message);
    });

    return () => {
      if (sourceNodeRef.current) {
        try { if (sourceStartedRef.current) sourceNodeRef.current.stop(); } catch { /* ignore */ }
      }
      // We don't close context here to avoid issues with fast switching, 
      // but in a real app we might want to manage this better.
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioFile, generateWaveform]);

  // Update Engine State
  useEffect(() => {
    if (audioEngineRef.current) {
      audioEngineRef.current.applyState(state);
    }
  }, [state]);

  // Update Speed (Source Node specific)
  useEffect(() => {
    if (sourceNodeRef.current?.playbackRate) {
      const now = audioContextRef.current?.currentTime || 0;
      sourceNodeRef.current.playbackRate.linearRampToValueAtTime(state.speed, now + 0.05);
    }
  }, [state.speed]);

  // 8D rotation logic moved to useAudioLogic


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
      if (!audioContextRef.current || !audioBufferRef.current) return;

      const elapsed = (audioContextRef.current.currentTime - timeRef.current.start) * state.speed;
      const current = timeRef.current.pause + elapsed;
      const total = audioBufferRef.current.duration;

      if (current >= total) {
        timeRef.current.pause = 0;
        timeRef.current.start = audioContextRef.current.currentTime;
        dispatch({ type: 'SET_TIME', current: 0, progress: 0 });
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


  return {
    ...state,
    visualizerData,
    togglePlayPause,
    seek,
    download,
    ...actions
  };
};