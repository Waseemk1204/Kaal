// KAAL: the host page. Title, brightness check, settings, pause, and the
// frame loop that drives the game.

import * as THREE from "three";
import { Game } from "./game.js";
import { Input, Look } from "./input.js";
import { UI } from "./ui.js";
import { AudioEngine } from "./audio/engine.js";
import { Sounds } from "./audio/sounds.js";
import { Director } from "./director.js";
import { Kaal } from "./kaal/kaal.js";
import { World } from "./world/world.js";

const $ = (s) => document.querySelector(s);

// ---------------------------------------------------------------- settings
const SETTINGS_KEY = "kaal.settings";
const settings = { sens: 0.0022, vol: 0.9, bright: 1, subs: 1, calibrated: false };
try {
  Object.assign(settings, JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}"));
} catch {}
function saveSettings() {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {}
}

// ------------------------------------------------------------------ setup
const canvas = $("#game");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: "high-performance" });
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const audio = new AudioEngine();
const sounds = new Sounds(audio);
sounds.e = audio;
const input = new Input();
const ui = new UI();
const look = new Look({
  target: canvas,
  onLook: () => {},
  onLockChange: (locked) => {
    if (!locked && game.state === "play" && !ui.reading) pause();
  },
});
const game = new Game({ renderer, canvas, audio, sounds, input, look, ui });
game.kaal = new Kaal(game);
game.world = new World(game);
const director = new Director(game);
game.director = director;
window.__kaal = { game, director, THREE };

function applySettings() {
  look.sensitivity = settings.sens;
  audio.setVolume(settings.vol);
  game.brightness = settings.bright;
  document.documentElement.style.setProperty("--sub-scale", settings.subs);
}
applySettings();

// ------------------------------------------------------------------ screens
const screens = ["#title", "#brightness", "#settings", "#pause"];
function showScreen(id) {
  for (const s of screens) $(s).classList.toggle("hidden", s !== id);
}
let settingsReturn = "#title";

$("#btn-start").addEventListener("click", () => {
  audio.unlock();
  sounds.start();
  if (!settings.calibrated) {
    showScreen("#brightness");
    $("#bright-range").value = settings.bright;
    updateBrightSample();
    return;
  }
  begin();
});

function updateBrightSample() {
  const v = Number($("#bright-range").value);
  // The sample is drawn at the in-game darkness of the house's shadows.
  const c = Math.round(13 * v * v);
  $("#bright-diya").style.fill = `rgb(${c},${Math.round(c * 0.85)},${Math.round(c * 0.7)})`;
}
$("#bright-range").addEventListener("input", updateBrightSample);
$("#btn-bright-ok").addEventListener("click", () => {
  settings.bright = Number($("#bright-range").value);
  settings.calibrated = true;
  saveSettings();
  applySettings();
  begin();
});

$("#btn-settings").addEventListener("click", () => openSettings("#title"));
$("#btn-pause-settings").addEventListener("click", () => openSettings("#pause"));
function openSettings(back) {
  settingsReturn = back;
  $("#set-sens").value = settings.sens;
  $("#set-vol").value = settings.vol;
  $("#set-bright").value = settings.bright;
  $("#set-subs").value = String(settings.subs);
  showScreen("#settings");
}
for (const [id, key] of [
  ["#set-sens", "sens"],
  ["#set-vol", "vol"],
  ["#set-bright", "bright"],
  ["#set-subs", "subs"],
]) {
  $(id).addEventListener("input", (e) => {
    settings[key] = Number(e.target.value);
    applySettings();
    saveSettings();
  });
}
$("#btn-settings-back").addEventListener("click", () => showScreen(settingsReturn));

function begin() {
  showScreen(null);
  director.begin();
  look.lock();
}

// ------------------------------------------------------------------ pause
function pause() {
  if (game.state !== "play" && game.state !== "scene") return;
  game.pausedFrom = game.state;
  game.state = "paused";
  audio.ctx?.suspend();
  showScreen("#pause");
}
function resume() {
  showScreen(null);
  game.state = game.pausedFrom || "play";
  audio.ctx?.resume();
  look.lock();
}
$("#btn-resume").addEventListener("click", resume);
$("#btn-checkpoint").addEventListener("click", () => {
  resume();
  director.restartCheckpoint();
});
$("#btn-quit").addEventListener("click", () => location.reload());
window.addEventListener("keydown", (e) => {
  if (ui.reading) {
    ui.closePage();
    director.event("pageClosed");
    return;
  }
  if (e.key === "Escape" && game.state === "paused") resume();
});

// ------------------------------------------------------------- title flame
const tf = $("#title-flame");
const tctx = tf.getContext("2d");
function drawTitleFlame(t) {
  const w = tf.width;
  const h = tf.height;
  tctx.clearRect(0, 0, w, h);
  const flick = 1 + Math.sin(t * 0.011) * 0.04 + Math.sin(t * 0.023) * 0.03 + (Math.random() - 0.5) * 0.03;
  const g = tctx.createRadialGradient(w / 2, h * 0.62, 2, w / 2, h * 0.62, 90 * flick);
  g.addColorStop(0, "rgba(255,170,80,0.35)");
  g.addColorStop(1, "rgba(255,120,20,0)");
  tctx.fillStyle = g;
  tctx.fillRect(0, 0, w, h);
  tctx.save();
  tctx.translate(w / 2, h * 0.7);
  tctx.scale(flick, flick * (1 + Math.sin(t * 0.017) * 0.05));
  const f = tctx.createLinearGradient(0, -70, 0, 0);
  f.addColorStop(0, "rgba(255,230,180,0)");
  f.addColorStop(0.3, "rgba(255,200,120,0.9)");
  f.addColorStop(1, "rgba(255,140,40,1)");
  tctx.fillStyle = f;
  tctx.beginPath();
  tctx.moveTo(0, -72);
  tctx.bezierCurveTo(14, -40, 14, -8, 0, 0);
  tctx.bezierCurveTo(-14, -8, -14, -40, 0, -72);
  tctx.fill();
  tctx.fillStyle = "rgba(255,255,240,0.85)";
  tctx.beginPath();
  tctx.ellipse(0, -14, 4, 11, 0, 0, Math.PI * 2);
  tctx.fill();
  tctx.restore();
}

// ------------------------------------------------------------------- loop
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (!$("#title").classList.contains("hidden")) drawTitleFlame(now);
  if (game.state !== "paused" && game.state !== "idle") {
    game.update(dt);
    game.render();
  } else if (game.state === "idle") {
    input.endFrame();
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// ?dev skips the title (for testing): ?dev&at=kitchen jumps to a room.
const params = new URLSearchParams(location.search);
if (params.has("dev")) {
  showScreen(null);
  director.dev = Object.fromEntries(params);
  director.begin();
  window.addEventListener(
    "pointerdown",
    () => {
      audio.unlock();
      sounds.start();
    },
    { once: true },
  );
}
