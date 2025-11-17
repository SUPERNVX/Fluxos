import { useState, memo, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSliderTouchLock } from '../hooks/useSliderTouchLock';
import { Tooltip } from './Tooltip';
import { NumericInput } from './NumericInput';

// Optional tooltip key allows stable i18n regardless of label translation

export const Slider = memo<{
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  unit: string;
  tooltipKey?: string;
}>(({ label, value, onChange, min, max, step, unit, tooltipKey }) => {
  const [isDragging, setIsDragging] = useState(false);
  const sliderRef = useRef<HTMLInputElement>(null);
  const onPointerDown = useSliderTouchLock();
  const { t } = useTranslation();
  const isValueValid = (value != null && value !== undefined && typeof value === 'number' && !isNaN(value));
  const safeValue = isValueValid ? value : 0;
  const percentage = ((safeValue - min) / (max - min)) * 100;
  const decimals = step < 0.1 ? 2 : step < 1 ? 1 : 0;
  const displayValue = isValueValid ? value.toFixed(decimals) : '0';
    
  const tooltipText = tooltipKey ? t(tooltipKey) : null;

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

  const handleMouseDown = () => {
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