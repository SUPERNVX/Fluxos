import { useRef, useCallback } from 'react';
import { ErrorHandler, ERROR_CODES } from '../utils/errorHandler';
import { MemoryManager } from '../utils/memoryManager';

export const useFileHandler = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleFile = useCallback((file: File, onSelect: (file: File) => void) => {
    try {
      // Validate file type
      const validTypes = ['audio/mpeg','audio/wav','audio/mp3','audio/ogg','audio/mp4','audio/m4a','video/mp4','video/quicktime','video/webm'];
      if (!validTypes.includes(file.type) && !file.name.match(/\.(mp3|wav|ogg|m4a|mp4|mov|webm)$/i)) {
        ErrorHandler.logError(
          ERROR_CODES.INVALID_FILE_FORMAT,
          'Formato de arquivo não suportado',
          `Tipo: ${file.type}, Nome: ${file.name}`,
          { fileName: file.name, fileType: file.type }
        );
        return;
      }

      // Validate file size (100MB limit)
      if (file.size > 100 * 1024 * 1024) {
        ErrorHandler.logError(
          ERROR_CODES.FILE_TOO_LARGE,
          'Arquivo muito grande',
          `Tamanho: ${(file.size / 1024 / 1024).toFixed(2)}MB`,
          { fileName: file.name, fileSize: file.size }
        );
        return;
      }

      // Set current file metadata for adaptive memory management
      MemoryManager.setCurrentFileMeta(file.size, file.type.startsWith('video/') ? 'video' : 'audio');

      // Check memory usage before processing (com thresholds adaptativos)
      const memoryStats = MemoryManager.checkMemoryUsage();
      const isVideo = file.type.startsWith('video/');
      if (!isVideo && memoryStats && memoryStats.memoryUsagePercentage > 95) {
        const fileSizeMB = file.size / (1024 * 1024);
        if (fileSizeMB > 70 || memoryStats.memoryUsagePercentage > 98) {
          ErrorHandler.logError(
            ERROR_CODES.OUT_OF_MEMORY,
            'Memória insuficiente para processar arquivo',
            `Uso atual: ${memoryStats.memoryUsagePercentage.toFixed(1)}% | Arquivo: ${fileSizeMB.toFixed(1)}MB`,
            { fileName: file.name, fileSize: file.size, memoryUsage: memoryStats }
          );
          return;
        }
      }

      // Register file in memory manager
      const fileId = `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      if (!isVideo) {
        MemoryManager.registerResource(fileId, 'blob', file, file.size);
      }

      onSelect(file);
    } catch (error) {
      ErrorHandler.logError(
        ERROR_CODES.FILE_UPLOAD_FAILED,
        'Erro ao processar arquivo',
        error instanceof Error ? error.message : 'Erro desconhecido',
        { fileName: file.name, error }
      );
    }
  }, []);

  const openFilePicker = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return { fileInputRef, handleFile, openFilePicker };
};