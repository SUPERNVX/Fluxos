import { useState, useEffect, useCallback, useRef, useReducer } from 'react';
import type { AudioNodes } from '../types/audio';
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
import { createFlangerEffect, createTremoloEffect, createBitCrusher, createOverdriveEffect, createDistortionEffect, createMuffleEffect } from '../utils/effects';
import { createImpulseResponse as makeImpulseResponse, createBinauralImpulseResponse as makeBinauralImpulseResponse } from '../utils/effects/reverb';
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
  const sourceStartedRef = useRef<boolean>(false);
  const timeRef = useRef({ start: 0, pause: 0 });
  const animationFrameRef = useRef<number>(0);
  const eightDAngleRef = useRef(0); // Para animação automática do 8D

  const createImpulseResponse = useCallback((context: AudioContext | OfflineAudioContext, reverbType: 'default' | 'hall' | 'room' | 'plate' = 'default') => {
    return makeImpulseResponse(context, reverbType);
  }, []);

  // Função específica para criar impulse response binaural com roomSize e damping
  const createBinauralImpulseResponse = useCallback((context: AudioContext | OfflineAudioContext, roomSize: number, damping: number) => {
    return makeBinauralImpulseResponse(context, roomSize, damping);
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

    Object.values(audioNodesRef.current).forEach(node => {
      if (node && 'disconnect' in node) try { (node as AudioNode).disconnect(); } catch { /* intentionally ignored */ }
      else if (node && 'input' in node) {
        try { (node as {input: AudioNode, output: AudioNode}).input.disconnect(); } catch { /* intentionally ignored */ }
        try { (node as {input: AudioNode, output: AudioNode}).output.disconnect(); } catch { /* intentionally ignored */ }
      }
    });
    audioNodesRef.current = {};

    const mainGain = ctx.createGain();
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
    const dryGain = ctx.createGain();

    audioNodesRef.current = {
      mainGain, defaultConvolver, hallConvolver, roomConvolver, plateConvolver,
      defaultReverbGain, hallReverbGain, roomReverbGain, plateReverbGain,
      dryGain,
    };

    defaultReverbGain.connect(defaultConvolver).connect(mainGain);
    hallReverbGain.connect(hallConvolver).connect(mainGain);
    roomReverbGain.connect(roomConvolver).connect(mainGain);
    plateReverbGain.connect(plateConvolver).connect(mainGain);
    dryGain.connect(mainGain);

    let currentNode: AudioNode = mainGain;

    // --- CADEIA DE EFEITOS COM BYPASS (Explícito) ---

    // Flanger
    {
      const effectNode = createFlangerEffect(ctx, 0,0,0,0);
      const wetGain = ctx.createGain(); wetGain.gain.value = 0;
      const dryGain = ctx.createGain(); dryGain.gain.value = 1;
      const merger = ctx.createGain();
      currentNode.connect(effectNode.input);
      effectNode.output.connect(wetGain);
      currentNode.connect(dryGain);
      wetGain.connect(merger);
      dryGain.connect(merger);
      currentNode = merger;
      audioNodesRef.current.flanger = effectNode;
      audioNodesRef.current.flangerWetGain = wetGain;
      audioNodesRef.current.flangerDryGain = dryGain;
    }
    // Tremolo
    {
        const effectNode = createTremoloEffect(ctx, 0, 0, 'sine');
        const wetGain = ctx.createGain(); wetGain.gain.value = 0;
        const dryGain = ctx.createGain(); dryGain.gain.value = 1;
        const merger = ctx.createGain();
        currentNode.connect(effectNode.input);
        effectNode.output.connect(wetGain);
        currentNode.connect(dryGain);
        wetGain.connect(merger);
        dryGain.connect(merger);
        currentNode = merger;
        audioNodesRef.current.tremolo = effectNode;
        audioNodesRef.current.tremoloWetGain = wetGain;
        audioNodesRef.current.tremoloDryGain = dryGain;
    }
    // Overdrive
    {
        const effectNode = createOverdriveEffect(ctx, 0, 0, 0);
        const wetGain = ctx.createGain(); wetGain.gain.value = 0;
        const dryGain = ctx.createGain(); dryGain.gain.value = 1;
        const merger = ctx.createGain();
        currentNode.connect(effectNode.input);
        effectNode.output.connect(wetGain);
        currentNode.connect(dryGain);
        wetGain.connect(merger);
        dryGain.connect(merger);
        currentNode = merger;
        audioNodesRef.current.overdrive = effectNode;
        audioNodesRef.current.overdriveWetGain = wetGain;
        audioNodesRef.current.overdriveDryGain = dryGain;
    }
    // Distortion
    {
        const effectNode = createDistortionEffect(ctx, 0, 0, 0);
        const wetGain = ctx.createGain(); wetGain.gain.value = 0;
        const dryGain = ctx.createGain(); dryGain.gain.value = 1;
        const merger = ctx.createGain();
        currentNode.connect(effectNode.input);
        effectNode.output.connect(wetGain);
        currentNode.connect(dryGain);
        wetGain.connect(merger);
        dryGain.connect(merger);
        currentNode = merger;
        audioNodesRef.current.distortion = effectNode;
        audioNodesRef.current.distortionWetGain = wetGain;
        audioNodesRef.current.distortionDryGain = dryGain;
    }
    // Bitcrusher
    {
        const effectNode = createBitCrusher(ctx, 16, 44100);
        const wetGain = ctx.createGain(); wetGain.gain.value = 0;
        const dryGain = ctx.createGain(); dryGain.gain.value = 1;
        const merger = ctx.createGain();
        currentNode.connect(effectNode.input);
        effectNode.output.connect(wetGain);
        currentNode.connect(dryGain);
        wetGain.connect(merger);
        dryGain.connect(merger);
        currentNode = merger;
        audioNodesRef.current.bitcrusher = effectNode;
        audioNodesRef.current.bitcrusherWetGain = wetGain;
        audioNodesRef.current.bitcrusherDryGain = dryGain;
    }
    // Muffle
    {
        const effectNode = createMuffleEffect(ctx, 0);
        const wetGain = ctx.createGain(); wetGain.gain.value = 0;
        const dryGain = ctx.createGain(); dryGain.gain.value = 1;
        const merger = ctx.createGain();
        currentNode.connect(effectNode).connect(wetGain);
        currentNode.connect(dryGain);
        wetGain.connect(merger);
        dryGain.connect(merger);
        currentNode = merger;
        audioNodesRef.current.muffle = effectNode;
        audioNodesRef.current.muffleWetGain = wetGain;
        audioNodesRef.current.muffleDryGain = dryGain;
    }
    // Binaural
    {
        const effectNode = { convolver: ctx.createConvolver(), gain: ctx.createGain() };
        effectNode.convolver.buffer = createBinauralImpulseResponse(ctx, 0, 0);
        const wetGain = ctx.createGain(); wetGain.gain.value = 0;
        const dryGain = ctx.createGain(); dryGain.gain.value = 1;
        const merger = ctx.createGain();
        currentNode.connect(effectNode.convolver).connect(effectNode.gain).connect(wetGain);
        currentNode.connect(dryGain);
        wetGain.connect(merger);
        dryGain.connect(merger);
        currentNode = merger;
        audioNodesRef.current.binauralProcessor = effectNode;
        audioNodesRef.current.binauralWetGain = wetGain;
        audioNodesRef.current.binauralDryGain = dryGain;
    }
    // 8D
    {
        const effectNode = createEightDPanner(ctx);
        const wetGain = ctx.createGain(); wetGain.gain.value = 0;
        const dryGain = ctx.createGain(); dryGain.gain.value = 1;
        const merger = ctx.createGain();
        currentNode.connect(effectNode).connect(wetGain);
        currentNode.connect(dryGain);
        wetGain.connect(merger);
        dryGain.connect(merger);
        currentNode = merger;
        audioNodesRef.current.eightDPanner = effectNode;
        audioNodesRef.current.eightDWetGain = wetGain;
        audioNodesRef.current.eightDDryGain = dryGain;
    }
    // Bass Boost
    {
        const effectNode = ctx.createBiquadFilter();
        effectNode.type = 'lowshelf';
        effectNode.frequency.setValueAtTime(AUDIO_CONFIG.BASS_BOOST_FREQUENCY, 0);
        const wetGain = ctx.createGain(); wetGain.gain.value = 0;
        const dryGain = ctx.createGain(); dryGain.gain.value = 1;
        const merger = ctx.createGain();
        currentNode.connect(effectNode).connect(wetGain);
        currentNode.connect(dryGain);
        wetGain.connect(merger);
        dryGain.connect(merger);
        currentNode = merger;
        audioNodesRef.current.bassBoost = effectNode;
        audioNodesRef.current.bassWetGain = wetGain;
        audioNodesRef.current.bassDryGain = dryGain;
    }

    currentNode.connect(ctx.destination);

  }, [createImpulseResponse, createBinauralImpulseResponse, createEightDPanner]);


  const play = useCallback((offset: number = 0) => {
    if (!audioContextRef.current || !audioBufferRef.current) return;
    const ctx = audioContextRef.current;

    if (sourceNodeRef.current && sourceStartedRef.current) {
      try {
        sourceNodeRef.current.onended = null; // Prevent looping on manual stop
        sourceNodeRef.current.stop();
      } catch {
        // Source may already be stopped, which is fine
      }
    }
    sourceStartedRef.current = false;

    const source = ctx.createBufferSource();
    source.buffer = audioBufferRef.current;
    source.playbackRate.value = state.speed;
    sourceNodeRef.current = source;

    // Connect to the graph entry points
    const { dryGain, defaultReverbGain, hallReverbGain, roomReverbGain, plateReverbGain } = audioNodesRef.current;
    if (dryGain) source.connect(dryGain);
    if (defaultReverbGain) source.connect(defaultReverbGain);
    if (hallReverbGain) source.connect(hallReverbGain);
    if (roomReverbGain) source.connect(roomReverbGain);
    if (plateReverbGain) source.connect(plateReverbGain);
    
    const cappedOffset = Math.max(0, Math.min(offset, audioBufferRef.current.duration));
    
    source.onended = () => {
      // Only loop if it was playing and not stopped manually
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
  }, [state.speed]);

  const pause = useCallback(() => {
    if (!sourceNodeRef.current || !audioContextRef.current || !sourceStartedRef.current) return;
    
    const elapsed = (audioContextRef.current.currentTime - timeRef.current.start) * state.speed;
    timeRef.current.pause += elapsed;

    sourceNodeRef.current.onended = null; // Prevent looping on manual pause
    try {
      sourceNodeRef.current.stop();
    } catch {
      // Ignore if already stopped
    }
    sourceStartedRef.current = false;

    dispatch({ type: 'SET_PLAYING', value: false });
  }, [state.speed]);

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
        if (sourceStartedRef.current) {
          sourceNodeRef.current.stop();
        }
      } catch (error) {
        console.warn('Stop error:', error);
      }
      sourceNodeRef.current = null;
      sourceStartedRef.current = false;
    }
    
    // Disconnect and clean up existing audio nodes
    Object.values(audioNodesRef.current).forEach(node => {
      if (node && typeof node === 'object' && 'disconnect' in node) {
        const audioNode = node as AudioNode;
                  try {
                    audioNode.disconnect();
                  } catch (error) {
                    console.warn('Error disconnecting audio node:', error);
                  }      }
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
          if (sourceStartedRef.current) {
            sourceNodeRef.current.stop();
          }
        } catch (error) {
          console.warn('Cleanup stop error:', error);
        }
        sourceNodeRef.current = null;
        sourceStartedRef.current = false;
      }
      
      // Clean up all audio nodes
      Object.values(audioNodesRef.current).forEach(node => {
        if (node && typeof node === 'object' && 'disconnect' in node) {
          const audioNode = node as AudioNode;
          try {
            audioNode.disconnect();
          } catch (error) {
            console.warn('Error disconnecting audio node during cleanup:', error);
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

  // Update audio nodes em tempo real
  const rampTime = 0.05;

  // Update speed
  useEffect(() => {
    if (sourceNodeRef.current?.playbackRate) {
      const now = audioContextRef.current?.currentTime || 0;
      sourceNodeRef.current.playbackRate.linearRampToValueAtTime(state.speed, now + rampTime);
    }
  }, [state.speed]);
  
  // Update Volume, Reverb
  useEffect(() => {
    const { mainGain, dryGain, defaultReverbGain, hallReverbGain, roomReverbGain, plateReverbGain } = audioNodesRef.current;
    if (!audioContextRef.current || !mainGain || !dryGain || !defaultReverbGain || !hallReverbGain || !roomReverbGain || !plateReverbGain) return;
    const now = audioContextRef.current.currentTime;
    mainGain.gain.linearRampToValueAtTime(state.volume / 100, now + rampTime);
    const reverbValue = state.reverb / 100;
    dryGain.gain.linearRampToValueAtTime(1 - reverbValue, now + rampTime);
    defaultReverbGain.gain.linearRampToValueAtTime(state.reverbType === 'default' ? reverbValue : 0, now + rampTime);
    hallReverbGain.gain.linearRampToValueAtTime(state.reverbType === 'hall' ? reverbValue : 0, now + rampTime);
    roomReverbGain.gain.linearRampToValueAtTime(state.reverbType === 'room' ? reverbValue : 0, now + rampTime);
    plateReverbGain.gain.linearRampToValueAtTime(state.reverbType === 'plate' ? reverbValue : 0, now + rampTime);
  }, [state.volume, state.reverb, state.reverbType]);

  // Update Bass
  useEffect(() => {
    const { bassBoost, bassWetGain, bassDryGain } = audioNodesRef.current;
    if (!audioContextRef.current || !bassBoost || !bassWetGain || !bassDryGain) return;
    const now = audioContextRef.current.currentTime;
    const bassGainValue = state.bass / 100 * AUDIO_CONFIG.BASS_BOOST_MAX_GAIN;
    bassBoost.gain.linearRampToValueAtTime(bassGainValue, now + rampTime);
    const isBassActive = state.bass > 0;
    bassWetGain.gain.linearRampToValueAtTime(isBassActive ? 1 : 0, now + rampTime);
    bassDryGain.gain.linearRampToValueAtTime(isBassActive ? 0 : 1, now + rampTime);
  }, [state.bass]);
  
  // Update Flanger
  useEffect(() => {
    const { flanger, flangerWetGain, flangerDryGain } = audioNodesRef.current;
    if (!audioContextRef.current || !flanger || !flangerWetGain || !flangerDryGain) return;
    const now = audioContextRef.current.currentTime;
    flanger.updateRate?.(state.modulation.flanger.rate);
    flanger.updateDepth?.(state.modulation.flanger.depth);
    flanger.updateFeedback?.(state.modulation.flanger.feedback);
    flangerWetGain.gain.linearRampToValueAtTime(state.modulation.flanger.enabled ? 1 : 0, now + rampTime);
    flangerDryGain.gain.linearRampToValueAtTime(state.modulation.flanger.enabled ? 0 : 1, now + rampTime);
  }, [state.modulation.flanger]);
  
  // Update Tremolo
  useEffect(() => {
    const { tremolo, tremoloWetGain, tremoloDryGain } = audioNodesRef.current;
    if (!audioContextRef.current || !tremolo || !tremoloWetGain || !tremoloDryGain) return;
    const now = audioContextRef.current.currentTime;
    tremolo.updateRate?.(state.modulation.tremolo.rate);
    tremolo.updateDepth?.(state.modulation.tremolo.depth);
    tremolo.updateShape?.(state.modulation.tremolo.shape);
    tremoloWetGain.gain.linearRampToValueAtTime(state.modulation.tremolo.enabled ? 1 : 0, now + rampTime);
    tremoloDryGain.gain.linearRampToValueAtTime(state.modulation.tremolo.enabled ? 0 : 1, now + rampTime);
  }, [state.modulation.tremolo]);

  // Update Overdrive
  useEffect(() => {
    const { overdrive, overdriveWetGain, overdriveDryGain } = audioNodesRef.current;
    if (!audioContextRef.current || !overdrive || !overdriveWetGain || !overdriveDryGain) return;
    const now = audioContextRef.current.currentTime;
    overdrive.updateAmount?.(state.distortion.overdrive.gain);
    if(overdrive.toneFilter) overdrive.toneFilter.frequency.linearRampToValueAtTime(1000 + (state.distortion.overdrive.tone / 100) * 4000, now + rampTime);
    if(overdrive.levelGain) overdrive.levelGain.gain.linearRampToValueAtTime(state.distortion.overdrive.level / 100, now + rampTime);
    overdriveWetGain.gain.linearRampToValueAtTime(state.distortion.overdrive.enabled ? 1 : 0, now + rampTime);
    overdriveDryGain.gain.linearRampToValueAtTime(state.distortion.overdrive.enabled ? 0 : 1, now + rampTime);
  }, [state.distortion.overdrive]);

  // Update Distortion
  useEffect(() => {
    const { distortion, distortionWetGain, distortionDryGain } = audioNodesRef.current;
    if (!audioContextRef.current || !distortion || !distortionWetGain || !distortionDryGain) return;
    const now = audioContextRef.current.currentTime;
    distortion.updateAmount?.(state.distortion.distortion.amount);
    if(distortion.toneFilter) distortion.toneFilter.frequency.linearRampToValueAtTime(1000 + (state.distortion.distortion.tone / 100) * 4000, now + rampTime);
    if(distortion.levelGain) distortion.levelGain.gain.linearRampToValueAtTime(state.distortion.distortion.level / 100, now + rampTime);
    distortionWetGain.gain.linearRampToValueAtTime(state.distortion.distortion.enabled ? 1 : 0, now + rampTime);
    distortionDryGain.gain.linearRampToValueAtTime(state.distortion.distortion.enabled ? 0 : 1, now + rampTime);
  }, [state.distortion.distortion]);

  // Update Bitcrusher
  useEffect(() => {
    const { bitcrusher, bitcrusherWetGain, bitcrusherDryGain } = audioNodesRef.current;
    if (!audioContextRef.current || !bitcrusher || !bitcrusherWetGain || !bitcrusherDryGain) return;
    const now = audioContextRef.current.currentTime;
    bitcrusher.updateBits?.(state.distortion.bitcrusher.bits);
    bitcrusher.updateSampleRate?.(state.distortion.bitcrusher.sampleRate);
    bitcrusherWetGain.gain.linearRampToValueAtTime(state.distortion.bitcrusher.enabled ? 1 : 0, now + rampTime);
    bitcrusherDryGain.gain.linearRampToValueAtTime(state.distortion.bitcrusher.enabled ? 0 : 1, now + rampTime);
  }, [state.distortion.bitcrusher]);
  
  // Update Muffle
  useEffect(() => {
    const { muffle, muffleWetGain, muffleDryGain } = audioNodesRef.current;
    if (!audioContextRef.current || !muffle || !muffleWetGain || !muffleDryGain) return;
    const now = audioContextRef.current.currentTime;
    const { enabled, intensity } = state.spatialAudio.muffle;
    muffleWetGain.gain.linearRampToValueAtTime(enabled ? 1 : 0, now + rampTime);
    muffleDryGain.gain.linearRampToValueAtTime(enabled ? 0 : 1, now + rampTime);
    if(enabled) {
      const maxFreq = 12000;
      const minFreq = 400;
      const frequency = maxFreq - (intensity / 100) * (maxFreq - minFreq);
      muffle.frequency.linearRampToValueAtTime(frequency, now + rampTime);
    }
  }, [state.spatialAudio.muffle]);

  // Update Binaural
  useEffect(() => {
    const { binauralProcessor, binauralWetGain, binauralDryGain } = audioNodesRef.current;
    const { enabled, roomSize, damping, width } = state.spatialAudio.binaural;
    
    if (!audioContextRef.current || !binauralProcessor || !binauralWetGain || !binauralDryGain) return;
    const now = audioContextRef.current.currentTime;

    binauralWetGain.gain.linearRampToValueAtTime(enabled ? 1 : 0, now + rampTime);
    binauralDryGain.gain.linearRampToValueAtTime(enabled ? 0 : 1, now + rampTime);
    
    if (enabled) {
        try {
            const newImpulse = createBinauralImpulseResponse(audioContextRef.current, roomSize, damping);
            binauralProcessor.convolver.buffer = newImpulse;
            binauralProcessor.gain.gain.setValueAtTime(width / 100, now);
        } catch (error) {
            console.warn('Error updating binaural parameters:', error);
        }
    }
  }, [state.spatialAudio.binaural, createBinauralImpulseResponse]);

  // Update 8D
  useEffect(() => {
    const { eightDPanner, eightDWetGain, eightDDryGain } = audioNodesRef.current;
    if (!audioContextRef.current || !eightDPanner || !eightDWetGain || !eightDDryGain) return;
    const now = audioContextRef.current.currentTime;
    const { enabled, manualPosition } = state.eightD;
    eightDWetGain.gain.linearRampToValueAtTime(enabled ? 1 : 0, now + rampTime);
    eightDDryGain.gain.linearRampToValueAtTime(enabled ? 0 : 1, now + rampTime);
    if(enabled) {
      const angleInRadians = (manualPosition * Math.PI) / 180;
      eightDPanner.positionX.linearRampToValueAtTime(Math.sin(angleInRadians), now + rampTime);
      eightDPanner.positionY.linearRampToValueAtTime(0, now + rampTime);
      eightDPanner.positionZ.linearRampToValueAtTime(Math.cos(angleInRadians), now + rampTime);
    }
  }, [state.eightD.enabled, state.eightD.manualPosition]);



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

  // Não reconstrói o grafo em toggles; usamos bypass com ganhos em tempo real

  return {
    ...state,
    visualizerData,
    togglePlayPause,
    seek,
    download: (trackName: string, onProgress?: (progress: number) => void) => download(trackName, onProgress),
    ...setEffectControls
  };
};