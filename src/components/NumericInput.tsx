import { memo, useCallback } from 'react';

interface NumericInputProps {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  label?: string;
  className?: string;
}

export const NumericInput = memo<NumericInputProps>(({
  value,
  onChange,
  min,
  max,
  step = 1,
  unit = '',
  label,
  className = ''
}) => {
  const handleIncrement = useCallback(() => {
    onChange(Math.min(max, value + step));
  }, [value, step, max, onChange]);

  const handleDecrement = useCallback(() => {
    onChange(Math.max(min, value - step));
  }, [value, step, min, onChange]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value);
    if (!isNaN(newValue)) {
      onChange(Math.min(max, Math.max(min, newValue)));
    }
  };

  const displayValue = label === 'Speed' && step < 0.1 ? value.toFixed(2) : value.toFixed(0);

  return (
    <div className={`flex items-center bg-zinc-100 dark:bg-zinc-800 rounded-lg overflow-hidden ${className}`}>
      <button
        type="button"
        onClick={handleDecrement}
        className="px-2 py-2 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 active:scale-95 transition-all duration-150 rounded-l-lg"
      >
        -
      </button>
      <input
        type="number"
        value={displayValue}
        onChange={handleChange}
        min={min}
        max={max}
        step={step}
        className="w-16 px-2 py-2 text-center bg-transparent border-none outline-none text-sm [-moz-appearance:_textfield] [&::-webkit-outer-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none"
        onFocus={(e) => e.target.select()}
      />
      <button
        type="button"
        onClick={handleIncrement}
        className="px-2 py-2 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 active:scale-95 transition-all duration-150 rounded-r-lg"
      >
        +
      </button>
      {unit && <span className="px-2 text-sm text-zinc-500 dark:text-zinc-400">{unit}</span>}
    </div>
  );
});