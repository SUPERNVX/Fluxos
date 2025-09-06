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
    panning3D: {
      enabled: boolean;
      x: number;
      y: number;
      z: number;
      autoMove: boolean;
      moveSpeed: number;
      movePattern: 'circle' | 'figure8' | 'random' | 'pendulum';
    };
  };
  setBinauralEnabled: (value: boolean) => void;
  setBinauralRoomSize: (value: number) => void;
  setBinauralDamping: (value: number) => void;
  setBinauralWidth: (value: number) => void;
  setPanning3DEnabled: (value: boolean) => void;
  setPanning3DX: (value: number) => void;
  setPanning3DY: (value: number) => void;
  setPanning3DZ: (value: number) => void;
  setPanning3DAutoMove: (value: boolean) => void;
  setPanning3DMoveSpeed: (value: number) => void;
  setPanning3DMovePattern: (value: 'circle' | 'figure8' | 'random' | 'pendulum') => void;
  resetSpatialAudioEffects: () => void;
}

export const SpatialAudioControls = memo<SpatialAudioControlsProps>(({
  spatialAudio,
  setBinauralEnabled,
  setBinauralRoomSize,
  setBinauralDamping,
  setBinauralWidth,
  setPanning3DEnabled,
  setPanning3DX,
  setPanning3DY,
  setPanning3DZ,
  setPanning3DAutoMove,
  setPanning3DMoveSpeed,
  setPanning3DMovePattern,
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

      {/* 3D Panning */}
      <div className="space-y-3">
        <ToggleSwitch 
          label="3D Panning" 
          checked={spatialAudio.panning3D.enabled} 
          onChange={setPanning3DEnabled} 
        />
        {spatialAudio.panning3D.enabled && (
          <div className="ml-4 space-y-2">
            <Slider 
              label="X Position" 
              value={spatialAudio.panning3D.x} 
              onChange={setPanning3DX} 
              min={-1} 
              max={1} 
              step={0.1} 
              unit="" 
            />
            <Slider 
              label="Y Position" 
              value={spatialAudio.panning3D.y} 
              onChange={setPanning3DY} 
              min={-1} 
              max={1} 
              step={0.1} 
              unit="" 
            />
            <Slider 
              label="Z Position" 
              value={spatialAudio.panning3D.z} 
              onChange={setPanning3DZ} 
              min={-1} 
              max={1} 
              step={0.1} 
              unit="" 
            />
            <ToggleSwitch 
              label="Auto Movement" 
              checked={spatialAudio.panning3D.autoMove} 
              onChange={setPanning3DAutoMove} 
            />
            {spatialAudio.panning3D.autoMove && (
              <>
                <Slider 
                  label="Move Speed" 
                  value={spatialAudio.panning3D.moveSpeed} 
                  onChange={setPanning3DMoveSpeed} 
                  min={0.1} 
                  max={5} 
                  step={0.1} 
                  unit="" 
                />
                <div className="flex flex-col space-y-2">
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Movement Pattern</label>
                  <select 
                    value={spatialAudio.panning3D.movePattern} 
                    onChange={(e) => setPanning3DMovePattern(e.target.value as 'circle' | 'figure8' | 'random' | 'pendulum')}
                    className="px-3 py-2 bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 rounded-lg text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-accent"
                  >
                    <option value="circle">Circle</option>
                    <option value="figure8">Figure 8</option>
                    <option value="random">Random</option>
                    <option value="pendulum">Pendulum</option>
                  </select>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
});