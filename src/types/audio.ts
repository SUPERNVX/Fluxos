export type Track = {
  name: string;
  artist: string;
  coverUrl: string;
};

export type PresetSettings = Pick<AudioState, 'speed' | 'reverb' | 'volume' | 'bass' | 'eightD' | 'spatialAudio'>;

export type AudioState = {
  isPlaying: boolean;
  progress: number;
  currentTime: number;
  duration: number;
  speed: number;
  reverb: number;
  reverbType: 'default' | 'hall' | 'room' | 'plate';
  volume: number;
  bass: number;
  etherealEcho: boolean;

  eightD: {
    enabled: boolean;
    autoRotate: boolean;
    rotationSpeed: number;
    manualPosition: number; // 0-360 graus
  };
  // Efeitos de Modulação
  modulation: {
    flanger: {
      enabled: boolean;
      rate: number; // 0.1-10 Hz
      depth: number; // 0-100%
      feedback: number; // 0-100%
      delay: number; // 0-20ms
    };
    tremolo: {
      enabled: boolean;
      rate: number; // 0.1-20 Hz
      depth: number; // 0-100%
      shape: 'sine' | 'square' | 'triangle' | 'sawtooth';
    };
  };
  // Efeitos de Distorção e Saturação
  distortion: {
    overdrive: {
      enabled: boolean;
      gain: number; // 0-100%
      tone: number; // 0-100%
      level: number; // 0-100%
    };
    distortion: {
      enabled: boolean;
      amount: number; // 0-100%
      tone: number; // 0-100%
      level: number; // 0-100%
    };
    bitcrusher: {
      enabled: boolean;
      bits: number; // 1-16 bits
      sampleRate: number; // 1000-44100 Hz
    };
  };

  // Espacialização Avançada
  spatialAudio: {
    binaural: {
      enabled: boolean;
      roomSize: number; // 0-100%
      damping: number; // 0-100%
      width: number; // 0-100%
    };
    muffle: {
      enabled: boolean;
      intensity: number; // 0-100%
    };
  };

};

// Define types for audio effects
export type FlangerEffect = {
  input: AudioNode;
  output: AudioNode;
  dry: AudioNode;
  lfo: OscillatorNode;
  updateRate: (rate: number) => void;
  updateDepth: (depth: number) => void;
  updateFeedback: (feedback: number) => void;
};


export type TremoloEffect = {
  input: AudioNode;
  output: AudioNode;
  lfo: OscillatorNode;
  updateRate: (rate: number) => void;
  updateDepth: (depth: number) => void;
  updateShape: (shape: OscillatorType) => void;
};

export type WaveShaperEffect = {
  input: AudioNode;
  output: AudioNode;
  updateAmount: (amount: number) => void;
};

export type BitCrusherEffect = {
  input: AudioNode;
  output: AudioNode;
  updateBits: (bits: number) => void;
  updateSampleRate: (sampleRate: number) => void;
};

// Interface para efeitos de distorção
export interface DistortionEffect {
  input: AudioNode;
  output: AudioNode;
  updateAmount: (amount: number) => void;
  toneFilter: BiquadFilterNode;
  levelGain: GainNode;
}

// Interface para efeito fuzz
export interface FuzzEffect {
  input: AudioNode;
  output: AudioNode;
  updateAmount: (amount: number) => void;
  toneFilter: BiquadFilterNode;
  gateGain: GainNode;
  levelGain: GainNode;
}

export type AudioNodes = {
  defaultConvolver?: ConvolverNode;
  hallConvolver?: ConvolverNode;
  roomConvolver?: ConvolverNode;
  plateConvolver?: ConvolverNode;
  defaultReverbGain?: GainNode;
  hallReverbGain?: GainNode;
  roomReverbGain?: GainNode;
  plateReverbGain?: GainNode;
  dryGain?: GainNode;
  mainGain?: GainNode;
  bassBoost?: BiquadFilterNode;
  bassWetGain?: GainNode;
  bassDryGain?: GainNode;
  eightDPanner?: PannerNode;
  eightDWetGain?: GainNode;
  eightDDryGain?: GainNode;
  flanger?: FlangerEffect;
  flangerWetGain?: GainNode;
  flangerDryGain?: GainNode;
  tremolo?: TremoloEffect;
  tremoloWetGain?: GainNode;
  tremoloDryGain?: GainNode;
  overdrive?: DistortionEffect;
  overdriveWetGain?: GainNode;
  overdriveDryGain?: GainNode;
  distortion?: DistortionEffect;
  distortionWetGain?: GainNode;
  distortionDryGain?: GainNode;
  bitcrusher?: BitCrusherEffect;
  bitcrusherWetGain?: GainNode;
  bitcrusherDryGain?: GainNode;
  binauralProcessor?: {
    convolver: ConvolverNode;
    gain: GainNode;
  };
  binauralWetGain?: GainNode;
  binauralDryGain?: GainNode;
  muffle?: BiquadFilterNode;
  muffleWetGain?: GainNode;
  muffleDryGain?: GainNode;
  finalNode?: AudioNode;

};

