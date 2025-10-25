// Web Worker for waveform generation
self.onmessage = function(e: MessageEvent) {
  const { channelData, samples } = e.data;
  
  try {
    // Use the provided channel data for waveform generation
    const data = channelData;
    const blockSize = Math.floor(data.length / samples);
    const waveform = new Float32Array(samples);
    
    for (let i = 0; i < samples; i++) {
      const blockStart = blockSize * i;
      let sum = 0;
      let count = 0;
      
      // Calculate average absolute value for this block
      for (let j = 0; j < blockSize && (blockStart + j) < data.length; j++) {
        sum += Math.abs(data[blockStart + j]);
        count++;
      }
      
      waveform[i] = count > 0 ? sum / count : 0;
    }
    
    // Normalize waveform
    const maxVal = Math.max(...waveform);
    if (maxVal > 0) {
      for (let i = 0; i < waveform.length; i++) {
        waveform[i] = waveform[i] / maxVal;
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