import { memo } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-3">
        <h4 className="text-md font-semibold text-zinc-800 dark:text-zinc-100">{t('audioEffects.compressor.title')}</h4>
        <ToggleSwitch 
          label="" 
          checked={compressor.enabled} 
          onChange={setCompressorEnabled} 
        />
      </div>
      
      {compressor.enabled && (
        <div className="ml-4 space-y-2">
          <Slider 
            label={t('audioEffects.compressor.threshold')} 
            value={compressor.threshold} 
            onChange={setCompressorThreshold} 
            min={-100} 
            max={0} 
            step={1} 
            unit="dB" 
          />
          <Slider 
            label={t('audioEffects.compressor.ratio')} 
            value={compressor.ratio} 
            onChange={setCompressorRatio} 
            min={1} 
            max={20} 
            step={1} 
            unit=":1" 
          />
          <Slider 
            label={t('audioEffects.compressor.attack')} 
            value={compressor.attack} 
            onChange={setCompressorAttack} 
            min={0} 
            max={1} 
            step={0.001} 
            unit="s" 
          />
          <Slider 
            label={t('audioEffects.compressor.release')} 
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