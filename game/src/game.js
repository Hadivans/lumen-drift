// LUMEN DRIFT — the game itself: state machine, spawn director, collisions,
// scoring, combo, levels, power-ups. Rendering lives in render.js; this file
// only decides what happens.

import {
  ARENA, PALETTE, PLAYER, SHARD, VOID_ORB, SPAWN, POWERUP, HEARTS, STORAGE_KEY,
  SEEKER, NOVA, SURGE, MAW, DOUBLE, COMBO_MILESTONES, HIT_STOP_SECONDS,
  BOSS_RUSH, FREEZE, STARSHIELD, SPLITTER, THEMES, THEME_EVERY_LEVELS,
  RUSH_STORAGE_KEY,
} from './config.js';
import {
  Player, Shard, VoidOrb, SeekerOrb, VoidMaw, Shockwave,
  SplitterOrb, SplitterChild,
  PowerUp, Particle, Floater, burst, ringBurst,
} from './entities.js';
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
    this.seekers = []; // v2: homing void orbs
    this.maws = []; // v2: the sweeping Void Maw event
    this.shockwaves = []; // v2: Nova blast rings
    this.powerups = [];
    this.particles = [];
    this.floaters = [];
    // v2.1 — Boss Rush state: which mode this run is, which round of the
    // rush, and the breather clock between rounds. Classic runs leave all
    // of this at its resting values.
    this.mode = 'classic'; // 'classic' | 'rush'
    this.rushRound = 0;
    this.rushPhase = 'idle'; // 'idle' | 'breather' | 'fight' | 'cleared'
    this.rushTimer = 0;
    this.rushMawsToSpawn = 0;
    this.rushMawsSpawned = 0;
    this.rushBest = 0;
    this.splitters = []; // v2.1: teal orbs that split when dodged
    this.splitKids = []; // v2.1: the fast children of a dodged splitter
    this.freezeUntil = 0; // v2.1: Time Freeze timer
    this.starUntil = 0; // v2.1: Star Shield timer
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
    this.doubleUntil = 0; // v2: Double Score timer
    this.surgeUntil = 0; // v2: Shard Surge timer
    this.hitStop = 0; // v2: freeze frames after a hit
    // v2 — run stats: the story of this run, shown on the game-over
    // screen so a good run reads as more than one number.
    // v2.1: rush rounds, freezes, star smashes and splitter splits join.
    this.stats = {
      orbsDodged: 0,
      seekersDodged: 0,
      novasUsed: 0,
      orbsClearedByNova: 0,
      surgesSeen: 0,
      mawsSeen: 0,
      nearMisses: 0,
      rushRoundsCleared: 0,
      freezesUsed: 0,
      starSmashes: 0,
      splittersSplit: 0,
      splitKidsDodged: 0,
    };
    this.shake = 0;
    this.flash = 0;
    this.sound = new SoundEngine();
    this.powerupIndex = 0;
    try {
      this.best = Number(localStorage.getItem(STORAGE_KEY) || 0) || 0;
      this.rushBest = Number(localStorage.getItem(RUSH_STORAGE_KEY) || 0) || 0;
    } catch {
      this.best = 0;
      this.rushBest = 0;
    }
  }

  get timeScale() {
    return this.time < this.slowUntil ? POWERUP.slowFactor : 1;
  }

  // v2 — Double Score is live while its timer runs.
  get doubleActive() {
    return this.time < this.doubleUntil;
  }

  // v2 — the Shard Surge is live while its timer runs.
  get surgeActive() {
    return this.time < this.surgeUntil;
  }

  // v2.1 — Boss Rush is the mode of this run, not a timer.
  get isRush() {
    return this.mode === 'rush';
  }

  // v2.1 — Time Freeze is live while its timer runs: the world hangs,
  // the ship still flies.
  get frozen() {
    return this.time < this.freezeUntil;
  }

  // v2.1 — the Star Shield burns while its timer runs: touching a void
  // orb smashes it for points instead of costing a heart.
  get starActive() {
    return this.time < this.starUntil;
  }

  // v2.1 — the sky's theme: every THEME_EVERY_LEVELS levels the nebula
  // shifts hue. Level 1–4 is the classic indigo; the table cycles after.
  get theme() {
    const idx = Math.floor((this.level - 1) / THEME_EVERY_LEVELS) % THEMES.length;
    return THEMES[idx];
  }

  get themeName() {
    return this.theme.name;
  }

  get multiplier() {
    return Math.min(1 + Math.floor(this.combo / SHARD.comboStep), SHARD.comboCap);
  }

  get levelProgress() {
    return this.shardsThisLevel / SPAWN.shardsPerLevel;
  }

  start(mode = 'classic') {
    this.state = STATES.PLAYING;
    this.mode = mode === 'rush' ? 'rush' : 'classic';
    this.time = 0;
    this.player.reset(ARENA.width / 2, ARENA.height - 110);
    this.shards = [];
    this.orbs = [];
    this.seekers = [];
    this.maws = [];
    this.shockwaves = [];
    this.powerups = [];
    this.particles = [];
    this.floaters = [];
    // v2.1 — a fresh run clears the rush, the splitters and the new timers.
    this.rushRound = 0;
    this.rushPhase = 'idle';
    this.rushTimer = 0;
    this.rushMawsToSpawn = 0;
    this.rushMawsSpawned = 0;
    this.splitters = [];
    this.splitKids = [];
    this.freezeUntil = 0;
    this.starUntil = 0;
    this.score = 0;
    this.combo = 0;
    this.bestCombo = 0;
    this.level = 1;
    this.shardsCollected = 0;
    this.shardsThisLevel = 0;
    this.hearts = HEARTS;
    this.spawnTimer = 0.4;
    this.slowUntil = 0;
    this.doubleUntil = 0;
    this.surgeUntil = 0;
    this.hitStop = 0;
    this.stats = {
      orbsDodged: 0,
      seekersDodged: 0,
      novasUsed: 0,
      orbsClearedByNova: 0,
      surgesSeen: 0,
      mawsSeen: 0,
      nearMisses: 0,
      rushRoundsCleared: 0,
      freezesUsed: 0,
      starSmashes: 0,
      splittersSplit: 0,
      splitKidsDodged: 0,
    };
    this.shake = 0;
    this.flash = 0;
    this.sound.unlock();
    this.sound.click();
    // v2.1 — a rush run opens with round 1's breather, not the classic
    // spawn director. The first maw arrives after the calm.
    if (this.isRush) this.beginRushRound(1);
  }

  // v2.1 — Boss Rush round setup: count the maws for this round, open a
  // breather so the player can reposition, and announce the round. The
  // maws themselves arrive one by one once the breather ends.
  beginRushRound(n) {
    this.rushRound = n;
    const extra = Math.floor((n - 1) / BOSS_RUSH.extraMawEveryRounds);
    this.rushMawsToSpawn = Math.min(BOSS_RUSH.mawsPerRoundBase + extra, BOSS_RUSH.mawsCap);
    this.rushMawsSpawned = 0;
    this.rushPhase = 'breather';
    this.rushTimer = BOSS_RUSH.breatherSeconds;
    this.floaters.push(new Floater(
      ARENA.width / 2, ARENA.height * 0.35, `BOSS RUSH — ROUND ${n}`, PALETTE.rush, true,
    ));
    this.floaters.push(new Floater(
      ARENA.width / 2, ARENA.height * 0.35 + 40,
      n === 1 ? 'SURVIVE THE MAWS!' : `${this.rushMawsToSpawn} MAW${this.rushMawsToSpawn > 1 ? 'S' : ''} INCOMING`,
      PALETTE.hudText,
    ));
    this.sound.rushRound(n);
  }

  // v2.1 — a rush maw, scaled by the round: faster sweeps and quicker
  // spit as the rounds climb. Maws spread across the top on arrival so
  // two of them never stack on one lane.
  spawnRushMaw() {
    const count = this.rushMawsSpawned;
    const slots = Math.max(1, this.rushMawsToSpawn);
    const x = ARENA.width * (count + 1) / (slots + 1);
    const maw = new VoidMaw(x, BOSS_RUSH.mawY);
    const speedMul = 1 + BOSS_RUSH.mawSpeedPerRound * (this.rushRound - 1);
    maw.vx = Math.abs(maw.vx) * speedMul * (count % 2 === 0 ? 1 : -1);
    maw.spitTimer = 1.0;
    maw._rushSpit = MAW.spitInterval * Math.pow(1 - BOSS_RUSH.spitFasterPerRound, this.rushRound - 1);
    this.maws.push(maw);
    this.rushMawsSpawned += 1;
    this.stats.mawsSeen += 1;
    this.shake = Math.max(this.shake, 6);
    this.sound.maw();
  }

  // v2.1 — a rush round is cleared when every maw it spawned is gone:
  // left the arena after its life, or smashed by a Nova or a star. The
  // bonus grows with the round, then the next breather opens.
  clearRushRound() {
    const bonus = BOSS_RUSH.roundBonusBase + BOSS_RUSH.roundBonusPerRound * (this.rushRound - 1);
    this.score += bonus;
    this.stats.rushRoundsCleared += 1;
    this.floaters.push(new Floater(
      ARENA.width / 2, ARENA.height * 0.42, `ROUND ${this.rushRound} CLEARED!`, PALETTE.gold, true,
    ));
    this.floaters.push(new Floater(
      ARENA.width / 2, ARENA.height * 0.42 + 38, `+${bonus} BONUS`, PALETTE.hudText,
    ));
    ringBurst(this.particles, ARENA.width / 2, ARENA.height * 0.4, PALETTE.gold, 30, 260);
    this.sound.rushClear();
    this.beginRushRound(this.rushRound + 1);
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
    // v2.1 — a classic run measures itself against the classic best only;
    // a rush run never pollutes the classic board.
    if (!this.isRush && this.score > this.best) {
      this.best = this.score;
      try {
        localStorage.setItem(STORAGE_KEY, String(this.best));
      } catch {
        // storage unavailable — best score just lives for this session
      }
    }
    // v2.1 — Boss Rush keeps its own best, so a rush run never pollutes
    // the classic board and the title can show both.
    if (this.isRush && this.score > this.rushBest) {
      this.rushBest = this.score;
      try {
        localStorage.setItem(RUSH_STORAGE_KEY, String(this.rushBest));
      } catch {
        // storage unavailable — rush best just lives for this session
      }
    }
  }

  spawnTick(dt) {
    this.spawnTimer -= dt;
    if (this.spawnTimer > 0) return;
    // v2 — during a Shard Surge the sky rains: short interval, mostly shards.
    const interval = this.surgeActive
      ? SURGE.interval
      : Math.max(
        SPAWN.intervalMin,
        SPAWN.intervalStart * Math.pow(SPAWN.intervalFactor, this.level - 1),
      );
    this.spawnTimer = interval * (0.75 + Math.random() * 0.5);
    const speedMul = Math.pow(SPAWN.speedFactor, this.level - 1);
    const roll = Math.random();
    if (!this.surgeActive && roll < SPAWN.powerUpChance) {
      const kind = POWERUP.kinds[this.powerupIndex % POWERUP.kinds.length];
      this.powerupIndex += 1;
      this.powerups.push(new PowerUp(
        40 + Math.random() * (ARENA.width - 80), -20, kind,
      ));
      return;
    }
    const voidChance = this.surgeActive
      ? 1 - SURGE.shardChance
      : Math.min(
        SPAWN.voidChanceCap,
        SPAWN.voidChanceStart + SPAWN.voidChancePerLevel * (this.level - 1),
      );
    if (roll < SPAWN.powerUpChance + voidChance) {
      // v2 — from level 3, a share of void spawns are Seekers that hunt
      // the player's lane instead of drifting down blindly.
      const isSeeker = this.level >= SEEKER.minLevel
        && !this.surgeActive
        && Math.random() < SEEKER.share;
      if (isSeeker) {
        this.seekers.push(new SeekerOrb(
          40 + Math.random() * (ARENA.width - 80), -30,
          (SEEKER.fallMin + Math.random() * (SEEKER.fallMax - SEEKER.fallMin)) * speedMul,
        ));
      } else if (this.level >= SPLITTER.minLevel && !this.surgeActive && Math.random() < SPLITTER.share) {
        // v2.1 — from level 2, a share of void spawns are Splitters: dodge
        // one and it becomes two fast children at the bottom edge.
        this.splitters.push(new SplitterOrb(
          40 + Math.random() * (ARENA.width - 80), -30,
          (SPLITTER.fallMin + Math.random() * (SPLITTER.fallMax - SPLITTER.fallMin)) * speedMul,
        ));
      } else {
        const r = VOID_ORB.radiusMin + Math.random() * (VOID_ORB.radiusMax - VOID_ORB.radiusMin);
        this.orbs.push(new VoidOrb(
          40 + Math.random() * (ARENA.width - 80), -30,
          (VOID_ORB.fallMin + Math.random() * (VOID_ORB.fallMax - VOID_ORB.fallMin)) * speedMul,
          r,
        ));
      }
    } else {
      this.shards.push(new Shard(
        30 + Math.random() * (ARENA.width - 60), -20,
        (SHARD.fallMin + Math.random() * (SHARD.fallMax - SHARD.fallMin)) * speedMul,
        Math.random() * Math.PI * 2,
      ));
    }
  }

  // v2 — Shard Surge: a six-second shard rain, announced with a banner.
  triggerSurge() {
    this.surgeUntil = this.time + SURGE.durationSeconds;
    this.stats.surgesSeen += 1;
    this.floaters.push(new Floater(
      ARENA.width / 2, ARENA.height * 0.3, SURGE.banner, PALETTE.surge, true,
    ));
    this.floaters.push(new Floater(
      ARENA.width / 2, ARENA.height * 0.3 + 40, 'HARVEST THEM ALL!', PALETTE.hudText,
    ));
    ringBurst(this.particles, ARENA.width / 2, ARENA.height * 0.35, PALETTE.surge, 28, 240);
    this.sound.surge();
  }

  // v2 — Void Maw: one maw enters at the top and starts sweeping.
  spawnMaw() {
    this.maws.push(new VoidMaw(ARENA.width / 2, 70));
    this.stats.mawsSeen += 1;
    this.floaters.push(new Floater(
      ARENA.width / 2, ARENA.height * 0.42, 'THE VOID MAW AWAKENS', PALETTE.mawEye, true,
    ));
    this.floaters.push(new Floater(
      ARENA.width / 2, ARENA.height * 0.42 + 40, 'DODGE ITS SPIT!', PALETTE.hudText,
    ));
    this.shake = Math.max(this.shake, 8);
    this.sound.maw();
  }

  // v2 — Nova detonation: every void orb and seeker on screen is cleared
  // at once, each one paying a bonus, with a shockwave ring and a flash.
  detonateNova(x, y) {
    let cleared = 0;
    for (const o of this.orbs) {
      if (o.dead) continue;
      o.dead = true;
      cleared += 1;
      burst(this.particles, o.x, o.y, PALETTE.voidOrb, 8, 200);
    }
    for (const s of this.seekers) {
      if (s.dead) continue;
      s.dead = true;
      cleared += 1;
      burst(this.particles, s.x, s.y, PALETTE.seeker, 8, 200);
    }
    const bonus = cleared * NOVA.pointsPerOrb;
    this.score += bonus;
    this.stats.novasUsed += 1;
    this.stats.orbsClearedByNova += cleared;
    this.shockwaves.push(new Shockwave(x, y, PALETTE.novaRing, NOVA.ringMaxRadius, NOVA.ringSeconds));
    ringBurst(this.particles, x, y, PALETTE.nova, 36, 320);
    this.flash = Math.max(this.flash, 0.35);
    this.shake = Math.max(this.shake, 7);
    this.floaters.push(new Floater(
      x, y - 24, cleared > 0 ? `NOVA! +${bonus}` : 'NOVA!', PALETTE.nova, true,
    ));
    this.sound.nova();
  }

  // v2.1 — Time Freeze: stop the world for a few seconds. The timer is
  // the whole effect — the update loop checks `frozen` and skips every
  // entity's motion while it runs, so shards hang mid-air to harvest.
  triggerFreeze() {
    this.freezeUntil = this.time + FREEZE.seconds;
    this.stats.freezesUsed += 1;
    this.floaters.push(new Floater(
      ARENA.width / 2, ARENA.height * 0.3, 'TIME FREEZE!', PALETTE.freeze, true,
    ));
    ringBurst(this.particles, this.player.x, this.player.y, PALETTE.freeze, 26, 240);
    this.sound.freeze();
  }

  // v2.1 — Star smash: while the star burns, a void threat that touches
  // the ship is destroyed for points instead of costing a heart. The
  // burst and floater sell the smash; the score is the reward for diving
  // into danger on purpose.
  smashOrb(orb) {
    orb.dead = true;
    const pts = STARSHIELD.smashPoints * (this.doubleActive ? DOUBLE.factor : 1);
    this.score += pts;
    this.stats.starSmashes += 1;
    burst(this.particles, orb.x, orb.y, PALETTE.starshield, 14, 260);
    ringBurst(this.particles, orb.x, orb.y, PALETTE.starshield, 10, 180);
    this.floaters.push(new Floater(orb.x, orb.y - 16, `SMASH! +${pts}`, PALETTE.starshield));
    this.sound.smash();
  }

  // v2.1 — a dodged splitter becomes two children. They spawn at the
  // bottom edge where the parent slipped past, offset left and right, and
  // drop fast with a wobble. The parent is marked split so it only ever
  // happens once.
  splitSplitter(sp) {
    sp.split = true;
    sp.dead = true;
    this.stats.splittersSplit += 1;
    for (const side of [-1, 1]) {
      this.splitKids.push(new SplitterChild(
        Math.max(20, Math.min(ARENA.width - 20, sp.x + side * SPLITTER.childSpread)),
        ARENA.height - 80,
        SPLITTER.childSpeed * (0.9 + Math.random() * 0.25),
      ));
    }
    burst(this.particles, sp.x, ARENA.height - 30, PALETTE.splitter, 12, 180);
    this.floaters.push(new Floater(sp.x, ARENA.height - 60, 'SPLIT!', PALETTE.splitter));
    this.sound.split();
  }

  // v2 — Combo milestones: a big celebration floater, a bonus and a
  // fanfare when the streak crosses one of the milestone counts.
  checkMilestones() {
    for (const m of COMBO_MILESTONES) {
      if (this.combo === m.at) {
        this.score += m.bonus;
        this.floaters.push(new Floater(
          ARENA.width / 2, ARENA.height * 0.42, m.label, PALETTE.gold, true,
        ));
        this.floaters.push(new Floater(
          ARENA.width / 2, ARENA.height * 0.42 + 38, `+${m.bonus} BONUS`, PALETTE.hudText,
        ));
        ringBurst(this.particles, this.player.x, this.player.y, PALETTE.gold, 30, 280);
        this.sound.milestone(this.combo);
        break;
      }
    }
  }

  collectShard(shard) {
    shard.dead = true;
    this.combo += 1;
    this.bestCombo = Math.max(this.bestCombo, this.combo);
    // v2 — Double Score doubles the gain on top of the combo multiplier.
    const gained = SHARD.basePoints * this.multiplier * (this.doubleActive ? DOUBLE.factor : 1);
    this.score += gained;
    this.shardsCollected += 1;
    this.shardsThisLevel += 1;
    burst(this.particles, shard.x, shard.y, PALETTE.shard, 10, 170);
    this.floaters.push(new Floater(shard.x, shard.y - 12, `+${gained}`, PALETTE.shard));
    this.sound.collect(this.combo);
    this.checkMilestones();
    if (this.shardsThisLevel >= SPAWN.shardsPerLevel) {
      this.shardsThisLevel = 0;
      this.level += 1;
      this.floaters.push(new Floater(
        ARENA.width / 2, ARENA.height * 0.35, `LEVEL ${this.level}`, PALETTE.gold, true,
      ));
      this.sound.levelUp();
      ringBurst(this.particles, ARENA.width / 2, ARENA.height * 0.4, PALETTE.gold, 30, 260);
      // v2 — every 5th level is a Shard Surge; every 10th level the Void
      // Maw also arrives. A level can be both at once — a real event.
      if (this.level % SURGE.everyLevels === 0) this.triggerSurge();
      if (this.level % MAW.everyLevels === 0) this.spawnMaw();
    }
  }

  hitOrb(orb, { kill = true } = {}) {
    if (kill) orb.dead = true;
    this.combo = 0;
    // v2 — hit-stop freezes the world for a beat, and the shake hits
    // harder, so taking a hit feels like an impact, not a tap.
    this.hitStop = HIT_STOP_SECONDS;
    this.shake = 16;
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
    const colors = {
      shield: PALETTE.shield, magnet: PALETTE.magnet, slow: PALETTE.slow,
      nova: PALETTE.nova, double: PALETTE.double,
      freeze: PALETTE.freeze, starshield: PALETTE.starshield,
    };
    burst(this.particles, p.x, p.y, colors[p.kind] || PALETTE.shield, 16, 200);
    if (p.kind === 'shield') {
      this.player.shield = true;
      this.floaters.push(new Floater(p.x, p.y - 14, 'SHIELD UP', PALETTE.shield));
      this.sound.powerup();
    } else if (p.kind === 'magnet') {
      this.player.magnetUntil = this.time + POWERUP.magnetSeconds;
      this.floaters.push(new Floater(p.x, p.y - 14, 'MAGNET 6s', PALETTE.magnet));
      this.sound.powerup();
    } else if (p.kind === 'slow') {
      this.slowUntil = this.time + POWERUP.slowSeconds;
      this.floaters.push(new Floater(p.x, p.y - 14, 'SLOW TIME 5s', PALETTE.slow));
      this.sound.powerup();
    } else if (p.kind === 'nova') {
      // v2 — the Nova clears the whole screen of void threats at once.
      this.floaters.push(new Floater(p.x, p.y - 14, 'NOVA!', PALETTE.nova));
      this.detonateNova(p.x, p.y);
    } else if (p.kind === 'double') {
      // v2 — Double Score: every point doubled for eight seconds.
      this.doubleUntil = this.time + DOUBLE.seconds;
      this.floaters.push(new Floater(p.x, p.y - 14, '2X SCORE 8s', PALETTE.double));
      this.sound.doubleUp();
    } else if (p.kind === 'freeze') {
      // v2.1 — Time Freeze: the world hangs for three seconds while the
      // ship keeps flying. Harvest the frozen shards.
      this.floaters.push(new Floater(p.x, p.y - 14, 'FREEZE!', PALETTE.freeze));
      this.triggerFreeze();
    } else if (p.kind === 'starshield') {
      // v2.1 — Star Shield: three seconds where touching a void orb
      // smashes it for points instead of costing a heart.
      this.starUntil = this.time + STARSHIELD.seconds;
      this.floaters.push(new Floater(p.x, p.y - 14, 'STAR SHIELD 3s', PALETTE.starshield));
      this.sound.starshield();
    }
  }

  update(dt, input, pointerScale) {
    // v2 — time freezes while paused, so power-up and event timers never
    // expire behind the pause overlay. Title and game-over keep animating.
    if (this.state !== STATES.PAUSED) this.time += dt;
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 34);
    if (this.flash > 0) this.flash = Math.max(0, this.flash - dt * 1.8);
    for (const pt of this.particles) pt.update(dt);
    this.particles = this.particles.filter((pt) => pt.alive);
    for (const f of this.floaters) f.update(dt);
    this.floaters = this.floaters.filter((f) => f.alive);
    for (const w of this.shockwaves) w.update(dt);
    this.shockwaves = this.shockwaves.filter((w) => w.alive);

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

    // v2 — hit-stop: the world freezes for a beat after a hit, so the
    // impact lands. Nothing below runs while the freeze is active.
    if (this.hitStop > 0) {
      this.hitStop -= dt;
      return;
    }

    const scale = pointerScale || 1;
    const px = input.pointer.active && input.pointer.x !== null
      ? input.pointer.x / scale : null;
    const py = input.pointer.active && input.pointer.y !== null
      ? input.pointer.y / scale : null;
    this.player.update(dt, px, py, input.axes());
    this.player.clampTo(ARENA.width, ARENA.height);

    // v2.1 — frozen world: entity motion and spawns run on a zero clock
    // while the freeze burns, but the ship still flies and collisions
    // still resolve, so frozen shards are there to harvest.
    const edt = this.frozen ? 0 : dt;
    // v2.1 — Rush mode runs its own director: no classic spawns, no
    // shards, no power-ups. The breather counts down, then maws arrive.
    if (this.isRush) {
      this.rushTick(edt);
    } else {
      this.spawnTick(edt);
    }
    const ts = this.timeScale;
    const magnet = this.player.magnetActive && this.time < this.player.magnetUntil;
    for (const s of this.shards) s.update(edt, ts, this.player, magnet);
    for (const o of this.orbs) o.update(edt, ts);
    for (const sk of this.seekers) sk.update(edt, ts, this.player);
    for (const p of this.powerups) p.update(edt, ts);
    for (const sp of this.splitters) sp.update(edt, ts);
    for (const k of this.splitKids) k.update(edt, ts);

    // v2 — the Maw sweeps and spits. Each fan is three small void orbs
    // fanning down from the maw's mouth.
    for (const m of this.maws) {
      m.update(edt, ts);
      if (m.wantsToSpit && !this.frozen) {
        m.resetSpit(m._rushSpit || MAW.spitInterval);
        for (let i = -1; i <= 1; i++) {
          this.orbs.push(new VoidOrb(
            m.x + i * 34, m.y + m.radius * 0.6,
            MAW.orbSpeed * (0.9 + Math.random() * 0.2),
            MAW.orbRadius,
          ));
        }
        burst(this.particles, m.x, m.y + m.radius * 0.6, PALETTE.maw, 6, 120);
      }
    }

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
        this.stats.nearMisses += 1;
        this.floaters.push(new Floater(p.x, p.y - 34, `CLOSE! +${VOID_ORB.nearMissPoints}`, PALETTE.hudText));
        this.sound.nearMiss();
      }
      if (d < o.radius + p.radius - 2) {
        // v2.1 — a burning star smashes the orb for points; otherwise a
        // touch costs a heart unless the ship is already invulnerable.
        if (this.starActive) this.smashOrb(o);
        else if (!p.invulnerable) this.hitOrb(o);
        else o.dead = true;
      } else if (o.y > ARENA.height + 40) {
        o.dead = true;
        this.stats.orbsDodged += 1;
      }
    }
    // v2 — Seekers hunt like orbs: a touch costs a heart, a near miss
    // pays the same close bonus, and they vanish off the bottom.
    for (const sk of this.seekers) {
      if (sk.dead) continue;
      const d = Math.hypot(sk.x - p.x, sk.y - p.y);
      if (!sk.nearMissed && d < VOID_ORB.nearMissRadius + p.radius && d >= sk.radius + p.radius) {
        sk.nearMissed = true;
        this.score += VOID_ORB.nearMissPoints;
        this.stats.nearMisses += 1;
        this.floaters.push(new Floater(p.x, p.y - 34, `CLOSE! +${VOID_ORB.nearMissPoints}`, PALETTE.hudText));
        this.sound.nearMiss();
      }
      if (d < sk.radius + p.radius - 2) {
        // v2.1 — a burning star smashes the seeker for points, same as
        // any other void threat. Otherwise it costs a heart as usual.
        if (this.starActive) this.smashOrb(sk);
        else if (!p.invulnerable) this.hitOrb(sk);
        else sk.dead = true;
      } else if (sk.y > ARENA.height + 40 || sk.x < -40 || sk.x > ARENA.width + 40) {
        sk.dead = true;
        this.stats.seekersDodged += 1;
      }
    }
    // v2.1 — Splitters fall like orbs, but a clean dodge is punished: a
    // splitter that slips past the bottom edge becomes two fast children.
    // A touch costs a heart, unless a burning star smashes it first.
    for (const sp of this.splitters) {
      if (sp.dead) continue;
      const d = Math.hypot(sp.x - p.x, sp.y - p.y);
      if (!sp.nearMissed && d < VOID_ORB.nearMissRadius + p.radius && d >= sp.radius + p.radius) {
        sp.nearMissed = true;
        this.score += VOID_ORB.nearMissPoints;
        this.stats.nearMisses += 1;
        this.floaters.push(new Floater(p.x, p.y - 34, `CLOSE! +${VOID_ORB.nearMissPoints}`, PALETTE.hudText));
        this.sound.nearMiss();
      }
      if (d < sp.radius + p.radius - 2) {
        if (this.starActive) this.smashOrb(sp);
        else if (!p.invulnerable) this.hitOrb(sp);
        else sp.dead = true;
      } else if (sp.crossedBottom) {
        this.splitSplitter(sp);
      }
    }
    // v2.1 — Splitter children: small, fast, wobbly, and they never split
    // again. Same heart cost on touch, same close-call bonus, same star
    // smash. Dodging one for good is a small victory.
    for (const k of this.splitKids) {
      if (k.dead) continue;
      const d = Math.hypot(k.x - p.x, k.y - p.y);
      if (!k.nearMissed && d < VOID_ORB.nearMissRadius + p.radius && d >= k.radius + p.radius) {
        k.nearMissed = true;
        this.score += VOID_ORB.nearMissPoints;
        this.stats.nearMisses += 1;
        this.floaters.push(new Floater(p.x, p.y - 34, `CLOSE! +${VOID_ORB.nearMissPoints}`, PALETTE.hudText));
        this.sound.nearMiss();
      }
      if (d < k.radius + p.radius - 2) {
        if (this.starActive) this.smashOrb(k);
        else if (!p.invulnerable) this.hitOrb(k);
        else k.dead = true;
      } else if (k.y > ARENA.height + 40) {
        k.dead = true;
        this.stats.splitKidsDodged += 1;
      }
    }
    // v2 — Touching the Maw itself costs a heart, same as an orb. It sits
    // near the top, so this only happens if the player flies up into it.
    // The maw survives the touch and keeps sweeping — only the player pays.
    for (const m of this.maws) {
      if (m.dead || m.leaving) continue;
      const d = Math.hypot(m.x - p.x, m.y - p.y);
      if (d < m.radius + p.radius - 6 && !p.invulnerable) {
        this.hitOrb(m, { kill: false });
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
    this.seekers = this.seekers.filter((sk) => !sk.dead);
    this.maws = this.maws.filter((m) => !m.dead);
    this.powerups = this.powerups.filter((pu) => !pu.dead);
    this.splitters = this.splitters.filter((sp) => !sp.dead);
    this.splitKids = this.splitKids.filter((k) => !k.dead);
  }

  // v2.1 — Rush director: called every frame in rush mode with the
  // frozen-aware clock. During the breather it counts down, then it
  // releases the round's maws one per second; during the fight it waits
  // for every maw and every spat orb to be gone, then clears the round
  // and opens the next breather. Nothing else spawns in rush mode.
  rushTick(dt) {
    if (this.rushPhase === 'breather') {
      this.rushTimer -= dt;
      if (this.rushTimer <= 0) {
        this.rushPhase = 'fight';
        this.rushTimer = 1.0; // first maw arrives a beat after the calm
      }
      return;
    }
    if (this.rushPhase !== 'fight') return;
    if (this.rushMawsSpawned < this.rushMawsToSpawn) {
      this.rushTimer -= dt;
      if (this.rushTimer <= 0) {
        this.spawnRushMaw();
        this.rushTimer = 1.0; // one maw per second, a steady drumbeat
      }
      return;
    }
    if (this.maws.length === 0 && this.orbs.length === 0) {
      this.rushPhase = 'cleared';
      this.clearRushRound();
    }
  }
}
