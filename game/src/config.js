// LUMEN DRIFT — tuning constants and palette. One place for every number that
// shapes how the game feels, so balancing is editing data, not code.

export const ARENA = {
  width: 960,
  height: 600,
};

export const PALETTE = {
  bgTop: '#0b0620',
  bgMid: '#120a33',
  bgBottom: '#1a0b2e',
  nebulaA: 'rgba(88, 40, 180, 0.20)',
  nebulaB: 'rgba(20, 140, 180, 0.14)',
  nebulaC: 'rgba(200, 60, 140, 0.10)',
  star: '#cfe8ff',
  player: '#7df9ff',
  playerCore: '#ffffff',
  playerTrail: 'rgba(125, 249, 255, 0.35)',
  shard: '#ffd166',
  shardCore: '#fff3c4',
  voidOrb: '#ff2e88',
  voidCore: '#2a0012',
  shield: '#4ade80',
  magnet: '#c084fc',
  slow: '#38bdf8',
  hudText: '#e8f6ff',
  hudDim: 'rgba(232, 246, 255, 0.55)',
  danger: '#ff4d6d',
  gold: '#ffd166',
  // v2 threats and treats.
  seeker: '#ff8c42',
  seekerCore: '#fff1e0',
  nova: '#fffbe6',
  novaRing: '#ffd166',
  double: '#f0abfc',
  maw: '#b026ff',
  mawCore: '#1c0030',
  mawEye: '#ff2e88',
  surge: '#ffd166',
  // v2.1 threats and treats.
  splitter: '#2dd4a7',
  splitterCore: '#d1fae5',
  splitterKid: '#5eead4',
  freeze: '#7dd3fc',
  freezeTint: 'rgba(125, 211, 252, 0.16)',
  starshield: '#fde047',
  starRing: '#fef08a',
  rush: '#fb7185',
};

export const PLAYER = {
  radius: 14,
  accel: 4200, // px/s^2 toward the target point
  maxSpeed: 560,
  damping: 6.5, // exponential velocity damping per second
  trailLength: 16,
  invulnSeconds: 1.2,
};

export const SHARD = {
  radius: 9,
  fallMin: 95,
  fallMax: 165,
  basePoints: 10,
  comboStep: 8, // every 8 combo, multiplier +1
  comboCap: 5,
  drift: 26, // sideways sine drift amplitude (px/s)
};

export const VOID_ORB = {
  radiusMin: 15,
  radiusMax: 22,
  fallMin: 75,
  fallMax: 135,
  nearMissRadius: 48, // pass within this without touching: bonus
  nearMissPoints: 5,
};

export const SPAWN = {
  intervalStart: 0.85, // seconds between spawns at level 1
  intervalMin: 0.28,
  intervalFactor: 0.92, // per level
  speedFactor: 1.06, // per level
  voidChanceStart: 0.22,
  voidChancePerLevel: 0.02,
  voidChanceCap: 0.45,
  powerUpChance: 0.06,
  shardsPerLevel: 15,
};

export const POWERUP = {
  radius: 13,
  fallSpeed: 80,
  magnetSeconds: 6,
  slowSeconds: 5,
  slowFactor: 0.45, // world time scale while slow is active
  // v2: the cycle now rotates through five kinds — the two new ones are
  // rarer treats that change how a run feels when they land.
  // v2.1: the cycle grows to seven — freeze and starshield join the rotation.
  kinds: ['shield', 'magnet', 'slow', 'nova', 'double', 'freeze', 'starshield'],
};

// v2 — Seeker orbs: void orbs that steer toward the player's lane instead
// of drifting down blindly. They fall slower than plain orbs, but they hunt.
export const SEEKER = {
  radius: 13,
  fallMin: 55,
  fallMax: 95,
  steerAccel: 150, // px/s^2 of horizontal homing toward the player
  steerMaxSpeed: 150, // cap on the horizontal homing speed
  minLevel: 3, // seekers only join the hunt from level 3
  share: 0.38, // share of void spawns that become seekers (level 3+)
};

// v2 — Nova: a power-up that detonates every void orb on screen at once.
export const NOVA = {
  pointsPerOrb: 25, // bonus per orb cleared by the blast
  ringSeconds: 0.9, // how long the shockwave ring expands
  ringMaxRadius: 560,
};

// v2 — Shard Surge: every 5th level the sky rains shards for a few seconds.
export const SURGE = {
  everyLevels: 5,
  durationSeconds: 6,
  interval: 0.16, // spawn interval while the surge is running
  shardChance: 0.85, // most surge spawns are shards, not orbs
  banner: 'SHARD SURGE!',
};

// v2 — Void Maw: every 10th level a huge maw sweeps the top of the arena
// and spits fans of small void orbs. Dodge the sweep, dodge the fans.
export const MAW = {
  everyLevels: 10,
  durationSeconds: 14,
  radius: 46,
  sweepSpeed: 135, // px/s, bounces off the arena walls
  spitInterval: 1.1, // seconds between orb fans
  fanCount: 3, // orbs per fan
  orbSpeed: 165, // downward speed of the spat orbs
  orbRadius: 11,
};

