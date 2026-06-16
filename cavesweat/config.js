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
    particles: 60
  },
  caves: {
    enabled: true,
    entrances: 4,
    tunnelRadius: 30,
    sealedPockets: 6,
    lavaOffset: 140
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
    WORLD_CAVE_ENABLED: c.enabled !== false,
    WORLD_CAVE_ENTRANCES: c.entrances,
    WORLD_CAVE_TUNNEL_RADIUS: c.tunnelRadius,
    WORLD_CAVE_SEALED_POCKETS: c.sealedPockets,
    WORLD_CAVE_LAVA_OFFSET: c.lavaOffset,
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
    ['entities.particles', e.particles, 0, 300]
  ];
  for (const [label, val, min, max] of counts) {
    if (val != null && (val < min || val > max)) {
      errors.push(`${label} must be between ${min} and ${max}`);
    }
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
