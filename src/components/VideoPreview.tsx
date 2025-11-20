import { memo, useEffect, useRef } from 'react';

export const VideoPreview = memo<{ attach: (el: HTMLVideoElement | null) => void }>(
  ({ attach }) => {
    const ref = useRef<HTMLVideoElement | null>(null);
    useEffect(() => {
      attach(ref.current);
    }, [attach]);
    return (
      <div className="w-full max-w-2xl aspect-video bg-black rounded-xl shadow-lg mb-6 overflow-hidden">
        <video ref={ref} className="w-full h-full" controls playsInline />
      </div>
    );
  }
);