import type { AudioState, AudioAction } from '../types/audio';
import { AUDIO_CONFIG, DEFAULT_SURROUND_POSITIONS } from '../constants/audioConfig';

export const audioReducer = (state: AudioState, action: AudioAction): AudioState => {
  switch (action.type) {
    case 'SET_PLAYING': return { ...state, isPlaying: action.value };
    case 'SET_PROGRESS': return { ...state, progress: action.value };
    case 'SET_TIME': return { ...state, currentTime: action.current, progress: action.progress };
    case 'SET_DURATION': return { ...state, duration: action.value };
    case 'SET_SPEED': return { ...state, speed: action.value };
    case 'SET_REVERB': return { ...state, reverb: action.value };
    case 'SET_VOLUME': return { ...state, volume: action.value };
    case 'SET_BASS': return { ...state, bass: action.value };
    case 'SET_SURROUND': return { ...state, surround: action.value };
    case 'SET_SURROUND_POSITIONS': return { ...state, surroundPositions: action.value };
    case 'SET_EIGHT_D_ENABLED': return { 
      ...state, 
      eightD: { ...state.eightD, enabled: action.value } 
    };
    case 'SET_EIGHT_D_AUTO_ROTATE': return { 
      ...state, 
      eightD: { ...state.eightD, autoRotate: action.value } 
    };
    case 'SET_EIGHT_D_ROTATION_SPEED': return { 
      ...state, 
      eightD: { ...state.eightD, rotationSpeed: action.value } 
    };
    case 'SET_EIGHT_D_MANUAL_POSITION': return { 
      ...state, 
      eightD: { ...state.eightD, manualPosition: action.value } 
    };
    case 'RESET': return {
      isPlaying: false, progress: 0, currentTime: 0, duration: 0,
      speed: AUDIO_CONFIG.DEFAULT_SPEED, 
      reverb: AUDIO_CONFIG.DEFAULT_REVERB, 
      volume: AUDIO_CONFIG.DEFAULT_VOLUME,
      bass: AUDIO_CONFIG.DEFAULT_BASS,
      surround: false,
      surroundPositions: [...DEFAULT_SURROUND_POSITIONS],
      eightD: {
        enabled: false,
        autoRotate: true,
        rotationSpeed: AUDIO_CONFIG.EIGHT_D_ROTATION_SPEED,
        manualPosition: 0,
      },
    };
    case 'NEW_TRACK_RESET': return {
      ...state,
      isPlaying: false,
      progress: 0,
      currentTime: 0,
      duration: 0,
    };
    default: return state;
  }
};