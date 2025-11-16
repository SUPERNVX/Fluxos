import { useState, useEffect, useCallback } from 'react';
import type { Track } from './types/audio';
import { LandingPage } from './components/LandingPage';
import { EditorPage } from './components/EditorPage';
import ErrorPopup from './components/ErrorPopup';
import { SmartLoader } from './components/LazyComponents';

export default function App() {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [track, setTrack] = useState<Track | null>(null);

  useEffect(() => {
    document.documentElement.classList.add('dark');
    document.documentElement.style.backgroundColor = '#1a1a1a';
  }, []);

  const handleFileSelect = useCallback((file: File) => {
    setAudioFile(file);
    
    // Define valores padrão antes de tentar ler as tags
    setTrack({
      name: file.name.replace(/\.[^/.]+$/, ""),
      artist: 'Unknown Artist',
      coverUrl: `https://picsum.photos/seed/${encodeURIComponent(file.name)}/300/300`
    });

    // Verifica se jsmediatags está disponível globalmente antes de usá-lo
    type JsMediaTags = {
      read: (file: File, config: { onSuccess: (tag: unknown) => void; onError: (error: unknown) => void }) => void;
    };
    const jsmediatags = (window as (Window & { jsmediatags?: JsMediaTags })).jsmediatags;
    if (jsmediatags && typeof jsmediatags.read === 'function') {
      jsmediatags.read(file, {
        onSuccess: (tag: unknown) => {
          let coverUrl = `https://picsum.photos/seed/${encodeURIComponent(file.name)}/300/300`;
          
          // Verifica se a imagem está disponível nas tags
          const tags = (tag as { tags?: { title?: string; artist?: string; picture?: { data: Uint8Array | number[]; format: string } } }).tags;
          if (tags && tags.picture) {
            const { data, format } = tags.picture;
            let base64String = "";
            for (let i = 0; i < data.length; i++) {
              base64String += String.fromCharCode(data[i]);
            }
            coverUrl = `data:${format};base64,${window.btoa(base64String)}`;
          }
          
          // Atualiza apenas o track se as tags forem lidas com sucesso
          setTrack({
            name: tags?.title || file.name.replace(/\.[^/.]+$/, ""),
            artist: tags?.artist || 'Unknown Artist',
            coverUrl: coverUrl
          });
        },
        onError: (error: unknown) => {
          console.warn("Could not read audio tags, using fallback.", error);
          // O track já está definido com valores padrão, então não precisa atualizar
        }
      });
    } else {
      // jsmediatags não está disponível, apenas usando os valores padrão
      console.debug("jsmediatags not available, using fallback metadata.");
    }
  }, []);

  return (
    <SmartLoader>
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
        <ErrorPopup />
      </div>
    </SmartLoader>
  );
}