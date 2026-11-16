// LUMEN DRIFT — boot and frame loop. Wires the canvas, input, game and
// renderer together; keeps the logical arena (960x600) scaled to fit any
// window, crisp on HiDPI screens.

import { ARENA } from './config.js';
import { Game, STATES } from './game.js';
import { Renderer } from './render.js';
import { Input } from './input.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const game = new Game();
const renderer = new Renderer(canvas);
const input = new Input(canvas);

let scale = 1;
let dpr = 1;

function resize() {
  const pad = 0;
  const availW = window.innerWidth - pad;
  const availH = window.innerHeight - pad;
  scale = Math.min(availW / ARENA.width, availH / ARENA.height);
  dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.style.width = `${Math.floor(ARENA.width * scale)}px`;
  canvas.style.height = `${Math.floor(ARENA.height * scale)}px`;
  canvas.width = Math.floor(ARENA.width * scale * dpr);
  canvas.height = Math.floor(ARENA.height * scale * dpr);
  ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
}

window.addEventListener('resize', resize);
resize();

function handleAction() {
  game.sound.unlock();
  if (game.state === STATES.TITLE || game.state === STATES.OVER) {
    game.start();
  } else if (game.state === STATES.PAUSED) {
    game.togglePause();
  }
}

canvas.addEventListener('pointerdown', () => {
  // A click during play is just a sound unlock; state changes happen on
  // the pressed edge below so one click never double-triggers.
  game.sound.unlock();
});

let last = performance.now();

function frame(now) {
  const rawDt = Math.min(0.05, (now - last) / 1000);
  last = now;

  // One-shot actions.
  if (input.pressed('pointer') || input.pressed(' ') || input.pressed('Enter')) {
    handleAction();
  }
  if (input.pressed('p') || input.pressed('P') || input.pressed('Escape')) {
    if (game.state === STATES.PLAYING || game.state === STATES.PAUSED) {
      game.togglePause();
      game.sound.click();
    }
  }
  if (input.pressed('m') || input.pressed('M')) {
    const muted = game.sound.toggleMute();
    document.getElementById('mute-note').textContent = muted ? 'MUTED — press M to unmute' : '';
  }

  // Pointer coordinates arrive in CSS pixels; divide by the CSS scale only
  // (not the device-pixel ratio) to reach logical arena coordinates.
  game.update(rawDt, input, scale);
  renderer.draw(game, game.time);
  input.endFrame();
  requestAnimationFrame(frame);
}

// Keep the page's focus on the canvas so arrow keys and space never scroll.
canvas.setAttribute('tabindex', '0');
canvas.focus();
requestAnimationFrame(frame);

// Debug hook for automated play-testing and screenshots (harmless in play):
// start the game, force a game over, or inspect the live state.
window.__lumen = {
  game,
  start: () => game.start(),
  forceGameOver: () => {
    if (game.state === STATES.PLAYING) {
      game.hearts = 1;
      game.player.invuln = 0;
      game.hitOrb({ dead: false, x: game.player.x, y: game.player.y });
    }
  },
};
