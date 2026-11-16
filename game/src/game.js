// LUMEN DRIFT — the game itself: state machine, spawn director, collisions,
// scoring, combo, levels, power-ups. Rendering lives in render.js; this file
// only decides what happens.

import {
  ARENA, PALETTE, PLAYER, SHARD, VOID_ORB, SPAWN, POWERUP, HEARTS, STORAGE_KEY,
} from './config.js';
import { Player, Shard, VoidOrb, PowerUp, Particle, Floater, burst } from './entities.js';
import { SoundEngine } from './audio.js';

export const STATES = {
  TITLE: 'title',
  PLAYING: 'playing',
  PAUSED: 'paused',
  OVER: 'over',
};

export class Game {
  constructor() {
    this.state = STATES.TITLE;
    this.time = 0;
    this.player = new Player(ARENA.width / 2, ARENA.height - 110);
    this.shards = [];
    this.orbs = [];
    this.powerups = [];
    this.particles = [];
    this.floaters = [];
    this.score = 0;
    this.best = 0;
    this.combo = 0;
    this.bestCombo = 0;
    this.level = 1;
    this.shardsCollected = 0;
    this.shardsThisLevel = 0;
    this.hearts = HEARTS;
    this.spawnTimer = 0;
    this.slowUntil = 0;
    this.shake = 0;
    this.flash = 0;
    this.sound = new SoundEngine();
    this.powerupIndex = 0;
    try {
      this.best = Number(localStorage.getItem(STORAGE_KEY) || 0) || 0;
    } catch {
      this.best = 0;
    }
  }

  get timeScale() {
    return this.time < this.slowUntil ? POWERUP.slowFactor : 1;
  }

  get multiplier() {
    return Math.min(1 + Math.floor(this.combo / SHARD.comboStep), SHARD.comboCap);
  }

  get levelProgress() {
    return this.shardsThisLevel / SPAWN.shardsPerLevel;
  }

  start() {
    this.state = STATES.PLAYING;
    this.time = 0;
    this.player.reset(ARENA.width / 2, ARENA.height - 110);
    this.shards = [];
    this.orbs = [];
    this.powerups = [];
    this.particles = [];
    this.floaters = [];
    this.score = 0;
    this.combo = 0;
    this.bestCombo = 0;
    this.level = 1;
    this.shardsCollected = 0;
    this.shardsThisLevel = 0;
    this.hearts = HEARTS;
    this.spawnTimer = 0.4;
    this.slowUntil = 0;
    this.shake = 0;
    this.flash = 0;
    this.sound.unlock();
    this.sound.click();
  }

  togglePause() {
    if (this.state === STATES.PLAYING) {
      this.state = STATES.PAUSED;
    } else if (this.state === STATES.PAUSED) {
      this.state = STATES.PLAYING;
    }
  }

  gameOver() {
    this.state = STATES.OVER;
    this.sound.gameOver();
    burst(this.particles, this.player.x, this.player.y, PALETTE.player, 42, 320);
    burst(this.particles, this.player.x, this.player.y, PALETTE.voidOrb, 24, 220);
    this.shake = 14;
    if (this.score > this.best) {
      this.best = this.score;
      try {
        localStorage.setItem(STORAGE_KEY, String(this.best));
      } catch {
        // storage unavailable — best score just lives for this session
      }
    }
  }

  spawnTick(dt) {
    this.spawnTimer -= dt;
    if (this.spawnTimer > 0) return;
    const interval = Math.max(
      SPAWN.intervalMin,
      SPAWN.intervalStart * Math.pow(SPAWN.intervalFactor, this.level - 1),
    );
    this.spawnTimer = interval * (0.75 + Math.random() * 0.5);
    const speedMul = Math.pow(SPAWN.speedFactor, this.level - 1);
    const roll = Math.random();
    if (roll < SPAWN.powerUpChance) {
      const kind = POWERUP.kinds[this.powerupIndex % POWERUP.kinds.length];
      this.powerupIndex += 1;
      this.powerups.push(new PowerUp(
        40 + Math.random() * (ARENA.width - 80), -20, kind,
      ));
      return;
    }
    const voidChance = Math.min(
      SPAWN.voidChanceCap,
      SPAWN.voidChanceStart + SPAWN.voidChancePerLevel * (this.level - 1),
    );
    if (roll < SPAWN.powerUpChance + voidChance) {
      const r = VOID_ORB.radiusMin + Math.random() * (VOID_ORB.radiusMax - VOID_ORB.radiusMin);
      this.orbs.push(new VoidOrb(
        40 + Math.random() * (ARENA.width - 80), -30,
        (VOID_ORB.fallMin + Math.random() * (VOID_ORB.fallMax - VOID_ORB.fallMin)) * speedMul,
        r,
      ));
    } else {
      this.shards.push(new Shard(
        30 + Math.random() * (ARENA.width - 60), -20,
        (SHARD.fallMin + Math.random() * (SHARD.fallMax - SHARD.fallMin)) * speedMul,
        Math.random() * Math.PI * 2,
      ));
    }
  }

  collectShard(shard) {
    shard.dead = true;
    this.combo += 1;
    this.bestCombo = Math.max(this.bestCombo, this.combo);
    const gained = SHARD.basePoints * this.multiplier;
    this.score += gained;
    this.shardsCollected += 1;
    this.shardsThisLevel += 1;
    burst(this.particles, shard.x, shard.y, PALETTE.shard, 10, 170);
    this.floaters.push(new Floater(shard.x, shard.y - 12, `+${gained}`, PALETTE.shard));
    this.sound.collect(this.combo);
    if (this.shardsThisLevel >= SPAWN.shardsPerLevel) {
      this.shardsThisLevel = 0;
      this.level += 1;
      this.floaters.push(new Floater(
        ARENA.width / 2, ARENA.height * 0.35, `LEVEL ${this.level}`, PALETTE.gold, true,
      ));
      this.sound.levelUp();
      burst(this.particles, ARENA.width / 2, ARENA.height * 0.4, PALETTE.gold, 30, 260);
    }
  }

