// Night Parcel — everything the player sees, drawn on one canvas.
//
// The world is 960x600 and is scaled to fit the window, so the game
// looks the same in any desktop browser. Drawing order: floor, cover,
// parcels and exit, the player and the guards with their vision cones,
// then a darkness layer with a pool of light around the player, then the
// HUD and the menu screens. Colours are chosen so cover reads at a
// glance, guards stand out against the floor, and the cones show what
// is safe and what is not.

import { TILE, VIEW_W, VIEW_H, VISION_RANGE, VISION_HALF_ANGLE } from './config.js';

const FLOOR_A = '#2b3345';
const FLOOR_B = '#272e3e';
const WALL_FILL = '#4a546e';
const WALL_TOP = '#6d7794';
const CRATE_FILL = '#6b4e2e';
const CRATE_EDGE = '#8a6a3e';
const GRASS_FILL = '#1d3a24';
const GRASS_BLADE = '#2f6b3a';

// Fit the 960x600 world into the canvas, centred, keeping the aspect.
export function fitTransform(canvas) {
  const scale = Math.min(canvas.width / VIEW_W, canvas.height / VIEW_H);
  const ox = (canvas.width - VIEW_W * scale) / 2;
  const oy = (canvas.height - VIEW_H * scale) / 2;
  return { scale, ox, oy };
}

function drawFloor(ctx, world) {
  for (let row = 0; row < world.rows; row++) {
    for (let col = 0; col < world.cols; col++) {
      ctx.fillStyle = (col + row) % 2 === 0 ? FLOOR_A : FLOOR_B;
      ctx.fillRect(col * TILE, row * TILE, TILE, TILE);
    }
  }
}

function drawTile(ctx, ch, x, y) {
  if (ch === '#') {
    ctx.fillStyle = WALL_FILL;
    ctx.fillRect(x, y, TILE, TILE);
    ctx.fillStyle = WALL_TOP;
    ctx.fillRect(x, y, TILE, 6);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(x, y + TILE - 6, TILE, 6);
  } else if (ch === 'C') {
    ctx.fillStyle = CRATE_FILL;
    ctx.fillRect(x + 3, y + 3, TILE - 6, TILE - 6);
    ctx.strokeStyle = CRATE_EDGE;
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 3, y + 3, TILE - 6, TILE - 6);
    ctx.beginPath();
    ctx.moveTo(x + 3, y + 3);
    ctx.lineTo(x + TILE - 3, y + TILE - 3);
    ctx.moveTo(x + TILE - 3, y + 3);
    ctx.lineTo(x + 3, y + TILE - 3);
    ctx.stroke();
  } else if (ch === ',') {
    ctx.fillStyle = GRASS_FILL;
    ctx.fillRect(x, y, TILE, TILE);
    ctx.strokeStyle = GRASS_BLADE;
    ctx.lineWidth = 2;
    for (let i = 0; i < 5; i++) {
      const bx = x + 6 + i * 7;
      ctx.beginPath();
      ctx.moveTo(bx, y + TILE - 6);
      ctx.lineTo(bx + 2, y + 10 + (i % 3) * 4);
      ctx.stroke();
    }
  }
}

