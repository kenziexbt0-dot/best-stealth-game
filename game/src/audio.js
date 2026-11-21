// Night Parcel — every sound is synthesised with WebAudio, no audio files.
//
// Footsteps are the stealth tell: each guard's step is panned left or
// right and gets quieter with distance, so you can hear where a guard is
// without seeing it. The audio context is created lazily on the first
// user gesture (browsers block audio before that) and everything here
// silently does nothing when audio is unavailable, such as headless runs.

export function createAudio() {
  let ctx = null;
  let master = null;
  let muted = false;
  let ambientNodes = null;

  function ensure() {
    if (ctx) return ctx;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
    } catch {
      ctx = null;
    }
    return ctx;
  }

  // Unlock audio on the first gesture, then start the night ambience.
  function unlock() {
    const c = ensure();
    if (!c) return;
    if (c.state === 'suspended') c.resume().catch(() => {});
    startAmbient();
  }

  function startAmbient() {
    if (!ctx || ambientNodes) return;
    try {
      // A low, slow-breathing drone: two detuned sines through a slow LFO.
      const gain = ctx.createGain();
      gain.gain.value = 0.035;
      const oscA = ctx.createOscillator();
      oscA.type = 'sine';
      oscA.frequency.value = 55;
      const oscB = ctx.createOscillator();
      oscB.type = 'sine';
      oscB.frequency.value = 55.7;
      const lfo = ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = 0.07;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 0.018;
      lfo.connect(lfoGain);
      lfoGain.connect(gain.gain);
      oscA.connect(gain);
      oscB.connect(gain);
      gain.connect(master);
      oscA.start();
      oscB.start();
      lfo.start();
      ambientNodes = { gain, oscA, oscB, lfo };
    } catch {
      ambientNodes = null;
    }
  }

  function tone(freq, dur, type, vol, when = 0, slideTo = null) {
    const c = ensure();
    if (!c || muted) return;
    try {
      const t0 = c.currentTime + when;
      const osc = c.createOscillator();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t0);
      if (slideTo !== null) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
      const g = c.createGain();
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(vol, t0 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(g);
      g.connect(master);
      osc.start(t0);
      osc.stop(t0 + dur + 0.05);
    } catch {
      // Audio is decoration; a failure must never break the game.
    }
  }

  function noiseBurst(dur, vol, pan, lowFreq) {
    const c = ensure();
    if (!c || muted) return;
    try {
      const t0 = c.currentTime;
      const len = Math.max(1, Math.floor(c.sampleRate * dur));
      const buffer = c.createBuffer(1, len, c.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < len; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      }
      const src = c.createBufferSource();
      src.buffer = buffer;
      const filter = c.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = lowFreq;
      const g = c.createGain();
      g.gain.value = vol;
      let node = src;
      node.connect(filter);
      node = filter;
      node.connect(g);
      if (typeof c.createStereoPanner === 'function') {
        const panner = c.createStereoPanner();
        panner.pan.value = Math.max(-1, Math.min(1, pan));
        g.connect(panner);
        panner.connect(master);
      } else {
        g.connect(master);
      }
      src.start(t0);
    } catch {
      // Audio is decoration; a failure must never break the game.
    }
  }

  return {
    unlock,
    get muted() {
      return muted;
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    // A guard's footstep: a soft thud, panned by direction and faded by
    // distance. `dx` is the guard's horizontal offset from the player in
    // pixels, `dist` the straight-line distance.
    footstep(dx, dist) {
      const pan = Math.max(-0.9, Math.min(0.9, dx / 320));
      const vol = Math.max(0.02, 0.3 * (1 - dist / 520));
      noiseBurst(0.07, vol, pan, 320);
    },
    // The player's own step is quieter and centred.
    playerStep() {
      noiseBurst(0.05, 0.08, 0, 400);
    },
    // A pebble landing: a light tick.
    pebble() {
      noiseBurst(0.09, 0.22, 0, 1800);
      tone(1400, 0.08, 'triangle', 0.08, 0.02, 900);
    },
    pickup() {
      tone(660, 0.12, 'sine', 0.16);
      tone(990, 0.18, 'sine', 0.16, 0.09);
    },
    // Suspicion rising: a short rising blip, only when it crosses a step.
    spotted() {
      tone(220, 0.25, 'square', 0.07, 0, 440);
    },
    alarm() {
      tone(520, 0.35, 'sawtooth', 0.12, 0, 780);
      tone(520, 0.35, 'sawtooth', 0.12, 0.4, 780);
    },
    caught() {
      tone(330, 0.5, 'sawtooth', 0.14, 0, 110);
      tone(165, 0.8, 'sawtooth', 0.14, 0.35, 55);
    },
    levelClear() {
      tone(523, 0.15, 'sine', 0.16);
      tone(659, 0.15, 'sine', 0.16, 0.12);
      tone(784, 0.3, 'sine', 0.18, 0.24);
    },
    win() {
      [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.35, 'sine', 0.16, i * 0.14));
    },
  };
}