// v2 — Double Score: every point is doubled while the timer runs.
export const DOUBLE = {
  seconds: 8,
  factor: 2,
};

// v2 — Combo milestones: reaching one pops a big celebration floater and a
// bonus. The names get louder as the streak grows.
export const COMBO_MILESTONES = [
  { at: 16, label: 'RAMPAGE!', bonus: 50 },
  { at: 24, label: 'UNSTOPPABLE!', bonus: 75 },
  { at: 32, label: 'LUMEN STORM!', bonus: 100 },
  { at: 48, label: 'SUPERNOVA!', bonus: 150 },
  { at: 64, label: 'LEGENDARY!', bonus: 250 },
];

// v2 — Hit-stop: the world freezes this long when the ship takes a hit,
// so impacts land with weight instead of sliding past.
export const HIT_STOP_SECONDS = 0.07;

export const HEARTS = 3;

export const STORAGE_KEY = 'lumen-drift-best';

// v2.1 — Boss Rush: a separate mode picked from the title screen. One maw
// per round at first, more as the rounds climb; a short breather between
// rounds so the player can reposition; clearing a round pays a bonus that
// grows with the round number. No shards fall in rush mode — the score
// comes from surviving maws, near misses and smashes alone.
export const BOSS_RUSH = {
  breatherSeconds: 2.5, // calm between rounds: no spawns, maw-free sky
  mawsPerRoundBase: 1, // round 1 starts with a single maw
  extraMawEveryRounds: 2, // one more maw every two rounds
  mawsCap: 4, // never more than four maws sweeping at once
  roundBonusBase: 150, // bonus for clearing round 1
  roundBonusPerRound: 100, // extra bonus per round cleared
  mawSpeedPerRound: 0.12, // maw sweep speed grows 12% per round
  spitFasterPerRound: 0.06, // maw spit interval shrinks 6% per round
  mawY: 78, // how low the rush maws hang — lower than classic, closer
};

// v2.1 — Time Freeze: a power-up that stops the world for a few seconds.
// Orbs, shards, seekers and maws hang in the air; the ship still flies
// and can harvest frozen shards. A breather you earn, not a pause.
export const FREEZE = {
  seconds: 3,
};

// v2.1 — Star Shield: three seconds of invulnerability where touching a
// void orb smashes it for points instead of costing a hull heart. Bold
// play pays — dive into the danger while the star burns.
export const STARSHIELD = {
  seconds: 3,
  smashPoints: 40, // points per orb smashed while the star burns
};

// v2.1 — Splitter orbs: teal orbs that punish a dodge. Slip past one and
// it splits into two small, fast children at the bottom edge; touch one
// and it costs a heart like any other orb. The children are quick but
// small, and they never split again.
export const SPLITTER = {
  radius: 16,
  fallMin: 70,
  fallMax: 120,
  childRadius: 9,
  childSpeed: 200, // children drop fast, straight down with a wobble
  childSpread: 46, // horizontal offset of each child from the parent
  minLevel: 2, // splitters join from level 2
  share: 0.22, // share of void spawns that become splitters (level 2+)
};

// v2.1 — Level themes: every five levels the nebula shifts its hue, so a
// long run visibly changes sky. Each theme recolors the gradient, the
// nebulae and the stars; the ship and the threats keep their own colors,
// so the game stays readable in every sky.
export const THEMES = [
  {
    name: 'INDIGO DRIFT',
    bgTop: '#0b0620', bgMid: '#120a33', bgBottom: '#1a0b2e',
    nebulaA: 'rgba(88, 40, 180, 0.20)', nebulaB: 'rgba(20, 140, 180, 0.14)',
    nebulaC: 'rgba(200, 60, 140, 0.10)', star: '#cfe8ff',
  },
  {
    name: 'EMERALD REACH',
    bgTop: '#03180f', bgMid: '#062a1c', bgBottom: '#0a3324',
    nebulaA: 'rgba(16, 185, 129, 0.20)', nebulaB: 'rgba(45, 212, 191, 0.14)',
    nebulaC: 'rgba(250, 204, 21, 0.10)', star: '#d1fae5',
  },
  {
    name: 'CRIMSON VEIL',
    bgTop: '#1c0508', bgMid: '#2e0a12', bgBottom: '#3d0f1c',
    nebulaA: 'rgba(225, 29, 72, 0.20)', nebulaB: 'rgba(249, 115, 22, 0.14)',
    nebulaC: 'rgba(168, 85, 247, 0.10)', star: '#ffe4e6',
  },
  {
    name: 'GOLDEN ABYSS',
    bgTop: '#171104', bgMid: '#2a1d06', bgBottom: '#3a2a08',
    nebulaA: 'rgba(245, 158, 11, 0.20)', nebulaB: 'rgba(217, 119, 6, 0.14)',
    nebulaC: 'rgba(124, 58, 237, 0.10)', star: '#fef3c7',
  },
];

export const THEME_EVERY_LEVELS = 5;

export const RUSH_STORAGE_KEY = 'lumen-drift-best-rush';
