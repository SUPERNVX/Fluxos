import { memo } from 'react';
import { Slider } from './Slider';
import { ToggleSwitch } from './ToggleSwitch';
import { useTranslation } from 'react-i18next';

interface DistortionControlsProps {
  distortion: {
    overdrive: {
      enabled: boolean;
      gain: number;
      tone: number;
      level: number;
    };
    distortion: {
      enabled: boolean;
      amount: number;
      tone: number;
      level: number;
    };
    bitcrusher: {
      enabled: boolean;
      bits: number;
      sampleRate: number;
    };
  };
  setOverdriveEnabled: (value: boolean) => void;
  setOverdriveGain: (value: number) => void;
  setOverdriveTone: (value: number) => void;
  setOverdriveLevel: (value: number) => void;
  setDistortionEnabled: (value: boolean) => void;
  setDistortionAmount: (value: number) => void;
  setDistortionTone: (value: number) => void;
  setDistortionLevel: (value: number) => void;
  setBitcrusherEnabled: (value: boolean) => void;
  setBitcrusherBits: (value: number) => void;
  setBitcrusherSampleRate: (value: number) => void;
  resetDistortionEffects: () => void;
}

export const DistortionControls = memo<DistortionControlsProps>(({ 
  distortion,
  setOverdriveEnabled,
  setOverdriveGain,
  setOverdriveTone,
  setOverdriveLevel,
  setDistortionEnabled,
  setDistortionAmount,
  setDistortionTone,
  setDistortionLevel,
  setBitcrusherEnabled,
  setBitcrusherBits,
  setBitcrusherSampleRate,
  resetDistortionEffects,
}) => {
  const { t } = useTranslation();
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-3">
        <h4 className="text-md font-semibold text-zinc-800 dark:text-zinc-100 flex items-center">
          {t('audioEffects.distortionEffects')}
          {(distortion.overdrive.enabled || distortion.distortion.enabled || distortion.bitcrusher.enabled) && (
            <span className="ml-2 w-2 h-2 rounded-full bg-green-500"></span>
          )}
        </h4>
        <button
          onClick={resetDistortionEffects}
          className="px-3 py-1 text-xs bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-md hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors"
        >
          {t('common.reset')}
        </button>
      </div>
      
      {/* Overdrive */}
      <div className="space-y-3">
        <ToggleSwitch 
          label={t('audioEffects.overdrive.title')} 
          checked={distortion.overdrive.enabled} 
          onChange={setOverdriveEnabled} 
        />
        {distortion.overdrive.enabled && (
          <div className="ml-4 space-y-2">
            <Slider 
              label={t('audioEffects.overdrive.gain')} 
              value={distortion.overdrive.gain} 
              onChange={setOverdriveGain} 
              min={0} 
              max={100} 
              step={1} 
              unit="%" 
            />
            <Slider 
              label={t('audioEffects.overdrive.tone')} 
              value={distortion.overdrive.tone} 
              onChange={setOverdriveTone} 
              min={0} 
              max={100} 
              step={1} 
              unit="%" 
              tooltipKey="tooltips.tone"
            />
            <Slider 
              label={t('audioEffects.overdrive.level')} 
              value={distortion.overdrive.level} 
              onChange={setOverdriveLevel} 
              min={0} 
              max={100} 
              step={1} 
              unit="%" 
              tooltipKey="tooltips.level"
            />
          </div>
        )}
      </div>

      {/* Distortion */}
      <div className="space-y-3">
        <ToggleSwitch 
          label={t('audioEffects.distortion.title')} 
          checked={distortion.distortion.enabled} 
          onChange={setDistortionEnabled} 
        />
        {distortion.distortion.enabled && (
          <div className="ml-4 space-y-2">
            <Slider 
              label={t('audioEffects.distortion.amount')} 
              value={distortion.distortion.amount} 
              onChange={setDistortionAmount} 
              min={0} 
              max={100} 
              step={1} 
              unit="%" 
              tooltipKey="tooltips.amount"
            />
            <Slider 
              label={t('audioEffects.distortion.tone')} 
              value={distortion.distortion.tone} 
              onChange={setDistortionTone} 
              min={0} 
              max={100} 
              step={1} 
              unit="%" 
              tooltipKey="tooltips.tone"
            />
            <Slider 
              label={t('audioEffects.distortion.level')} 
              value={distortion.distortion.level} 
              onChange={setDistortionLevel} 
              min={0} 
              max={100} 
              step={1} 
              unit="%" 
              tooltipKey="tooltips.level"
            />
          </div>
        )}
      </div>

      {/* Bitcrusher */}
      <div className="space-y-3">
        <ToggleSwitch 
          label={t('audioEffects.bitcrusher.title')} 
          checked={distortion.bitcrusher.enabled} 
          onChange={setBitcrusherEnabled} 
        />
        {distortion.bitcrusher.enabled && (
          <div className="ml-4 space-y-2">
            <Slider 
              label={t('audioEffects.bitcrusher.bits')} 
              value={distortion.bitcrusher.bits} 
              onChange={setBitcrusherBits} 
              min={1} 
              max={16} 
              step={1} 
              unit="" 
              tooltipKey="tooltips.bits"
            />
            <Slider 
              label={t('audioEffects.bitcrusher.sampleRate')} 
              value={distortion.bitcrusher.sampleRate} 
              onChange={setBitcrusherSampleRate} 
              min={1000} 
              max={44100} 
              step={100} 
              unit="Hz" 
              tooltipKey="tooltips.sampleRate"
            />
          </div>
        )}
      </div>


    </div>
  );
});