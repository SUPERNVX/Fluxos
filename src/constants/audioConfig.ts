// --- CONSTANTS --- //
export const AUDIO_CONFIG = {
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
  SURROUND_CHANNELS: 8, // 7.1 surround
  EIGHT_D_ROTATION_SPEED: 0.2, // Rotações por segundo (modificado de 0.5 para 0.2)
} as const;

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
    damping: 40, // %
    width: 80, // %
  },
  panning3D: {
    enabled: false,
    x: 0, // -1 to 1
    y: 0, // -1 to 1
    z: 0, // -1 to 1
    autoMove: false,
    moveSpeed: 1, // 0.1-5
    movePattern: 'circle' as const,
  },
} as const;

// Posições padrão dos canais 7.1
export const DEFAULT_SURROUND_POSITIONS = [
  { angle: 0, elevation: 0 }, // Front center
  { angle: Math.PI/3, elevation: 0 }, // Front right (60°)
  { angle: -Math.PI/3, elevation: 0 }, // Front left (-60°)
  { angle: Math.PI/2, elevation: 0 }, // Side right (90°)
  { angle: -Math.PI/2, elevation: 0 }, // Side left (-90°)
  { angle: 2*Math.PI/3, elevation: 0 }, // Rear right (120°)
  { angle: -2*Math.PI/3, elevation: 0 }, // Rear left (-120°)
  { angle: Math.PI, elevation: 0 } // Rear center (180°)
];