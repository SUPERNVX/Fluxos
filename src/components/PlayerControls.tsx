import { memo } from 'react';
import { PlayIcon, PauseIcon, SkipNextIcon, SkipPreviousIcon } from './Icons';

export const PlayerControls = memo<{
  isPlaying: boolean;
  onTogglePlay: () => void;
}>(({ isPlaying, onTogglePlay }) => (
  <div className="flex items-center space-x-6 mt-4">
    <button className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-white transition-colors">
      <SkipPreviousIcon className="w-8 h-8" />
    </button>
    <button 
      onClick={onTogglePlay}
      className="w-16 h-16 bg-accent text-white rounded-full flex items-center justify-center shadow-lg hover:bg-accent-hover transition-transform active:scale-95"
    >
      {isPlaying ? <PauseIcon className="w-8 h-8" /> : <PlayIcon className="w-8 h-8" />}
    </button>
    <button className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-white transition-colors">
      <SkipNextIcon className="w-8 h-8" />
    </button>
  </div>
));