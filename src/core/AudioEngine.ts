import {
  AUDIO_CONFIG,
  DEFAULT_MODULATION,
  DEFAULT_DISTORTION,
  DEFAULT_SPATIAL_AUDIO
} from '../constants/audioConfig';
import {
  AudioNodes,
  AudioState
} from '../types/audio';
import {
  createFlangerEffect,
  createTremoloEffect,
  createBitCrusher,
  createOverdriveEffect,
  createDistortionEffect,
  createMuffleEffect
} from '../utils/effects';
import {
  createImpulseResponse,
  createBinauralImpulseResponse
} from '../utils/effects/reverb';
import { bufferToWav } from '../utils/audioHelpers';

export class AudioEngine {
  private context: AudioContext | OfflineAudioContext;
  private nodes: AudioNodes = {};

  // State tracking for offline rendering consistency
  private currentState: AudioState;
  private lastBinauralParams: { roomSize: number; damping: number } | null = null;

  constructor(context: AudioContext | OfflineAudioContext, initialState?: Partial<AudioState>) {
    this.context = context;
    this.currentState = {
      isPlaying: false,
      progress: 0,
      currentTime: 0,
      duration: 0,
      speed: AUDIO_CONFIG.DEFAULT_SPEED,
      reverb: AUDIO_CONFIG.DEFAULT_REVERB,
      reverbType: 'default',
      volume: AUDIO_CONFIG.DEFAULT_VOLUME,
      bass: AUDIO_CONFIG.DEFAULT_BASS,
      etherealEcho: false,

      eightD: {
        enabled: false,
        autoRotate: true,
        rotationSpeed: AUDIO_CONFIG.EIGHT_D_ROTATION_SPEED,
        manualPosition: 0,
        pattern: 'circle',
      },
      modulation: { ...DEFAULT_MODULATION },
      distortion: { ...DEFAULT_DISTORTION },
      spatialAudio: { ...DEFAULT_SPATIAL_AUDIO, muffle: { enabled: false, intensity: 0 } },
      ...initialState
    };

    this.setupAudioGraph();
  }

  public getContext() {
    return this.context;
  }

  public getNodes() {
    return this.nodes;
  }

  private setupAudioGraph() {
    const ctx = this.context;

    // Cleanup existing nodes if any
    this.cleanupNodes();

    // Create Base Nodes
    const mainGain = ctx.createGain();
    const dryGain = ctx.createGain();

    // Reverb Nodes
    const defaultConvolver = ctx.createConvolver();
    const hallConvolver = ctx.createConvolver();
    const roomConvolver = ctx.createConvolver();
    const plateConvolver = ctx.createConvolver();

    const defaultReverbGain = ctx.createGain();
    const hallReverbGain = ctx.createGain();
    const roomReverbGain = ctx.createGain();
    const plateReverbGain = ctx.createGain();

    // Initialize Impulse Responses
    defaultConvolver.buffer = createImpulseResponse(ctx, 'default');
    hallConvolver.buffer = createImpulseResponse(ctx, 'hall');
    roomConvolver.buffer = createImpulseResponse(ctx, 'room');
    plateConvolver.buffer = createImpulseResponse(ctx, 'plate');

    // Connect Reverb Network
    defaultReverbGain.connect(defaultConvolver).connect(mainGain);
    hallReverbGain.connect(hallConvolver).connect(mainGain);
    roomReverbGain.connect(roomConvolver).connect(mainGain);
    plateReverbGain.connect(plateConvolver).connect(mainGain);
    dryGain.connect(mainGain);

    this.nodes = {
      mainGain, dryGain,
      defaultConvolver, hallConvolver, roomConvolver, plateConvolver,
      defaultReverbGain, hallReverbGain, roomReverbGain, plateReverbGain
    };

    let currentNode: AudioNode = mainGain;

    // --- Effects Chain Construction ---

    // 1. Flanger
    {
      const effectNode = createFlangerEffect(ctx, 0, 0, 0, 0);
      const wetGain = ctx.createGain(); wetGain.gain.value = 0;
      const dryGain = ctx.createGain(); dryGain.gain.value = 1;
      const merger = ctx.createGain();

      currentNode.connect(effectNode.input);
      effectNode.output.connect(wetGain);
      currentNode.connect(dryGain);
      wetGain.connect(merger);
      dryGain.connect(merger);

      currentNode = merger;
      this.nodes.flanger = effectNode;
      this.nodes.flangerWetGain = wetGain;
      this.nodes.flangerDryGain = dryGain;
    }

    // 2. Tremolo
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
      this.nodes.tremolo = effectNode;
      this.nodes.tremoloWetGain = wetGain;
      this.nodes.tremoloDryGain = dryGain;
    }

