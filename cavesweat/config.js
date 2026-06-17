/**
 * Maps cavesweat/world.json into DEEPIRI_DEFAULTS for the world engine.
 * Works in Node (validation) and the browser (player bootstrap).
 */

const DEFAULT_WORLD = {
  name: 'Cavesweat',
  description: 'Explore sprawling cave networks beneath the surface.',
  world: {
    width: 5000,
    height: 1500,
    surfaceBase: 350
  },
  physics: {
    gravity: 0.55,
    jumpForce: -11,
    moveSpeed: 4.5
  },
  entities: {
    platforms: 10,
    portals: 6,
    creatures: 15,
    chests: 5,
    crystals: 8,
    particles: 60,
    shovelsSurface: 12,
    shovelsCave: 8,
    celestialShovels: 1,
    sticksSurface: 16,
    sticksCave: 12
  },
  caves: {
    enabled: true,
    entrances: 4,
    tunnelRadius: 30,
    sealedPockets: 6,
    lavaOffset: 140
  },
  heaven: {
    enabled: true,
    skyStart: 180,
    skyClimb: 1050,
    realmAltitude: 2600,
    realmDepth: 360,
    layers: 6,
    ascentPlatforms: 38,
    cloudPlatforms: 56,
    trees: 16,
    props: 28,
    chests: 6,
    crystals: 10,
    items: 24,
    creatures: 10,
    freezeRate: 0.12
  },
  survival: {
    runSweatMult: 1.8,
    surfaceIdleSweat: 0.015,
    idleDeepMult: 0.65
  },
  visuals: {
    skyTop: '#0a0a1a',
    skyBottom: '#1a2a3e',
    groundTop: '#3a7d5a',
    groundBottom: '#1a0a0a',
    playerColor: '#4ecdc4',
    palette: ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', '#dfe6e9']
  },
  environment: {
    biome: 'auto',
    weather: 'auto',
    timeOfDay: 0.3
  }
};

function configToDefaults(config = {}) {
  const w = { ...DEFAULT_WORLD.world, ...config.world };
  const p = { ...DEFAULT_WORLD.physics, ...config.physics };
  const e = { ...DEFAULT_WORLD.entities, ...config.entities };
  const c = { ...DEFAULT_WORLD.caves, ...config.caves };
  const h = { ...DEFAULT_WORLD.heaven, ...config.heaven };
  const s = { ...DEFAULT_WORLD.survival, ...config.survival };
  const v = { ...DEFAULT_WORLD.visuals, ...config.visuals };

  return {
    WORLD_WIDTH: w.width,
    WORLD_HEIGHT: w.height,
    WORLD_SURFACE_BASE: w.surfaceBase,
    WORLD_GRAVITY: p.gravity,
    WORLD_JUMP_FORCE: p.jumpForce,
    WORLD_MOVE_SPEED: p.moveSpeed,
    WORLD_PLATFORM_COUNT: e.platforms,
    WORLD_PORTAL_COUNT: e.portals,
    WORLD_CREATURE_COUNT: e.creatures,
    WORLD_CHEST_COUNT: e.chests,
    WORLD_CRYSTAL_COUNT: e.crystals,
    WORLD_PARTICLE_COUNT: e.particles,
    WORLD_SHOVELS_SURFACE: e.shovelsSurface,
    WORLD_SHOVELS_CAVE: e.shovelsCave,
    WORLD_CELESTIAL_SHOVELS: e.celestialShovels,
    WORLD_STICKS_SURFACE: e.sticksSurface,
    WORLD_STICKS_CAVE: e.sticksCave,
    WORLD_CAVE_ENABLED: c.enabled !== false,
    WORLD_CAVE_ENTRANCES: c.entrances,
    WORLD_CAVE_TUNNEL_RADIUS: c.tunnelRadius,
    WORLD_CAVE_SEALED_POCKETS: c.sealedPockets,
    WORLD_CAVE_LAVA_OFFSET: c.lavaOffset,
    WORLD_HEAVEN_ENABLED: h.enabled === true,
    WORLD_HEAVEN_SKY_START: h.skyStart ?? h.altitude,
    WORLD_HEAVEN_SKY_CLIMB: h.skyClimb ?? h.skyHeight,
    WORLD_HEAVEN_REALM_ALTITUDE: h.realmAltitude ?? 2600,
    WORLD_HEAVEN_REALM_DEPTH: h.realmDepth ?? 360,
    WORLD_HEAVEN_ASCENT_PLATFORMS: h.ascentPlatforms,
    WORLD_HEAVEN_CLOUD_PLATFORMS: h.cloudPlatforms,
    WORLD_HEAVEN_LAYERS: h.layers,
    WORLD_HEAVEN_TREES: h.trees,
    WORLD_HEAVEN_PROPS: h.props,
    WORLD_HEAVEN_CHESTS: h.chests,
    WORLD_HEAVEN_CRYSTALS: h.crystals,
    WORLD_HEAVEN_ITEMS: h.items,
    WORLD_HEAVEN_CREATURES: h.creatures,
    WORLD_HEAVEN_FREEZE_RATE: h.freezeRate,
    WORLD_SURVIVAL_RUN_SWEAT_MULT: s.runSweatMult,
    WORLD_SURVIVAL_SURFACE_IDLE_SWEAT: s.surfaceIdleSweat,
    WORLD_SURVIVAL_IDLE_DEEP_MULT: s.idleDeepMult,
    WORLD_SKY_TOP: v.skyTop,
    WORLD_SKY_BOTTOM: v.skyBottom,
    WORLD_GROUND_TOP: v.groundTop,
    WORLD_GROUND_BOTTOM: v.groundBottom,
    WORLD_PLAYER_COLOR: v.playerColor,
    DEFAULT_COLORS: v.palette
  };
}

