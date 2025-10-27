import { memo } from 'react';
import { Slider } from './Slider';
import { ToggleSwitch } from './ToggleSwitch';
import { EightDControls } from './EightDControls';
import { ModulationControls } from './ModulationControls';
import { DistortionControls } from './DistortionControls';
import { SpatialAudioControls } from './SpatialAudioControls';
import { MuffledControls } from './MuffledControls';
import { AUDIO_CONFIG } from '../constants/audioConfig';
import { useAudioPlayer } from '../hooks/useAudioPlayer';

export const AudioEffects = memo(({
  player,
}: { player: ReturnType<typeof useAudioPlayer> }) => {
  return (
    <section className="bg-light-bg-secondary dark:bg-dark-bg-secondary p-4 md:p-6 rounded-xl">
      <h3 className="text-lg font-semibold text-zinc-800 dark:text-zinc-100 mb-4">Audio Effects</h3>
      <div className="space-y-6">
        <Slider label="Speed" value={player.speed} onChange={player.setSpeed}
          min={AUDIO_CONFIG.MIN_SPEED} max={AUDIO_CONFIG.MAX_SPEED} step={AUDIO_CONFIG.SPEED_STEP} unit="x" />
        <div className="space-y-2">
          <Slider label="Reverb" value={player.reverb} onChange={player.setReverb}
            min={0} max={100} step={5} unit="%" />

          {/* Temporary Reverb Type Selector */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => player.setReverbType('default')}
              className={`px-2 py-1 text-xs rounded ${player.reverbType === 'default' ? 'bg-accent text-white' : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200'}`}
            >
              Default
            </button>
            <button
              onClick={() => player.setReverbType('hall')}
              className={`px-2 py-1 text-xs rounded ${player.reverbType === 'hall' ? 'bg-accent text-white' : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200'}`}
            >
              Hall
            </button>
            <button
              onClick={() => player.setReverbType('room')}
              className={`px-2 py-1 text-xs rounded ${player.reverbType === 'room' ? 'bg-accent text-white' : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200'}`}
            >
              Room
            </button>
            <button
              onClick={() => player.setReverbType('plate')}
              className={`px-2 py-1 text-xs rounded ${player.reverbType === 'plate' ? 'bg-accent text-white' : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200'}`}
            >
              Plate
            </button>
          </div>
        </div>
        <Slider label="Volume" value={player.volume} onChange={player.setVolume}
          min={0} max={200} step={1} unit="%" />
        <Slider label="Bass Boost" value={player.bass} onChange={player.setBass}
          min={0} max={100} step={1} unit="%" />

        {/* Novos controles de espacialização */}
        {/* Novos efeitos de modulação */}
        <div className="pt-4 border-t border-zinc-200 dark:border-zinc-700">
          <ModulationControls
            modulation={player.modulation}
            setFlangerEnabled={player.setFlangerEnabled}
            setFlangerRate={player.setFlangerRate}
            setFlangerDepth={player.setFlangerDepth}
            setFlangerFeedback={player.setFlangerFeedback}
            setFlangerDelay={player.setFlangerDelay}
            setPhaserEnabled={player.setPhaserEnabled}
            setPhaserRate={player.setPhaserRate}
            setPhaserDepth={player.setPhaserDepth}
            setPhaserStages={player.setPhaserStages}
            setPhaserFeedback={player.setPhaserFeedback}
            setTremoloEnabled={player.setTremoloEnabled}
            setTremoloRate={player.setTremoloRate}
            setTremoloDepth={player.setTremoloDepth}
            setTremoloShape={player.setTremoloShape}
            resetModulationEffects={player.resetModulationEffects}
          />
        </div>

        {/* Efeitos de distorção */}
        <div className="pt-4 border-t border-zinc-200 dark:border-zinc-700">
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
            setFuzzEnabled={player.setFuzzEnabled}
            setFuzzAmount={player.setFuzzAmount}
            setFuzzTone={player.setFuzzTone}
            setFuzzGate={player.setFuzzGate}
            resetDistortionEffects={player.resetDistortionEffects}
          />
        </div>


        <div className="pt-4 border-t border-zinc-200 dark:border-zinc-700">
          <h4 className="text-md font-semibold text-zinc-800 dark:text-zinc-100 mb-3">Spatial Audio</h4>


          <ToggleSwitch
            label="8D Audio"
            checked={player.eightD.enabled}
            onChange={player.setEightDEnabled}
          />

          <EightDControls
            eightD={player.eightD}
            setEightDAutoRotate={player.setEightDAutoRotate}
            setEightDRotationSpeed={player.setEightDRotationSpeed}
            setEightDManualPosition={player.setEightDManualPosition}
          />
        </div>

        <div className="pt-4 border-t border-zinc-200 dark:border-zinc-700">
          <MuffledControls
            muffled={player.spatialAudio.muffle}
            setMuffledEnabled={player.setMuffleEnabled}
            setMuffledIntensity={player.setMuffleIntensity}
            resetMuffledEffects={player.resetMuffledEffects}
          />
        </div>

        {/* Áudio espacial avançado */}
        <div className="pt-4 border-t border-zinc-200 dark:border-zinc-700">
          <SpatialAudioControls
            spatialAudio={player.spatialAudio}
            setBinauralEnabled={player.setBinauralEnabled}
            setBinauralRoomSize={player.setBinauralRoomSize}
            setBinauralDamping={player.setBinauralDamping}
            setBinauralWidth={player.setBinauralWidth}
            resetSpatialAudioEffects={player.resetSpatialAudioEffects}
          />
        </div>
      </div>
    </section>
  );
});
