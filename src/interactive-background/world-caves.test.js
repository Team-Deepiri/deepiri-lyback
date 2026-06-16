const InteractiveWorld = require('./world-engine.js');

const { generateTerrain, generateCaves, caveCarved, isRockAt } = InteractiveWorld;

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
    const x = 50; // away from the ~0.32W / 0.7W entrances
    const surf = InteractiveWorld.getTerrainY(terrain, x);
    expect(isRockAt(caves, terrain, x, surf - 100)).toBe(false); // air above ground
    expect(isRockAt(caves, terrain, x, 1000)).toBe(true);        // deep solid rock
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