function worldConfigToRuntime(config = {}) {
  const env = { ...DEFAULT_WORLD.environment, ...config.environment };
  const v = { ...DEFAULT_WORLD.visuals, ...config.visuals };

  return {
    defaults: configToDefaults(config),
    apply: {
      biome: env.biome,
      weather: env.weather,
      timeOfDay: env.timeOfDay,
      skyTop: v.skyTop,
      skyBottom: v.skyBottom,
      groundTop: v.groundTop,
      groundBottom: v.groundBottom,
      playerColor: v.playerColor
    },
    meta: {
      name: config.name || DEFAULT_WORLD.name,
      description: config.description || DEFAULT_WORLD.description
    }
  };
}

function validateConfig(config) {
  const errors = [];
  const w = config.world || {};
  const p = config.physics || {};
  const e = config.entities || {};
  const c = config.caves || {};
  const h = config.heaven || {};
  const s = config.survival || {};

  if (w.width != null && (w.width < 1000 || w.width > 20000)) {
    errors.push('world.width must be between 1000 and 20000');
  }
  if (w.height != null && (w.height < 400 || w.height > 5000)) {
    errors.push('world.height must be between 400 and 5000');
  }
  if (p.gravity != null && (p.gravity < 0.1 || p.gravity > 3)) {
    errors.push('physics.gravity must be between 0.1 and 3');
  }
  if (p.jumpForce != null && (p.jumpForce > -3 || p.jumpForce < -25)) {
    errors.push('physics.jumpForce must be between -25 and -3');
  }
  if (c.entrances != null && (c.entrances < 2 || c.entrances > 12)) {
    errors.push('caves.entrances must be between 2 and 12');
  }

  const counts = [
    ['entities.platforms', e.platforms, 0, 50],
    ['entities.portals', e.portals, 0, 12],
    ['entities.creatures', e.creatures, 0, 80],
    ['entities.chests', e.chests, 0, 40],
    ['entities.crystals', e.crystals, 0, 60],
    ['entities.particles', e.particles, 0, 300],
    ['entities.shovelsSurface', e.shovelsSurface, 0, 40],
    ['entities.shovelsCave', e.shovelsCave, 0, 40],
    ['entities.celestialShovels', e.celestialShovels, 0, 3],
    ['entities.sticksSurface', e.sticksSurface, 0, 60],
    ['entities.sticksCave', e.sticksCave, 0, 60]
  ];
  for (const [label, val, min, max] of counts) {
    if (val != null && (val < min || val > max)) {
      errors.push(`${label} must be between ${min} and ${max}`);
    }
  }

  if (h.skyStart != null && (h.skyStart < 60 || h.skyStart > 600)) {
    errors.push('heaven.skyStart must be between 60 and 600');
  }
  if (h.altitude != null && (h.altitude < 60 || h.altitude > 600)) {
    errors.push('heaven.altitude must be between 60 and 600');
  }
  if (h.skyClimb != null && (h.skyClimb < 200 || h.skyClimb > 1600)) {
    errors.push('heaven.skyClimb must be between 200 and 1600');
  }
  if (h.skyHeight != null && (h.skyHeight < 200 || h.skyHeight > 1600)) {
    errors.push('heaven.skyHeight must be between 200 and 1600');
  }
  if (h.realmAltitude != null && (h.realmAltitude < 1200 || h.realmAltitude > 4000)) {
    errors.push('heaven.realmAltitude must be between 1200 and 4000');
  }
  if (h.realmDepth != null && (h.realmDepth < 120 || h.realmDepth > 800)) {
    errors.push('heaven.realmDepth must be between 120 and 800');
  }
  if (h.ascentPlatforms != null && (h.ascentPlatforms < 0 || h.ascentPlatforms > 120)) {
    errors.push('heaven.ascentPlatforms must be between 0 and 120');
  }
  if (h.cloudPlatforms != null && (h.cloudPlatforms < 0 || h.cloudPlatforms > 240)) {
    errors.push('heaven.cloudPlatforms must be between 0 and 240 (0 = auto)');
  }
  if (h.layers != null && (h.layers < 3 || h.layers > 16)) {
    errors.push('heaven.layers must be between 3 and 16');
  }
  if (h.trees != null && (h.trees < 0 || h.trees > 40)) {
    errors.push('heaven.trees must be between 0 and 40');
  }
  if (h.freezeRate != null && (h.freezeRate < 0.01 || h.freezeRate > 1)) {
    errors.push('heaven.freezeRate must be between 0.01 and 1');
  }
  if (h.skyHeight != null && (h.skyHeight < 120 || h.skyHeight > 1200)) {
    errors.push('heaven.skyHeight is deprecated — use skyClimb (200–1600)');
  }
  if (s.runSweatMult != null && (s.runSweatMult < 0.5 || s.runSweatMult > 5)) {
    errors.push('survival.runSweatMult must be between 0.5 and 5');
  }
  if (s.surfaceIdleSweat != null && (s.surfaceIdleSweat < 0 || s.surfaceIdleSweat > 0.5)) {
    errors.push('survival.surfaceIdleSweat must be between 0 and 0.5');
  }
  if (s.idleDeepMult != null && (s.idleDeepMult < 0.1 || s.idleDeepMult > 2)) {
    errors.push('survival.idleDeepMult must be between 0.1 and 2');
  }

  return errors;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    DEFAULT_WORLD,
    configToDefaults,
    worldConfigToRuntime,
    validateConfig
  };
}

if (typeof window !== 'undefined') {
  window.CavesweatConfig = {
    DEFAULT_WORLD,
    configToDefaults,
    worldConfigToRuntime,
    validateConfig
  };
}
