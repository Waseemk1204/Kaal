// Recorded voice lines, if there are any. Drop MP3s into assets/voice/ named
// by line id (see docs/VOICE.md) and list them in assets/voice/manifest.json:
//   { "lines": ["mummy-eat", "dadi-know", ...] }
// Any line without a recording falls back to the wordless murmur.

export class Voice {
  constructor(engine) {
    this.e = engine;
    this.available = new Set();
    this.buffers = new Map();
    this.loading = null;
  }

  // Called once audio is unlocked.
  async load() {
    if (this.loading || !this.e.ctx) return this.loading;
    this.loading = (async () => {
      try {
        const res = await fetch("./assets/voice/manifest.json", { cache: "no-cache" });
        if (!res.ok) return;
        const { lines = [] } = await res.json();
        for (const id of lines) this.available.add(id);
        await Promise.all(
          lines.map(async (id) => {
            try {
              const data = await (await fetch(`./assets/voice/${id}.mp3`)).arrayBuffer();
              this.buffers.set(id, await this.e.ctx.decodeAudioData(data));
            } catch {
              this.available.delete(id);
            }
          }),
        );
      } catch {
        // No voices: the murmur it is.
      }
    })();
    return this.loading;
  }

  // Play a line. Returns false if there's no recording for it.
  play(id, { gain = 0.9, muffled = false } = {}) {
    const buf = id && this.buffers.get(id);
    if (!buf || !this.e.ctx) return false;
    const ctx = this.e.ctx;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = ctx.createGain();
    g.gain.value = gain;
    src.connect(g);
    if (muffled) {
      const f = ctx.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.value = 1400;
      g.connect(f);
      f.connect(this.e.reverbSend);
      f.connect(this.e.master);
    } else {
      g.connect(this.e.master);
      g.connect(this.e.reverbSend);
    }
    src.start();
    return true;
  }
}
