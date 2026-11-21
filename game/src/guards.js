// Night Parcel — the guards: patrol, vision cones, suspicion and alarm.
//
// A guard is a small state machine:
//   patrol     walk the waypoints, pausing at each one
//   investigate walk to a noise (a pebble, running feet) and look around
//   chase      the alarm is up: run at the player
//   search     the player slipped away: check the last seen spot, then give up
//   return     walk back to the nearest patrol waypoint
// Suspicion is a 0..100 meter. It climbs while the player is seen and
// falls while hidden, so a near miss raises the alarm without ending the
// run at once. This module never touches the DOM, so Node can test it.

import {
  TILE,
  VISION_RANGE,
  VISION_HALF_ANGLE,
  GUARD_PATROL,
  GUARD_CHASE,
  GUARD_SEARCH,
  SUSPICION_RISE_NEAR,
  SUSPICION_RISE_FAR,
  SUSPICION_FALL,
  ALARM_HOLD,
  SEARCH_TIME,
  GRASS_SPOT_RANGE,
  CATCH_RANGE,
} from './config.js';
import { collide, hasLineOfSight, inGrass } from './world.js';

export function createGuard(def) {
  const start = {
    x: def.spawn[0] * TILE + TILE / 2,
    y: def.spawn[1] * TILE + TILE / 2,
  };
  const waypoints = def.patrol.map(([tx, ty]) => ({
    x: tx * TILE + TILE / 2,
    y: ty * TILE + TILE / 2,
  }));
  return {
    x: start.x,
    y: start.y,
    angle: Math.PI / 2, // facing down the map at spawn
    state: 'patrol',
    waypointIndex: 1 % waypoints.length,
    waitTimer: def.wait ?? 1,
    suspicion: 0,
    lastSeen: null,
    alarmTimer: 0,
    searchTimer: 0,
    stepTimer: 0,
    moving: false,
    waypoints,
    waitAtWaypoint: def.wait ?? 1,
  };
}

// Can this guard see the player right now? Distance, cone angle, a clear
// line of sight, and tall grass all matter.
export function canSee(guard, world, player) {
  const dx = player.x - guard.x;
  const dy = player.y - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist > VISION_RANGE) return false;
  // Inside tall grass a sneaking player is invisible unless very close.
  if (player.sneaking && inGrass(world, player.x, player.y) && dist > GRASS_SPOT_RANGE) return false;
  // Straight ahead counts even at the edge of the cone when very close.
  if (dist < GRASS_SPOT_RANGE) return hasLineOfSight(world, guard.x, guard.y, player.x, player.y);
  let diff = Math.atan2(dy, dx) - guard.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  if (Math.abs(diff) > VISION_HALF_ANGLE) return false;
  return hasLineOfSight(world, guard.x, guard.y, player.x, player.y);
}

// How fast suspicion climbs depends on how close the player is.
export function suspicionRate(guard, player) {
  const dist = Math.hypot(player.x - guard.x, player.y - guard.y);
  const near = dist < VISION_RANGE * 0.45;
  let rate = near ? SUSPICION_RISE_NEAR : SUSPICION_RISE_FAR;
  if (!player.sneaking) rate *= 1.5; // running in the open is reckless
  return rate;
}

function moveToward(guard, world, tx, ty, speed, dt) {
  const dx = tx - guard.x;
  const dy = ty - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 2) return true;
  const step = Math.min(dist, speed * dt);
  const nx = guard.x + (dx / dist) * step;
  const ny = guard.y + (dy / dist) * step;
  const fixed = collide(world, nx, ny, 13);
  const movedX = fixed.x - guard.x;
  const movedY = fixed.y - guard.y;
  guard.x = fixed.x;
  guard.y = fixed.y;
  guard.moving = Math.hypot(movedX, movedY) > 0.01;
  if (guard.moving) guard.angle = Math.atan2(movedY, movedX);
  // Stuck against a wall counts as arrived, so a guard never wedges itself.
  const blocked = Math.hypot(movedX, movedY) < step * 0.25;
  return dist <= step + 1 || blocked;
}

