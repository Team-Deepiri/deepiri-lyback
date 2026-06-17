const InteractiveWorld = require('./world-engine.js');
const { configToDefaults, validateConfig } = require('../../cavesweat/config.js');
const cavesweatWorld = require('../../cavesweat/world.json');

const {
  generateTerrain, generateCaves, caveCarved, isRockAt, materialAt, digCellKey,
  inHeavenZone, computeSweatRate,   generateShovels, generateCaveShovels, placeCelestialShovels,
  generateSticks, generateCaveSticks,
  generateAscentPlatforms, generateCloudPlatforms, generateGateClouds,
  generateHeavenTerrain, getHeavenGroundY, getBiomeAt, getTerrainY, touchesWall,
  generateHeavenRealmContent,
  generateCheckpoints, generateMapItems, layoutCaveProps, roomFloorY, roomCeilingY
} = InteractiveWorld;

describe('cave system', () => {
  const terrain = generateTerrain(5000);
  const caves = generateCaves(terrain);

  it('generates tunnels, chambers, entrances and a dig buffer', () => {
    expect(caves.tunnels.length).toBeGreaterThan(0);
    expect(caves.chambers.length).toBeGreaterThan(0);
    expect(caves.entrances.length).toBeGreaterThanOrEqual(2);
    expect(Array.isArray(caves.digHoles)).toBe(true);
  });

  it('builds a sprawling deep network and sealed loot pockets', () => {
    // "a fuck ton of deeper tunnels"
    expect(caves.tunnels.length).toBeGreaterThan(40);
    expect(caves.pockets.length).toBeGreaterThan(0);
    expect(caves.pockets.every((p) => p.sealed && p.loot)).toBe(true);
    // a lava line exists down low
    expect(caves.lavaY).toBeGreaterThan(0);
    expect(caves.lavaY).toBeLessThan(1500);
    // at least one room reaches into the lava zone
    expect(caves.chambers.some((c) => c.y + c.r > caves.lavaY)).toBe(true);
  });

  it('seals pockets in rock until dug, then they open up', () => {
    const pk = caves.pockets[0];
    // pocket interior is carved (walkable) space
    expect(caveCarved(caves, pk.x, pk.y)).toBe(true);
  });

  it('keys dig progress to grid cells so running does not reset chips', () => {
    const cell = 16;
    const start = digCellKey(100, 200, cell);
    // nudges within the same cell while the player runs
    expect(digCellKey(108, 205, cell)).toEqual(start);
    expect(digCellKey(111, 207, cell)).toEqual(start);
    // crossing into the next cell is a fresh target
    expect(digCellKey(112, 200, cell)).not.toEqual(start);
  });

  it('grades dig material from soft near the surface to hard deep down', () => {
    const x = 50;
    const surf = InteractiveWorld.getTerrainY(terrain, x);
    const shallow = materialAt(terrain, x, surf + 10);
    const deep = materialAt(terrain, x, surf + 700);
    const lava = materialAt(terrain, x, 1400);
    expect(shallow.hardness).toBeLessThanOrEqual(2);     // sand/dirt up top
    expect(deep.hardness).toBeGreaterThan(shallow.hardness);
    expect(lava.name).toBe('basalt');                    // brutal near lava
    expect(lava.hardness).toBeGreaterThan(deep.hardness);
  });

  it('treats a freshly dug hole as walkable space', () => {
    const x = 50, surf = InteractiveWorld.getTerrainY(terrain, x);
    const deep = { x, y: surf + 120, r: 21 };
    expect(isRockAt(caves, terrain, deep.x, deep.y)).toBe(true); // solid before digging
    caves.digHoles.push(deep);
    expect(caveCarved(caves, deep.x, deep.y)).toBe(true);        // carved after digging
    caves.digHoles.pop();
  });

  it('carves out chamber interiors', () => {
    const c = caves.chambers[0];
    expect(caveCarved(caves, c.x, c.y)).toBe(true);
    // far from any cave is solid rock, not carved
    expect(caveCarved(caves, (c.x + 2500) % 4990 + 5, c.y + 900)).toBe(false);
  });

  it('keeps entrance shafts level with the surface', () => {
    for (const ex of caves.entrances) {
      const surf = InteractiveWorld.getTerrainY(terrain, ex);
      const shaft = caves.tunnels.find((t) => t.entrance && Math.abs(t.ax - ex) < 80);
      expect(shaft).toBeDefined();
      expect(shaft.ay).toBeGreaterThanOrEqual(surf - 2);
      expect(shaft.ay).toBeLessThanOrEqual(surf + 2);
    }
  });

  it('treats above-ground as air and deep rock as solid', () => {
    const x = 4800; // far from cave entrance shafts
    const surf = InteractiveWorld.getTerrainY(terrain, x);
    expect(isRockAt(caves, terrain, x, surf - 100)).toBe(false); // air above ground
    let deepSolid = false;
    for (let y = surf + 400; y < 1400; y += 40) {
      if (isRockAt(caves, terrain, x, y)) { deepSolid = true; break; }
    }
    expect(deepSolid).toBe(true);
  });

  it('makes chamber centers walkable (not solid)', () => {
    const walkable = caves.chambers.some((ch) => {
      const py = ch.y + Math.min(12, ch.r * 0.25);
      return getTerrainY(terrain, ch.x) < py
        && caveCarved(caves, ch.x, py)
        && !isRockAt(caves, terrain, ch.x, py);
    });
    expect(walkable).toBe(true);
  });

  it('keeps chambers above the world floor so the player cannot fall out', () => {
    for (const c of caves.chambers) {
      expect(c.y).toBeLessThan(1500);
    }
  });
});

