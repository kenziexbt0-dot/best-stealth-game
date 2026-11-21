// Night Parcel — the level map: tiles, collision and line of sight.
//
// This module never touches the DOM, so it can be unit-tested in Node.
// Everything is in pixels; a tile is TILE wide (see config.js).

import { TILE, COLS, ROWS } from './config.js';

// A tile blocks movement when it is a wall or a crate.
export function blocksMove(ch) {
  return ch === '#' || ch === 'C';
}

// A tile blocks sight when it is a wall or a crate.
export function blocksSight(ch) {
  return ch === '#' || ch === 'C';
}

// Tall grass hides a sneaking player.
export function isGrass(ch) {
  return ch === ',';
}

// Parse one level's map strings into the runtime world object.
export function buildWorld(level) {
  const tiles = level.map.map((row) => row.split(''));
  let start = { x: TILE * 1.5, y: TILE * 1.5 };
  let exit = { x: TILE * 1.5, y: TILE * 1.5 };
  const parcels = [];
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const ch = tiles[y][x];
      const cx = x * TILE + TILE / 2;
      const cy = y * TILE + TILE / 2;
      if (ch === 'P') start = { x: cx, y: cy };
      if (ch === 'E') exit = { x: cx, y: cy };
      if (ch === '*') parcels.push({ x: cx, y: cy, taken: false });
      // 'G' marks a guard spawn; the guard module reads the same strings.
    }
  }
  return { tiles, start, exit, parcels, cols: COLS, rows: ROWS };
}

export function tileAt(world, col, row) {
  if (col < 0 || row < 0 || col >= world.cols || row >= world.rows) return '#';
  return world.tiles[row][col];
}

// Circle-versus-tile collision: push a moving circle out of solid tiles.
// Returns the corrected position; the circle has radius r.
export function collide(world, x, y, r) {
  const minCol = Math.max(0, Math.floor((x - r) / TILE));
  const maxCol = Math.min(world.cols - 1, Math.floor((x + r) / TILE));
  const minRow = Math.max(0, Math.floor((y - r) / TILE));
  const maxRow = Math.min(world.rows - 1, Math.floor((y + r) / TILE));
  for (let row = minRow; row <= maxRow; row++) {
    for (let col = minCol; col <= maxCol; col++) {
      if (!blocksMove(world.tiles[row][col])) continue;
      const left = col * TILE;
      const right = left + TILE;
      const top = row * TILE;
      const bottom = top + TILE;
      const nx = Math.max(left, Math.min(x, right));
      const ny = Math.max(top, Math.min(y, bottom));
      const dx = x - nx;
      const dy = y - ny;
      const d2 = dx * dx + dy * dy;
      if (d2 >= r * r) continue;
      if (d2 === 0) {
        // Dead centre inside a tile: shove out along the smallest overlap.
        const pushLeft = x - left + r;
        const pushRight = right - x + r;
        const pushUp = y - top + r;
        const pushDown = bottom - y + r;
        const m = Math.min(pushLeft, pushRight, pushUp, pushDown);
        if (m === pushLeft) x = left - r;
        else if (m === pushRight) x = right + r;
        else if (m === pushUp) y = top - r;
        else y = bottom + r;
        continue;
      }
      const d = Math.sqrt(d2);
      x = nx + (dx / d) * r;
      y = ny + (dy / d) * r;
    }
  }
  // Never leave the map, even when shoved out of a corner tile.
  x = Math.max(r, Math.min(world.cols * TILE - r, x));
  y = Math.max(r, Math.min(world.rows * TILE - r, y));
  return { x, y };
}

// Line of sight between two points: true when no sight-blocking tile
// stands between them. Steps along the segment in small increments and
// checks the tile under each sample point.
export function hasLineOfSight(world, x0, y0, x1, y1) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const dist = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(dist / 6));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const px = x0 + dx * t;
    const py = y0 + dy * t;
    const col = Math.floor(px / TILE);
    const row = Math.floor(py / TILE);
    if (blocksSight(tileAt(world, col, row))) return false;
  }
  return true;
}

// Is the point inside tall grass?
export function inGrass(world, x, y) {
  const col = Math.floor(x / TILE);
  const row = Math.floor(y / TILE);
  return isGrass(tileAt(world, col, row));
}
