import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Slider } from './Slider';
import { ToggleSwitch } from './ToggleSwitch';

interface MuffledControlsProps {
  muffled: {
    enabled: boolean;
    intensity: number;
  };
  setMuffledEnabled: (value: boolean) => void;
  setMuffledIntensity: (value: number) => void;
  resetMuffledEffects: () => void;
}

export const MuffledControls = memo<MuffledControlsProps>(({
  muffled,
  setMuffledEnabled,
  setMuffledIntensity,
  resetMuffledEffects,
}) => {
  const { t } = useTranslation();
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-3">
        <h4 className="text-md font-semibold text-zinc-800 dark:text-zinc-100">{t('audioEffects.muffle.sectionTitle')}</h4>
        <button
          onClick={resetMuffledEffects}
          className="px-3 py-1 text-xs bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-md hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors"
        >
          {t('common.reset')}
        </button>
      </div>
      
      <ToggleSwitch 
        label={t('audioEffects.muffle.title')} 
        checked={muffled.enabled} 
        onChange={setMuffledEnabled} 
      />
      
      {muffled.enabled && (
        <div className="ml-4 space-y-2">
          <Slider 
            label={t('audioEffects.muffle.intensity')} 
            value={muffled.intensity != null ? muffled.intensity : 50} 
            onChange={setMuffledIntensity} 
            min={0} 
            max={100} 
            step={1} 
            unit="%" 
          />
        </div>
      )}
    </div>
  );
});