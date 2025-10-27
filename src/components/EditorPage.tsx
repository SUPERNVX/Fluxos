import { useState, useMemo, memo, useCallback } from 'react';
import type { Track, PresetSettings } from '../types/audio';
import { useAudioPlayer } from '../hooks/useAudioPlayer';
import { usePresets } from '../hooks/usePresets';
import { useFileHandler } from '../hooks/useFileHandler';
import { useSliderTouchLock } from '../hooks/useSliderTouchLock';
import { formatTime } from '../utils/audioHelpers';
import { SettingsModal } from './SettingsModal';
import { PlayerControls } from './PlayerControls';
import { Waveform } from './Waveform';
import { SettingsIcon, DownloadIcon } from './Icons';
import { AudioEffects } from './AudioEffects';

export const EditorPage = memo<{
  track: Track;
  audioFile: File;
  onFileSelect: (file: File) => void;
}>(({ track, audioFile, onFileSelect }) => {
  const [isRendering, setIsRendering] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const { fileInputRef, handleFile } = useFileHandler();
  const onSeekPointerDown = useSliderTouchLock();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  const player = useAudioPlayer(audioFile);
  const { presets, savePreset, deletePreset } = usePresets();

  const handleDownload = useCallback(async () => {
    setIsRendering(true);
    setDownloadProgress(0);
    
    // Enhanced download with progress callback support
    await player.download(track.name, (progress) => {
      setDownloadProgress(progress);
    });
    
    setIsRendering(false);
    setDownloadProgress(0);
  }, [player, track.name]);

  const handleSavePreset = (name: string) => {
    const { speed, reverb, volume, bass, eightD } = player;
    savePreset(name, { speed, reverb, volume, bass, eightD });
  };

  const handleLoadPreset = (settings: PresetSettings) => {
    player.setSpeed(settings.speed);
    player.setReverb(settings.reverb);
    player.setVolume(settings.volume);
    player.setBass(settings.bass);
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
        <button 
          onClick={() => setIsSettingsOpen(true)}
          className="p-2 rounded-full text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-dark-bg-secondary transition-colors"
        >
          <SettingsIcon className="w-5 h-5" />
        </button>
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
              <span>{useMemo(() => formatTime(player.currentTime / player.speed), [player.currentTime, player.speed])}</span>
              <span>{useMemo(() => formatTime(player.duration / player.speed), [player.duration, player.speed])}</span>
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

        <AudioEffects player={player} />
      </main>
      
      <footer className="fixed bottom-0 left-0 right-0 bg-light-bg-secondary/80 dark:bg-dark-bg-secondary/80 backdrop-blur-sm border-t border-zinc-200 dark:border-zinc-700">
        <div className="max-w-4xl mx-auto p-4 flex justify-center items-center">
          <button 
            onClick={handleDownload}
            disabled={isRendering}
            className="w-full max-w-xs flex items-center justify-center gap-2 px-8 py-3 rounded-lg bg-accent text-white font-semibold hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden"
          >
            {isRendering ? (
              <>
                <div className="absolute inset-0 bg-zinc-700/20" style={{ width: `${downloadProgress}%` }} />
                <span className="relative z-10 flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  {downloadProgress > 0 ? `Rendering... ${downloadProgress}%` : 'Rendering...'}
                </span>
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
