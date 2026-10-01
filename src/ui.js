// The few words and marks the game puts on screen: subtitles, the prompt
// under the crosshair, the hold ring, the match count after a strike, notes,
// diary pages and the end cards.

const $ = (s) => document.querySelector(s);

export class UI {
  constructor() {
    this.hud = $("#hud");
    this.prompt = $("#prompt");
    this.cross = $("#crosshair");
    this.hold = $("#hold");
    this.ring = $("#hold circle");
    this.matches = $("#matches");
    this.subtitle = $("#subtitle");
    this.noteEl = $("#note");
    this.pageEl = $("#page");
    this.pageText = $("#page-text");
    this.card = $("#card");
    this.fadeEl = $("#fade");
    this.subTimer = 0;
    this.subQueue = [];
    this.matchTimer = 0;
    this.noteTimer = 0;
    this.lastPrompt = "";
  }

  show() {
    this.hud.classList.remove("hidden");
  }

  hide() {
    this.hud.classList.add("hidden");
  }

  setPrompt(text, key = "E") {
    const html = text ? `<b>${key}</b>${text}` : "";
    if (html !== this.lastPrompt) {
      this.lastPrompt = html;
      if (text) this.prompt.innerHTML = html;
      this.prompt.classList.toggle("on", !!text);
      this.cross.classList.toggle("active", !!text);
    }
  }

  setHold(fraction) {
    this.hold.classList.toggle("on", fraction > 0);
    this.ring.style.strokeDashoffset = String(100.5 * (1 - Math.min(1, fraction)));
  }

  // Briefly show what's left in the box (and candles), then fade.
  showMatches(ab, tab = 0, candles = 0, seconds = 2.2) {
    let html = "";
    for (let i = 0; i < tab; i += 1) html += '<i class="tab"></i>';
    for (let i = 0; i < ab; i += 1) html += "<i></i>";
    for (let i = 0; i < candles; i += 1) html += '<i class="candle"></i>';
    if (!ab && !tab) html += "<span>the box is empty</span>";
    this.matches.innerHTML = html;
    this.matches.classList.add("on");
    this.matchTimer = seconds;
  }

  // Lines: [{ who, text, time }]. Plays in order.
  say(lines) {
    const list = Array.isArray(lines) ? lines : [lines];
    this.subQueue.push(...list);
    if (this.subTimer <= 0) this.nextLine();
  }

  nextLine() {
    const line = this.subQueue.shift();
    if (!line) {
      this.subtitle.classList.remove("on");
      return;
    }
    this.subtitle.innerHTML = (line.who ? `<span class="who">${line.who}</span>` : "") + line.text;
    this.subtitle.classList.add("on");
    this.subTimer = line.time ?? Math.max(2.4, line.text.length * 0.065);
  }

  clearSubs() {
    this.subQueue.length = 0;
    this.subTimer = 0;
    this.subtitle.classList.remove("on");
  }

  note(text, seconds = 4) {
    this.noteEl.textContent = text;
    this.noteEl.classList.add("on");
    this.noteTimer = seconds;
  }

  get reading() {
    return !this.pageEl.classList.contains("hidden");
  }

  page(text) {
    this.pageText.textContent = text;
    this.pageEl.classList.remove("hidden");
  }

  closePage() {
    this.pageEl.classList.add("hidden");
  }

  showCard(title, sub, actions) {
    this.card.classList.remove("hidden");
    // Restart the animations.
    this.card.innerHTML = `<h2>${title}</h2><p>${sub}</p><div class="card-actions"></div>`;
    const row = this.card.querySelector(".card-actions");
    for (const a of actions) {
      const b = document.createElement("button");
      b.className = `btn${a.ghost ? " ghost" : ""}`;
      b.type = "button";
      b.textContent = a.label;
      b.addEventListener("click", a.onClick);
      row.appendChild(b);
    }
  }

  hideCard() {
    this.card.classList.add("hidden");
  }

  fade(on) {
    this.fadeEl.classList.toggle("on", on);
  }

  update(dt) {
    if (this.subTimer > 0) {
      this.subTimer -= dt;
      if (this.subTimer <= 0) this.nextLine();
    }
    if (this.matchTimer > 0) {
      this.matchTimer -= dt;
      if (this.matchTimer <= 0) this.matches.classList.remove("on");
    }
    if (this.noteTimer > 0) {
      this.noteTimer -= dt;
      if (this.noteTimer <= 0) this.noteEl.classList.remove("on");
    }
  }
}
