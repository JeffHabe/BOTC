let audioCtx: AudioContext | null = null;

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioCtx;
}

let audioBuffer: AudioBuffer | null = null;
let currentBellSource: AudioBufferSourceNode | null = null;
let activeOscillators: OscillatorNode[] = [];
let fallbackTimeoutId: any = null;

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
 * 停止播放鐘聲
 */
export function stopClocktowerBell() {
  if (currentBellSource) {
    try {
      currentBellSource.stop();
    } catch (e) {
      console.warn('停止 WAV 鐘聲失敗:', e);
    }
    currentBellSource = null;
  }
  
  if (activeOscillators.length > 0) {
    activeOscillators.forEach((osc) => {
      try {
        osc.stop();
      } catch (e) {}
    });
    activeOscillators = [];
  }

  if (fallbackTimeoutId) {
    clearTimeout(fallbackTimeoutId);
    fallbackTimeoutId = null;
  }
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
    activeOscillators.push(osc);
    
    osc.onended = () => {
      const idx = activeOscillators.indexOf(osc);
      if (idx !== -1) {
        activeOscillators.splice(idx, 1);
      }
    };

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

/**
 * 播放鐘聲序列 (使用 WAV 音檔)
 */
export async function playClocktowerBell(onEnded?: () => void) {
  const ctx = getAudioContext();
  
  if (ctx.state === 'suspended') {
    await ctx.resume().catch(() => console.warn('自動播放被攔截，請確保已點擊開始計時'));
  }

  // 先停止上一次播放
  stopClocktowerBell();

  try {
    const buffer = await loadAudioFile('/sound/church-bell.wav');
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    
    const gainNode = ctx.createGain();
    gainNode.gain.value = 1.0;
    
    source.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    currentBellSource = source;
    
    source.onended = () => {
      if (currentBellSource === source) {
        currentBellSource = null;
        if (onEnded) onEnded();
      }
    };
    
    source.start(0);
  } catch (e) {
    console.error('播放音訊檔失敗，切換回合成音回退方案:', e);
    
    // 回退方案：播放 8 次合成鐘聲
    const now = ctx.currentTime;
    const bongCount = 8;
    const bongInterval = 2.0;
    
    const totalDuration = bongCount * bongInterval + 8.0;
    fallbackTimeoutId = setTimeout(() => {
      fallbackTimeoutId = null;
      if (onEnded) onEnded();
    }, totalDuration * 1000);

    for (let i = 0; i < bongCount; i++) {
      playSingleStrike(ctx, now + (i * bongInterval), 164.81, 0.8, 8.0);
    }
  }
}

let customSoundSource: AudioBufferSourceNode | null = null;

/**
 * 停止自訂技能音效
 */
export function stopCustomSound() {
  if (customSoundSource) {
    try {
      customSoundSource.stop();
    } catch (e) {
      console.warn('停止自訂音效失敗:', e);
    }
    customSoundSource = null;
  }
}

/**
 * 播放自訂技能音效 (使用 ArrayBuffer)
 */
export async function playCustomSound(soundData: ArrayBuffer, onEnded?: () => void) {
  const ctx = getAudioContext();
  
  if (ctx.state === 'suspended') {
    await ctx.resume().catch(() => console.warn('自動播放被攔截，請確保已點擊播放自訂音效'));
  }

  // 先停止前一次播放
  stopCustomSound();

  try {
    const buffer = await ctx.decodeAudioData(soundData.slice(0));
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    
    const gainNode = ctx.createGain();
    gainNode.gain.value = 1.0;
    
    source.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    customSoundSource = source;
    
    source.onended = () => {
      if (customSoundSource === source) {
        customSoundSource = null;
        if (onEnded) onEnded();
      }
    };
    
    source.start(0);
  } catch (e) {
    console.error('播放自訂音效失敗:', e);
    if (onEnded) onEnded();
  }
}


