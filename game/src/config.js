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
  kinds: ['shield', 'magnet', 'slow'],
};

export const HEARTS = 3;

export const STORAGE_KEY = 'lumen-drift-best';
