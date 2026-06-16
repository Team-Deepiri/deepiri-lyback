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

  // ---- cave / tunnel system -------------------------------------------------
  // Caves are an analytic network: round-capped tunnel "capsules" plus circular
  // chambers carved out of the solid rock that fills everything below the
  // surface. Entrances are shafts whose tops break through the surface so the
  // player can drop in.
  const COLORS_LIST = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', '#dfe6e9'];

  function makeCaveCrystals(r) {
    const out = [];
    const n = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) {
      out.push({
        dx: (Math.random() - 0.5) * r * 1.2,
        dy: r * 0.45 + Math.random() * r * 0.35,
        r: 2.5 + Math.random() * 3.5,
        color: COLORS_LIST[Math.floor(Math.random() * COLORS_LIST.length)]
      });
    }
    return out;
  }

  function makeStalactites(r) {
    const out = [];
    const n = 3 + Math.floor(Math.random() * 4);
    for (let i = 0; i < n; i++) {
      out.push({
        dx: (Math.random() - 0.5) * r * 1.5,
        len: 8 + Math.random() * 22,
        w: 4 + Math.random() * 6,
        up: Math.random() < 0.5 // false = hangs from ceiling, true = rises from floor
      });
    }
    return out;
  }

  function makeChamber(x, y, r) {
    // Deeper chambers accumulate more loose rock/boulders on the floor.
    const depthFrac = Math.min(1, y / CFG.WORLD_HEIGHT);
    const boulders = [];
    const nb = Math.floor(depthFrac * 8);
    for (let i = 0; i < nb; i++) {
      boulders.push({
        dx: (Math.random() - 0.5) * r * 1.5,
        dy: r * 0.5 + Math.random() * r * 0.4,
        r: 4 + Math.random() * 9 * (0.4 + depthFrac)
      });
    }
    return { x, y, r, crystals: makeCaveCrystals(r), stalactites: makeStalactites(r), boulders };
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
    const tunnels = [];
    const chambers = [];
    const pockets = [];
    const entrances = [];
    const W = CFG.WORLD_WIDTH;
    const R = 30;
    const maxDepth = CFG.WORLD_HEIGHT - 60;
    const lavaY = CFG.WORLD_HEIGHT - 140;
    const clampY = (y) => Math.min(y, maxDepth);
    const NUM_ENTRANCES = 4;

    for (let e = 0; e < NUM_ENTRANCES; e++) {
      const ex = W * (0.1 + e * (0.8 / (NUM_ENTRANCES - 1))) + (Math.random() - 0.5) * 160;
      const surf = getTerrainY(heights, ex);
      entrances.push(ex);
      let curX = ex;
      let curY = clampY(surf + 190 + Math.random() * 110);

      // Entrance shaft — top breaks through the surface to open a hole.
      tunnels.push({ ax: ex, ay: surf - 26, bx: ex + (Math.random() - 0.5) * 30, by: curY, r: R });

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
    const numPockets = 6;
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

  // Shovel pickups on the surface — grab one to unlock digging.
  function generateShovels(heights) {
    const shovels = [];
    const W = CFG.WORLD_WIDTH;
    const n = 2;
    for (let i = 0; i < n; i++) {
      const x = W * (0.12 + 0.55 * i) + (Math.random() - 0.5) * 200;
      shovels.push({ x, y: getTerrainY(heights, x) - 16, taken: false, bob: Math.random() * Math.PI * 2 });
    }
    return shovels;
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
  function isRockAt(caves, heights, x, y) {
    if (x < 0 || x > CFG.WORLD_WIDTH) return true;
    if (y < getTerrainY(heights, x)) return false;
    if (caveCarved(caves, x, y)) return false;
    return true;
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
      this.hasShovel = false;
      this.digCooldown = 0;
      this.maxWater = 100;
      this.water = 100;
      this.deathFlash = 0;
    }

    update(keys, heights, platforms, portals, chests, caves) {
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

      this.wasOnGround = this.onGround;
      this.onGround = false;

      // --- horizontal move + cave-wall resolution ---
      this.x += this.vx;
      const midY = this.y + this.h / 2;
      if (this.vx > 0 && isRockAt(caves, heights, this.x + this.w, midY)) {
        let g = 0;
        while (isRockAt(caves, heights, this.x + this.w, midY) && g++ < 48) this.x -= 1;
        this.vx = 0;
      } else if (this.vx < 0 && isRockAt(caves, heights, this.x, midY)) {
        let g = 0;
        while (isRockAt(caves, heights, this.x, midY) && g++ < 48) this.x += 1;
        this.vx = 0;
      }

      // --- vertical move + surface/cave floor & ceiling resolution ---
      // isRockAt treats the surface as the top of solid rock, so this single
      // model lands the player on the ground AND on cave floors, lets them rise
      // into ceilings, and drops them through carved entrance shafts.
      this.y += this.vy;
      const cxp = this.x + this.w / 2;
      if (this.vy >= 0) {
        if (isRockAt(caves, heights, cxp, this.y + this.h)) {
          let g = 0;
          while (isRockAt(caves, heights, cxp, this.y + this.h) && g++ < 240) this.y -= 1;
          this.vy = 0;
          this.onGround = true;
          this.canDoubleJump = true;
          if (!this.wasOnGround) this.landDust = 8;
        }
      } else if (isRockAt(caves, heights, cxp, this.y)) {
        let g = 0;
        while (isRockAt(caves, heights, cxp, this.y) && g++ < 240) this.y += 1;
        this.vy = 0;
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
      if (this.digCooldown > 0) this.digCooldown--;

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

      // Typing animation: little arms tapping out of rhythm in front of the body.
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
      const list = files.slice(0, 40);
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
      this.platforms = generatePlatforms(this.terrain);
      this.portals = generatePortals(this.terrain);
      this.chests = generateChests(this.terrain);
      this.crystals = generateCrystals(this.terrain);
      this.caves = generateCaves(this.terrain);
      this.shovels = generateShovels(this.terrain);
      this.heat = 0;
      this.buildCaveItems();

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
        // In computer mode the keyboard belongs to the terminal — don't steer
        // the player. Escape leaves the computer.
        if (this.computerMode) {
          if (key === 'escape') this.exitComputer();
          return;
        }
        if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(e.key)) e.preventDefault();
        if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) this.keys[key.replace('arrow', '')] = true;
        else if (key === 'f') { e.preventDefault(); this.digAt(); }
        else if (key === ' ' || key === 'w' || key === 'a' || key === 's' || key === 'd' || key === 'e' || key === 'm') {
          if (key === 'e') this.interactWithPortal();
          else if (key === 'm') this.showMinimap = !this.showMinimap;
          else this.keys[key === ' ' ? 'space' : key] = true;
        }
      });
      document.addEventListener('keyup', (e) => {
        const key = e.key.toLowerCase();
        if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) this.keys[key.replace('arrow', '')] = false;
        else if (key === ' ' || key === 'w' || key === 'a' || key === 's' || key === 'd') this.keys[key === ' ' ? 'space' : key] = false;
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

    // Carve a hole with the shovel: in front of the player, biased downward if
    // crouching. Dug holes become real walkable cave space (see caveCarved), so
    // the player can tunnel their own caves anywhere.
    digAt() {
      const p = this.player;
      if (!p.hasShovel || p.digCooldown > 0) return;
      p.digCooldown = 6;
      const digDown = this.keys.s || this.keys.down;
      const fx = p.x + p.w / 2 + (digDown ? 0 : p.facing * 16);
      const fy = p.y + p.h + (digDown ? 8 : -4);
      if (!this.caves.digHoles) this.caves.digHoles = [];
      this.caves.digHoles.push({ x: fx, y: fy, r: 21 });
      if (this.caves.digHoles.length > 320) this.caves.digHoles.shift();
      for (let i = 0; i < 7; i++) {
        const pt = new WorldParticle(CFG.WORLD_WIDTH, CFG.WORLD_HEIGHT);
        pt.x = fx; pt.y = fy;
        pt.vx = (Math.random() - 0.5) * 3.5;
        pt.vy = -Math.random() * 2.5;
        pt.l = 0.8;
        pt.color = '#caa06a';
        this.particles.push(pt);
      }
    }

    // Place a chest + bucket in every sealed pocket, plus survival buckets in
    // deeper connected chambers.
    buildCaveItems() {
      this.caveChests = [];
      this.buckets = [];
      const LOOT = ['💎 Gems', '🗝️ Old Key', '📜 Map Scrap', '🪙 Gold Stash', '🔮 Relic', '⚙️ Cog'];
      for (const p of this.caves.pockets) {
        const fy = p.y + p.r * 0.45;
        this.caveChests.push({
          x: p.x - 14, y: fy, w: 20, h: 16, open: false,
          pulse: Math.random() * 6, loot: LOOT[Math.floor(Math.random() * LOOT.length)]
        });
        this.buckets.push({ x: p.x + 16, y: fy + 2, bob: Math.random() * 6 });
      }
      for (const c of this.caves.chambers) {
        if (c.y > getTerrainY(this.terrain, c.x) + 320 && Math.random() < 0.5) {
          this.buckets.push({ x: c.x + (Math.random() - 0.5) * c.r * 0.5, y: c.y + c.r * 0.5, bob: Math.random() * 6 });
        }
      }
    }

    // Heat rises with depth: the player sweats out water, lava scorches, and
    // running dry sends them back to the surface. Buckets refill; chests open.
    updateSurvival() {
      const p = this.player;
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
      this.heat = Math.min(1, heat);

      if (heat > 0.12) {
        p.water -= heat * 0.11;
        if (Math.random() < heat * 0.3) this.spawnSweat();
      } else if (p.water < p.maxWater) {
        p.water += 0.05;
      }
      p.water = Math.max(0, Math.min(p.maxWater, p.water));
      if (p.water <= 0) this.killPlayer();

      for (const b of this.buckets) {
        b.bob += 0.05;
        const dx = cxp - b.x, dy = (p.y + p.h / 2) - b.y;
        if (dx * dx + dy * dy < 26 * 26 && p.water < p.maxWater) {
          p.water = p.maxWater;
          this.showInteraction('💧 Refilled!', '#45b7d1');
        }
      }

      for (const c of this.caveChests) {
        c.pulse += 0.04;
        if (!c.open) {
          const dx = cxp - c.x, dy = (p.y + p.h / 2) - c.y;
          if (dx * dx + dy * dy < 30 * 30) {
            c.open = true;
            this.showInteraction('📦 ' + c.loot, '#ffd479');
          }
        }
      }
      if (p.deathFlash > 0) p.deathFlash--;
    }

    killPlayer() {
      const p = this.player;
      p.x = 100;
      p.y = getTerrainY(this.terrain, 100) - p.h - 5;
      p.vx = 0; p.vy = 0;
      p.water = p.maxWater;
      p.deathFlash = 30;
      this.showInteraction('💀 Dehydrated — back to the surface', '#ff6b6b');
    }

    spawnSweat() {
      const p = this.player;
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
      // Computer mode: the player sits at the terminal and types — freeze
      // world movement, grow the monitor, and run the typing animation.
      if (this.computerMode) {
        this.keys.left = this.keys.right = this.keys.a = this.keys.d = false;
        this.keys.up = this.keys.w = this.keys.space = false;
        this.player.isTyping = true;
        this.player.typeFrame = (this.player.typeFrame || 0) + 0.35;
        this.computerGrow = Math.min(1, this.computerGrow + 0.08);
      } else {
        this.player.isTyping = false;
        this.computerGrow = Math.max(0, this.computerGrow - 0.1);
      }

      this.player.update(this.keys, this.terrain, this.platforms, this.portals, this.chests, this.caves);
      this.updateSurvival();

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

      // Shovel pickups.
      if (this.shovels) {
        const pcx = this.player.x + this.player.w / 2;
        const pcy = this.player.y + this.player.h / 2;
        for (const s of this.shovels) {
          s.bob += 0.06;
          if (!s.taken) {
            const dx = pcx - s.x, dy = pcy - s.y;
            if (dx * dx + dy * dy < 26 * 26) {
              s.taken = true;
              this.player.hasShovel = true;
              this.showInteraction('🪏 Shovel! Press F to dig', '#ffd479');
            }
          }
        }
      }
      for (const p of this.particles) p.update();
      if (this.particles.length > 400) this.particles.splice(0, this.particles.length - 400);
      const daylight = Math.max(0, 1 - Math.abs(this.timeOfDay - 0.5) * 2.5);
      const creatureCtx = {
        player: { x: this.player.x + this.player.w / 2, y: this.player.y + this.player.h / 2 },
        neighbors: this.creatures,
        daylight,
        lights: daylight < 0.4 ? [{ x: this.player.x + this.player.w / 2, y: this.player.y }] : []
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
      this.drawBgMountains(ctx, cx, cy, W, H);
      this.drawTerrain(ctx, cx, cy, W, H);
      this.drawCaves(ctx, cx, cy, W, H);
      this.drawCaveItems(ctx, cx, cy, W, H);
      this.drawPlatforms(ctx, cx, cy, W, H);
      this.drawCrystals(ctx, cx, cy, W, H);
      this.drawChests(ctx, cx, cy, W, H);
      this.drawShovels(ctx, cx, cy, W, H);
      this.drawPortals(ctx, cx, cy, W, H);
      this.drawCreatures(ctx, cx, cy, W, H);
      this.player.draw(ctx, cx, cy, this._playerColor);
      if (this.computerGrow > 0.01) this.drawComputer(ctx, cx, cy);
      this.drawParticles(ctx, cx, cy, W, H);
      this.drawWeather(ctx, cx, cy, W, H);
      // Heat haze: the deeper/hotter it gets, the redder the screen.
      if (this.heat > 0.25) {
        ctx.fillStyle = `rgba(255,60,0,${(this.heat - 0.25) * 0.28})`;
        ctx.fillRect(0, 0, W, H);
      }
      if (this.player.deathFlash > 0) {
        ctx.fillStyle = `rgba(255,0,0,${this.player.deathFlash / 60})`;
        ctx.fillRect(0, 0, W, H);
      }
      this.drawInteractions(ctx, W, H);
      this.drawHUD(ctx, W);
      this.drawSurvivalHud(ctx);
      if (this.player.hasShovel) this.drawShovelHud(ctx, W, H);
      if (this.showMinimap) this.drawMinimap(ctx, W, H);
    }

    // Water meter (drains as you sweat) + a HOT warning near lava.
    drawSurvivalHud(ctx) {
      const p = this.player;
      const x = 14, y = 14, bw = 150, bh = 14;
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(x - 2, y - 2, bw + 4, bh + 4);
      const frac = p.water / p.maxWater;
      const low = frac < 0.3;
      ctx.fillStyle = low ? '#ff5a4a' : '#45b7d1';
      ctx.fillRect(x, y, bw * frac, bh);
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.font = '11px system-ui, sans-serif';
      ctx.textBaseline = 'middle';
      ctx.fillText('💧 ' + Math.ceil(p.water), x + 6, y + bh / 2 + 1);
      if (this.heat > 0.55) {
        ctx.fillStyle = '#ff8b3a';
        ctx.fillText('🔥 HOT', x + bw + 12, y + bh / 2 + 1);
      }
      ctx.restore();
    }

    drawShovelHud(ctx, W, H) {
      ctx.save();
      ctx.font = '12px system-ui, sans-serif';
      const label = '🪏 F: dig  ·  hold S+F: dig down';
      const tw = ctx.measureText(label).width + 18;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(12, H - 30, tw, 20);
      ctx.fillStyle = '#ffd479';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, 21, H - 19);
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

    // Carve the caves out of the rock fill: a lighter rocky rim, then the dark
    // interior, then a faint ambient glow and crystals in chambers for depth.
    drawCaves(ctx, cx, cy, W, H) {
      if (!this.caves) return;
      const onScreen = (x, y, r) =>
        x - cx > -r - 60 && x - cx < W + r + 60 && y - cy > -r - 60 && y - cy < H + r + 60;

      ctx.save();
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';

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

        // boulders (more in deeper rooms)
        ctx.fillStyle = '#1b1620';
        for (const b of (c.boulders || [])) {
          ctx.beginPath();
          ctx.ellipse(gx + b.dx, gy + b.dy, b.r, b.r * 0.7, 0, 0, Math.PI * 2);
          ctx.fill();
        }

        // stalactites / stalagmites
        ctx.fillStyle = 'rgba(40,28,26,0.95)';
        for (const s of (c.stalactites || [])) {
          const sx = gx + s.dx;
          const topY = s.up ? gy + c.r : gy - c.r;
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
          ctx.fillStyle = cr.color;
          ctx.shadowColor = cr.color;
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.arc(gx + cr.dx, gy + cr.dy, cr.r, 0, Math.PI * 2);
          ctx.fill();
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
        ctx.save();
        // glow
        ctx.shadowColor = '#ffd479';
        ctx.shadowBlur = 12;
        // handle
        ctx.strokeStyle = '#8a6a40';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(sx, sy - 12);
        ctx.lineTo(sx, sy + 8);
        ctx.stroke();
        // blade
        ctx.fillStyle = '#cfd6dd';
        ctx.beginPath();
        ctx.moveTo(sx - 5, sy + 6);
        ctx.lineTo(sx + 5, sy + 6);
        ctx.lineTo(sx, sy + 14);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
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

  return { WorldEngine, Player, generateTerrain, getTerrainY, generateCaves, caveCarved, isRockAt };
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