  hitOrb(orb) {
    orb.dead = true;
    this.combo = 0;
    this.shake = 12;
    this.flash = 0.55;
    burst(this.particles, this.player.x, this.player.y, PALETTE.voidOrb, 26, 280);
    if (this.player.shield) {
      this.player.shield = false;
      this.floaters.push(new Floater(this.player.x, this.player.y - 30, 'SHIELD SAVED YOU', PALETTE.shield));
      this.sound.powerup();
      this.player.invuln = PLAYER.invulnSeconds;
      return;
    }
    this.hearts -= 1;
    this.sound.hit();
    this.player.invuln = PLAYER.invulnSeconds;
    if (this.hearts <= 0) this.gameOver();
  }

  collectPowerUp(p) {
    p.dead = true;
    burst(this.particles, p.x, p.y, PALETTE[p.kind === 'shield' ? 'shield' : p.kind === 'magnet' ? 'magnet' : 'slow'], 16, 200);
    this.sound.powerup();
    if (p.kind === 'shield') {
      this.player.shield = true;
      this.floaters.push(new Floater(p.x, p.y - 14, 'SHIELD UP', PALETTE.shield));
    } else if (p.kind === 'magnet') {
      this.player.magnetUntil = this.time + POWERUP.magnetSeconds;
      this.floaters.push(new Floater(p.x, p.y - 14, 'MAGNET 6s', PALETTE.magnet));
    } else {
      this.slowUntil = this.time + POWERUP.slowSeconds;
      this.floaters.push(new Floater(p.x, p.y - 14, 'SLOW TIME 5s', PALETTE.slow));
    }
  }

  update(dt, input, pointerScale) {
    this.time += dt;
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 34);
    if (this.flash > 0) this.flash = Math.max(0, this.flash - dt * 1.8);
    for (const pt of this.particles) pt.update(dt);
    this.particles = this.particles.filter((pt) => pt.alive);
    for (const f of this.floaters) f.update(dt);
    this.floaters = this.floaters.filter((f) => f.alive);

    if (this.state === STATES.TITLE || this.state === STATES.OVER) {
      // Gentle ambient drift behind the menus.
      if (Math.random() < dt * 6) {
        this.shards.push(new Shard(
          Math.random() * ARENA.width, -20,
          40 + Math.random() * 50, Math.random() * Math.PI * 2,
        ));
      }
      for (const s of this.shards) s.update(dt, 1, null, false);
      this.shards = this.shards.filter((s) => s.y < ARENA.height + 30);
      return;
    }
    if (this.state !== STATES.PLAYING) return;

    const scale = pointerScale || 1;
    const px = input.pointer.active && input.pointer.x !== null
      ? input.pointer.x / scale : null;
    const py = input.pointer.active && input.pointer.y !== null
      ? input.pointer.y / scale : null;
    this.player.update(dt, px, py, input.axes());
    this.player.clampTo(ARENA.width, ARENA.height);

    this.spawnTick(dt);
    const ts = this.timeScale;
    const magnet = this.player.magnetActive && this.time < this.player.magnetUntil;
    for (const s of this.shards) s.update(dt, ts, this.player, magnet);
    for (const o of this.orbs) o.update(dt, ts);
    for (const p of this.powerups) p.update(dt, ts);

    const p = this.player;
    for (const s of this.shards) {
      if (s.dead) continue;
      if (Math.hypot(s.x - p.x, s.y - p.y) < s.radius + p.radius + 4) {
        this.collectShard(s);
      } else if (s.y > ARENA.height + 30) {
        s.dead = true;
        s.missed = true;
        if (this.combo >= 8) {
          this.floaters.push(new Floater(s.x, ARENA.height - 40, 'COMBO LOST', PALETTE.danger));
        }
        this.combo = 0;
      }
    }
    for (const o of this.orbs) {
      if (o.dead) continue;
      const d = Math.hypot(o.x - p.x, o.y - p.y);
      if (!o.nearMissed && d < VOID_ORB.nearMissRadius + p.radius && d >= o.radius + p.radius) {
        o.nearMissed = true;
        this.score += VOID_ORB.nearMissPoints;
        this.floaters.push(new Floater(p.x, p.y - 34, `CLOSE! +${VOID_ORB.nearMissPoints}`, PALETTE.hudText));
        this.sound.nearMiss();
      }
      if (d < o.radius + p.radius - 2) {
        if (!p.invulnerable) this.hitOrb(o);
        else o.dead = true;
      } else if (o.y > ARENA.height + 40) {
        o.dead = true;
      }
    }
    for (const pu of this.powerups) {
      if (pu.dead) continue;
      if (Math.hypot(pu.x - p.x, pu.y - p.y) < pu.radius + p.radius + 6) {
        this.collectPowerUp(pu);
      } else if (pu.y > ARENA.height + 30) {
        pu.dead = true;
      }
    }
    this.shards = this.shards.filter((s) => !s.dead);
    this.orbs = this.orbs.filter((o) => !o.dead);
    this.powerups = this.powerups.filter((pu) => !pu.dead);
  }
}
