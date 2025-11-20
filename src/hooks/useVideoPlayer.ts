import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { audioReducer } from '../reducers/audioReducer';
import { AUDIO_CONFIG, DEFAULT_DISTORTION, DEFAULT_MODULATION, DEFAULT_SPATIAL_AUDIO } from '../constants/audioConfig';
import { createFlangerEffect, createTremoloEffect, createBitCrusher, createOverdriveEffect, createDistortionEffect, createMuffleEffect } from '../utils/effects';
import { createImpulseResponse as makeImpulseResponse, createBinauralImpulseResponse as makeBinauralImpulseResponse } from '../utils/effects/reverb';
import type { AudioNodes } from '../types/audio';

export const useVideoPlayer = (videoFile: File) => {
  const [state, dispatch] = useReducer(audioReducer, {
    isPlaying: false,
    progress: 0,
    currentTime: 0,
    duration: 0,
    speed: AUDIO_CONFIG.DEFAULT_SPEED,
    reverb: AUDIO_CONFIG.DEFAULT_REVERB,
    reverbType: 'default' as 'default' | 'hall' | 'room' | 'plate',
    volume: AUDIO_CONFIG.DEFAULT_VOLUME,
    bass: AUDIO_CONFIG.DEFAULT_BASS,
    eightD: { enabled: false, autoRotate: true, rotationSpeed: AUDIO_CONFIG.EIGHT_D_ROTATION_SPEED, manualPosition: 0 },
    modulation: { ...DEFAULT_MODULATION },
    distortion: { ...DEFAULT_DISTORTION },
    spatialAudio: { ...DEFAULT_SPATIAL_AUDIO, muffle: { enabled: false, intensity: 0 } },
  });

  const [visualizerData] = useState<number[]>(() => Array(AUDIO_CONFIG.WAVEFORM_SAMPLES).fill(0.05));
  const audioContextRef = useRef<AudioContext | null>(null);
  const videoElRef = useRef<HTMLVideoElement | null>(null);
  const mediaSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const audioNodesRef = useRef<AudioNodes>({});
  const objectUrlRef = useRef<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  const createImpulseResponse = useCallback((context: AudioContext, type: 'default' | 'hall' | 'room' | 'plate') => makeImpulseResponse(context, type), []);
  const createBinauralImpulseResponse = useCallback((context: AudioContext, roomSize: number, damping: number) => makeBinauralImpulseResponse(context, roomSize, damping), []);

  useEffect(() => {
    if (!objectUrlRef.current) {
      objectUrlRef.current = URL.createObjectURL(videoFile);
      setVideoUrl(objectUrlRef.current);
    }
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
      setVideoUrl(null);
    };
  }, [videoFile]);

  const attachVideoElement = useCallback((el: HTMLVideoElement | null) => {
    videoElRef.current = el;
    if (!el) return;
    el.src = videoUrl || '';
    el.preload = 'auto';
    el.muted = true;
    try {
      // Disable pitch preservation to avoid phasey/chorus artifacts at slow speeds
      (el as HTMLVideoElement & { preservesPitch?: boolean; webkitPreservesPitch?: boolean; mozPreservesPitch?: boolean }).preservesPitch = false;
      (el as HTMLVideoElement & { preservesPitch?: boolean; webkitPreservesPitch?: boolean; mozPreservesPitch?: boolean }).webkitPreservesPitch = false;
      (el as HTMLVideoElement & { preservesPitch?: boolean; webkitPreservesPitch?: boolean; mozPreservesPitch?: boolean }).mozPreservesPitch = false;
    } catch (_ignore) { void _ignore; }
    el.onloadedmetadata = () => {
      dispatch({ type: 'SET_TIME', current: 0, progress: 0 });
      dispatch({ type: 'SET_DURATION', value: el.duration });
    };
    // Não forçamos mudanças de volume do elemento de vídeo; o áudio processado é controlado pelo mainGain
  }, [videoUrl]);

  useEffect(() => {
    const v = videoElRef.current;
    if (v && videoUrl) {
      v.src = videoUrl;
      v.load();
    }
  }, [videoUrl]);

  const setupGraph = useCallback(() => {
    if (!videoElRef.current) return;
    if (!audioContextRef.current) {
      type WindowWithWebkitAudio = Window & { webkitAudioContext?: typeof AudioContext };
      const w = window as WindowWithWebkitAudio;
      audioContextRef.current = new (window.AudioContext || w.webkitAudioContext!)();
    }
    const ctx = audioContextRef.current!;

    mediaSourceRef.current?.disconnect();
    const source = mediaSourceRef.current || ctx.createMediaElementSource(videoElRef.current);
    mediaSourceRef.current = source;

    // Base nodes
    const mainGain = ctx.createGain();
    mainGain.gain.value = state.volume / 100;
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

    // connections
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

    if (state.modulation.flanger.enabled) {
      const flanger = createFlangerEffect(ctx, state.modulation.flanger.rate, state.modulation.flanger.depth, state.modulation.flanger.feedback, state.modulation.flanger.delay);
      currentNode.connect(flanger.input);
      currentNode = flanger.output;
      audioNodesRef.current.flanger = flanger;
    }
    if (state.modulation.tremolo.enabled) {
      const tremolo = createTremoloEffect(ctx, state.modulation.tremolo.rate, state.modulation.tremolo.depth, state.modulation.tremolo.shape);
      currentNode.connect(tremolo.input);
      currentNode = tremolo.output;
      audioNodesRef.current.tremolo = tremolo;
    }

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

    if (state.spatialAudio.binaural.enabled) {
      const binauralConvolver = ctx.createConvolver();
      const binauralGain = ctx.createGain();
      binauralConvolver.buffer = createBinauralImpulseResponse(ctx, state.spatialAudio.binaural.roomSize, state.spatialAudio.binaural.damping);
      binauralGain.gain.setValueAtTime(state.spatialAudio.binaural.width / 100, ctx.currentTime);
      currentNode.connect(binauralConvolver);
      binauralConvolver.connect(binauralGain);
      currentNode = binauralGain;
      audioNodesRef.current.binauralProcessor = { convolver: binauralConvolver, gain: binauralGain };
    }

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

    const panner = ctx.createPanner();
    const eightDWetGain = ctx.createGain();
    const eightDDryGain = ctx.createGain();
    const eightDMerger = ctx.createGain();
    eightDWetGain.gain.value = state.eightD.enabled ? 1 : 0;
    eightDDryGain.gain.value = state.eightD.enabled ? 0 : 1;
    const eightDInput = currentNode;
    eightDInput.connect(panner);
    panner.connect(eightDWetGain);
    eightDWetGain.connect(eightDMerger);
    eightDInput.connect(eightDDryGain);
    eightDDryGain.connect(eightDMerger);
    currentNode = eightDMerger;

    const bassWetGain = ctx.createGain();
    const bassDryGain = ctx.createGain();
    const bassMerger = ctx.createGain();
    bassWetGain.gain.value = state.bass > 0 ? 1 : 0;
    bassDryGain.gain.value = state.bass > 0 ? 0 : 1;
    const bassInput = currentNode;
    bassInput.connect(bassBoost);
    bassBoost.connect(bassWetGain);
    bassWetGain.connect(bassMerger);
    bassInput.connect(bassDryGain);
    bassDryGain.connect(bassMerger);
    currentNode = bassMerger;

    currentNode.connect(ctx.destination);

    audioNodesRef.current = {
      defaultConvolver, hallConvolver, roomConvolver, plateConvolver,
      defaultReverbGain, hallReverbGain, roomReverbGain, plateReverbGain,
      dryGain, mainGain, bassBoost,
      muffle: muffleFilter, muffleWetGain, muffleDryGain,
      eightDPanner: panner, eightDWetGain, eightDDryGain,
      finalNode: currentNode, // Store the final node
    };
  }, [
    createBinauralImpulseResponse,
    createImpulseResponse,
    state.bass,
    state.distortion.bitcrusher.bits,
    state.distortion.bitcrusher.enabled,
    state.distortion.bitcrusher.sampleRate,
    state.distortion.distortion.amount,
    state.distortion.distortion.enabled,
    state.distortion.distortion.level,
    state.distortion.distortion.tone,
    state.distortion.overdrive.enabled,
    state.distortion.overdrive.gain,
    state.distortion.overdrive.level,
    state.distortion.overdrive.tone,
    state.eightD.enabled,
    state.modulation.flanger.delay,
    state.modulation.flanger.depth,
    state.modulation.flanger.enabled,
    state.modulation.flanger.feedback,
    state.modulation.flanger.rate,
    state.modulation.tremolo.depth,
    state.modulation.tremolo.enabled,
    state.modulation.tremolo.rate,
    state.modulation.tremolo.shape,
    state.spatialAudio.binaural.damping,
    state.spatialAudio.binaural.enabled,
    state.spatialAudio.binaural.roomSize,
    state.spatialAudio.binaural.width,
    state.spatialAudio.muffle.enabled,
    state.spatialAudio.muffle.intensity,
    state.volume,
  ]);

  useEffect(() => {
    setupGraph();
  }, [setupGraph]);

  useEffect(() => {
    const video = videoElRef.current;
    const ctx = audioContextRef.current;
    if (!video || !ctx) return;
    const now = ctx.currentTime;
    if (audioNodesRef.current.mainGain) {
      audioNodesRef.current.mainGain.gain.linearRampToValueAtTime(state.volume / 100, now + 0.05);
    }
    if (audioNodesRef.current.defaultReverbGain && audioNodesRef.current.hallReverbGain && audioNodesRef.current.roomReverbGain && audioNodesRef.current.plateReverbGain) {
      const reverbValue = state.reverb / 100;
      audioNodesRef.current.defaultReverbGain.gain.linearRampToValueAtTime(state.reverbType === 'default' ? reverbValue : 0, now + 0.05);
      audioNodesRef.current.hallReverbGain.gain.linearRampToValueAtTime(state.reverbType === 'hall' ? reverbValue : 0, now + 0.05);
      audioNodesRef.current.roomReverbGain.gain.linearRampToValueAtTime(state.reverbType === 'room' ? reverbValue : 0, now + 0.05);
      audioNodesRef.current.plateReverbGain.gain.linearRampToValueAtTime(state.reverbType === 'plate' ? reverbValue : 0, now + 0.05);
      audioNodesRef.current.dryGain?.gain.linearRampToValueAtTime(1 - reverbValue, now + 0.05);
    }
    if (audioNodesRef.current.bassBoost) {
      audioNodesRef.current.bassBoost.gain.linearRampToValueAtTime(state.bass / 100 * AUDIO_CONFIG.BASS_BOOST_MAX_GAIN, now + 0.05);
    }
    if (audioNodesRef.current.muffle) {
      const muffle = state.spatialAudio.muffle;
      audioNodesRef.current.muffleWetGain?.gain.linearRampToValueAtTime(muffle.enabled ? 1 : 0, now + 0.05);
      audioNodesRef.current.muffleDryGain?.gain.linearRampToValueAtTime(muffle.enabled ? 0 : 1, now + 0.05);
      const maxFreq = 8000;
      const minFreq = 400;
      const frequency = maxFreq - (muffle.intensity / 100) * (maxFreq - minFreq);
      audioNodesRef.current.muffle.frequency.linearRampToValueAtTime(frequency, now + 0.05);
      audioNodesRef.current.muffle.Q.linearRampToValueAtTime(1.2, now + 0.05);
    }
    if (audioNodesRef.current.eightDPanner) {
      const enabled = state.eightD.enabled;
      audioNodesRef.current.eightDWetGain?.gain.linearRampToValueAtTime(enabled ? 1 : 0, now + 0.05);
      audioNodesRef.current.eightDDryGain?.gain.linearRampToValueAtTime(enabled ? 0 : 1, now + 0.05);
      const angleInRadians = (state.eightD.manualPosition * Math.PI) / 180;
      audioNodesRef.current.eightDPanner.positionX.linearRampToValueAtTime(Math.sin(angleInRadians), now + 0.05);
      audioNodesRef.current.eightDPanner.positionY.linearRampToValueAtTime(0, now + 0.05);
      audioNodesRef.current.eightDPanner.positionZ.linearRampToValueAtTime(Math.cos(angleInRadians), now + 0.05);
    }
  }, [
    state.volume,
    state.reverb,
    state.reverbType,
    state.bass,
    state.spatialAudio.muffle.enabled,
    state.spatialAudio.muffle.intensity,
    state.spatialAudio.binaural.width,
    state.eightD.enabled,
    state.eightD.manualPosition,
  ]);

  useEffect(() => {
    const v = videoElRef.current;
    if (v) v.playbackRate = state.speed;
  }, [state.speed]);

  useEffect(() => {
    let raf = 0;
    const lastUpdateRef = { t: 0, p: -1 };
    const tick = (ts: number) => {
      const v = videoElRef.current;
      if (v) {
        const duration = Number.isFinite(v.duration) ? v.duration : state.duration;
        const current = v.currentTime;
        const progress = duration > 0 ? (current / duration) * 100 : 0;
        const dt = ts - lastUpdateRef.t;
        if (dt > 100 || Math.abs(progress - lastUpdateRef.p) > 0.5) {
          dispatch({ type: 'SET_TIME', current, progress });
          lastUpdateRef.t = ts;
          lastUpdateRef.p = progress;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [videoFile, state.duration]);

  const togglePlayPause = useCallback(() => {
    const v = videoElRef.current;
    if (!v) return;
    if (v.paused) {
      v.play().catch(() => undefined);
      dispatch({ type: 'SET_PLAYING', value: true });
    } else {
      v.pause();
      dispatch({ type: 'SET_PLAYING', value: false });
    }
  }, []);

  const seek = useCallback(async (progress: number) => {
    const v = videoElRef.current;
    if (!v || !Number.isFinite(v.duration)) return;
    const newTime = (progress / 100) * v.duration;
    v.currentTime = newTime;
    dispatch({ type: 'SET_TIME', current: newTime, progress });
  }, []);

  const download = useCallback(async (_name: string, onProgress?: (progress: number) => void) => {
    const videoElement = videoElRef.current;
    const audioContext = audioContextRef.current;
    const finalAudioNode = audioNodesRef.current?.finalNode;

    if (!videoElement || !audioContext || !finalAudioNode) {
      console.error("Download failed: video element, audio context, or final node not available.");
      return false;
    }
    
    const wasPlaying = !videoElement.paused;
    if(wasPlaying) videoElement.pause();

    const dest = audioContext.createMediaStreamDestination();
    let recordingPromise: Promise<Blob> | null = null;
    let recorder: MediaRecorder | null = null;
    let monitorInterval: number | undefined;

    try {
      finalAudioNode.disconnect();
      finalAudioNode.connect(dest);
      
      type VideoWithCapture = HTMLVideoElement & {
        captureStream?: () => MediaStream;
        mozCaptureStream?: () => MediaStream;
      };

      const vCap = videoElement as VideoWithCapture;
      const videoStream = vCap.captureStream ? vCap.captureStream() : vCap.mozCaptureStream ? vCap.mozCaptureStream() : new MediaStream();
      const [videoTrack] = videoStream.getVideoTracks();

      if (!videoTrack) {
        console.error("Download failed: No video track found in the stream.");
        throw new Error("No video track");
      }

      const mixedStream = new MediaStream([videoTrack, ...dest.stream.getAudioTracks()]);
      const mimeCandidates = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
      const mimeType = mimeCandidates.find(m => MediaRecorder.isTypeSupported(m));

      if (!mimeType) {
        console.error("Download failed: No supported MIME type for MediaRecorder found.");
        throw new Error("No MIME type");
      }
      
      recorder = new MediaRecorder(mixedStream, { mimeType });
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (e) => e.data.size > 0 && chunks.push(e.data);

      recordingPromise = new Promise<Blob>((resolve, reject) => {
        recorder!.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
        recorder!.onerror = (e) => reject(e);
      });

      videoElement.currentTime = 0;
      await videoElement.play();
      recorder.start();
      onProgress?.(0);
      
      monitorInterval = window.setInterval(() => {
        const progress = (videoElement.currentTime / videoElement.duration) * 100;
        onProgress?.(Math.min(100, progress));
        if (videoElement.currentTime >= videoElement.duration && recorder?.state === 'recording') {
          recorder.stop();
        }
      }, 100);

      const blob = await recordingPromise;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${_name || 'fluxos-video'}.webm`;
      a.click();
      URL.revokeObjectURL(url);
      onProgress?.(100);
      return true;

    } catch (error) {
      console.error("Error during recording or download:", error);
      return false;
    } finally {
      if (monitorInterval) clearInterval(monitorInterval);
      if (recorder?.state === 'recording') recorder.stop();
      try {
        finalAudioNode.disconnect(dest);
        finalAudioNode.connect(audioContext.destination);
      } catch (e) {
        console.warn("Error during cleanup, could not restore audio connection:", e);
      }
      if (wasPlaying && videoElement.paused) {
        videoElement.play().catch(console.warn);
      }
    }
  }, []);

  const setEffectControls = {
    setSpeed: (value: number) => dispatch({ type: 'SET_SPEED', value }),
    setReverb: (value: number) => dispatch({ type: 'SET_REVERB', value }),
    setReverbType: (value: 'default' | 'hall' | 'room' | 'plate') => dispatch({ type: 'SET_REVERB_TYPE', value }),
    setVolume: (value: number) => dispatch({ type: 'SET_VOLUME', value }),
    setBass: (value: number) => dispatch({ type: 'SET_BASS', value }),
    setEightDEnabled: (value: boolean) => dispatch({ type: 'SET_EIGHT_D_ENABLED', value }),
    setEightDAutoRotate: (value: boolean) => dispatch({ type: 'SET_EIGHT_D_AUTO_ROTATE', value }),
    setEightDRotationSpeed: (value: number) => dispatch({ type: 'SET_EIGHT_D_ROTATION_SPEED', value }),
    setEightDManualPosition: (value: number) => dispatch({ type: 'SET_EIGHT_D_MANUAL_POSITION', value }),
    setFlangerEnabled: (value: boolean) => dispatch({ type: 'SET_FLANGER_ENABLED', value }),
    setFlangerRate: (value: number) => dispatch({ type: 'SET_FLANGER_RATE', value }),
    setFlangerDepth: (value: number) => dispatch({ type: 'SET_FLANGER_DEPTH', value }),
    setFlangerFeedback: (value: number) => dispatch({ type: 'SET_FLANGER_FEEDBACK', value }),
    setFlangerDelay: (value: number) => dispatch({ type: 'SET_FLANGER_DELAY', value }),
    setTremoloEnabled: (value: boolean) => dispatch({ type: 'SET_TREMOLO_ENABLED', value }),
    setTremoloRate: (value: number) => dispatch({ type: 'SET_TREMOLO_RATE', value }),
    setTremoloDepth: (value: number) => dispatch({ type: 'SET_TREMOLO_DEPTH', value }),
    setTremoloShape: (value: 'sine' | 'square' | 'triangle' | 'sawtooth') => dispatch({ type: 'SET_TREMOLO_SHAPE', value }),
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
    setBinauralEnabled: (value: boolean) => dispatch({ type: 'SET_BINAURAL_ENABLED', value }),
    setBinauralRoomSize: (value: number) => dispatch({ type: 'SET_BINAURAL_ROOM_SIZE', value }),
    setBinauralDamping: (value: number) => dispatch({ type: 'SET_BINAURAL_DAMPING', value }),
    setBinauralWidth: (value: number) => dispatch({ type: 'SET_BINAURAL_WIDTH', value }),
    setMuffleEnabled: (value: boolean) => dispatch({ type: 'SET_MUFFLE_ENABLED', value }),
    setMuffleIntensity: (value: number) => dispatch({ type: 'SET_MUFFLE_INTENSITY', value }),
    resetMuffledEffects: () => dispatch({ type: 'RESET_MUFFLE_EFFECTS' }),
    resetModulationEffects: () => dispatch({ type: 'RESET_MODULATION_EFFECTS' }),
    resetDistortionEffects: () => dispatch({ type: 'RESET_DISTORTION_EFFECTS' }),
    resetSpatialAudioEffects: () => dispatch({ type: 'RESET_SPATIAL_AUDIO_EFFECTS' }),
  };

  return {
    // state
    isPlaying: state.isPlaying,
    progress: state.progress,
    currentTime: state.currentTime,
    duration: state.duration,
    speed: state.speed,
    reverb: state.reverb,
    reverbType: state.reverbType,
    volume: state.volume,
    bass: state.bass,
    eightD: state.eightD,
    modulation: state.modulation,
    distortion: state.distortion,
    spatialAudio: state.spatialAudio,
    visualizerData,
    // controls
    togglePlayPause,
    seek,
    download,
    attachVideoElement,
    ...setEffectControls,
  };
};