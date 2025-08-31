import { useRef, useCallback } from 'react';

export const useFileHandler = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleFile = useCallback((file: File, onSelect: (file: File) => void) => {
    onSelect(file);
  }, []);

  const openFilePicker = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return { fileInputRef, handleFile, openFilePicker };
};