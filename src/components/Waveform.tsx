import { memo } from 'react';

export const Waveform = memo<{
  data: number[];
  progress: number;
  onSeek: (progress: number) => void;
}>(({ data, progress, onSeek }) => (
  <div 
    className="relative w-full h-24 bg-light-bg-secondary dark:bg-dark-bg-secondary rounded-lg flex items-end gap-px overflow-hidden cursor-pointer"
    onClick={(e) => {
      const rect = e.currentTarget.getBoundingClientRect();
      onSeek(Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100)));
    }}
  >
    {data.map((height, i) => (
      <div key={i} className="flex-1 bg-zinc-300 dark:bg-zinc-600 rounded-sm" style={{ height: `${height * 100}%` }} />
    ))}
    <div className="absolute top-0 bottom-0 w-0.5 bg-accent" style={{ left: `${progress}%` }} />
  </div>
));