const InteractiveWorld = (() => {
  const DEFAULTS = (typeof DEEPIRI_DEFAULTS !== 'undefined') ? DEEPIRI_DEFAULTS : {};

  const CFG = {
    WORLD_WIDTH: DEFAULTS.WORLD_WIDTH || 5000,
    WORLD_HEIGHT: DEFAULTS.WORLD_HEIGHT || 1500,
    SURFACE_BASE: DEFAULTS.WORLD_SURFACE_BASE || 350,
    GRAVITY: DEFAULTS.WORLD_GRAVITY ?? 0.55,
    JUMP_FORCE: DEFAULTS.WORLD_JUMP_FORCE ?? -11,
    MOVE_SPEED: DEFAULTS.WORLD_MOVE_SPEED ?? 4.5,
    MAX_FALL_SPEED: 14,
    WALL_KICK_SPEED: 6.5,
    WALL_SLIDE_SPEED: 2.8,
    WALL_GRAB_FRAMES: 40,
    WALL_JUMP_IGNORE_FRAMES: 12,
    COYOTE_FRAMES: 12,
    JUMP_BUFFER_FRAMES: 10,
    DOUBLE_JUMP_MULT: 0.95,
    PLAYER_W: 18,
    PLAYER_H: 28,
    PLATFORM_COUNT: DEFAULTS.WORLD_PLATFORM_COUNT || 10,
    PORTAL_COUNT: DEFAULTS.WORLD_PORTAL_COUNT || 6,
    PARTICLE_COUNT: DEFAULTS.WORLD_PARTICLE_COUNT || 60,
    CREATURE_COUNT: DEFAULTS.WORLD_CREATURE_COUNT || 15,
    CHEST_COUNT: DEFAULTS.WORLD_CHEST_COUNT || 5,
    CRYSTAL_COUNT: DEFAULTS.WORLD_CRYSTAL_COUNT || 8,
    COLORS: DEFAULTS.DEFAULT_COLORS || ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', '#dfe6e9'],
    SKY_TOP: DEFAULTS.WORLD_SKY_TOP || '#0a0a1a',
    SKY_BOTTOM: DEFAULTS.WORLD_SKY_BOTTOM || '#1a2a3e',
    GROUND_TOP: DEFAULTS.WORLD_GROUND_TOP || '#3a7d5a',
    GROUND_BOTTOM: DEFAULTS.WORLD_GROUND_BOTTOM || '#1a0a0a',
    PLAYER_COLOR: DEFAULTS.WORLD_PLAYER_COLOR || '#4ecdc4',
    HEAVEN_ENABLED: DEFAULTS.WORLD_HEAVEN_ENABLED === true,
    HEAVEN_SKY_START: DEFAULTS.WORLD_HEAVEN_SKY_START ?? DEFAULTS.WORLD_HEAVEN_ALTITUDE ?? 180,
    HEAVEN_SKY_CLIMB: DEFAULTS.WORLD_HEAVEN_SKY_CLIMB ?? DEFAULTS.WORLD_HEAVEN_SKY_HEIGHT ?? 1050,
    HEAVEN_REALM_ALTITUDE: DEFAULTS.WORLD_HEAVEN_REALM_ALTITUDE ?? 2600,
    HEAVEN_REALM_DEPTH: DEFAULTS.WORLD_HEAVEN_REALM_DEPTH ?? 360,
    HEAVEN_ASCENT_PLATFORMS: DEFAULTS.WORLD_HEAVEN_ASCENT_PLATFORMS ?? 28,
    HEAVEN_CLOUD_PLATFORMS: DEFAULTS.WORLD_HEAVEN_CLOUD_PLATFORMS ?? 0,
    HEAVEN_LAYERS: DEFAULTS.WORLD_HEAVEN_LAYERS ?? 6,
    HEAVEN_TREES: DEFAULTS.WORLD_HEAVEN_TREES ?? 10,
    HEAVEN_PROPS: DEFAULTS.WORLD_HEAVEN_PROPS ?? 28,
    HEAVEN_CHESTS: DEFAULTS.WORLD_HEAVEN_CHESTS ?? 6,
    HEAVEN_CRYSTALS: DEFAULTS.WORLD_HEAVEN_CRYSTALS ?? 10,
    HEAVEN_ITEMS: DEFAULTS.WORLD_HEAVEN_ITEMS ?? 24,
    HEAVEN_CREATURES: DEFAULTS.WORLD_HEAVEN_CREATURES ?? 10,
    HEAVEN_FREEZE_RATE: DEFAULTS.WORLD_HEAVEN_FREEZE_RATE ?? 0.12,
    ASCENT_STEP_Y: 46,
    SURVIVAL_RUN_SWEAT_MULT: DEFAULTS.WORLD_SURVIVAL_RUN_SWEAT_MULT ?? 1.8,
    SURVIVAL_SURFACE_IDLE_SWEAT: DEFAULTS.WORLD_SURVIVAL_SURFACE_IDLE_SWEAT ?? 0.015,
    SURVIVAL_IDLE_DEEP_MULT: DEFAULTS.WORLD_SURVIVAL_IDLE_DEEP_MULT ?? 0.65,
    SHOVELS_SURFACE: DEFAULTS.WORLD_SHOVELS_SURFACE ?? 12,
    SHOVELS_CAVE: DEFAULTS.WORLD_SHOVELS_CAVE ?? 8,
    CELESTIAL_SHOVELS: DEFAULTS.WORLD_CELESTIAL_SHOVELS ?? 1,
    STICKS_SURFACE: DEFAULTS.WORLD_STICKS_SURFACE ?? 16,
    STICKS_CAVE: DEFAULTS.WORLD_STICKS_CAVE ?? 12,
    FIRE_STICKS_REQUIRED: DEFAULTS.WORLD_FIRE_STICKS_REQUIRED ?? 6,
    FIRE_SWEAT_MULT: DEFAULTS.WORLD_FIRE_SWEAT_MULT ?? 2.5,
    FIRE_SWEAT_MIN: DEFAULTS.WORLD_FIRE_SWEAT_MIN ?? 0.08,
    FIRE_WARM_RADIUS: 60,
    RUB_FRAMES: 600
  };

  const SEGMENTS = 250;

  function generateTerrain(w) {
    const h = new Float32Array(SEGMENTS + 1);
    for (let i = 0; i <= SEGMENTS; i++) {
      const x = (i / SEGMENTS) * w;
      let height = 0;
      height += Math.sin(x * 0.0018) * 130;
      height += Math.sin(x * 0.0045) * 65;
      height += Math.sin(x * 0.009) * 30;
      height += Math.sin(x * 0.022) * 12;
      h[i] = CFG.SURFACE_BASE + height;
    }
    return h;
  }

  function getTerrainY(heights, x) {
    const segW = CFG.WORLD_WIDTH / SEGMENTS;
    const idx = Math.floor(x / segW);
    const t = (x / segW) - idx;
    const i0 = Math.max(0, Math.min(idx, SEGMENTS));
    const i1 = Math.max(0, Math.min(idx + 1, SEGMENTS));
    return heights[i0] + (heights[i1] - heights[i0]) * t;
  }

  function getBiome(x) {
    const t = x / CFG.WORLD_WIDTH;
    if (t < 0.25) return { name: 'forest', grass: '#4a9e6b', dirt: '#3a7d5a', ground: '#2d6b4a', accent: '#6abf4a' };
    if (t < 0.5) return { name: 'desert', grass: '#c4a65a', dirt: '#a08040', ground: '#8a6e30', accent: '#d4b66a' };
    if (t < 0.75) return { name: 'tundra', grass: '#8ab0c4', dirt: '#6a8a9e', ground: '#5a7a8e', accent: '#aac4d4' };
    return { name: 'plains', grass: '#5aaa6b', dirt: '#4a8a5a', ground: '#3a7a4a', accent: '#7aca8b' };
  }

  const HEAVEN_BIOME = {
    name: 'heaven',
    grass: '#f0f8ff',
    dirt: '#dceeff',
    ground: '#c8e0ff',
    accent: '#ffd479'
  };

  // Bottom lip of the sky-climb cloud parkour (not the heaven realm itself).
  function skyBaseAt(heights, x) {
    return getTerrainY(heights, x) - CFG.HEAVEN_SKY_START;
  }

  function generateHeavenTerrain(surfaceHeights) {
    const h = new Float32Array(SEGMENTS + 1);
    const refSurf = getTerrainY(surfaceHeights, CFG.WORLD_WIDTH * 0.5);
    const heavenY = refSurf - CFG.HEAVEN_REALM_ALTITUDE;
    for (let i = 0; i <= SEGMENTS; i++) {
      h[i] = heavenY;
    }
    return h;
  }

  function getHeavenGroundY(heavenHeights, x) {
    if (!heavenHeights) return Infinity;
    return getTerrainY(heavenHeights, x);
  }

  function getBiomeAt(x, y, heights, heavenHeights) {
    if (heavenHeights) {
      const hgY = getHeavenGroundY(heavenHeights, x);
      if (y + CFG.PLAYER_H * 0.5 < hgY + 28) return HEAVEN_BIOME;
    }
    return getBiome(x);
  }

  function addCloudPlatform(platforms, x, y, w) {
    platforms.push({
      x, y, w, h: 14,
      color: 'rgba(255,255,255,0.9)', kind: 'cloud',
      bob: Math.random() * Math.PI * 2,
      bobAmp: 1.5 + Math.random() * 3
    });
  }

  function generatePlatforms(heights) {
    const platforms = [];
    for (let i = 0; i < CFG.PLATFORM_COUNT; i++) {
      let x, y, w, a = 0;
      do {
        x = 300 + Math.random() * (CFG.WORLD_WIDTH - 600);
        y = getTerrainY(heights, x) - 100 - Math.random() * 200;
        w = 70 + Math.random() * 90;
        a++;
      } while (a < 30 && y > CFG.WORLD_HEIGHT - 100);
      const biome = getBiome(x);
      platforms.push({ x, y, w, h: 12, color: biome.accent, kind: 'solid' });
    }
    return platforms;
  }

  // Stepping-stone tower from the surface up to the first sky-climb clouds.
  function buildAscentTower(platforms, heights, towerX) {
    const surf = getTerrainY(heights, towerX);
    const biome = getBiome(towerX);
    const skyLine = skyBaseAt(heights, towerX);
    const goalY = skyLine + 45;
    const startY = surf - 10;
    const stepY = CFG.ASCENT_STEP_Y;
    const steps = Math.max(5, Math.ceil((startY - goalY) / stepY));
    let px = towerX;

    platforms.push({
      x: px - 52, y: startY, w: 104, h: 12,
      color: biome.accent, kind: 'solid'
    });

    for (let i = 1; i <= steps; i++) {
      const py = Math.max(goalY, startY - i * stepY);
      px += (i % 2 === 0 ? 1 : -1) * (24 + Math.random() * 22);
      platforms.push({
        x: px - 42, y: py, w: 84 + Math.random() * 28, h: 12,
        color: biome.accent, kind: 'solid'
      });
      if (py <= goalY) break;
    }

    platforms.push({
      x: px - 58, y: goalY - 22, w: 116, h: 14,
      color: 'rgba(255,255,255,0.9)', kind: 'cloud',
      bob: Math.random() * Math.PI * 2, bobAmp: 2
    });
  }

  // Stepping-stone platforms between ground and the sky-climb cloud layer.
  function generateAscentPlatforms(heights, entrances) {
    if (!CFG.HEAVEN_ENABLED) return [];
    const platforms = [];
    const spots = entrances && entrances.length
      ? entrances.slice()
      : [CFG.WORLD_WIDTH * 0.15, CFG.WORLD_WIDTH * 0.4, CFG.WORLD_WIDTH * 0.65, CFG.WORLD_WIDTH * 0.85];

    for (const ex of spots) {
      buildAscentTower(platforms, heights, ex - 110);
      buildAscentTower(platforms, heights, ex + 90);
    }
    for (const frac of [0.28, 0.52, 0.76]) {
      buildAscentTower(platforms, heights, CFG.WORLD_WIDTH * frac + (Math.random() - 0.5) * 160);
    }

    while (platforms.length < CFG.HEAVEN_ASCENT_PLATFORMS) {
      const x = 250 + Math.random() * (CFG.WORLD_WIDTH - 500);
      const surf = getTerrainY(heights, x);
      const skyLine = skyBaseAt(heights, x);
      const y = surf - 80 - Math.random() * (surf - skyLine - 100);
      if (y < skyLine + 30) break;
      platforms.push({
        x: x - 35, y, w: 70 + Math.random() * 40, h: 12,
        color: getBiome(x).accent, kind: 'solid'
      });
    }
    return platforms.slice(0, CFG.HEAVEN_ASCENT_PLATFORMS);
  }

  // Cloud parkour through the sky — approach route only, not the heaven realm.
  function generateCloudPlatforms(heights, heavenHeights) {
    if (!CFG.HEAVEN_ENABLED) return [];
    const platforms = [];
    const layers = Math.min(7, Math.max(4, CFG.HEAVEN_LAYERS));
    const climbDepth = CFG.HEAVEN_SKY_CLIMB;
    const layerStep = climbDepth / layers;
    const segCount = Math.max(5, Math.floor(CFG.WORLD_WIDTH / 720));
    const maxClouds = CFG.HEAVEN_CLOUD_PLATFORMS > 0
      ? CFG.HEAVEN_CLOUD_PLATFORMS
      : Math.min(58, layers * 5 + 8);

    for (let layer = 0; layer < layers && platforms.length < maxClouds; layer++) {
      const drop = 48 + layer * layerStep;
      if (drop > climbDepth - 50) break;
      const stagger = (layer % 2) * 0.5;
      for (let s = 0; s < segCount && platforms.length < maxClouds; s++) {
        const cx = (s + stagger + 0.5) * (CFG.WORLD_WIDTH / segCount) + (Math.random() - 0.5) * 55;
        const py = skyBaseAt(heights, cx) - drop - (Math.random() - 0.5) * 16;
        const w = 110 + Math.random() * 50;
        addCloudPlatform(platforms, cx - w / 2, py, w);
      }
    }

    const ladderCount = Math.max(3, Math.floor(segCount / 2));
    for (let i = 0; i < ladderCount && platforms.length < maxClouds; i++) {
      const lx = 300 + i * ((CFG.WORLD_WIDTH - 600) / Math.max(1, ladderCount - 1));
      let py = skyBaseAt(heights, lx) - 42;
      for (let layer = 0; layer < layers && platforms.length < maxClouds; layer += 2) {
        const w = 94 + Math.random() * 26;
        const ox = (layer % 4 === 0 ? -1 : 1) * (30 + Math.random() * 12);
        addCloudPlatform(platforms, lx - w / 2 + ox, py, w);
        py -= layerStep * 1.4;
      }
    }

    generateGateClouds(platforms, heights, heavenHeights, maxClouds);
    return platforms;
  }

  // Final cloud hops through the abyss — stop well above the solid heaven floor.
  function generateGateClouds(platforms, heights, heavenHeights, maxClouds) {
    if (!heavenHeights) return;
    const landingClearance = 200;
    const cols = Math.max(4, Math.floor(CFG.WORLD_WIDTH / 920));
    for (let i = 0; i < cols && platforms.length < maxClouds; i++) {
      const gx = 200 + i * ((CFG.WORLD_WIDTH - 400) / Math.max(1, cols - 1));
      const skyTop = skyBaseAt(heights, gx) - CFG.HEAVEN_SKY_CLIMB + 50;
      const hgY = getHeavenGroundY(heavenHeights, gx);
      const abyssTop = skyTop;
      const abyssBottom = hgY - landingClearance;
      const abyss = abyssTop - abyssBottom;
      if (abyss < 140) continue;
      const steps = Math.max(3, Math.ceil(abyss / 150));
      for (let s = 0; s < steps && platforms.length < maxClouds; s++) {
        const t = (s + 0.55) / steps;
        const py = abyssTop - t * abyss + (Math.random() - 0.5) * 12;
        if (py > abyssBottom - 24) continue;
        const w = 88 + Math.random() * 40;
        const ox = (s % 2 === 0 ? -1 : 1) * (26 + Math.random() * 20);
        addCloudPlatform(platforms, gx - w / 2 + ox, py, w);
      }
    }
  }

  // Ethereal trees rooted on heaven solid ground only.
  function generateHeavenTrees(heavenHeights) {
    if (!CFG.HEAVEN_ENABLED || !heavenHeights) return [];
    const trees = [];
    for (let i = 0; i < CFG.HEAVEN_TREES; i++) {
      const x = 150 + Math.random() * (CFG.WORLD_WIDTH - 300);
      const baseY = getHeavenGroundY(heavenHeights, x);
      const height = 45 + Math.random() * 75;
      trees.push({
        x, baseY, topY: baseY - height,
        trunkW: 5 + Math.random() * 6,
        canopyR: 20 + Math.random() * 24,
        color: Math.random() > 0.45 ? '#fff4d6' : '#e8f4ff',
        glow: '#ffd479'
      });
    }
    return trees;
  }

  // Solid heaven map content — paths, props, loot (clouds are ascent-only).
  function generateHeavenRealmContent(heavenHeights, spreader) {
    const empty = { platforms: [], props: [], chests: [], crystals: [] };
    if (!heavenHeights) return empty;

    const platforms = [];
    const props = [];
    const chests = [];
    const crystals = [];
    const groundY = (x) => getHeavenGroundY(heavenHeights, x);
    const propKinds = ['pillar', 'obelisk', 'fountain', 'shrine', 'arch', 'spire'];

    // One continuous walkable slab across the whole heaven map.
    const slabY = groundY(CFG.WORLD_WIDTH * 0.5);
    platforms.push({
      x: 0, y: slabY - 18, w: CFG.WORLD_WIDTH, h: 18,
      color: '#fff8e8', kind: 'heaven-solid'
    });

    const avenueSegs = Math.max(14, Math.floor(CFG.WORLD_WIDTH / 260));
    for (let i = 0; i < avenueSegs; i++) {
      const x = 100 + i * ((CFG.WORLD_WIDTH - 200) / Math.max(1, avenueSegs - 1));
      const gy = groundY(x);
      platforms.push({
        x: x - 62, y: gy - 12, w: 124, h: 12,
        color: '#fff4dc', kind: 'heaven-solid'
      });
    }

    const gateCols = Math.max(10, Math.floor(CFG.WORLD_WIDTH / 380));
    for (let i = 0; i < gateCols; i++) {
      const gx = 140 + i * ((CFG.WORLD_WIDTH - 280) / Math.max(1, gateCols - 1));
      const gy = groundY(gx);
      platforms.push({
        x: gx - 96, y: gy - 14, w: 192, h: 14,
        color: '#ffe8b8', kind: 'heaven-solid'
      });
      props.push({
        kind: 'gate', x: gx, baseY: gy,
        height: 110 + Math.random() * 50, width: 18 + Math.random() * 10
      });
    }

    for (let i = 0; i < CFG.HEAVEN_PROPS; i++) {
      const x = 80 + Math.random() * (CFG.WORLD_WIDTH - 160);
      const gy = groundY(x);
      const kind = propKinds[Math.floor(Math.random() * propKinds.length)];
      props.push({
        kind, x, baseY: gy,
        height: 50 + Math.random() * 90,
        width: 10 + Math.random() * 14,
        hue: 42 + Math.random() * 18,
        phase: Math.random() * Math.PI * 2
      });
    }

    for (let i = 0; i < CFG.HEAVEN_CHESTS; i++) {
      const x = spreader
        ? spreader.bandX(i, CFG.HEAVEN_CHESTS, 160, 0.52)
        : 160 + Math.random() * (CFG.WORLD_WIDTH - 320);
      const gy = groundY(x);
      if (spreader && !spreader.canPlace(x, gy - 18, PICKUP_SPREAD_MIN)) continue;
      if (spreader) spreader.mark(x, gy - 18);
      chests.push({
        x, y: gy - 18,
        open: false, pulse: Math.random() * Math.PI * 2,
        loot: ['✨ Star Shard', '🪽 Wing Charm', '☀️ Sun Relic', '🌟 Halo'][Math.floor(Math.random() * 4)],
        biome: 'heaven'
      });
    }

    const heavenColors = ['#fff8e0', '#ffe8a0', '#e8f4ff', '#ffd479', '#ffffff', '#c8e8ff'];
    for (let i = 0; i < CFG.HEAVEN_CRYSTALS; i++) {
      const x = spreader
        ? spreader.bandX(i, CFG.HEAVEN_CRYSTALS, 140, 0.58)
        : 140 + Math.random() * (CFG.WORLD_WIDTH - 280);
      const gy = groundY(x);
      const y = gy - 30 - Math.random() * 40;
      if (spreader && !spreader.canPlace(x, y, PICKUP_SPREAD_MIN)) continue;
      if (spreader) spreader.mark(x, y);
      crystals.push({
        x, y,
        size: 8 + Math.random() * 8,
        color: heavenColors[Math.floor(Math.random() * heavenColors.length)],
        phase: Math.random() * Math.PI * 2,
        rot: Math.random() * Math.PI * 2,
        floatOffset: Math.random() * Math.PI * 2
      });
    }

    return { platforms, props, chests, crystals };
  }

  function spawnHeavenCreatures(worldWidth, heavenHeights) {
    const list = [];
    if (!CFG.HEAVEN_ENABLED || !heavenHeights) return list;
    for (let i = 0; i < CFG.HEAVEN_CREATURES; i++) {
      const c = new Creature(worldWidth, 800, null, Math.random() > 0.35 ? 'bird' : 'firefly');
      c.x = 100 + Math.random() * (worldWidth - 200);
      const gy = getHeavenGroundY(heavenHeights, c.x);
      c.y = gy - 25 - Math.random() * 80;
      c.color = c.type === 'firefly' ? '#ffe8a0' : '#fff8f0';
      c.size = c.type === 'bird' ? 7 : 3;
      list.push(c);
    }
    return list;
  }

  const MAP_ITEM_TYPES = [
    { kind: 'coin', emoji: '🪙', color: '#ffd479' },
    { kind: 'gem', emoji: '💎', color: '#4ecdc4' },
    { kind: 'mushroom', emoji: '🍄', color: '#ff6b6b' },
    { kind: 'feather', emoji: '🪶', color: '#dfe6e9' },
    { kind: 'star', emoji: '⭐', color: '#ffeaa7' },
    { kind: 'rope', emoji: '🧵', color: '#c49040' },
    { kind: 'shell', emoji: '🐚', color: '#ffb4a2' },
    { kind: 'leaf', emoji: '🍃', color: '#96ceb4' }
  ];

  function pickMapItemType() {
    return MAP_ITEM_TYPES[Math.floor(Math.random() * MAP_ITEM_TYPES.length)];
  }

  const PICKUP_SPREAD_MIN = 160;
  const PICKUP_SPREAD_CELL = 200;
  const CAVE_PICKUP_SPREAD_MIN = 100;

  function shuffleInPlace(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // Keeps collectible pickups from clustering — grid cap plus minimum separation.
  function createPickupSpreader(opts = {}) {
    const minSep = opts.minSep ?? PICKUP_SPREAD_MIN;
    const cellSize = opts.cellSize ?? PICKUP_SPREAD_CELL;
    const maxPerCell = opts.maxPerCell ?? 1;
    const placed = [];
    const cellCounts = new Map();

    function cellKey(x, y) {
      return `${Math.floor(x / cellSize)},${Math.floor(y / cellSize)}`;
    }

    function tooClose(x, y, sep) {
      const sepSq = sep * sep;
      for (const p of placed) {
        const dx = p.x - x, dy = p.y - y;
        if (dx * dx + dy * dy < sepSq) return true;
      }
      return false;
    }

    return {
      placed,
      canPlace(x, y, sep = minSep) {
        const k = cellKey(x, y);
        if ((cellCounts.get(k) || 0) >= maxPerCell) return false;
        return !tooClose(x, y, sep);
      },
      mark(x, y) {
        placed.push({ x, y });
        const k = cellKey(x, y);
        cellCounts.set(k, (cellCounts.get(k) || 0) + 1);
      },
      tryPlace(getCandidate, attempts = 36, sep = minSep) {
        const seps = [sep, sep * 0.86, sep * 0.72, sep * 0.58];
        for (const curSep of seps) {
          for (let t = 0; t < attempts; t++) {
            const c = getCandidate(t);
            if (!c) continue;
            if (this.canPlace(c.x, c.y, curSep)) {
              this.mark(c.x, c.y);
              return c;
            }
          }
        }
        return null;
      },
      bandX(index, count, margin = 140, jitter = 0.55) {
        const span = CFG.WORLD_WIDTH - margin * 2;
        const band = span / Math.max(1, count);
        const base = margin + band * (index + 0.5);
        return base + (Math.random() - 0.5) * band * jitter;
      }
    };
  }

  // One band slot per surface pickup so shovels/sticks/chests/crystals never stack up.
  function createSurfacePickupPlacer(spreader) {
    const margin = 140;
    const total = CFG.CHEST_COUNT + CFG.CRYSTAL_COUNT
      + CFG.SHOVELS_SURFACE + CFG.STICKS_SURFACE;
    let slot = 0;
    return {
      total,
      margin,
      place(heights, yFor) {
        if (!spreader) {
          const x = margin + Math.random() * (CFG.WORLD_WIDTH - margin * 2);
          const y = typeof yFor === 'function' ? yFor(x) : getTerrainY(heights, x) - yFor;
          return { x, y };
        }
        const mySlot = slot++;
        const x = spreader.bandX(mySlot, total, margin, 0.38);
        const y = typeof yFor === 'function' ? yFor(x) : getTerrainY(heights, x) - yFor;
        spreader.mark(x, y);
        return { x, y };
      }
    };
  }

  function generateMapItems(heights, caves, heavenHeights, spreader) {
    const items = [];
    const add = (x, y, sep = CAVE_PICKUP_SPREAD_MIN) => {
      if (spreader) {
        if (!spreader.canPlace(x, y, sep)) return;
        spreader.mark(x, y);
      }
      const t = pickMapItemType();
      items.push({
        x, y, kind: t.kind, emoji: t.emoji, color: t.color,
        taken: false, bob: Math.random() * Math.PI * 2
      });
    };

    for (let i = 0; i < 28; i++) {
      const x = spreader
        ? spreader.bandX(i, 28, 140, 0.65)
        : 120 + Math.random() * (CFG.WORLD_WIDTH - 240);
      const surfY = getTerrainY(heights, x);
      const y = surfY - 10;
      add(x, y, PICKUP_SPREAD_MIN);
    }

    const chambers = shuffleInPlace((caves.chambers || []).slice());
    for (const c of chambers) {
      if (Math.random() > 0.5) continue;
      const spot = pickRoomFloorSpot(caves, heights, c, 32, heavenHeights);
      if (spot) add(spot.x, spot.y - 10);
    }

    const pockets = shuffleInPlace((caves.pockets || []).slice());
    for (const p of pockets) {
      if (Math.random() > 0.55) continue;
      const spot = pickRoomFloorSpot(caves, heights, p, 32, heavenHeights);
      if (spot) add(spot.x, spot.y - 10);
    }

    if (CFG.HEAVEN_ENABLED && heavenHeights) {
      const heavenCount = CFG.HEAVEN_ITEMS;
      for (let i = 0; i < heavenCount; i++) {
        const x = spreader
          ? spreader.bandX(i, heavenCount, 160, 0.58)
          : 160 + Math.random() * (CFG.WORLD_WIDTH - 320);
        add(x, getHeavenGroundY(heavenHeights, x) - 10, PICKUP_SPREAD_MIN);
      }
      for (let i = 0; i < 6; i++) {
        const x = spreader
          ? spreader.bandX(i, 6, 200, 0.5)
          : 200 + Math.random() * (CFG.WORLD_WIDTH - 400);
        const y = skyBaseAt(heights, x) - 80 - Math.random() * (CFG.HEAVEN_SKY_CLIMB * 0.7);
        add(x, y, PICKUP_SPREAD_MIN);
      }
    }

    return items;
  }

  function generateCheckpoints(heights, caves, heavenHeights) {
    const cps = [];
    let id = 0;

    for (const ex of (caves.entrances || [])) {
      const surf = getTerrainY(heights, ex);
      cps.push({
        id: id++, x: ex, y: surf - 10, kind: 'surface',
        label: 'Camp', emoji: '🏁', activated: false, pulse: Math.random() * 6
      });
    }

    for (const c of (caves.chambers || [])) {
      if (Math.random() > 0.32) continue;
      const spot = pickRoomFloorSpot(caves, heights, c, 55, heavenHeights);
      if (!spot) continue;
      cps.push({
        id: id++, x: spot.x, y: spot.y - 14, kind: 'cave',
        label: 'Deep Camp', emoji: '⛏️', activated: false, pulse: Math.random() * 6
      });
    }

    if (CFG.HEAVEN_ENABLED && heavenHeights) {
      const skyXs = [0.22, 0.5, 0.78];
      for (const frac of skyXs) {
        const x = CFG.WORLD_WIDTH * frac;
        const y = skyBaseAt(heights, x) - CFG.HEAVEN_SKY_CLIMB * (0.35 + frac * 0.2);
        cps.push({
          id: id++, x, y, kind: 'sky',
          label: 'Cloud Rest', emoji: '☁️', activated: false, pulse: Math.random() * 6
        });
      }
      const hx = CFG.WORLD_WIDTH * 0.42;
      cps.push({
        id: id++, x: hx, y: getHeavenGroundY(heavenHeights, hx) - 16, kind: 'heaven',
        label: 'Heaven Gate', emoji: '✨', activated: false, pulse: Math.random() * 6
      });
    }

    return cps;
  }

  function generatePortals(heights) {
    const labels = ['Apps', 'Music', 'Files', 'Settings', 'Terminal', 'Clock'];
    const portalColors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', '#dfe6e9'];
    const portals = [];
    const count = Math.min(CFG.PORTAL_COUNT, labels.length);
    for (let i = 0; i < count; i++) {
      const x = (CFG.WORLD_WIDTH / count) * i + (CFG.WORLD_WIDTH / count) * 0.2 + Math.random() * (CFG.WORLD_WIDTH / count) * 0.3;
      const terrainY = getTerrainY(heights, x);
      portals.push({
        x, y: terrainY - 50 - Math.random() * 30,
        radius: 22,
        label: labels[i],
        color: portalColors[i],
        pulse: Math.random() * Math.PI * 2,
        activated: false,
        glowIntensity: 0
      });
    }
    return portals;
  }

  function generateChests(heights, spreader, surfacePlacer) {
    const chests = [];
    const n = CFG.CHEST_COUNT;
    for (let i = 0; i < n; i++) {
      const spot = surfacePlacer
        ? surfacePlacer.place(heights, 18)
        : spreader?.tryPlace(() => {
            const x = spreader.bandX(i, n, 200, 0.5);
            return { x, y: getTerrainY(heights, x) - 18 };
          }, 32, PICKUP_SPREAD_MIN);
      if (!spot) continue;
      const biome = getBiome(spot.x);
      chests.push({
        x: spot.x, y: spot.y,
        w: 20, h: 16,
        open: false,
        color: '#c49040',
        lidColor: '#a07030',
        accent: biome.accent,
        pulse: Math.random() * Math.PI * 2
      });
    }
    return chests;
  }

  function generateCrystals(heights, spreader, surfacePlacer) {
    const crystals = [];
    const n = CFG.CRYSTAL_COUNT;
    for (let i = 0; i < n; i++) {
      const spot = surfacePlacer
        ? surfacePlacer.place(heights, (x) => getTerrainY(heights, x) - 40 - Math.random() * 80)
        : spreader?.tryPlace(() => {
            const x = spreader.bandX(i, n, 160, 0.55);
            return { x, y: getTerrainY(heights, x) - 40 - Math.random() * 80 };
          }, 32, PICKUP_SPREAD_MIN);
      if (!spot) continue;
      const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', '#dfe6e9'];
      crystals.push({
        x: spot.x, y: spot.y,
        size: 6 + Math.random() * 6,
        color: colors[Math.floor(Math.random() * colors.length)],
        phase: Math.random() * Math.PI * 2,
        rot: Math.random() * Math.PI * 2,
        floatOffset: Math.random() * Math.PI * 2
      });
    }
    return crystals;
  }

  // ---- cave / tunnel system -------------------------------------------------
  // Caves are an analytic network: round-capped tunnel "capsules" plus circular
  // chambers carved out of the solid rock that fills everything below the
  // surface. Entrances are vertical shafts opening flush with the terrain so
  // the player can drop in (rendering clips caves below the surface line).
  const COLORS_LIST = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', '#dfe6e9'];

  function makeChamber(x, y, r) {
    return { x, y, r, crystals: [], stalactites: [], boulders: [] };
  }

  const CAVE_DECOR_CELL = 200;
  const CAVE_DECOR_LIMITS = { boulder: 2, crystal: 1, chest: 1, bucket: 1 };
  const CAVE_DECOR_MAX_PER_CELL = 4;

  // Y on the bottom arc of a circular chamber/pocket.
  function roomFloorY(room, dx) {
    const clamped = Math.min(Math.abs(dx), room.r - 5);
    return room.y + Math.sqrt(room.r * room.r - clamped * clamped);
  }

  // Y on the top arc of a circular chamber/pocket.
  function roomCeilingY(room, dx) {
    const clamped = Math.min(Math.abs(dx), room.r - 5);
    return room.y - Math.sqrt(room.r * room.r - clamped * clamped);
  }

  function createCaveDecorGrid() {
    const grid = new Map();
    return {
      canPlace(x, y, type) {
        const k = `${Math.floor(x / CAVE_DECOR_CELL)},${Math.floor(y / CAVE_DECOR_CELL)}`;
        const cell = grid.get(k) || { boulder: 0, crystal: 0, chest: 0, bucket: 0, total: 0 };
        if (cell.total >= CAVE_DECOR_MAX_PER_CELL) return false;
        if (cell[type] >= CAVE_DECOR_LIMITS[type]) return false;
        return true;
      },
      mark(x, y, type) {
        const k = `${Math.floor(x / CAVE_DECOR_CELL)},${Math.floor(y / CAVE_DECOR_CELL)}`;
        const cell = grid.get(k) || { boulder: 0, crystal: 0, chest: 0, bucket: 0, total: 0 };
        cell[type]++;
        cell.total++;
        grid.set(k, cell);
      }
    };
  }

  // Pick a spot on the floor arc inside carved cave space.
  function pickRoomFloorSpot(caves, heights, room, minSep = 36, heavenHeights) {
    for (let t = 0; t < 18; t++) {
      const dx = (Math.random() - 0.5) * room.r * 1.25;
      if (Math.abs(dx) >= room.r - 8) continue;
      const x = room.x + dx;
      const y = roomFloorY(room, dx);
      if (!caveCarved(caves, x, y - 6)) continue;
      if (!caveCarved(caves, x, y - 16)) continue;
      if (!isRockAt(caves, heights, x, y + 6, heavenHeights)) continue;
      if (room._placed) {
        let ok = true;
        for (const p of room._placed) {
          const ddx = p.x - x, ddy = p.y - y;
          if (ddx * ddx + ddy * ddy < minSep * minSep) { ok = false; break; }
        }
        if (!ok) continue;
      }
      return { x, y, dx };
    }
    return null;
  }

  // Pick a spot on the ceiling arc with rock above and open air below.
  function pickRoomCeilingSpot(caves, heights, room, heavenHeights, minSep = 28) {
    for (let t = 0; t < 18; t++) {
      const dx = (Math.random() - 0.5) * room.r * 1.15;
      if (Math.abs(dx) >= room.r - 10) continue;
      const x = room.x + dx;
      const y = roomCeilingY(room, dx);
      if (!caveCarved(caves, x, y + 10)) continue;
      if (!caveCarved(caves, x, y + 22)) continue;
      if (!isRockAt(caves, heights, x, y - 5, heavenHeights)) continue;
      if (room._placed) {
        let ok = true;
        for (const p of room._placed) {
          const ddx = p.x - x, ddy = p.y - y;
          if (ddx * ddx + ddy * ddy < minSep * minSep) { ok = false; break; }
        }
        if (!ok) continue;
      }
      return { x, y, dx };
    }
    return null;
  }

  // Spread boulders, crystals, stalactites, chests, and buckets with per-area caps.
  function layoutCaveProps(caves, heights, heavenHeights, spreader) {
    const grid = createCaveDecorGrid();
    const LOOT = ['💎 Gems', '🗝️ Old Key', '📜 Map Scrap', '🪙 Gold Stash', '🔮 Relic', '⚙️ Cog'];
    const caveChests = [];
    const buckets = [];

    for (const c of caves.chambers) {
      c.boulders = [];
      c.crystals = [];
      c.stalactites = [];
      c._placed = [];
      const depthFrac = Math.min(1, c.y / CFG.WORLD_HEIGHT);

      if (Math.random() < 0.28 + depthFrac * 0.15) {
        const n = Math.random() < 0.35 + depthFrac * 0.25 ? 2 : 1;
        for (let i = 0; i < n; i++) {
          const spot = pickRoomFloorSpot(caves, heights, c, 36, heavenHeights);
          if (!spot || !grid.canPlace(spot.x, spot.y, 'boulder')) continue;
          grid.mark(spot.x, spot.y, 'boulder');
          c._placed.push(spot);
          c.boulders.push({
            dx: spot.dx,
            r: 4 + Math.random() * 5 * (0.45 + depthFrac * 0.55)
          });
        }
      }

      if (Math.random() < 0.18) {
        const spot = pickRoomFloorSpot(caves, heights, c, 36, heavenHeights);
        if (spot && grid.canPlace(spot.x, spot.y, 'crystal')) {
          grid.mark(spot.x, spot.y, 'crystal');
          c._placed.push(spot);
          c.crystals.push({
            dx: spot.dx,
            r: 2 + Math.random() * 2.5,
            color: COLORS_LIST[Math.floor(Math.random() * COLORS_LIST.length)]
          });
        }
      }

      if (Math.random() < 0.42 + depthFrac * 0.18) {
        const hangN = 1 + Math.floor(Math.random() * 2);
        for (let i = 0; i < hangN; i++) {
          const spot = pickRoomCeilingSpot(caves, heights, c, heavenHeights);
          if (!spot) continue;
          c._placed.push(spot);
          c.stalactites.push({
            dx: spot.dx,
            len: 10 + Math.random() * 18,
            w: 3 + Math.random() * 4,
            up: false
          });
        }
      }

      if (Math.random() < 0.22) {
        const spot = pickRoomFloorSpot(caves, heights, c, 40, heavenHeights);
        if (spot) {
          c._placed.push(spot);
          c.stalactites.push({
            dx: spot.dx,
            len: 8 + Math.random() * 14,
            w: 3 + Math.random() * 3,
            up: true
          });
        }
      }

      if (c.y > getTerrainY(heights, c.x) + 320 && Math.random() < 0.22) {
        const spot = pickRoomFloorSpot(caves, heights, c, 44, heavenHeights);
        if (spot && grid.canPlace(spot.x, spot.y, 'bucket')
            && (!spreader || spreader.canPlace(spot.x, spot.y, CAVE_PICKUP_SPREAD_MIN))) {
          grid.mark(spot.x, spot.y, 'bucket');
          if (spreader) spreader.mark(spot.x, spot.y);
          c._placed.push(spot);
          buckets.push({ x: spot.x, y: spot.y - 6, bob: Math.random() * 6 });
        }
      }
      delete c._placed;
    }

    for (const p of (caves.pockets || [])) {
      p._placed = [];
      p.stalactites = [];
      const spot = pickRoomFloorSpot(caves, heights, p, 40, heavenHeights);
      if (spot && grid.canPlace(spot.x, spot.y, 'chest')
          && (!spreader || spreader.canPlace(spot.x, spot.y, CAVE_PICKUP_SPREAD_MIN))) {
        grid.mark(spot.x, spot.y, 'chest');
        if (spreader) spreader.mark(spot.x, spot.y);
        caveChests.push({
          x: spot.x - 10, y: spot.y - 14, w: 20, h: 16, open: false,
          pulse: Math.random() * 6,
          loot: LOOT[Math.floor(Math.random() * LOOT.length)]
        });
      }
      const bSpot = pickRoomFloorSpot(caves, heights, p, 50, heavenHeights);
      if (bSpot && grid.canPlace(bSpot.x, bSpot.y, 'bucket')
          && (!spreader || spreader.canPlace(bSpot.x, bSpot.y, CAVE_PICKUP_SPREAD_MIN))) {
        grid.mark(bSpot.x, bSpot.y, 'bucket');
        if (spreader) spreader.mark(bSpot.x, bSpot.y);
        buckets.push({ x: bSpot.x, y: bSpot.y - 6, bob: Math.random() * 6 });
      }
      const ceilSpot = pickRoomCeilingSpot(caves, heights, p, heavenHeights);
      if (ceilSpot) {
        p.stalactites.push({
          dx: ceilSpot.dx,
          len: 12 + Math.random() * 14,
          w: 3 + Math.random() * 3,
          up: false
        });
      }
      delete p._placed;
    }

    return { caveChests, buckets };
  }

  // Carve a meandering tunnel from A to B as several jittered capsule segments,
  // so cave passages look organic rather than ruler-straight.
  function windingTunnel(tunnels, x1, y1, x2, y2, r, steps) {
    let px = x1, py = y1;
    const maxDepth = CFG.WORLD_HEIGHT - 70;
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const last = i === steps;
      const nx = x1 + (x2 - x1) * t + (last ? 0 : (Math.random() - 0.5) * 140);
      const ny = Math.min(maxDepth, y1 + (y2 - y1) * t + (last ? 0 : (Math.random() - 0.5) * 70));
      tunnels.push({ ax: px, ay: py, bx: nx, by: ny, r: r * (0.85 + Math.random() * 0.3) });
      px = nx; py = ny;
    }
  }

  function generateCaves(heights) {
    const caveEnabled = DEFAULTS.WORLD_CAVE_ENABLED !== false;
    const lavaOffset = DEFAULTS.WORLD_CAVE_LAVA_OFFSET ?? 140;
    const lavaY = CFG.WORLD_HEIGHT - lavaOffset;
    if (!caveEnabled) {
      return { tunnels: [], chambers: [], pockets: [], entrances: [], lavaY, digHoles: [] };
    }

    const tunnels = [];
    const chambers = [];
    const pockets = [];
    const entrances = [];
    const W = CFG.WORLD_WIDTH;
    const R = DEFAULTS.WORLD_CAVE_TUNNEL_RADIUS ?? 30;
    const maxDepth = CFG.WORLD_HEIGHT - 60;
    const clampY = (y) => Math.min(y, maxDepth);
    const NUM_ENTRANCES = Math.max(2, DEFAULTS.WORLD_CAVE_ENTRANCES ?? 4);

    for (let e = 0; e < NUM_ENTRANCES; e++) {
      const ex = W * (0.1 + e * (0.8 / (NUM_ENTRANCES - 1))) + (Math.random() - 0.5) * 160;
      const surf = getTerrainY(heights, ex);
      entrances.push(ex);
      let curX = ex;
      let curY = clampY(surf + 190 + Math.random() * 110);

      // Entrance shaft — top sits at the surface so the opening is level, not domed.
      tunnels.push({ ax: ex, ay: surf, bx: ex + (Math.random() - 0.5) * 30, by: curY, r: R, entrance: true });

      // Descend through several levels, branching a gallery + chamber at each,
      // so each entrance becomes a sprawling multi-level system.
      const levels = 3 + Math.floor(Math.random() * 3);
      for (let lvl = 0; lvl < levels; lvl++) {
        const d = Math.random() < 0.5 ? -1 : 1;
        const gx = curX + d * (280 + Math.random() * 400);
        const gy = clampY(curY + (Math.random() - 0.5) * 80);
        windingTunnel(tunnels, curX, curY, gx, gy, R + 3, 3);
        chambers.push(makeChamber(gx, gy, 55 + Math.random() * 60));

        // A side passage + smaller chamber off the gallery.
        if (Math.random() < 0.65) {
          const sx = gx - d * (140 + Math.random() * 180);
          const sy = clampY(gy + 30 + Math.random() * 120);
          windingTunnel(tunnels, gx, gy, sx, sy, R - 7, 2);
          chambers.push(makeChamber(sx, sy, 42 + Math.random() * 38));
        }

        // Descend to the next level.
        const nx = gx + (Math.random() - 0.5) * 240;
        const ny = clampY(gy + 170 + Math.random() * 170);
        windingTunnel(tunnels, gx, gy, nx, ny, R - 2, 2);
        curX = nx; curY = ny;
      }
      // Deep bottom chamber (often into the lava zone).
      chambers.push(makeChamber(curX, clampY(curY + 60), 85 + Math.random() * 60));
    }

    // A grand cavern deep in the middle.
    const grandX = W * 0.5 + (Math.random() - 0.5) * 320;
    const grandY = clampY(getTerrainY(heights, grandX) + 860 + Math.random() * 140);
    chambers.push(makeChamber(grandX, grandY, 165 + Math.random() * 70));
    windingTunnel(tunnels, grandX, clampY(grandY - 430), grandX, grandY, R, 4);

    // Deep through-tunnels linking adjacent systems into one network.
    for (let i = 0; i < entrances.length - 1; i++) {
      const ay = clampY(getTerrainY(heights, entrances[i]) + 340 + Math.random() * 220);
      const by = clampY(getTerrainY(heights, entrances[i + 1]) + 340 + Math.random() * 220);
      windingTunnel(tunnels, entrances[i], ay, entrances[i + 1], by, R - 2, 4);
    }

    // Disconnected pockets: sealed in solid rock (no tunnel reaches them), so the
    // player must DIG in. Each holds loot — see init() for chests/buckets.
    const numPockets = Math.max(0, DEFAULTS.WORLD_CAVE_SEALED_POCKETS ?? 6);
    for (let i = 0; i < numPockets; i++) {
      const px = 240 + Math.random() * (W - 480);
      const surf = getTerrainY(heights, px);
      const py = clampY(surf + 240 + Math.random() * 700);
      const pk = makeChamber(px, py, 44 + Math.random() * 28);
      pk.sealed = true;
      pk.loot = true;
      pockets.push(pk);
    }

    return { tunnels, chambers, pockets, entrances, lavaY, digHoles: [] };
  }

  // Shovel pickups on the surface and in caves.
  function generateShovels(heights, spreader, surfacePlacer) {
    const shovels = [];
    const n = CFG.SHOVELS_SURFACE;
    const margin = 140;
    for (let i = 0; i < n; i++) {
      const spot = surfacePlacer
        ? surfacePlacer.place(heights, 16)
        : spreader
          ? spreader.tryPlace((t) => {
              const x = spreader.bandX(i + t * 0.09, n, margin, 0.55);
              return { x, y: getTerrainY(heights, x) - 16 };
            }, 48, PICKUP_SPREAD_MIN)
          : (() => {
              const x = margin + Math.random() * (CFG.WORLD_WIDTH - margin * 2);
              return { x, y: getTerrainY(heights, x) - 16 };
            })();
      if (!spot) continue;
      const r = Math.random();
      const tier = r < 0.60 ? 0 : r < 0.82 ? 1 : r < 0.96 ? 2 : 3;
      shovels.push({
        x: spot.x, y: spot.y, taken: false,
        bob: Math.random() * Math.PI * 2, kind: 'surface', tier
      });
    }
    return shovels;
  }

  function generateCaveShovels(caves, heights, heavenHeights, spreader) {
    const shovels = [];
    if (!caves) return shovels;
    let placed = 0;
    const target = CFG.SHOVELS_CAVE;
    const surfAvg = getTerrainY(heights, CFG.WORLD_WIDTH * 0.5);
    const chambers = shuffleInPlace(caves.chambers.slice());
    for (const c of chambers) {
      if (placed >= target) break;
      if (Math.random() > 0.32) continue;
      const spot = pickRoomFloorSpot(caves, heights, c, 48, heavenHeights);
      if (!spot) continue;
      if (spreader && !spreader.canPlace(spot.x, spot.y, CAVE_PICKUP_SPREAD_MIN)) continue;
      if (spreader) spreader.mark(spot.x, spot.y);
      const depth = spot.y - surfAvg;
      let tier;
      if (depth < 180)        tier = Math.random() < 0.5 ? 1 : 2;
      else if (depth < 400)   tier = Math.random() < 0.5 ? 2 : 3;
      else if (depth < 650)   tier = Math.random() < 0.55 ? 3 : 4;
      else                    tier = Math.random() < 0.75 ? 4 : 5;
      shovels.push({
        x: spot.x, y: spot.y - 14, taken: false,
        bob: Math.random() * Math.PI * 2, kind: 'cave', tier
      });
      placed++;
    }
    return shovels;
  }

  // Celestial shovels are ultra-rare trophies in the hardest spots — sealed pockets,
  // then the highest sky-climb clouds, then only the deepest cave chambers.
  function placeCelestialShovels(caves, heights, heavenHeights, spreader, cloudPlatforms) {
    const shovels = [];
    const limit = Math.max(0, CFG.CELESTIAL_SHOVELS);
    if (limit <= 0 || !caves) return shovels;

    const trySpot = (x, y, kind) => {
      if (spreader && !spreader.canPlace(x, y, CAVE_PICKUP_SPREAD_MIN)) return false;
      if (spreader) spreader.mark(x, y);
      shovels.push({
        x, y, taken: false,
        bob: Math.random() * Math.PI * 2, kind, tier: 6
      });
      return true;
    };

    const pockets = (caves.pockets || [])
      .filter((pk) => pk.sealed)
      .sort((a, b) => b.y - a.y);
    for (const pk of pockets) {
      if (shovels.length >= limit) return shovels;
      const spot = pickRoomFloorSpot(caves, heights, pk, 52, heavenHeights);
      if (!spot) continue;
      if (trySpot(spot.x, spot.y - 14, 'cave')) return shovels;
    }

    if (CFG.HEAVEN_ENABLED && cloudPlatforms && cloudPlatforms.length) {
      const clouds = cloudPlatforms
        .filter((pl) => pl.kind === 'cloud')
        .sort((a, b) => a.y - b.y);
      const elite = clouds.slice(0, Math.max(1, Math.ceil(clouds.length * 0.12)));
      for (const pl of elite) {
        if (shovels.length >= limit) return shovels;
        const x = pl.x + pl.w / 2;
        const y = pl.y - 14;
        if (trySpot(x, y, 'sky')) return shovels;
      }
    }

    const surfAvg = getTerrainY(heights, CFG.WORLD_WIDTH * 0.5);
    const deep = caves.chambers
      .filter((c) => c.y - surfAvg > 580)
      .sort((a, b) => b.y - a.y);
    for (const c of deep) {
      if (shovels.length >= limit) break;
      const spot = pickRoomFloorSpot(caves, heights, c, 52, heavenHeights);
      if (!spot) continue;
      trySpot(spot.x, spot.y - 14, 'cave');
    }
    return shovels;
  }

  function generateSticks(heights, spreader, surfacePlacer) {
    const sticks = [];
    const n = CFG.STICKS_SURFACE;
    const margin = 140;
    for (let i = 0; i < n; i++) {
      const spot = surfacePlacer
        ? surfacePlacer.place(heights, 12)
        : spreader
          ? spreader.tryPlace((t) => {
              const x = spreader.bandX(i + t * 0.09, n, margin, 0.55);
              return { x, y: getTerrainY(heights, x) - 12 };
            }, 48, PICKUP_SPREAD_MIN)
          : (() => {
              const x = margin + Math.random() * (CFG.WORLD_WIDTH - margin * 2);
              return { x, y: getTerrainY(heights, x) - 12 };
            })();
      if (!spot) continue;
      sticks.push({
        x: spot.x, y: spot.y,
        taken: false, bob: Math.random() * Math.PI * 2, kind: 'surface'
      });
    }
    return sticks;
  }

  function generateCaveSticks(caves, heights, heavenHeights, spreader) {
    const sticks = [];
    if (!caves) return sticks;
    let placed = 0;
    const target = CFG.STICKS_CAVE;
    const chambers = shuffleInPlace(caves.chambers.slice());
    for (const c of chambers) {
      if (placed >= target) break;
      if (Math.random() > 0.42) continue;
      const spot = pickRoomFloorSpot(caves, heights, c, 40, heavenHeights);
      if (!spot) continue;
      if (spreader && !spreader.canPlace(spot.x, spot.y, CAVE_PICKUP_SPREAD_MIN)) continue;
      if (spreader) spreader.mark(spot.x, spot.y);
      sticks.push({
        x: spot.x, y: spot.y - 10, taken: false,
        bob: Math.random() * Math.PI * 2, kind: 'cave'
      });
      placed++;
    }
    const pockets = shuffleInPlace((caves.pockets || []).slice());
    for (const p of pockets) {
      if (placed >= target) break;
      const spot = pickRoomFloorSpot(caves, heights, p, 40, heavenHeights);
      if (!spot) continue;
      if (spreader && !spreader.canPlace(spot.x, spot.y, CAVE_PICKUP_SPREAD_MIN)) continue;
      if (spreader) spreader.mark(spot.x, spot.y);
      sticks.push({
        x: spot.x, y: spot.y - 10, taken: false,
        bob: Math.random() * Math.PI * 2, kind: 'cave'
      });
      placed++;
    }
    return sticks;
  }

  function segDistSq(px, py, ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay;
    const l2 = dx * dx + dy * dy;
    let t = l2 > 0 ? ((px - ax) * dx + (py - ay) * dy) / l2 : 0;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const qx = ax + t * dx, qy = ay + t * dy;
    return (px - qx) * (px - qx) + (py - qy) * (py - qy);
  }

  // Is (x,y) inside carved cave space?
  function caveCarved(caves, x, y) {
    if (!caves) return false;
    for (const t of caves.tunnels) {
      if (segDistSq(x, y, t.ax, t.ay, t.bx, t.by) < t.r * t.r) return true;
    }
    for (const c of caves.chambers) {
      const dx = x - c.x, dy = y - c.y;
      if (dx * dx + dy * dy < c.r * c.r) return true;
    }
    if (caves.pockets) {
      for (const c of caves.pockets) {
        const dx = x - c.x, dy = y - c.y;
        if (dx * dx + dy * dy < c.r * c.r) return true;
      }
    }
    if (caves.digHoles) {
      for (const d of caves.digHoles) {
        const dx = x - d.x, dy = y - d.y;
        if (dx * dx + dy * dy < d.r * d.r) return true;
      }
    }
    return false;
  }

  // Is (x,y) solid rock the player collides with? Above the surface is air;
  // below it is rock except where a cave carves it away. Out-of-bounds is solid.
  function isRockAt(caves, heights, x, y, heavenHeights) {
    if (x < 0 || x > CFG.WORLD_WIDTH) return true;
    const surfY = getTerrainY(heights, x);
    if (y < surfY) {
      if (heavenHeights) {
        const hgY = getHeavenGroundY(heavenHeights, x);
        if (y < hgY) return false;
        if (y < hgY + CFG.HEAVEN_REALM_DEPTH) return true;
      }
      return false;
    }
    if (caveCarved(caves, x, y)) return false;
    return true;
  }

  // Probe along the player's side for cave/rock walls (used for wall grab & kick).
  function touchesWall(caves, heights, x, y, w, h, side, heavenHeights) {
    const probeX = side < 0 ? x - 1 : x + w + 1;
    for (let oy = 6; oy < h - 2; oy += 7) {
      if (isRockAt(caves, heights, probeX, y + oy, heavenHeights)) return true;
    }
    return false;
  }

  const DIG_CELL = 16;

  // Grid cell for dig progress — keyed by cell, not exact point, so running
  // alongside F does not reset chips on every frame.
  function digCellKey(fx, fy, cell = DIG_CELL) {
    return { cellX: Math.floor(fx / cell), cellY: Math.floor(fy / cell) };
  }

  function inHeavenZone(playerY, playerH, playerX, heavenHeights, heavenEnabled) {
    if (!heavenEnabled || !heavenHeights) return false;
    const hgY = getHeavenGroundY(heavenHeights, playerX);
    return (playerY + playerH / 2) < hgY + 36;
  }

  // Sweat drain rate from depth heat + movement. Returns positive = drain water.
  function computeSweatRate(baseHeat, depth, isMoving, onGround, inLava, nearFire = false) {
    if (inLava) return 1.5 * 0.11;
    if (baseHeat <= 0.12) {
      if (depth <= 0 && !isMoving) {
        let rate = CFG.SURVIVAL_SURFACE_IDLE_SWEAT;
        if (nearFire) rate = Math.max(rate * CFG.FIRE_SWEAT_MULT, CFG.FIRE_SWEAT_MIN);
        return rate;
      }
      if (depth <= 0) {
        let rate = CFG.SURVIVAL_SURFACE_IDLE_SWEAT * 1.5;
        if (nearFire) rate = Math.max(rate * CFG.FIRE_SWEAT_MULT, CFG.FIRE_SWEAT_MIN);
        return rate;
      }
      let rate = baseHeat * CFG.SURVIVAL_IDLE_DEEP_MULT * 0.11;
      if (nearFire) rate = Math.max(rate * CFG.FIRE_SWEAT_MULT, CFG.FIRE_SWEAT_MIN);
      return rate;
    }
    let rate = baseHeat * 0.11;
    if (isMoving && onGround) rate *= CFG.SURVIVAL_RUN_SWEAT_MULT;
    else if (!isMoving && depth > 0) rate *= CFG.SURVIVAL_IDLE_DEEP_MULT;
    else if (depth <= 0 && !isMoving) rate = CFG.SURVIVAL_SURFACE_IDLE_SWEAT;
    if (nearFire) rate = Math.max(rate * CFG.FIRE_SWEAT_MULT, CFG.FIRE_SWEAT_MIN);
    return rate;
  }

  function playerNearFire(player, fires, radius = CFG.FIRE_WARM_RADIUS) {
    if (!fires || !fires.length) return false;
    const cxp = player.x + player.w / 2;
    const cyp = player.y + player.h / 2;
    const r2 = radius * radius;
    for (const f of fires) {
      const dx = cxp - f.x;
      const dy = cyp - f.y;
      if (dx * dx + dy * dy < r2) return true;
    }
    return false;
  }

  function platformY(plat, time) {
    if (plat.kind === 'cloud') {
      return plat.y + Math.sin(time * 0.02 + plat.bob) * plat.bobAmp;
    }
    return plat.y;
  }

  function heavenCamMinY() {
    if (!CFG.HEAVEN_ENABLED) return 0;
    return -(CFG.HEAVEN_REALM_ALTITUDE + CFG.HEAVEN_REALM_DEPTH + 280);
  }

  // Dig materials. `hardness` = chips needed to break through a spot AND the
  // wear it puts on the shovel. Softer up top (sand/dirt), brutal down deep.
  const MATERIALS = {
    sand: { name: 'sand', hardness: 1, color: '#c9a86a', dust: '#ddc78d' },
    dirt: { name: 'dirt', hardness: 2, color: '#6b4a2f', dust: '#8a6a40' },
    stone: { name: 'stone', hardness: 4, color: '#5a5a66', dust: '#9a9aa6' },
    hardrock: { name: 'hard rock', hardness: 7, color: '#3a3540', dust: '#6a6575' },
    basalt: { name: 'basalt', hardness: 11, color: '#2a1820', dust: '#6a3a3a' }
  };

  const SHOVEL_TIERS = [
    { name: 'Rusty Shovel',   durability: 120,  cooldown: 2.0, bladeColor: '#cfd6dd', handleColor: '#8a6a40', glowColor: '#ffd479', holeR: 21, effect: null, bladeW: 5, bladeH: 8 },
    { name: 'Stone Shovel',   durability: 180,  cooldown: 2.0, bladeColor: '#7a7570', handleColor: '#6a5a40', glowColor: '#b8a898', holeR: 21, effect: null, bladeW: 6, bladeH: 9 },
    { name: 'Copper Shovel',  durability: 260,  cooldown: 1.8, bladeColor: '#d4834a', handleColor: '#7a5a30', glowColor: '#e8a860', holeR: 22, effect: null, bladeW: 6, bladeH: 9 },
    { name: 'Iron Shovel',    durability: 400,  cooldown: 1.5, bladeColor: '#b8c0cc', handleColor: '#5a4a38', glowColor: '#aabbdd', holeR: 23, effect: 'wideSwing', bladeW: 7, bladeH: 10 },
    { name: 'Steel Shovel',   durability: 600,  cooldown: 1.2, bladeColor: '#6a9ac8', handleColor: '#3a4050', glowColor: '#6ac8ff', holeR: 24, effect: 'shockwave', bladeW: 7, bladeH: 10 },
    { name: 'Void Shovel',    durability: 900,  cooldown: 0.8, bladeColor: '#3a1a4a', handleColor: '#1a0a20', glowColor: '#9a4aff', holeR: 28, effect: 'voidRend', bladeW: 8, bladeH: 12 },
    { name: 'Celestial Shovel', durability: 1500, cooldown: 0.5, bladeColor: '#ffe8a0', handleColor: '#c8a060', glowColor: '#ffd700', holeR: 32, effect: 'starfall', bladeW: 9, bladeH: 13 }
  ];

  // Which material fills a given underground point.
  function materialAt(heights, x, y) {
    const surf = getTerrainY(heights, x);
    const depth = y - surf;
    if (depth < 0) return MATERIALS.dirt;
    const lavaY = CFG.WORLD_HEIGHT - 140;
    if (y > lavaY - 110) return MATERIALS.basalt;
    if (depth < 90 && getBiome(x).name === 'desert') return MATERIALS.sand;
    if (depth < 70) return MATERIALS.dirt;
    const frac = depth / Math.max(200, CFG.WORLD_HEIGHT - surf);
    if (frac < 0.42) return MATERIALS.stone;
    return MATERIALS.hardrock;
  }

  class Creature {
    constructor(worldWidth, worldHeight, heights, forcedType) {
      this.worldWidth = worldWidth;
      this.worldHeight = worldHeight;
      this.type = forcedType || (Math.random() < 0.5 ? 'bird' : Math.random() < 0.6 ? 'firefly' : 'bunny');
      this.reset(heights);
    }
    reset(heights) {
      this.x = Math.random() * this.worldWidth;
      this.y = 100 + Math.random() * 200;
      this.vx = (Math.random() - 0.5) * 1.5;
      this.vy = (Math.random() - 0.5) * 0.5;
      this.size = this.type === 'bird' ? 6 : this.type === 'firefly' ? 2 : 5;
      this.color = this.type === 'firefly' ? '#ffeaa7' : this.type === 'bird' ? '#4a6a8a' : '#c49070';
      this.life = 1;
      this.wingPhase = Math.random() * Math.PI * 2;
      this.dirChange = Math.random() * 200 + 100;
      this.timer = 0;
      this.heights = heights || this.heights;
      this.onGround = false;
      this.alpha = 1;
      if (this.type === 'bunny' && this.heights) {
        this.y = getTerrainY(this.heights, this.x) - this.size;
      }
    }
    // ctx-free behavior update.
    // context = { player, neighbors, daylight, lights }
    update(context) {
      const ctxt = context || {};
      this.timer++;
      if (this.type === 'bird') this.updateBird(ctxt);
      else if (this.type === 'bunny') this.updateBunny(ctxt);
      else this.updateFirefly(ctxt);
    }
    updateBird(ctxt) {
      // Boids flocking among nearby birds + flee from player.
      const neighbors = ctxt.neighbors || [];
      let sepX = 0, sepY = 0, aliX = 0, aliY = 0, cohX = 0, cohY = 0, n = 0;
      for (const o of neighbors) {
        if (o === this || o.type !== 'bird') continue;
        const dx = this.x - o.x, dy = this.y - o.y;
        const d2 = dx * dx + dy * dy;
        if (d2 > 22500) continue; // 150px radius
        n++;
        cohX += o.x; cohY += o.y;
        aliX += o.vx; aliY += o.vy;
        if (d2 < 1600 && d2 > 0) { // separation < 40px
          const inv = 1 / Math.sqrt(d2);
          sepX += dx * inv; sepY += dy * inv;
        }
      }
      if (n > 0) {
        cohX = (cohX / n - this.x) * 0.0008;
        cohY = (cohY / n - this.y) * 0.0008;
        aliX = (aliX / n - this.vx) * 0.02;
        aliY = (aliY / n - this.vy) * 0.02;
        this.vx += cohX + aliX + sepX * 0.05;
        this.vy += cohY + aliY + sepY * 0.05;
      }
      if (this.timer > this.dirChange) {
        this.vx += (Math.random() - 0.5) * 1.2;
        this.vy += (Math.random() - 0.5) * 0.4;
        this.dirChange = Math.random() * 200 + 100;
        this.timer = 0;
      }
      // Flee player.
      if (ctxt.player) {
        const dx = this.x - ctxt.player.x, dy = this.y - ctxt.player.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < 14400 && d2 > 0) {
          const inv = 1 / Math.sqrt(d2);
          this.vx += dx * inv * 0.6;
          this.vy += dy * inv * 0.6;
        }
      }
      this.wingPhase += 0.1;
      this.vy += Math.sin(this.wingPhase) * 0.02;
      const sp = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
      if (sp > 3) { this.vx = this.vx / sp * 3; this.vy = this.vy / sp * 3; }
      this.x += this.vx;
      this.y += this.vy;
      if (this.x < 0) { this.x = 0; this.vx = -this.vx; }
      if (this.x > this.worldWidth) { this.x = this.worldWidth; this.vx = -this.vx; }
      if (this.y < 20) { this.y = 20; this.vy = Math.abs(this.vy); }
      if (this.y > 320) { this.y = 320; this.vy = -Math.abs(this.vy); }
    }
    updateBunny(ctxt) {
      const groundY = this.heights ? getTerrainY(this.heights, this.x) : 400;
      this.vy += 0.45; // gravity
      // Hop logic.
      if (this.onGround) {
        if (this.timer > this.dirChange) {
          this.vy = -6 - Math.random() * 2;
          this.vx = (Math.random() < 0.5 ? -1 : 1) * (1 + Math.random() * 1.5);
          this.dirChange = 40 + Math.random() * 120;
          this.timer = 0;
        } else {
          this.vx *= 0.8;
        }
      }
      // Flee player (hop away fast).
      if (ctxt.player) {
        const dx = this.x - ctxt.player.x;
        const dist = Math.abs(dx);
        if (dist < 110) {
          this.vx = (dx >= 0 ? 1 : -1) * 3.2;
          if (this.onGround) { this.vy = -7; }
        }
      }
      this.x += this.vx;
      this.y += this.vy;
      this.onGround = false;
      if (this.y + this.size >= groundY) {
        this.y = groundY - this.size;
        this.vy = 0;
        this.onGround = true;
      }
      if (this.x < 0) { this.x = 0; this.vx = Math.abs(this.vx); }
      if (this.x > this.worldWidth) { this.x = this.worldWidth; this.vx = -Math.abs(this.vx); }
    }
    updateFirefly(ctxt) {
      const daylight = ctxt.daylight === undefined ? 0 : ctxt.daylight;
      // Fade out by day.
      this.alpha = 1 - daylight;
      this.wingPhase += 0.03;
      // Gentle wander.
      if (this.timer > this.dirChange) {
        this.vx = (Math.random() - 0.5) * 0.8;
        this.vy = (Math.random() - 0.5) * 0.6;
        this.dirChange = Math.random() * 120 + 60;
        this.timer = 0;
      }
      // Drawn toward nearby fireflies and lights at night.
      if (this.alpha > 0.2) {
        let tx = 0, ty = 0, n = 0;
        const neighbors = ctxt.neighbors || [];
        for (const o of neighbors) {
          if (o === this || o.type !== 'firefly') continue;
          const dx = o.x - this.x, dy = o.y - this.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 14400) { tx += o.x; ty += o.y; n++; }
        }
        const lights = ctxt.lights || [];
        for (const l of lights) {
          const dx = l.x - this.x, dy = l.y - this.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 40000) { tx += l.x * 2; ty += l.y * 2; n += 2; }
        }
        if (n > 0) {
          this.vx += ((tx / n) - this.x) * 0.001;
          this.vy += ((ty / n) - this.y) * 0.001;
        }
      }
      this.life = 0.5 + Math.sin(this.wingPhase * 2) * 0.3;
      this.x += this.vx;
      this.y += this.vy;
      if (this.x < 0) { this.x = 0; this.vx = -this.vx; }
      if (this.x > this.worldWidth) { this.x = this.worldWidth; this.vx = -this.vx; }
      if (this.y < 20) { this.y = 20; this.vy = -this.vy; }
      if (this.y > 400) { this.y = 400; this.vy = -this.vy; }
    }
    draw(ctx, cx, cy) {
      const sx = this.x - cx;
      const sy = this.y - cy;
      if (sx < -20 || sx > ctx.canvas.width + 20 || sy < -20 || sy > ctx.canvas.height + 20) return;
      ctx.save();
      if (this.type === 'bird') {
        const wing = Math.sin(this.wingPhase) * 4;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx - 6, sy + wing - 2);
        ctx.lineTo(sx - 3, sy + 1);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + 6, sy + wing - 2);
        ctx.lineTo(sx + 3, sy + 1);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#ffcc00';
        ctx.beginPath();
        ctx.arc(sx, sy + 1, 1, 0, Math.PI * 2);
        ctx.fill();
      } else if (this.type === 'firefly') {
        const fa = this.alpha === undefined ? 1 : this.alpha;
        if (fa <= 0.02) { ctx.restore(); return; }
        ctx.globalAlpha = this.life * 0.7 * fa;
        ctx.fillStyle = this.color;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(sx, sy, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
      } else {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(sx, sy, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#8a6a50';
        ctx.beginPath();
        ctx.arc(sx - 2, sy - 1, 1.5, 0, Math.PI * 2);
        ctx.arc(sx + 2, sy - 1, 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(sx - 2, sy - 1, 0.8, 0, Math.PI * 2);
        ctx.arc(sx + 2, sy - 1, 0.8, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  class WeatherParticle {
    constructor(type, worldWidth, worldHeight) {
      this.type = type;
      this.worldWidth = worldWidth;
      this.worldHeight = worldHeight;
      this.reset();
    }
    reset() {
      this.x = Math.random() * this.worldWidth;
      this.y = -10 - Math.random() * 100;
      if (this.type === 'rain') {
        this.vx = 0.5 + Math.random() * 1;
        this.vy = 4 + Math.random() * 6;
        this.length = 8 + Math.random() * 8;
        this.life = 1;
      } else {
        this.vx = (Math.random() - 0.5) * 0.5;
        this.vy = 1 + Math.random() * 2;
        this.size = 2 + Math.random() * 3;
        this.life = 1;
        this.swing = Math.random() * 0.3;
      }
    }
    update() {
      this.x += this.vx;
      this.y += this.vy;
      if (this.type === 'snow') {
        this.x += Math.sin(this.y * this.swing) * 0.3;
      }
      if (this.y > this.worldHeight + 20) this.reset();
    }
    draw(ctx, cx, cy) {
      const sx = this.x - cx;
      const sy = this.y - cy;
      if (sx < -20 || sx > ctx.canvas.width + 20 || sy < -20 || sy > ctx.canvas.height + 20) return;
      if (this.type === 'rain') {
        ctx.strokeStyle = 'rgba(180, 200, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx - this.vx * 3, sy + this.length);
        ctx.stroke();
      } else {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.beginPath();
        ctx.arc(sx, sy, this.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  class WorldParticle {
    constructor(worldWidth, worldHeight) {
      this.ww = worldWidth;
      this.wh = worldHeight;
      this.reset();
    }
    reset() {
      this.x = Math.random() * this.ww;
      this.y = Math.random() * this.wh;
      this.vx = (Math.random() - 0.5) * 0.3;
      this.vy = -Math.random() * 0.5 - 0.2;
      this.size = Math.random() * 3 + 1;
      this.l = Math.random() * 0.5 + 0.5;
      this.d = Math.random() * 0.003 + 0.001;
      this.color = CFG.COLORS[Math.floor(Math.random() * CFG.COLORS.length)];
    }
    update() {
      this.x += this.vx;
      this.y += this.vy;
      this.l -= this.d;
      if (this.l <= 0 || this.y < -50) { this.reset(); this.y = this.wh + 10; }
    }
    draw(ctx, cx, cy) {
      ctx.globalAlpha = this.l * 0.4;
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(this.x - cx, this.y - cy, this.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  const PLAYER_ROSTER = [
    { name: 'Sweaty', color: '#4ecdc4', style: 'sweaty' },
    { name: 'Grit', color: '#e67e22', style: 'miner' },
    { name: 'Bramble', color: '#6abf4b', style: 'scout' },
    { name: 'Nimbus', color: '#b8a9ff', style: 'cloud' }
  ];

  class Player {
    constructor(x, y, slot = 0) {
      this.x = x;
      this.y = y;
      this.slot = slot;
      this.profile = PLAYER_ROSTER[slot] || PLAYER_ROSTER[0];
      this.vx = 0;
      this.vy = 0;
      this.w = CFG.PLAYER_W;
      this.h = CFG.PLAYER_H;
      this.onGround = false;
      this.wasOnGround = true;
      this.isMoving = false;
      this.facing = 1;
      this.walkFrame = 0;
      this.canDoubleJump = true;
      this.portalCooldown = 0;
      this.landDust = 0;
      this.hasShovel = false;
      this.shovelTier = 0;
      this.digCooldown = 0;
      this.maxShovelDurability = 120;
      this.shovelDurability = 0;
      this.maxWater = 100;
      this.water = 100;
      this.maxFreeze = 100;
      this.freeze = 0;
      this.sticks = 0;
      this.deathFlash = 0;
      this.wallSide = 0;
      this.wallGrabTimer = 0;
      this._wallJumpIgnore = 0;
      this._coyote = 0;
      this._jumpBuffer = 0;
      this._jumpHeld = false;
      this._digTarget = null;
      this._rubProgress = 0;
      this.lastCheckpoint = null;
      this.trinkets = 0;
    }

    tryJump(_keys) {
      if (this.wallSide !== 0) {
        this.vy = CFG.JUMP_FORCE * 0.92;
        this.vx = -this.wallSide * CFG.WALL_KICK_SPEED;
        this.facing = -this.wallSide;
        this._wallJumpIgnore = CFG.WALL_JUMP_IGNORE_FRAMES;
        this.wallSide = 0;
        this.wallGrabTimer = 0;
        this.onGround = false;
        this.canDoubleJump = true;
        this._coyote = 0;
        this._jumpBuffer = 0;
        return true;
      }
      const grounded = this.onGround || this._coyote > 0;
      if (grounded) {
        this.vy = CFG.JUMP_FORCE;
        this.onGround = false;
        this.canDoubleJump = true;
        this._coyote = 0;
        this._jumpBuffer = 0;
        return true;
      }
      if (this.canDoubleJump) {
        this.vy = CFG.JUMP_FORCE * CFG.DOUBLE_JUMP_MULT;
        this.canDoubleJump = false;
        this._jumpBuffer = 0;
        return true;
      }
      return false;
    }

    update(keys, heights, platforms, portals, chests, caves, time, heavenHeights) {
      const rubbing = keys.r && this.sticks >= CFG.FIRE_STICKS_REQUIRED;
      const moveX = rubbing ? 0 : ((keys.left || keys.a) ? -1 : (keys.right || keys.d) ? 1 : 0);

      if (this._wallJumpIgnore > 0) this._wallJumpIgnore--;

      const jumpKey = keys.jump ?? (keys.up || keys.w || keys.space);
      if (keys.jumpPressed) {
        if (!this.tryJump(keys)) this._jumpBuffer = CFG.JUMP_BUFFER_FRAMES;
      } else if (jumpKey && !this._jumpHeld) {
        if (!this.tryJump(keys)) this._jumpBuffer = CFG.JUMP_BUFFER_FRAMES;
        this._jumpHeld = true;
      }
      if (!jumpKey) this._jumpHeld = false;

      if (moveX !== 0) {
        this.vx = moveX * CFG.MOVE_SPEED;
        this.facing = moveX > 0 ? 1 : -1;
        this.isMoving = true;
      } else if (this.wallSide === 0) {
        this.vx *= rubbing ? 0.3 : 0.75;
        if (Math.abs(this.vx) < 0.2) this.vx = 0;
        this.isMoving = false;
      } else {
        this.vx = 0;
        this.isMoving = false;
      }

      this.vy += CFG.GRAVITY;
      if (this.vy > CFG.MAX_FALL_SPEED) this.vy = CFG.MAX_FALL_SPEED;

      this.wasOnGround = this.onGround;
      this.onGround = false;

      // --- horizontal move + cave-wall resolution ---
      this.x += this.vx;
      const midY = this.y + this.h / 2;
      if (this.vx > 0 && isRockAt(caves, heights, this.x + this.w, midY, heavenHeights)) {
        let g = 0;
        while (isRockAt(caves, heights, this.x + this.w, midY, heavenHeights) && g++ < 48) this.x -= 1;
        this.vx = 0;
        if (!this.onGround && this._wallJumpIgnore === 0) this.wallSide = 1;
      } else if (this.vx < 0 && isRockAt(caves, heights, this.x, midY, heavenHeights)) {
        let g = 0;
        while (isRockAt(caves, heights, this.x, midY, heavenHeights) && g++ < 48) this.x += 1;
        this.vx = 0;
        if (!this.onGround && this._wallJumpIgnore === 0) this.wallSide = -1;
      }

      // --- vertical move + surface/cave/heaven floor & ceiling resolution ---
      this.y += this.vy;
      const cxp = this.x + this.w / 2;
      if (this.vy >= 0) {
        if (isRockAt(caves, heights, cxp, this.y + this.h, heavenHeights)) {
          let g = 0;
          while (isRockAt(caves, heights, cxp, this.y + this.h, heavenHeights) && g++ < 240) this.y -= 1;
          this.vy = 0;
          this.onGround = true;
          this.canDoubleJump = true;
          this.wallSide = 0;
          this.wallGrabTimer = 0;
          if (!this.wasOnGround) this.landDust = 8;
        }
      } else if (isRockAt(caves, heights, cxp, this.y, heavenHeights)) {
        let g = 0;
        while (isRockAt(caves, heights, cxp, this.y, heavenHeights) && g++ < 240) this.y += 1;
        this.vy = 0;
      }

      for (const plat of platforms) {
        const py = platformY(plat, time || 0);
        if (this.x + this.w > plat.x && this.x < plat.x + plat.w &&
            this.y + this.h > py && this.y + this.h < py + plat.h + this.vy + 2 &&
            this.vy >= 0) {
          this.y = py - this.h;
          this.vy = 0;
          this.onGround = true;
          this.canDoubleJump = true;
          this.wallSide = 0;
          this.wallGrabTimer = 0;
          if (!this.wasOnGround) this.landDust = 6;
        }
      }

      // Wall grab & slide — stick to cave walls in air, then jump to kick off.
      if (!this.onGround && this._wallJumpIgnore === 0) {
        const touchL = touchesWall(caves, heights, this.x, this.y, this.w, this.h, -1, heavenHeights);
        const touchR = touchesWall(caves, heights, this.x, this.y, this.w, this.h, 1, heavenHeights);
        if (touchL && !touchR) this.wallSide = -1;
        else if (touchR && !touchL) this.wallSide = 1;
        else if (touchL && touchR) this.wallSide = moveX !== 0 ? moveX : this.facing;
        else if (!touchL && !touchR) this.wallSide = 0;
      }

      if (this.wallSide !== 0 && !this.onGround) {
        this.wallGrabTimer++;
        const holdToward = (this.wallSide < 0 && (keys.left || keys.a)) ||
                           (this.wallSide > 0 && (keys.right || keys.d));
        if (holdToward || this.wallGrabTimer <= CFG.WALL_GRAB_FRAMES) {
          this.vy = Math.min(this.vy, CFG.WALL_SLIDE_SPEED);
          this.vx = 0;
          this.facing = this.wallSide;
        } else {
          this.wallSide = 0;
          this.wallGrabTimer = 0;
        }
      } else if (this.onGround) {
        this.wallSide = 0;
        this.wallGrabTimer = 0;
      }

      if (this.x < 0) { this.x = 0; this.vx = 0; }
      if (this.x + this.w > CFG.WORLD_WIDTH) { this.x = CFG.WORLD_WIDTH - this.w; this.vx = 0; }
      if (CFG.HEAVEN_ENABLED && this.y < heavenCamMinY() - 60) {
        this.y = heavenCamMinY() - 60;
        this.vy = 0;
      }
      if (this.y > CFG.WORLD_HEIGHT + 200) { this.y = 200; this.vy = 0; }

      if (this.isMoving && this.onGround) this.walkFrame += 0.12;
      else if (this.onGround) this.walkFrame = 0;

      if (this.portalCooldown > 0) this.portalCooldown--;
      if (this.landDust > 0) this.landDust--;
      if (this.digCooldown > 0) this.digCooldown--;

      if (this.onGround) {
        this._coyote = CFG.COYOTE_FRAMES;
        if (this._jumpBuffer > 0) {
          this.tryJump(keys);
          this._jumpBuffer = 0;
        }
      } else if (this._coyote > 0) {
        this._coyote--;
      }
      if (this._jumpBuffer > 0 && !this.onGround) this._jumpBuffer--;

      for (const p of portals) {
        const dx = (this.x + this.w / 2) - p.x;
        const dy = (this.y + this.h / 2) - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < p.radius + 15) { p.activated = true; p.glowIntensity = Math.min(1, p.glowIntensity + 0.05); }
        else { p.glowIntensity = Math.max(0, p.glowIntensity - 0.02); if (dist > p.radius + 60) p.activated = false; }
      }

      for (const c of chests) {
        const dx = (this.x + this.w / 2) - c.x;
        const dy = (this.y + this.h / 2) - c.y;
        if (Math.sqrt(dx * dx + dy * dy) < 30) c.nearby = true;
        else c.nearby = false;
      }
    }

    shadeColor(color, amount) {
      const num = parseInt(color.replace('#', ''), 16);
      const r = Math.min(255, Math.max(0, (num >> 16) + Math.round(amount * 255)));
      const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + Math.round(amount * 255)));
      const b = Math.min(255, Math.max(0, (num & 0x0000FF) + Math.round(amount * 255)));
      return `rgb(${r},${g},${b})`;
    }

    draw(ctx, cx, cy, playerColor) {
      const sx = this.x - cx;
      const sy = this.y - cy;
      const profile = this.profile || PLAYER_ROSTER[0];
      const bodyColor = playerColor || profile.color || '#4ecdc4';
      const darkBodyColor = this.shadeColor(bodyColor, -0.4);
      ctx.save();

      if (this.wallSide !== 0 && !this.onGround) {
        ctx.translate(this.wallSide * 2, 0);
      }

      if (this.landDust > 0) {
        ctx.fillStyle = `rgba(200, 180, 150, ${this.landDust / 12})`;
        for (let i = 0; i < 3; i++) {
          const dx = (i - 1) * 4 + Math.random() * 2;
          ctx.beginPath();
          ctx.arc(sx + this.w / 2 + dx, sy + this.h, 2 + Math.random() * 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      const legAnim = this.isMoving && this.onGround ? Math.sin(this.walkFrame * 2) * 3 : 0;
      const style = profile.style || 'sweaty';

      if (style === 'miner') {
        ctx.fillStyle = '#3d2817';
        ctx.fillRect(sx + 3, sy + this.h - 6, 5, 6 + legAnim);
        ctx.fillRect(sx + this.w - 8, sy + this.h - 6, 5, 6 - legAnim);
        ctx.fillStyle = bodyColor;
        ctx.fillRect(sx + 1, sy + 12, this.w - 2, this.h - 16);
        ctx.fillStyle = '#ffd479';
        ctx.fillRect(sx - 2, sy - 1, this.w + 4, 7);
        ctx.fillRect(sx + 1, sy - 4, this.w - 2, 4);
        ctx.fillStyle = '#2a2a2a';
        ctx.fillRect(sx + 2, sy + 4, this.w - 4, 4);
        ctx.fillStyle = '#88ccff';
        ctx.fillRect(sx + 4, sy + 5, 4, 2);
        ctx.fillRect(sx + this.w - 8, sy + 5, 4, 2);
      } else if (style === 'scout') {
        ctx.fillStyle = darkBodyColor;
        ctx.fillRect(sx + 3, sy + this.h - 6, 5, 6 + legAnim);
        ctx.fillRect(sx + this.w - 8, sy + this.h - 6, 5, 6 - legAnim);
        ctx.fillStyle = bodyColor;
        ctx.fillRect(sx + 1, sy + 11, this.w - 2, this.h - 15);
        ctx.fillStyle = '#2e5a28';
        ctx.beginPath();
        ctx.moveTo(sx + this.w / 2, sy - 6);
        ctx.lineTo(sx - 1, sy + 8);
        ctx.lineTo(sx + this.w + 1, sy + 8);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#96ceb4';
        ctx.beginPath();
        ctx.ellipse(sx + this.w + 1, sy + 14, 4, 7, 0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#dff0d8';
        const eyeX = this.facing === 1 ? sx + this.w - 7 : sx + 4;
        ctx.fillRect(eyeX, sy + 5, 4, 3);
        ctx.fillRect(eyeX + 6, sy + 5, 4, 3);
      } else if (style === 'cloud') {
        ctx.fillStyle = '#9f8fef';
        ctx.fillRect(sx + 3, sy + this.h - 5, 5, 5 + legAnim);
        ctx.fillRect(sx + this.w - 8, sy + this.h - 5, 5, 5 - legAnim);
        ctx.fillStyle = bodyColor;
        ctx.fillRect(sx + 2, sy + 12, this.w - 4, this.h - 15);
        ctx.fillStyle = 'rgba(255,255,255,0.95)';
        ctx.beginPath();
        ctx.ellipse(sx + this.w / 2 - 4, sy + 2, 9, 6, 0, 0, Math.PI * 2);
        ctx.ellipse(sx + this.w / 2 + 5, sy + 4, 7, 5, 0, 0, Math.PI * 2);
        ctx.ellipse(sx + this.w / 2 - 1, sy + 6, 8, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#5b7cfa';
        const eyeX = this.facing === 1 ? sx + this.w - 7 : sx + 4;
        ctx.fillRect(eyeX, sy + 8, 4, 3);
        ctx.fillRect(eyeX + 6, sy + 8, 4, 3);
      } else {
        // Sweaty — default explorer, always glistening.
        ctx.fillStyle = darkBodyColor;
        ctx.fillRect(sx + 3, sy + this.h - 6, 5, 6 + legAnim);
        ctx.fillRect(sx + this.w - 8, sy + this.h - 6, 5, 6 - legAnim);
        ctx.fillStyle = bodyColor;
        ctx.fillRect(sx + 1, sy + 10, this.w - 2, this.h - 14);
        ctx.fillStyle = this.shadeColor(bodyColor, 0.15);
        ctx.fillRect(sx + 3, sy + 12, this.w - 6, 5);
        ctx.fillStyle = '#ff6b6b';
        ctx.fillRect(sx + 1, sy + 1, this.w - 2, 3);
        ctx.fillStyle = '#2a9d8f';
        ctx.fillRect(sx + 2, sy + 3, this.w - 4, 6);
        const drip = Math.sin(this.walkFrame * 3) * 2;
        ctx.fillStyle = 'rgba(69,183,209,0.85)';
        ctx.fillRect(sx + 4, sy + 9 + drip, 2, 3);
        ctx.fillRect(sx + this.w - 7, sy + 11 - drip, 2, 3);
        ctx.fillRect(sx + this.w / 2, sy + 16 + drip * 0.5, 2, 4);
        ctx.fillStyle = '#ff6b6b';
        ctx.fillRect(sx + this.w / 2 - 4, sy + 14, 8, 3);
      }

      if (style !== 'cloud' && style !== 'scout' && style !== 'miner') {
        ctx.fillStyle = '#ffffff';
        const eyeX = this.facing === 1 ? sx + this.w - 7 : sx + 4;
        ctx.fillRect(eyeX, sy + 3, 5, 4);
        ctx.fillRect(eyeX + 6, sy + 3, 5, 4);
        ctx.fillStyle = '#0d0d14';
        ctx.fillRect(eyeX + 1, sy + 4, 2, 2);
        ctx.fillRect(eyeX + 7, sy + 4, 2, 2);
      } else if (style === 'miner') {
        ctx.fillStyle = '#0d0d14';
        const eyeX = this.facing === 1 ? sx + this.w - 7 : sx + 4;
        ctx.fillRect(eyeX + 1, sy + 5, 2, 2);
        ctx.fillRect(eyeX + 7, sy + 5, 2, 2);
      } else if (style === 'scout') {
        ctx.fillStyle = '#1a3020';
        const eyeX = this.facing === 1 ? sx + this.w - 7 : sx + 4;
        ctx.fillRect(eyeX + 1, sy + 6, 2, 2);
        ctx.fillRect(eyeX + 7, sy + 6, 2, 2);
      } else if (style === 'cloud') {
        ctx.fillStyle = '#1a2040';
        const eyeX = this.facing === 1 ? sx + this.w - 7 : sx + 4;
        ctx.fillRect(eyeX + 1, sy + 9, 2, 2);
        ctx.fillRect(eyeX + 7, sy + 9, 2, 2);
      }

      if (this.isTyping) {
        const tf = this.typeFrame || 0;
        ctx.fillStyle = bodyColor;
        const armY = sy + 16;
        ctx.fillRect(sx + this.w - 2, armY + Math.sin(tf) * 1.5, 6, 3);
        ctx.fillRect(sx - 4, armY + Math.sin(tf + 1.7) * 1.5, 6, 3);
      }

      ctx.restore();
    }
  }

  class WorldEngine {
    constructor(canvasId, options = {}) {
      this.canvas = typeof canvasId === 'string' ? document.getElementById(canvasId) : canvasId;
      this.ctx = this.canvas.getContext('2d');
      this.isRunning = false;
      this.lastTime = 0;
      this.deltaTime = 0;
      this.mode = options.mode || 'world';
      this.interactive = options.interactive !== false;
      this.twoPlayer = options.twoPlayer === true;
      const rawCount = options.playerCount ?? (this.twoPlayer ? 2 : 1);
      this.playerCount = Math.min(4, Math.max(1, rawCount | 0));
      this.onEscape = options.onEscape || null;
      this.onSettingsOpen = options.onSettingsOpen || options.onEscape || null;
      this.onSettingsToggle = options.onSettingsToggle || null;
      this.keys = {
        jumpPressed: false,
        jumpPressed0: false,
        jumpPressed1: false,
        jumpPressed2: false,
        jumpPressed3: false
      };
      this.players = [];
      this._playerColors = PLAYER_ROSTER.map((p) => p.color);
      this._playerDigKeys = ['f', 'p2dig', 'p3dig', 'p4dig'];
      this._playerRubHints = ['R', ',', '[', 'Num3'];
      this._playerDigLabels = [
        '🪏 F: dig · S+F: down',
        '🪏 .: dig · ↓+.: down',
        '🪏 ]: dig · K+]: down',
        '🪏 Num1: dig · Num2+Num1: down'
      ];
      this.cameraX = 0;
      this.cameraY = 0;
      this.interactables = [];
      this.time = 0;
      this.stars = [];
      this.bgMountains = [];
      this.timeOfDay = 0.3;
      this.weatherState = 'clear';
      this.weatherTimer = 0;
      this.weatherParticles = [];
      this.showMinimap = true;
      this.forcedBiome = null;
      this._biomePalette = null;
      this._skyTopR = this._skyTopG = this._skyTopB = null;
      this._skyBotR = this._skyBotG = this._skyBotB = null;
      this._groundTopR = this._groundTopG = this._groundTopB = null;
      this._groundBotR = this._groundBotG = this._groundBotB = null;
      this._playerColor = null;
      // Native integration (Electron): real Desktop files as portals + terminal.
      this.computerMode = false;
      this.terminalPortal = null;
      this.computerGrow = 0;
      this.onFileOpen = null;
      this.onTerminalEnter = null;
      this.onTerminalExit = null;
      this.init();
    }

    // Wire callbacks that reach the real machine. Safe to call with partial sets.
    setNativeHandlers(handlers = {}) {
      if (handlers.onFileOpen) this.onFileOpen = handlers.onFileOpen;
      if (handlers.onTerminalEnter) this.onTerminalEnter = handlers.onTerminalEnter;
      if (handlers.onTerminalExit) this.onTerminalExit = handlers.onTerminalExit;
    }

    _extColor(ext, isDir) {
      if (isDir) return '#ffd479';
      const map = {
        txt: '#dfe6e9', md: '#dfe6e9', pdf: '#ff6b6b', doc: '#45b7d1', docx: '#45b7d1',
        png: '#96ceb4', jpg: '#96ceb4', jpeg: '#96ceb4', gif: '#96ceb4', svg: '#96ceb4',
        mp3: '#6c5ce7', wav: '#6c5ce7', mp4: '#e056a0', mov: '#e056a0',
        zip: '#ffeaa7', js: '#ffeaa7', ts: '#45b7d1', json: '#ffeaa7', sh: '#4ecdc4',
        py: '#4ecdc4', html: '#ff9f6b', css: '#45b7d1'
      };
      return map[ext] || '#4ecdc4';
    }

    _makeTerminalPortal() {
      const x = 320;
      const ty = getTerrainY(this.terrain, x);
      return {
        x, y: ty - 60, radius: 26, kind: 'terminal',
        label: 'Terminal', color: '#4ecdc4',
        pulse: Math.random() * Math.PI * 2, activated: false, glowIntensity: 0
      };
    }

    // Replace the procedural portals with one Terminal portal + a portal per
    // real Desktop file. `files` = [{ name, path, isDir, ext }].
    setNativeFiles(files) {
      if (!Array.isArray(files)) return;
      const list = files
        .slice()
        .sort((a, b) => {
          if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
          return String(a.name).localeCompare(String(b.name));
        })
        .slice(0, 30);
      const portals = [];
      const term = this._makeTerminalPortal();
      this.terminalPortal = term;
      portals.push(term);
      const span = CFG.WORLD_WIDTH - 900;
      list.forEach((f, i) => {
        const x = 600 + (list.length > 1 ? (i / (list.length - 1)) * span : span * 0.5);
        const ty = getTerrainY(this.terrain, x);
        portals.push({
          x, y: ty - 48, radius: 18, kind: 'file',
          filePath: f.path, isDir: f.isDir,
          label: f.name.length > 14 ? f.name.slice(0, 13) + '…' : f.name,
          ext: f.ext || (f.isDir ? 'dir' : ''),
          color: this._extColor(f.ext, f.isDir),
          pulse: Math.random() * Math.PI * 2, activated: false, glowIntensity: 0
        });
      });
      this.portals = portals;
    }

    _bootstrapNativeDesktop() {
      if (typeof window === 'undefined' || !window.deepiriNative) return;
      const nat = window.deepiriNative;
      if (!this.onFileOpen) {
        this.setNativeHandlers({
          onFileOpen: (p) => nat.openPath(p),
          onTerminalEnter: this.onTerminalEnter || (() => {}),
          onTerminalExit: this.onTerminalExit || (() => {})
        });
      }
      if (!nat.listDesktop) return;
      nat.listDesktop().then((files) => {
        if (Array.isArray(files) && !files.error) this.setNativeFiles(files);
      });
    }

    enterComputer() {
      if (this.computerMode) return;
      this.computerMode = true;
      this.showInteraction('Terminal', '#4ecdc4');
      if (this.onTerminalEnter) this.onTerminalEnter();
    }

    exitComputer() {
      if (!this.computerMode) return;
      this.computerMode = false;
      if (this.onTerminalExit) this.onTerminalExit();
    }

    init() {
      this.resize();
      this.terrain = generateTerrain(CFG.WORLD_WIDTH);
      this.caves = generateCaves(this.terrain);
      const basePlatforms = generatePlatforms(this.terrain);
      this.heavenTerrain = generateHeavenTerrain(this.terrain);
      const pickupSpread = createPickupSpreader();
      const ascentPlatforms = generateAscentPlatforms(this.terrain, this.caves.entrances);
      const cloudPlatforms = generateCloudPlatforms(this.terrain, this.heavenTerrain);
      const heavenRealm = generateHeavenRealmContent(this.heavenTerrain, pickupSpread);
      this.platforms = basePlatforms.concat(ascentPlatforms, cloudPlatforms, heavenRealm.platforms);
      this.heavenTrees = generateHeavenTrees(this.heavenTerrain);
      this.heavenProps = heavenRealm.props;
      this.portals = (typeof window !== 'undefined' && window.deepiriNative)
        ? [this._makeTerminalPortal()]
        : generatePortals(this.terrain);
      const surfacePlacer = createSurfacePickupPlacer(pickupSpread);
      this.chests = generateChests(this.terrain, pickupSpread, surfacePlacer)
        .concat(heavenRealm.chests);
      this.crystals = generateCrystals(this.terrain, pickupSpread, surfacePlacer)
        .concat(heavenRealm.crystals);
      this.shovels = generateShovels(this.terrain, pickupSpread, surfacePlacer)
        .concat(generateCaveShovels(this.caves, this.terrain, this.heavenTerrain, pickupSpread))
        .concat(placeCelestialShovels(
          this.caves, this.terrain, this.heavenTerrain, pickupSpread, cloudPlatforms
        ));
      this.stickPickups = generateSticks(this.terrain, pickupSpread, surfacePlacer)
        .concat(generateCaveSticks(this.caves, this.terrain, this.heavenTerrain, pickupSpread));
      this.fires = [];
      this.heat = 0;
      const layout = layoutCaveProps(this.caves, this.terrain, this.heavenTerrain, pickupSpread);
      this.caveChests = layout.caveChests;
      this.buckets = layout.buckets;
      this.checkpoints = generateCheckpoints(this.terrain, this.caves, this.heavenTerrain);
      this.mapItems = generateMapItems(this.terrain, this.caves, this.heavenTerrain, pickupSpread);

      const startY = getTerrainY(this.terrain, 100);
      this.players = [];
      for (let i = 0; i < this.playerCount; i++) {
        this.players.push(new Player(100 + i * 35, startY - CFG.PLAYER_H - 5, i));
      }
      this.player = this.players[0];

      this.particles = [];
      for (let i = 0; i < CFG.PARTICLE_COUNT; i++) {
        this.particles.push(new WorldParticle(CFG.WORLD_WIDTH, CFG.WORLD_HEIGHT));
      }

      this.creatures = [];
      for (let i = 0; i < CFG.CREATURE_COUNT; i++) {
        this.creatures.push(new Creature(CFG.WORLD_WIDTH, CFG.WORLD_HEIGHT, this.terrain));
      }
      if (CFG.HEAVEN_ENABLED) {
        this.creatures.push(...spawnHeavenCreatures(CFG.WORLD_WIDTH, this.heavenTerrain));
      }

      this.generateStars();
      this.generateBgMountains();

      if (this.interactive) this.setupInput();
      window.addEventListener('resize', () => this.resize());
      this._bootstrapNativeDesktop();
    }

    generateStars() {
      this.stars = [];
      for (let i = 0; i < 150; i++) {
        this.stars.push({
          x: Math.random() * CFG.WORLD_WIDTH,
          y: Math.random() * CFG.SURFACE_BASE * 0.6,
          sz: Math.random() * 2 + 0.5,
          tw: Math.random() * Math.PI * 2,
          sp: Math.random() * 0.02 + 0.01
        });
      }
    }

    generateBgMountains() {
      this.bgMountains = [];
      for (let i = 0; i < 10; i++) {
        const pts = [];
        for (let j = 0; j <= 30; j++) {
          const xx = (i / 10) * CFG.WORLD_WIDTH + (j / 30) * (CFG.WORLD_WIDTH / 10) + (CFG.WORLD_WIDTH / 10) * 0.1;
          const yy = CFG.SURFACE_BASE * 0.5 + Math.sin(j * 0.5 + i * 2) * 60 + Math.sin(j * 1.3 + i) * 30;
          pts.push({ x: xx, y: yy });
        }
        this.bgMountains.push({ p: pts, color: `hsl(${240 + i * 4}, 20%, ${10 + i * 2}%)`, par: 0.1 + i * 0.025 });
      }
    }

    playersCenter() {
      let x = 0, y = 0;
      for (const p of this.players) {
        x += p.x + p.w / 2;
        y += p.y + p.h / 2;
      }
      const n = this.players.length;
      return { x: x / n, y: y / n };
    }

    _isNumpadKey(e) {
      return e.location === 3 || (e.code && e.code.startsWith('Numpad'));
    }

    _handleP4Numpad(e, down) {
      const code = e.code;
      if (!code || !code.startsWith('Numpad')) return false;
      if (['Numpad8', 'Numpad2', 'Numpad4', 'Numpad6', 'Numpad0'].includes(code)) {
        e.preventDefault();
      }
      switch (code) {
        case 'Numpad8':
          this._setMultiKey('np8', down);
          if (down) this.keys.jumpPressed3 = true;
          return true;
        case 'Numpad4':
          this._setMultiKey('np4', down);
          return true;
        case 'Numpad2':
          this._setMultiKey('np2', down);
          return true;
        case 'Numpad6':
          this._setMultiKey('np6', down);
          return true;
        case 'Numpad0':
          this._setMultiKey('np0', down);
          if (down) this.keys.jumpPressed3 = true;
          return true;
        case 'Numpad1':
          if (down) e.preventDefault();
          this._setMultiKey('p4dig', down);
          return true;
        case 'Numpad3':
          if (down) e.preventDefault();
          this._setMultiKey('p4rub', down);
          return true;
        default:
          return false;
      }
    }

    _playerName(index) {
      return (this.players[index]?.profile?.name) || PLAYER_ROSTER[index]?.name || ('P' + (index + 1));
    }

    playerKeys(index) {
      if (this.playerCount <= 1) return this.keys;
      const k = this.keys;
      switch (index) {
        case 0:
          return {
            left: k.a, right: k.d, down: k.s, up: k.w,
            a: k.a, d: k.d, s: k.s, w: k.w,
            jump: k.space || k.w,
            jumpPressed: k.jumpPressed0,
            r: k.r
          };
        case 1:
          return {
            left: k.left, right: k.right, down: k.down, up: k.up,
            jump: k.up || k.ctrlRight,
            jumpPressed: k.jumpPressed1,
            r: k.p2rub
          };
        case 2:
          return {
            left: k.j, right: k.l, down: k.k, up: k.i,
            i: k.i, j: k.j, k: k.k, l: k.l,
            jump: k.i || k.equal,
            jumpPressed: k.jumpPressed2,
            r: k.p3rub
          };
        case 3:
          return {
            left: k.np4, right: k.np6, down: k.np2, up: k.np8,
            jump: k.np8 || k.np0,
            jumpPressed: k.jumpPressed3,
            r: k.p4rub
          };
        default:
          return k;
      }
    }

    _setMultiKey(name, down) {
      this.keys[name] = down;
    }

    _handleMultiplayerKey(e, down) {
      const key = e.key.toLowerCase();
      const code = e.code;

      if (down) {
        if (key === 'e') { this.interactWithPortal(); return; }
        if (key === 'm') { this.showMinimap = !this.showMinimap; return; }
      }

      // P4 numpad must be handled before P2 arrows — with NumLock off the numpad
      // sends Arrow* key names that would otherwise steer player 2.
      if (this.playerCount >= 4 && this._isNumpadKey(e)) {
        if (this._handleP4Numpad(e, down)) return;
      }

      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(e.key)) e.preventDefault();

      // P1 — WASD + Space (+ W jumps)
      if (key === 'a' || key === 'd' || key === 's') {
        this._setMultiKey(key, down);
        return;
      }
      if (key === 'w') {
        this._setMultiKey('w', down);
        if (down) this.keys.jumpPressed0 = true;
        return;
      }
      if (key === ' ' || code === 'Space') {
        this._setMultiKey('space', down);
        if (down) this.keys.jumpPressed0 = true;
        return;
      }
      if (key === 'f') { if (down) e.preventDefault(); this._setMultiKey('f', down); return; }
      if (key === 'r') { if (down) e.preventDefault(); this._setMultiKey('r', down); return; }

      // P2 — Arrows (↑ jumps) + Right Ctrl
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
        this._setMultiKey(key.replace('arrow', ''), down);
        if (down && key === 'arrowup') this.keys.jumpPressed1 = true;
        return;
      }
      if (code === 'ControlRight') {
        this._setMultiKey('ctrlRight', down);
        if (down) this.keys.jumpPressed1 = true;
        return;
      }
      if (key === '.') { if (down) e.preventDefault(); this._setMultiKey('p2dig', down); return; }
      if (key === ',') { if (down) e.preventDefault(); this._setMultiKey('p2rub', down); return; }

      // P3 — IJKL (↑/I jumps) + =
      if (key === 'j' || key === 'k' || key === 'l') {
        this._setMultiKey(key, down);
        return;
      }
      if (key === 'i') {
        this._setMultiKey('i', down);
        if (down) this.keys.jumpPressed2 = true;
        return;
      }
      if (key === '=' || key === '+') {
        this._setMultiKey('equal', down);
        if (down) this.keys.jumpPressed2 = true;
        return;
      }
      if (key === ']') { if (down) e.preventDefault(); this._setMultiKey('p3dig', down); return; }
      if (key === '[') { if (down) e.preventDefault(); this._setMultiKey('p3rub', down); }
    }

    nearestPlayer(x, y) {
      let best = this.players[0];
      let bestD = Infinity;
      for (const p of this.players) {
        const px = p.x + p.w / 2;
        const py = p.y + p.h / 2;
        const d = (px - x) * (px - x) + (py - y) * (py - y);
        if (d < bestD) { bestD = d; best = p; }
      }
      return best;
    }

    setupInput() {
      this.teardownInput();

      const onKeyDown = (e) => {
        const key = e.key.toLowerCase();
        // In computer mode the keyboard belongs to the terminal — don't steer
        // the player. Escape leaves the computer.
        if (this.computerMode) {
          if (key === 'escape') this.exitComputer();
          return;
        }
        if (key === 'escape' && this.onSettingsToggle) {
          e.preventDefault();
          e.stopImmediatePropagation();
          this.onSettingsToggle();
          return;
        }
        if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(e.key)) e.preventDefault();
        if (this.playerCount > 1) {
          this._handleMultiplayerKey(e, true);
          return;
        }
        if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
          this.keys[key.replace('arrow', '')] = true;
          if (key === 'arrowup') this.keys.jumpPressed = true;
        }
        else if (key === 'f') { e.preventDefault(); this.keys.f = true; }
        else if (key === 'r') { e.preventDefault(); this.keys.r = true; }
        else if (key === ' ' || key === 'w' || key === 'a' || key === 's' || key === 'd' || key === 'e' || key === 'm') {
          if (key === 'e') this.interactWithPortal();
          else if (key === 'm') this.showMinimap = !this.showMinimap;
          else {
            this.keys[key === ' ' ? 'space' : key] = true;
            if (key === ' ' || key === 'w') this.keys.jumpPressed = true;
          }
        }
      };

      const onKeyUp = (e) => {
        const key = e.key.toLowerCase();
        if (this.playerCount > 1) {
          this._handleMultiplayerKey(e, false);
          return;
        }
        if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) this.keys[key.replace('arrow', '')] = false;
        else if (key === ' ' || key === 'w' || key === 'a' || key === 's' || key === 'd' || key === 'f' || key === 'r') this.keys[key === ' ' ? 'space' : key] = false;
      };

      const onClick = (e) => {
        const rect = this.canvas.getBoundingClientRect();
        const sx = e.clientX - rect.left;
        const sy = e.clientY - rect.top;
        if (this.onSettingsOpen && this._settingsBtnRect) {
          const r = this._settingsBtnRect;
          if (sx >= r.x && sx <= r.x + r.w && sy >= r.y && sy <= r.y + r.h) {
            this.onSettingsOpen();
            return;
          }
        }
        const mx = e.clientX - rect.left + this.cameraX;
        const my = e.clientY - rect.top + this.cameraY;
        for (const p of this.portals) {
          const dx = mx - p.x, dy = my - p.y;
          if (Math.sqrt(dx * dx + dy * dy) < p.radius + 20) this.activatePortal(p);
        }
        for (const c of this.chests) {
          const dx = mx - c.x, dy = my - c.y;
          if (Math.sqrt(dx * dx + dy * dy) < 25) {
            c.open = !c.open;
            this.showInteraction(c.open ? 'Opened!' : 'Closed', '#c49040');
          }
        }
        this.spawnBurst(e.clientX - rect.left, e.clientY - rect.top);
      };

      const onMouseMove = (e) => {
        const rect = this.canvas.getBoundingClientRect();
        this.mouseX = e.clientX - rect.left;
        this.mouseY = e.clientY - rect.top;
      };

      this._inputHandlers = { onKeyDown, onKeyUp, onClick, onMouseMove };
      document.addEventListener('keydown', onKeyDown);
      document.addEventListener('keyup', onKeyUp);
      this.canvas.addEventListener('click', onClick);
      this.canvas.addEventListener('mousemove', onMouseMove);
    }

    teardownInput() {
      if (!this._inputHandlers) return;
      const h = this._inputHandlers;
      document.removeEventListener('keydown', h.onKeyDown);
      document.removeEventListener('keyup', h.onKeyUp);
      this.canvas.removeEventListener('click', h.onClick);
      this.canvas.removeEventListener('mousemove', h.onMouseMove);
      this._inputHandlers = null;
    }

    destroy() {
      this.stop();
      this.teardownInput();
    }

    interactWithPortal() {
      if (this.tryShovelSwap()) return;
      for (const portal of this.portals) {
        let nearest = null;
        let nearestD = Infinity;
        for (const pl of this.players) {
          const dx = (pl.x + pl.w / 2) - portal.x;
          const dy = (pl.y + pl.h / 2) - portal.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < portal.radius + 40 && dist < nearestD) {
            nearestD = dist;
            nearest = portal;
          }
        }
        if (nearest) { this.activatePortal(nearest); break; }
      }
    }

    _pickupShovel(pl, shovel, replacing = false) {
      shovel.taken = true;
      pl.hasShovel = true;
      pl.shovelTier = shovel.tier ?? 0;
      const td = SHOVEL_TIERS[pl.shovelTier] || SHOVEL_TIERS[0];
      pl.maxShovelDurability = td.durability;
      pl.shovelDurability = td.durability;
      pl._offerShovel = null;
      const msg = replacing
        ? `🪏 Swapped for ${td.name}`
        : `🪏 ${td.name}! Press F to dig`;
      this.showInteraction(msg, td.glowColor);
    }

    tryShovelSwap() {
      let best = null;
      let bestD = Infinity;
      for (const pl of this.players) {
        const s = pl._offerShovel;
        if (!s || s.taken) continue;
        const pcx = pl.x + pl.w / 2;
        const pcy = pl.y + pl.h / 2;
        const d = (pcx - s.x) * (pcx - s.x) + (pcy - s.y) * (pcy - s.y);
        if (d < 26 * 26 && d < bestD) {
          bestD = d;
          best = { pl, shovel: s };
        }
      }
      if (!best) return false;
      this._pickupShovel(best.pl, best.shovel, true);
      return true;
    }

    _playerNearShovel(pl, shovel) {
      const pcx = pl.x + pl.w / 2;
      const pcy = pl.y + pl.h / 2;
      const dx = pcx - shovel.x;
      const dy = pcy - shovel.y;
      return dx * dx + dy * dy < 26 * 26;
    }

    // Carve a hole with the shovel: in front of the player, biased downward if
    // crouching. Dug holes become real walkable cave space (see caveCarved), so
    // the player can tunnel their own caves anywhere.
    digAt(p, keys) {
      if (!p.hasShovel || p.digCooldown > 0) return;
      const tierDef = SHOVEL_TIERS[p.shovelTier] || SHOVEL_TIERS[0];
      p.digCooldown = tierDef.cooldown;
      const digDown = keys.s || keys.down;
      const fx = p.x + p.w / 2 + (digDown ? 0 : p.facing * 16);
      const fy = p.y + p.h + (digDown ? 8 : -4);

      if (!isRockAt(this.caves, this.terrain, fx, fy, this.heavenTerrain)) return;

      const mat = materialAt(this.terrain, fx, fy);

      const { cellX, cellY } = digCellKey(fx, fy);
      const t = p._digTarget;
      const need = tierDef.effect === 'voidRend' ? 1 : mat.hardness;
      if (!t || t.cellX !== cellX || t.cellY !== cellY) {
        p._digTarget = { x: fx, y: fy, cellX, cellY, hits: 0, need, mat };
      }
      const target = p._digTarget;
      target.x = fx; target.y = fy;
      target.hits++;

      p.shovelDurability = Math.max(0, p.shovelDurability - mat.hardness * 0.8);

      if (!this.caves.digHoles) this.caves.digHoles = [];
      const dustCount = tierDef.effect === 'starfall' ? 18 : tierDef.effect === 'voidRend' ? 12 : 6;
      for (let i = 0; i < dustCount; i++) {
        const pt = new WorldParticle(CFG.WORLD_WIDTH, CFG.WORLD_HEIGHT);
        pt.x = fx; pt.y = fy;
        pt.vx = (Math.random() - 0.5) * 3.5;
        pt.vy = -Math.random() * 2.5;
        pt.l = 0.8;
        pt.color = tierDef.effect === 'voidRend' ? '#9a4aff' : tierDef.effect === 'starfall' ? '#ffd700' : mat.dust;
        this.particles.push(pt);
      }

      // Tier 3 — Wide Swing: also dig the cell above/below the target.
      if (tierDef.effect === 'wideSwing') {
        const offY = digDown ? -1 : 1;
        this._digCell(this.caves, this.terrain, cellX, cellY + offY);
      }

      if (target.hits >= target.need) {
        const hx = cellX * DIG_CELL + DIG_CELL / 2;
        const hy = cellY * DIG_CELL + DIG_CELL / 2;
        const holeR = tierDef.holeR;
        this.caves.digHoles.push({ x: hx, y: hy, r: holeR });
        if (this.caves.digHoles.length > 320) this.caves.digHoles.shift();
        p._digTarget = null;

        // Tier 4 — Shockwave: damage all 8 neighbors on break.
        if (tierDef.effect === 'shockwave') {
          for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
              if (dx === 0 && dy === 0) continue;
              this._digCell(this.caves, this.terrain, cellX + dx, cellY + dy);
            }
          }
        }

        // Tier 6 — Starfall: dig a full 3x3 block instantly.
        if (tierDef.effect === 'starfall') {
          for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
              if (dx === 0 && dy === 0) continue;
              this._digCellInstant(this.caves, this.terrain, cellX + dx, cellY + dy, holeR);
            }
          }
          this.cameraShake = Math.max(this.cameraShake || 0, 6);
        }

        if (tierDef.effect === 'voidRend') {
          for (let i = 0; i < 16; i++) {
            const pt = new WorldParticle(CFG.WORLD_WIDTH, CFG.WORLD_HEIGHT);
            pt.x = hx; pt.y = hy;
            pt.vx = (Math.random() - 0.5) * 6;
            pt.vy = (Math.random() - 0.5) * 6;
            pt.l = 0.6;
            pt.color = '#9a4aff';
            this.particles.push(pt);
          }
        }

        if (tierDef.effect === 'starfall') {
          for (let i = 0; i < 30; i++) {
            const pt = new WorldParticle(CFG.WORLD_WIDTH, CFG.WORLD_HEIGHT);
            pt.x = hx + (Math.random() - 0.5) * 50;
            pt.y = hy + (Math.random() - 0.5) * 50;
            pt.vx = (Math.random() - 0.5) * 8;
            pt.vy = (Math.random() - 0.5) * 8;
            pt.l = 0.9;
            pt.size = 2 + Math.random() * 4;
            pt.color = ['#ffd700', '#ffe8a0', '#ffffff', '#ff6b6b', '#6ac8ff'][Math.floor(Math.random() * 5)];
            this.particles.push(pt);
          }
        }
      }

      if (p.shovelDurability <= 0) {
        p.hasShovel = false;
        p.shovelTier = 0;
        p._digTarget = null;
        this.showInteraction('🛠️ Shovel broke! Find another', '#ff6b6b');
      }
    }

    _digCell(caves, heights, cellX, cellY) {
      const hx = cellX * DIG_CELL + DIG_CELL / 2;
      const hy = cellY * DIG_CELL + DIG_CELL / 2;
      if (isRockAt(caves, heights, hx, hy, this.heavenTerrain)) {
        this.caves.digHoles.push({ x: hx, y: hy, r: 14 });
        if (this.caves.digHoles.length > 320) this.caves.digHoles.shift();
      }
    }

    _digCellInstant(caves, heights, cellX, cellY, r) {
      const hx = cellX * DIG_CELL + DIG_CELL / 2;
      const hy = cellY * DIG_CELL + DIG_CELL / 2;
      if (isRockAt(caves, heights, hx, hy, this.heavenTerrain)) {
        this.caves.digHoles.push({ x: hx, y: hy, r });
        if (this.caves.digHoles.length > 320) this.caves.digHoles.shift();
      }
    }

    // Cave loot placement handled by layoutCaveProps at init.

    // Heat rises with depth: the player sweats out water, lava scorches, and
    // running dry sends them back to the surface. In heaven, freeze replaces sweat.
    updateSurvival(p, keys) {
      const cxp = p.x + p.w / 2;
      const surf = getTerrainY(this.terrain, cxp);
      const depth = (p.y + p.h / 2) - surf;
      const lavaY = (this.caves && this.caves.lavaY) || (CFG.WORLD_HEIGHT - 140);
      const span = Math.max(200, lavaY - surf);
      let heat = depth > 0 ? Math.min(1, depth / span) : 0;

      const inLava = depth > 0 && (p.y + p.h) >= lavaY && caveCarved(this.caves, cxp, p.y + p.h);
      if (inLava) {
        heat = 1.5;
        this.spawnHeatParticle(cxp + (Math.random() - 0.5) * 16, p.y + p.h);
      }
      this.heat = Math.max(this.heat || 0, Math.min(1, heat));

      const heaven = inHeavenZone(p.y, p.h, cxp, this.heavenTerrain, CFG.HEAVEN_ENABLED);
      if (heaven) this.inHeaven = true;
      const nearFire = playerNearFire(p, this.fires);

      if (heaven) {
        let freezeRate = CFG.HEAVEN_FREEZE_RATE;
        for (const f of this.fires) {
          const dx = cxp - f.x, dy = (p.y + p.h / 2) - f.y;
          if (dx * dx + dy * dy < CFG.FIRE_WARM_RADIUS * CFG.FIRE_WARM_RADIUS) {
            freezeRate *= 0.5;
            p.freeze = Math.max(0, p.freeze - 0.08);
          }
        }
        if (!(keys.r && p.sticks >= CFG.FIRE_STICKS_REQUIRED)) {
          p.freeze += freezeRate;
        }
        p.freeze = Math.max(0, Math.min(p.maxFreeze, p.freeze));
        if (p.freeze >= p.maxFreeze) this.killPlayer(p, 'freeze');
        if (nearFire) {
          const sweatRate = computeSweatRate(
            Math.max(heat, 0.35), depth, p.isMoving, p.onGround, inLava, true
          );
          p.water -= sweatRate;
          if (Math.random() < 0.22) this.spawnSweat(p);
          p.water = Math.max(0, Math.min(p.maxWater, p.water));
          if (p.water <= 0) this.killPlayer(p, 'dehydrate');
        }
      } else {
        if (p.freeze > 0) p.freeze = Math.max(0, p.freeze - 0.04);
        const sweatRate = computeSweatRate(heat, depth, p.isMoving, p.onGround, inLava, nearFire);
        if (sweatRate > 0.02) {
          p.water -= sweatRate;
          if (Math.random() < heat * 0.3 || nearFire) this.spawnSweat(p);
        } else if (p.water < p.maxWater) {
          p.water += 0.05 - sweatRate;
        }
        p.water = Math.max(0, Math.min(p.maxWater, p.water));
        if (p.water <= 0) this.killPlayer(p, 'dehydrate');
      }

      if (p.deathFlash > 0) p.deathFlash--;
    }

    killPlayer(p, reason) {
      const idx = this.players.indexOf(p);
      let rx, ry;
      if (p.lastCheckpoint) {
        rx = p.lastCheckpoint.x - p.w / 2;
        ry = p.lastCheckpoint.y - p.h - 2;
      } else {
        rx = 100 + idx * 35;
        ry = getTerrainY(this.terrain, rx) - p.h - 5;
      }
      p.x = rx;
      p.y = ry;
      p.vx = 0; p.vy = 0;
      p.water = p.maxWater;
      p.freeze = 0;
      p.deathFlash = 30;
      if (reason === 'freeze') {
        const where = p.lastCheckpoint ? p.lastCheckpoint.label : 'the surface';
        this.showInteraction(`❄️ Frozen — respawned at ${where}`, '#a8d8ff');
      } else {
        const where = p.lastCheckpoint ? p.lastCheckpoint.label : 'the surface';
        this.showInteraction(`💀 Dehydrated — respawned at ${where}`, '#ff6b6b');
      }
    }

    spawnSweat(p) {
      const pt = new WorldParticle(CFG.WORLD_WIDTH, CFG.WORLD_HEIGHT);
      pt.x = p.x + p.w / 2 + (Math.random() - 0.5) * 10;
      pt.y = p.y + 4;
      pt.vx = (Math.random() - 0.5) * 1.2;
      pt.vy = 0.8 + Math.random() * 1.2;
      pt.l = 0.7;
      pt.size = 1.5 + Math.random();
      pt.color = '#7fd0ff';
      this.particles.push(pt);
    }

    spawnHeatParticle(x, y) {
      const pt = new WorldParticle(CFG.WORLD_WIDTH, CFG.WORLD_HEIGHT);
      pt.x = x; pt.y = y;
      pt.vx = (Math.random() - 0.5) * 1.5;
      pt.vy = -1 - Math.random() * 1.5;
      pt.l = 0.85;
      pt.size = 1.5 + Math.random() * 2;
      pt.color = Math.random() < 0.5 ? '#ff8b3a' : '#ffd479';
      this.particles.push(pt);
    }

    // Hold R with 6 sticks for 10 seconds to start a fire (consumes the bundle).
    updateRubbing(p, keys) {
      if (keys.r && p.sticks >= CFG.FIRE_STICKS_REQUIRED) {
        p._rubProgress++;
        if (p._rubProgress >= CFG.RUB_FRAMES) {
          p._rubProgress = 0;
          const fx = p.x + p.w / 2;
          const fy = p.y + p.h;
          this.fires.push({ x: fx, y: fy, life: 1800 });
          p.sticks -= CFG.FIRE_STICKS_REQUIRED;
          p.freeze = Math.max(0, p.freeze - 50);
          this.showInteraction('🔥 Fire started! (-6 sticks)', '#ff8b3a');
        }
      } else {
        p._rubProgress = 0;
      }
    }

    activatePortal(portal) {
      portal.activated = !portal.activated;
      portal.pulse = 0;
      if (portal.kind === 'terminal') {
        this.enterComputer();
        return;
      }
      if (portal.kind === 'file') {
        this.showInteraction((portal.isDir ? '📂 ' : '📄 ') + portal.label, portal.color);
        if (this.onFileOpen) this.onFileOpen(portal.filePath);
        return;
      }
      this.showInteraction(portal.label, portal.color);
    }

    showInteraction(text, color) {
      this.interactables.push({ text, color, life: 1, y: 0 });
    }

    spawnBurst(x, y) {
      for (let i = 0; i < 15; i++) {
        const p = new WorldParticle(CFG.WORLD_WIDTH, CFG.WORLD_HEIGHT);
        p.x = x + this.cameraX; p.y = y + this.cameraY;
        p.vx = (Math.random() - 0.5) * 6; p.vy = (Math.random() - 0.5) * 6; p.l = 1;
        this.particles.push(p);
      }
    }

    resize() {
      const rect = this.canvas.parentElement.getBoundingClientRect();
      this.canvas.width = rect.width;
      this.canvas.height = rect.height;
    }

    update() {
      // Computer mode: the player sits at the terminal and types — freeze
      // world movement, grow the monitor, and run the typing animation.
      if (this.computerMode) {
        this.keys.left = this.keys.right = this.keys.a = this.keys.d = this.keys.f = this.keys.r = false;
        this.keys.up = this.keys.w = this.keys.space = false;
        this.keys.p2dig = this.keys.p2rub = false;
        this.keys.np2 = this.keys.np4 = this.keys.np6 = this.keys.np8 = this.keys.np0 = false;
        this.keys.p4dig = this.keys.p4rub = false;
        this.player.isTyping = true;
        this.player.typeFrame = (this.player.typeFrame || 0) + 0.35;
        for (let i = 1; i < this.players.length; i++) this.players[i].isTyping = false;
        this.computerGrow = Math.min(1, this.computerGrow + 0.08);
      } else {
        for (const p of this.players) p.isTyping = false;
        this.computerGrow = Math.max(0, this.computerGrow - 0.1);
      }

      for (let i = 0; i < this.players.length; i++) {
        const pl = this.players[i];
        const pk = this.playerKeys(i);
        pl.update(pk, this.terrain, this.platforms, this.portals, this.chests, this.caves, this.time, this.heavenTerrain);
        const digging = this.keys[this._playerDigKeys[i]];
        if (digging) this.digAt(pl, pk);
        this.updateRubbing(pl, pk);
      }

      this.heat = 0;
      this.inHeaven = false;
      for (let i = 0; i < this.players.length; i++) {
        this.updateSurvival(this.players[i], this.playerKeys(i));
      }

      for (const b of this.buckets) {
        b.bob += 0.05;
        for (const pl of this.players) {
          const cxp = pl.x + pl.w / 2;
          const dx = cxp - b.x, dy = (pl.y + pl.h / 2) - b.y;
          if (dx * dx + dy * dy < 26 * 26 && pl.water < pl.maxWater) {
            pl.water = pl.maxWater;
            this.showInteraction('💧 Refilled!', '#45b7d1');
            break;
          }
        }
      }

      for (const c of this.caveChests) {
        c.pulse += 0.04;
        if (!c.open) {
          for (const pl of this.players) {
            const cxp = pl.x + pl.w / 2;
            const dx = cxp - c.x, dy = (pl.y + pl.h / 2) - c.y;
            if (dx * dx + dy * dy < 30 * 30) {
              c.open = true;
              this.showInteraction('📦 ' + c.loot, '#ffd479');
              break;
            }
          }
        }
      }

      if (this.playerCount > 1) {
        for (let i = 0; i < this.playerCount; i++) this.keys['jumpPressed' + i] = false;
      } else {
        this.keys.jumpPressed = false;
      }

      const cen = this.playersCenter();
      const camMinY = heavenCamMinY();
      const tCX = cen.x - this.canvas.width * 0.35;
      const tCY = cen.y - this.canvas.height * 0.5;
      this.cameraX += (tCX - this.cameraX) * 0.08;
      this.cameraY += (tCY - this.cameraY) * 0.08;
      if (this.cameraShake > 0) {
        this.cameraX += (Math.random() - 0.5) * this.cameraShake;
        this.cameraY += (Math.random() - 0.5) * this.cameraShake;
        this.cameraShake *= 0.88;
        if (this.cameraShake < 0.3) this.cameraShake = 0;
      }
      this.cameraX = Math.max(0, Math.min(this.cameraX, CFG.WORLD_WIDTH - this.canvas.width));
      this.cameraY = Math.max(camMinY, Math.min(this.cameraY, CFG.WORLD_HEIGHT - this.canvas.height));

      this.timeOfDay += 0.0003;
      if (this.timeOfDay > 1) this.timeOfDay -= 1;

      this.weatherTimer++;
      if (this.weatherTimer > 600 + Math.random() * 400) {
        const states = ['clear', 'rain', 'snow'];
        this.weatherState = states[Math.floor(Math.random() * states.length)];
        this.weatherTimer = 0;
        if (this.weatherState !== 'clear') {
          const count = this.weatherState === 'rain' ? 80 : 40;
          for (let i = this.weatherParticles.length; i < count; i++) {
            this.weatherParticles.push(new WeatherParticle(this.weatherState, CFG.WORLD_WIDTH, CFG.WORLD_HEIGHT));
          }
        }
      }

      for (const p of this.weatherParticles) p.update();

      for (const p of this.portals) p.pulse += 0.03;
      for (const c of this.chests) c.pulse += 0.02;
      for (const c of this.crystals) { c.rot += 0.02; c.floatOffset += 0.03; }

      // Shovel pickups — auto when empty-handed; prompt to swap when already holding one.
      if (this.shovels) {
        for (const pl of this.players) pl._offerShovel = null;
        for (const s of this.shovels) {
          s.bob += 0.06;
          if (s.taken) continue;
          for (const pl of this.players) {
            if (!this._playerNearShovel(pl, s)) continue;
            if (!pl.hasShovel) {
              this._pickupShovel(pl, s, false);
              break;
            }
            pl._offerShovel = s;
          }
        }
      }

      // Stick pickups.
      if (this.stickPickups) {
        for (const s of this.stickPickups) {
          s.bob += 0.05;
          if (!s.taken) {
            for (const pl of this.players) {
              const pcx = pl.x + pl.w / 2;
              const pcy = pl.y + pl.h / 2;
              const dx = pcx - s.x, dy = pcy - s.y;
              if (dx * dx + dy * dy < 22 * 22) {
                s.taken = true;
                pl.sticks++;
                this.showInteraction('🪵 Stick (' + pl.sticks + ')', '#c49040');
                break;
              }
            }
          }
        }
      }

      if (this.mapItems) {
        for (const it of this.mapItems) {
          it.bob += 0.05;
          if (it.taken) continue;
          for (const pl of this.players) {
            const pcx = pl.x + pl.w / 2;
            const pcy = pl.y + pl.h / 2;
            const dx = pcx - it.x, dy = pcy - it.y;
            if (dx * dx + dy * dy < 20 * 20) {
              it.taken = true;
              pl.trinkets = (pl.trinkets || 0) + 1;
              this.showInteraction(it.emoji + ' Found!', it.color);
              break;
            }
          }
        }
      }

      if (this.checkpoints) {
        for (const cp of this.checkpoints) {
          cp.pulse += 0.04;
          for (const pl of this.players) {
            const pcx = pl.x + pl.w / 2;
            const pcy = pl.y + pl.h / 2;
            const dx = pcx - cp.x, dy = pcy - cp.y;
            if (dx * dx + dy * dy < 34 * 34) {
              if (pl.lastCheckpoint !== cp) {
                pl.lastCheckpoint = cp;
                cp.activated = true;
                this.showInteraction(`${cp.emoji} Checkpoint — ${cp.label}`, '#96ceb4');
              }
            }
          }
        }
      }

      // Fires tick down.
      for (let i = this.fires.length - 1; i >= 0; i--) {
        this.fires[i].life--;
        if (this.fires[i].life <= 0) this.fires.splice(i, 1);
      }
      for (const p of this.particles) p.update();
      if (this.particles.length > 400) this.particles.splice(0, this.particles.length - 400);
      const daylight = Math.max(0, 1 - Math.abs(this.timeOfDay - 0.5) * 2.5);
      const creatureCtx = {
        player: cen,
        neighbors: this.creatures,
        daylight,
        lights: daylight < 0.4 ? this.players.map(pl => ({ x: pl.x + pl.w / 2, y: pl.y })) : []
      };
      for (const c of this.creatures) c.update(creatureCtx);
      for (const s of this.stars) s.tw += s.sp;
      this.time += 0.016;

      for (let i = this.interactables.length - 1; i >= 0; i--) {
        this.interactables[i].life -= 0.015;
        this.interactables[i].y -= 1.5;
        if (this.interactables[i].life <= 0) this.interactables.splice(i, 1);
      }
    }

    draw() {
      const ctx = this.ctx;
      const W = this.canvas.width;
      const H = this.canvas.height;
      const cx = this.cameraX;
      const cy = this.cameraY;

      this.drawSky(ctx, W, H, cx, cy);
      this.drawHeavenClouds(ctx, cx, cy, W, H);
      this.drawBgMountains(ctx, cx, cy, W, H);
      this.drawTerrain(ctx, cx, cy, W, H);
      this.drawCaves(ctx, cx, cy, W, H);
      this.drawCaveItems(ctx, cx, cy, W, H);
      this.drawPlatforms(ctx, cx, cy, W, H);
      this.drawHeavenRealm(ctx, cx, cy, W, H);
      this.drawHeavenProps(ctx, cx, cy, W, H);
      this.drawCrystals(ctx, cx, cy, W, H);
      this.drawChests(ctx, cx, cy, W, H);
      this.drawSticks(ctx, cx, cy, W, H);
      this.drawShovels(ctx, cx, cy, W, H);
      this.drawMapItems(ctx, cx, cy, W, H);
      this.drawCheckpoints(ctx, cx, cy, W, H);
      this.drawFires(ctx, cx, cy, W, H);
      this.drawPortals(ctx, cx, cy, W, H);
      this.drawCreatures(ctx, cx, cy, W, H);
      this.drawHeavenTrees(ctx, cx, cy, W, H);
      for (let i = 0; i < this.players.length; i++) {
        const color = this._playerColors[i] || this._playerColor;
        this.players[i].draw(ctx, cx, cy, color);
        this.drawDigTarget(ctx, cx, cy, this.players[i]);
        this.drawRubProgress(ctx, cx, cy, this.players[i]);
      }
      if (this.computerGrow > 0.01) this.drawComputer(ctx, cx, cy);
      this.drawParticles(ctx, cx, cy, W, H);
      this.drawWeather(ctx, cx, cy, W, H);
      // Heat haze: the deeper/hotter it gets, the redder the screen.
      if (this.heat > 0.25 && !this.inHeaven) {
        ctx.fillStyle = `rgba(255,60,0,${(this.heat - 0.25) * 0.28})`;
        ctx.fillRect(0, 0, W, H);
      }
      // Cold haze in heaven when freezing.
      if (this.inHeaven) {
        let maxFreeze = 0;
        for (const pl of this.players) maxFreeze = Math.max(maxFreeze, pl.freeze);
        if (maxFreeze > 30) {
          ctx.fillStyle = `rgba(160,220,255,${(maxFreeze / 100) * 0.2})`;
          ctx.fillRect(0, 0, W, H);
        }
      }
      for (const pl of this.players) {
        if (pl.deathFlash > 0) {
          ctx.fillStyle = `rgba(255,0,0,${pl.deathFlash / 60})`;
          ctx.fillRect(0, 0, W, H);
        }
      }
      this.drawSurvivalHud(ctx, W);
      this.drawHUD(ctx, W, H);
      this.drawInteractions(ctx, W, H);
      for (let i = 0; i < this.players.length; i++) {
        if (this.players[i].hasShovel) this.drawShovelHud(ctx, W, H, this.players[i], i);
      }
      if (this.showMinimap) this.drawMinimap(ctx, W, H);
    }

    // Water meter (drains as you sweat) or freeze bar in heaven.
    drawSurvivalHud(ctx, W) {
      const x = 14, bw = 150, bh = 14;
      let y = 14;
      ctx.save();
      for (let i = 0; i < this.players.length; i++) {
        const p = this.players[i];
        const color = this._playerColors[i] || '#4ecdc4';
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(x - 2, y - 2, bw + 4, bh + 4);
        if (this.inHeaven) {
          const frac = p.freeze / p.maxFreeze;
          const cold = frac > 0.7;
          ctx.fillStyle = cold ? '#4a9eff' : '#a8d8ff';
          ctx.fillRect(x, y, bw * frac, bh);
          ctx.fillStyle = 'rgba(255,255,255,0.85)';
          ctx.font = '11px system-ui, sans-serif';
          ctx.textBaseline = 'middle';
          const rubHint = this.playerCount > 1 ? (this._playerRubHints[i] || 'R') : 'R';
          const freezeLabel = this.playerCount > 1 ? (this._playerName(i) + ' ') : '';
          ctx.fillText(freezeLabel + '❄️ ' + Math.ceil(p.freeze), x + 6, y + bh / 2 + 1);
          if (p.sticks >= CFG.FIRE_STICKS_REQUIRED) {
            ctx.fillStyle = color;
            ctx.fillText(rubHint + ': fire', x + bw + 12, y + bh / 2 + 1);
          }
          if (p.sticks > 0) {
            ctx.fillStyle = '#c49040';
            const stickLabel = p.sticks >= CFG.FIRE_STICKS_REQUIRED
              ? '🪵×' + p.sticks
              : '🪵 ' + p.sticks + '/' + CFG.FIRE_STICKS_REQUIRED;
            ctx.fillText(stickLabel, x + bw + (p.sticks >= CFG.FIRE_STICKS_REQUIRED ? 72 : 12), y + bh / 2 + 1);
          }
          if (playerNearFire(p, this.fires)) {
            ctx.fillStyle = '#ff8b3a';
            ctx.fillText('🔥 sweating', x + bw + 12, y + bh + 6);
          }
        } else {
          const frac = p.water / p.maxWater;
          const low = frac < 0.3;
          ctx.fillStyle = low ? '#ff5a4a' : '#45b7d1';
          ctx.fillRect(x, y, bw * frac, bh);
          ctx.fillStyle = 'rgba(255,255,255,0.85)';
          ctx.font = '11px system-ui, sans-serif';
          ctx.textBaseline = 'middle';
          const label = this.playerCount > 1 ? (this._playerName(i) + ' ') : '';
          ctx.fillText(label + '💧 ' + Math.ceil(p.water), x + 6, y + bh / 2 + 1);
          if (i === 0 && this.heat > 0.55) {
            ctx.fillStyle = '#ff8b3a';
            ctx.fillText('🔥 HOT', x + bw + 12, y + bh / 2 + 1);
          }
          if (p.sticks > 0) {
            ctx.fillStyle = '#c49040';
            const stickLabel = p.sticks >= CFG.FIRE_STICKS_REQUIRED
              ? '🪵×' + p.sticks
              : '🪵 ' + p.sticks + '/' + CFG.FIRE_STICKS_REQUIRED;
            ctx.fillText(stickLabel, x + bw + 12, y + bh / 2 + 1);
          }
          if (playerNearFire(p, this.fires)) {
            ctx.fillStyle = '#ff8b3a';
            ctx.fillText('🔥 warm', x + bw + (p.sticks > 0 ? 72 : 12), y + bh / 2 + 1);
          }
        }
        if (this.playerCount > 1) {
          ctx.fillStyle = color;
          ctx.font = '9px system-ui, sans-serif';
          ctx.textAlign = 'right';
          ctx.fillText(this._playerName(i), x + bw - 4, y - 5);
          ctx.textAlign = 'left';
        }
        y += bh + 10;
      }
      ctx.restore();
      this._hudStackY = y;
    }

    drawShovelHud(ctx, W, H, p, playerIndex) {
      const row = Math.floor(playerIndex / 2);
      const rightSide = playerIndex % 2 === 1;
      const bottomPad = 52 + row * 44;
      const digLabel = this._playerDigLabels[playerIndex] || '🪏 F: dig · S+F: down';
      const td = SHOVEL_TIERS[p.shovelTier] || SHOVEL_TIERS[0];
      ctx.save();
      ctx.font = '12px system-ui, sans-serif';
      ctx.textBaseline = 'middle';
      const tw = ctx.measureText(digLabel).width + 18;
      const bx = rightSide ? W - tw - 12 : 12;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(bx, H - bottomPad, tw, 22);
      ctx.fillStyle = td.glowColor;
      ctx.fillText(digLabel, bx + 9, H - bottomPad + 11);

      // Shovel durability bar with tier color.
      const barX = bx, by = H - bottomPad - 18, bw = 110, bh = 8;
      const frac = Math.max(0, p.shovelDurability / p.maxShovelDurability);
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(barX - 2, by - 2, bw + 4, bh + 4);
      ctx.fillStyle = frac < 0.25 ? '#ff5a4a' : td.bladeColor;
      ctx.fillRect(barX, by, bw * frac, bh);
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.font = '9px system-ui, sans-serif';
      ctx.fillText(td.name, barX + bw + 6, by + bh / 2);
      ctx.restore();
    }

    // Show what's being chipped and how far through it the player is.
    drawDigTarget(ctx, cx, cy, player) {
      const t = player._digTarget;
      if (!t) return;
      const td = SHOVEL_TIERS[player.shovelTier] || SHOVEL_TIERS[0];
      const gx = t.x - cx, gy = t.y - cy;
      const frac = Math.min(1, t.hits / t.need);
      ctx.save();
      const ringColor = td.effect === 'voidRend' ? '#9a4aff' : td.effect === 'starfall' ? '#ffd700' : (t.mat ? t.mat.dust : '#caa055');
      const ringR = td.effect === 'starfall' ? 22 : td.effect === 'voidRend' ? 18 : 14;
      ctx.strokeStyle = ringColor;
      ctx.lineWidth = td.effect === 'starfall' ? 3 : 2;
      ctx.globalAlpha = 0.85;
      ctx.shadowColor = ringColor;
      ctx.shadowBlur = td.effect === 'starfall' ? 10 : td.effect === 'voidRend' ? 6 : 0;
      ctx.beginPath();
      ctx.arc(gx, gy, ringR, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 0.5;
      ctx.lineWidth = 1;
      const crackCount = td.effect === 'starfall' ? 8 : td.effect === 'voidRend' ? 6 : 4;
      const cracks = Math.ceil(frac * crackCount);
      for (let i = 0; i < cracks; i++) {
        const a = (i / crackCount) * Math.PI * 2 + frac * 0.5;
        ctx.strokeStyle = ringColor;
        ctx.beginPath();
        ctx.moveTo(gx, gy);
        ctx.lineTo(gx + Math.cos(a) * (10 + frac * 4), gy + Math.sin(a) * (10 + frac * 4));
        ctx.stroke();
      }
      ctx.restore();
    }

    // The Terminal portal "grows" into a big monitor the player types at. The
    // real, usable terminal is the HTML overlay the studio shows on enter; this
    // is the in-world flavor that sits behind it.
    drawComputer(ctx, cx, cy) {
      const portal = this.terminalPortal;
      if (!portal) return;
      const g = this.computerGrow;
      const baseX = portal.x - cx;
      const groundY = getTerrainY(this.terrain, portal.x) - cy;

      // Monitor dimensions scale up as it grows in.
      const mw = 150 * g;
      const mh = 100 * g;
      const standH = 26 * g;
      const mx = baseX - mw / 2;
      const my = groundY - standH - mh;

      ctx.save();
      // Stand.
      ctx.fillStyle = '#2a2a3a';
      ctx.fillRect(baseX - 18 * g, groundY - standH, 36 * g, standH);
      ctx.fillRect(baseX - 34 * g, groundY - 5 * g, 68 * g, 6 * g);

      // Bezel.
      ctx.fillStyle = '#15151f';
      ctx.strokeStyle = '#4ecdc4';
      ctx.lineWidth = 2;
      ctx.fillRect(mx, my, mw, mh);
      ctx.strokeRect(mx, my, mw, mh);

      // Screen with glow.
      ctx.shadowColor = 'rgba(78, 205, 196, 0.6)';
      ctx.shadowBlur = 24 * g;
      ctx.fillStyle = '#06120f';
      const pad = 8 * g;
      ctx.fillRect(mx + pad, my + pad, mw - pad * 2, mh - pad * 2);
      ctx.shadowBlur = 0;

      // Fake scrolling code lines + blinking cursor (decorative; real I/O is the overlay).
      ctx.fillStyle = 'rgba(78, 205, 196, 0.7)';
      const lineH = 9 * g;
      const sx0 = mx + pad + 4 * g;
      let ly = my + pad + 8 * g;
      const rows = Math.floor((mh - pad * 2 - 8 * g) / lineH);
      for (let i = 0; i < rows; i++) {
        const w = ((Math.sin(i * 1.7 + Math.floor(this.time)) * 0.5 + 0.5) * (mw - pad * 2 - 12 * g));
        ctx.globalAlpha = 0.35 + (i / rows) * 0.4;
        ctx.fillRect(sx0, ly, Math.max(6 * g, w), 2.5 * g);
        ly += lineH;
      }
      ctx.globalAlpha = 1;
      if (Math.floor(this.time * 2) % 2 === 0) {
        ctx.fillRect(sx0, ly - lineH + 1, 5 * g, 6 * g);
      }
      ctx.restore();
    }

    drawSky(ctx, W, H, cx, cy) {
      const tod = this.timeOfDay;
      const hasCustomSky = this._skyTopR !== null && this._skyBotR !== null;
      let r1 = hasCustomSky ? this._skyTopR : 10;
      let g1 = hasCustomSky ? this._skyTopG : 10;
      let b1 = hasCustomSky ? this._skyTopB : 26;
      let r2 = hasCustomSky ? this._skyBotR : 26;
      let g2 = hasCustomSky ? this._skyBotG : 42;
      let b2 = hasCustomSky ? this._skyBotB : 62;
      let r3 = hasCustomSky ? this._skyBotR : 26;
      let g3 = hasCustomSky ? this._skyBotG : 42;
      let b3 = hasCustomSky ? this._skyBotB : 62;
      let starAlpha = 0.7;

      if (tod < 0.2 || tod > 0.8) {
        starAlpha = 0.7;
      } else if (tod < 0.3 || tod > 0.7) {
        const t = Math.min(tod - 0.2, 0.8 - tod) / 0.1;
        starAlpha = 0.7 * (1 - t);
      } else {
        starAlpha = 0;
      }

      if (tod > 0.2 && tod < 0.4) {
        const t = (tod - 0.2) / 0.2;
        r1 = 10 + t * 40; g1 = 10 + t * 30; b1 = 26 + t * 20;
        r2 = 26 + t * 50; g2 = 42 + t * 30; b2 = 62 + t * 10;
        r3 = 26 + t * 40; g3 = 26 + t * 40; b3 = 42 + t * 20;
      }
      if (tod >= 0.4 && tod < 0.6) {
        const t = (tod - 0.4) / 0.2;
        r1 = 50 - t * 40; g1 = 40 - t * 30; b1 = 46 - t * 20;
        r2 = 76 - t * 50; g2 = 72 - t * 30; b2 = 72 - t * 10;
        r3 = 66 - t * 40; g3 = 66 - t * 40; b3 = 62 - t * 20;
        if (tod > 0.5) {
          const s = (tod - 0.5) * 2;
          starAlpha = s * 0.5;
        }
      }
      if (tod >= 0.6 && tod < 0.8) {
        const t = (tod - 0.6) / 0.2;
        r1 = 10 + t * 20; g1 = 10 + t * 10; b1 = 26 + t * 10;
        r2 = 26 + t * 10; g2 = 42 + t * 5; b2 = 62;
        r3 = 26 + t * 10; g3 = 26 + t * 5; b3 = 42 + t * 5;
        starAlpha = 0.5 + t * 0.2;
      }

      // Sky climb brightens toward the abyss; the heaven realm goes full golden.
      if (CFG.HEAVEN_ENABLED) {
        const surf = getTerrainY(this.terrain, cx + W * 0.5);
        const heavenGround = surf - CFG.HEAVEN_REALM_ALTITUDE;
        const climbBlend = Math.max(0, Math.min(0.5, (surf - CFG.HEAVEN_SKY_START - 60 - cy) / (CFG.HEAVEN_SKY_CLIMB + 260)));
        const realmBlend = Math.max(0, Math.min(1, (heavenGround + 180 - cy) / 300));
        const heavenBlend = Math.max(climbBlend, realmBlend);
        if (heavenBlend > 0) {
          const hr = 248; const hg = 252; const hb = 255;
          const gr = 255; const gg = 230; const gb = 160;
          r1 = r1 + (hr - r1) * heavenBlend;
          g1 = g1 + (hg - g1) * heavenBlend;
          b1 = b1 + (hb - b1) * heavenBlend;
          r2 = r2 + (gr - r2) * heavenBlend * 0.4;
          g2 = g2 + (gg - g2) * heavenBlend * 0.4;
          b2 = b2 + (gb - b2) * heavenBlend * 0.4;
          r3 = r3 + (hr - r3) * heavenBlend;
          g3 = g3 + (hg - g3) * heavenBlend;
          b3 = b3 + (hb - b3) * heavenBlend;
          starAlpha *= (1 - heavenBlend * 0.85);
        }
      }

      const skyColors = [
        [r1, g1, b1],
        [r1 + 8, g1 + 8, b1 + 4],
        [r2, g2, b2],
        [r3, g3, b3],
        [r2 - 10, g2 - 10, b2 - 10]
      ];

      const grad = ctx.createLinearGradient(0, 0, 0, H);
      for (let i = 0; i < skyColors.length; i++) {
        const [r, g, b] = skyColors[i];
        grad.addColorStop(i / (skyColors.length - 1), `rgb(${r},${g},${b})`);
      }
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      if (starAlpha > 0.01) {
        for (const s of this.stars) {
          const sx = s.x - cx * 0.05;
          const sy = s.y - cy * 0.05;
          if (sx < -5 || sx > W + 5 || sy < -5 || sy > H + 5) continue;
          ctx.globalAlpha = (0.4 + Math.sin(s.tw) * 0.3) * starAlpha;
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(sx, sy, s.sz, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }

      if (tod > 0.2 && tod < 0.35) {
        const t = (tod - 0.2) / 0.15;
        ctx.globalAlpha = t * 0.6;
        const grad2 = ctx.createRadialGradient(W * 0.7, H * 0.1, 0, W * 0.7, H * 0.1, 80);
        grad2.addColorStop(0, '#ff8844');
        grad2.addColorStop(0.5, '#ff6622');
        grad2.addColorStop(1, 'transparent');
        ctx.fillStyle = grad2;
        ctx.beginPath();
        ctx.arc(W * 0.7, H * 0.1, 80, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      if (tod > 0.7 && tod < 0.85) {
        const t = (tod - 0.7) / 0.15;
        ctx.globalAlpha = t * 0.6;
        const grad2 = ctx.createRadialGradient(W * 0.3, H * 0.15, 0, W * 0.3, H * 0.15, 60);
        grad2.addColorStop(0, '#ff6666');
        grad2.addColorStop(1, 'transparent');
        ctx.fillStyle = grad2;
        ctx.beginPath();
        ctx.arc(W * 0.3, H * 0.15, 60, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }

    drawBgMountains(ctx, cx, cy, W, H) {
      for (const mt of this.bgMountains) {
        ctx.beginPath();
        ctx.moveTo(mt.p[0].x - cx * mt.par, mt.p[0].y + 50);
        for (let j = 1; j < mt.p.length; j++) {
          ctx.lineTo(mt.p[j].x - cx * mt.par, mt.p[j].y + 50 + Math.sin(j * 0.3 + this.time) * 3);
        }
        ctx.lineTo(CFG.WORLD_WIDTH - cx * mt.par + 100, H + 50);
        ctx.lineTo(mt.p[0].x - cx * mt.par - 100, H + 50);
        ctx.closePath();
        ctx.fillStyle = mt.color;
        ctx.fill();
      }
    }

    drawTerrain(ctx, cx, cy, W, H) {
      const step = 8;
      const startX = Math.max(0, Math.floor(cx / step) * step);
      const endX = Math.min(CFG.WORLD_WIDTH, cx + W + step);
      const fp = this._biomePalette;

      const bc = (x, k) => fp ? fp[k] : getBiome(x)[k];
      const biomeName = fp ? fp.name : null;

      for (let x = startX; x <= endX; x += 1) {
        const ty = getTerrainY(this.terrain, x);
        ctx.fillStyle = bc(x, 'dirt');
        ctx.fillRect(x - cx, ty - cy, 2, H - (ty - cy));
      }

      ctx.beginPath();
      ctx.moveTo(startX - cx, H + 10);
      for (let x = startX; x <= endX; x += step) {
        const ty = getTerrainY(this.terrain, x);
        ctx.lineTo(x - cx, ty - cy);
      }
      ctx.lineTo(endX - cx, H + 10);
      ctx.closePath();

      const tod = this.timeOfDay;
      const darken = tod < 0.2 || tod > 0.8 ? 0.6 : tod < 0.3 || tod > 0.7 ? 0.8 : 1;
      const bp = fp;
      const gtc = bp ? this.hexToRgb(bp.ground) || { r: 58, g: 125, b: 90 } : { r: 58, g: 125, b: 90 };
      const gbc = bp ? this.hexToRgb(bp.dirt) || { r: 45, g: 107, b: 74 } : { r: 45, g: 107, b: 74 };
      const gcc = bp ? this.hexToRgb('#2a1a0a') || { r: 42, g: 26, b: 10 } : { r: 42, g: 26, b: 10 };
      const groundGrad = ctx.createLinearGradient(0, 0, 0, H);
      groundGrad.addColorStop(0, `rgba(${gtc.r},${gtc.g},${gtc.b},${0.9 * darken})`);
      groundGrad.addColorStop(0.05, `rgba(${gbc.r},${gbc.g},${gbc.b},${0.9 * darken})`);
      groundGrad.addColorStop(0.15, `rgba(${gcc.r},${gcc.g},${gcc.b},${darken})`);
      groundGrad.addColorStop(0.5, `rgba(42,26,26,${darken})`);
      groundGrad.addColorStop(1, `rgba(26,10,10,${darken})`);
      ctx.fillStyle = groundGrad;
      ctx.fill();

      for (let x = startX; x <= endX; x += step) {
        const ty = getTerrainY(this.terrain, x);
        if (this.caves && caveCarved(this.caves, x, ty + 2)) continue;
        ctx.fillStyle = bc(x, 'grass');
        ctx.fillRect(x - cx, ty - cy, step + 1, 4);
      }

      for (let x = startX; x <= endX; x += step * 3) {
        const ty = getTerrainY(this.terrain, x);
        const bn = biomeName || getBiome(x).name;
        ctx.fillStyle = `rgba(${bn === 'desert' ? '180,160,80' : bn === 'tundra' ? '120,180,200' : '60,180,100'}, 0.15)`;
        const gh = 6 + Math.sin(x * 0.1) * 4;
        for (let g = 0; g < gh; g++) {
          const gx = x + Math.sin(g * 0.7 + x * 0.05) * 4;
          ctx.fillRect(gx - cx, ty - cy - 2 - g * 3, 2, 3);
        }
      }
    }

    // Carve the caves out of the rock fill: a lighter rocky rim, then the dark
    // interior, then a faint ambient glow and crystals in chambers for depth.
    drawCaves(ctx, cx, cy, W, H) {
      if (!this.caves) return;
      const onScreen = (x, y, r) =>
        x - cx > -r - 60 && x - cx < W + r + 60 && y - cy > -r - 60 && y - cy < H + r + 60;

      ctx.save();
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';

      // Clip to below the terrain surface so round tunnel caps do not dome above ground.
      const clipStep = 4;
      const clipStartX = Math.max(0, Math.floor(cx / clipStep) * clipStep);
      const clipEndX = Math.min(CFG.WORLD_WIDTH, cx + W + clipStep);
      ctx.beginPath();
      ctx.moveTo(clipStartX - cx - 1, H + 10);
      for (let x = clipStartX; x <= clipEndX; x += clipStep) {
        const ty = getTerrainY(this.terrain, x);
        ctx.lineTo(x - cx, ty - cy);
      }
      ctx.lineTo(clipEndX - cx + 1, H + 10);
      ctx.closePath();
      ctx.clip();

      const digHoles = this.caves.digHoles || [];
      const rooms = this.caves.chambers.concat(this.caves.pockets || []);
      const lavaY = this.caves.lavaY || (CFG.WORLD_HEIGHT - 140);

      // 1) rocky rim (slightly lighter, drawn wider so it peeks around the cave)
      ctx.strokeStyle = 'rgba(58,40,36,0.95)';
      for (const t of this.caves.tunnels) {
        ctx.lineWidth = t.r * 2 + 9;
        ctx.beginPath();
        ctx.moveTo(t.ax - cx, t.ay - cy);
        ctx.lineTo(t.bx - cx, t.by - cy);
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(58,40,36,0.95)';
      for (const c of rooms) {
        if (!onScreen(c.x, c.y, c.r)) continue;
        ctx.beginPath();
        ctx.arc(c.x - cx, c.y - cy, c.r + 5, 0, Math.PI * 2);
        ctx.fill();
      }
      for (const d of digHoles) {
        if (!onScreen(d.x, d.y, d.r)) continue;
        ctx.beginPath();
        ctx.arc(d.x - cx, d.y - cy, d.r + 4, 0, Math.PI * 2);
        ctx.fill();
      }

      // 2) dark cave interior
      ctx.strokeStyle = '#0b0810';
      for (const t of this.caves.tunnels) {
        ctx.lineWidth = t.r * 2;
        ctx.beginPath();
        ctx.moveTo(t.ax - cx, t.ay - cy);
        ctx.lineTo(t.bx - cx, t.by - cy);
        ctx.stroke();
      }
      ctx.fillStyle = '#0b0810';
      for (const c of rooms) {
        if (!onScreen(c.x, c.y, c.r)) continue;
        ctx.beginPath();
        ctx.arc(c.x - cx, c.y - cy, c.r, 0, Math.PI * 2);
        ctx.fill();
      }
      for (const d of digHoles) {
        if (!onScreen(d.x, d.y, d.r)) continue;
        ctx.beginPath();
        ctx.arc(d.x - cx, d.y - cy, d.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // 3) per-room detail: boulders, stalactites, ambient glow, crystals, lava
      for (const c of rooms) {
        if (!onScreen(c.x, c.y, c.r)) continue;
        const gx = c.x - cx, gy = c.y - cy;

        // boulders — flat rocks sitting on the chamber floor arc
        for (const b of (c.boulders || [])) {
          const bx = gx + b.dx;
          const by = gy + (roomFloorY(c, b.dx) - c.y);
          const br = b.r;
          const tilt = b.dx * 0.04;
          ctx.save();
          ctx.translate(bx, by);
          ctx.rotate(tilt);
          ctx.fillStyle = '#2e2830';
          ctx.beginPath();
          ctx.ellipse(0, -br * 0.15, br, br * 0.5, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#4a4048';
          ctx.beginPath();
          ctx.ellipse(-br * 0.15, -br * 0.35, br * 0.55, br * 0.32, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = 'rgba(120,110,100,0.35)';
          ctx.beginPath();
          ctx.ellipse(-br * 0.25, -br * 0.45, br * 0.25, br * 0.12, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        // stalactites / stalagmites — anchored to ceiling or floor arc
        ctx.fillStyle = 'rgba(40,28,26,0.95)';
        for (const s of (c.stalactites || [])) {
          const sx = gx + s.dx;
          const topY = s.up
            ? (gy + (roomFloorY(c, s.dx) - c.y))
            : (gy + (roomCeilingY(c, s.dx) - c.y));
          const tipY = s.up ? topY - s.len : topY + s.len;
          ctx.beginPath();
          ctx.moveTo(sx - s.w / 2, topY);
          ctx.lineTo(sx + s.w / 2, topY);
          ctx.lineTo(sx, tipY);
          ctx.closePath();
          ctx.fill();
        }

        // lava: rooms dipping below the lava line glow molten at the bottom
        if (c.y + c.r > lavaY) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(gx, gy, c.r, 0, Math.PI * 2);
          ctx.clip();
          const surfY = (lavaY - cy) + Math.sin(this.time * 2 + c.x) * 3;
          const lg = ctx.createLinearGradient(0, surfY, 0, gy + c.r);
          lg.addColorStop(0, '#ffae3a');
          lg.addColorStop(0.4, '#ff5a14');
          lg.addColorStop(1, '#6e1400');
          ctx.fillStyle = lg;
          ctx.fillRect(gx - c.r, surfY, c.r * 2, c.r * 2);
          ctx.fillStyle = 'rgba(255,170,60,0.55)';
          ctx.fillRect(gx - c.r, surfY - 3, c.r * 2, 4);
          ctx.restore();
        }

        const grad = ctx.createRadialGradient(gx, gy, 0, gx, gy, c.r);
        grad.addColorStop(0, c.y + c.r > lavaY ? 'rgba(255,120,40,0.16)' : 'rgba(78,205,196,0.12)');
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(gx, gy, c.r, 0, Math.PI * 2);
        ctx.fill();

        for (const cr of (c.crystals || [])) {
          const cx2 = gx + cr.dx;
          const cy2 = gy + (roomFloorY(c, cr.dx) - c.y);
          ctx.save();
          ctx.translate(cx2, cy2 - cr.r);
          ctx.fillStyle = cr.color;
          ctx.shadowColor = cr.color;
          ctx.shadowBlur = 6;
          ctx.beginPath();
          ctx.moveTo(0, -cr.r * 2.2);
          ctx.lineTo(cr.r * 0.55, 0);
          ctx.lineTo(0, cr.r * 0.4);
          ctx.lineTo(-cr.r * 0.55, 0);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
        ctx.shadowBlur = 0;
      }
      ctx.restore();
    }

    drawCaveItems(ctx, cx, cy, W, H) {
      const onScreen = (x, y) => x - cx > -40 && x - cx < W + 40 && y - cy > -40 && y - cy < H + 40;
      // chests
      for (const c of (this.caveChests || [])) {
        if (!onScreen(c.x, c.y)) continue;
        const px = c.x - cx, py = c.y - cy;
        ctx.save();
        ctx.shadowColor = '#ffd479';
        ctx.shadowBlur = c.open ? 16 : 8 + Math.sin(c.pulse) * 4;
        ctx.fillStyle = '#7a5a2a';
        ctx.fillRect(px, py, c.w, c.h);
        ctx.fillStyle = '#caa055';
        ctx.fillRect(px, py, c.w, c.open ? 3 : 6);
        if (c.open) {
          ctx.fillStyle = '#ffe9a8';
          ctx.fillRect(px + 3, py - 4, c.w - 6, 4);
        }
        ctx.restore();
      }
      // buckets
      for (const b of (this.buckets || [])) {
        if (!onScreen(b.x, b.y)) continue;
        const px = b.x - cx, py = b.y - cy + Math.sin(b.bob) * 2;
        ctx.save();
        ctx.fillStyle = '#6a4a2a';
        ctx.beginPath();
        ctx.moveTo(px - 8, py - 8);
        ctx.lineTo(px + 8, py - 8);
        ctx.lineTo(px + 6, py + 8);
        ctx.lineTo(px - 6, py + 8);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#45b7d1';
        ctx.shadowColor = '#45b7d1';
        ctx.shadowBlur = 8;
        ctx.fillRect(px - 7, py - 7, 14, 4);
        ctx.restore();
      }
    }

    drawShovels(ctx, cx, cy, W, H) {
      if (!this.shovels) return;
      for (const s of this.shovels) {
        if (s.taken) continue;
        const sx = s.x - cx, sy = s.y - cy + Math.sin(s.bob) * 3;
        if (sx < -30 || sx > W + 30 || sy < -30 || sy > H + 30) continue;
        const td = SHOVEL_TIERS[s.tier ?? 0] || SHOVEL_TIERS[0];
        ctx.save();
        // glow
        ctx.shadowColor = td.glowColor;
        ctx.shadowBlur = td.effect === 'starfall' ? 24 : td.effect === 'voidRend' ? 18 : 12;
        if (td.effect === 'starfall') {
          ctx.shadowColor = ['#ffd700', '#ffe8a0', '#ffffff', '#6ac8ff'][Math.floor(Math.sin(s.bob * 2) * 2 + 2) % 4];
        }
        // handle
        ctx.strokeStyle = td.handleColor;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(sx, sy - 12);
        ctx.lineTo(sx, sy + 8);
        ctx.stroke();
        // blade
        ctx.fillStyle = td.bladeColor;
        const bw = td.bladeW, bh = td.bladeH;
        ctx.beginPath();
        ctx.moveTo(sx - bw, sy + 6);
        ctx.lineTo(sx + bw, sy + 6);
        ctx.lineTo(sx, sy + 6 + bh);
        ctx.closePath();
        ctx.fill();
        // tier 6 celestial extra sparkles
        if (td.effect === 'starfall') {
          ctx.fillStyle = '#ffffff';
          for (let i = 0; i < 4; i++) {
            const a = s.bob + i * 1.57;
            ctx.beginPath();
            ctx.arc(sx + Math.cos(a) * 10, sy - 4 + Math.sin(a * 0.7) * 6, 1.5, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        // tier 5 void aura
        if (td.effect === 'voidRend') {
          ctx.fillStyle = 'rgba(154,74,255,0.15)';
          ctx.beginPath();
          ctx.arc(sx, sy + 2, 12 + Math.sin(s.bob * 1.5) * 3, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
    }

    drawSticks(ctx, cx, cy, W, H) {
      if (!this.stickPickups) return;
      for (const s of this.stickPickups) {
        if (s.taken) continue;
        const sx = s.x - cx, sy = s.y - cy + Math.sin(s.bob) * 2;
        if (sx < -30 || sx > W + 30 || sy < -30 || sy > H + 30) continue;
        ctx.save();
        ctx.strokeStyle = '#8a6a40';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(sx - 6, sy + 4);
        ctx.lineTo(sx + 6, sy - 4);
        ctx.stroke();
        ctx.restore();
      }
    }

    drawMapItems(ctx, cx, cy, W, H) {
      if (!this.mapItems) return;
      for (const it of this.mapItems) {
        if (it.taken) continue;
        const sx = it.x - cx;
        const sy = it.y - cy + Math.sin(it.bob) * 2;
        if (sx < -24 || sx > W + 24 || sy < -24 || sy > H + 24) continue;
        ctx.save();
        ctx.font = '14px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = it.color;
        ctx.shadowBlur = 8;
        ctx.fillText(it.emoji, sx, sy);
        ctx.restore();
      }
    }

    drawCheckpoints(ctx, cx, cy, W, H) {
      if (!this.checkpoints) return;
      for (const cp of this.checkpoints) {
        const sx = cp.x - cx;
        const sy = cp.y - cy + Math.sin(cp.pulse) * 2;
        if (sx < -40 || sx > W + 40 || sy < -40 || sy > H + 40) continue;
        ctx.save();
        const glow = cp.activated ? 14 : 8 + Math.sin(cp.pulse) * 3;
        ctx.shadowColor = cp.activated ? '#96ceb4' : '#ffd479';
        ctx.shadowBlur = glow;
        ctx.font = '18px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(cp.emoji, sx, sy - 4);
        if (cp.activated) {
          ctx.font = '8px system-ui, sans-serif';
          ctx.fillStyle = 'rgba(150,206,180,0.9)';
          ctx.fillText('✓', sx + 10, sy - 12);
        }
        ctx.restore();
      }
    }

    drawFires(ctx, cx, cy, W, H) {
      if (!this.fires) return;
      for (const f of this.fires) {
        const fx = f.x - cx, fy = f.y - cy;
        if (fx < -40 || fx > W + 40 || fy < -40 || fy > H + 40) continue;
        ctx.save();
        const flicker = Math.sin(this.time * 8 + f.x) * 3;
        ctx.shadowColor = '#ff8b3a';
        ctx.shadowBlur = 16;
        const grad = ctx.createRadialGradient(fx, fy - 8, 0, fx, fy - 8, 18);
        grad.addColorStop(0, 'rgba(255,220,100,0.9)');
        grad.addColorStop(0.5, 'rgba(255,120,40,0.6)');
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(fx, fy - 6 + flicker, 10, 14, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    drawRubProgress(ctx, cx, cy, player) {
      if (!player._rubProgress || player._rubProgress <= 0) return;
      const gx = player.x + player.w / 2 - cx;
      const gy = player.y - 18 - cy;
      const frac = Math.min(1, player._rubProgress / CFG.RUB_FRAMES);
      ctx.save();
      ctx.strokeStyle = 'rgba(200,160,80,0.5)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(gx, gy, 14, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = '#ff8b3a';
      ctx.beginPath();
      ctx.arc(gx, gy, 14, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    drawHeavenRealm(ctx, cx, cy, W, H) {
      if (!CFG.HEAVEN_ENABLED || !this.heavenTerrain) return;
      const surf = getTerrainY(this.terrain, cx + W / 2);
      const heavenRef = surf - CFG.HEAVEN_REALM_ALTITUDE;
      if (cy > heavenRef + CFG.HEAVEN_REALM_DEPTH + H * 0.6) return;

      const step = 6;
      const startX = Math.max(0, Math.floor(cx / step) * step);
      const endX = Math.min(CFG.WORLD_WIDTH, cx + W + step);
      const depth = CFG.HEAVEN_REALM_DEPTH;

      ctx.save();

      for (let x = startX; x <= endX; x += step * 4) {
        const hgY = getHeavenGroundY(this.heavenTerrain, x);
        const sx = x - cx;
        const sy = hgY - cy;
        if (sy < -220 || sy > H + depth + 100) continue;
        const glow = ctx.createRadialGradient(sx, sy + 50, 0, sx, sy + 50, 110);
        glow.addColorStop(0, 'rgba(255,248,210,0.4)');
        glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow;
        ctx.fillRect(sx - 110, sy - 40, 220, 220);
      }

      ctx.beginPath();
      ctx.moveTo(startX - cx, H + 30);
      for (let x = startX; x <= endX; x += step) {
        ctx.lineTo(x - cx, getHeavenGroundY(this.heavenTerrain, x) - cy);
      }
      ctx.lineTo(endX - cx, H + 30);
      ctx.closePath();
      const topY = heavenRef - cy;
      const bodyGrad = ctx.createLinearGradient(0, topY, 0, topY + depth);
      bodyGrad.addColorStop(0, '#fffdf5');
      bodyGrad.addColorStop(0.04, '#fff4dc');
      bodyGrad.addColorStop(0.2, '#e8f0ff');
      bodyGrad.addColorStop(0.55, '#c8dcf8');
      bodyGrad.addColorStop(1, '#88a8d8');
      ctx.fillStyle = bodyGrad;
      ctx.fill();

      for (let x = startX; x <= endX; x += step) {
        const ty = getHeavenGroundY(this.heavenTerrain, x);
        const sy = ty - cy;
        ctx.fillStyle = '#fffdf8';
        ctx.fillRect(x - cx, sy, step + 1, 14);
        ctx.fillStyle = 'rgba(255,212,121,0.98)';
        ctx.fillRect(x - cx, sy, step + 1, 5);
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        ctx.fillRect(x - cx, sy + 1, step + 1, 2);
        ctx.fillStyle = 'rgba(200,220,255,0.35)';
        ctx.fillRect(x - cx, sy + 14, step + 1, 3);
      }

      ctx.restore();
    }

    drawHeavenProps(ctx, cx, cy, W, H) {
      if (!this.heavenProps || !CFG.HEAVEN_ENABLED) return;
      const surf = getTerrainY(this.terrain, cx + W / 2);
      const heavenRef = surf - CFG.HEAVEN_REALM_ALTITUDE;
      if (cy > heavenRef + CFG.HEAVEN_REALM_DEPTH + 200) return;

      for (const p of this.heavenProps) {
        const px = p.x - cx;
        const baseY = p.baseY - cy;
        if (px < -120 || px > W + 120 || baseY < -200 || baseY > H + 80) continue;
        const h = p.height || 70;
        const w = p.width || 12;
        const gold = `hsl(${p.hue || 45}, 72%, ${58 + Math.sin(this.time * 0.04 + (p.phase || 0)) * 6}%)`;
        ctx.save();

        if (p.kind === 'arch' || p.kind === 'gate') {
          ctx.strokeStyle = gold;
          ctx.lineWidth = p.kind === 'gate' ? 5 : 4;
          ctx.shadowColor = '#ffd479';
          ctx.shadowBlur = 12;
          ctx.beginPath();
          ctx.moveTo(px - w * 2.2, baseY);
          ctx.lineTo(px - w * 2.2, baseY - h * 0.55);
          ctx.quadraticCurveTo(px, baseY - h * 1.05, px + w * 2.2, baseY - h * 0.55);
          ctx.lineTo(px + w * 2.2, baseY);
          ctx.stroke();
          if (p.kind === 'gate') {
            ctx.fillStyle = 'rgba(255,248,220,0.25)';
            ctx.fillRect(px - w * 2.2, baseY - h * 0.55, w * 4.4, h * 0.55);
          }
        } else if (p.kind === 'fountain') {
          ctx.fillStyle = '#e8f4ff';
          ctx.beginPath();
          ctx.ellipse(px, baseY - 6, 28, 10, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = gold;
          ctx.lineWidth = 3;
          for (let i = 0; i < 3; i++) {
            const ang = -Math.PI / 2 + (i - 1) * 0.35;
            ctx.beginPath();
            ctx.moveTo(px, baseY - 10);
            ctx.quadraticCurveTo(
              px + Math.cos(ang) * 20, baseY - 30 - i * 8,
              px + Math.cos(ang) * 8, baseY - 42 - i * 12
            );
            ctx.stroke();
          }
        } else if (p.kind === 'shrine') {
          ctx.fillStyle = gold;
          ctx.fillRect(px - w, baseY - h * 0.35, w * 2, h * 0.35);
          ctx.beginPath();
          ctx.moveTo(px, baseY - h);
          ctx.lineTo(px - w * 1.6, baseY - h * 0.35);
          ctx.lineTo(px + w * 1.6, baseY - h * 0.35);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,0.55)';
          ctx.beginPath();
          ctx.arc(px, baseY - h * 0.55, w * 0.55, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = gold;
          ctx.shadowColor = '#fff8e0';
          ctx.shadowBlur = p.kind === 'spire' ? 16 : 8;
          if (p.kind === 'obelisk') {
            ctx.beginPath();
            ctx.moveTo(px, baseY - h);
            ctx.lineTo(px - w * 0.7, baseY);
            ctx.lineTo(px + w * 0.7, baseY);
            ctx.closePath();
            ctx.fill();
          } else {
            ctx.fillRect(px - w / 2, baseY - h, w, h);
            ctx.fillStyle = 'rgba(255,255,255,0.45)';
            ctx.fillRect(px - w / 2 + 1, baseY - h + 4, 2, h - 8);
          }
        }
        ctx.restore();
      }
    }

    drawHeavenTrees(ctx, cx, cy, W, H) {
      if (!this.heavenTrees || !CFG.HEAVEN_ENABLED) return;
      const surf = getTerrainY(this.terrain, cx + W / 2);
      const heavenRef = surf - CFG.HEAVEN_REALM_ALTITUDE;
      if (cy > heavenRef + 450) return;
      for (const t of this.heavenTrees) {
        const tx = t.x - cx;
        const baseY = t.baseY - cy;
        const topY = t.topY - cy;
        if (tx < -90 || tx > W + 90 || baseY < -120 || baseY > H + 60) continue;
        ctx.save();
        ctx.fillStyle = 'rgba(255,220,150,0.22)';
        ctx.beginPath();
        ctx.ellipse(tx, baseY + 6, t.canopyR * 0.75, 11, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#d8cce8';
        ctx.fillRect(tx - t.trunkW / 2, topY, t.trunkW, baseY - topY);
        ctx.fillStyle = t.color;
        ctx.shadowColor = t.glow || '#ffd479';
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.arc(tx, topY, t.canopyR, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.beginPath();
        ctx.arc(tx - t.canopyR * 0.28, topY - t.canopyR * 0.22, t.canopyR * 0.42, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    drawHeavenClouds(ctx, cx, cy, W, H) {
      if (!CFG.HEAVEN_ENABLED) return;
      const surf = getTerrainY(this.terrain, cx + W / 2);
      const heavenRef = surf - CFG.HEAVEN_REALM_ALTITUDE;
      // Inside the solid heaven realm — no parallax clouds, only warm ambient light.
      if (this.heavenTerrain && cy <= heavenRef + CFG.HEAVEN_REALM_DEPTH + 120) {
        ctx.save();
        ctx.globalAlpha = 0.22;
        const glow = ctx.createRadialGradient(W * 0.5, H * 0.55, 0, W * 0.5, H * 0.55, W * 0.75);
        glow.addColorStop(0, '#fff8e8');
        glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
        return;
      }
      if (cy > surf - 40) return;
      const depth = Math.max(0, Math.min(1, (surf - CFG.HEAVEN_SKY_START - 100 - cy) / (CFG.HEAVEN_SKY_CLIMB + CFG.HEAVEN_REALM_ALTITUDE * 0.15)));
      ctx.save();
      const count = 4 + Math.floor(depth * 5);
      for (let i = 0; i < count; i++) {
        const bx = ((i * 520 + this.time * (10 + depth * 8)) % (W + 500)) - 250;
        const by = (i * 53) % (H * 0.65);
        ctx.globalAlpha = (0.18 + (i % 3) * 0.07) * (0.5 + depth * 0.5);
        ctx.fillStyle = depth > 0.55 ? '#fff8e8' : '#fff8f0';
        ctx.beginPath();
        ctx.ellipse(bx, by, 75 + i * 9, 30 + i * 3, 0, 0, Math.PI * 2);
        ctx.ellipse(bx + 42, by + 8, 52, 24, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      if (depth > 0.45) {
        ctx.globalAlpha = 0.12 * depth;
        const glow = ctx.createRadialGradient(W * 0.5, H * 0.2, 0, W * 0.5, H * 0.2, W * 0.55);
        glow.addColorStop(0, '#fff8d0');
        glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, W, H);
      }
      ctx.restore();
    }

    drawPlatforms(ctx, cx, cy, W, H) {
      for (const plat of this.platforms) {
        const py = platformY(plat, this.time);
        const px = plat.x - cx, pys = py - cy;
        if (px + plat.w < -50 || px > W + 50 || pys + plat.h < -50 || pys > H + 50) continue;
        if (plat.kind === 'cloud') {
          ctx.save();
          ctx.globalAlpha = 0.82;
          ctx.fillStyle = '#f0f4ff';
          ctx.beginPath();
          ctx.ellipse(px + plat.w / 2, pys + plat.h / 2, plat.w / 2, plat.h * 0.9, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 0.35;
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.ellipse(px + plat.w * 0.35, pys + plat.h * 0.3, plat.w * 0.25, plat.h * 0.5, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        } else if (plat.kind === 'heaven-solid') {
          ctx.save();
          const grad = ctx.createLinearGradient(px, pys, px, pys + plat.h);
          grad.addColorStop(0, '#fffaf0');
          grad.addColorStop(0.5, plat.color || '#fff4dc');
          grad.addColorStop(1, '#e8d8b8');
          ctx.fillStyle = grad;
          ctx.fillRect(px, pys, plat.w, plat.h);
          ctx.strokeStyle = 'rgba(255,212,121,0.65)';
          ctx.lineWidth = 2;
          ctx.strokeRect(px + 0.5, pys + 0.5, plat.w - 1, plat.h - 1);
          ctx.fillStyle = 'rgba(255,255,255,0.35)';
          ctx.fillRect(px + 2, pys + 2, plat.w - 4, 2);
          ctx.restore();
        } else {
          ctx.fillStyle = plat.color;
          ctx.fillRect(px, pys, plat.w, plat.h);
          ctx.fillStyle = 'rgba(255,255,255,0.15)';
          ctx.fillRect(px, pys, plat.w, 3);
          ctx.fillStyle = 'rgba(0,0,0,0.2)';
          ctx.fillRect(px, pys + plat.h - 2, plat.w, 2);
        }
      }
    }

    drawCrystals(ctx, cx, cy, W, H) {
      for (const c of this.crystals) {
        const px = c.x - cx, py = c.y - cy + Math.sin(c.floatOffset) * 4;
        if (px < -30 || px > W + 30 || py < -30 || py > H + 30) continue;

        ctx.save();
        ctx.globalAlpha = 0.3 + Math.sin(c.phase + this.time * 2) * 0.15;
        ctx.shadowColor = c.color;
        ctx.shadowBlur = 10;

        ctx.translate(px, py);
        ctx.rotate(c.rot + Math.sin(c.floatOffset) * 0.2);

        const s = c.size;
        ctx.fillStyle = c.color;
        ctx.beginPath();
        ctx.moveTo(0, -s * 1.2);
        ctx.lineTo(s * 0.5, 0);
        ctx.lineTo(0, s * 0.3);
        ctx.lineTo(-s * 0.5, 0);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.beginPath();
        ctx.moveTo(0, -s * 0.8);
        ctx.lineTo(s * 0.2, 0);
        ctx.lineTo(0, s * 0.1);
        ctx.lineTo(-s * 0.2, 0);
        ctx.closePath();
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.restore();
      }
    }

    drawChests(ctx, cx, cy, W, H) {
      for (const c of this.chests) {
        const px = c.x - cx, py = c.y - cy;
        if (px < -30 || px > W + 30 || py < -30 || py > H + 30) continue;

        ctx.save();
        const lidAngle = c.open ? Math.PI * 0.4 : 0;
        const bob = Math.sin(c.pulse * 2) * 0;

        ctx.fillStyle = c.color;
        ctx.fillRect(px - c.w / 2, py + 4 + bob, c.w, c.h - 4);

        ctx.fillStyle = c.lidColor;
        ctx.save();
        ctx.translate(px, py + 4 + bob);
        ctx.rotate(-lidAngle);
        ctx.fillRect(-c.w / 2, -5, c.w, 6);
        ctx.restore();

        if (c.open) {
          ctx.fillStyle = '#ffcc00';
          ctx.globalAlpha = 0.3 + Math.sin(this.time * 3) * 0.15;
          ctx.beginPath();
          ctx.arc(px, py + 8 + bob, 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        }

        ctx.fillStyle = '#ffcc00';
        ctx.fillRect(px - 1, py + 6 + bob, 2, 3);

        ctx.restore();
      }
    }

    drawPortals(ctx, cx, cy, W, H) {
      for (const p of this.portals) {
        const px = p.x - cx, py = p.y - cy;
        if (px + p.radius < -50 || px - p.radius > W + 50 || py + p.radius < -50 || py - p.radius > H + 50) continue;

        const pulse = Math.sin(p.pulse) * 0.3 + 0.7;
        const r = p.radius * (0.9 + Math.sin(p.pulse * 1.5) * 0.1);
        ctx.save();

        const grad = ctx.createRadialGradient(px, py, 0, px, py, r + 10);
        grad.addColorStop(0, p.activated ? p.color : 'transparent');
        grad.addColorStop(0.5, p.color + '40');
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(px, py, r + 10, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = p.color;
        ctx.globalAlpha = pulse * 0.8;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.stroke();

        ctx.globalAlpha = 0.4 + Math.sin(p.pulse * 2) * 0.2;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(px, py, r * 1.15, this.time * 0.5, this.time * 0.5 + Math.PI * 0.8);
        ctx.stroke();
        ctx.globalAlpha = 1;

        ctx.fillStyle = p.color;
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(p.label, px, py + r + 16);

        if (p.activated || p.glowIntensity > 0.1) {
          ctx.globalAlpha = p.glowIntensity * 0.3;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(px, py, r * 1.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        }
        ctx.restore();
      }
    }

    drawCreatures(ctx, cx, cy, W, H) {
      for (const c of this.creatures) c.draw(ctx, cx, cy);
    }

    drawParticles(ctx, cx, cy, W, H) {
      for (const p of this.particles) p.draw(ctx, cx, cy);
    }

    drawWeather(ctx, cx, cy, W, H) {
      if (this.weatherState === 'clear') return;
      for (const p of this.weatherParticles) p.draw(ctx, cx, cy);
      if (this.weatherState === 'rain') {
        ctx.fillStyle = 'rgba(100, 120, 160, 0.05)';
        ctx.fillRect(0, 0, W, H);
      } else if (this.weatherState === 'snow') {
        ctx.fillStyle = 'rgba(200, 210, 230, 0.04)';
        ctx.fillRect(0, 0, W, H);
      }
    }

    drawInteractions(ctx, W, H) {
      const baseY = H - 108;
      for (const ia of this.interactables) {
        ctx.globalAlpha = ia.life;
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.font = 'bold 16px monospace';
        ctx.textAlign = 'center';
        const text = '✦ ' + ia.text + ' ✦';
        const tw = ctx.measureText(text).width + 24;
        const ty = baseY + ia.y;
        ctx.fillRect(W / 2 - tw / 2, ty - 14, tw, 24);
        ctx.fillStyle = ia.color;
        ctx.fillText(text, W / 2, ty);
        ctx.globalAlpha = 1;
      }
    }

    drawHUD(ctx, W, H) {
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.font = '11px monospace';
      ctx.textAlign = 'left';

      let hudY = this._hudStackY || 14;
      const weatherIcon = this.weatherState === 'rain' ? '🌧' : this.weatherState === 'snow' ? '❄' : '☀';
      const moveHints = {
        1: 'WASD:Move Space:Jump',
        2: `${this._playerName(0)}: WASD+Space/W · ${this._playerName(1)}: Arrows (↑ jump)+RCtrl`,
        3: `${this._playerName(0)}: WASD+Space/W · ${this._playerName(1)}: Arrows (↑ jump) · ${this._playerName(2)}: IJKL (I jump)+=`,
        4: `${this._playerName(0)}: WASD · ${this._playerName(1)}: Arrows · ${this._playerName(2)}: IJKL · ${this._playerName(3)}: Num8426 (8 jump)+0`
      };
      const moveHint = moveHints[this.playerCount] || moveHints[1];
      ctx.fillText(`${weatherIcon} ${moveHint} E:Interact M:Map`, 14, hudY);
      hudY += 18;

      let nearPortal = null;
      for (const portal of this.portals) {
        for (const pl of this.players) {
          const dx = (pl.x + pl.w / 2) - portal.x;
          const dy = (pl.y + pl.h / 2) - portal.y;
          if (Math.sqrt(dx * dx + dy * dy) < portal.radius + 50) { nearPortal = portal; break; }
        }
        if (nearPortal) break;
      }
      if (nearPortal) {
        ctx.fillStyle = nearPortal.color;
        ctx.font = 'bold 13px monospace';
        ctx.fillText(`[E] ${nearPortal.label}`, 14, hudY);
        hudY += 18;
      }

      let nearChest = null;
      for (const c of this.chests) {
        for (const pl of this.players) {
          const dx = (pl.x + pl.w / 2) - c.x;
          const dy = (pl.y + pl.h / 2) - c.y;
          if (Math.sqrt(dx * dx + dy * dy) < 30) { nearChest = c; break; }
        }
        if (nearChest) break;
      }
      if (nearChest) {
        ctx.fillStyle = '#c49040';
        ctx.font = 'bold 13px monospace';
        ctx.fillText('[Click] ' + (nearChest.open ? 'Close chest' : 'Open chest'), 14, hudY);
        hudY += 18;
      }

      let shovelSwap = null;
      for (const pl of this.players) {
        const s = pl._offerShovel;
        if (!s || s.taken) continue;
        if (!this._playerNearShovel(pl, s)) continue;
        shovelSwap = { pl, shovel: s };
        break;
      }
      if (shovelSwap) {
        const cur = SHOVEL_TIERS[shovelSwap.pl.shovelTier] || SHOVEL_TIERS[0];
        const next = SHOVEL_TIERS[shovelSwap.shovel.tier ?? 0] || SHOVEL_TIERS[0];
        ctx.fillStyle = next.glowColor;
        ctx.font = 'bold 13px monospace';
        ctx.fillText(`[E] Replace ${cur.name} with ${next.name}`, 14, hudY);
        hudY += 18;
      }

      const cen = this.playersCenter();
      const biome = this._biomePalette || getBiomeAt(cen.x, cen.y, this.terrain, this.heavenTerrain);
      const biomeName = biome.name || 'custom';
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.font = '10px monospace';
      ctx.textAlign = 'right';
      const posLabel = this.playerCount > 1
        ? 'x:' + this.players.map(pl => Math.floor(pl.x)).join('/')
        : `x:${Math.floor(this.players[0].x)}`;
      ctx.fillText(`${biomeName} | ${posLabel}`, W - 14, this.onSettingsOpen ? 48 : 14);

      ctx.textAlign = 'left';
      const dayPhase = this.timeOfDay < 0.25 ? 'Night' : this.timeOfDay < 0.45 ? 'Dawn' : this.timeOfDay < 0.7 ? 'Day' : this.timeOfDay < 0.85 ? 'Dusk' : 'Night';
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fillText(dayPhase, 14, hudY + 18);
      if (this.onSettingsOpen) this.drawSettingsButton(ctx, W);
    }

    drawSettingsButton(ctx, W) {
      const label = '⚙ Settings';
      ctx.font = '600 13px system-ui, sans-serif';
      const tw = ctx.measureText(label).width + 28;
      const h = 32;
      const x = W - tw - 14;
      const y = 10;
      this._settingsBtnRect = { x, y, w: tw, h };

      ctx.fillStyle = 'rgba(13, 13, 20, 0.88)';
      ctx.strokeStyle = 'rgba(78, 205, 196, 0.45)';
      ctx.lineWidth = 1;
      const r = 8;
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + tw - r, y);
      ctx.quadraticCurveTo(x + tw, y, x + tw, y + r);
      ctx.lineTo(x + tw, y + h - r);
      ctx.quadraticCurveTo(x + tw, y + h, x + tw - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#e8e8f0';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, x + 14, y + h / 2);
    }

    drawMinimap(ctx, W, H) {
      const mapW = 120;
      const mapH = 60;
      const mx = W - mapW - 14;
      const my = this.onSettingsOpen ? 56 : 14;
      const scaleX = mapW / CFG.WORLD_WIDTH;
      const scaleY = mapH / CFG.WORLD_HEIGHT;

      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.lineWidth = 1;
      const r = 6;
      ctx.beginPath();
      ctx.moveTo(mx + r, my);
      ctx.lineTo(mx + mapW - r, my);
      ctx.quadraticCurveTo(mx + mapW, my, mx + mapW, my + r);
      ctx.lineTo(mx + mapW, my + mapH - r);
      ctx.quadraticCurveTo(mx + mapW, my + mapH, mx + mapW - r, my + mapH);
      ctx.lineTo(mx + r, my + mapH);
      ctx.quadraticCurveTo(mx, my + mapH, mx, my + mapH - r);
      ctx.lineTo(mx, my + r);
      ctx.quadraticCurveTo(mx, my, mx + r, my);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x <= SEGMENTS; x += 5) {
        const wx = (x / SEGMENTS) * CFG.WORLD_WIDTH;
        const wy = getTerrainY(this.terrain, wx);
        const sx = mx + wx * scaleX;
        const sy = my + wy * scaleY;
        x === 0 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy);
      }
      ctx.stroke();

      for (const p of this.portals) {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(mx + p.x * scaleX, my + p.y * scaleY, 2, 0, Math.PI * 2);
        ctx.fill();
      }

      for (const p of this.platforms) {
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.fillRect(mx + p.x * scaleX, my + p.y * scaleY, Math.max(2, p.w * scaleX), Math.max(1, p.h * scaleY));
      }

      for (let i = 0; i < this.players.length; i++) {
        const pl = this.players[i];
        const px = mx + (pl.x + pl.w / 2) * scaleX;
        const py = my + (pl.y + pl.h / 2) * scaleY;
        ctx.fillStyle = this._playerColors[i] || '#4ecdc4';
        ctx.shadowColor = this._playerColors[i] || '#4ecdc4';
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.arc(px, py, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;

      ctx.restore();
    }

    loop(timestamp) {
      if (!this.isRunning) return;
      const interval = 1000 / (DEFAULTS.TARGET_FPS || 30);
      this.deltaTime += timestamp - this.lastTime;
      this.lastTime = timestamp;
      // Accumulate elapsed time and step the sim whenever a frame's worth has
      // passed. Reassigning (rather than accumulating) here was the bug that
      // froze the world on any display faster than the target FPS.
      if (this.deltaTime >= interval) {
        this.update();
        this.draw();
        this.deltaTime = Math.min(this.deltaTime % interval, interval);
      }
      requestAnimationFrame((t) => this.loop(t));
    }

    start() {
      this.isRunning = true;
      this.lastTime = performance.now();
      this.deltaTime = 0;
      this.update();
      this.draw();
      this.loop(this.lastTime);
    }

    stop() {
      this.isRunning = false;
    }

    applyWorldConfig(cfg = {}) {
      if (cfg.timeOfDay !== undefined) this.timeOfDay = cfg.timeOfDay;
      if (cfg.weather && cfg.weather !== 'auto') {
        this.weatherState = cfg.weather;
        this.weatherTimer = -9999;
      }
      if (cfg.biome && cfg.biome !== 'auto') {
        this.forcedBiome = cfg.biome;
        this.regenerateTerrainColors();
      }
      if (cfg.skyTop) {
        const c = this.hexToRgb(cfg.skyTop);
        if (c) { this._skyTopR = c.r; this._skyTopG = c.g; this._skyTopB = c.b; }
      }
      if (cfg.skyBottom) {
        const c = this.hexToRgb(cfg.skyBottom);
        if (c) { this._skyBotR = c.r; this._skyBotG = c.g; this._skyBotB = c.b; }
      }
      if (cfg.groundTop) {
        const c = this.hexToRgb(cfg.groundTop);
        if (c) { this._groundTopR = c.r; this._groundTopG = c.g; this._groundTopB = c.b; }
      }
      if (cfg.groundBottom) {
        const c = this.hexToRgb(cfg.groundBottom);
        if (c) { this._groundBotR = c.r; this._groundBotG = c.g; this._groundBotB = c.b; }
      }
      if (cfg.playerColor) this._playerColor = cfg.playerColor;
    }

    hexToRgb(hex) {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) } : null;
    }

    regenerateTerrainColors() {
      const biome = this.forcedBiome || 'forest';
      const palettes = {
        forest: { grass: '#4a9e6b', dirt: '#3a7d5a', ground: '#2d6b4a', accent: '#6abf4a' },
        desert: { grass: '#c4a65a', dirt: '#a08040', ground: '#8a6e30', accent: '#d4b66a' },
        tundra: { grass: '#8ab0c4', dirt: '#6a8a9e', ground: '#5a7a8e', accent: '#aac4d4' },
        plains: { grass: '#5aaa6b', dirt: '#4a8a5a', ground: '#3a7a4a', accent: '#7aca8b' },
        heaven: { grass: '#f0f8ff', dirt: '#dceeff', ground: '#c8e0ff', accent: '#ffd479' }
      };
      this._biomePalette = palettes[biome] || palettes.forest;
    }

    exportConfig() {
      return {
        mode: this.mode,
        worldWidth: CFG.WORLD_WIDTH,
        worldHeight: CFG.WORLD_HEIGHT,
        platformCount: CFG.PLATFORM_COUNT,
        portalCount: CFG.PORTAL_COUNT,
        particleCount: CFG.PARTICLE_COUNT,
        creatureCount: CFG.CREATURE_COUNT,
        chestCount: CFG.CHEST_COUNT,
        crystalCount: CFG.CRYSTAL_COUNT,
        colors: CFG.COLORS
      };
    }
  }

  return {
    PLAYER_ROSTER, SHOVEL_TIERS,
    WorldEngine, Player, generateTerrain, getTerrainY, getBiome, getBiomeAt,
    generateHeavenTerrain, getHeavenGroundY, generateCaves, caveCarved, isRockAt, touchesWall,
    materialAt, MATERIALS, digCellKey, DIG_CELL, inHeavenZone, computeSweatRate, playerNearFire,
    generateShovels, generateCaveShovels, placeCelestialShovels, generateSticks, generateCaveSticks,
    generateAscentPlatforms, generateCloudPlatforms, generateGateClouds,
    generateHeavenRealmContent, generateHeavenTrees, spawnHeavenCreatures,
    generateCheckpoints, generateMapItems, layoutCaveProps, roomFloorY, roomCeilingY,
    createPickupSpreader, createSurfacePickupPlacer, PICKUP_SPREAD_MIN, CAVE_PICKUP_SPREAD_MIN
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = InteractiveWorld;
}

// Dynamic <script> injection (Cavesweat, viewer) uses window.InteractiveWorld;
// top-level const does not become a window property in browsers.
if (typeof window !== 'undefined') {
  window.InteractiveWorld = InteractiveWorld;
}

if (typeof document !== 'undefined' && typeof window !== 'undefined' && document.currentScript && document.currentScript.src) {
  try {
    const _iw_xhr = new window.XMLHttpRequest();
    _iw_xhr.open('GET', document.currentScript.src, false);
    _iw_xhr.overrideMimeType('text/plain');
    _iw_xhr.send();
    if (_iw_xhr.status === 0 || _iw_xhr.status === 200) {
      InteractiveWorld.__source__ = _iw_xhr.responseText;
    }
  } catch (_iw_e) {}
}
