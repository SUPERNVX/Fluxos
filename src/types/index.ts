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

  eightD: {
    enabled: boolean;
    autoRotate: boolean;
    rotationSpeed: number;
    manualPosition: number; // 0-360 graus
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

  | { type: 'SET_EIGHT_D_ENABLED'; value: boolean }
  | { type: 'SET_EIGHT_D_AUTO_ROTATE'; value: boolean }
  | { type: 'SET_EIGHT_D_ROTATION_SPEED'; value: number }
  | { type: 'SET_EIGHT_D_MANUAL_POSITION'; value: number }
  | { type: 'RESET' }
  | { type: 'NEW_TRACK_RESET' };