    // 3. Overdrive
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
      this.nodes.overdrive = effectNode;
      this.nodes.overdriveWetGain = wetGain;
      this.nodes.overdriveDryGain = dryGain;
    }

    // 4. Distortion
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
      this.nodes.distortion = effectNode;
      this.nodes.distortionWetGain = wetGain;
      this.nodes.distortionDryGain = dryGain;
    }

    // 5. Bitcrusher
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
      this.nodes.bitcrusher = effectNode;
      this.nodes.bitcrusherWetGain = wetGain;
      this.nodes.bitcrusherDryGain = dryGain;
    }

    // 6. Muffle
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
      this.nodes.muffle = effectNode;
      this.nodes.muffleWetGain = wetGain;
      this.nodes.muffleDryGain = dryGain;
    }

    // 7. Binaural
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
      this.nodes.binauralProcessor = effectNode;
      this.nodes.binauralWetGain = wetGain;
      this.nodes.binauralDryGain = dryGain;
    }

    // 8. 8D Audio
    {
      const panner = ctx.createPanner();
      panner.panningModel = 'HRTF';
      panner.distanceModel = 'inverse';
      panner.refDistance = 1;
      panner.maxDistance = 10000;
      panner.rolloffFactor = 0;
      panner.coneInnerAngle = 360;
      panner.coneOuterAngle = 360;
      panner.coneOuterGain = 1;

      const wetGain = ctx.createGain(); wetGain.gain.value = 0;
      const dryGain = ctx.createGain(); dryGain.gain.value = 1;
      const merger = ctx.createGain();

      currentNode.connect(panner).connect(wetGain);
      currentNode.connect(dryGain);
      wetGain.connect(merger);
      dryGain.connect(merger);

      currentNode = merger;
      this.nodes.eightDPanner = panner;
      this.nodes.eightDWetGain = wetGain;
      this.nodes.eightDDryGain = dryGain;
    }

    // 9. Bass Boost
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
      this.nodes.bassBoost = effectNode;
      this.nodes.bassWetGain = wetGain;
      this.nodes.bassDryGain = dryGain;
    }

    this.nodes.finalNode = currentNode;
    currentNode.connect(ctx.destination);

    // Apply initial state
    this.applyState(this.currentState, true);
  }

  private cleanupNodes() {
    Object.values(this.nodes).forEach(node => {
      if (node && typeof node === 'object') {
        if ('disconnect' in node && typeof (node as AudioNode).disconnect === 'function') {
          try { (node as AudioNode).disconnect(); } catch { /* ignore */ }
        } else if ('input' in node && 'output' in node) {
          // Handle custom effect nodes
          try { (node as { input: AudioNode }).input.disconnect(); } catch { /* ignore */ }
          try { (node as { output: AudioNode }).output.disconnect(); } catch { /* ignore */ }
        }
      }
    });
    this.nodes = {};
  }

  public connectSource(source: AudioNode) {
    if (this.nodes.dryGain) source.connect(this.nodes.dryGain);
    if (this.nodes.defaultReverbGain) source.connect(this.nodes.defaultReverbGain);
    if (this.nodes.hallReverbGain) source.connect(this.nodes.hallReverbGain);
    if (this.nodes.roomReverbGain) source.connect(this.nodes.roomReverbGain);
    if (this.nodes.plateReverbGain) source.connect(this.nodes.plateReverbGain);
  }

  public setSource(source: AudioBuffer | MediaElementAudioSourceNode) {
    if (source instanceof AudioBuffer) {
      // AudioBuffer is handled by creating a source node externally and calling connectSource
    } else {
      this.connectSource(source);
    }
  }

  // Updates all audio nodes based on the state
  public applyState(state: AudioState, immediate = false) {
    this.currentState = state;
    const ctx = this.context;
    const now = ctx.currentTime;
    const rampTime = immediate ? 0 : 0.05;

    // Volume & Reverb
    if (this.nodes.mainGain) this.nodes.mainGain.gain.linearRampToValueAtTime(state.volume / 100, now + rampTime);

    if (state.etherealEcho) {
      // Ethereal Echo Mode: Activate all reverbs and keep dry signal
      if (this.nodes.dryGain) this.nodes.dryGain.gain.linearRampToValueAtTime(1.0, now + rampTime);

      const echoGain = 1.0;
      if (this.nodes.defaultReverbGain) this.nodes.defaultReverbGain.gain.linearRampToValueAtTime(echoGain, now + rampTime);
      if (this.nodes.hallReverbGain) this.nodes.hallReverbGain.gain.linearRampToValueAtTime(echoGain, now + rampTime);
      if (this.nodes.roomReverbGain) this.nodes.roomReverbGain.gain.linearRampToValueAtTime(echoGain, now + rampTime);
      if (this.nodes.plateReverbGain) this.nodes.plateReverbGain.gain.linearRampToValueAtTime(echoGain, now + rampTime);
    } else {
      // Normal Reverb Mode
      const reverbValue = state.reverb / 100;
      if (this.nodes.dryGain) this.nodes.dryGain.gain.linearRampToValueAtTime(1 - reverbValue, now + rampTime);

      const setReverbGain = (node: GainNode | undefined, type: string) => {
        if (node) node.gain.linearRampToValueAtTime(state.reverbType === type ? reverbValue : 0, now + rampTime);
      };

      setReverbGain(this.nodes.defaultReverbGain, 'default');
      setReverbGain(this.nodes.hallReverbGain, 'hall');
      setReverbGain(this.nodes.roomReverbGain, 'room');
      setReverbGain(this.nodes.plateReverbGain, 'plate');
    }

    // Bass
    if (this.nodes.bassBoost && this.nodes.bassWetGain && this.nodes.bassDryGain) {
      const bassGainValue = state.bass / 100 * AUDIO_CONFIG.BASS_BOOST_MAX_GAIN;
      this.nodes.bassBoost.gain.linearRampToValueAtTime(bassGainValue, now + rampTime);
      const isBassActive = state.bass > 0;
      this.nodes.bassWetGain.gain.linearRampToValueAtTime(isBassActive ? 1 : 0, now + rampTime);
      this.nodes.bassDryGain.gain.linearRampToValueAtTime(isBassActive ? 0 : 1, now + rampTime);
    }

    // Flanger
    if (this.nodes.flanger && this.nodes.flangerWetGain && this.nodes.flangerDryGain) {
      this.nodes.flanger.updateRate?.(state.modulation.flanger.rate);
      this.nodes.flanger.updateDepth?.(state.modulation.flanger.depth);
      this.nodes.flanger.updateFeedback?.(state.modulation.flanger.feedback);
      this.nodes.flangerWetGain.gain.linearRampToValueAtTime(state.modulation.flanger.enabled ? 1 : 0, now + rampTime);
      this.nodes.flangerDryGain.gain.linearRampToValueAtTime(state.modulation.flanger.enabled ? 0 : 1, now + rampTime);
    }

    // Tremolo
    if (this.nodes.tremolo && this.nodes.tremoloWetGain && this.nodes.tremoloDryGain) {
      this.nodes.tremolo.updateRate?.(state.modulation.tremolo.rate);
      this.nodes.tremolo.updateDepth?.(state.modulation.tremolo.depth);
      this.nodes.tremolo.updateShape?.(state.modulation.tremolo.shape);
      this.nodes.tremoloWetGain.gain.linearRampToValueAtTime(state.modulation.tremolo.enabled ? 1 : 0, now + rampTime);
      this.nodes.tremoloDryGain.gain.linearRampToValueAtTime(state.modulation.tremolo.enabled ? 0 : 1, now + rampTime);
    }

    // Overdrive
    if (this.nodes.overdrive && this.nodes.overdriveWetGain && this.nodes.overdriveDryGain) {
      this.nodes.overdrive.updateAmount?.(state.distortion.overdrive.gain);
      if (this.nodes.overdrive.toneFilter) this.nodes.overdrive.toneFilter.frequency.linearRampToValueAtTime(1000 + (state.distortion.overdrive.tone / 100) * 4000, now + rampTime);
      if (this.nodes.overdrive.levelGain) this.nodes.overdrive.levelGain.gain.linearRampToValueAtTime(state.distortion.overdrive.level / 100, now + rampTime);
      this.nodes.overdriveWetGain.gain.linearRampToValueAtTime(state.distortion.overdrive.enabled ? 1 : 0, now + rampTime);
      this.nodes.overdriveDryGain.gain.linearRampToValueAtTime(state.distortion.overdrive.enabled ? 0 : 1, now + rampTime);
    }

    // Distortion
    if (this.nodes.distortion && this.nodes.distortionWetGain && this.nodes.distortionDryGain) {
      this.nodes.distortion.updateAmount?.(state.distortion.distortion.amount);
      if (this.nodes.distortion.toneFilter) this.nodes.distortion.toneFilter.frequency.linearRampToValueAtTime(1000 + (state.distortion.distortion.tone / 100) * 4000, now + rampTime);
      if (this.nodes.distortion.levelGain) this.nodes.distortion.levelGain.gain.linearRampToValueAtTime(state.distortion.distortion.level / 100, now + rampTime);
      this.nodes.distortionWetGain.gain.linearRampToValueAtTime(state.distortion.distortion.enabled ? 1 : 0, now + rampTime);
      this.nodes.distortionDryGain.gain.linearRampToValueAtTime(state.distortion.distortion.enabled ? 0 : 1, now + rampTime);
    }

    // Bitcrusher
    if (this.nodes.bitcrusher && this.nodes.bitcrusherWetGain && this.nodes.bitcrusherDryGain) {
      this.nodes.bitcrusher.updateBits?.(state.distortion.bitcrusher.bits);
      this.nodes.bitcrusher.updateSampleRate?.(state.distortion.bitcrusher.sampleRate);
      this.nodes.bitcrusherWetGain.gain.linearRampToValueAtTime(state.distortion.bitcrusher.enabled ? 1 : 0, now + rampTime);
      this.nodes.bitcrusherDryGain.gain.linearRampToValueAtTime(state.distortion.bitcrusher.enabled ? 0 : 1, now + rampTime);
    }

    // Muffle
    if (this.nodes.muffle && this.nodes.muffleWetGain && this.nodes.muffleDryGain) {
      const { enabled, intensity } = state.spatialAudio.muffle;
      this.nodes.muffleWetGain.gain.linearRampToValueAtTime(enabled ? 1 : 0, now + rampTime);
      this.nodes.muffleDryGain.gain.linearRampToValueAtTime(enabled ? 0 : 1, now + rampTime);
      if (enabled) {
        const maxFreq = 12000;
        const minFreq = 400;
        const frequency = maxFreq - (intensity / 100) * (maxFreq - minFreq);
        this.nodes.muffle.frequency.linearRampToValueAtTime(frequency, now + rampTime);
      }
    }

    // Binaural
    if (this.nodes.binauralProcessor && this.nodes.binauralWetGain && this.nodes.binauralDryGain) {
      const { enabled, roomSize, damping, width } = state.spatialAudio.binaural;
      this.nodes.binauralWetGain.gain.linearRampToValueAtTime(enabled ? 1 : 0, now + rampTime);
      this.nodes.binauralDryGain.gain.linearRampToValueAtTime(enabled ? 0 : 1, now + rampTime);

      if (enabled) {
        try {
          if (
            !this.lastBinauralParams ||
            this.lastBinauralParams.roomSize !== roomSize ||
            this.lastBinauralParams.damping !== damping
          ) {
            const newImpulse = createBinauralImpulseResponse(ctx, roomSize, damping);
            this.nodes.binauralProcessor.convolver.buffer = newImpulse;
            this.lastBinauralParams = { roomSize, damping };
          }
          this.nodes.binauralProcessor.gain.gain.setValueAtTime(width / 100, now);
        } catch (error) {
          console.warn('Error updating binaural parameters:', error);
        }
      } else {
        this.lastBinauralParams = null;
      }
    }

    // 8D
    // 8D
    if (this.nodes.eightDPanner && this.nodes.eightDWetGain && this.nodes.eightDDryGain) {
      const { enabled, manualPosition, pattern } = state.eightD;
      this.nodes.eightDWetGain.gain.linearRampToValueAtTime(enabled ? 1 : 0, now + rampTime);
      this.nodes.eightDDryGain.gain.linearRampToValueAtTime(enabled ? 0 : 1, now + rampTime);

      if (enabled) {
        const angleInRadians = (manualPosition * Math.PI) / 180;
        let x = Math.sin(angleInRadians);
        let z = Math.cos(angleInRadians);
        const y = 0;

        switch (pattern) {
          case 'pingpong':
            // PingPong: Move left-right (X axis).
            z = 0.5; // Stay slightly in front
            break;
          case 'figure8':
            // Figure 8: Lemniscate
            x = Math.sin(angleInRadians);
            z = Math.sin(2 * angleInRadians) * 0.5;
            break;
          case 'random':
            // Lissajous for pseudo-random smooth movement
            x = Math.sin(angleInRadians);
            z = Math.cos(angleInRadians * 0.7);
            break;
          case 'circle':
          default:
            // Standard circle
            break;
        }

        this.nodes.eightDPanner.positionX.linearRampToValueAtTime(x, now + rampTime);
        this.nodes.eightDPanner.positionY.linearRampToValueAtTime(y, now + rampTime);
        this.nodes.eightDPanner.positionZ.linearRampToValueAtTime(z, now + rampTime);
      }
    }
  }

  public async renderOffline(
    buffer: AudioBuffer,
    state: AudioState,
    onProgress?: (progress: number) => void
  ): Promise<Blob | null> {
    try {
      const offlineCtx = new OfflineAudioContext(
        buffer.numberOfChannels,
        Math.ceil(buffer.length / state.speed),
        buffer.sampleRate
      );

      // Create a temporary engine for offline rendering
      const offlineEngine = new AudioEngine(offlineCtx, state);

      const source = offlineCtx.createBufferSource();
      source.buffer = buffer;
      source.playbackRate.value = state.speed;

      offlineEngine.connectSource(source);
      source.start(0);

      // Progress simulation for long files
      const duration = buffer.duration / state.speed;
      let progressInterval: ReturnType<typeof setInterval> | undefined;

      if (duration > 10 && onProgress) {
        const updateInterval = Math.max(500, (duration * 1000) / 100);
        let progress = 0;
        progressInterval = setInterval(() => {
          if (progress < 95) {
            progress = Math.min(95, progress + 5);
            onProgress(progress);
          }
        }, updateInterval);
      }

      const renderedBuffer = await offlineCtx.startRendering();

      if (progressInterval) clearInterval(progressInterval);
      if (onProgress) onProgress(100);

      return bufferToWav(renderedBuffer);
    } catch (error) {
      console.error("Error rendering audio:", error);
      return null;
    }
  }
}