function nearestWaypointIndex(guard) {
  let best = 0;
  let bestDist = Infinity;
  guard.waypoints.forEach((wp, i) => {
    const d = Math.hypot(wp.x - guard.x, wp.y - guard.y);
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  });
  return best;
}

// One simulation step. `noise` is { x, y, radius } or null. Returns an
// array of event names for the game to turn into sound and UI:
// 'step' (a footstep — the game pans it), 'spotted' (suspicion crossed
// 50), 'alarm' (suspicion hit 100), 'lost' (the alarm cooled off),
// 'caught' (the guard reached the player).
export function updateGuard(guard, dt, world, player, noise) {
  const events = [];
  const seen = canSee(guard, world, player);

  if (seen) {
    const before = guard.suspicion;
    guard.suspicion = Math.min(100, guard.suspicion + suspicionRate(guard, player) * dt);
    guard.lastSeen = { x: player.x, y: player.y };
    if (before < 50 && guard.suspicion >= 50) events.push('spotted');
    if (guard.suspicion >= 100 && guard.state !== 'chase') {
      guard.state = 'chase';
      guard.alarmTimer = ALARM_HOLD;
      events.push('alarm');
    }
  } else {
    guard.suspicion = Math.max(0, guard.suspicion - SUSPICION_FALL * dt);
  }

  // A noise the guard can hear pulls it off patrol to investigate.
  if (noise && guard.state !== 'chase') {
    const d = Math.hypot(noise.x - guard.x, noise.y - guard.y);
    if (d < noise.radius) {
      guard.state = 'investigate';
      guard.lastSeen = { x: noise.x, y: noise.y };
    }
  }

  guard.moving = false;
  switch (guard.state) {
    case 'patrol': {
      if (guard.waitTimer > 0) {
        guard.waitTimer -= dt;
        break;
      }
      const wp = guard.waypoints[guard.waypointIndex];
      if (moveToward(guard, world, wp.x, wp.y, GUARD_PATROL, dt)) {
        guard.waypointIndex = (guard.waypointIndex + 1) % guard.waypoints.length;
        guard.waitTimer = guard.waitAtWaypoint;
      }
      break;
    }
    case 'investigate': {
      const target = guard.lastSeen;
      if (target && moveToward(guard, world, target.x, target.y, GUARD_SEARCH, dt)) {
        // Arrived: look around for a while, then head back to patrol.
        guard.searchTimer = SEARCH_TIME * 0.6;
        guard.state = 'search';
      }
      break;
    }
    case 'chase': {
      if (seen) {
        guard.alarmTimer = ALARM_HOLD;
      } else {
        guard.alarmTimer -= dt;
      }
      const target = seen ? { x: player.x, y: player.y } : guard.lastSeen;
      if (target) moveToward(guard, world, target.x, target.y, GUARD_CHASE, dt);
      if (guard.alarmTimer <= 0) {
        guard.state = 'search';
        guard.searchTimer = SEARCH_TIME;
        events.push('lost');
      }
      break;
    }
    case 'search': {
      guard.searchTimer -= dt;
      // Slowly sweep the view around while searching.
      guard.angle += dt * 0.9;
      if (guard.searchTimer <= 0) {
        guard.state = 'return';
        guard.waypointIndex = nearestWaypointIndex(guard);
      }
      break;
    }
    case 'return': {
      const wp = guard.waypoints[guard.waypointIndex];
      if (moveToward(guard, world, wp.x, wp.y, GUARD_PATROL, dt)) {
        guard.state = 'patrol';
        guard.waitTimer = guard.waitAtWaypoint;
      }
      break;
    }
    default:
      guard.state = 'patrol';
  }

  // Footsteps: quicker when chasing, slower on patrol.
  if (guard.moving) {
    guard.stepTimer -= dt;
    if (guard.stepTimer <= 0) {
      guard.stepTimer = guard.state === 'chase' ? 0.32 : 0.48;
      events.push('step');
    }
  } else {
    guard.stepTimer = 0;
  }

  // Caught: the guard reached the player.
  if (Math.hypot(player.x - guard.x, player.y - guard.y) < CATCH_RANGE) {
    events.push('caught');
  }
  return events;
}
