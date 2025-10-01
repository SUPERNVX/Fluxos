import { memo } from 'react';
import { Slider } from './Slider';
import { ToggleSwitch } from './ToggleSwitch';

interface SpatialAudioControlsProps {
  spatialAudio: {
    binaural: {
      enabled: boolean;
      roomSize: number;
      damping: number;
      width: number;
    };
  };
  setBinauralEnabled: (value: boolean) => void;
  setBinauralRoomSize: (value: number) => void;
  setBinauralDamping: (value: number) => void;
  setBinauralWidth: (value: number) => void;
  resetSpatialAudioEffects: () => void;
}

export const SpatialAudioControls = memo<SpatialAudioControlsProps>(({
  spatialAudio,
  setBinauralEnabled,
  setBinauralRoomSize,
  setBinauralDamping,
  setBinauralWidth,
  resetSpatialAudioEffects,
}) => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-3">
        <h4 className="text-md font-semibold text-zinc-800 dark:text-zinc-100">Advanced Spatial Audio</h4>
        <button
          onClick={resetSpatialAudioEffects}
          className="px-3 py-1 text-xs bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-md hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors"
        >
          Reset
        </button>
      </div>
      
      {/* Binaural */}
      <div className="space-y-3">
        <ToggleSwitch 
          label="Binaural Processing" 
          checked={spatialAudio.binaural.enabled} 
          onChange={setBinauralEnabled} 
        />
        {spatialAudio.binaural.enabled && (
          <div className="ml-4 space-y-2">
            <Slider 
              label="Room Size" 
              value={spatialAudio.binaural.roomSize} 
              onChange={setBinauralRoomSize} 
              min={0} 
              max={100} 
              step={1} 
              unit="%" 
            />
            <Slider 
              label="Damping" 
              value={spatialAudio.binaural.damping} 
              onChange={setBinauralDamping} 
              min={0} 
              max={100} 
              step={1} 
              unit="%" 
            />
            <Slider 
              label="Width" 
              value={spatialAudio.binaural.width} 
              onChange={setBinauralWidth} 
              min={0} 
              max={100} 
              step={1} 
              unit="%" 
            />
          </div>
        )}
      </div>


    </div>
  );
});