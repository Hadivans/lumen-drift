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
    this.drawBackground(ctx, W, H, time, game.state === STATES.PLAYING ? 1 : 0.35, game.theme);
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
    // v2 — low-hull danger vignette: on the last heart the screen edges
    // pulse red, so the player feels the danger without reading the HUD.
    if (game.state === STATES.PLAYING && game.hearts === 1) {
      const pulse = 0.12 + 0.1 * Math.sin(time * 4);
      const dv = ctx.createRadialGradient(W / 2, H / 2, H * 0.42, W / 2, H / 2, H * 0.95);
      dv.addColorStop(0, 'rgba(255,0,60,0)');
      dv.addColorStop(1, `rgba(255, 0, 60, ${pulse})`);
      ctx.fillStyle = dv;
      ctx.fillRect(-20, -20, W + 40, H + 40);
    }
    ctx.restore();
  }

  // v2.1 — the sky follows the level theme: the gradient, nebulae and
  // stars take their colors from the theme of the current level band,
  // so a long run visibly changes sky every five levels.
  drawBackground(ctx, W, H, time, speed, theme) {
    const t = theme || PALETTE;
    const nebColors = [t.nebulaA, t.nebulaB, t.nebulaC];
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, t.bgTop);
    g.addColorStop(0.55, t.bgMid);
    g.addColorStop(1, t.bgBottom);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    // v2 — the nebulae now breathe: they drift slowly across the sky and
    // pulse, so the background feels alive instead of painted on.
    for (let i = 0; i < this.nebulae.length; i++) {
      const n = this.nebulae[i];
      const driftX = Math.sin(time * 0.05 + i * 2.1) * 26;
      const driftY = Math.cos(time * 0.04 + i * 1.7) * 18;
      const pulse = 0.85 + 0.15 * Math.sin(time * 0.35 + i * 1.3);
      const rg = ctx.createRadialGradient(
        n.x * W + driftX, n.y * H + driftY, 0,
        n.x * W + driftX, n.y * H + driftY, n.r * pulse,
      );
      rg.addColorStop(0, nebColors[i] || n.color);
      rg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = rg;
      ctx.fillRect(0, 0, W, H);
    }
    for (const s of this.stars) {
      const y = (s.y + time * 12 * s.z * speed) % H;
      const a = 0.35 + 0.55 * Math.abs(Math.sin(time * 1.4 + s.tw));
      ctx.globalAlpha = a * s.z;
      ctx.fillStyle = t.star;
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

  // v2 — Seeker orb: a small ember-orange hunter with a bright core and a
  // short wisp trail, so it reads as a different threat from the magenta
  // orbs at a glance.
  drawSeeker(ctx, sk, time) {
    const pulse = 1 + Math.sin(sk.pulse) * 0.14;
    // Wisp trail.
    for (let i = 0; i < sk.wisp.length; i++) {
      const w = sk.wisp[i];
      const f = i / sk.wisp.length;
      ctx.globalAlpha = f * 0.45;
      ctx.fillStyle = PALETTE.seeker;
      ctx.beginPath();
      ctx.arc(w.x, w.y, 2 + f * 5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.save();
    ctx.translate(sk.x, sk.y);
    ctx.shadowColor = PALETTE.seeker;
    ctx.shadowBlur = 16;
    ctx.fillStyle = PALETTE.seeker;
    ctx.beginPath();
    ctx.arc(0, 0, sk.radius * pulse, 0, Math.PI * 2);
    ctx.fill();
    // Spiky rim.
    ctx.strokeStyle = PALETTE.seeker;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + sk.phase * 0.3;
      ctx.moveTo(Math.cos(a) * sk.radius * 0.9, Math.sin(a) * sk.radius * 0.9);
      ctx.lineTo(Math.cos(a) * sk.radius * 1.35, Math.sin(a) * sk.radius * 1.35);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = PALETTE.seekerCore;
    ctx.beginPath();
    ctx.arc(0, 0, sk.radius * 0.42, 0, Math.PI * 2);
    ctx.fill();
    // Angry eye dot tracking the player is implied by the bright core.
    ctx.fillStyle = '#7a2d00';
    ctx.beginPath();
    ctx.arc(0, 0, sk.radius * 0.18, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // v2.1 — Splitter orb: a teal orb with a dashed inner ring, so it
  // reads as a different threat from the magenta orbs and the ember
  // seekers. The dashed ring hints that it is about to come apart.
  drawSplitter(ctx, sp, time) {
    const pulse = 1 + Math.sin(sp.pulse) * 0.1;
    ctx.save();
    ctx.translate(sp.x, sp.y);
    ctx.shadowColor = PALETTE.splitter;
    ctx.shadowBlur = 16;
    ctx.fillStyle = PALETTE.splitter;
    ctx.beginPath();
    ctx.arc(0, 0, sp.radius * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    // Dashed inner ring: the "about to split" tell.
    ctx.strokeStyle = PALETTE.splitterCore;
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.arc(0, 0, sp.radius * 0.62, sp.phase * 0.4, sp.phase * 0.4 + Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = PALETTE.splitterCore;
    ctx.beginPath();
    ctx.arc(0, 0, sp.radius * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // v2.1 — Splitter child: a small, bright teal dart. Smaller and faster
  // than its parent, with a short tail so its speed reads at a glance.
  drawSplitKid(ctx, k, time) {
    ctx.save();
    ctx.translate(k.x, k.y);
    ctx.shadowColor = PALETTE.splitterKid;
    ctx.shadowBlur = 10;
    ctx.fillStyle = PALETTE.splitterKid;
    ctx.beginPath();
    ctx.moveTo(0, -k.radius - 3);
    ctx.lineTo(k.radius * 0.8, k.radius);
    ctx.lineTo(-k.radius * 0.8, k.radius);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, 2.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // v2 — Void Maw: a huge violet maw with a pulsing magenta eye, a ring of
  // teeth, and a jaw that opens and closes as it sweeps the arena.
  drawMaw(ctx, m, time) {
    const open = 0.25 + m.jaw * 0.55; // jaw open amount 0..1
    ctx.save();
    ctx.translate(m.x, m.y);
    ctx.shadowColor = PALETTE.maw;
    ctx.shadowBlur = 30;
    ctx.fillStyle = PALETTE.maw;
    ctx.beginPath();
    ctx.arc(0, 0, m.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    // Teeth ring.
    ctx.fillStyle = '#e9d5ff';
    const teeth = 12;
    for (let i = 0; i < teeth; i++) {
      const a = (i / teeth) * Math.PI * 2 + m.phase * 0.15;
      const r0 = m.radius * 0.82;
      const r1 = m.radius * (0.82 - open * 0.34);
      ctx.beginPath();
      ctx.moveTo(Math.cos(a - 0.09) * r0, Math.sin(a - 0.09) * r0);
      ctx.lineTo(Math.cos(a) * r1, Math.sin(a) * r1);
      ctx.lineTo(Math.cos(a + 0.09) * r0, Math.sin(a + 0.09) * r0);
      ctx.closePath();
      ctx.fill();
    }
    // Dark mouth.
    ctx.fillStyle = PALETTE.mawCore;
    ctx.beginPath();
    ctx.arc(0, 0, m.radius * (0.62 - open * 0.18), 0, Math.PI * 2);
    ctx.fill();
    // The eye.
    const eyePulse = 1 + Math.sin(m.phase * 2) * 0.12;
    ctx.fillStyle = PALETTE.mawEye;
    ctx.shadowColor = PALETTE.mawEye;
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.arc(0, 0, m.radius * 0.3 * eyePulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-m.radius * 0.08, -m.radius * 0.08, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // v2 — Shockwave: the Nova blast's expanding ring, fading as it grows.
  drawShockwave(ctx, w) {
    ctx.save();
    ctx.globalAlpha = w.alpha * 0.9;
    ctx.strokeStyle = w.color;
    ctx.lineWidth = 6 * (1 - w.progress) + 1;
    ctx.shadowColor = w.color;
    ctx.shadowBlur = 22;
    ctx.beginPath();
    ctx.arc(w.x, w.y, Math.max(1, w.radius), 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = w.alpha * 0.35;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(w.x, w.y, Math.max(1, w.radius * 0.82), 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  drawPowerUp(ctx, p, time) {
    const colors = {
      shield: PALETTE.shield, magnet: PALETTE.magnet, slow: PALETTE.slow,
      nova: PALETTE.nova, double: PALETTE.double,
      freeze: PALETTE.freeze, starshield: PALETTE.starshield,
    };
    const letters = { shield: 'S', magnet: 'M', slow: 'T', nova: 'N', double: '2', freeze: 'F', starshield: '★' };
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
    ctx.fillText(letters[p.kind] || '?', 0, 1);
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
    // v2.1 — while the Star Shield burns, a spinning gold star ring
    // circles the ship, so the player knows touching orbs is safe — and
    // profitable — right now.
    if (game.starActive) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(time * 2.4);
      ctx.strokeStyle = PALETTE.starRing;
      ctx.globalAlpha = 0.85;
      ctx.lineWidth = 2.5;
      ctx.shadowColor = PALETTE.starshield;
      ctx.shadowBlur = 14;
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? p.radius + 14 : p.radius + 6;
        const a = (i / 10) * Math.PI * 2;
        const x = Math.cos(a) * r;
        const y = Math.sin(a) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    }
  }

  drawEntities(ctx, game, time) {
    for (const s of game.shards) this.drawShard(ctx, s);
    for (const o of game.orbs) this.drawOrb(ctx, o, time);
    for (const sk of game.seekers) this.drawSeeker(ctx, sk, time);
    for (const sp of game.splitters) this.drawSplitter(ctx, sp, time);
    for (const k of game.splitKids) this.drawSplitKid(ctx, k, time);
    for (const m of game.maws) this.drawMaw(ctx, m, time);
    for (const w of game.shockwaves) this.drawShockwave(ctx, w);
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
    // v2.1 — while Time Freeze burns, the whole arena wears an icy wash
    // with frost crystals creeping in from the corners, so the freeze is
    // visible even before the player notices nothing is moving.
    if (game.frozen) {
      ctx.save();
      ctx.fillStyle = PALETTE.freezeTint;
      ctx.fillRect(0, 0, ARENA.width, ARENA.height);
      ctx.strokeStyle = 'rgba(186, 230, 253, 0.7)';
      ctx.lineWidth = 2;
      const f = Math.sin(time * 5) * 4;
      for (const [cx, cy, sgn] of [[0, 0, 1], [ARENA.width, 0, -1], [0, ARENA.height, 1], [ARENA.width, ARENA.height, -1]]) {
        ctx.beginPath();
        ctx.moveTo(cx + sgn * 26, cy);
        ctx.lineTo(cx, cy + (cy === 0 ? 26 : -26));
        ctx.moveTo(cx + sgn * (16 + f), cy + (cy === 0 ? 8 : -8));
        ctx.lineTo(cx + sgn * 8, cy + (cy === 0 ? 16 + f : -16 - f));
        ctx.stroke();
      }
      ctx.restore();
    }
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
      ey -= 20;
    }
    // v2 — Double Score timer, loud in pink so the player plays bold.
    if (game.doubleActive) {
      const left = Math.max(0, game.doubleUntil - game.time);
      ctx.fillStyle = PALETTE.double;
      ctx.fillText(`×2 SCORE ${left.toFixed(0)}s`, 18, ey);
      ey -= 20;
    }
    // v2.1 — Time Freeze timer, icy blue, counting down the stillness.
    if (game.frozen) {
      const left = Math.max(0, game.freezeUntil - game.time);
      ctx.fillStyle = PALETTE.freeze;
      ctx.fillText(`❄ FREEZE ${left.toFixed(0)}s`, 18, ey);
      ey -= 20;
    }
    // v2.1 — Star Shield timer, gold, counting down the smash window.
    if (game.starActive) {
      const left = Math.max(0, game.starUntil - game.time);
      ctx.fillStyle = PALETTE.starshield;
      ctx.fillText(`★ STAR ${left.toFixed(0)}s — SMASH!`, 18, ey);
      ey -= 20;
    }
    // v2.1 — Boss Rush round, big and red under the level bar, plus the
    // breather countdown so the player knows when the next maw arrives.
    if (game.isRush) {
      ctx.textAlign = 'center';
      ctx.font = 'bold 18px system-ui, sans-serif';
      ctx.fillStyle = PALETTE.rush;
      ctx.shadowColor = PALETTE.rush;
      ctx.shadowBlur = 12;
      const phase = game.rushPhase === 'breather'
        ? ` — NEXT IN ${Math.max(0, game.rushTimer).toFixed(0)}s`
        : '';
      ctx.fillText(`BOSS RUSH — ROUND ${game.rushRound}${phase}`, W / 2, 74);
      ctx.shadowBlur = 0;
      ctx.textAlign = 'left';
    }
    // v2.1 — the current sky theme, small under the level bar in classic
    // mode, so a theme shift is named, not just felt.
    if (!game.isRush && game.level >= 5) {
      ctx.textAlign = 'center';
      ctx.font = 'bold 12px system-ui, sans-serif';
      ctx.fillStyle = PALETTE.hudDim;
      ctx.fillText(game.themeName, W / 2, 74);
      ctx.textAlign = 'left';
    }
    // v2 — Surge banner under the level bar, so the feast is unmissable.
    if (game.surgeActive) {
      ctx.textAlign = 'center';
      ctx.font = 'bold 18px system-ui, sans-serif';
      ctx.fillStyle = PALETTE.surge;
      ctx.shadowColor = PALETTE.surge;
      ctx.shadowBlur = 12;
      ctx.fillText('★ SHARD SURGE ★', W / 2, 74);
      ctx.shadowBlur = 0;
      ctx.textAlign = 'left';
    }
    // v2 — Maw warning at the top-right, so the sweep never surprises.
    if (game.maws.length > 0) {
      ctx.textAlign = 'right';
      ctx.font = 'bold 14px system-ui, sans-serif';
      ctx.fillStyle = PALETTE.mawEye;
      ctx.shadowColor = PALETTE.maw;
      ctx.shadowBlur = 10;
      ctx.fillText('⚠ VOID MAW', W - 20, 88);
      ctx.shadowBlur = 0;
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
    ctx.fillText('◆  Ember Seekers hunt your lane — keep moving, never camp', cx, 348);
    ctx.fillText('◆  Teal Splitters divide when dodged — smash them or dodge twice', cx, 378);
    ctx.fillText('◆  Grab S shield, M magnet, T slow, N nova, 2 double, F freeze, ★ star', cx, 408);
    ctx.fillStyle = PALETTE.hudDim;
    ctx.font = '15px system-ui, sans-serif';
    ctx.fillText('MOUSE or WASD / ARROWS to fly  ·  P pause  ·  M mute', cx, 438);
    if (Math.floor(time * 1.6) % 2 === 0) {
      ctx.font = 'bold 24px system-ui, sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = PALETTE.player;
      ctx.shadowBlur = 16;
      ctx.fillText('— CLICK OR PRESS SPACE TO START —', cx, 486);
      ctx.shadowBlur = 0;
    }
    // v2.1 — Boss Rush, picked with B: a gauntlet of Void Maws, round
    // after round, with its own best score on the line.
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.fillStyle = PALETTE.rush;
    ctx.shadowColor = PALETTE.rush;
    ctx.shadowBlur = 12;
    ctx.fillText('— OR PRESS B FOR BOSS RUSH —', cx, 516);
    ctx.shadowBlur = 0;
    if (game.best > 0 || game.rushBest > 0) {
      ctx.font = 'bold 16px system-ui, sans-serif';
      ctx.fillStyle = PALETTE.gold;
      const parts = [];
      if (game.best > 0) parts.push(`BEST ${game.best}`);
      if (game.rushBest > 0) parts.push(`RUSH BEST ${game.rushBest}`);
      ctx.fillText(parts.join('    ·    '), cx, 552);
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
    const modeLine = game.isRush
      ? `Boss Rush — round ${game.rushRound} reached      Best combo  x${game.bestCombo}`
      : `Shards harvested  ${game.shardsCollected}      Level reached  ${game.level}      Best combo  x${game.bestCombo}`;
    ctx.fillText(modeLine, cx, 330);
    // v2 — run stats: the story of this run, one line, so a good run
    // reads as more than a single number.
    const st = game.stats;
    const bits = [];
    if (st.orbsDodged > 0) bits.push(`${st.orbsDodged} orbs dodged`);
    if (st.seekersDodged > 0) bits.push(`${st.seekersDodged} seekers dodged`);
    if (st.nearMisses > 0) bits.push(`${st.nearMisses} close calls`);
    if (st.novasUsed > 0) bits.push(`${st.novasUsed} nova${st.novasUsed > 1 ? 's' : ''} · ${st.orbsClearedByNova} cleared`);
    if (st.surgesSeen > 0) bits.push(`${st.surgesSeen} surge${st.surgesSeen > 1 ? 's' : ''}`);
    if (st.mawsSeen > 0) bits.push(`${st.mawsSeen} maw${st.mawsSeen > 1 ? 's' : ''} survived`);
    // v2.1 — the new run's story: rush rounds, freezes, star smashes and
    // splitter splits, so a Boss Rush run reads as its own kind of run.
    if (st.rushRoundsCleared > 0) bits.push(`${st.rushRoundsCleared} rush round${st.rushRoundsCleared > 1 ? 's' : ''} cleared`);
    if (st.freezesUsed > 0) bits.push(`${st.freezesUsed} freeze${st.freezesUsed > 1 ? 's' : ''}`);
    if (st.starSmashes > 0) bits.push(`${st.starSmashes} star smash${st.starSmashes > 1 ? 'es' : ''}`);
    if (st.splittersSplit > 0) bits.push(`${st.splittersSplit} splitter${st.splittersSplit > 1 ? 's' : ''} split`);
    if (st.splitKidsDodged > 0) bits.push(`${st.splitKidsDodged} split kids dodged`);
    if (bits.length > 0) {
      ctx.fillStyle = PALETTE.hudDim;
      ctx.font = '14px system-ui, sans-serif';
      ctx.fillText(bits.join('   ·   '), cx, 352);
    }
    // v2.1 — a rush run measures itself against the rush best, not the
    // classic board, so the "new best" call is honest in both modes.
    const shownBest = game.isRush ? game.rushBest : game.best;
    const isBest = game.score > 0 && game.score >= shownBest;
    ctx.fillStyle = PALETTE.gold;
    ctx.font = 'bold 17px system-ui, sans-serif';
    ctx.fillText(isBest ? `★ NEW ${game.isRush ? 'RUSH ' : ''}BEST — ${shownBest} ★` : `Best  ${shownBest}`, cx, 382);
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