function drawParcel(ctx, parcel, time) {
  const pulse = 0.5 + 0.5 * Math.sin(time * 3 + parcel.x);
  ctx.save();
  ctx.translate(parcel.x, parcel.y);
  ctx.strokeStyle = `rgba(255, 190, 60, ${0.35 + 0.45 * pulse})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, 18 + pulse * 4, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#f5b942';
  ctx.fillRect(-9, -8, 18, 16);
  ctx.fillStyle = '#8a5a12';
  ctx.fillRect(-2, -8, 4, 16);
  ctx.fillRect(-9, -2, 18, 4);
  ctx.restore();
}

function drawExit(ctx, exit, open, time) {
  const glow = open ? 0.6 + 0.4 * Math.sin(time * 4) : 0.25;
  ctx.save();
  ctx.translate(exit.x, exit.y);
  ctx.fillStyle = open ? `rgba(80, 220, 120, ${glow})` : 'rgba(120, 130, 120, 0.5)';
  ctx.beginPath();
  ctx.arc(0, 0, 26, 0, Math.PI * 2);
  ctx.fill();
  // The label sits above the gate so it is never clipped by the edge.
  ctx.fillStyle = open ? '#8cffaa' : '#c8d0c8';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('EXIT', 0, -36);
  if (open) {
    ctx.strokeStyle = `rgba(140, 255, 170, ${glow})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 31 + glow * 4, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawCone(ctx, guard) {
  const s = guard.suspicion;
  const base = s >= 100 ? '255, 70, 60' : s >= 50 ? '255, 150, 60' : '255, 220, 90';
  const alpha = s >= 100 ? 0.34 : s >= 50 ? 0.28 : 0.2;
  ctx.save();
  ctx.translate(guard.x, guard.y);
  ctx.rotate(guard.angle);
  const grad = ctx.createRadialGradient(0, 0, 8, 0, 0, VISION_RANGE);
  grad.addColorStop(0, `rgba(${base}, ${alpha})`);
  grad.addColorStop(1, `rgba(${base}, 0)`);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.arc(0, 0, VISION_RANGE, -VISION_HALF_ANGLE, VISION_HALF_ANGLE);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawGuard(ctx, guard, time) {
  drawCone(ctx, guard);
  ctx.save();
  ctx.translate(guard.x, guard.y);
  // Body: a watchman in a dark red coat with a pale cap.
  ctx.fillStyle = guard.state === 'chase' ? '#c22e2e' : '#8c2f35';
  ctx.beginPath();
  ctx.arc(0, 0, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e8dcc8';
  ctx.beginPath();
  ctx.arc(0, -2, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2c2c34';
  ctx.beginPath();
  ctx.arc(0, -2, 7, Math.PI, Math.PI * 2);
  ctx.fill();
  // Facing tick.
  ctx.strokeStyle = '#ffd9d9';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(Math.cos(guard.angle) * 17, Math.sin(guard.angle) * 17);
  ctx.stroke();
  // Suspicion mark above the head.
  if (guard.suspicion >= 50 || guard.state === 'chase') {
    const mark = guard.state === 'chase' ? '!' : '?';
    const bob = Math.sin(time * 6) * 2;
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = guard.state === 'chase' ? '#ff5040' : '#ffb020';
    ctx.fillText(mark, 0, -28 + bob);
  }
  // Suspicion arc under the guard.
  if (guard.suspicion > 1 && guard.suspicion < 100) {
    ctx.strokeStyle = 'rgba(255, 176, 32, 0.9)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 18, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * guard.suspicion) / 100);
    ctx.stroke();
  }
  ctx.restore();
}

function drawPlayer(ctx, player, world, time) {
  const hidden = player.sneaking;
  ctx.save();
  ctx.translate(player.x, player.y);
  // A soft ring marks the courier so the eye finds them at once.
  ctx.strokeStyle = 'rgba(120, 230, 220, 0.8)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, player.radius + 4, 0, Math.PI * 2);
  ctx.stroke();
  // Hooded courier: teal cloak, darker and lower when sneaking.
  ctx.fillStyle = hidden ? '#1f7a72' : '#2ec4b6';
  ctx.beginPath();
  ctx.arc(0, hidden ? 2 : 0, hidden ? 11 : 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#0f3d3a';
  ctx.beginPath();
  ctx.arc(0, hidden ? 0 : -2, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#e8fffb';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(Math.cos(player.faceAngle) * 16, Math.sin(player.faceAngle) * 16);
  ctx.stroke();
  if (hidden) {
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#9ff5ec';
    ctx.fillText('SNEAK', 0, -24);
  }
  ctx.restore();
}

// The night: a dark veil with a pool of light around the player and a
// little light inside each vision cone, so the player reads what is safe.
function drawDarkness(ctx, world, player, guards) {
  const light = document.createElement('canvas');
  light.width = VIEW_W;
  light.height = VIEW_H;
  const lctx = light.getContext('2d');
  lctx.fillStyle = 'rgba(4, 6, 14, 0.48)';
  lctx.fillRect(0, 0, VIEW_W, VIEW_H);
  lctx.globalCompositeOperation = 'destination-out';
  const glow = lctx.createRadialGradient(player.x, player.y, 30, player.x, player.y, 215);
  glow.addColorStop(0, 'rgba(0,0,0,0.95)');
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  lctx.fillStyle = glow;
  lctx.beginPath();
  lctx.arc(player.x, player.y, 215, 0, Math.PI * 2);
  lctx.fill();
  for (const guard of guards) {
    lctx.save();
    lctx.translate(guard.x, guard.y);
    lctx.rotate(guard.angle);
    lctx.fillStyle = 'rgba(0,0,0,0.35)';
    lctx.beginPath();
    lctx.moveTo(0, 0);
    lctx.arc(0, 0, VISION_RANGE * 0.8, -VISION_HALF_ANGLE, VISION_HALF_ANGLE);
    lctx.closePath();
    lctx.fill();
    lctx.restore();
  }
  ctx.drawImage(light, 0, 0);
}

function drawEffects(ctx, effects, time) {
  for (const fx of effects) {
    if (fx.kind === 'pebble') {
      const age = time - fx.at;
      if (age < 0.7) {
        const r = 8 + age * 60;
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.8 * (1 - age / 0.7)})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(fx.x, fx.y, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#cfd6e4';
        ctx.beginPath();
        ctx.arc(fx.x, fx.y, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

// --- HUD (drawn in screen space, after the world transform) ---

function drawHud(ctx, canvas, state) {
  const pad = 12;
  ctx.save();
  ctx.font = 'bold 14px sans-serif';
  ctx.textBaseline = 'middle';
  // Level name, top left.
  ctx.fillStyle = 'rgba(10, 14, 24, 0.72)';
  ctx.fillRect(0, 0, canvas.width, 34);
  ctx.fillStyle = '#e8ecf4';
  ctx.textAlign = 'left';
  ctx.fillText(`Night Parcel — ${state.level.name}`, pad, 17);
  // Parcels, top right.
  const total = state.world.parcels.length;
  const got = state.world.parcels.filter((p) => p.taken).length;
  ctx.textAlign = 'right';
  ctx.fillStyle = got === total ? '#8cffaa' : '#ffd27a';
  ctx.fillText(`Parcels ${got}/${total}   Pebbles ${state.player.pebbles}   ${fmtTime(state.time)}`, canvas.width - pad, 17);
  // The alarm meter: the highest suspicion among the guards.
  const top = Math.max(0, ...state.guards.map((g) => g.suspicion));
  const anyChase = state.guards.some((g) => g.state === 'chase');
  if (top > 1 || anyChase) {
    const w = 260;
    const x = (canvas.width - w) / 2;
    const y = 44;
    ctx.fillStyle = 'rgba(10, 14, 24, 0.78)';
    ctx.fillRect(x - 10, y - 8, w + 20, 30);
    ctx.fillStyle = '#3a2430';
    ctx.fillRect(x, y, w, 12);
    ctx.fillStyle = anyChase ? '#ff4030' : top >= 50 ? '#ff9a20' : '#ffd23e';
    ctx.fillRect(x, y, (w * Math.min(100, top)) / 100, 12);
    ctx.fillStyle = anyChase ? '#ff8070' : '#ffe9a8';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(anyChase ? 'ALARM — RUN AND HIDE!' : top >= 50 ? 'SPOTTED — BREAK LINE OF SIGHT!' : 'SUSPICION RISING…', canvas.width / 2, y + 26);
  }
  // Hints, bottom.
  ctx.fillStyle = 'rgba(10, 14, 24, 0.6)';
  ctx.fillRect(0, canvas.height - 28, canvas.width, 28);
  ctx.fillStyle = '#aeb8cc';
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('WASD / arrows move   ·   Shift sneak   ·   Click throw a pebble   ·   M mute   ·   P pause   ·   R restart level', canvas.width / 2, canvas.height - 14);
  ctx.restore();
}

export function fmtTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

// --- Screens ---

function panel(ctx, canvas, title, lines, accent) {
  ctx.save();
  ctx.fillStyle = 'rgba(5, 8, 16, 0.82)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const w = 560;
  const h = 120 + lines.length * 26;
  const x = (canvas.width - w) / 2;
  const y = (canvas.height - h) / 2;
  ctx.fillStyle = '#141a28';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = accent;
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = accent;
  ctx.font = 'bold 30px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(title, canvas.width / 2, y + 44);
  ctx.fillStyle = '#dfe6f2';
  ctx.font = '15px sans-serif';
  lines.forEach((line, i) => {
    ctx.fillText(line, canvas.width / 2, y + 88 + i * 26);
  });
  ctx.restore();
}

function drawTitle(ctx, canvas) {
  ctx.save();
  ctx.fillStyle = '#0b0f1a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  // A decorative night skyline behind the title.
  ctx.fillStyle = '#131a2c';
  for (let i = 0; i < 14; i++) {
    const bw = 60 + ((i * 37) % 50);
    const bh = 90 + ((i * 53) % 130);
    ctx.fillRect(i * 70, canvas.height - bh, bw, bh);
  }
  ctx.fillStyle = '#ffd23e';
  ctx.beginPath();
  ctx.arc(canvas.width - 140, 110, 34, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f5b942';
  ctx.font = 'bold 54px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('NIGHT PARCEL', canvas.width / 2, 150);
  ctx.fillStyle = '#9ff5ec';
  ctx.font = '20px sans-serif';
  ctx.fillText('A stealth game about a courier, three parcels and a lot of watchmen', canvas.width / 2, 192);
  ctx.fillStyle = '#dfe6f2';
  ctx.font = '16px sans-serif';
  const lines = [
    'Collect every parcel, then slip out through the green EXIT gate — unseen.',
    'Guards patrol with vision cones. Stay out of the yellow light, or break',
    'line of sight until their suspicion fades. Tall grass hides you when you sneak.',
    'Running is loud. Click to throw a pebble and lure a guard away.',
    '',
    'WASD / arrows to move · hold Shift to sneak · click to throw a pebble',
    '',
    'Press Enter or click to begin',
  ];
  lines.forEach((line, i) => {
    ctx.fillText(line, canvas.width / 2, 250 + i * 26);
  });
  ctx.restore();
}

// --- The main draw ---

export function draw(ctx, canvas, state) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (state.phase === 'title') {
    drawTitle(ctx, canvas);
    return;
  }
  const { scale, ox, oy } = fitTransform(canvas);
  ctx.save();
  ctx.translate(ox, oy);
  ctx.scale(scale, scale);
  ctx.fillStyle = '#0b0f1a';
  ctx.fillRect(-ox / scale, -oy / scale, canvas.width / scale, canvas.height / scale);

  drawFloor(ctx, state.world);
  for (let row = 0; row < state.world.rows; row++) {
    for (let col = 0; col < state.world.cols; col++) {
      drawTile(ctx, state.world.tiles[row][col], col * TILE, row * TILE);
    }
  }
  for (const parcel of state.world.parcels) {
    if (!parcel.taken) drawParcel(ctx, parcel, state.time);
  }
  const exitOpen = state.world.parcels.every((p) => p.taken);
  drawExit(ctx, state.world.exit, exitOpen, state.time);
  drawPlayer(ctx, state.player, state.world, state.time);
  for (const guard of state.guards) drawGuard(ctx, guard, state.time);
  drawEffects(ctx, state.effects, state.time);
  drawDarkness(ctx, state.world, state.player, state.guards);
  ctx.restore();

  drawHud(ctx, canvas, state);

  if (state.phase === 'intro') {
    panel(ctx, canvas, state.level.name, [state.level.intro, '', 'Press Enter or click to start the level'], '#9ff5ec');
  } else if (state.phase === 'paused') {
    panel(ctx, canvas, 'PAUSED', ['Take a breath. The watchmen wait.', '', 'Press P to carry on · R to restart the level'], '#aeb8cc');
  } else if (state.phase === 'caught') {
    panel(ctx, canvas, 'CAUGHT!', ['A watchman grabbed your collar and the parcel is gone.', `Level ${state.levelIndex + 1}: ${state.level.name}`, '', 'Press R to try the level again'], '#ff5040');
  } else if (state.phase === 'levelclear') {
    panel(ctx, canvas, 'LEVEL CLEAR', [`${state.level.name} — all parcels delivered in ${fmtTime(state.levelTime)}`, `Ghost bonus: ${state.ghost ? 'never spotted — nice work' : 'spotted along the way'}`, '', 'Press Enter for the next level'], '#8cffaa');
  } else if (state.phase === 'win') {
    panel(ctx, canvas, 'ALL PARCELS DELIVERED', [
      'Pip slips out of the depot as the sun comes up. The Firefly Post delivers again.',
      `Total time ${fmtTime(state.time)} · ${state.ghost ? 'never spotted once' : 'spotted along the way'}`,
      '',
      'Press R to play again',
    ], '#ffd23e');
  }
}
