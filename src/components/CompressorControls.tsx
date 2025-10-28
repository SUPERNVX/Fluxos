import { memo } from 'react';
import { Slider } from './Slider';
import { ToggleSwitch } from './ToggleSwitch';

interface CompressorControlsProps {
  compressor: {
    enabled: boolean;
    threshold: number;
    ratio: number;
    attack: number;
    release: number;
  };
  setCompressorEnabled: (value: boolean) => void;
  setCompressorThreshold: (value: number) => void;
  setCompressorRatio: (value: number) => void;
  setCompressorAttack: (value: number) => void;
  setCompressorRelease: (value: number) => void;
}

export const CompressorControls = memo<CompressorControlsProps>(({ 
  compressor, 
  setCompressorEnabled, 
  setCompressorThreshold, 
  setCompressorRatio, 
  setCompressorAttack, 
  setCompressorRelease 
}) => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-3">
        <h4 className="text-md font-semibold text-zinc-800 dark:text-zinc-100">Compressor</h4>
        <ToggleSwitch 
          label="" 
          checked={compressor.enabled} 
          onChange={setCompressorEnabled} 
        />
      </div>
      
      {compressor.enabled && (
        <div className="ml-4 space-y-2">
          <Slider 
            label="Threshold" 
            value={compressor.threshold} 
            onChange={setCompressorThreshold} 
            min={-100} 
            max={0} 
            step={1} 
            unit="dB" 
          />
          <Slider 
            label="Ratio" 
            value={compressor.ratio} 
            onChange={setCompressorRatio} 
            min={1} 
            max={20} 
            step={1} 
            unit=":1" 
          />
          <Slider 
            label="Attack" 
            value={compressor.attack} 
            onChange={setCompressorAttack} 
            min={0} 
            max={1} 
            step={0.001} 
            unit="s" 
          />
          <Slider 
            label="Release" 
            value={compressor.release} 
            onChange={setCompressorRelease} 
            min={0} 
            max={1} 
            step={0.01} 
            unit="s" 
          />
        </div>
      )}
    </div>
  );
});