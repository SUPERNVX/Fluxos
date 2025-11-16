import { memo } from 'react';
import { Slider } from './Slider';
import { ToggleSwitch } from './ToggleSwitch';

interface ModulationControlsProps {
  modulation: {
    flanger: {
      enabled: boolean;
      rate: number;
      depth: number;
      feedback: number;
      delay: number;
    };
    tremolo: {
      enabled: boolean;
      rate: number;
      depth: number;
      shape: 'sine' | 'square' | 'triangle' | 'sawtooth';
    };
  };
  setFlangerEnabled: (value: boolean) => void;
  setFlangerRate: (value: number) => void;
  setFlangerDepth: (value: number) => void;
  setFlangerFeedback: (value: number) => void;
  setFlangerDelay: (value: number) => void;
  setTremoloEnabled: (value: boolean) => void;
  setTremoloRate: (value: number) => void;
  setTremoloDepth: (value: number) => void;
  setTremoloShape: (value: 'sine' | 'square' | 'triangle' | 'sawtooth') => void;
  resetModulationEffects: () => void;
}

export const ModulationControls = memo<ModulationControlsProps>(({
  modulation,
  setFlangerEnabled,
  setFlangerRate,
  setFlangerDepth,
  setFlangerFeedback,
  setFlangerDelay,
  setTremoloEnabled,
  setTremoloRate,
  setTremoloDepth,
  setTremoloShape,
  resetModulationEffects,
}) => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-3">
        <h4 className="text-md font-semibold text-zinc-800 dark:text-zinc-100 flex items-center">
          Modulation
          {(modulation.flanger.enabled || modulation.tremolo.enabled) && (
            <span className="ml-2 w-2 h-2 rounded-full bg-green-500"></span>
          )}
        </h4>
        <button
          onClick={resetModulationEffects}
          className="px-3 py-1 text-xs bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-md hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors"
        >
          Reset
        </button>
      </div>
      
      {/* Flanger */}
      <div className="space-y-3">
        <ToggleSwitch 
          label="Flanger" 
          checked={modulation.flanger.enabled} 
          onChange={setFlangerEnabled} 
        />
        {modulation.flanger.enabled && (
          <div className="ml-4 space-y-2">
            <Slider 
              label="Rate" 
              value={modulation.flanger.rate} 
              onChange={setFlangerRate} 
              min={0.1} 
              max={10} 
              step={0.1} 
              unit="Hz" 
            />
            <Slider 
              label="Depth" 
              value={modulation.flanger.depth} 
              onChange={setFlangerDepth} 
              min={0} 
              max={100} 
              step={1} 
              unit="%" 
            />
            <Slider 
              label="Feedback" 
              value={modulation.flanger.feedback} 
              onChange={setFlangerFeedback} 
              min={0} 
              max={100} 
              step={1} 
              unit="%" 
            />
            <Slider 
              label="Delay" 
              value={modulation.flanger.delay} 
              onChange={setFlangerDelay} 
              min={0} 
              max={20} 
              step={1} 
              unit="ms" 
            />
          </div>
        )}
      </div>


      {/* Tremolo */}
      <div className="space-y-3">
        <ToggleSwitch 
          label="Tremolo" 
          checked={modulation.tremolo.enabled} 
          onChange={setTremoloEnabled} 
        />
        {modulation.tremolo.enabled && (
          <div className="ml-4 space-y-2">
            <Slider 
              label="Rate" 
              value={modulation.tremolo.rate} 
              onChange={setTremoloRate} 
              min={0.1} 
              max={20} 
              step={0.1} 
              unit="Hz" 
            />
            <Slider 
              label="Depth" 
              value={modulation.tremolo.depth} 
              onChange={setTremoloDepth} 
              min={0} 
              max={100} 
              step={1} 
              unit="%" 
            />
            <div className="flex flex-col space-y-2">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Wave Shape</label>
              <select 
                value={modulation.tremolo.shape} 
                onChange={(e) => setTremoloShape(e.target.value as 'sine' | 'square' | 'triangle' | 'sawtooth')}
                className="px-3 py-2 bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 rounded-lg text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="sine">Sine</option>
                <option value="square">Square</option>
                <option value="triangle">Triangle</option>
                <option value="sawtooth">Sawtooth</option>
              </select>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});