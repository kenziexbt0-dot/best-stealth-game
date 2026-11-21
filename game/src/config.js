// Night Parcel — tuning constants and the three levels.
//
// Tile legend used by every level map string:
//   '#' wall (blocks movement and sight)
//   'C' crate (blocks movement and sight, lower than a wall)
//   ',' tall grass (hides a sneaking player; guards cannot see into it)
//   '.' open floor
//   'P' where Pip the courier starts
//   'E' the exit gate (opens once every parcel is collected)
//   '*' a parcel to collect
//   'G' a guard spawn point (patrols are listed per level below)

export const TILE = 40;
export const VIEW_W = 960;
export const VIEW_H = 600;
export const COLS = 24;
export const ROWS = 15;

// Movement speeds are pixels per second.
export const PLAYER_WALK = 150;
export const PLAYER_SNEAK = 85;
export const GUARD_PATROL = 62;
export const GUARD_CHASE = 132;
export const GUARD_SEARCH = 78;

// How far a guard can see, and how wide its cone is (half-angle).
export const VISION_RANGE = 185;
export const VISION_HALF_ANGLE = 0.62; // radians, about 35 degrees

// Suspicion runs 0..100. It climbs while the player is seen and falls
// while hidden; at 100 the guard raises the alarm.
export const SUSPICION_RISE_NEAR = 95; // per second, player close
export const SUSPICION_RISE_FAR = 42; // per second, player far away
export const SUSPICION_FALL = 26; // per second while unseen
export const ALARM_HOLD = 4.0; // seconds a guard keeps chasing after losing sight
export const SEARCH_TIME = 6.0; // seconds a guard searches the last seen spot

// Noise: running is loud, sneaking is silent, a thrown pebble is a lure.
export const NOISE_RUN_RADIUS = 150;
export const NOISE_SNEAK_RADIUS = 26;
export const NOISE_PEBBLE_RADIUS = 190;
export const PEBBLES_PER_LEVEL = 3;

// A guard standing this close spots a player even inside tall grass.
export const GRASS_SPOT_RANGE = 34;
// Being caught needs a guard to actually reach the player.
export const CATCH_RANGE = 24;

export const LEVELS = [
  {
    name: 'Depot Yard',
    intro: 'Night one. Two parcels wait in the yard. Slip past the watchmen and reach the gate.',
    map: [
      '########################',
      '#P....,......#.....*...#',
      '#......##....#....##...#',
      '#..C.......,......G....#',
      '#..##...####....##.....#',
      '#......#......,........#',
      '#..*...#...##.....##...#',
      '#......#...#..C........#',
      '####...#...#..##...#...#',
      '#......,.......#..#.*..#',
      '#..##......##..#..#....#',
      '#......#......,....G...#',
      '#..C...#..####....##...#',
      '#......,......#........#',
      '#..........E...........#',
    ],
    guards: [
      { spawn: [18, 3], patrol: [[18, 3], [20, 3], [20, 7], [15, 7], [15, 3]], wait: 1.2 },
      { spawn: [19, 11], patrol: [[19, 11], [17, 11], [17, 13], [15, 13], [15, 11]], wait: 1.0 },
    ],
  },
  {
    name: 'Warehouse Rows',
    intro: 'Three parcels between the shelves. The patrols cross here — watch the cones, not the men.',
    map: [
      '########################',
      '#P...#......,....#..*..#',
      '#....#..##......#......#',
      '#.C..#..#...C...#..G...#',
      '#....#..#.......#......#',
      '#....,.....##....,.....#',
      '###.####...#....####...#',
      '#..*....#..#..C....#...#',
      '#....##.#..#.......#..G#',
      '#....#..#..#..##...#...#',
      '#.C..#.....#......,....#',
      '#....#..##..#..####....#',
      '#....#......#......#.*.#',
      '#..,.#..C...#..G.......#',
      '#..........E...........#',
    ],
    guards: [
      { spawn: [19, 3], patrol: [[19, 3], [19, 5], [17, 5], [17, 3]], wait: 0.9 },
      { spawn: [22, 8], patrol: [[22, 8], [22, 11], [20, 11], [20, 8]], wait: 1.4 },
      { spawn: [15, 13], patrol: [[15, 13], [21, 13]], wait: 1.1 },
    ],
  },
  {
    name: 'The Vault Court',
    intro: 'Last run. Three parcels, four watchmen, one gate. Stay in the dark and be patient.',
    map: [
      '########################',
      '#P....,.....#.....*....#',
      '#..##......#.....##..G.#',
      '#......C...#..C........#',
      '#..####....#.....####..#',
      '#......,.......,.......#',
      '##..######..#######..###',
      '#..*....#........#..*..#',
      '#....G..#...C....#.....#',
      '#.......#........#..G..#',
      '#..##...#...##...#.....#',
      '#......,....#....,.....#',
      '#..C....##..#..##...#..#',
      '#....G.......#.....#...#',
      '#..........E...........#',
    ],
    guards: [
      { spawn: [21, 2], patrol: [[21, 2], [21, 5], [22, 5], [22, 2]], wait: 0.8 },
      { spawn: [5, 8], patrol: [[5, 8], [5, 11], [7, 11], [7, 8]], wait: 1.0 },
      { spawn: [20, 9], patrol: [[20, 9], [20, 11], [18, 11], [18, 9]], wait: 1.2 },
      { spawn: [5, 13], patrol: [[5, 13], [5, 11], [7, 11], [7, 13]], wait: 0.9 },
    ],
  },
];

// Par values shown on the win screen, in seconds per level.
export const LEVEL_PAR = [75, 110, 150];
