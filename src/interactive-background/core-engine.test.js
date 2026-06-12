const path = require('path');

describe('InteractiveEngine', () => {
  let engine;
  let mockCanvas;

  beforeAll(() => {
    global.document = {
      getElementById: () => mockCanvas,
    };
    global.window = { addEventListener: () => {} };
    global.requestAnimationFrame = () => {};
    global.performance = { now: () => 0 };

    mockCanvas = {
      width: 1280,
      height: 720,
      getContext: () => ({
        fillRect: () => {},
        fillStyle: '',
        beginPath: () => {},
        arc: () => {},
        fill: () => {},
        moveTo: () => {},
        lineTo: () => {},
        stroke: () => {},
        strokeStyle: '',
        lineWidth: 0,
        globalAlpha: 1,
        createRadialGradient: () => ({
          addColorStop: () => {},
        }),
      }),
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 1280, height: 720 }),
      parentElement: {
        getBoundingClientRect: () => ({ width: 1280, height: 720 }),
      },
      addEventListener: () => {},
    };

    engine = require('./core-engine.js');
  });

  afterAll(() => {
    delete global.document;
    delete global.window;
    delete global.requestAnimationFrame;
    delete global.performance;
  });

  describe('CONFIG', () => {
    it('exports default config values', () => {
      expect(engine.CONFIG.TARGET_FPS).toBe(30);
      expect(engine.CONFIG.MAX_PARTICLES).toBe(200);
      expect(Array.isArray(engine.CONFIG.COLORS)).toBe(true);
      expect(engine.CONFIG.COLORS.length).toBe(6);
    });
  });

  describe('Particle', () => {
    it('can be constructed with a canvas', () => {
      const p = new engine.Particle(100, 200, mockCanvas);
      expect(p.x).toBe(100);
      expect(p.y).toBe(200);
      expect(p.vx).toBeDefined();
      expect(p.vy).toBeDefined();
      expect(p.size).toBeGreaterThan(0);
      expect(p.color).toBeDefined();
      expect(p.life).toBe(1);
      expect(p.decay).toBeGreaterThan(0);
    });

    it('reset assigns random position when x/y null', () => {
      const p = new engine.Particle(null, null, mockCanvas);
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThanOrEqual(1280);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeLessThanOrEqual(720);
    });
  });

  describe('Engine', () => {
    it('can be constructed', () => {
      const inst = new engine.Engine(mockCanvas, { interactive: false });
      expect(inst.canvas).toBe(mockCanvas);
      expect(inst.isRunning).toBe(false);
      expect(inst.particles).toBeDefined();
    });

    it('creates particles on init', () => {
      const inst = new engine.Engine(mockCanvas, { interactive: false });
      expect(inst.particles.length).toBe(engine.CONFIG.MAX_PARTICLES);
    });

    it('exportConfig returns config object', () => {
      const inst = new engine.Engine(mockCanvas, { interactive: false });
      const cfg = inst.exportConfig();
      expect(cfg.mode).toBe('particles');
      expect(cfg.particleCount).toBe(engine.CONFIG.MAX_PARTICLES);
      expect(cfg.colors).toEqual(engine.CONFIG.COLORS);
    });
  });
});
