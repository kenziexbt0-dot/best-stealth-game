[![make.fun](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/c/best-stealth-game-20261121-1759)
[![rank](https://make.fun/badge/best-stealth-game-20261121-1759/kenziexbt0-dot/best-stealth-game/rank.svg)](https://make.fun/c/best-stealth-game-20261121-1759)
[![reward](https://make.fun/badge/best-stealth-game-20261121-1759/kenziexbt0-dot/best-stealth-game/reward.svg)](https://make.fun/c/best-stealth-game-20261121-1759)

# Night Parcel — a stealth game

You are Pip, a night courier for the Firefly Post. Collect every parcel in the depot and slip out through the green EXIT gate — unseen.

## How to play

- **WASD / arrow keys** — move
- **Hold Shift** — sneak (slow, quiet, hidden in tall grass)
- **Click** — throw a pebble to lure a guard away (3 per level)
- **M** — mute · **P** — pause · **R** — restart the level

Guards patrol with vision cones. When one sees you, its suspicion climbs; break line of sight and it fades. At full suspicion the alarm goes up and the guards chase you — if one reaches you, you are caught. Running is loud: a nearby guard hears it and comes to look. Three levels, from the Depot Yard to the Vault Court.

## Play it

No build step, no network. Serve `game/` with any static server and open `game/index.html`:

```sh
node serve.ts
# then open http://localhost:8080
```

## Files

- `game/` — the game itself: `index.html` plus ES modules under `game/src/`
  - `config.js` — tuning and the three levels
  - `world.js` — map, collision, line of sight
  - `guards.js` — patrol, vision, suspicion, alarm, chase
  - `player.js` — movement, sneaking, pebbles
  - `render.js` — canvas drawing, lighting, HUD, screens
  - `audio.js` — synthesised WebAudio sounds (footsteps tell you where guards are)
  - `shots.js` — deterministic screenshot poses (`?shot=start|play|alarm|win`)
  - `main.js` — game loop and phases
- `main.ts` — the entry program: copies `game/` and `screenshots/` to `/output` and writes `dossier.json`
- `screenshots/` — 3–4 screenshots of the game, taken from its own code in a browser
- `shots.json` — the screenshot poses

## License

MIT — see [LICENSE](LICENSE).
