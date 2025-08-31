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