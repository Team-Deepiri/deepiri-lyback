const InteractiveWorld = require('./world-engine.js');

const {
  generateTerrain, generateCaves, caveCarved, isRockAt, materialAt, digCellKey,
  inHeavenZone, computeSweatRate, generateShovels, generateCaveShovels,
  generateSticks, generateCaveSticks,
  generateAscentPlatforms, generateCloudPlatforms, touchesWall
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
    expect(caveCarved(caves, c.x + 5000, c.y)).toBe(false);
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
    const c = caves.chambers[0];
    expect(isRockAt(caves, terrain, c.x, c.y)).toBe(false);
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

  it('detects heaven zone above the altitude threshold', () => {
    expect(inHeavenZone(surf - 300, 28, surf, true, 280)).toBe(true);
    expect(inHeavenZone(surf - 100, 28, surf, true, 280)).toBe(false);
    expect(inHeavenZone(surf - 300, 28, surf, false, 280)).toBe(false);
  });

  it('sweats more when running underground than standing still on surface', () => {
    const running = computeSweatRate(0.6, 200, true, true, false);
    const surfaceIdle = computeSweatRate(0, -10, false, true, false);
    const deepIdle = computeSweatRate(0.6, 200, false, true, false);
    expect(running).toBeGreaterThan(deepIdle);
    expect(deepIdle).toBeGreaterThan(surfaceIdle);
  });

  it('spawns shovels and sticks on surface and in caves', () => {
    const caves = generateCaves(terrain);
    const shovels = generateShovels(terrain, caves.entrances)
      .concat(generateCaveShovels(caves, terrain));
    const sticks = generateSticks(terrain, caves.entrances)
      .concat(generateCaveSticks(caves));
    expect(shovels.length).toBeGreaterThanOrEqual(12);
    expect(sticks.length).toBeGreaterThanOrEqual(16);
    expect(shovels.some((s) => s.kind === 'surface')).toBe(true);
    expect(shovels.some((s) => s.kind === 'cave')).toBe(true);
  });

  it('limits cave decor per area and snaps props to room floors', () => {
    const caves = generateCaves(terrain);
    const { caveChests, buckets } = InteractiveWorld.layoutCaveProps(caves, terrain);
    let totalBoulders = 0, totalCrystals = 0;
    for (const c of caves.chambers) {
      totalBoulders += (c.boulders || []).length;
      totalCrystals += (c.crystals || []).length;
      for (const b of (c.boulders || [])) {
        const fy = InteractiveWorld.roomFloorY(c, b.dx);
        expect(Math.abs(fy - (c.y + b.dy))).toBeLessThan(1);
      }
    }
    expect(totalBoulders).toBeLessThan(caves.chambers.length * 2);
    expect(totalCrystals).toBeLessThan(caves.chambers.length);
    expect(caveChests.length).toBeLessThanOrEqual(caves.pockets.length);
    expect(buckets.length).toBeLessThan(caves.chambers.length);
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
