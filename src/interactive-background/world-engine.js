const InteractiveWorld = (() => {
  const DEFAULTS = (typeof DEEPIRI_DEFAULTS !== 'undefined') ? DEEPIRI_DEFAULTS : {};

  const CFG = {
    WORLD_WIDTH: DEFAULTS.WORLD_WIDTH || 5000,
    WORLD_HEIGHT: DEFAULTS.WORLD_HEIGHT || 1500,
    SURFACE_BASE: DEFAULTS.WORLD_SURFACE_BASE || 350,
    GRAVITY: 0.55,
    JUMP_FORCE: -11,
    MOVE_SPEED: 4.5,
    MAX_FALL_SPEED: 14,
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
    PLAYER_COLOR: DEFAULTS.WORLD_PLAYER_COLOR || '#4ecdc4'
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
      platforms.push({ x, y, w, h: 12, color: biome.accent });
    }
    return platforms;
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

  function generateChests(heights) {
    const chests = [];
    for (let i = 0; i < CFG.CHEST_COUNT; i++) {
      const x = 200 + Math.random() * (CFG.WORLD_WIDTH - 400);
      const ty = getTerrainY(heights, x);
      const biome = getBiome(x);
      chests.push({
        x, y: ty - 18,
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

  function generateCrystals(heights) {
    const crystals = [];
    for (let i = 0; i < CFG.CRYSTAL_COUNT; i++) {
      const x = 100 + Math.random() * (CFG.WORLD_WIDTH - 200);
      const y = getTerrainY(heights, x) - 40 - Math.random() * 80;
      const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', '#dfe6e9'];
      crystals.push({
        x, y,
        size: 6 + Math.random() * 6,
        color: colors[Math.floor(Math.random() * colors.length)],
        phase: Math.random() * Math.PI * 2,
        rot: Math.random() * Math.PI * 2,
        floatOffset: Math.random() * Math.PI * 2
      });
    }
    return crystals;
  }

  class Creature {
    constructor(worldWidth, worldHeight, heights) {
      this.worldWidth = worldWidth;
      this.worldHeight = worldHeight;
      this.type = Math.random() < 0.5 ? 'bird' : Math.random() < 0.6 ? 'firefly' : 'bunny';
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
      this.heights = heights;
    }
    update() {
      this.timer++;
      if (this.timer > this.dirChange) {
        this.vx = (Math.random() - 0.5) * 1.5;
        this.vy = (Math.random() - 0.5) * 0.5;
        this.dirChange = Math.random() * 200 + 100;
        this.timer = 0;
        if (this.type === 'bunny') this.vy = -3;
      }
      if (this.type === 'bird') {
        this.wingPhase += 0.1;
        this.vy += Math.sin(this.wingPhase) * 0.02;
      }
      if (this.type === 'firefly') {
        this.life = 0.5 + Math.sin(this.wingPhase * 2) * 0.3;
        this.wingPhase += 0.03;
      }
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
        ctx.globalAlpha = this.life * 0.7;
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

  class Player {
    constructor(x, y) {
      this.x = x;
      this.y = y;
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
    }

    update(keys, heights, platforms, portals, chests) {
      const moveX = (keys.left || keys.a) ? -1 : (keys.right || keys.d) ? 1 : 0;
      if (moveX !== 0) {
        this.vx = moveX * CFG.MOVE_SPEED;
        this.facing = moveX > 0 ? 1 : -1;
        this.isMoving = true;
      } else {
        this.vx *= 0.75;
        if (Math.abs(this.vx) < 0.2) this.vx = 0;
        this.isMoving = false;
      }

      const jumpKey = keys.up || keys.w || keys.space;
      if (jumpKey && !keys._jumpHeld) {
        if (this.onGround) {
          this.vy = CFG.JUMP_FORCE;
          this.onGround = false;
          this.canDoubleJump = true;
        } else if (this.canDoubleJump) {
          this.vy = CFG.JUMP_FORCE * 0.85;
          this.canDoubleJump = false;
        }
        keys._jumpHeld = true;
      }
      if (!jumpKey) keys._jumpHeld = false;

      this.vy += CFG.GRAVITY;
      if (this.vy > CFG.MAX_FALL_SPEED) this.vy = CFG.MAX_FALL_SPEED;

      this.x += this.vx;
      this.y += this.vy;

      this.wasOnGround = this.onGround;
      this.onGround = false;

      const tx = this.x + this.w / 2;
      const terrainY = getTerrainY(heights, tx);
      const pb = this.y + this.h;

      if (pb >= terrainY) {
        this.y = terrainY - this.h;
        this.vy = 0;
        this.onGround = true;
        this.canDoubleJump = true;
        if (!this.wasOnGround && this.vy >= -1) this.landDust = 8;
      }

      for (const plat of platforms) {
        if (this.x + this.w > plat.x && this.x < plat.x + plat.w &&
            this.y + this.h > plat.y && this.y + this.h < plat.y + plat.h + this.vy + 2 &&
            this.vy >= 0) {
          this.y = plat.y - this.h;
          this.vy = 0;
          this.onGround = true;
          this.canDoubleJump = true;
          if (!this.wasOnGround) this.landDust = 6;
        }
      }

      if (this.x < 0) { this.x = 0; this.vx = 0; }
      if (this.x + this.w > CFG.WORLD_WIDTH) { this.x = CFG.WORLD_WIDTH - this.w; this.vx = 0; }
      if (this.y > CFG.WORLD_HEIGHT + 200) { this.y = 200; this.vy = 0; }

      if (this.isMoving && this.onGround) this.walkFrame += 0.12;
      else if (this.onGround) this.walkFrame = 0;

      if (this.portalCooldown > 0) this.portalCooldown--;
      if (this.landDust > 0) this.landDust--;

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
      ctx.save();
      const bodyColor = playerColor || '#4ecdc4';
      const darkBodyColor = playerColor ? this.shadeColor(playerColor, -0.4) : '#2d1b4e';

      if (this.landDust > 0) {
        ctx.fillStyle = `rgba(200, 180, 150, ${this.landDust / 12})`;
        for (let i = 0; i < 3; i++) {
          const dx = (i - 1) * 4 + Math.random() * 2;
          ctx.beginPath();
          ctx.arc(sx + this.w / 2 + dx, sy + this.h, 2 + Math.random() * 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.fillStyle = darkBodyColor;
      const legAnim = this.isMoving && this.onGround ? Math.sin(this.walkFrame * 2) * 3 : 0;
      ctx.fillRect(sx + 3, sy + this.h - 6, 5, 6 + legAnim);
      ctx.fillRect(sx + this.w - 8, sy + this.h - 6, 5, 6 - legAnim);

      ctx.fillStyle = bodyColor;
      ctx.fillRect(sx + 1, sy + 10, this.w - 2, this.h - 14);

      ctx.fillStyle = '#ff6b6b';
      ctx.fillRect(sx + this.w / 2 - 4, sy + 14, 8, 3);

      ctx.fillStyle = '#45b7d1';
      ctx.fillRect(sx - 1, sy, this.w + 2, 12);
      ctx.fillRect(sx + 1, sy - 2, this.w - 2, 3);

      ctx.fillStyle = '#ffffff';
      const eyeX = this.facing === 1 ? sx + this.w - 7 : sx + 4;
      ctx.fillRect(eyeX, sy + 3, 5, 4);
      ctx.fillRect(eyeX + 6, sy + 3, 5, 4);

      ctx.fillStyle = '#0d0d14';
      ctx.fillRect(eyeX + 1, sy + 4, 2, 2);
      ctx.fillRect(eyeX + 7, sy + 4, 2, 2);

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
      this.keys = { _jumpHeld: false };
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
      this.init();
    }

    init() {
      this.resize();
      this.terrain = generateTerrain(CFG.WORLD_WIDTH);
      this.platforms = generatePlatforms(this.terrain);
      this.portals = generatePortals(this.terrain);
      this.chests = generateChests(this.terrain);
      this.crystals = generateCrystals(this.terrain);

      const startY = getTerrainY(this.terrain, 100);
      this.player = new Player(100, startY - CFG.PLAYER_H - 5);

      this.particles = [];
      for (let i = 0; i < CFG.PARTICLE_COUNT; i++) {
        this.particles.push(new WorldParticle(CFG.WORLD_WIDTH, CFG.WORLD_HEIGHT));
      }

      this.creatures = [];
      for (let i = 0; i < CFG.CREATURE_COUNT; i++) {
        this.creatures.push(new Creature(CFG.WORLD_WIDTH, CFG.WORLD_HEIGHT, this.terrain));
      }

      this.generateStars();
      this.generateBgMountains();

      if (this.interactive) this.setupInput();
      window.addEventListener('resize', () => this.resize());
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

    setupInput() {
      document.addEventListener('keydown', (e) => {
        const key = e.key.toLowerCase();
        if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(e.key)) e.preventDefault();
        if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) this.keys[key.replace('arrow', '')] = true;
        else if (key === ' ' || key === 'w' || key === 'a' || key === 's' || key === 'd' || key === 'e' || key === 'm') {
          if (key === 'e') this.interactWithPortal();
          else if (key === 'm') this.showMinimap = !this.showMinimap;
          else this.keys[key] = true;
        }
      });
      document.addEventListener('keyup', (e) => {
        const key = e.key.toLowerCase();
        if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) this.keys[key.replace('arrow', '')] = false;
        else if (key === ' ' || key === 'w' || key === 'a' || key === 's' || key === 'd') this.keys[key] = false;
      });
      this.canvas.addEventListener('click', (e) => {
        const rect = this.canvas.getBoundingClientRect();
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
      });
      this.canvas.addEventListener('mousemove', (e) => {
        const rect = this.canvas.getBoundingClientRect();
        this.mouseX = e.clientX - rect.left;
        this.mouseY = e.clientY - rect.top;
      });
    }

    interactWithPortal() {
      for (const p of this.portals) {
        const dx = (this.player.x + this.player.w / 2) - p.x;
        const dy = (this.player.y + this.player.h / 2) - p.y;
        if (Math.sqrt(dx * dx + dy * dy) < p.radius + 40) { this.activatePortal(p); break; }
      }
    }

    activatePortal(portal) {
      portal.activated = !portal.activated;
      portal.pulse = 0;
      this.showInteraction(portal.label, portal.color);
    }

    showInteraction(text, color) {
      this.interactables.push({ text, color, life: 1, y: -50 });
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
      this.player.update(this.keys, this.terrain, this.platforms, this.portals, this.chests);

      const tCX = this.player.x + this.player.w / 2 - this.canvas.width * 0.35;
      const tCY = this.player.y + this.player.h / 2 - this.canvas.height * 0.5;
      this.cameraX += (tCX - this.cameraX) * 0.08;
      this.cameraY += (tCY - this.cameraY) * 0.08;
      this.cameraX = Math.max(0, Math.min(this.cameraX, CFG.WORLD_WIDTH - this.canvas.width));
      this.cameraY = Math.max(0, Math.min(this.cameraY, CFG.WORLD_HEIGHT - this.canvas.height));

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
      for (const p of this.particles) p.update();
      for (const c of this.creatures) c.update();
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
      this.drawBgMountains(ctx, cx, cy, W, H);
      this.drawTerrain(ctx, cx, cy, W, H);
      this.drawPlatforms(ctx, cx, cy, W, H);
      this.drawCrystals(ctx, cx, cy, W, H);
      this.drawChests(ctx, cx, cy, W, H);
      this.drawPortals(ctx, cx, cy, W, H);
      this.drawCreatures(ctx, cx, cy, W, H);
      this.player.draw(ctx, cx, cy, this._playerColor);
      this.drawParticles(ctx, cx, cy, W, H);
      this.drawWeather(ctx, cx, cy, W, H);
      this.drawInteractions(ctx, W, H);
      this.drawHUD(ctx, W);
      if (this.showMinimap) this.drawMinimap(ctx, W, H);
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

    drawPlatforms(ctx, cx, cy, W, H) {
      for (const plat of this.platforms) {
        const px = plat.x - cx, py = plat.y - cy;
        if (px + plat.w < -50 || px > W + 50 || py + plat.h < -50 || py > H + 50) continue;
        ctx.fillStyle = plat.color;
        ctx.fillRect(px, py, plat.w, plat.h);
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.fillRect(px, py, plat.w, 3);
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.fillRect(px, py + plat.h - 2, plat.w, 2);
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
      for (const ia of this.interactables) {
        ctx.globalAlpha = ia.life;
        ctx.fillStyle = ia.color;
        ctx.font = 'bold 16px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('✦ ' + ia.text + ' ✦', W / 2, H / 2 + ia.y);
        ctx.globalAlpha = 1;
      }
    }

    drawHUD(ctx, W) {
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.font = '11px monospace';
      ctx.textAlign = 'left';

      let hudY = 14;
      const weatherIcon = this.weatherState === 'rain' ? '🌧' : this.weatherState === 'snow' ? '❄' : '☀';
      ctx.fillText(`${weatherIcon} WASD:Move Space:Jump E:Interact M:Map`, 14, hudY);
      hudY += 18;

      let nearPortal = null;
      for (const p of this.portals) {
        const dx = (this.player.x + this.player.w / 2) - p.x;
        const dy = (this.player.y + this.player.h / 2) - p.y;
        if (Math.sqrt(dx * dx + dy * dy) < p.radius + 50) { nearPortal = p; break; }
      }
      if (nearPortal) {
        ctx.fillStyle = nearPortal.color;
        ctx.font = 'bold 13px monospace';
        ctx.fillText(`[E] ${nearPortal.label}`, 14, hudY);
        hudY += 18;
      }

      let nearChest = null;
      for (const c of this.chests) {
        const dx = (this.player.x + this.player.w / 2) - c.x;
        const dy = (this.player.y + this.player.h / 2) - c.y;
        if (Math.sqrt(dx * dx + dy * dy) < 30) { nearChest = c; break; }
      }
      if (nearChest) {
        ctx.fillStyle = '#c49040';
        ctx.font = 'bold 13px monospace';
        ctx.fillText('[Click] ' + (nearChest.open ? 'Close chest' : 'Open chest'), 14, hudY);
        hudY += 18;
      }

      const biome = this._biomePalette || getBiome(this.player.x + this.player.w / 2);
      const biomeName = biome.name || 'custom';
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.font = '10px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`${biomeName} | x:${Math.floor(this.player.x)}`, W - 14, 14);

      ctx.textAlign = 'left';
      const dayPhase = this.timeOfDay < 0.25 ? 'Night' : this.timeOfDay < 0.45 ? 'Dawn' : this.timeOfDay < 0.7 ? 'Day' : this.timeOfDay < 0.85 ? 'Dusk' : 'Night';
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fillText(dayPhase, 14, hudY + 18);
    }

    drawMinimap(ctx, W, H) {
      const mapW = 120;
      const mapH = 60;
      const mx = W - mapW - 14;
      const my = 14;
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

      const px = mx + (this.player.x + this.player.w / 2) * scaleX;
      const py = my + (this.player.y + this.player.h / 2) * scaleY;
      ctx.fillStyle = '#4ecdc4';
      ctx.shadowColor = '#4ecdc4';
      ctx.shadowBlur = 4;
      ctx.beginPath();
      ctx.arc(px, py, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.restore();
    }

    loop(timestamp) {
      if (!this.isRunning) return;
      this.deltaTime = timestamp - this.lastTime;
      this.lastTime = timestamp;
      if (this.deltaTime >= 1000 / (DEFAULTS.TARGET_FPS || 30)) {
        this.update();
        this.draw();
        this.deltaTime = 0;
      }
      requestAnimationFrame((t) => this.loop(t));
    }

    start() {
      this.isRunning = true;
      this.lastTime = performance.now();
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
        plains: { grass: '#5aaa6b', dirt: '#4a8a5a', ground: '#3a7a4a', accent: '#7aca8b' }
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

  return { WorldEngine, Player, generateTerrain, getTerrainY };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = InteractiveWorld;
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
