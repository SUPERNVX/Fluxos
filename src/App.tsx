import { useState, useEffect, useCallback } from 'react';
import type { Track } from './types/audio';
import { LandingPage } from './components/LandingPage';
import { EditorPage } from './components/EditorPage';

export default function App() {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [track, setTrack] = useState<Track | null>(null);

  useEffect(() => {
    document.documentElement.classList.add('dark');
    document.documentElement.style.backgroundColor = '#1a1a1a';
  }, []);

  const handleFileSelect = useCallback((file: File) => {
    setAudioFile(file);
    setTrack({
      name: file.name.replace(/\.[^/.]+$/, ""),
      artist: 'Unknown Artist',
      coverUrl: `https://picsum.photos/seed/${encodeURIComponent(file.name)}/300/300`
    });

    // Verifica se jsmediatags está disponível antes de usá-lo
    if ((window as any).jsmediatags) {
      (window as any).jsmediatags.read(file, {
        onSuccess: (tag: any) => {
          let coverUrl = `https://picsum.photos/seed/${encodeURIComponent(file.name)}/300/300`;
          if (tag.tags.picture) {
            const { data, format } = tag.tags.picture;
            let base64String = "";
            for (let i = 0; i < data.length; i++) {
              base64String += String.fromCharCode(data[i]);
            }
            coverUrl = `data:${format};base64,${window.btoa(base64String)}`;
          }
          setTrack({
            name: tag.tags.title || file.name.replace(/\.[^/.]+$/, ""),
            artist: tag.tags.artist || 'Unknown Artist',
            coverUrl: coverUrl
          });
        },
        onError: (error: any) => {
          console.error("Could not read audio tags, using fallback.", error);
          setTrack({
            name: file.name.replace(/\.[^/.]+$/, ""),
            artist: 'Unknown Artist',
            coverUrl: `https://picsum.photos/seed/${encodeURIComponent(file.name)}/300/300`
          });
        }
      });
    } else {
      // Fallback caso jsmediatags não esteja disponível
      console.warn("jsmediatags not available, using fallback.");
      setTrack({
        name: file.name.replace(/\.[^/.]+$/, ""),
        artist: 'Unknown Artist',
        coverUrl: `https://picsum.photos/seed/${encodeURIComponent(file.name)}/300/300`
      });
    }
  }, []);

  return (
    <div className="bg-light-bg dark:bg-dark-bg min-h-screen text-zinc-900 dark:text-zinc-100 transition-colors duration-300">
      {!audioFile || !track ? (
        <LandingPage onFileSelect={handleFileSelect} />
      ) : (
        <EditorPage 
          audioFile={audioFile} 
          track={track} 
          onFileSelect={handleFileSelect} 
        />
      )}
    </div>
  );
}