import { memo } from 'react';
import { Slider } from './Slider';

interface ReverbControlsProps {
  reverb: number;
  reverbType: 'default' | 'hall' | 'room' | 'plate';
  setReverb: (value: number) => void;
  setReverbType: (value: 'default' | 'hall' | 'room' | 'plate') => void;
}

export const ReverbControls = memo<ReverbControlsProps>(({
  reverb,
  reverbType,
  setReverb,
  setReverbType
}) => {
  return (
    <div className="space-y-2">
      <Slider 
        label="Reverb" 
        value={reverb} 
        onChange={setReverb} 
        min={0} 
        max={100} 
        step={5} 
        unit="%" 
      />
      
      <div className="flex flex-col space-y-2">
        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Reverb Type</label>
        <select 
          value={reverbType} 
          onChange={(e) => setReverbType(e.target.value as 'default' | 'hall' | 'room' | 'plate')}
          className="px-3 py-2 bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 rounded-lg text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-accent"
        >
          <option value="default">Default</option>
          <option value="hall">Hall</option>
          <option value="room">Room</option>
          <option value="plate">Plate</option>
        </select>
      </div>
    </div>
  );
});