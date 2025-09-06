import { useState, useMemo, memo, useCallback } from 'react';
import type { Track } from '../types/audio';
import { useAudioPlayer } from '../hooks/useAudioPlayer';
import { usePresets } from '../hooks/usePresets';
import { useFileHandler } from '../hooks/useFileHandler';
import { useSliderTouchLock } from '../hooks/useSliderTouchLock';
import { formatTime } from '../utils/audioHelpers';
import { SettingsModal } from './SettingsModal';
import { PlayerControls } from './PlayerControls';
import { Waveform } from './Waveform';
import { Slider } from './Slider';
import { ToggleSwitch } from './ToggleSwitch';
import { SurroundControls } from './SurroundControls';
import { EightDControls } from './EightDControls';
import { ModulationControls } from './ModulationControls';
import { DistortionControls } from './DistortionControls';
import { SpatialAudioControls } from './SpatialAudioControls';
import { SettingsIcon, DownloadIcon } from './Icons';
import { AUDIO_CONFIG } from '../constants/audioConfig';

export const EditorPage = memo<{ 
  track: Track;
  audioFile: File;
  onFileSelect: (file: File) => void;
}>(({ track, audioFile, onFileSelect }) => {
  const [isRendering, setIsRendering] = useState(false);
  const { fileInputRef, handleFile } = useFileHandler();
  const onSeekPointerDown = useSliderTouchLock();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  const player = useAudioPlayer(audioFile);
  const { presets, savePreset, deletePreset } = usePresets();

  // const throttledSetSpeed = useThrottledCallback(player.setSpeed, 50);

  const handleDownload = useCallback(async () => {
    setIsRendering(true);
    await player.download(track.name);
    setIsRendering(false);
  }, [player, track.name]);

  const handleSavePreset = (name: string) => {
    const { speed, reverb, volume, bass, surround, surroundPositions, eightD } = player;
    savePreset(name, { speed, reverb, volume, bass, surround, surroundPositions, eightD });
  };

  const handleLoadPreset = (settings: any) => {
    player.setSpeed(settings.speed);
    player.setReverb(settings.reverb);
    player.setVolume(settings.volume);
    player.setBass(settings.bass);
    player.setSurround(settings.surround);
    if (settings.surroundPositions) {
      player.setSurroundPositions(settings.surroundPositions);
    }
    player.setEightDEnabled(settings.eightD.enabled);
    player.setEightDAutoRotate(settings.eightD.autoRotate);
    player.setEightDRotationSpeed(settings.eightD.rotationSpeed);
    player.setEightDManualPosition(settings.eightD.manualPosition);
    setIsSettingsOpen(false);
  };

  const progressBarStyle = useMemo(() => ({
    background: `linear-gradient(to right, #d946ef ${player.progress}%, rgb(203 213 225) ${player.progress}%)`
  }), [player.progress]);

  return (
    <div className="min-h-screen p-4 pb-32 md:p-8 md:pb-32 max-w-4xl mx-auto">
      <SettingsModal 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        presets={presets}
        onSave={handleSavePreset}
        onLoad={handleLoadPreset}
        onDelete={deletePreset}
      />

      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0], onFileSelect)}
      />

      <header className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-zinc-800 dark:text-zinc-100">Fluxos</h1>
        <div className="flex items-center space-x-2">
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 rounded-full text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-dark-bg-secondary transition-colors"
          >
            <SettingsIcon className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="space-y-10">
        <section className="flex flex-col items-center text-center">
          <img 
            src={track.coverUrl} 
            alt="Album Cover" 
            className="w-48 h-48 md:w-64 md:h-64 rounded-xl shadow-lg mb-6 cursor-pointer transition-transform hover:scale-105"
            onClick={() => fileInputRef.current?.click()}
          />
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">{track.name}</h2>
          <p className="text-md text-zinc-500 dark:text-zinc-400 mb-6">{track.artist}</p>
          
          <div className="w-full max-w-md">
            <input
              type="range"
              min="0"
              max="100"
              step="0.1"
              value={player.progress}
              onPointerDown={onSeekPointerDown}
              onChange={(e) => player.seek(Number(e.target.value))}
              className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer slider-thumb"
              style={progressBarStyle}
            />
            <div className="flex justify-between text-xs text-zinc-500 dark:text-zinc-400 mt-1.5 font-mono">
              <span>{formatTime(player.currentTime / player.speed)}</span>
              <span>{formatTime(player.duration / player.speed)}</span>
            </div>
          </div>
          
          <PlayerControls isPlaying={player.isPlaying} onTogglePlay={player.togglePlayPause} />
        </section>

        <section>
          <Waveform data={player.visualizerData} progress={player.progress} onSeek={player.seek} />
        </section>

        {presets.length > 0 && (
          <section className="text-center">
            <h3 className="text-lg font-semibold text-zinc-800 dark:text-zinc-100 mb-4">Quick Presets</h3>
            <div className="flex justify-center items-center flex-wrap gap-3">
              {presets.map(preset => (
                <button
                  key={preset.id}
                  onClick={() => handleLoadPreset(preset.settings)}
                  className="px-4 py-2 bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-100 font-semibold rounded-lg hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors text-sm"
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </section>
        )}

        <section className="bg-light-bg-secondary dark:bg-dark-bg-secondary p-4 md:p-6 rounded-xl">
          <h3 className="text-lg font-semibold text-zinc-800 dark:text-zinc-100 mb-4">Audio Effects</h3>
          <div className="space-y-6">
                        <Slider label="Speed" value={player.speed} onChange={player.setSpeed} 
              min={AUDIO_CONFIG.MIN_SPEED} max={AUDIO_CONFIG.MAX_SPEED} step={AUDIO_CONFIG.SPEED_STEP} unit="x" />
            <Slider label="Reverb" value={player.reverb} onChange={player.setReverb} 
              min={0} max={100} step={5} unit="%" />
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
                label="7.1 Surround Sound" 
                checked={player.surround} 
                onChange={player.setSurround} 
              />
              
              <SurroundControls 
                surround={player.surround}
                surroundPositions={player.surroundPositions}
                setSurroundPositions={player.setSurroundPositions}
                resetSurroundPositions={player.resetSurroundPositions}
              />
              
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

            {/* Áudio espacial avançado */}
            <div className="pt-4 border-t border-zinc-200 dark:border-zinc-700">
              <SpatialAudioControls 
                spatialAudio={player.spatialAudio}
                setBinauralEnabled={player.setBinauralEnabled}
                setBinauralRoomSize={player.setBinauralRoomSize}
                setBinauralDamping={player.setBinauralDamping}
                setBinauralWidth={player.setBinauralWidth}
                setPanning3DEnabled={player.setPanning3DEnabled}
                setPanning3DX={player.setPanning3DX}
                setPanning3DY={player.setPanning3DY}
                setPanning3DZ={player.setPanning3DZ}
                setPanning3DAutoMove={player.setPanning3DAutoMove}
                setPanning3DMoveSpeed={player.setPanning3DMoveSpeed}
                setPanning3DMovePattern={player.setPanning3DMovePattern}
                resetSpatialAudioEffects={player.resetSpatialAudioEffects}
              />
            </div>
          </div>
        </section>
      </main>
      
      <footer className="fixed bottom-0 left-0 right-0 bg-light-bg-secondary/80 dark:bg-dark-bg-secondary/80 backdrop-blur-sm border-t border-zinc-200 dark:border-zinc-700">
        <div className="max-w-4xl mx-auto p-4 flex justify-center items-center">
          <button 
            onClick={handleDownload}
            disabled={isRendering}
            className="flex items-center justify-center gap-2 px-8 py-3 rounded-lg bg-accent text-white font-semibold hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRendering ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Rendering...
              </>
            ) : (
              <>
                <DownloadIcon className="w-5 h-5" />
                Download
              </>
            )}
          </button>
        </div>
      </footer>
    </div>
  );
});