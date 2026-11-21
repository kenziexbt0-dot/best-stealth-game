// Night Parcel — the game loop: phases, levels, scoring and wiring.
//
// Phases: title -> intro -> playing -> (paused) -> levelclear -> intro
// -> ... -> win, with caught as a dead end that restarts the level.
// The loop runs on requestAnimationFrame with a clamped delta so a slow
// frame never teleports anyone through a wall. ?shot=<name> poses one
// frozen moment for screenshots instead of playing.

import { LEVELS, LEVEL_PAR, TILE } from './config.js';
import { buildWorld } from './world.js';
import { createGuard, updateGuard } from './guards.js';
import { createPlayer, updatePlayer, playerNoise } from './player.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { draw } from './render.js';
import { applyShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusLine = document.getElementById('status');
const input = createInput(canvas);
const audio = createAudio();

const state = {
  phase: 'title',
  levelIndex: 0,
  level: LEVELS[0],
  world: null,
  player: null,
  guards: [],
  time: 0,
  levelTime: 0,
  ghost: true, // stays true while no guard has ever raised the alarm
  effects: [],
  spottedFlag: false,
};

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

function loadLevel(index) {
  const level = LEVELS[index];
  state.levelIndex = index;
  state.level = level;
  state.world = buildWorld(level);
  state.player = createPlayer(state.world.start);
  state.guards = level.guards.map((def) => createGuard(def));
  state.levelTime = 0;
  state.effects = [];
  state.phase = 'intro';
  announce(`${level.name}. ${level.intro}`);
}

function announce(text) {
  if (statusLine) statusLine.textContent = text;
}

function startGame() {
  state.time = 0;
  state.ghost = true;
  loadLevel(0);
}

function levelScore() {
  // Par time per level, plus a ghost bonus for never being spotted.
  const par = LEVEL_PAR[state.levelIndex];
  const timeBonus = Math.max(0, Math.round((par - state.levelTime) * 10));
  return 500 + timeBonus + (state.ghost ? 300 : 0);
}

function update(dt) {
  if (state.phase !== 'playing') return;
  state.time += dt;
  state.levelTime += dt;

  // The player moves first; a click throws a pebble.
  const click = input.takeClick();
  const events = updatePlayer(
    state.player,
    dt,
    state.world,
    input.moveVector(),
    input.sneaking,
    click,
  );
  let noise = playerNoise(state.player);
  for (const ev of events) {
    if (ev.type === 'step') audio.playerStep();
    if (ev.type === 'pebble') {
      audio.pebble();
      noise = { x: ev.x, y: ev.y, radius: ev.radius };
      state.effects.push({ kind: 'pebble', x: ev.x, y: ev.y, at: state.time });
    }
  }
  state.effects = state.effects.filter((fx) => state.time - fx.at < 0.8);

  // Then every guard reacts to the player and to noise.
  let caught = false;
  for (const guard of state.guards) {
    const guardEvents = updateGuard(guard, dt, state.world, state.player, noise);
    for (const ev of guardEvents) {
      if (ev === 'step') {
        audio.footstep(guard.x - state.player.x, Math.hypot(guard.x - state.player.x, guard.y - state.player.y));
      }
      if (ev === 'spotted') audio.spotted();
      if (ev === 'alarm') {
        audio.alarm();
        state.ghost = false;
        announce('Alarm! A watchman spotted you — break line of sight!');
      }
      if (ev === 'lost') announce('The watchmen lost you. Stay quiet.');
      if (ev === 'caught') caught = true;
    }
  }
  if (caught) {
    audio.caught();
    state.phase = 'caught';
    announce('Caught! Press R to try the level again.');
    return;
  }

  // Parcels: walk over one to pick it up.
  for (const parcel of state.world.parcels) {
    if (!parcel.taken && Math.hypot(parcel.x - state.player.x, parcel.y - state.player.y) < 26) {
      parcel.taken = true;
      audio.pickup();
      const got = state.world.parcels.filter((p) => p.taken).length;
      announce(`Parcel ${got} of ${state.world.parcels.length} collected.`);
    }
  }

  // The exit opens once every parcel is collected.
  const allCollected = state.world.parcels.every((p) => p.taken);
  if (allCollected) {
    const exit = state.world.exit;
    if (Math.hypot(exit.x - state.player.x, exit.y - state.player.y) < 30) {
      if (state.levelIndex + 1 >= LEVELS.length) {
        audio.win();
        state.phase = 'win';
        announce('All parcels delivered. You win!');
      } else {
        audio.levelClear();
        state.phase = 'levelclear';
        state.lastScore = levelScore();
        announce(`${state.level.name} clear. Press Enter for the next level.`);
      }
    }
  }
}

function handleKeys() {
  if (input.pressed('Enter') || input.pressed('NumpadEnter')) {
    audio.unlock();
    if (state.phase === 'title') startGame();
    else if (state.phase === 'intro') state.phase = 'playing';
    else if (state.phase === 'levelclear') loadLevel(state.levelIndex + 1);
  }
  if (input.pressed('KeyM')) {
    const muted = audio.toggleMute();
    announce(muted ? 'Sound muted.' : 'Sound on.');
  }
  if (input.pressed('KeyP')) {
    if (state.phase === 'playing') {
      state.phase = 'paused';
      announce('Paused.');
    } else if (state.phase === 'paused') {
      state.phase = 'playing';
      announce('Back to the shadows.');
    }
  }
  if (input.pressed('KeyR')) {
    if (state.phase === 'caught' || state.phase === 'win' || state.phase === 'playing' || state.phase === 'paused') {
      if (state.phase === 'win') startGame();
      else loadLevel(state.levelIndex);
    }
  }
  // A click on the title, intro or level-clear screen advances it.
  // (During play, clicks belong to the pebble throw in update().)
  if (state.phase === 'title' || state.phase === 'intro' || state.phase === 'levelclear') {
    if (input.takeClick()) {
      audio.unlock();
      if (state.phase === 'title') startGame();
      else if (state.phase === 'intro') state.phase = 'playing';
      else if (state.phase === 'levelclear') loadLevel(state.levelIndex + 1);
    }
  }
}

// --- Boot ---

loadLevel(0);
state.phase = 'title';

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
if (shotName) {
  // Screenshot mode: pose one frozen moment and keep re-rendering that
  // same frame. The state never advances (no loop updates, no input, no
  // audio), so the frame is identical every run — but it is redrawn on
  // every animation frame so a window resize can never leave the canvas
  // blank after the resize clears it.
  const levelParam = Number(params.get('level') ?? 0);
  if (LEVELS[levelParam]) loadLevel(levelParam);
  state.phase = 'playing';
  if (applyShot(state, shotName)) {
    document.title = `shot:${shotName}`;
    if (statusLine) statusLine.textContent = `shot:${shotName}`;
    (function shotFrame() {
      draw(ctx, canvas, state);
      requestAnimationFrame(shotFrame);
    })();
  } else {
    document.title = 'shot:unknown';
  }
} else {
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    handleKeys();
    update(dt);
    draw(ctx, canvas, state);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

// A global error trap: a headless test reads document.title to learn
// whether the game booted cleanly.
window.addEventListener('error', (event) => {
  document.title = `error:${event.message}`;
});
