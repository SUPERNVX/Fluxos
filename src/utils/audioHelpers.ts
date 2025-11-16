// --- HELPERS --- //
export const formatTime = (time: number): string => {
  const safeTime = Math.max(0, time || 0);
  const minutes = Math.floor(safeTime / 60);
  const seconds = Math.floor(safeTime % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

export const bufferToWav = (buffer: AudioBuffer): Blob => {
  const numOfChan = buffer.numberOfChannels;
  const length = buffer.length * numOfChan * 2 + 44;
  const bufferArr = new ArrayBuffer(length);
  const view = new DataView(bufferArr);
  const channels = Array.from({ length: numOfChan }, (_, i) => buffer.getChannelData(i));
  let pos = 0;

  const setUint16 = (data: number) => { view.setUint16(pos, data, true); pos += 2; };
  const setUint32 = (data: number) => { view.setUint32(pos, data, true); pos += 4; };

  setUint32(0x46464952); setUint32(length - 8); setUint32(0x45564157);
  setUint32(0x20746d66); setUint32(16); setUint16(1); setUint16(numOfChan);
  setUint32(buffer.sampleRate); setUint32(buffer.sampleRate * 2 * numOfChan);
  setUint16(numOfChan * 2); setUint16(16);
  setUint32(0x61746164); setUint32(length - pos - 4);

  let offset = 0;
  while (pos < length) {
    for (let i = 0; i < numOfChan; i++) {
      const sample = Math.max(-1, Math.min(1, channels[i][offset]));
      view.setInt16(pos, (sample * (sample < 0 ? 32768 : 32767)) | 0, true);
      pos += 2;
    }
    offset++;
  }
  return new Blob([view], { type: 'audio/wav' });
};

export const createWetDryBypass = (ctx: AudioContext | OfflineAudioContext) => {
  const wetGain = ctx.createGain();
  const dryGain = ctx.createGain();
  const merger = ctx.createGain();
  const applyEnabled = (enabled: boolean) => {
    wetGain.gain.value = enabled ? 1 : 0;
    dryGain.gain.value = enabled ? 0 : 1;
  };
  return { wetGain, dryGain, merger, applyEnabled };
};