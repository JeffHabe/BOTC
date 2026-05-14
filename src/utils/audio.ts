/**
 * 鐘樓鐘聲合成器 (Clocktower Bell Synthesizer)
 * 模擬「威斯敏斯特鐘聲 (Westminster Quarters)」旋律 + 深沉整點報時。
 */

let audioCtx: AudioContext | null = null;

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioCtx;
}

/**
 * 播放單次鐘聲敲擊
 * @param ctx AudioContext
 * @param startTime 開始時間
 * @param fundamental 基頻
 * @param gainValue 音量
 * @param duration 持續時間 (衰減)
 */
function playSingleStrike(ctx: AudioContext, startTime: number, fundamental: number, gainValue: number, duration: number) {
  const now = startTime;
  
  // 鐘聲的泛音比例 (Partials) - 經典大鐘諧波
  const partials = [
    { ratio: 0.5, gain: 0.5, decay: duration * 1.2 },  // Hum
    { ratio: 1.0, gain: 0.8, decay: duration },       // Fundamental
    { ratio: 1.2, gain: 0.4, decay: duration * 0.8 }, // Tierce (小三度)
    { ratio: 1.5, gain: 0.3, decay: duration * 0.6 }, // Quint
    { ratio: 2.0, gain: 0.2, decay: duration * 0.5 }, // Nominal
    { ratio: 3.0, gain: 0.1, decay: duration * 0.4 },
  ];

  const masterGain = ctx.createGain();
  masterGain.connect(ctx.destination);
  masterGain.gain.setValueAtTime(0, now);
  masterGain.gain.linearRampToValueAtTime(gainValue, now + 0.01);
  masterGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

  // 1. 敲擊雜訊 (Strike)
  const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.05, ctx.sampleRate);
  const noiseData = noiseBuffer.getChannelData(0);
  for (let i = 0; i < noiseData.length; i++) noiseData[i] = Math.random() * 2 - 1;
  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuffer;
  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = 'highpass';
  noiseFilter.frequency.setValueAtTime(1200, now);
  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(gainValue * 0.3, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
  noise.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(masterGain);
  noise.start(now);

  // 2. 泛音
  partials.forEach((p) => {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(fundamental * p.ratio, now);
    osc.detune.setValueAtTime(Math.random() * 6 - 3, now);
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(p.gain * gainValue, now + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, now + p.decay);
    osc.connect(g);
    g.connect(masterGain);
    osc.start(now);
    osc.stop(now + p.decay + 0.5);
  });
}

/**
 * 播放經典「威斯敏斯特鐘聲」序列
 */
export function playClocktowerBell() {
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') ctx.resume();

  const now = ctx.currentTime;
  const tempo = 0.8; // 每拍時間

  // 經典旋律: E4, C4, D4, G3
  const melody = [
    { freq: 329.63, time: 0 },         // E4
    { freq: 261.63, time: tempo },     // C4
    { freq: 293.66, time: tempo * 2 }, // D4
    { freq: 196.00, time: tempo * 3 }, // G3
  ];

  // 播放旋律 (輕快敲擊)
  melody.forEach((note) => {
    playSingleStrike(ctx, now + note.time, note.freq, 0.4, 2.5);
  });

  // 最後一聲震撼靈魂的深沉「BONG~」 (E3)
  const bigBongTime = now + (tempo * 4.5);
  playSingleStrike(ctx, bigBongTime, 164.81, 0.9, 6.0);
}
