// The house and you: ambience for both times, matches, steps, falls, breath
// and heartbeat. Kaal's own sounds live in kaal.js.

export class Sounds {
  constructor(engine) {
    this.e = engine;
    this.started = false;
    this.next = {};
    this.time = 0;
    this.burning = null;
    this.heart = { next: 0, rate: 0 };
    this.breath = { next: 0, rate: 0 };
  }

  // ------------------------------------------------------------ ambience
  start() {
    const e = this.e;
    if (!e.ctx || this.started) return;
    this.started = true;
    // Wind through the broken roof: two slow-moving filtered noises.
    this.wind = e.loop({ kind: "brown", freq: 380, q: 0.4, gain: 0.32 });
    this.windHi = e.loop({ kind: "pink", freq: 1400, type: "bandpass", q: 2.5, gain: 0.025 });
    // The 1987 bed: the fan's hum, a TV murmur, all muffled behind the light.
    this.fan = e.loop({ kind: "pink", freq: 160, q: 1.4, type: "lowpass", gain: 0.22, out: e.tab });
    const ctx = e.ctx;
    this.hum = ctx.createOscillator();
    this.hum.type = "triangle";
    this.hum.frequency.value = 50;
    const humG = ctx.createGain();
    humG.gain.value = 0.02;
    this.hum.connect(humG);
    humG.connect(e.tab);
    this.hum.start();
    this.tv = e.loop({ kind: "pink", freq: 900, q: 3, type: "bandpass", gain: 0.03, out: e.tab });
    // A dripping tap in the kitchen.
    this.dripPan = e.panner(6.5, 1.0, -2.2, { ref: 0.8, rolloff: 1.6 });
    this.dripPan.connect(e.amb);
    this.next = { cricket: 0.5, dog: 6, creak: 3, drip: 1, clink: 2, tvWord: 1 };
    this.crickets = true;
  }

  // light: how deep the listener is in 1987 (0..1). duck: 1 normal, 0 silent.
  update(dt, { light = 0, duck = 1 } = {}) {
    const e = this.e;
    if (!this.started || !e.ctx) return;
    this.time += dt;
    const t = this.time;
    e.fade(e.tab.gain, light * 0.9, 0.25);
    e.fade(e.duck.gain, duck * (1 - light * 0.6), 0.6);
    // Wind gusts.
    this.wind.filter.frequency.value = 300 + Math.sin(t * 0.13) * 120 + Math.sin(t * 0.41) * 60;
    this.wind.gain.gain.value = 0.26 + Math.sin(t * 0.21) * 0.08 + Math.sin(t * 0.07) * 0.06;
    this.windHi.filter.frequency.value = 1200 + Math.sin(t * 0.3) * 500;
    this.tv.filter.frequency.value = 700 + Math.sin(t * 6.1) * 250 + Math.sin(t * 2.3) * 200;
    this.tv.gain.gain.value = 0.02 + Math.max(0, Math.sin(t * 3.3) * Math.sin(t * 1.7)) * 0.04;

    const due = (k, min, max) => {
      if (t < this.next[k]) return false;
      this.next[k] = t + min + Math.random() * (max - min);
      return true;
    };
    if (this.crickets && due("cricket", 0.4, 2.2)) this.cricket();
    if (due("dog", 14, 40)) this.dog();
    if (due("creak", 5, 16)) this.creak();
    if (due("drip", 1.1, 1.6)) this.drip();
    if (light > 0.3 && due("clink", 2, 6)) this.clink();
  }

  cricket() {
    const e = this.e;
    const base = 4200 + Math.random() * 600;
    const n = 3 + Math.floor(Math.random() * 4);
    for (let i = 0; i < n; i += 1) e.tone({ freq: base, type: "sine", duration: 0.035, gain: 0.012, delay: i * 0.07, out: e.amb });
  }

