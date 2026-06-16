# Cavesweat

Standalone cave exploration game extracted from [Deepiri Lyback](../README.md). Fork it, edit `world.json`, and run your own version — no code changes required.

Lyback stays the wallpaper editor. Cavesweat is the game.

## Quick start

From the repo root:

```bash
cd cavesweat
npm install   # pulls serve (via npx on first start)
npm start
```

Open **http://localhost:3456/cavesweat/** in your browser.

Or from the repo root:

```bash
npm run cavesweat
```

## Customize your world

Edit **`world.json`** — every section maps directly to gameplay:

| Section | What it controls |
|---------|------------------|
| `world` | Map size, surface height |
| `physics` | Gravity, jump force, move speed |
| `entities` | Platforms, portals, creatures, chests, crystals, particles, shovels, sticks |
| `caves` | Enable/disable caves, entrance count, tunnel size, sealed loot pockets, lava depth |
| `heaven` | Cloud sky layer, freeze rate, ascent/cloud platform counts, trees |
| `survival` | Run sweat multiplier, surface idle sweat, deep idle sweat |
| `visuals` | Sky, ground, player color, palette |
| `environment` | Biome, weather, time of day |

Validate before playing:

```bash
npm run validate
```

Try a preset:

```
http://localhost:3456/cavesweat/?config=presets/deep-caves.json
```

Add `&menu=1` to show the play button instead of auto-starting.

## Fork and ship your own game

1. Fork this repo (or copy the `cavesweat/` folder)
2. Rename `world.json` fields `name` / `description`
3. Tweak numbers until it feels right
4. Share the repo — others run `npm start`

The engine lives in `../src/interactive-background/world-engine.js`. Cavesweat loads it at runtime so you get engine updates without duplicating code.

## Controls

- **WASD / Arrows** — move
- **Space** — jump (double jump in air; **↑** or **W** also jump)
- **E** — interact with portals / chests
- **F** — dig (pick up a shovel first)
- **R** — hold to rub sticks together (need 2 sticks; 10 seconds starts a fire)
- **M** — toggle minimap
- **Esc** — settings (reset world, pause)

## Survival

- **Sweat** — running makes you sweat more; standing still on the surface barely drains water; deep underground (near lava) heats you even when idle
- **Heaven** — climb ascent platforms high enough to reach the cloud layer; the water bar becomes a freeze bar
- **Sticks** — pick up sticks on the surface and in caves; hold **R** with 2+ sticks for 10 seconds to start a fire and thaw out
- **Shovels** — scattered on the surface near cave entrances and inside cave chambers
- **Wall kick** — in air, touch a cave wall to grab and slide; press **Space** to kick off and climb out

## Project layout

```
cavesweat/
├── world.json       ← edit this
├── config.js        ← maps JSON → engine defaults
├── index.html       ← player / launcher
├── validate.js      ← config checker
├── presets/         ← example worlds
└── package.json
```
