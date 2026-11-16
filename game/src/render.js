// LUMEN DRIFT — everything on screen. Canvas 2D with a neon palette: gradient
// sky, parallax starfield, glowing shards and orbs, a readable HUD, and full
// title / pause / game-over screens. All art is drawn code — no image files.

import { ARENA, PALETTE, PLAYER, POWERUP } from './config.js';
import { STATES } from './game.js';

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.stars = [];
    for (let i = 0; i < 130; i++) {
      this.stars.push({
        x: Math.random() * ARENA.width,
        y: Math.random() * ARENA.height,
        z: 0.25 + Math.random() * 0.75, // depth: nearer stars move faster
        r: 0.5 + Math.random() * 1.4,
        tw: Math.random() * Math.PI * 2,
      });
    }
    this.nebulae = [
      { x: 0.22, y: 0.28, r: 260, color: PALETTE.nebulaA },
      { x: 0.78, y: 0.62, r: 300, color: PALETTE.nebulaB },
      { x: 0.55, y: 0.12, r: 200, color: PALETTE.nebulaC },
    ];
  }

  draw(game, time) {
    const ctx = this.ctx;
    const { width: W, height: H } = ARENA;
    ctx.save();
    if (game.shake > 0.3) {
      ctx.translate((Math.random() - 0.5) * game.shake, (Math.random() - 0.5) * game.shake);
    }
    this.drawBackground(ctx, W, H, time, game.state === STATES.PLAYING ? 1 : 0.35);
    if (game.state === STATES.TITLE) {
      this.drawAmbientShards(ctx, game);
      this.drawTitle(ctx, game, W, H, time);
    } else if (game.state === STATES.OVER) {
      this.drawAmbientShards(ctx, game);
      this.drawEntities(ctx, game, time);
      this.drawGameOver(ctx, game, W, H, time);
    } else {
      this.drawEntities(ctx, game, time);
      this.drawHud(ctx, game, W);
      if (game.state === STATES.PAUSED) this.drawPaused(ctx, W, H);
    }
    if (game.flash > 0) {
      ctx.fillStyle = `rgba(255, 45, 85, ${game.flash * 0.35})`;
      ctx.fillRect(-20, -20, W + 40, H + 40);
    }
    ctx.restore();
  }

  drawBackground(ctx, W, H, time, speed) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, PALETTE.bgTop);
    g.addColorStop(0.55, PALETTE.bgMid);
    g.addColorStop(1, PALETTE.bgBottom);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    for (const n of this.nebulae) {
      const rg = ctx.createRadialGradient(
        n.x * W, n.y * H, 0, n.x * W, n.y * H, n.r,
      );
      rg.addColorStop(0, n.color);
      rg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = rg;
      ctx.fillRect(0, 0, W, H);
    }
    for (const s of this.stars) {
      const y = (s.y + time * 12 * s.z * speed) % H;
      const a = 0.35 + 0.55 * Math.abs(Math.sin(time * 1.4 + s.tw));
      ctx.globalAlpha = a * s.z;
      ctx.fillStyle = PALETTE.star;
      ctx.beginPath();
      ctx.arc(s.x, y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    // Vignette: darkens the edges so the playfield reads at a glance.
    const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.42, W / 2, H / 2, H * 0.95);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(2,0,12,0.55)');
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, W, H);
  }

  drawAmbientShards(ctx, game) {
    for (const s of game.shards) this.drawShard(ctx, s, 0.55);
  }

  drawShard(ctx, s, alpha = 1) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(s.x, s.y);
    ctx.rotate(s.spin);
    ctx.shadowColor = PALETTE.shard;
    ctx.shadowBlur = 14;
    ctx.fillStyle = PALETTE.shard;
    ctx.beginPath();
    ctx.moveTo(0, -11);
    ctx.lineTo(7, 0);
    ctx.lineTo(0, 11);
    ctx.lineTo(-7, 0);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = PALETTE.shardCore;
    ctx.beginPath();
    ctx.moveTo(0, -5);
    ctx.lineTo(3, 0);
    ctx.lineTo(0, 5);
    ctx.lineTo(-3, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  drawOrb(ctx, o, time) {
    const pulse = 1 + Math.sin(o.pulse) * 0.12;
    ctx.save();
    ctx.translate(o.x, o.y);
    ctx.shadowColor = PALETTE.voidOrb;
    ctx.shadowBlur = 18;
    ctx.fillStyle = PALETTE.voidOrb;
    ctx.beginPath();
    const spikes = 9;
    for (let i = 0; i < spikes * 2; i++) {
      const r = (i % 2 === 0 ? o.radius * pulse : o.radius * 0.62) * pulse;
      const a = (i / (spikes * 2)) * Math.PI * 2 + o.phase * 0.2;
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = PALETTE.voidCore;
    ctx.beginPath();
    ctx.arc(0, 0, o.radius * 0.45, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.beginPath();
    ctx.arc(-o.radius * 0.18, -o.radius * 0.2, 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawPowerUp(ctx, p, time) {
    const colors = { shield: PALETTE.shield, magnet: PALETTE.magnet, slow: PALETTE.slow };
    const color = colors[p.kind] || PALETTE.shield;
    const bob = Math.sin(p.phase) * 3;
    ctx.save();
    ctx.translate(p.x, p.y + bob);
    ctx.shadowColor = color;
    ctx.shadowBlur = 16;
    ctx.fillStyle = 'rgba(8, 10, 30, 0.85)';
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, p.radius + 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = color;
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(p.kind === 'shield' ? 'S' : p.kind === 'magnet' ? 'M' : 'T', 0, 1);
    ctx.restore();
  }

  drawPlayer(ctx, game, time) {
    const p = game.player;
    if (p.invulnerable && Math.floor(time * 14) % 2 === 0) return; // blink while invulnerable
    ctx.save();
    // Trail
    for (let i = 0; i < p.trail.length; i++) {
      const t = p.trail[i];
      const f = i / p.trail.length;
      ctx.globalAlpha = f * 0.4;
      ctx.fillStyle = PALETTE.playerTrail;
      ctx.beginPath();
      ctx.arc(t.x, t.y, 3 + f * (p.radius - 4), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);
    ctx.shadowColor = PALETTE.player;
    ctx.shadowBlur = 22;
    ctx.fillStyle = PALETTE.player;
    ctx.beginPath();
    ctx.moveTo(20, 0);
    ctx.lineTo(-12, 11);
    ctx.lineTo(-6, 0);
    ctx.lineTo(-12, -11);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = PALETTE.playerCore;
    ctx.beginPath();
    ctx.arc(2, 0, 5.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    if (p.shield) {
      ctx.save();
      ctx.strokeStyle = PALETTE.shield;
      ctx.globalAlpha = 0.7 + 0.3 * Math.sin(time * 6);
      ctx.lineWidth = 2.5;
      ctx.shadowColor = PALETTE.shield;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius + 10, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  drawEntities(ctx, game, time) {
    for (const s of game.shards) this.drawShard(ctx, s);
    for (const o of game.orbs) this.drawOrb(ctx, o, time);
    for (const pu of game.powerups) this.drawPowerUp(ctx, pu, time);
    for (const pt of game.particles) {
      ctx.globalAlpha = pt.alpha;
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    this.drawPlayer(ctx, game, time);
    for (const f of game.floaters) {
      ctx.globalAlpha = Math.max(0, f.life);
      ctx.font = f.big ? 'bold 34px system-ui, sans-serif' : 'bold 16px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = f.color;
      ctx.shadowBlur = 10;
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y);
      ctx.shadowBlur = 0;
    }
    ctx.globalAlpha = 1;
  }

  drawHud(ctx, game, W) {
    ctx.save();
    ctx.textBaseline = 'alphabetic';
    // Score (top-left, big)
    ctx.textAlign = 'left';
    ctx.font = 'bold 30px system-ui, sans-serif';
    ctx.fillStyle = PALETTE.hudText;
    ctx.shadowColor = 'rgba(125,249,255,0.6)';
    ctx.shadowBlur = 10;
    ctx.fillText(String(game.score).padStart(6, '0'), 18, 40);
    ctx.shadowBlur = 0;
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.fillStyle = PALETTE.hudDim;
    ctx.fillText('SCORE', 20, 58);
    // Combo (under score)
    if (game.combo >= 2) {
      ctx.font = 'bold 20px system-ui, sans-serif';
      ctx.fillStyle = game.multiplier >= 3 ? PALETTE.gold : PALETTE.shard;
      ctx.fillText(`COMBO x${game.multiplier}  (${game.combo})`, 18, 88);
    }
    // Level + progress (top-center)
    ctx.textAlign = 'center';
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.fillStyle = PALETTE.hudText;
    ctx.fillText(`LEVEL ${game.level}`, W / 2, 30);
    const barW = 180;
    const barX = W / 2 - barW / 2;
    ctx.fillStyle = 'rgba(255,255,255,0.14)';
    ctx.fillRect(barX, 38, barW, 7);
    ctx.fillStyle = PALETTE.gold;
    ctx.fillRect(barX, 38, barW * Math.min(1, game.levelProgress), 7);
    // Hearts (top-right)
    ctx.textAlign = 'right';
    for (let i = 0; i < 3; i++) {
      const x = W - 26 - i * 30;
      const y = 30;
      ctx.font = '22px system-ui, sans-serif';
      ctx.fillStyle = i < game.hearts ? '#ff5c7a' : 'rgba(255,255,255,0.18)';
      ctx.fillText('♥', x, y);
    }
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.fillStyle = PALETTE.hudDim;
    ctx.fillText('HULL', W - 20, 58);
    // Active effects (bottom-left)
    let ey = ARENA.height - 18;
    ctx.textAlign = 'left';
    ctx.font = 'bold 13px system-ui, sans-serif';
    if (game.player.shield) {
      ctx.fillStyle = PALETTE.shield;
      ctx.fillText('◈ SHIELD', 18, ey);
      ey -= 20;
    }
    if (game.player.magnetActive) {
      const left = Math.max(0, game.player.magnetUntil - game.time);
      ctx.fillStyle = PALETTE.magnet;
      ctx.fillText(`◎ MAGNET ${left.toFixed(0)}s`, 18, ey);
      ey -= 20;
    }
    if (game.time < game.slowUntil) {
      const left = Math.max(0, game.slowUntil - game.time);
      ctx.fillStyle = PALETTE.slow;
      ctx.fillText(`◔ SLOW ${left.toFixed(0)}s`, 18, ey);
    }
    // Best (bottom-right)
    ctx.textAlign = 'right';
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.fillStyle = PALETTE.hudDim;
    ctx.fillText(`BEST ${game.best}`, W - 18, ARENA.height - 18);
    ctx.restore();
  }

  panel(ctx, x, y, w, h) {
    ctx.save();
    ctx.fillStyle = 'rgba(6, 4, 24, 0.72)';
    ctx.strokeStyle = 'rgba(125, 249, 255, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 18);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  drawTitle(ctx, game, W, H, time) {
    const cx = W / 2;
    const glow = 0.75 + 0.25 * Math.sin(time * 2.2);
    ctx.save();
    ctx.textAlign = 'center';
    ctx.shadowColor = PALETTE.player;
    ctx.shadowBlur = 34 * glow;
    ctx.fillStyle = '#aef7ff';
    ctx.font = 'bold 74px system-ui, sans-serif';
    ctx.fillText('LUMEN DRIFT', cx, 168);
    ctx.shadowBlur = 0;
    ctx.font = 'bold 19px system-ui, sans-serif';
    ctx.fillStyle = PALETTE.gold;
    ctx.fillText('HARVEST THE LIGHT  ·  DODGE THE VOID', cx, 206);
    this.panel(ctx, cx - 300, 250, 600, 168);
    ctx.fillStyle = PALETTE.hudText;
    ctx.font = '17px system-ui, sans-serif';
    ctx.fillText('◆  Fly through golden shards to score — chain them for combos', cx, 288);
    ctx.fillText('◆  Spiky void orbs cost a hull heart — 3 hits and the drift ends', cx, 318);
    ctx.fillText('◆  Grab S (shield), M (magnet), T (slow time) power-ups', cx, 348);
    ctx.fillStyle = PALETTE.hudDim;
    ctx.font = '15px system-ui, sans-serif';
    ctx.fillText('MOUSE or WASD / ARROWS to fly  ·  P pause  ·  M mute', cx, 388);
    if (Math.floor(time * 1.6) % 2 === 0) {
      ctx.font = 'bold 24px system-ui, sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = PALETTE.player;
      ctx.shadowBlur = 16;
      ctx.fillText('— CLICK OR PRESS SPACE TO START —', cx, 472);
      ctx.shadowBlur = 0;
    }
    if (game.best > 0) {
      ctx.font = 'bold 16px system-ui, sans-serif';
      ctx.fillStyle = PALETTE.gold;
      ctx.fillText(`BEST SCORE  ${game.best}`, cx, 522);
    }
    ctx.restore();
  }

  drawPaused(ctx, W, H) {
    ctx.save();
    ctx.fillStyle = 'rgba(4, 2, 16, 0.6)';
    ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.hudText;
    ctx.font = 'bold 44px system-ui, sans-serif';
    ctx.shadowColor = PALETTE.player;
    ctx.shadowBlur = 18;
    ctx.fillText('PAUSED', W / 2, H / 2 - 8);
    ctx.shadowBlur = 0;
    ctx.font = '17px system-ui, sans-serif';
    ctx.fillStyle = PALETTE.hudDim;
    ctx.fillText('Press P or click to resume', W / 2, H / 2 + 30);
    ctx.restore();
  }

  drawGameOver(ctx, game, W, H, time) {
    ctx.save();
    ctx.fillStyle = 'rgba(4, 2, 16, 0.62)';
    ctx.fillRect(0, 0, W, H);
    const cx = W / 2;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ff5c7a';
    ctx.shadowColor = PALETTE.voidOrb;
    ctx.shadowBlur = 22;
    ctx.font = 'bold 52px system-ui, sans-serif';
    ctx.fillText('THE DRIFT ENDS', cx, 150);
    ctx.shadowBlur = 0;
    this.panel(ctx, cx - 240, 190, 480, 210);
    ctx.fillStyle = PALETTE.hudDim;
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.fillText('FINAL SCORE', cx, 224);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 56px system-ui, sans-serif';
    ctx.shadowColor = PALETTE.gold;
    ctx.shadowBlur = 16;
    ctx.fillText(String(game.score), cx, 288);
    ctx.shadowBlur = 0;
    ctx.fillStyle = PALETTE.hudText;
    ctx.font = '17px system-ui, sans-serif';
    ctx.fillText(`Shards harvested  ${game.shardsCollected}      Level reached  ${game.level}      Best combo  x${game.bestCombo}`, cx, 330);
    const isBest = game.score > 0 && game.score >= game.best;
    ctx.fillStyle = PALETTE.gold;
    ctx.font = 'bold 17px system-ui, sans-serif';
    ctx.fillText(isBest ? `★ NEW BEST — ${game.best} ★` : `Best  ${game.best}`, cx, 366);
    if (Math.floor(time * 1.6) % 2 === 0) {
      ctx.font = 'bold 22px system-ui, sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = PALETTE.player;
      ctx.shadowBlur = 14;
      ctx.fillText('— CLICK OR PRESS SPACE TO FLY AGAIN —', cx, 452);
      ctx.shadowBlur = 0;
    }
    ctx.restore();
  }
}
