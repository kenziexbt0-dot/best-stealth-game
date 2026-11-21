// Night Parcel — Pip the courier: movement, sneaking, noise and pebbles.
//
// The player is a circle of radius 13. Walking is quick but loud enough
// for a nearby guard to hear; sneaking is slow and nearly silent and is
// the only way to stay hidden in tall grass. Clicking throws a pebble
// that lands with a clatter and pulls guards toward it — a lure, not a
// weapon. This module never touches the DOM, so Node can test it.

import {
  PLAYER_WALK,
  PLAYER_SNEAK,
  NOISE_RUN_RADIUS,
  NOISE_SNEAK_RADIUS,
  NOISE_PEBBLE_RADIUS,
  PEBBLES_PER_LEVEL,
} from './config.js';
import { collide } from './world.js';

export function createPlayer(start) {
  return {
    x: start.x,
    y: start.y,
    radius: 13,
    sneaking: false,
    moving: false,
    stepTimer: 0,
    pebbles: PEBBLES_PER_LEVEL,
    faceAngle: Math.PI / 2,
  };
}

// One simulation step. `move` is a normalised { x, y } vector, `sneaking`
// is the Shift key. Returns an array of event names: 'step' (the player's
// own footstep) and 'pebble' (a pebble was just thrown, with its landing
// point attached in the returned object).
export function updatePlayer(player, dt, world, move, sneaking, click) {
  const events = [];
  player.sneaking = sneaking;
  const speed = sneaking ? PLAYER_SNEAK : PLAYER_WALK;
  const mag = Math.hypot(move.x, move.y);
  player.moving = mag > 0.01;
  if (player.moving) {
    const nx = player.x + move.x * speed * dt;
    const ny = player.y + move.y * speed * dt;
    const fixed = collide(world, nx, ny, player.radius);
    player.x = fixed.x;
    player.y = fixed.y;
    player.faceAngle = Math.atan2(move.y, move.x);
    player.stepTimer -= dt;
    if (player.stepTimer <= 0) {
      player.stepTimer = sneaking ? 0.55 : 0.34;
      events.push({ type: 'step' });
    }
  } else {
    player.stepTimer = 0;
  }

  // A click throws a pebble at the clicked point (clamped to the map).
  // It lands with a noise guards investigate.
  if (click && player.pebbles > 0) {
    player.pebbles -= 1;
    const px = Math.max(0, Math.min(click.x, world.cols * 40 - 1));
    const py = Math.max(0, Math.min(click.y, world.rows * 40 - 1));
    events.push({ type: 'pebble', x: px, y: py, radius: NOISE_PEBBLE_RADIUS });
  }
  return events;
}

// The noise this player makes right now, for guards to hear: a running
// player is loud, a sneaking one almost silent.
export function playerNoise(player) {
  if (!player.moving) return null;
  return {
    x: player.x,
    y: player.y,
    radius: player.sneaking ? NOISE_SNEAK_RADIUS : NOISE_RUN_RADIUS,
  };
}
