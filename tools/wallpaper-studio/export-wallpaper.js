// eslint-disable-next-line no-unused-vars
const WallpaperExporter = (() => {
  function exportForLively(canvas, config) {
    const html = generateWallpaperHTML(config);
    return new Blob([html], { type: 'text/html' });
  }

  function exportStandalone(canvas, config) {
    const html = generateWallpaperHTML(config, true);
    return new Blob([html], { type: 'text/html' });
  }

  function generateWorldEngineSource(config) {
    let source = '';
    if (typeof InteractiveWorld !== 'undefined') {
      source = InteractiveWorld.__source__ || InteractiveWorld.toString();
    }
    if (!source || source === '[object Object]') {
      try { source = InteractiveWorld.WorldEngine.toString(); } catch(e) {}
    }
    const defaults = {
      WORLD_WIDTH: config.worldWidth || 5000,
      WORLD_PLATFORM_COUNT: config.platformCount || 10,
      WORLD_PORTAL_COUNT: config.portalCount || 6,
      WORLD_PARTICLE_COUNT: config.particleCount || 60,
      WORLD_CREATURE_COUNT: config.creatureCount || 15,
      WORLD_CHEST_COUNT: config.chestCount || 5,
      WORLD_CRYSTAL_COUNT: config.crystalCount || 8,
      DEFAULT_COLORS: config.colors || ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', '#dfe6e9']
    };
    return 'const DEEPIRI_DEFAULTS = ' + JSON.stringify(defaults) + ';\n' + source;
  }

  function generateWallpaperHTML(config, _fullscreen = true) {
    const c = config || {};
    const mode = c.mode || 'particles';

    if (mode === 'world') {
      return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Interactive World Wallpaper</title>
  <style>
    * { margin: 0; padding: 0; }
    html, body {
      width: 100%; height: 100%; overflow: hidden;
      background: #0a0a1a;
    }
    canvas {
      position: fixed; top: 0; left: 0;
      width: 100%; height: 100%;
    }
    #info {
      position: fixed; bottom: 10px; left: 50%; transform: translateX(-50%);
      color: rgba(255,255,255,0.3); font: 12px monospace; z-index: 1;
      pointer-events: none; text-align: center;
    }
  </style>
</head>
<body>
  <canvas id="bg"></canvas>
  <div id="info">WASD/Arrows: Move | Space: Jump | E/Click: Interact</div>
  <script>
${generateWorldEngineSource(c)}
const canvas = document.getElementById('bg');
const engine = new InteractiveWorld.WorldEngine(canvas, { interactive: true });
engine.start();
  <\/script>
</body>
</html>`;
    }

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Interactive Wallpaper</title>
  <style>
    * { margin: 0; padding: 0; }
    html, body { 
      width: 100%; 
      height: 100%; 
      overflow: hidden;
      background: ${c.bgColor || '#0d0d14'};
      cursor: none;
    }
    canvas {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
    }
  </style>
</head>
<body>
  <canvas id="bg"></canvas>
  <script>
    const canvas = document.getElementById('bg');
    const ctx = canvas.getContext('2d');
    
    const CONFIG = {
      particleCount: ${c.particleCount || 200},
      colors: ${JSON.stringify(c.colors || ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', '#dfe6e9'])},
      bgColor: '${c.bgColor || '#0d0d14'}',
      speed: ${c.speed || 3},
      size: ${c.particleSize || 6}
    };

    class Particle {
      constructor() { this.reset(); }
      reset(x, y) {
        this.x = x ?? Math.random() * canvas.width;
        this.y = y ?? Math.random() * canvas.height;
        this.vx = (Math.random() - 0.5) * CONFIG.speed;
        this.vy = (Math.random() - 0.5) * CONFIG.speed;
        this.size = Math.random() * CONFIG.size + CONFIG.size/2;
        this.color = CONFIG.colors[Math.floor(Math.random() * CONFIG.colors.length)];
        this.life = 1;
        this.decay = Math.random() * 0.008 + 0.003;
      }
      update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life -= this.decay;
        if (this.x < 0 || this.x > canvas.width || this.y < 0 || this.y > canvas.height || this.life <= 0) this.reset();
      }
      draw() {
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * this.life, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }

    let particles = [];
    let mouseX = 0, mouseY = 0;
    let width, height;

    function resize() {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    }

    function init() {
      resize();
      window.addEventListener('resize', resize);
      window.addEventListener('mousemove', e => { mouseX = e.clientX; mouseY = e.clientY; });
      window.addEventListener('click', e => {
        for (let i = 0; i < 30; i++) {
          const p = new Particle();
          p.x = e.clientX; p.y = e.clientY;
          p.vx = (Math.random() - 0.5) * 15;
          p.vy = (Math.random() - 0.5) * 15;
          particles.push(p);
        }
        if (particles.length > CONFIG.particleCount * 2) particles.splice(0, 30);
      });

      for (let i = 0; i < CONFIG.particleCount; i++) particles.push(new Particle());
      loop();
    }

    function loop() {
      ctx.fillStyle = CONFIG.bgColor;
      ctx.fillRect(0, 0, width, height);

      ctx.strokeStyle = 'rgba(255,255,255,0.025)';
      ctx.lineWidth = 1;
      for (let x = 0; x < width; x += 50) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke(); }
      for (let y = 0; y < height; y += 50) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke(); }

      const g = ctx.createRadialGradient(mouseX, mouseY, 0, mouseX, mouseY, 200);
      g.addColorStop(0, 'rgba(78, 205, 196, 0.1)');
      g.addColorStop(1, 'transparent');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, width, height);

      for (const p of particles) {
        const dx = p.x - mouseX, dy = p.y - mouseY, dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < 100 && dist > 0) {
          const f = (100 - dist) / 100;
          p.vx += (dx/dist) * f * 0.5;
          p.vy += (dy/dist) * f * 0.5;
        }
        p.update();
        p.draw();
      }
      requestAnimationFrame(loop);
    }

    init();
  <\/script>
</body>
</html>`;
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  return { exportForLively, exportStandalone, generateWallpaperHTML, downloadBlob };
})();