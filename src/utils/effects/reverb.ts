export const createImpulseResponse = (
  context: AudioContext | OfflineAudioContext,
  reverbType: 'default' | 'hall' | 'room' | 'plate' = 'default'
) => {
  let duration: number;
  let decay: number;
  switch (reverbType) {
    case 'hall':
      duration = 3.0;
      decay = 4.0;
      break;
    case 'room':
      duration = 1.0;
      decay = 2.0;
      break;
    case 'plate':
      duration = 2.0;
      decay = 3.0;
      break;
    default:
      duration = 1.0;
      decay = 4.0;
  }
  const length = context.sampleRate * duration;
  const impulse = context.createBuffer(2, length, context.sampleRate);
  for (let channel = 0; channel < 2; channel++) {
    const data = impulse.getChannelData(channel);
    for (let i = 0; i < length; i++) {
      let value = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
      if (reverbType === 'plate') {
        value *= 1.0 + 0.3 * Math.sin(i * 0.02);
      }
      data[i] = value;
    }
  }
  return impulse;
};

export const createBinauralImpulseResponse = (
  context: AudioContext | OfflineAudioContext,
  roomSize: number,
  damping: number
) => {
  const duration = 0.5 + (roomSize / 100) * 3.5;
  const decay = 1.5 + (damping / 100) * 4.5;
  const length = context.sampleRate * duration;
  const impulse = context.createBuffer(2, length, context.sampleRate);
  for (let channel = 0; channel < 2; channel++) {
    const data = impulse.getChannelData(channel);
    const channelDelay = channel === 0 ? 0 : Math.floor(context.sampleRate * 0.0006);
    for (let i = 0; i < length; i++) {
      let value = 0;
      const earlyReflectionCount = Math.floor(3 + (roomSize / 100) * 12);
      for (let j = 0; j < earlyReflectionCount; j++) {
        const reflectionDelay = Math.floor((j + 1) * (roomSize / 100) * 1000 + channelDelay);
        if (i === reflectionDelay && i < length) {
          const reflectionGain = Math.pow(0.7, j) * (1 - damping / 200);
          value += (Math.random() * 2 - 1) * reflectionGain;
        }
      }
      const lateReverbStart = Math.floor(context.sampleRate * 0.05);
      if (i > lateReverbStart) {
        const timeRatio = (i - lateReverbStart) / (length - lateReverbStart);
        const dampingCurve = Math.pow(1 - timeRatio, decay);
        const densityFactor = 1 + (damping / 100) * 2;
        value += (Math.random() * 2 - 1) * dampingCurve * 0.3 * densityFactor;
      }
      if (channel === 1) {
        if (i > 0 && i < length - 1) {
          value = value * 0.9 + (data[i - 1] || 0) * 0.1;
        }
      }
      data[i] = Math.max(-1, Math.min(1, value));
    }
  }
  return impulse;
};