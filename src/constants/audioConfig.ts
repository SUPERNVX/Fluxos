// --- AUDIO PLAYER CONFIGURATION --- //
export const AUDIO_CONFIG = {
  // Visualizer settings
  WAVEFORM_SAMPLES: 200,

  // Playback defaults
  DEFAULT_SPEED: 1.0,
  MIN_SPEED: 0.5,
  MAX_SPEED: 2.0,
  SPEED_STEP: 0.05,
  
  DEFAULT_VOLUME: 100,
  DEFAULT_REVERB: 0,
  DEFAULT_BASS: 0,

  // Audio processing
  REVERB_IMPULSE_DURATION: 1,
  REVERB_IMPULSE_DECAY: 4,
  BASS_BOOST_FREQUENCY: 250, // Hz
  BASS_BOOST_MAX_GAIN: 20, // dB

  // Spatial audio
  EIGHT_D_ROTATION_SPEED: 0.2, // Rotações por segundo (modificado de 0.5 para 0.2)
} as const;

// --- DEFAULT EFFECT VALUES --- //
// Valores padrão para efeitos de modulação
export const DEFAULT_MODULATION = {
  flanger: {
    enabled: false,
    rate: 0.5, // Hz
    depth: 75, // %
    feedback: 50, // %
    delay: 5, // ms
  },
  phaser: {
    enabled: false,
    rate: 0.8, // Hz
    depth: 60, // %
    stages: 6, // stages
    feedback: 30, // %
  },
  tremolo: {
    enabled: false,
    rate: 4, // Hz
    depth: 50, // %
    shape: 'sine' as const,
  },
} as const;

// Valores padrão para efeitos de distorção
export const DEFAULT_DISTORTION = {
  overdrive: {
    enabled: false,
    gain: 30, // %
    tone: 50, // %
    level: 70, // %
  },
  distortion: {
    enabled: false,
    amount: 50, // %
    tone: 60, // %
    level: 80, // %
  },
  bitcrusher: {
    enabled: false,
    bits: 8, // bits
    sampleRate: 8000, // Hz
  },
  fuzz: {
    enabled: false,
    amount: 70, // %
    tone: 40, // %
    gate: 20, // %
  },
} as const;



// Valores padrão para áudio espacial
export const DEFAULT_SPATIAL_AUDIO = {
  binaural: {
    enabled: false,
    roomSize: 50, // %
    damping: 100, // %
    width: 100, // %
  },
  muffle: {
    enabled: false,
    intensity: 0, // %
  },
} as const;

// Valores padrão para o compressor
export const DEFAULT_COMPRESSOR = {
  enabled: false,
  threshold: -24, // dB
  ratio: 12,
  attack: 0.003, // s
  release: 0.25, // s
} as const;
export const AUDIO_EFFECT_LIMITS = {
  // Speed
  SPEED: {
    MIN: 0.5,
    MAX: 2.0,
    STEP: 0.05
  },
  
  // Reverb
  REVERB: {
    MIN: 0,
    MAX: 100,
    STEP: 5
  },
  
  // Volume
  VOLUME: {
    MIN: 0,
    MAX: 200,
    STEP: 1
  },
  
  // Bass
  BASS: {
    MIN: 0,
    MAX: 100,
    STEP: 1
  },
  
  // Modulation effects
  MODULATION: {
    RATE: {
      MIN: 0.1,
      MAX: 10,
      STEP: 0.1
    },
    DEPTH: {
      MIN: 0,
      MAX: 100,
      STEP: 1
    },
    FEEDBACK: {
      MIN: 0,
      MAX: 100,
      STEP: 1
    },
    DELAY: {
      MIN: 0,
      MAX: 20,
      STEP: 1
    },
    STAGES: {
      MIN: 4,
      MAX: 12,
      STEP: 1
    }
  },
  
  // Distortion effects
  DISTORTION: {
    GAIN: {
      MIN: 0,
      MAX: 100,
      STEP: 1
    },
    TONE: {
      MIN: 0,
      MAX: 100,
      STEP: 1
    },
    LEVEL: {
      MIN: 0,
      MAX: 100,
      STEP: 1
    },
    AMOUNT: {
      MIN: 0,
      MAX: 100,
      STEP: 1
    },
    BITS: {
      MIN: 1,
      MAX: 16,
      STEP: 1
    },
    SAMPLE_RATE: {
      MIN: 1000,
      MAX: 44100,
      STEP: 100
    },
    GATE: {
      MIN: 0,
      MAX: 100,
      STEP: 1
    }
  },
  

  
  // Spatial audio
  SPATIAL_AUDIO: {
    WIDTH: {
      MIN: 0,
      MAX: 100,
      STEP: 1
    },
    DAMPING: {
      MIN: 0,
      MAX: 100,
      STEP: 1
    },
    ROOM_SIZE: {
      MIN: 0,
      MAX: 100,
      STEP: 1
    },
    INTENSITY: {
      MIN: 0,
      MAX: 100,
      STEP: 1
    }
  },
  
  // 8D Audio
  EIGHT_D: {
    ROTATION_SPEED: {
      MIN: 0.1,
      MAX: 2,
      STEP: 0.1
    },
    MANUAL_POSITION: {
      MIN: 0,
      MAX: 360,
      STEP: 1
    }
  },

  // Compressor
  COMPRESSOR: {
    THRESHOLD: {
      MIN: -100,
      MAX: 0,
      STEP: 1
    },
    RATIO: {
      MIN: 1,
      MAX: 20,
      STEP: 1
    },
    ATTACK: {
      MIN: 0,
      MAX: 1,
      STEP: 0.001
    },
    RELEASE: {
      MIN: 0,
      MAX: 1,
      STEP: 0.01
    }
  }
} as const;

