/**
 * Web Audio API manager for procedural sound effects.
 */
import { SoundDefs } from './sounds.js';

export function createAudioManager() {
  let audioCtx = null;
  let enabled = true;

  function getContext() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  function play(soundName) {
    if (!enabled) return;

    const def = SoundDefs[soundName];
    if (!def) return;

    try {
      const ctx = getContext();
      const now = ctx.currentTime;

      switch (def.type) {
        case 'click':
        case 'noise':
          playTone(ctx, now, def);
          break;
        case 'impact':
          playImpact(ctx, now, def);
          break;
        case 'fanfare':
          playFanfare(ctx, now, def);
          break;
        case 'alert':
          playAlert(ctx, now, def);
          break;
        case 'buzz':
          playBuzz(ctx, now, def);
          break;
        default:
          playTone(ctx, now, def);
      }
    } catch {
      // Audio not available - silently ignore
    }
  }

  function playTone(ctx, now, def) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.frequency.value = def.frequency;
    osc.type = 'sine';
    gain.gain.setValueAtTime(def.volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + def.decay);

    osc.start(now);
    osc.stop(now + def.duration);
  }

  function playImpact(ctx, now, def) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.frequency.setValueAtTime(def.frequency, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + def.duration);
    osc.type = 'triangle';
    gain.gain.setValueAtTime(def.volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + def.decay);

    osc.start(now);
    osc.stop(now + def.duration);
  }

  function playFanfare(ctx, now, def) {
    const notes = [def.frequency, def.frequency * 1.25, def.frequency * 1.5];
    const noteLen = def.duration / notes.length;

    for (let i = 0; i < notes.length; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.frequency.value = notes[i];
      osc.type = 'sine';
      const t = now + i * noteLen;
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(def.volume, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + noteLen);

      osc.start(t);
      osc.stop(t + noteLen);
    }
  }

  function playAlert(ctx, now, def) {
    for (let i = 0; i < 3; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.frequency.value = def.frequency * (i === 1 ? 1.5 : 1);
      osc.type = 'square';
      const t = now + i * 0.1;
      gain.gain.setValueAtTime(def.volume * 0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

      osc.start(t);
      osc.stop(t + 0.1);
    }
  }

  function playBuzz(ctx, now, def) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.frequency.value = def.frequency;
    osc.type = 'sawtooth';
    gain.gain.setValueAtTime(def.volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + def.decay);

    osc.start(now);
    osc.stop(now + def.duration);
  }

  return {
    play,
    setEnabled(value) { enabled = value; },
    isEnabled: () => enabled,
  };
}
