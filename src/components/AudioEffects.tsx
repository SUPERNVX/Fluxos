import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Slider } from './Slider';
import { ToggleSwitch } from './ToggleSwitch';
import { EightDControls } from './EightDControls';
import { ModulationControls } from './ModulationControls';
import { DistortionControls } from './DistortionControls';
import { SpatialAudioControls } from './SpatialAudioControls';
import { MuffledControls } from './MuffledControls';
import { CollapsibleSection } from './CollapsibleSection';
import { AUDIO_CONFIG } from '../constants/audioConfig';
import { useAudioPlayer } from '../hooks/useAudioPlayer';

export const AudioEffects = memo(({
  player,
}: { player: ReturnType<typeof useAudioPlayer> }) => {
  const { t } = useTranslation();
  const hasAnyEffectActive = player.reverb > 0 || 
                            player.volume !== 100 || 
                            player.bass > 0 || 
                            player.eightD.enabled || 
                            player.spatialAudio.binaural.enabled || 
                            player.spatialAudio.muffle.enabled || 
                            player.modulation.flanger.enabled ||
                            player.modulation.tremolo.enabled ||
                            player.distortion.overdrive.enabled ||
                            player.distortion.distortion.enabled ||
                            player.distortion.bitcrusher.enabled;

  return (
    <section className="bg-light-bg-secondary dark:bg-dark-bg-secondary p-4 md:p-6 rounded-xl">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-zinc-800 dark:text-zinc-100 flex items-center">
          {t('audioEffects.title')}
          {hasAnyEffectActive && (
            <span className="ml-2 w-2 h-2 rounded-full bg-green-500"></span>
          )}
        </h3>
      </div>
      <div className="space-y-2">
        <Slider label={t('audioEffects.speed')} value={player.speed} onChange={player.setSpeed}
          min={AUDIO_CONFIG.MIN_SPEED} max={AUDIO_CONFIG.MAX_SPEED} step={AUDIO_CONFIG.SPEED_STEP} unit="x" />
        
        <CollapsibleSection 
          title={t('audioEffects.basicEffects')} 
          activeIndicator={player.reverb > 0 || player.bass > 0}
          defaultOpen={true}
        >
          <div className="space-y-2 pt-2">
            <Slider label={t('audioEffects.reverb')} value={player.reverb} onChange={player.setReverb}
              min={0} max={100} step={5} unit="%" />
            
            {/* Reverb Type Selector */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => player.setReverbType('default')}
                className={`px-2 py-1 text-xs rounded ${player.reverbType === 'default' ? 'bg-accent text-white' : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200'}`}
              >
                {t('audioEffects.reverbTypes.default')}
              </button>
              <button
                onClick={() => player.setReverbType('hall')}
                className={`px-2 py-1 text-xs rounded ${player.reverbType === 'hall' ? 'bg-accent text-white' : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200'}`}
              >
                {t('audioEffects.reverbTypes.hall')}
              </button>
              <button
                onClick={() => player.setReverbType('room')}
                className={`px-2 py-1 text-xs rounded ${player.reverbType === 'room' ? 'bg-accent text-white' : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200'}`}
              >
                {t('audioEffects.reverbTypes.room')}
              </button>
              <button
                onClick={() => player.setReverbType('plate')}
                className={`px-2 py-1 text-xs rounded ${player.reverbType === 'plate' ? 'bg-accent text-white' : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200'}`}
              >
                {t('audioEffects.reverbTypes.plate')}
              </button>
            </div>
            
            <Slider label={t('audioEffects.volume')} value={player.volume} onChange={player.setVolume}
              min={0} max={200} step={1} unit="%" />
            <Slider label={t('audioEffects.bassBoost')} value={player.bass} onChange={player.setBass}
              min={0} max={100} step={1} unit="%" />
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          title={t('audioEffects.modulationEffects')}
          activeIndicator={player.modulation.flanger.enabled || player.modulation.tremolo.enabled}
          defaultOpen={true}
          resetAction={player.resetModulationEffects}
        >
          <ModulationControls
            modulation={player.modulation}
            setFlangerEnabled={player.setFlangerEnabled}
            setFlangerRate={player.setFlangerRate}
            setFlangerDepth={player.setFlangerDepth}
            setFlangerFeedback={player.setFlangerFeedback}
            setFlangerDelay={player.setFlangerDelay}
            setTremoloEnabled={player.setTremoloEnabled}
            setTremoloRate={player.setTremoloRate}
            setTremoloDepth={player.setTremoloDepth}
            setTremoloShape={player.setTremoloShape}
            resetModulationEffects={player.resetModulationEffects}
          />
        </CollapsibleSection>

        <CollapsibleSection
          title={t('audioEffects.distortionEffects')}
          activeIndicator={player.distortion.overdrive.enabled || player.distortion.distortion.enabled || player.distortion.bitcrusher.enabled}
          defaultOpen={true}
          resetAction={player.resetDistortionEffects}
        >
          <DistortionControls
            distortion={player.distortion}
            setOverdriveEnabled={player.setOverdriveEnabled}
            setOverdriveGain={player.setOverdriveGain}
            setOverdriveTone={player.setOverdriveTone}
            setOverdriveLevel={player.setOverdriveLevel}
            setDistortionEnabled={player.setDistortionEnabled}
            setDistortionAmount={player.setDistortionAmount}
            setDistortionTone={player.setDistortionTone}
            setDistortionLevel={player.setDistortionLevel}
            setBitcrusherEnabled={player.setBitcrusherEnabled}
            setBitcrusherBits={player.setBitcrusherBits}
            setBitcrusherSampleRate={player.setBitcrusherSampleRate}
            resetDistortionEffects={player.resetDistortionEffects}
          />
        </CollapsibleSection>

        <CollapsibleSection 
          title={t('audioEffects.spatialAudio')} 
          activeIndicator={player.eightD.enabled || player.spatialAudio.binaural.enabled || player.spatialAudio.muffle.enabled}
          defaultOpen={true}
        >
          <div className="space-y-4 pt-2">
            <ToggleSwitch
              label={t('audioEffects.eightDAudio')}
              checked={player.eightD.enabled}
              onChange={player.setEightDEnabled}
            />

            <EightDControls
              eightD={player.eightD}
              setEightDAutoRotate={player.setEightDAutoRotate}
              setEightDRotationSpeed={player.setEightDRotationSpeed}
              setEightDManualPosition={player.setEightDManualPosition}
            />
            
            <MuffledControls
              muffled={player.spatialAudio.muffle}
              setMuffledEnabled={player.setMuffleEnabled}
              setMuffledIntensity={player.setMuffleIntensity}
              resetMuffledEffects={player.resetMuffledEffects}
            />
            
            <SpatialAudioControls
              spatialAudio={player.spatialAudio}
              setBinauralEnabled={player.setBinauralEnabled}
              setBinauralRoomSize={player.setBinauralRoomSize}
              setBinauralDamping={player.setBinauralDamping}
              setBinauralWidth={player.setBinauralWidth}
              resetSpatialAudioEffects={player.resetSpatialAudioEffects}
            />
          </div>
        </CollapsibleSection>

      </div>
    </section>
  );
});
