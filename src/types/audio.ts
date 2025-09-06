export type Track = {
  name: string;
  artist: string;
  coverUrl: string;
};

export type AudioState = {
  isPlaying: boolean;
  progress: number;
  currentTime: number;
  duration: number;
  speed: number;
  reverb: number;
  volume: number;
  bass: number;
  surround: boolean; // 7.1 surround
  surroundPositions: { angle: number; elevation: number }[]; // Posições personalizadas dos canais
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
    phaser: {
      enabled: boolean;
      rate: number; // 0.1-10 Hz
      depth: number; // 0-100%
      stages: number; // 4-12 stages
      feedback: number; // 0-100%
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
    fuzz: {
      enabled: boolean;
      amount: number; // 0-100%
      tone: number; // 0-100%
      gate: number; // 0-100%
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
    panning3D: {
      enabled: boolean;
      x: number; // -1 to 1
      y: number; // -1 to 1
      z: number; // -1 to 1
      autoMove: boolean;
      moveSpeed: number; // 0.1-5
      movePattern: 'circle' | 'figure8' | 'random' | 'pendulum';
    };
  };
};

export type AudioAction = 
  | { type: 'SET_PLAYING'; value: boolean }
  | { type: 'SET_PROGRESS'; value: number }
  | { type: 'SET_TIME'; current: number; progress: number }
  | { type: 'SET_DURATION'; value: number }
  | { type: 'SET_SPEED'; value: number }
  | { type: 'SET_REVERB'; value: number }
  | { type: 'SET_VOLUME'; value: number }
  | { type: 'SET_BASS'; value: number }
  | { type: 'SET_SURROUND'; value: boolean }
  | { type: 'SET_SURROUND_POSITIONS'; value: { angle: number; elevation: number }[] }
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
  | { type: 'SET_PHASER_ENABLED'; value: boolean }
  | { type: 'SET_PHASER_RATE'; value: number }
  | { type: 'SET_PHASER_DEPTH'; value: number }
  | { type: 'SET_PHASER_STAGES'; value: number }
  | { type: 'SET_PHASER_FEEDBACK'; value: number }
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
  | { type: 'SET_FUZZ_ENABLED'; value: boolean }
  | { type: 'SET_FUZZ_AMOUNT'; value: number }
  | { type: 'SET_FUZZ_TONE'; value: number }
  | { type: 'SET_FUZZ_GATE'; value: number }
  // Spatial Audio Actions
  | { type: 'SET_BINAURAL_ENABLED'; value: boolean }
  | { type: 'SET_BINAURAL_ROOM_SIZE'; value: number }
  | { type: 'SET_BINAURAL_DAMPING'; value: number }
  | { type: 'SET_BINAURAL_WIDTH'; value: number }
  | { type: 'SET_PANNING_3D_ENABLED'; value: boolean }
  | { type: 'SET_PANNING_3D_X'; value: number }
  | { type: 'SET_PANNING_3D_Y'; value: number }
  | { type: 'SET_PANNING_3D_Z'; value: number }
  | { type: 'SET_PANNING_3D_AUTO_MOVE'; value: boolean }
  | { type: 'SET_PANNING_3D_MOVE_SPEED'; value: number }
  | { type: 'SET_PANNING_3D_MOVE_PATTERN'; value: 'circle' | 'figure8' | 'random' | 'pendulum' }
  | { type: 'RESET_MODULATION_EFFECTS' }
  | { type: 'RESET_DISTORTION_EFFECTS' }
  | { type: 'RESET_SPATIAL_AUDIO_EFFECTS' }
  | { type: 'RESET' }
  | { type: 'NEW_TRACK_RESET' };