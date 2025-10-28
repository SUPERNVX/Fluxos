import { useState, memo, useRef, useEffect } from 'react';
import { useSliderTouchLock } from '../hooks/useSliderTouchLock';
import { Tooltip } from './Tooltip';
import { NumericInput } from './NumericInput';

// Define tooltip text for different label types
const getTooltipText = (label: string): string | null => {
  switch(label) {
    case 'Bits':
      return 'Controls the bit depth reduction. Lower values create more digital distortion.';
    case 'Sample Rate':
      return 'Controls the sample rate reduction. Lower values create more aliasing and digital artifacts.';
    case 'Rate':
      return 'Controls the speed of the modulation effect.';
    case 'Depth':
      return 'Controls the intensity of the modulation effect.';
    case 'Feedback':
      return 'Controls the amount of signal fed back into the effect.';
    case 'Delay':
      return 'Controls the delay time before the effect is applied.';
    case 'Amount':
      return 'Controls the intensity of the distortion effect.';
    case 'Tone':
      return 'Controls the frequency response of the effect.';
    case 'Level':
      return 'Controls the output level of the effect.';
    case 'Gate':
      return 'Controls the threshold for the fuzz effect.';
    case 'Stages':
      return 'Controls the number of phase shift stages.';
    case 'Room Size':
      return 'Controls the size of the virtual room.';
    case 'Damping':
      return 'Controls the amount of high frequency damping.';
    case 'Width':
      return 'Controls the stereo width of the effect.';
    case 'Intensity':
      return 'Controls the strength of the muffle effect.';
    case 'Threshold':
      return 'Controls the input level at which compression begins.';
    case 'Ratio':
      return 'Controls the compression ratio.';
    case 'Attack':
      return 'Controls how quickly the compressor engages.';
    case 'Release':
      return 'Controls how quickly the compressor disengages.';
    default:
      return null;
  }
};

export const Slider = memo<{
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  unit: string;
}>(({ label, value, onChange, min, max, step, unit }) => {
  const [isDragging, setIsDragging] = useState(false);
  const sliderRef = useRef<HTMLInputElement>(null);
  const onPointerDown = useSliderTouchLock();
  const isValueValid = (value != null && value !== undefined && typeof value === 'number' && !isNaN(value));
  const safeValue = isValueValid ? value : 0;
  const percentage = ((safeValue - min) / (max - min)) * 100;
  const displayValue = isValueValid
    ? (label === 'Speed' && step < 0.1 ? value.toFixed(2) : value.toFixed(label === 'Speed' ? 1 : 0))
    : '0';
    
  const tooltipText = getTooltipText(label);

  useEffect(() => {
    const handleMouseUp = () => setIsDragging(false);
    const handleMouseMove = () => {};

    if (isDragging) {
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('mousemove', handleMouseMove);
    }

    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, [isDragging]);

  const handleMouseDown = (_e: React.MouseEvent) => {
    onPointerDown();
    setIsDragging(true);
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(Number(e.target.value));
  };

  return (
    <div className="w-full relative">
      <div className="flex justify-between items-center mb-1">
        {tooltipText ? (
          <Tooltip content={tooltipText}>
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 cursor-help">{label}</label>
          </Tooltip>
        ) : (
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{label}</label>
        )}
        <div className="flex items-center gap-2">
          <NumericInput
            value={value}
            onChange={onChange}
            min={min}
            max={max}
            step={step}
            unit={unit}
            label={label}
            className="w-28 h-10"
          />
        </div>
      </div>
      <input
        ref={sliderRef}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value != null && value !== undefined ? value : 0}
        onMouseDown={handleMouseDown}
        onChange={handleSliderChange}
        className="w-full h-2 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer slider-thumb touch-manipulation"
        style={{ background: `linear-gradient(to right, #d946ef ${percentage}%, rgb(203 213 225) ${percentage}%)` }}
      />
      {isDragging && (
        <div 
          className="absolute bg-zinc-800 text-white text-xs rounded py-1 px-2 whitespace-nowrap z-10"
          style={{ 
            left: `${percentage}%`, 
            transform: 'translateX(-50%)',
            bottom: '100%',
            marginBottom: '5px'
          }}
        >
          {displayValue}{unit}
        </div>
      )}
    </div>
  );
});