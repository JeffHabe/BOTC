let audioCtx: AudioContext | null = null;

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioCtx;
}

/**
 * 播放單次鐘聲敲擊 (合成音)
 */
function playSingleStrike(ctx: AudioContext, startTime: number, fundamental: number, gainValue: number, duration: number) {
  const scheduleTime = startTime + 0.05;

  // 鐘聲的泛音比例 (Partials)
  const partials = [
    { ratio: 0.5, gain: 0.5, decay: duration * 1.2 },
    { ratio: 1.0, gain: 0.7, decay: duration },
    { ratio: 2.0, gain: 0.2, decay: duration * 0.5 },
  ];

  const masterGain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  const limiter = ctx.createDynamicsCompressor();

  filter.type = 'highpass';
  filter.frequency.setValueAtTime(50, scheduleTime);
  
  limiter.threshold.setValueAtTime(-10, scheduleTime);
  limiter.knee.setValueAtTime(30, scheduleTime);
  limiter.ratio.setValueAtTime(12, scheduleTime);

  masterGain.connect(filter);
  filter.connect(limiter);
  limiter.connect(ctx.destination);
  
  masterGain.gain.setValueAtTime(0, scheduleTime);
  masterGain.gain.setTargetAtTime(gainValue * 0.3, scheduleTime, 0.03);
  masterGain.gain.setTargetAtTime(0, scheduleTime + 0.15, duration / 4);

  partials.forEach((p) => {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(fundamental * p.ratio, scheduleTime);
    
    g.gain.setValueAtTime(0, scheduleTime);
    g.gain.setTargetAtTime(p.gain, scheduleTime, 0.02);
    g.gain.setTargetAtTime(0, scheduleTime + 0.1, p.decay / 4);
    
    osc.connect(g);
    g.connect(masterGain);
    osc.start(scheduleTime);
    osc.stop(scheduleTime + p.decay + 1);
  });
}

let audioBuffer: AudioBuffer | null = null;

async function loadAudioFile(url: string) {
  if (audioBuffer) return audioBuffer;
  
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  const ctx = getAudioContext();
  audioBuffer = await ctx.decodeAudioData(arrayBuffer);
  return audioBuffer;
}

/**
 * 預先喚醒音訊 (必須在用戶互動事件中調用)
 */
export async function unlockAudio() {
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') {
    try {
      await ctx.resume();
      console.log('音訊上下文已成功啟動');
      
      // 試播一個極短的靜音波形來確認授權
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      g.gain.value = 0;
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);

      // 順便預加載音訊檔
      loadAudioFile('/church-bell.wav').catch(() => {});
    } catch (e) {
      console.warn('音訊解鎖失敗:', e);
    }
  }
}

/**
 * 播放鐘聲序列 (使用 WAV 音檔)
 */
export async function playClocktowerBell() {
  const ctx = getAudioContext();
  
  if (ctx.state === 'suspended') {
    await ctx.resume().catch(() => console.warn('自動播放被攔截，請確保已點擊開始計時'));
  }

  try {
    const buffer = await loadAudioFile('/church-bell.wav');
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    
    const gainNode = ctx.createGain();
    gainNode.gain.value = 1.0;
    
    source.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    source.start(0);
  } catch (e) {
    console.error('播放音訊檔失敗，切換回合成音回退方案:', e);
    
    // 回退方案：播放 8 次合成鐘聲
    const now = ctx.currentTime;
    const bongCount = 8;
    const bongInterval = 2.0;
    for (let i = 0; i < bongCount; i++) {
      playSingleStrike(ctx, now + (i * bongInterval), 164.81, 0.8, 8.0);
    }
  }
}

