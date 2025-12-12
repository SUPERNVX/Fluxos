import { useReducer, useMemo, useEffect, useRef } from 'react';
import { audioReducer } from '../reducers/audioReducer';
import * as audioActions from '../actions/audioActions';
import { AUDIO_CONFIG, DEFAULT_MODULATION, DEFAULT_DISTORTION, DEFAULT_SPATIAL_AUDIO } from '../constants/audioConfig';

export const useAudioLogic = () => {
    const [state, dispatch] = useReducer(audioReducer, {
        isPlaying: false,
        progress: 0,
        currentTime: 0,
        duration: 0,
        speed: AUDIO_CONFIG.DEFAULT_SPEED,
        reverb: AUDIO_CONFIG.DEFAULT_REVERB,
        reverbType: 'default',
        volume: AUDIO_CONFIG.DEFAULT_VOLUME,
        bass: AUDIO_CONFIG.DEFAULT_BASS,
        etherealEcho: false,

        eightD: {
            enabled: false,
            autoRotate: true,
            rotationSpeed: AUDIO_CONFIG.EIGHT_D_ROTATION_SPEED,
            manualPosition: 0,
            pattern: 'circle',
        },
        modulation: { ...DEFAULT_MODULATION },
        distortion: { ...DEFAULT_DISTORTION },
        spatialAudio: { ...DEFAULT_SPATIAL_AUDIO, muffle: { enabled: false, intensity: 0 } },
    });

    const eightDAngleRef = useRef(0);

    // 8D Auto Rotation Loop
    useEffect(() => {
        if (!state.eightD.enabled || !state.eightD.autoRotate || !state.isPlaying) return;

        const intervalId = setInterval(() => {
            // Increment angle based on rotation speed
            // 360 degrees * rotationSpeed factor * time delta
            // Default rotationSpeed is 0.2
            if (document.hidden) return; // Save resources/CPU in background to prevent audio stutter

            eightDAngleRef.current = (eightDAngleRef.current + (state.eightD.rotationSpeed * 360 * 0.05)) % 360;
            dispatch(audioActions.setEightDManualPosition(eightDAngleRef.current));
        }, 50);

        return () => clearInterval(intervalId);
    }, [state.eightD.enabled, state.eightD.autoRotate, state.eightD.rotationSpeed, state.isPlaying]);

    const actions = useMemo(() => ({
        setSpeed: (value: number) => dispatch(audioActions.setSpeed(value)),
        setReverb: (value: number) => dispatch(audioActions.setReverb(value)),
        setReverbType: (value: 'default' | 'hall' | 'room' | 'plate') => dispatch(audioActions.setReverbType(value)),
        setVolume: (value: number) => dispatch(audioActions.setVolume(value)),
        setBass: (value: number) => dispatch(audioActions.setBass(value)),
        setEtherealEcho: (value: boolean) => dispatch(audioActions.setEtherealEcho(value)),

        // 8D
        setEightDEnabled: (value: boolean) => dispatch(audioActions.setEightDEnabled(value)),
        setEightDAutoRotate: (value: boolean) => dispatch(audioActions.setEightDAutoRotate(value)),
        setEightDRotationSpeed: (value: number) => dispatch(audioActions.setEightDRotationSpeed(value)),
        setEightDManualPosition: (value: number) => dispatch(audioActions.setEightDManualPosition(value)),
        setEightDPattern: (value: import('../types/audio').EightDPattern) => dispatch(audioActions.setEightDPattern(value)),

        // Modulation
        setFlangerEnabled: (value: boolean) => dispatch(audioActions.setFlangerEnabled(value)),
        setFlangerRate: (value: number) => dispatch(audioActions.setFlangerRate(value)),
        setFlangerDepth: (value: number) => dispatch(audioActions.setFlangerDepth(value)),
        setFlangerFeedback: (value: number) => dispatch(audioActions.setFlangerFeedback(value)),
        setFlangerDelay: (value: number) => dispatch(audioActions.setFlangerDelay(value)),
        setTremoloEnabled: (value: boolean) => dispatch(audioActions.setTremoloEnabled(value)),
        setTremoloRate: (value: number) => dispatch(audioActions.setTremoloRate(value)),
        setTremoloDepth: (value: number) => dispatch(audioActions.setTremoloDepth(value)),
        setTremoloShape: (value: 'sine' | 'square' | 'triangle' | 'sawtooth') => dispatch(audioActions.setTremoloShape(value)),

        // Distortion
        setOverdriveEnabled: (value: boolean) => dispatch(audioActions.setOverdriveEnabled(value)),
        setOverdriveGain: (value: number) => dispatch(audioActions.setOverdriveGain(value)),
        setOverdriveTone: (value: number) => dispatch(audioActions.setOverdriveTone(value)),
        setOverdriveLevel: (value: number) => dispatch(audioActions.setOverdriveLevel(value)),
        setDistortionEnabled: (value: boolean) => dispatch(audioActions.setDistortionEnabled(value)),
        setDistortionAmount: (value: number) => dispatch(audioActions.setDistortionAmount(value)),
        setDistortionTone: (value: number) => dispatch(audioActions.setDistortionTone(value)),
        setDistortionLevel: (value: number) => dispatch(audioActions.setDistortionLevel(value)),
        setBitcrusherEnabled: (value: boolean) => dispatch(audioActions.setBitcrusherEnabled(value)),
        setBitcrusherBits: (value: number) => dispatch(audioActions.setBitcrusherBits(value)),
        setBitcrusherSampleRate: (value: number) => dispatch(audioActions.setBitcrusherSampleRate(value)),

        // Spatial
        setBinauralEnabled: (value: boolean) => dispatch(audioActions.setBinauralEnabled(value)),
        setBinauralRoomSize: (value: number) => dispatch(audioActions.setBinauralRoomSize(value)),
        setBinauralDamping: (value: number) => dispatch(audioActions.setBinauralDamping(value)),
        setBinauralWidth: (value: number) => dispatch(audioActions.setBinauralWidth(value)),
        setMuffleEnabled: (value: boolean) => dispatch(audioActions.setMuffleEnabled(value)),
        setMuffleIntensity: (value: number) => dispatch(audioActions.setMuffleIntensity(value)),

        // Resets
        resetMuffledEffects: () => dispatch(audioActions.resetMuffledEffects()),
        resetModulationEffects: () => dispatch(audioActions.resetModulationEffects()),
        resetDistortionEffects: () => dispatch(audioActions.resetDistortionEffects()),
        resetSpatialAudioEffects: () => dispatch(audioActions.resetSpatialAudioEffects()),
    }), [dispatch]);

    return { state, dispatch, actions };
};