export type AudioAction =
  | { type: 'SET_PLAYING'; value: boolean }
  | { type: 'SET_PROGRESS'; value: number }
  | { type: 'SET_TIME'; current: number; progress: number }
  | { type: 'SET_DURATION'; value: number }
  | { type: 'SET_SPEED'; value: number }
  | { type: 'SET_REVERB'; value: number }
  | { type: 'SET_REVERB_TYPE'; value: 'default' | 'hall' | 'room' | 'plate' }
  | { type: 'SET_VOLUME'; value: number }
  | { type: 'SET_BASS'; value: number }
  | { type: 'SET_ETHEREAL_ECHO'; value: boolean }

  | { type: 'SET_EIGHT_D_ENABLED'; value: boolean }
  | { type: 'SET_EIGHT_D_AUTO_ROTATE'; value: boolean }
  | { type: 'SET_EIGHT_D_ROTATION_SPEED'; value: number }
  | { type: 'SET_EIGHT_D_MANUAL_POSITION'; value: number }
  // Modulation Effects Actions
  | { type: 'SET_FLANGER_ENABLED'; value: boolean }
  | { type: 'SET_FLANGER_RATE'; value: number }
  | { type: 'SET_FLANGER_DEPTH'; value: number }
  | { type: 'SET_FLANGER_FEEDBACK'; value: number }
  | { type: 'SET_FLANGER_DELAY'; value: number }
  | { type: 'SET_TREMOLO_ENABLED'; value: boolean }
  | { type: 'SET_TREMOLO_RATE'; value: number }
  | { type: 'SET_TREMOLO_DEPTH'; value: number }
  | { type: 'SET_TREMOLO_SHAPE'; value: 'sine' | 'square' | 'triangle' | 'sawtooth' }
  // Distortion Effects Actions
  | { type: 'SET_OVERDRIVE_ENABLED'; value: boolean }
  | { type: 'SET_OVERDRIVE_GAIN'; value: number }
  | { type: 'SET_OVERDRIVE_TONE'; value: number }
  | { type: 'SET_OVERDRIVE_LEVEL'; value: number }
  | { type: 'SET_DISTORTION_ENABLED'; value: boolean }
  | { type: 'SET_DISTORTION_AMOUNT'; value: number }
  | { type: 'SET_DISTORTION_TONE'; value: number }
  | { type: 'SET_DISTORTION_LEVEL'; value: number }
  | { type: 'SET_BITCRUSHER_ENABLED'; value: boolean }
  | { type: 'SET_BITCRUSHER_BITS'; value: number }
  | { type: 'SET_BITCRUSHER_SAMPLE_RATE'; value: number }

  // Spatial Audio Actions
  | { type: 'SET_BINAURAL_ENABLED'; value: boolean }
  | { type: 'SET_BINAURAL_ROOM_SIZE'; value: number }
  | { type: 'SET_BINAURAL_DAMPING'; value: number }
  | { type: 'SET_BINAURAL_WIDTH'; value: number }
  | { type: 'SET_MUFFLE_ENABLED'; value: boolean }
  | { type: 'SET_MUFFLE_INTENSITY'; value: number }
  | { type: 'RESET_MUFFLE_EFFECTS' }
  | { type: 'RESET_MODULATION_EFFECTS' }
  | { type: 'RESET_DISTORTION_EFFECTS' }
  | { type: 'RESET_SPATIAL_AUDIO_EFFECTS' }

  | { type: 'RESET' }
  | { type: 'NEW_TRACK_RESET' };