  dog() {
    // Far off: a few muffled barks.
    const e = this.e;
    const n = 1 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i += 1) {
      const d = i * (0.35 + Math.random() * 0.2);
      e.burst({ duration: 0.18, gain: 0.05, delay: d, freq: 600, q: 4, out: e.amb });
      e.tone({ freq: 380, type: "sawtooth", duration: 0.14, gain: 0.012, delay: d, slideTo: 250, out: e.amb });
    }
  }

  creak() {
    const e = this.e;
    const f = 90 + Math.random() * 120;
    e.tone({ freq: f, type: "sawtooth", duration: 0.6 + Math.random() * 0.8, gain: 0.01, slideTo: f * (0.8 + Math.random() * 0.4), attack: 0.2, out: e.amb });
    e.burst({ duration: 0.5, gain: 0.02, freq: f * 4, q: 8, attack: 0.15, out: e.amb });
  }

  drip() {
    const e = this.e;
    e.tone({ freq: 1400 + Math.random() * 300, type: "sine", duration: 0.06, gain: 0.08, slideTo: 700, out: this.dripPan });
  }

  clink() {
    const e = this.e;
    const f = 2400 + Math.random() * 1600;
    e.tone({ freq: f, type: "sine", duration: 0.5, gain: 0.02, out: e.tab });
    e.tone({ freq: f * 1.51, type: "sine", duration: 0.3, gain: 0.01, out: e.tab });
  }

  // --------------------------------------------------------------- match
  strike(success) {
    const e = this.e;
    e.burst({ duration: 0.16, gain: 0.35, freq: 2600, q: 1.2, slideTo: 1600 });
    e.burst({ duration: 0.05, gain: 0.25, freq: 5000, q: 2, delay: 0.04 });
    if (!success) {
      e.burst({ duration: 0.1, gain: 0.12, freq: 1800, q: 1, delay: 0.12 });
      return;
    }
    // The flare: a soft whoosh and a crackle.
    e.burst({ duration: 0.5, gain: 0.3, freq: 700, q: 0.6, type: "lowpass", delay: 0.1, attack: 0.02, slideTo: 300 });
    for (let i = 0; i < 6; i += 1) e.burst({ duration: 0.02, gain: 0.08, freq: 3000 + Math.random() * 3000, q: 3, delay: 0.12 + Math.random() * 0.3 });
  }

  burningStart() {
    const e = this.e;
    if (!e.ctx || this.burning) return;
    this.burning = e.loop({ kind: "pink", freq: 900, q: 0.8, type: "bandpass", gain: 0.0, out: e.dry });
    e.fade(this.burning.gain.gain, 0.05, 0.3);
  }

  burningStop() {
    if (!this.burning) return;
    const b = this.burning;
    this.e.fade(b.gain.gain, 0, 0.15);
    setTimeout(() => b.stop(), 400);
    this.burning = null;
  }

  crackle() {
    if (!this.burning) return;
    this.e.burst({ duration: 0.02, gain: 0.04, freq: 2500 + Math.random() * 3000, q: 4, out: this.e.dry });
  }

  snuff() {
    this.e.burst({ duration: 0.35, gain: 0.12, freq: 500, q: 0.6, type: "lowpass", attack: 0.01, slideTo: 200 });
  }

  // ---------------------------------------------------------------- body
  step(mode, inTank) {
    const e = this.e;
    const g = mode === "run" ? 0.12 : 0.06;
    if (inTank) {
      e.burst({ duration: 0.18, gain: g * 1.5, freq: 900, q: 1.2, slideTo: 400 }); // shallow water
      return;
    }
    e.tone({ freq: 70 + Math.random() * 20, type: "sine", duration: 0.09, gain: g * 0.9 });
    e.burst({ duration: 0.07, gain: g * 0.6, freq: 2200 + Math.random() * 800, q: 1.5 }); // grit
  }

  fall() {
    const e = this.e;
    e.burst({ duration: 0.6, gain: 0.25, freq: 400, q: 0.5, type: "lowpass", attack: 0.05 });
    e.burst({ duration: 0.25, gain: 0.2, freq: 1800, q: 1, delay: 0.05 }); // floor giving
  }

  land() {
    const e = this.e;
    e.tone({ freq: 55, type: "sine", duration: 0.35, gain: 0.5 });
    e.burst({ duration: 0.5, gain: 0.35, freq: 1100, q: 0.8, slideTo: 300 }); // splash
    e.burst({ duration: 0.2, gain: 0.15, freq: 300, q: 1, type: "lowpass" });
  }

  climb() {
    this.e.tone({ freq: 900 + Math.random() * 200, type: "triangle", duration: 0.12, gain: 0.03 });
  }

  // rate: beats per second (0 = off).
  body(dt, { heart = 0, breath = 0 }) {
    const e = this.e;
    if (!e.ctx) return;
    this.heart.rate = heart;
    this.breath.rate = breath;
    this.heart.next -= dt;
    if (heart > 0 && this.heart.next <= 0) {
      this.heart.next = 1 / heart;
      e.tone({ freq: 48, type: "sine", duration: 0.16, gain: 0.35, out: e.dry });
      e.tone({ freq: 42, type: "sine", duration: 0.2, gain: 0.25, delay: 0.17, out: e.dry });
    }
    this.breath.next -= dt;
    if (breath > 0 && this.breath.next <= 0) {
      this.breath.next = 1 / breath;
      e.burst({ duration: 0.9 / Math.max(1, breath), gain: 0.03 + breath * 0.012, freq: 900, q: 0.5, type: "bandpass", attack: 0.25, out: e.dry });
    }
  }
}
