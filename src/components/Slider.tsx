import { memo } from 'react';
import { useSliderTouchLock } from '../hooks/useSliderTouchLock';

export const Slider = memo<{
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  unit: string;
}>(({ label, value, onChange, min, max, step, unit }) => {
  const onPointerDown = useSliderTouchLock();
  const percentage = ((value - min) / (max - min)) * 100;
  const displayValue = label === 'Speed' && step < 0.1 ? value.toFixed(2) : value.toFixed(label === 'Speed' ? 1 : 0);

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-1">
        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{label}</label>
        <span className="text-sm text-zinc-500 dark:text-zinc-400 font-mono">{displayValue}{unit}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onPointerDown={onPointerDown}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer slider-thumb"
        style={{ background: `linear-gradient(to right, #d946ef ${percentage}%, rgb(203 213 225) ${percentage}%)` }}
      />
    </div>
  );
});