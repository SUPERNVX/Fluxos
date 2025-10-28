// Optimized Web Worker for waveform generation with large file support
self.onmessage = function(e: MessageEvent) {
  const { channelData, samples } = e.data;
  
  try {
    const data = channelData;
    const dataLength = data.length;
    
    // Early validation
    if (!data || samples <= 0 || dataLength === 0) {
      self.postMessage({ success: false, error: 'Invalid data' });
      return;
    }
    
    const blockSize = Math.floor(dataLength / samples);
    const waveform = new Float32Array(samples);
    
    // Optimize for large files
    if (dataLength > 5_000_000) { // 5M samples threshold
      // Use peak detection for large files (faster)
      for (let i = 0; i < samples; i++) {
        const blockStart = blockSize * i;
        const blockEnd = Math.min(blockStart + blockSize, dataLength);
        let peak = 0;
        
        // Sample every 4th point for performance
        for (let j = blockStart; j < blockEnd; j += 4) {
          peak = Math.max(peak, Math.abs(data[j]));
        }
        
        waveform[i] = peak;
      }
    } else {
      // Use RMS for smaller files (better quality)
      for (let i = 0; i < samples; i++) {
        const blockStart = blockSize * i;
        const blockEnd = Math.min(blockStart + blockSize, dataLength);
        let sumSquares = 0;
        let count = 0;
        
        for (let j = blockStart; j < blockEnd; j++) {
          const sample = data[j];
          sumSquares += sample * sample;
          count++;
        }
        
        waveform[i] = count > 0 ? Math.sqrt(sumSquares / count) : 0;
      }
    }
    
    // Efficient normalization
    let maxVal = 0;
    for (let i = 0; i < samples; i++) {
      if (waveform[i] > maxVal) maxVal = waveform[i];
    }
    
    if (maxVal > 0) {
      const normalizer = 1 / maxVal;
      for (let i = 0; i < samples; i++) {
        waveform[i] *= normalizer;
      }
    }
    
    // Send result back to main thread
    self.postMessage({
      success: true,
      waveform: Array.from(waveform)
    });
  } catch (error: unknown) {
    self.postMessage({
      success: false,
      error: (error as Error).message
    });
  }
};