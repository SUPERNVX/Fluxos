// Web Worker for audio rendering with progress updates
self.onmessage = function(e: MessageEvent) {
  const { audioBuffer, progressCallbackInterval } = e.data;
  
  try {
    // Simulate progress updates since we can't truly render audio in a worker
    // In a real implementation, we would need to implement audio processing in the worker
    // For now, we'll just simulate the progress and return the original buffer
    const totalFrames = audioBuffer.length;
    let processedFrames = 0;
    const interval = progressCallbackInterval || 100; // ms
    
    const sendProgress = (progress: number) => {
      self.postMessage({
        type: 'progress',
        progress: progress
      });
    };
    
    // Send initial progress
    sendProgress(0);
    
    // Simulate processing with progress updates
    const processChunk = () => {
      if (processedFrames < totalFrames) {
        // Simulate processing a chunk
        const chunkSize = Math.min(44100, totalFrames - processedFrames); // 1 second chunks
        processedFrames += chunkSize;
        
        const progress = Math.min(100, Math.round((processedFrames / totalFrames) * 100));
        sendProgress(progress);
        
        setTimeout(processChunk, interval);
      } else {
        // Processing complete
        self.postMessage({
          type: 'complete',
          audioBuffer: audioBuffer
        });
      }
    };
    
    processChunk();
  } catch (error: unknown) {
    self.postMessage({
      type: 'error',
      error: (error as Error).message
    });
  }
};