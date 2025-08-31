import { memo } from 'react';

export const SurroundControls = memo<{
  surround: boolean;
  surroundPositions: { angle: number; elevation: number }[];
  setSurroundPositions: (value: { angle: number; elevation: number }[]) => void;
  resetSurroundPositions: () => void;
}>(({ surround, surroundPositions, setSurroundPositions, resetSurroundPositions }) => {
  if (!surround) return null;

  const handlePositionChange = (index: number, field: 'angle' | 'elevation', value: number) => {
    const newPositions = [...surroundPositions];
    newPositions[index] = { ...newPositions[index], [field]: value };
    setSurroundPositions(newPositions);
  };

  const channelNames = [
    "Front Center",
    "Front Right",
    "Front Left",
    "Side Right",
    "Side Left",
    "Rear Right",
    "Rear Left",
    "Rear Center"
  ];

  return (
    <div className="space-y-4 mt-4 p-4 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
      <div className="flex justify-between items-center mb-3">
        <h4 className="text-md font-semibold text-zinc-800 dark:text-zinc-100">Channel Positions</h4>
        <button
          onClick={resetSurroundPositions}
          className="text-xs px-2 py-1 bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors"
        >
          Reset
        </button>
      </div>
      
      <div className="space-y-4 max-h-60 overflow-y-auto">
        {surroundPositions.map((position, index) => (
          <div key={index} className="space-y-2 p-3 bg-zinc-200 dark:bg-zinc-700 rounded-lg">
            <div className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
              {channelNames[index]}
            </div>
            
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-xs text-zinc-700 dark:text-zinc-300">Angle</label>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  {Math.round(position.angle * 180 / Math.PI)}°
                </span>
              </div>
              <input
                type="range"
                min="-3.14"
                max="3.14"
                step="0.01"
                value={position.angle}
                onChange={(e) => handlePositionChange(index, 'angle', Number(e.target.value))}
                className="w-full h-2 bg-zinc-300 dark:bg-zinc-600 rounded-lg appearance-none cursor-pointer"
              />
            </div>
            
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-xs text-zinc-700 dark:text-zinc-300">Elevation</label>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  {Math.round(position.elevation * 180 / Math.PI)}°
                </span>
              </div>
              <input
                type="range"
                min="-1.57"
                max="1.57"
                step="0.01"
                value={position.elevation}
                onChange={(e) => handlePositionChange(index, 'elevation', Number(e.target.value))}
                className="w-full h-2 bg-zinc-300 dark:bg-zinc-600 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});