// LUMEN DRIFT — the things in the world. Plain data + small update/draw
// helpers; the Game class owns spawning, collisions and scoring.

import { PLAYER, SHARD, VOID_ORB, POWERUP } from './config.js';

export class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.radius = PLAYER.radius;
    this.trail = [];
    this.invuln = 0;
    this.shield = false;
    this.magnetUntil = 0;
    this.angle = -Math.PI / 2;
  }

  reset(x, y) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.trail.length = 0;
    this.invuln = 0;
    this.shield = false;
    this.magnetUntil = 0;
  }

  update(dt, targetX, targetY, keys) {
    // Steer toward the pointer when it is active, else by keys.
    let ax = 0;
    let ay = 0;
    if (targetX !== null && targetY !== null) {
      const dx = targetX - this.x;
      const dy = targetY - this.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 4) {
        const want = Math.min(PLAYER.maxSpeed, dist * 10);
        ax = (dx / dist) * want * 8;
        ay = (dy / dist) * want * 8;
      }
    } else {
      ax = keys.x * PLAYER.accel;
      ay = keys.y * PLAYER.accel;
    }
    this.vx += ax * dt;
    this.vy += ay * dt;
    const damp = Math.exp(-PLAYER.damping * dt);
    this.vx *= damp;
    this.vy *= damp;
    const speed = Math.hypot(this.vx, this.vy);
    if (speed > PLAYER.maxSpeed) {
      this.vx = (this.vx / speed) * PLAYER.maxSpeed;
      this.vy = (this.vy / speed) * PLAYER.maxSpeed;
    }
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (speed > 30) this.angle = Math.atan2(this.vy, this.vx);
    this.trail.push({ x: this.x, y: this.y });
    if (this.trail.length > PLAYER.trailLength) this.trail.shift();
    if (this.invuln > 0) this.invuln -= dt;
  }

  clampTo(w, h) {
    const m = this.radius + 2;
    this.x = Math.max(m, Math.min(w - m, this.x));
    this.y = Math.max(m, Math.min(h - m, this.y));
  }

  get invulnerable() {
    return this.invuln > 0;
  }

  get magnetActive() {
    return this.magnetUntil > 0;
  }
}

export class Shard {
  constructor(x, y, fallSpeed, phase) {
    this.x = x;
    this.y = y;
    this.fallSpeed = fallSpeed;
    this.phase = phase;
    this.radius = SHARD.radius;
    this.spin = Math.random() * Math.PI * 2;
    this.dead = false;
    this.missed = false;
  }

  update(dt, timeScale, player, magnetActive) {
    const t = dt * timeScale;
    if (magnetActive && player) {
      const dx = player.x - this.x;
      const dy = player.y - this.y;
      const d = Math.hypot(dx, dy);
      if (d < 260 && d > 1) {
        const pull = 640 * (1 - d / 260) + 120;
        this.x += (dx / d) * pull * t;
        this.y += (dy / d) * pull * t;
      }
    }
    this.y += this.fallSpeed * t;
    this.x += Math.sin(this.phase + this.y * 0.012) * SHARD.drift * t;
    this.spin += t * 3;
  }
}

export class VoidOrb {
  constructor(x, y, fallSpeed, radius) {
    this.x = x;
    this.y = y;
    this.fallSpeed = fallSpeed;
    this.radius = radius;
    this.phase = Math.random() * Math.PI * 2;
    this.pulse = 0;
    this.nearMissed = false;
    this.dead = false;
  }

  update(dt, timeScale) {
    const t = dt * timeScale;
    this.y += this.fallSpeed * t;
    this.x += Math.sin(this.phase + this.y * 0.008) * 34 * t;
    this.pulse += t * 5;
  }
}

export class PowerUp {
  constructor(x, y, kind) {
    this.x = x;
    this.y = y;
    this.kind = kind; // 'shield' | 'magnet' | 'slow'
    this.radius = POWERUP.radius;
    this.phase = Math.random() * Math.PI * 2;
    this.dead = false;
  }

  update(dt, timeScale) {
    const t = dt * timeScale;
    this.y += POWERUP.fallSpeed * t;
    this.phase += t * 2.4;
  }
}

export class Particle {
  constructor(x, y, vx, vy, life, size, color) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.life = life;
    this.maxLife = life;
    this.size = size;
    this.color = color;
  }

  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.vx *= Math.exp(-2.2 * dt);
    this.vy *= Math.exp(-2.2 * dt);
    this.life -= dt;
  }

  get alive() {
    return this.life > 0;
  }

  get alpha() {
    return Math.max(0, this.life / this.maxLife);
  }
}

export function burst(particles, x, y, color, count, speed) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = speed * (0.35 + Math.random() * 0.85);
    particles.push(new Particle(
      x, y,
      Math.cos(a) * s, Math.sin(a) * s,
      0.35 + Math.random() * 0.5,
      1.5 + Math.random() * 2.5,
      color,
    ));
  }
}

export class Floater {
  constructor(x, y, text, color, big = false) {
    this.x = x;
    this.y = y;
    this.text = text;
    this.color = color;
    this.big = big;
    this.life = 1.0;
  }

  update(dt) {
    this.y -= 42 * dt;
    this.life -= dt * 0.9;
  }

  get alive() {
    return this.life > 0;
  }
}
