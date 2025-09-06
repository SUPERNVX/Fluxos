import { memo, useCallback } from 'react';
import { useFileHandler } from '../hooks/useFileHandler';
import { UploadIcon } from './Icons';

export const Dropzone = memo<{ onFileSelect: (file: File) => void }>(({ onFileSelect }) => {
  const { fileInputRef, handleFile } = useFileHandler();

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files?.[0]) {
      handleFile(e.dataTransfer.files[0], onFileSelect);
    }
  }, [handleFile, onFileSelect]);

  return (
    <div 
      className="w-full max-w-lg h-64 border-2 border-dashed border-zinc-300 dark:border-zinc-600 rounded-2xl flex flex-col justify-center items-center text-center p-8 cursor-pointer transition-colors hover:border-accent dark:hover:border-accent hover:bg-zinc-50 dark:hover:bg-dark-bg-secondary"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0], onFileSelect)}
      />
      <UploadIcon className="w-16 h-16 text-accent mb-4" />
      <p className="text-zinc-600 dark:text-zinc-300 font-semibold">Drag and drop or click to upload</p>
      <p className="text-zinc-400 dark:text-zinc-500 text-sm mt-1">Audio files up to 100MB</p>
    </div>
  );
});