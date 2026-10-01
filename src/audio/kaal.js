// Kaal's sounds. It has no voice and no footsteps. What it has is ticking:
// a drawer full of old watches, two dozen of them, none agreeing, placed in
// the room where it stands. And knuckles, and fingertips on plaster.

export class KaalSounds {
  constructor(engine) {
    this.e = engine;
    this.ready = false;
    this.watches = [];
    this.level = 0; // 0 silent … 1 full
    this.target = 0;
    this.frozen = false;
    this.lookahead = 0;
  }

  init() {
    const e = this.e;
    if (!e.ctx || this.ready) return;
    this.ready = true;
    const ctx = e.ctx;
    // A few click timbres.
    this.clicks = [];
    for (let v = 0; v < 5; v += 1) {
      const len = Math.floor(ctx.sampleRate * 0.025);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = buf.getChannelData(0);
      const f = 2500 + v * 900;
      for (let i = 0; i < len; i += 1) {
        const tt = i / ctx.sampleRate;
        d[i] = (Math.sin(tt * f * Math.PI * 2) * 0.6 + (Math.random() * 2 - 1) * 0.5) * Math.exp(-tt * (260 + v * 40));
      }
      this.clicks.push(buf);
    }
    this.pan = e.panner(0, 2.5, -6, { ref: 1.2, rolloff: 1.0, max: 50 });
    this.gain = ctx.createGain();
    this.gain.gain.value = 0;
    this.gain.connect(this.pan);
    this.pan.connect(e.kaal);
    // Each watch: its own period and drift.
    for (let i = 0; i < 24; i += 1) {
      this.watches.push({
        period: 0.42 + Math.random() * 0.6,
        next: ctx.currentTime + Math.random(),
        click: Math.floor(Math.random() * this.clicks.length),
        gain: 0.25 + Math.random() * 0.75,
        tock: Math.random() < 0.5,
      });
    }
    // The scrape: a looping filtered noise, positional, gated by touch.
    this.scrapePan = e.panner(0, 2, -6, { ref: 1, rolloff: 1.3 });
    this.scrape = e.loop({ kind: "pink", freq: 2400, q: 6, type: "bandpass", gain: 0, out: this.scrapePan });
    this.scrapePan.connect(e.kaal);
  }

  setPosition(x, y, z) {
    if (!this.ready) return;
    this.e.setPos(this.pan, x, y, z);
  }

  setScrape(x, y, z, on) {
    if (!this.ready) return;
    this.e.setPos(this.scrapePan, x, y, z);
    this.e.fade(this.scrape.gain.gain, on ? 0.09 : 0, on ? 0.2 : 0.4);
    this.scrape.filter.frequency.value = 1800 + Math.random() * 1600;
  }

  // level: how loud the ticking is overall (stage, presence).
  update(dt, level) {
    if (!this.ready) return;
    const ctx = this.e.ctx;
    this.e.fade(this.gain.gain, level, 0.8);
    // Schedule clicks a little ahead.
    const until = ctx.currentTime + 0.12;
    for (const w of this.watches) {
      while (w.next < until) {
        if (w.next > ctx.currentTime - 0.05) this.click(w, w.next);
        w.period *= 1 + (Math.random() - 0.5) * 0.004; // drift
        w.next += w.period;
      }
    }
  }

  click(w, at) {
    const ctx = this.e.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.clicks[w.click];
    src.playbackRate.value = w.tock ? 0.82 : 1;
    w.tock = !w.tock;
    const g = ctx.createGain();
    g.gain.value = w.gain * 0.5;
    src.connect(g);
    g.connect(this.gain);
    src.start(at);
  }

  // All the ticking stops at once (the death).
  silence() {
    if (!this.ready) return;
    this.gain.gain.cancelScheduledValues(this.e.ctx.currentTime);
    this.gain.gain.setValueAtTime(0, this.e.ctx.currentTime);
  }

  // Released from the light: knuckles, one finger at a time.
  knuckles(x, y, z, count = 5) {
    const e = this.e;
    if (!e.ctx) return;
    const p = e.panner(x, y, z, { ref: 1, rolloff: 1.4 });
    p.connect(e.kaal);
    let t = 0;
    for (let i = 0; i < count; i += 1) {
      t += 0.12 + Math.random() * 0.35;
      e.burst({ duration: 0.04, gain: 0.5, freq: 1400 + Math.random() * 900, q: 3, delay: t, out: p });
      e.tone({ freq: 180 + Math.random() * 80, type: "triangle", duration: 0.05, gain: 0.08, delay: t, out: p });
    }
  }

  // Folding through a doorway: the frame groans under its shoulders.
  fold(x, y, z) {
    const e = this.e;
    if (!e.ctx) return;
    const p = e.panner(x, y, z, { ref: 1, rolloff: 1.3 });
    p.connect(e.kaal);
    e.tone({ freq: 70, type: "sawtooth", duration: 1.6, gain: 0.035, attack: 0.4, slideTo: 55, out: p });
    e.burst({ duration: 1.4, gain: 0.05, freq: 300, q: 4, attack: 0.5, out: p });
    this.knuckles(x, y, z, 3);
  }

  // Arms rising: cloth that isn't there, a long dry creak.
  reach(x, y, z) {
    const e = this.e;
    if (!e.ctx) return;
    const p = e.panner(x, y, z, { ref: 1, rolloff: 1 });
    p.connect(e.kaal);
    e.tone({ freq: 110, type: "sawtooth", duration: 0.7, gain: 0.04, attack: 0.3, slideTo: 160, out: p });
    this.knuckles(x, y, z, 8);
  }
}
