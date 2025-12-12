import { useCallback, useEffect, useRef, useState } from 'react';
import { useAudioLogic } from './useAudioLogic';
import { AUDIO_CONFIG } from '../constants/audioConfig';
import { AudioEngine } from '../core/AudioEngine';

export const useVideoPlayer = (videoFile: File) => {
  const { state, dispatch, actions } = useAudioLogic();

  const [visualizerData] = useState<number[]>(() => Array(AUDIO_CONFIG.WAVEFORM_SAMPLES).fill(0.05));
  const audioContextRef = useRef<AudioContext | null>(null);
  const videoElRef = useRef<HTMLVideoElement | null>(null);
  const mediaSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  // We don't strictly need videoElement state if we handle everything in callback, 
  // but it can be useful for debugging or other effects. 
  // For now, I'll remove it to simplify dependencies if not used.
  // const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);

  const audioEngineRef = useRef<AudioEngine | null>(null);

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

    // Video Setup
    el.src = videoUrl || '';
    el.preload = 'auto';
    el.muted = true; // Mute video element to avoid double audio

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (el as any).preservesPitch = false;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (el as any).webkitPreservesPitch = false;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (el as any).mozPreservesPitch = false;
    } catch { /* ignore */ }

    el.onloadedmetadata = () => {
      dispatch({ type: 'SET_TIME', current: 0, progress: 0 });
      dispatch({ type: 'SET_DURATION', value: el.duration });
    };

    // Audio Engine Setup
    if (!audioContextRef.current) {
      type WindowWithWebkitAudio = Window & { webkitAudioContext?: typeof AudioContext };
      const w = window as WindowWithWebkitAudio;
      audioContextRef.current = new (window.AudioContext || w.webkitAudioContext!)();
    }

    if (!audioEngineRef.current) {
      // Initialize with default state, effect will update it
      audioEngineRef.current = new AudioEngine(audioContextRef.current);
    }

    const ctx = audioContextRef.current;

    if (!mediaSourceRef.current) {
      mediaSourceRef.current = ctx.createMediaElementSource(el);
      audioEngineRef.current.setSource(mediaSourceRef.current);
    } else {
      // If media source exists, we might need to reconnect if element changed?
      // MediaElementSource is tied to the element. 
      // If 'el' is new, we need new source?
      // Usually ref callback is called with null then new el.
      // If null, we should probably cleanup?
      // But we can't easily destroy MediaElementSource.
      // For now, assuming simple mounting.
    }

  }, [videoUrl, dispatch]); // Only depend on videoUrl

  useEffect(() => {
    const v = videoElRef.current;
    if (v && videoUrl) {
      v.src = videoUrl;
      v.load();
    }
  }, [videoUrl]);

  // Update Engine State
  useEffect(() => {
    if (audioEngineRef.current) {
      audioEngineRef.current.applyState(state);
    }
  }, [state]);

  // Update Video Playback Rate
  useEffect(() => {
    const v = videoElRef.current;
    if (v) v.playbackRate = state.speed;
  }, [state.speed]);

  // Sync Time
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

    if (audioContextRef.current?.state === 'suspended') {
      audioContextRef.current.resume();
    }

    if (v.paused) {
      v.play().catch(() => undefined);
      dispatch({ type: 'SET_PLAYING', value: true });
    } else {
      v.pause();
      dispatch({ type: 'SET_PLAYING', value: false });
    }
  }, [dispatch]);

  const seek = useCallback(async (progress: number) => {
    const v = videoElRef.current;
    if (!v || !Number.isFinite(v.duration)) return;
    const newTime = (progress / 100) * v.duration;
    v.currentTime = newTime;
    dispatch({ type: 'SET_TIME', current: newTime, progress });
  }, [dispatch]);

  const download = useCallback(async (_name: string, onProgress?: (progress: number) => void) => {
    const videoElement = videoElRef.current;
    const audioContext = audioContextRef.current;
    const engine = audioEngineRef.current;

    if (!videoElement || !audioContext || !engine) {
      console.error("Download failed: missing dependencies");
      return false;
    }

    const finalAudioNode = engine.getNodes().finalNode;
    if (!finalAudioNode) {
      console.error("Download failed: final audio node not found");
      return false;
    }

    const wasPlaying = !videoElement.paused;
    if (wasPlaying) videoElement.pause();

    const dest = audioContext.createMediaStreamDestination();
    let recordingPromise: Promise<Blob> | null = null;
    let recorder: MediaRecorder | null = null;
    let monitorInterval: number | undefined;

    try {
      finalAudioNode.connect(dest);

      type VideoWithCapture = HTMLVideoElement & {
        captureStream?: () => MediaStream;
        mozCaptureStream?: () => MediaStream;
      };

      const vCap = videoElement as VideoWithCapture;
      const videoStream = vCap.captureStream ? vCap.captureStream() : vCap.mozCaptureStream ? vCap.mozCaptureStream() : new MediaStream();
      const [videoTrack] = videoStream.getVideoTracks();

      if (!videoTrack) throw new Error("No video track");

      const mixedStream = new MediaStream([videoTrack, ...dest.stream.getAudioTracks()]);
      const mimeCandidates = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
      const mimeType = mimeCandidates.find(m => MediaRecorder.isTypeSupported(m));

      if (!mimeType) throw new Error("No MIME type");

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
      } catch { /* ignore */ }
      if (wasPlaying && videoElement.paused) {
        videoElement.play().catch(console.warn);
      }
    }
  }, []);


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
    etherealEcho: state.etherealEcho,
    eightD: state.eightD,
    modulation: state.modulation,
    distortion: state.distortion,
    spatialAudio: state.spatialAudio,
    visualizerData,

    // refs
    attachVideoElement,

    // actions
    togglePlayPause,
    seek,
    download,
    ...actions
  };
};