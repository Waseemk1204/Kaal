// The playtest log. Every session is recorded in this browser only (local
// storage; nothing is sent anywhere): how long each act took, where people
// died, matches struck and wasted, falls, things that crumbled, hints, and
// time spent in each room. F9 (or ?log) shows it, with a button to copy all
// sessions as JSON to paste back into tuning.

const KEY = "kaal.playtests";
const MAX_SESSIONS = 30;

export class Telemetry {
  constructor() {
    this.session = null;
    this.panel = null;
    this.sampleT = 0;
    this.saveT = 0;
  }

  begin(meta = {}) {
    this.session = {
      id: Date.now().toString(36),
      started: new Date().toISOString(),
      ...meta,
      t: 0,
      counts: {},
      acts: {},
      deaths: [],
      rooms: {},
      events: [],
    };
    this.save();
  }

  get t() {
    return this.session ? Math.round(this.session.t * 10) / 10 : 0;
  }

  log(type, data = {}) {
    const s = this.session;
    if (!s) return;
    s.counts[type] = (s.counts[type] || 0) + 1;
    if (s.events.length < 600) s.events.push({ t: this.t, type, ...data });
    if (type === "act" && data.name && s.acts[data.name] == null) s.acts[data.name] = this.t;
    if (type === "death") s.deaths.push({ t: this.t, ...data });
    if (["act", "death", "ending", "retry", "restore"].includes(type)) this.save();
    this.render();
  }

  // Called every frame while playing.
  tick(dt, room, playing) {
    const s = this.session;
    if (!s) return;
    s.t += dt;
    if (playing && room) s.rooms[room] = Math.round(((s.rooms[room] || 0) + dt) * 10) / 10;
    this.saveT += dt;
    if (this.saveT > 10) {
      this.saveT = 0;
      this.save();
    }
    this.sampleT += dt;
    if (this.panel && this.sampleT > 0.5) {
      this.sampleT = 0;
      this.render();
    }
  }

  all() {
    try {
      return JSON.parse(localStorage.getItem(KEY) || "[]");
    } catch {
      return [];
    }
  }

  save() {
    if (!this.session) return;
    try {
      const all = this.all().filter((x) => x.id !== this.session.id);
      all.push(this.session);
      localStorage.setItem(KEY, JSON.stringify(all.slice(-MAX_SESSIONS)));
    } catch {}
  }

  clear() {
    try {
      localStorage.removeItem(KEY);
    } catch {}
    this.render();
  }

  // ------------------------------------------------------------- panel
  toggle() {
    if (this.panel) {
      this.panel.remove();
      this.panel = null;
      return;
    }
    const el = document.createElement("div");
    el.className = "playtest";
    el.innerHTML = `<div class="playtest-head"><b>Playtest log</b>
      <button type="button" data-a="copy">Copy all sessions</button>
      <button type="button" data-a="clear">Clear</button></div><pre></pre>`;
    el.addEventListener("click", (e) => {
      const a = e.target.dataset?.a;
      if (a === "copy") {
        const text = JSON.stringify(this.all(), null, 1);
        navigator.clipboard?.writeText(text).then(
          () => (e.target.textContent = "Copied"),
          () => console.log(text),
        );
      }
      if (a === "clear" && confirm("Clear every recorded session?")) this.clear();
    });
    document.querySelector("#app").appendChild(el);
    this.panel = el;
    this.render();
  }

  render() {
    if (!this.panel) return;
    const s = this.session;
    const lines = [];
    if (s) {
      const m = (x) => (x == null ? "–" : `${Math.floor(x / 60)}:${String(Math.round(x % 60)).padStart(2, "0")}`);
      lines.push(`session ${s.id}   time ${m(s.t)}   quality ${s.quality ?? "?"}`);
      lines.push(`acts:   ${Object.entries(s.acts).map(([k, v]) => `${k} ${m(v)}`).join("   ") || "–"}`);
      const c = s.counts;
      lines.push(`strikes ${c.strike || 0} (failed ${c.strikeFail || 0})   dropped ${c.dropMatch || 0}   candles ${c.candle || 0}   falls ${c.fall || 0}`);
      lines.push(`crumbled ${c.crumble || 0}   hints ${c.hint || 0}   pages ${c.page || 0}   retries ${c.retry || 0}`);
      lines.push(`deaths  ${s.deaths.map((d) => `${m(d.t)} stage ${d.stage} in ${d.room}`).join(" · ") || "none"}`);
      lines.push(`rooms   ${Object.entries(s.rooms).map(([k, v]) => `${k} ${m(v)}`).join("   ")}`);
    }
    lines.push(`\n${this.all().length} session(s) stored in this browser.`);
    this.panel.querySelector("pre").textContent = lines.join("\n");
  }
}
