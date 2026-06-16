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
| `entities` | Platforms, portals, creatures, chests, crystals, particles |
| `caves` | Enable/disable caves, entrance count, tunnel size, sealed loot pockets, lava depth |
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
- **Space** — jump (double jump in air)
- **E** — interact with portals / chests
- **F** — dig (pick up a shovel first)
- **M** — toggle minimap

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
