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
    COLORS: DEFAULTS.DEFAULT_COLORS || ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', '#dfe6e9']
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

  function generatePlatforms(heights) {
    const platforms = [];
    for (let i = 0; i < CFG.PLATFORM_COUNT; i++) {
      let x, y, w;
      let attempts = 0;
      do {
        x = 300 + Math.random() * (CFG.WORLD_WIDTH - 600);
        y = getTerrainY(heights, x) - 100 - Math.random() * 200;
        w = 70 + Math.random() * 90;
        attempts++;
      } while (attempts < 30 && y > CFG.WORLD_HEIGHT - 100);

      platforms.push({
        x, y,
        w, h: 12,
        color: `hsl(${150 + Math.random() * 50}, 50%, 55%)`
      });
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
      const portalY = terrainY - 50 - Math.random() * 30;
      portals.push({
        x, y: portalY,
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

  class WorldParticle {
    constructor(worldWidth, worldHeight) {
      this.worldWidth = worldWidth;
      this.worldHeight = worldHeight;
      this.reset();
    }
    reset() {
      this.x = Math.random() * this.worldWidth;
      this.y = Math.random() * this.worldHeight;
      this.vx = (Math.random() - 0.5) * 0.3;
      this.vy = -Math.random() * 0.5 - 0.2;
      this.size = Math.random() * 3 + 1;
      this.life = Math.random() * 0.5 + 0.5;
      this.decay = Math.random() * 0.003 + 0.001;
      this.color = CFG.COLORS[Math.floor(Math.random() * CFG.COLORS.length)];
    }
    update() {
      this.x += this.vx;
      this.y += this.vy;
      this.life -= this.decay;
      if (this.life <= 0 || this.y < -50) {
        this.reset();
        this.y = this.worldHeight + 10;
      }
    }
    draw(ctx, cx, cy) {
      ctx.globalAlpha = this.life * 0.4;
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
      this.isMoving = false;
      this.facing = 1;
      this.walkFrame = 0;
      this.doubleJump = true;
      this.canDoubleJump = true;
      this.portalCooldown = 0;
    }

    update(keys, heights, platforms, portals) {
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

      const tx = this.x + this.w / 2;
      const terrainY = getTerrainY(heights, tx);
      const pb = this.y + this.h;

      if (pb >= terrainY) {
        this.y = terrainY - this.h;
        this.vy = 0;
        this.onGround = true;
        this.canDoubleJump = true;
      } else if (this.y < terrainY - this.h) {
        this.onGround = false;
      }

      for (const plat of platforms) {
        if (this.x + this.w > plat.x && this.x < plat.x + plat.w &&
            this.y + this.h > plat.y && this.y + this.h < plat.y + plat.h + this.vy + 2 &&
            this.vy >= 0) {
          this.y = plat.y - this.h;
          this.vy = 0;
          this.onGround = true;
          this.canDoubleJump = true;
        }
      }

      if (this.x < 0) { this.x = 0; this.vx = 0; }
      if (this.x + this.w > CFG.WORLD_WIDTH) { this.x = CFG.WORLD_WIDTH - this.w; this.vx = 0; }
      if (this.y > CFG.WORLD_HEIGHT + 200) {
        this.y = 200;
        this.vy = 0;
      }

      if (this.isMoving && this.onGround) {
        this.walkFrame += 0.12;
      } else if (this.onGround) {
        this.walkFrame = 0;
      }

      if (this.portalCooldown > 0) this.portalCooldown--;

      for (const p of portals) {
        const dx = (this.x + this.w / 2) - p.x;
        const dy = (this.y + this.h / 2) - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < p.radius + 15) {
          p.activated = true;
          p.glowIntensity = Math.min(1, p.glowIntensity + 0.05);
        } else {
          p.glowIntensity = Math.max(0, p.glowIntensity - 0.02);
          if (dist > p.radius + 60) p.activated = false;
        }
      }
    }

    draw(ctx, cx, cy) {
      const sx = this.x - cx;
      const sy = this.y - cy;

      ctx.save();

      const bodyColor = '#4ecdc4';
      const headColor = '#45b7d1';
      const eyeColor = '#ffffff';
      const pupilColor = '#0d0d14';
      const legColor = '#2d1b4e';
      const accentColor = '#ff6b6b';

      ctx.fillStyle = legColor;
      const legAnim = this.isMoving && this.onGround ? Math.sin(this.walkFrame * 2) * 3 : 0;
      ctx.fillRect(sx + 3, sy + this.h - 6, 5, 6 + legAnim);
      ctx.fillRect(sx + this.w - 8, sy + this.h - 6, 5, 6 - legAnim);

      ctx.fillStyle = bodyColor;
      ctx.fillRect(sx + 1, sy + 10, this.w - 2, this.h - 14);

      ctx.fillStyle = accentColor;
      ctx.fillRect(sx + this.w / 2 - 4, sy + 14, 8, 3);

      ctx.fillStyle = headColor;
      ctx.fillRect(sx - 1, sy, this.w + 2, 12);
      ctx.fillRect(sx + 1, sy - 2, this.w - 2, 3);

      ctx.fillStyle = eyeColor;
      const eyeX = this.facing === 1 ? sx + this.w - 7 : sx + 4;
      ctx.fillRect(eyeX, sy + 3, 5, 4);
      ctx.fillRect(eyeX + 6, sy + 3, 5, 4);

      ctx.fillStyle = pupilColor;
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

      this.init();
    }

    init() {
      this.resize();

      this.terrain = generateTerrain(CFG.WORLD_WIDTH);
      this.platforms = generatePlatforms(this.terrain);
      this.portals = generatePortals(this.terrain);

      const startTerrainY = getTerrainY(this.terrain, 100);
      this.player = new Player(100, startTerrainY - CFG.PLAYER_H - 5);

      this.particles = [];
      for (let i = 0; i < CFG.PARTICLE_COUNT; i++) {
        this.particles.push(new WorldParticle(CFG.WORLD_WIDTH, CFG.WORLD_HEIGHT));
      }

      this.generateStars();
      this.generateBgMountains();

      if (this.interactive) {
        this.setupInput();
      }

      window.addEventListener('resize', () => this.resize());
    }

    generateStars() {
      this.stars = [];
      for (let i = 0; i < 120; i++) {
        this.stars.push({
          x: Math.random() * CFG.WORLD_WIDTH,
          y: Math.random() * CFG.SURFACE_BASE * 0.6,
          size: Math.random() * 2 + 0.5,
          twinkle: Math.random() * Math.PI * 2,
          speed: Math.random() * 0.02 + 0.01
        });
      }
    }

    generateBgMountains() {
      this.bgMountains = [];
      for (let i = 0; i < 8; i++) {
        const points = [];
        const segs = 30;
        const baseX = (i / 8) * CFG.WORLD_WIDTH;
        for (let j = 0; j <= segs; j++) {
          const x = baseX + (j / segs) * (CFG.WORLD_WIDTH / 8) + (CFG.WORLD_WIDTH / 8) * 0.1;
          const y = CFG.SURFACE_BASE * 0.5 + Math.sin(j * 0.5 + i * 2) * 60 + Math.sin(j * 1.3 + i) * 30;
          points.push({ x, y });
        }
        this.bgMountains.push({
          points,
          color: `hsl(${240 + i * 5}, 20%, ${12 + i * 2}%)`,
          parallax: 0.15 + i * 0.03
        });
      }
    }

    setupInput() {
      document.addEventListener('keydown', (e) => {
        const key = e.key.toLowerCase();
        if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(e.key)) {
          e.preventDefault();
        }
        if (key === 'arrowup' || key === 'arrowdown' || key === 'arrowleft' || key === 'arrowright') {
          const k = key.replace('arrow', '');
          this.keys[k] = true;
        } else if (key === ' ' || key === 'w' || key === 'a' || key === 's' || key === 'd' || key === 'e') {
          if (key === 'e') this.interactWithPortal();
          else this.keys[key] = true;
        }
      });

      document.addEventListener('keyup', (e) => {
        const key = e.key.toLowerCase();
        if (key === 'arrowup' || key === 'arrowdown' || key === 'arrowleft' || key === 'arrowright') {
          const k = key.replace('arrow', '');
          this.keys[k] = false;
        } else if (key === ' ' || key === 'w' || key === 'a' || key === 's' || key === 'd') {
          this.keys[key] = false;
        }
      });

      this.canvas.addEventListener('click', (e) => {
        const rect = this.canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left + this.cameraX;
        const my = e.clientY - rect.top + this.cameraY;
        for (const p of this.portals) {
          const dx = mx - p.x;
          const dy = my - p.y;
          if (Math.sqrt(dx * dx + dy * dy) < p.radius + 20) {
            this.activatePortal(p);
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
        if (Math.sqrt(dx * dx + dy * dy) < p.radius + 40) {
          this.activatePortal(p);
          break;
        }
      }
    }

    activatePortal(portal) {
      portal.activated = !portal.activated;
      portal.pulse = 0;
      this.showInteraction(portal.label, portal.color);
    }

    showInteraction(text, color) {
      this.interactables.push({
        text,
        color,
        life: 1,
        y: -50
      });
    }

    spawnBurst(x, y) {
      for (let i = 0; i < 15; i++) {
        const p = new WorldParticle(CFG.WORLD_WIDTH, CFG.WORLD_HEIGHT);
        p.x = x + this.cameraX;
        p.y = y + this.cameraY;
        p.vx = (Math.random() - 0.5) * 6;
        p.vy = (Math.random() - 0.5) * 6;
        p.life = 1;
        this.particles.push(p);
      }
    }

    resize() {
      const rect = this.canvas.parentElement.getBoundingClientRect();
      this.canvas.width = rect.width;
      this.canvas.height = rect.height;
    }

    update() {
      this.player.update(this.keys, this.terrain, this.platforms, this.portals);

      const targetCX = this.player.x + this.player.w / 2 - this.canvas.width * 0.35;
      const targetCY = this.player.y + this.player.h / 2 - this.canvas.height * 0.5;
      this.cameraX += (targetCX - this.cameraX) * 0.08;
      this.cameraY += (targetCY - this.cameraY) * 0.08;

      if (this.cameraX < 0) this.cameraX = 0;
      if (this.cameraX > CFG.WORLD_WIDTH - this.canvas.width) this.cameraX = CFG.WORLD_WIDTH - this.canvas.width;
      if (this.cameraY < 0) this.cameraY = 0;
      if (this.cameraY > CFG.WORLD_HEIGHT - this.canvas.height) this.cameraY = CFG.WORLD_HEIGHT - this.canvas.height;

      for (const p of this.portals) {
        p.pulse += 0.03;
      }

      for (const p of this.particles) {
        p.update();
      }

      for (const s of this.stars) {
        s.twinkle += s.speed;
      }

      this.time += 0.016;

      for (let i = this.interactables.length - 1; i >= 0; i--) {
        this.interactables[i].life -= 0.015;
        this.interactables[i].y -= 1.5;
        if (this.interactables[i].life <= 0) {
          this.interactables.splice(i, 1);
        }
      }
    }

    draw() {
      const ctx = this.ctx;
      const W = this.canvas.width;
      const H = this.canvas.height;
      const cx = this.cameraX;
      const cy = this.cameraY;

      const skyGrad = ctx.createLinearGradient(0, 0, 0, H);
      skyGrad.addColorStop(0, '#0a0a1a');
      skyGrad.addColorStop(0.3, '#12122e');
      skyGrad.addColorStop(0.6, '#1a1a3e');
      skyGrad.addColorStop(0.85, '#2a1a3e');
      skyGrad.addColorStop(1, '#1a2a3e');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, W, H);

      for (const s of this.stars) {
        const sx = s.x - cx * 0.05;
        const sy = s.y - cy * 0.05;
        if (sx < -5 || sx > W + 5 || sy < -5 || sy > H + 5) continue;
        const alpha = 0.4 + Math.sin(s.twinkle) * 0.3;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(sx, sy, s.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      for (const mt of this.bgMountains) {
        ctx.beginPath();
        ctx.moveTo(mt.points[0].x - cx * mt.parallax, mt.points[0].y + 50);
        for (let j = 1; j < mt.points.length; j++) {
          ctx.lineTo(
            mt.points[j].x - cx * mt.parallax,
            mt.points[j].y + 50 + Math.sin(j * 0.3 + this.time) * 3
          );
        }
        ctx.lineTo(CFG.WORLD_WIDTH - cx * mt.parallax + 100, H + 50);
        ctx.lineTo(mt.points[0].x - cx * mt.parallax - 100, H + 50);
        ctx.closePath();
        ctx.fillStyle = mt.color;
        ctx.fill();
      }

      this.drawTerrain(ctx, cx, cy, W, H);

      for (const plat of this.platforms) {
        const px = plat.x - cx;
        const py = plat.y - cy;
        if (px + plat.w < -50 || px > W + 50 || py + plat.h < -50 || py > H + 50) continue;

        ctx.fillStyle = plat.color;
        ctx.fillRect(px, py, plat.w, plat.h);

        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.fillRect(px, py, plat.w, 3);

        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.fillRect(px, py + plat.h - 2, plat.w, 2);
      }

      for (const p of this.portals) {
        const px = p.x - cx;
        const py = p.y - cy;
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

      this.player.draw(ctx, cx, cy);

      for (const p of this.particles) {
        p.draw(ctx, cx, cy);
      }

      for (const ia of this.interactables) {
        ctx.globalAlpha = ia.life;
        ctx.fillStyle = ia.color;
        ctx.font = 'bold 16px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('✦ ' + ia.text + ' ✦', W / 2, H / 2 + ia.y);
        ctx.globalAlpha = 1;
      }

      this.drawHUD(ctx);
    }

    drawTerrain(ctx, cx, cy, W, H) {
      const step = 8;
      const startX = Math.max(0, Math.floor(cx / step) * step);
      const endX = Math.min(CFG.WORLD_WIDTH, cx + W + step);

      ctx.beginPath();
      ctx.moveTo(startX - cx, H + 10);

      for (let x = startX; x <= endX; x += step) {
        const ty = getTerrainY(this.terrain, x);
        ctx.lineTo(x - cx, ty - cy);
      }

      ctx.lineTo(endX - cx, H + 10);
      ctx.closePath();

      const groundGrad = ctx.createLinearGradient(0, 0, 0, H);
      groundGrad.addColorStop(0, '#3a7d5a');
      groundGrad.addColorStop(0.05, '#2d6b4a');
      groundGrad.addColorStop(0.15, '#3a2a1a');
      groundGrad.addColorStop(0.5, '#2a1a1a');
      groundGrad.addColorStop(1, '#1a0a0a');
      ctx.fillStyle = groundGrad;
      ctx.fill();

      for (let x = startX; x <= endX; x += step) {
        const ty = getTerrainY(this.terrain, x);
        ctx.fillStyle = '#4a9e6b';
        ctx.fillRect(x - cx, ty - cy, step + 1, 4);
      }

      for (let x = startX; x <= endX; x += step * 3) {
        const ty = getTerrainY(this.terrain, x);
        ctx.fillStyle = 'rgba(60, 180, 100, 0.15)';
        const gh = 6 + Math.sin(x * 0.1) * 4;
        for (let g = 0; g < gh; g++) {
          const gx = x + Math.sin(g * 0.7 + x * 0.05) * 4;
          ctx.fillRect(gx - cx, ty - cy - 2 - g * 3, 2, 3);
        }
      }
    }

    drawHUD(ctx) {
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.font = '11px monospace';
      ctx.textAlign = 'left';

      let hudY = 14;
      ctx.fillText('WASD/Arrows: Move | Space: Jump | E/Click: Interact', 14, hudY);
      hudY += 18;

      let nearPortal = null;
      for (const p of this.portals) {
        const dx = (this.player.x + this.player.w / 2) - p.x;
        const dy = (this.player.y + this.player.h / 2) - p.y;
        if (Math.sqrt(dx * dx + dy * dy) < p.radius + 50) {
          nearPortal = p;
          break;
        }
      }

      if (nearPortal) {
        ctx.fillStyle = nearPortal.color;
        ctx.font = 'bold 13px monospace';
        ctx.fillText(`[E] Interact with ${nearPortal.label}`, 14, hudY);
        hudY += 18;
      }

      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      ctx.font = '10px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`x:${Math.floor(this.player.x)}`, this.canvas.width - 14, 14);
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

    exportConfig() {
      return {
        mode: this.mode,
        worldWidth: CFG.WORLD_WIDTH,
        worldHeight: CFG.WORLD_HEIGHT,
        platformCount: CFG.PLATFORM_COUNT,
        portalCount: CFG.PORTAL_COUNT,
        particleCount: CFG.PARTICLE_COUNT,
        colors: CFG.COLORS
      };
    }
  }

  return { WorldEngine, Player, generateTerrain, getTerrainY };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = InteractiveWorld;
}
