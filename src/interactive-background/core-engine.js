const InteractiveEngine = (() => {
  const DEFAULTS = (typeof DEEPIRI_DEFAULTS !== 'undefined') ? DEEPIRI_DEFAULTS : {};
  const CONFIG = {
    TARGET_FPS: DEFAULTS.TARGET_FPS || 30,
    MAX_PARTICLES: DEFAULTS.MAX_PARTICLES || 200,
    COLORS: DEFAULTS.DEFAULT_COLORS || ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', '#dfe6e9']
  };

  class Particle {
    constructor(x, y, canvas) {
      this.canvas = canvas;
      this.reset(x, y);
    }

    reset(x, y) {
      this.x = x ?? Math.random() * this.canvas.width;
      this.y = y ?? Math.random() * this.canvas.height;
      const speed = DEFAULTS.DEFAULT_SPEED || 3;
      this.vx = (Math.random() - 0.5) * speed;
      this.vy = (Math.random() - 0.5) * speed;
      const baseSize = DEFAULTS.DEFAULT_PARTICLE_SIZE || 6;
      this.size = Math.random() * baseSize + baseSize / 2;
      this.color = CONFIG.COLORS[Math.floor(Math.random() * CONFIG.COLORS.length)];
      this.life = 1;
      this.decay = Math.random() * 0.01 + 0.005;
      this.trail = [];
    }

    update() {
      this.trail.push({ x: this.x, y: this.y, life: this.life });
      if (this.trail.length > 10) this.trail.shift();

      this.x += this.vx;
      this.y += this.vy;
      this.life -= this.decay;

      if (this.x < 0 || this.x > this.canvas.width || this.y < 0 || this.y > this.canvas.height || this.life <= 0) {
        this.reset();
      }
    }

    draw(ctx) {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size * this.life, 0, Math.PI * 2);
      ctx.fillStyle = this.color;
      ctx.globalAlpha = this.life;
      ctx.fill();
      ctx.globalAlpha = 1;

      if (this.trail.length > 1) {
        ctx.beginPath();
        ctx.moveTo(this.trail[0].x, this.trail[0].y);
        for (let i = 1; i < this.trail.length; i++) {
          ctx.lineTo(this.trail[i].x, this.trail[i].y);
        }
        ctx.strokeStyle = this.color;
        ctx.globalAlpha = this.life * 0.3;
        ctx.lineWidth = this.size * 0.5;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }
  }

  class Engine {
    constructor(canvasId, options = {}) {
      this.canvas = typeof canvasId === 'string' ? document.getElementById(canvasId) : canvasId;
      this.ctx = this.canvas.getContext('2d');
      this.particles = [];
      this.mouseX = 0;
      this.mouseY = 0;
      this.isRunning = false;
      this.lastTime = 0;
      this.deltaTime = 0;
      this.mode = options.mode || 'particles';
      this.interactive = options.interactive !== false;

      this.init();
    }

    init() {
      this.resize();
      this.createParticles();

      if (this.interactive) {
        this.canvas.addEventListener('mousemove', (e) => {
          const rect = this.canvas.getBoundingClientRect();
          this.mouseX = e.clientX - rect.left;
          this.mouseY = e.clientY - rect.top;
        });

        this.canvas.addEventListener('click', (e) => {
          const rect = this.canvas.getBoundingClientRect();
          this.spawnBurst(e.clientX - rect.left, e.clientY - rect.top);
        });
      }

      window.addEventListener('resize', () => this.resize());
    }

    resize() {
      const rect = this.canvas.parentElement.getBoundingClientRect();
      this.canvas.width = rect.width;
      this.canvas.height = rect.height;
    }

    createParticles() {
      this.particles = [];
      for (let i = 0; i < CONFIG.MAX_PARTICLES; i++) {
        this.particles.push(new Particle(null, null, this.canvas));
      }
    }

    spawnBurst(x, y) {
      const count = DEFAULTS.CLICK_BURST_COUNT || 20;
      for (let i = 0; i < count; i++) {
        const p = new Particle(x, y, this.canvas);
        p.vx = (Math.random() - 0.5) * 10;
        p.vy = (Math.random() - 0.5) * 10;
        this.particles.push(p);
      }
      if (this.particles.length > CONFIG.MAX_PARTICLES * 2) {
        this.particles.splice(0, count);
      }
    }

    update() {
      const interactionRadius = DEFAULTS.MOUSE_INTERACTION_RADIUS || 100;
      for (const p of this.particles) {
        const dx = p.x - this.mouseX;
        const dy = p.y - this.mouseY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < interactionRadius && dist > 0) {
          const force = (interactionRadius - dist) / interactionRadius;
          p.vx += (dx / dist) * force * 0.5;
          p.vy += (dy / dist) * force * 0.5;
        }
        p.update();
      }
    }

    draw() {
      this.ctx.fillStyle = DEFAULTS.DEFAULT_BG_COLOR || '#1a1a2e';
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

      this.drawGrid();

      for (const p of this.particles) {
        p.draw(this.ctx);
      }

      this.drawOverlay();
    }

    drawGrid() {
      this.ctx.strokeStyle = 'rgba(255,255,255,0.03)';
      this.ctx.lineWidth = 1;
      const gridSize = DEFAULTS.GRID_SIZE || 50;
      for (let x = 0; x < this.canvas.width; x += gridSize) {
        this.ctx.beginPath();
        this.ctx.moveTo(x, 0);
        this.ctx.lineTo(x, this.canvas.height);
        this.ctx.stroke();
      }
      for (let y = 0; y < this.canvas.height; y += gridSize) {
        this.ctx.beginPath();
        this.ctx.moveTo(0, y);
        this.ctx.lineTo(this.canvas.width, y);
        this.ctx.stroke();
      }
    }

    drawOverlay() {
      const gradient = this.ctx.createRadialGradient(
        this.mouseX, this.mouseY, 0,
        this.mouseX, this.mouseY, 200
      );
      gradient.addColorStop(0, 'rgba(78, 205, 196, 0.1)');
      gradient.addColorStop(1, 'transparent');
      this.ctx.fillStyle = gradient;
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    loop(timestamp) {
      if (!this.isRunning) return;

      this.deltaTime = timestamp - this.lastTime;
      this.lastTime = timestamp;

      if (this.deltaTime >= 1000 / CONFIG.TARGET_FPS) {
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
        colors: CONFIG.COLORS,
        particleCount: CONFIG.MAX_PARTICLES,
        targetFPS: CONFIG.TARGET_FPS
      };
    }
  }

  return { Engine, Particle, CONFIG };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = InteractiveEngine;
}