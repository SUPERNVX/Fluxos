import type { AudioState, AudioAction } from '../types/audio';
import { 
  AUDIO_CONFIG, 
  DEFAULT_MODULATION, 
  DEFAULT_DISTORTION, 
  DEFAULT_SPATIAL_AUDIO,
  DEFAULT_COMPRESSOR
} from '../constants/audioConfig';

// Helper function to update specific effect
const updateEffect = (
  state: AudioState,
  effectGroup: keyof AudioState,
  effectName: string,
  updates: Partial<any>
): AudioState => {
  return {
    ...state,
    [effectGroup]: {
      ...state[effectGroup] as any,
      [effectName]: {
        ...(state[effectGroup] as any)[effectName],
        ...updates
      }
    }
  };
};

export const audioReducer = (state: AudioState, action: AudioAction): AudioState => {
  switch (action.type) {
    // Basic playback actions
    case 'SET_PLAYING': 
      return { ...state, isPlaying: action.value };
    case 'SET_PROGRESS': 
      return { ...state, progress: action.value };
    case 'SET_TIME': 
      return { ...state, currentTime: action.current, progress: action.progress };
    case 'SET_DURATION': 
      return { ...state, duration: action.value };
    case 'SET_SPEED': 
      return { ...state, speed: action.value };
    case 'SET_REVERB': 
      return { ...state, reverb: action.value };
    case 'SET_REVERB_TYPE': 
      return { ...state, reverbType: action.value };
    case 'SET_VOLUME': 
      return { ...state, volume: action.value };
    case 'SET_BASS': 
      return { ...state, bass: action.value };

    // 8D Audio actions - Fixed to properly update simple properties
    case 'SET_EIGHT_D_ENABLED': 
      return {
        ...state,
        eightD: {
          ...state.eightD,
          enabled: action.value
        }
      };
    case 'SET_EIGHT_D_AUTO_ROTATE': 
      return {
        ...state,
        eightD: {
          ...state.eightD,
          autoRotate: action.value
        }
      };
    case 'SET_EIGHT_D_ROTATION_SPEED': 
      return {
        ...state,
        eightD: {
          ...state.eightD,
          rotationSpeed: action.value
        }
      };
    case 'SET_EIGHT_D_MANUAL_POSITION': 
      return {
        ...state,
        eightD: {
          ...state.eightD,
          manualPosition: action.value
        }
      };
    
    // Modulation Effects
    case 'SET_FLANGER_ENABLED':
      return updateEffect(state, 'modulation', 'flanger', { enabled: action.value });
    case 'SET_FLANGER_RATE':
      return updateEffect(state, 'modulation', 'flanger', { rate: action.value });
    case 'SET_FLANGER_DEPTH':
      return updateEffect(state, 'modulation', 'flanger', { depth: action.value });
    case 'SET_FLANGER_FEEDBACK':
      return updateEffect(state, 'modulation', 'flanger', { feedback: action.value });
    case 'SET_FLANGER_DELAY':
      return updateEffect(state, 'modulation', 'flanger', { delay: action.value });
      
    case 'SET_PHASER_ENABLED':
      return updateEffect(state, 'modulation', 'phaser', { enabled: action.value });
    case 'SET_PHASER_RATE':
      return updateEffect(state, 'modulation', 'phaser', { rate: action.value });
    case 'SET_PHASER_DEPTH':
      return updateEffect(state, 'modulation', 'phaser', { depth: action.value });
    case 'SET_PHASER_STAGES':
      return updateEffect(state, 'modulation', 'phaser', { stages: action.value });
    case 'SET_PHASER_FEEDBACK':
      return updateEffect(state, 'modulation', 'phaser', { feedback: action.value });
      
    case 'SET_TREMOLO_ENABLED':
      return updateEffect(state, 'modulation', 'tremolo', { enabled: action.value });
    case 'SET_TREMOLO_RATE':
      return updateEffect(state, 'modulation', 'tremolo', { rate: action.value });
    case 'SET_TREMOLO_DEPTH':
      return updateEffect(state, 'modulation', 'tremolo', { depth: action.value });
    case 'SET_TREMOLO_SHAPE':
      return updateEffect(state, 'modulation', 'tremolo', { shape: action.value });
    
    // Distortion Effects
    case 'SET_OVERDRIVE_ENABLED':
      return updateEffect(state, 'distortion', 'overdrive', { enabled: action.value });
    case 'SET_OVERDRIVE_GAIN':
      return updateEffect(state, 'distortion', 'overdrive', { gain: action.value });
    case 'SET_OVERDRIVE_TONE':
      return updateEffect(state, 'distortion', 'overdrive', { tone: action.value });
    case 'SET_OVERDRIVE_LEVEL':
      return updateEffect(state, 'distortion', 'overdrive', { level: action.value });
      
    case 'SET_DISTORTION_ENABLED':
      return updateEffect(state, 'distortion', 'distortion', { enabled: action.value });
    case 'SET_DISTORTION_AMOUNT':
      return updateEffect(state, 'distortion', 'distortion', { amount: action.value });
    case 'SET_DISTORTION_TONE':
      return updateEffect(state, 'distortion', 'distortion', { tone: action.value });
    case 'SET_DISTORTION_LEVEL':
      return updateEffect(state, 'distortion', 'distortion', { level: action.value });
      
    case 'SET_BITCRUSHER_ENABLED':
      return updateEffect(state, 'distortion', 'bitcrusher', { enabled: action.value });
    case 'SET_BITCRUSHER_BITS':
      return updateEffect(state, 'distortion', 'bitcrusher', { bits: action.value });
    case 'SET_BITCRUSHER_SAMPLE_RATE':
      return updateEffect(state, 'distortion', 'bitcrusher', { sampleRate: action.value });
      
    case 'SET_FUZZ_ENABLED':
      return updateEffect(state, 'distortion', 'fuzz', { enabled: action.value });
    case 'SET_FUZZ_AMOUNT':
      return updateEffect(state, 'distortion', 'fuzz', { amount: action.value });
    case 'SET_FUZZ_TONE':
      return updateEffect(state, 'distortion', 'fuzz', { tone: action.value });
    case 'SET_FUZZ_GATE':
      return updateEffect(state, 'distortion', 'fuzz', { gate: action.value });
      

    
    // Spatial Audio
    case 'SET_BINAURAL_ENABLED':
      return updateEffect(state, 'spatialAudio', 'binaural', { enabled: action.value });
    case 'SET_BINAURAL_ROOM_SIZE':
      return updateEffect(state, 'spatialAudio', 'binaural', { roomSize: action.value });
    case 'SET_BINAURAL_DAMPING':
      return updateEffect(state, 'spatialAudio', 'binaural', { damping: action.value });
    case 'SET_BINAURAL_WIDTH':
      return updateEffect(state, 'spatialAudio', 'binaural', { width: action.value });

    case 'SET_MUFFLE_ENABLED':
      return {
        ...state,
        spatialAudio: {
          ...state.spatialAudio,
          muffle: {
            ...state.spatialAudio.muffle,
            enabled: action.value,
          },
        },
      };
    case 'SET_MUFFLE_INTENSITY':
      return {
        ...state,
        spatialAudio: {
          ...state.spatialAudio,
          muffle: {
            ...state.spatialAudio.muffle,
            intensity: action.value,
          },
        },
      };

    case 'RESET_MUFFLE_EFFECTS':
      return {
        ...state,
        spatialAudio: {
          ...state.spatialAudio,
          muffle: { ...DEFAULT_SPATIAL_AUDIO.muffle },
        },
      };

    // Compressor actions
    case 'SET_COMPRESSOR_ENABLED':
      return { ...state, compressor: { ...state.compressor, enabled: action.value } };
    case 'SET_COMPRESSOR_THRESHOLD':
      return { ...state, compressor: { ...state.compressor, threshold: action.value } };
    case 'SET_COMPRESSOR_RATIO':
      return { ...state, compressor: { ...state.compressor, ratio: action.value } };
    case 'SET_COMPRESSOR_ATTACK':
      return { ...state, compressor: { ...state.compressor, attack: action.value } };
    case 'SET_COMPRESSOR_RELEASE':
      return { ...state, compressor: { ...state.compressor, release: action.value } };
    
    // Reset Actions
    case 'RESET_MODULATION_EFFECTS':
      return { ...state, modulation: { ...DEFAULT_MODULATION } };
    case 'RESET_DISTORTION_EFFECTS':
      return { ...state, distortion: { ...DEFAULT_DISTORTION } };
    case 'RESET_SPATIAL_AUDIO_EFFECTS':
      return { ...state, spatialAudio: { ...DEFAULT_SPATIAL_AUDIO } };

    
    case 'RESET':
      return {
        isPlaying: false, 
        progress: 0, 
        currentTime: 0, 
        duration: 0,
        speed: AUDIO_CONFIG.DEFAULT_SPEED, 
        reverb: AUDIO_CONFIG.DEFAULT_REVERB,
        reverbType: 'default',
        volume: AUDIO_CONFIG.DEFAULT_VOLUME,
        bass: AUDIO_CONFIG.DEFAULT_BASS,
        eightD: {
          enabled: false,
          autoRotate: true,
          rotationSpeed: AUDIO_CONFIG.EIGHT_D_ROTATION_SPEED,
          manualPosition: 0,
        },
        modulation: { ...DEFAULT_MODULATION },
        distortion: { ...DEFAULT_DISTORTION },
        spatialAudio: { ...DEFAULT_SPATIAL_AUDIO },
        compressor: { ...DEFAULT_COMPRESSOR },
      };
      
    case 'NEW_TRACK_RESET':
      return {
        ...state,
        isPlaying: false,
        progress: 0,
        currentTime: 0,
        duration: 0,
      };
      
    default:
      return state;
  }
};