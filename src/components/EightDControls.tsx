import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { ToggleSwitch } from './ToggleSwitch';
import { EightDPattern } from '../types/audio';

export const EightDControls = memo<{
  eightD: {
    enabled: boolean;
    autoRotate: boolean;
    rotationSpeed: number;
    manualPosition: number;
    pattern: EightDPattern;
  };
  setEightDAutoRotate: (value: boolean) => void;
  setEightDRotationSpeed: (value: number) => void;
  setEightDManualPosition: (value: number) => void;
  setEightDPattern: (value: EightDPattern) => void;
}>(({ eightD, setEightDAutoRotate, setEightDRotationSpeed, setEightDManualPosition, setEightDPattern }) => {
  const { t } = useTranslation();

  if (!eightD.enabled) return null;

  return (
    <div className="space-y-4 mt-4 p-4 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
      <div className="space-y-2">
        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{t('audioEffects.eightDPatterns.title')}</label>
        <div className="flex flex-wrap gap-2">
          {(['circle', 'pingpong', 'figure8', 'random'] as EightDPattern[]).map((p) => (
            <button
              key={p}
              onClick={() => setEightDPattern(p)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all ${eightD.pattern === p
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-white dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-600'
                }`}
            >
              {t(`audioEffects.eightDPatterns.${p}`)}
            </button>
          ))}
        </div>
      </div>

      <ToggleSwitch
        label="Auto Rotation"
        checked={eightD.autoRotate}
        onChange={setEightDAutoRotate}
      />

      {!eightD.autoRotate && (
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Manual Position</label>
            <span className="text-sm text-zinc-500 dark:text-zinc-400">{eightD.manualPosition != null ? Math.round(eightD.manualPosition) : 0}°</span>
          </div>
          <input
            type="range"
            min="0"
            max="360"
            value={eightD.manualPosition != null ? eightD.manualPosition : 0}
            onChange={(e) => setEightDManualPosition(Number(e.target.value))}
            className="w-full h-2 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer"
          />
        </div>
      )}

      {eightD.autoRotate && (
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Rotation Speed</label>
            <span className="text-sm text-zinc-500 dark:text-zinc-400">{eightD.rotationSpeed != null ? eightD.rotationSpeed.toFixed(1) : '0.0'}x</span>
          </div>
          <input
            type="range"
            min="0.1"
            max="2"
            step="0.1"
            value={eightD.rotationSpeed != null ? eightD.rotationSpeed : 0.2}
            onChange={(e) => setEightDRotationSpeed(Number(e.target.value))}
            className="w-full h-2 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer"
          />
        </div>
      )}
    </div>
  );
});