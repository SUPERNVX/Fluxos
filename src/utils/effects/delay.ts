// Função para criar um delay node customizado
export const createDelayEffect = (
  context: AudioContext,
  delayTime: number,
  feedback: number,
  wetLevel: number,
  pingPong: boolean = false
) => {
  const delayNode = context.createDelay(2.0);
  const feedbackGain = context.createGain();
  const wetGain = context.createGain();
  const dryGain = context.createGain();
  const outputGain = context.createGain();

  delayNode.delayTime.setValueAtTime(delayTime / 1000, context.currentTime);
  feedbackGain.gain.setValueAtTime(feedback / 100, context.currentTime);
  wetGain.gain.setValueAtTime(wetLevel / 100, context.currentTime);
  dryGain.gain.setValueAtTime(1 - wetLevel / 100, context.currentTime);

  // Conecta o feedback
  delayNode.connect(feedbackGain);
  feedbackGain.connect(delayNode);

  // Conecta wet/dry
  delayNode.connect(wetGain);
  wetGain.connect(outputGain);
  dryGain.connect(outputGain);

  if (pingPong) {
    // Para ping-pong, precisamos de dois delays alternando entre canais
    const leftDelay = context.createDelay(2.0);
    const rightDelay = context.createDelay(2.0);
    const splitter = context.createChannelSplitter(2);
    const merger = context.createChannelMerger(2);

    leftDelay.delayTime.setValueAtTime(delayTime / 1000, context.currentTime);
    rightDelay.delayTime.setValueAtTime(delayTime / 1000, context.currentTime);

    delayNode.connect(splitter);
    splitter.connect(leftDelay, 0);
    splitter.connect(rightDelay, 1);
    leftDelay.connect(merger, 0, 1); // Left to right
    rightDelay.connect(merger, 0, 0); // Right to left
    merger.connect(wetGain);
  }

  return {
    input: delayNode,
    output: outputGain,
    dry: dryGain,
    updateTime: (time: number) => delayNode.delayTime.setValueAtTime(time / 1000, context.currentTime),
    updateFeedback: (fb: number) => feedbackGain.gain.setValueAtTime(fb / 100, context.currentTime),
    updateWetLevel: (wet: number) => {
      wetGain.gain.setValueAtTime(wet / 100, context.currentTime);
      dryGain.gain.setValueAtTime(1 - wet / 100, context.currentTime);
    }
  };
};