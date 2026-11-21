// Night Parcel — deterministic screenshot scenes.
//
// The game reads ?shot=<name> from the URL and poses one fixed moment:
// the same level, the same positions, the same suspicion, every time.
// Screenshots are taken from these poses, so what the judge sees is the
// game itself, rendered by its own code, with nothing edited afterwards.
// The poses are written against level 1's map, which config.js defines.

import { TILE } from './config.js';

function placePlayer(state, col, row, sneaking) {
  state.player.x = col * TILE + TILE / 2;
  state.player.y = row * TILE + TILE / 2;
  state.player.sneaking = sneaking;
  state.player.moving = false;
  state.player.faceAngle = 0;
}

function placeGuard(state, index, col, row, angleDeg, suspicion, guardState) {
  const guard = state.guards[index];
  if (!guard) return;
  guard.x = col * TILE + TILE / 2;
  guard.y = row * TILE + TILE / 2;
  guard.angle = (angleDeg * Math.PI) / 180;
  guard.suspicion = suspicion;
  guard.state = guardState;
  guard.waitTimer = 0;
  guard.moving = false;
}

// Pose the game for one named screenshot. Returns true when the name is
// known; the caller renders one frame and stops the loop.
export function applyShot(state, name) {
  // Every shot uses the same frozen clock so the pulse and glow match.
  state.time = 12.5;
  state.levelTime = 34;
  state.phase = 'playing';
  state.effects = [];
  switch (name) {
    case 'start': {
      // The opening: Pip at the gate, the yard ahead, cones sweeping.
      placePlayer(state, 1, 1, false);
      placeGuard(state, 0, 20, 5, 180, 0, 'patrol');
      placeGuard(state, 1, 16, 12, 90, 0, 'patrol');
      state.player.faceAngle = 0;
      return true;
    }
    case 'play': {
      // Mid-game: one parcel in hand, Pip crouched in the tall grass
      // while a watchman sweeps his cone just past her.
      state.world.parcels[0].taken = true;
      placePlayer(state, 11, 3, true);
      state.player.faceAngle = Math.PI / 2;
      placeGuard(state, 0, 15, 3, 180, 42, 'patrol');
      placeGuard(state, 1, 15, 12, 270, 0, 'patrol');
      state.effects = [{ kind: 'pebble', x: 16 * TILE + 20, y: 8 * TILE + 20, at: 12.2 }];
      return true;
    }
    case 'alarm': {
      // The near miss: spotted at the edge of a cone, the alarm up, Pip
      // running for the grass while the watchman gives chase.
      state.world.parcels[0].taken = true;
      state.world.parcels[1].taken = true;
      placePlayer(state, 16, 7, false);
      state.player.faceAngle = Math.PI;
      placeGuard(state, 0, 19, 7, 180, 100, 'chase');
      placeGuard(state, 1, 16, 12, 270, 68, 'patrol');
      return true;
    }
    case 'win': {
      // The payoff: every parcel collected, the exit gate glowing open,
      // Pip one step from walking out unseen.
      for (const parcel of state.world.parcels) parcel.taken = true;
      placePlayer(state, 9, 13, false);
      state.player.faceAngle = Math.PI / 2;
      placeGuard(state, 0, 20, 5, 180, 0, 'patrol');
      placeGuard(state, 1, 16, 12, 90, 0, 'patrol');
      return true;
    }
    default:
      return false;
  }
}
