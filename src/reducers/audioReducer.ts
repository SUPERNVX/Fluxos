import type { AudioState, AudioAction } from '../types/audio';
import { 
  AUDIO_CONFIG, 
  DEFAULT_MODULATION, 
  DEFAULT_DISTORTION, 
  DEFAULT_SPATIAL_AUDIO,
  DEFAULT_MUFFLED
} from '../constants/audioConfig';

export const audioReducer = (state: AudioState, action: AudioAction): AudioState => {
  switch (action.type) {
    case 'SET_PLAYING': return { ...state, isPlaying: action.value };
    case 'SET_PROGRESS': return { ...state, progress: action.value };
    case 'SET_TIME': return { ...state, currentTime: action.current, progress: action.progress };
    case 'SET_DURATION': return { ...state, duration: action.value };
    case 'SET_SPEED': return { ...state, speed: action.value };
    case 'SET_REVERB': return { ...state, reverb: action.value };
    case 'SET_REVERB_TYPE': return { ...state, reverbType: action.value };
    case 'SET_VOLUME': return { ...state, volume: action.value };
    case 'SET_BASS': return { ...state, bass: action.value };

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
    
    // Modulation Effects
    case 'SET_FLANGER_ENABLED': return { 
      ...state, 
      modulation: { ...state.modulation, flanger: { ...state.modulation.flanger, enabled: action.value } } 
    };
    case 'SET_FLANGER_RATE': return { 
      ...state, 
      modulation: { ...state.modulation, flanger: { ...state.modulation.flanger, rate: action.value } } 
    };
    case 'SET_FLANGER_DEPTH': return { 
      ...state, 
      modulation: { ...state.modulation, flanger: { ...state.modulation.flanger, depth: action.value } } 
    };
    case 'SET_FLANGER_FEEDBACK': return { 
      ...state, 
      modulation: { ...state.modulation, flanger: { ...state.modulation.flanger, feedback: action.value } } 
    };
    case 'SET_FLANGER_DELAY': return { 
      ...state, 
      modulation: { ...state.modulation, flanger: { ...state.modulation.flanger, delay: action.value } } 
    };
    case 'SET_PHASER_ENABLED': return { 
      ...state, 
      modulation: { ...state.modulation, phaser: { ...state.modulation.phaser, enabled: action.value } } 
    };
    case 'SET_PHASER_RATE': return { 
      ...state, 
      modulation: { ...state.modulation, phaser: { ...state.modulation.phaser, rate: action.value } } 
    };
    case 'SET_PHASER_DEPTH': return { 
      ...state, 
      modulation: { ...state.modulation, phaser: { ...state.modulation.phaser, depth: action.value } } 
    };
    case 'SET_PHASER_STAGES': return { 
      ...state, 
      modulation: { ...state.modulation, phaser: { ...state.modulation.phaser, stages: action.value } } 
    };
    case 'SET_PHASER_FEEDBACK': return { 
      ...state, 
      modulation: { ...state.modulation, phaser: { ...state.modulation.phaser, feedback: action.value } } 
    };
    case 'SET_TREMOLO_ENABLED': return { 
      ...state, 
      modulation: { ...state.modulation, tremolo: { ...state.modulation.tremolo, enabled: action.value } } 
    };
    case 'SET_TREMOLO_RATE': return { 
      ...state, 
      modulation: { ...state.modulation, tremolo: { ...state.modulation.tremolo, rate: action.value } } 
    };
    case 'SET_TREMOLO_DEPTH': return { 
      ...state, 
      modulation: { ...state.modulation, tremolo: { ...state.modulation.tremolo, depth: action.value } } 
    };
    case 'SET_TREMOLO_SHAPE': return { 
      ...state, 
      modulation: { ...state.modulation, tremolo: { ...state.modulation.tremolo, shape: action.value } } 
    };
    
    // Distortion Effects
    case 'SET_OVERDRIVE_ENABLED': return { 
      ...state, 
      distortion: { ...state.distortion, overdrive: { ...state.distortion.overdrive, enabled: action.value } } 
    };
    case 'SET_OVERDRIVE_GAIN': return { 
      ...state, 
      distortion: { ...state.distortion, overdrive: { ...state.distortion.overdrive, gain: action.value } } 
    };
    case 'SET_OVERDRIVE_TONE': return { 
      ...state, 
      distortion: { ...state.distortion, overdrive: { ...state.distortion.overdrive, tone: action.value } } 
    };
    case 'SET_OVERDRIVE_LEVEL': return { 
      ...state, 
      distortion: { ...state.distortion, overdrive: { ...state.distortion.overdrive, level: action.value } } 
    };
    case 'SET_DISTORTION_ENABLED': return { 
      ...state, 
      distortion: { ...state.distortion, distortion: { ...state.distortion.distortion, enabled: action.value } } 
    };
    case 'SET_DISTORTION_AMOUNT': return { 
      ...state, 
      distortion: { ...state.distortion, distortion: { ...state.distortion.distortion, amount: action.value } } 
    };
    case 'SET_DISTORTION_TONE': return { 
      ...state, 
      distortion: { ...state.distortion, distortion: { ...state.distortion.distortion, tone: action.value } } 
    };
    case 'SET_DISTORTION_LEVEL': return { 
      ...state, 
      distortion: { ...state.distortion, distortion: { ...state.distortion.distortion, level: action.value } } 
    };
    case 'SET_BITCRUSHER_ENABLED': return { 
      ...state, 
      distortion: { ...state.distortion, bitcrusher: { ...state.distortion.bitcrusher, enabled: action.value } } 
    };
    case 'SET_BITCRUSHER_BITS': return { 
      ...state, 
      distortion: { ...state.distortion, bitcrusher: { ...state.distortion.bitcrusher, bits: action.value } } 
    };
    case 'SET_BITCRUSHER_SAMPLE_RATE': return { 
      ...state, 
      distortion: { ...state.distortion, bitcrusher: { ...state.distortion.bitcrusher, sampleRate: action.value } } 
    };
    case 'SET_FUZZ_ENABLED': return { 
      ...state, 
      distortion: { ...state.distortion, fuzz: { ...state.distortion.fuzz, enabled: action.value } } 
    };
    case 'SET_FUZZ_AMOUNT': return { 
      ...state, 
      distortion: { ...state.distortion, fuzz: { ...state.distortion.fuzz, amount: action.value } } 
    };
    case 'SET_FUZZ_TONE': return { 
      ...state, 
      distortion: { ...state.distortion, fuzz: { ...state.distortion.fuzz, tone: action.value } } 
    };
    case 'SET_FUZZ_GATE': return { 
      ...state, 
      distortion: { ...state.distortion, fuzz: { ...state.distortion.fuzz, gate: action.value } } 
    };
    case 'SET_MUFFLED_ENABLED': return { 
      ...state, 
      muffled: { ...state.muffled, enabled: action.value } 
    };
    case 'SET_MUFFLED_INTENSITY': return { 
      ...state, 
      muffled: { ...state.muffled, intensity: action.value } 
    };
    
    // Spatial Audio
    case 'SET_BINAURAL_ENABLED': return { 
      ...state, 
      spatialAudio: { ...state.spatialAudio, binaural: { ...state.spatialAudio.binaural, enabled: action.value } } 
    };
    case 'SET_BINAURAL_ROOM_SIZE': return { 
      ...state, 
      spatialAudio: { ...state.spatialAudio, binaural: { ...state.spatialAudio.binaural, roomSize: action.value } } 
    };
    case 'SET_BINAURAL_DAMPING': return { 
      ...state, 
      spatialAudio: { ...state.spatialAudio, binaural: { ...state.spatialAudio.binaural, damping: action.value } } 
    };
    case 'SET_BINAURAL_WIDTH': return { 
      ...state, 
      spatialAudio: { ...state.spatialAudio, binaural: { ...state.spatialAudio.binaural, width: action.value } } 
    };
    
    // Reset Actions
    case 'RESET_MODULATION_EFFECTS': return {
      ...state,
      modulation: { ...DEFAULT_MODULATION }
    };
    case 'RESET_DISTORTION_EFFECTS': return {
      ...state,
      distortion: { ...DEFAULT_DISTORTION }
    };
    case 'RESET_SPATIAL_AUDIO_EFFECTS': return {
      ...state,
      spatialAudio: { ...DEFAULT_SPATIAL_AUDIO }
    };
    case 'RESET_MUFFLED_EFFECTS': return {
      ...state,
      muffled: { ...DEFAULT_MUFFLED },
    };
    
    case 'RESET': return {
      isPlaying: false, progress: 0, currentTime: 0, duration: 0,
      speed: AUDIO_CONFIG.DEFAULT_SPEED, 
      reverb: AUDIO_CONFIG.DEFAULT_REVERB,
      reverbType: 'default',
      volume: AUDIO_CONFIG.DEFAULT_VOLUME,
      bass: AUDIO_CONFIG.DEFAULT_BASS,
      muffled: { ...DEFAULT_MUFFLED },
      eightD: {
        enabled: false,
        autoRotate: true,
        rotationSpeed: AUDIO_CONFIG.EIGHT_D_ROTATION_SPEED,
        manualPosition: 0,
      },
      modulation: { ...DEFAULT_MODULATION },
      distortion: { ...DEFAULT_DISTORTION },
      spatialAudio: { ...DEFAULT_SPATIAL_AUDIO },
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