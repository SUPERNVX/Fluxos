// Action creators for audio state management

// Basic playback actions
export const setPlaying = (value: boolean) => ({ type: 'SET_PLAYING', value } as const);
export const setProgress = (value: number) => ({ type: 'SET_PROGRESS', value } as const);
export const setTime = (current: number, progress: number) => ({ type: 'SET_TIME', current, progress } as const);
export const setDuration = (value: number) => ({ type: 'SET_DURATION', value } as const);
export const setSpeed = (value: number) => ({ type: 'SET_SPEED', value } as const);
export const setReverb = (value: number) => ({ type: 'SET_REVERB', value } as const);
export const setReverbType = (value: 'default' | 'hall' | 'room' | 'plate') => ({ type: 'SET_REVERB_TYPE', value } as const);
export const setVolume = (value: number) => ({ type: 'SET_VOLUME', value } as const);
export const setBass = (value: number) => ({ type: 'SET_BASS', value } as const);

// 8D Audio actions
export const setEightDEnabled = (value: boolean) => ({ type: 'SET_EIGHT_D_ENABLED', value } as const);
export const setEightDAutoRotate = (value: boolean) => ({ type: 'SET_EIGHT_D_AUTO_ROTATE', value } as const);
export const setEightDRotationSpeed = (value: number) => ({ type: 'SET_EIGHT_D_ROTATION_SPEED', value } as const);
export const setEightDManualPosition = (value: number) => ({ type: 'SET_EIGHT_D_MANUAL_POSITION', value } as const);



// Modulation effect actions
export const setFlangerEnabled = (value: boolean) => ({ type: 'SET_FLANGER_ENABLED', value } as const);
export const setFlangerRate = (value: number) => ({ type: 'SET_FLANGER_RATE', value } as const);
export const setFlangerDepth = (value: number) => ({ type: 'SET_FLANGER_DEPTH', value } as const);
export const setFlangerFeedback = (value: number) => ({ type: 'SET_FLANGER_FEEDBACK', value } as const);
export const setFlangerDelay = (value: number) => ({ type: 'SET_FLANGER_DELAY', value } as const);

export const setPhaserEnabled = (value: boolean) => ({ type: 'SET_PHASER_ENABLED', value } as const);
export const setPhaserRate = (value: number) => ({ type: 'SET_PHASER_RATE', value } as const);
export const setPhaserDepth = (value: number) => ({ type: 'SET_PHASER_DEPTH', value } as const);
export const setPhaserStages = (value: number) => ({ type: 'SET_PHASER_STAGES', value } as const);
export const setPhaserFeedback = (value: number) => ({ type: 'SET_PHASER_FEEDBACK', value } as const);

export const setTremoloEnabled = (value: boolean) => ({ type: 'SET_TREMOLO_ENABLED', value } as const);
export const setTremoloRate = (value: number) => ({ type: 'SET_TREMOLO_RATE', value } as const);
export const setTremoloDepth = (value: number) => ({ type: 'SET_TREMOLO_DEPTH', value } as const);
export const setTremoloShape = (value: 'sine' | 'square' | 'triangle' | 'sawtooth') => ({ type: 'SET_TREMOLO_SHAPE', value } as const);

// Distortion effect actions
export const setOverdriveEnabled = (value: boolean) => ({ type: 'SET_OVERDRIVE_ENABLED', value } as const);
export const setOverdriveGain = (value: number) => ({ type: 'SET_OVERDRIVE_GAIN', value } as const);
export const setOverdriveTone = (value: number) => ({ type: 'SET_OVERDRIVE_TONE', value } as const);
export const setOverdriveLevel = (value: number) => ({ type: 'SET_OVERDRIVE_LEVEL', value } as const);

export const setDistortionEnabled = (value: boolean) => ({ type: 'SET_DISTORTION_ENABLED', value } as const);
export const setDistortionAmount = (value: number) => ({ type: 'SET_DISTORTION_AMOUNT', value } as const);
export const setDistortionTone = (value: number) => ({ type: 'SET_DISTORTION_TONE', value } as const);
export const setDistortionLevel = (value: number) => ({ type: 'SET_DISTORTION_LEVEL', value } as const);

export const setBitcrusherEnabled = (value: boolean) => ({ type: 'SET_BITCRUSHER_ENABLED', value } as const);
export const setBitcrusherBits = (value: number) => ({ type: 'SET_BITCRUSHER_BITS', value } as const);
export const setBitcrusherSampleRate = (value: number) => ({ type: 'SET_BITCRUSHER_SAMPLE_RATE', value } as const);

export const setFuzzEnabled = (value: boolean) => ({ type: 'SET_FUZZ_ENABLED', value } as const);
export const setFuzzAmount = (value: number) => ({ type: 'SET_FUZZ_AMOUNT', value } as const);
export const setFuzzTone = (value: number) => ({ type: 'SET_FUZZ_TONE', value } as const);
export const setFuzzGate = (value: number) => ({ type: 'SET_FUZZ_GATE', value } as const);

// Spatial audio actions
export const setBinauralEnabled = (value: boolean) => ({ type: 'SET_BINAURAL_ENABLED', value } as const);
export const setBinauralRoomSize = (value: number) => ({ type: 'SET_BINAURAL_ROOM_SIZE', value } as const);
export const setBinauralDamping = (value: number) => ({ type: 'SET_BINAURAL_DAMPING', value } as const);
export const setBinauralWidth = (value: number) => ({ type: 'SET_BINAURAL_WIDTH', value } as const);

// Muffle effect actions
export const setMuffleEnabled = (value: boolean) => ({ type: 'SET_MUFFLE_ENABLED', value } as const);
export const setMuffleIntensity = (value: number) => ({ type: 'SET_MUFFLE_INTENSITY', value } as const);

export const resetMuffledEffects = () => ({ type: 'RESET_MUFFLE_EFFECTS' } as const);

// Reset actions
export const resetModulationEffects = () => ({ type: 'RESET_MODULATION_EFFECTS' } as const);
export const resetDistortionEffects = () => ({ type: 'RESET_DISTORTION_EFFECTS' } as const);
export const resetSpatialAudioEffects = () => ({ type: 'RESET_SPATIAL_AUDIO_EFFECTS' } as const);

export const resetAll = () => ({ type: 'RESET' } as const);
export const newTrackReset = () => ({ type: 'NEW_TRACK_RESET' } as const);