describe('survival and heaven helpers', () => {
  const terrain = generateTerrain(5000);
  const surf = InteractiveWorld.getTerrainY(terrain, 200);

  it('detects heaven realm only on the solid heaven domain', () => {
    const heavenTerrain = generateHeavenTerrain(terrain);
    const hgY = getHeavenGroundY(heavenTerrain, 200);
    expect(inHeavenZone(hgY - 40, 28, 200, heavenTerrain, true)).toBe(true);
    expect(inHeavenZone(surf - 400, 28, 200, heavenTerrain, true)).toBe(false);
    expect(inHeavenZone(hgY - 40, 28, 200, heavenTerrain, false)).toBe(false);
  });

  it('lands on heaven solid ground via isRockAt', () => {
    const heavenTerrain = generateHeavenTerrain(terrain);
    const hgY = getHeavenGroundY(heavenTerrain, 500);
    expect(isRockAt(null, terrain, 500, hgY + 10, heavenTerrain)).toBe(true);
    expect(isRockAt(null, terrain, 500, hgY - 30, heavenTerrain)).toBe(false);
  });

  it('heaven ground is flat constant solid terrain', () => {
    const heavenTerrain = generateHeavenTerrain(terrain);
    const y0 = getHeavenGroundY(heavenTerrain, 200);
    const y1 = getHeavenGroundY(heavenTerrain, 2500);
    const y2 = getHeavenGroundY(heavenTerrain, 4800);
    expect(Math.abs(y0 - y1)).toBeLessThan(1);
    expect(Math.abs(y1 - y2)).toBeLessThan(1);
  });

  it('fills heaven realm with solid-map props and loot', () => {
    const heavenTerrain = generateHeavenTerrain(terrain);
    const realm = generateHeavenRealmContent(heavenTerrain, null);
    expect(realm.platforms.some((p) => p.kind === 'heaven-solid')).toBe(true);
    expect(realm.platforms.some((p) => p.kind === 'heaven-solid' && p.w >= 4900)).toBe(true);
    expect(realm.props.length).toBeGreaterThan(10);
    expect(realm.chests.length).toBeGreaterThan(0);
    expect(realm.crystals.length).toBeGreaterThan(0);
    const fullSlab = realm.platforms.find((p) => p.kind === 'heaven-solid' && p.w >= 4900);
    const slabGy = getHeavenGroundY(heavenTerrain, fullSlab.x + fullSlab.w / 2);
    expect(Math.abs(fullSlab.y + fullSlab.h - slabGy)).toBeLessThan(2);
    for (const p of realm.platforms.filter((pl) => pl.kind === 'heaven-solid' && pl !== fullSlab)) {
      const gy = getHeavenGroundY(heavenTerrain, p.x + p.w / 2);
      expect(Math.abs(p.y + p.h - gy)).toBeLessThanOrEqual(4);
    }
  });

  it('reports surface biome below heaven realm', () => {
    const heavenTerrain = generateHeavenTerrain(terrain);
    const biome = getBiomeAt(200, surf - 50, terrain, heavenTerrain);
    expect(biome.name).not.toBe('heaven');
  });

  it('reports heaven biome on the solid realm', () => {
    const heavenTerrain = generateHeavenTerrain(terrain);
    const hgY = getHeavenGroundY(heavenTerrain, 200);
    const biome = getBiomeAt(200, hgY - 20, terrain, heavenTerrain);
    expect(biome.name).toBe('heaven');
  });

  it('skips cloud parkour when heaven is disabled in test defaults', () => {
    expect(generateCloudPlatforms(terrain, null)).toEqual([]);
    expect(generateAscentPlatforms(terrain, [])).toEqual([]);
  });

  it('maps Cavesweat world.json heaven into sky climb + realm config', () => {
    const d = configToDefaults(cavesweatWorld);
    expect(d.WORLD_HEAVEN_ENABLED).toBe(true);
    expect(d.WORLD_HEAVEN_SKY_CLIMB).toBe(1050);
    expect(d.WORLD_HEAVEN_REALM_ALTITUDE).toBe(2600);
    expect(d.WORLD_HEAVEN_REALM_DEPTH).toBe(360);
    expect(d.WORLD_HEAVEN_LAYERS).toBe(6);
    expect(d.WORLD_HEAVEN_CLOUD_PLATFORMS).toBe(56);
    expect(validateConfig(cavesweatWorld)).toEqual([]);
  });

  it('sweats more when running underground than standing still on surface', () => {
    const running = computeSweatRate(0.6, 200, true, true, false);
    const surfaceIdle = computeSweatRate(0, -10, false, true, false);
    const deepIdle = computeSweatRate(0.6, 200, false, true, false);
    expect(running).toBeGreaterThan(deepIdle);
    expect(deepIdle).toBeGreaterThan(surfaceIdle);
  });

  it('sweats more near a campfire than standing idle on the surface', () => {
    const idle = computeSweatRate(0, -10, false, true, false);
    const byFire = computeSweatRate(0, -10, false, true, false, true);
    expect(byFire).toBeGreaterThan(idle);
  });

  it('spawns shovels and sticks on surface and in caves', () => {
    const caves = generateCaves(terrain);
    const spreader = InteractiveWorld.createPickupSpreader();
    const surfacePlacer = InteractiveWorld.createSurfacePickupPlacer(spreader);
    const shovels = generateShovels(terrain, spreader, surfacePlacer)
      .concat(generateCaveShovels(caves, terrain, null, spreader));
    const sticks = generateSticks(terrain, spreader, surfacePlacer)
      .concat(generateCaveSticks(caves, terrain, null, spreader));
    expect(shovels.filter((s) => s.kind === 'surface').length).toBe(12);
    expect(sticks.filter((s) => s.kind === 'surface').length).toBe(16);
    expect(shovels.some((s) => s.kind === 'cave')).toBe(true);
    expect(sticks.some((s) => s.kind === 'cave')).toBe(true);
  });

  it('spawns at most one celestial shovel in a sealed pocket or sky perch', () => {
    const caves = generateCaves(terrain);
    const heavenHeights = generateHeavenTerrain(5000);
    const clouds = generateCloudPlatforms(terrain, heavenHeights);
    const spreader = InteractiveWorld.createPickupSpreader();
    const celestials = placeCelestialShovels(caves, terrain, heavenHeights, spreader, clouds);
    expect(celestials.length).toBeLessThanOrEqual(1);
    if (celestials.length) {
      expect(celestials[0].tier).toBe(6);
      expect(['cave', 'sky']).toContain(celestials[0].kind);
    }
    const caveShovels = generateCaveShovels(caves, terrain, heavenHeights, spreader);
    expect(caveShovels.every((s) => s.tier < 6)).toBe(true);
  });

  it('spreads surface pickups apart instead of clustering at cave entrances', () => {
    const spreader = InteractiveWorld.createPickupSpreader();
    const surfacePlacer = InteractiveWorld.createSurfacePickupPlacer(spreader);
    const shovels = generateShovels(terrain, spreader, surfacePlacer);
    const sticks = generateSticks(terrain, spreader, surfacePlacer);
    const surface = shovels.concat(sticks);
    const band = (5000 - surfacePlacer.margin * 2) / surfacePlacer.total;
    for (let i = 0; i < surface.length; i++) {
      for (let j = i + 1; j < surface.length; j++) {
        expect(Math.abs(surface[i].x - surface[j].x)).toBeGreaterThanOrEqual(band * 0.35);
      }
    }
  });

  it('limits cave decor per area and anchors props to room geometry', () => {
    const caves = generateCaves(terrain);
    const { caveChests, buckets } = layoutCaveProps(caves, terrain);
    let totalBoulders = 0, totalCrystals = 0, totalStalactites = 0;
    for (const c of caves.chambers) {
      totalBoulders += (c.boulders || []).length;
      totalCrystals += (c.crystals || []).length;
      totalStalactites += (c.stalactites || []).length;
      for (const b of (c.boulders || [])) {
        const fy = roomFloorY(c, b.dx);
        expect(caveCarved(caves, c.x + b.dx, fy - 8)).toBe(true);
        expect(isRockAt(caves, terrain, c.x + b.dx, fy + 6)).toBe(true);
      }
      for (const s of (c.stalactites || [])) {
        const x = c.x + s.dx;
        if (s.up) {
          const fy = roomFloorY(c, s.dx);
          expect(caveCarved(caves, x, fy - 8)).toBe(true);
        } else {
          const cy = roomCeilingY(c, s.dx);
          expect(caveCarved(caves, x, cy + 12)).toBe(true);
          expect(isRockAt(caves, terrain, x, cy - 4)).toBe(true);
        }
      }
    }
    expect(totalBoulders).toBeLessThan(caves.chambers.length * 2);
    expect(totalCrystals).toBeLessThan(caves.chambers.length);
    expect(totalStalactites).toBeGreaterThan(0);
    expect(caveChests.length).toBeLessThanOrEqual(caves.pockets.length);
    expect(buckets.length).toBeLessThan(caves.chambers.length);
  });

  it('places checkpoints and map trinkets across the world', () => {
    const caves = generateCaves(terrain);
    const heavenTerrain = generateHeavenTerrain(terrain);
    const cps = generateCheckpoints(terrain, caves, heavenTerrain);
    const items = generateMapItems(terrain, caves, heavenTerrain);
    expect(cps.length).toBeGreaterThanOrEqual(2);
    expect(items.length).toBeGreaterThan(10);
    expect(cps.some((cp) => cp.kind === 'surface')).toBe(true);
  });

  it('detects rock walls beside the player for wall grab', () => {
    const caves = generateCaves(terrain);
    const x = 4800;
    const surf = InteractiveWorld.getTerrainY(terrain, x);
    const y = surf + 200;
    expect(touchesWall(caves, terrain, x, y, 18, 28, 1)).toBe(true);
    expect(touchesWall(caves, terrain, x, 50, 18, 28, 1)).toBe(false);
  });
});
