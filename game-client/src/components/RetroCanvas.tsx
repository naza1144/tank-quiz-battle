import React, { useEffect, useRef } from 'react';
import { Tank, Bullet, QuizCrate, TileType, Direction, LaserBeamEffect } from '../types.js';
import { soundFx } from '../audio/soundFx.js';

export interface GameStateSnapshot {
  map: TileType[][];
  tanks: Tank[];
  bullets: Bullet[];
  crates: QuizCrate[];
  laserBeams?: LaserBeamEffect[];
  pings?: { id: string; x: number; y: number; senderName: string; timestamp: number }[];
  myTankId: string;
}

interface RetroCanvasProps {
  stateRef: React.RefObject<GameStateSnapshot>;
  isCrtMode?: boolean;
}

interface PixelParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
  type?: 'DUST' | 'SPARK' | 'SMOKE' | 'ICE' | 'BRICK' | 'HEAL';
}

const TILE_SIZE = 32;

export const RetroCanvas: React.FC<RetroCanvasProps> = React.memo(({ stateRef, isCrtMode = true }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const tickRef = useRef<number>(0);
  const shakeRef = useRef<number>(0);
  const particlesRef = useRef<PixelParticle[]>([]);

  const prevTanksHpRef = useRef<Map<string, number>>(new Map());
  const prevBulletsRef = useRef<Map<string, Bullet>>(new Map());

  // Trigger screen shake
  const triggerShake = (intensity: number) => {
    shakeRef.current = Math.max(shakeRef.current, intensity);
  };

  // Spawn pixel particles
  const spawnParticles = (
    x: number, 
    y: number, 
    count: number, 
    colors: string[], 
    type: PixelParticle['type'] = 'SPARK',
    speedMax: number = 3,
    size: number = 3
  ) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * speedMax + 0.5;
      const col = colors[Math.floor(Math.random() * colors.length)];
      const maxL = Math.floor(Math.random() * 14) + 8;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: col,
        size: Math.floor(Math.random() * size) + 2,
        life: maxL,
        maxLife: maxL,
        type
      });
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;

    // Default internal buffer resolution
    canvas.width = 640;
    canvas.height = 640;

    const render = () => {
      tickRef.current += 1;
      const tick = tickRef.current;
      const curState = stateRef.current;
      if (!curState) {
        animationFrameRef.current = requestAnimationFrame(render);
        return;
      }

      const { 
        map: curMap, 
        tanks: curTanks, 
        bullets: curBullets, 
        crates: curCrates, 
        laserBeams: curLaserBeams,
        pings: curPings,
        myTankId: curMyTankId 
      } = curState;

      const gridRows = curMap && curMap.length > 0 ? curMap.length : 28;
      const gridCols = curMap && curMap[0]?.length > 0 ? curMap[0].length : 28;
      const mapW = gridCols * TILE_SIZE;
      const mapH = gridRows * TILE_SIZE;

      if (canvas.width !== mapW) canvas.width = mapW;
      if (canvas.height !== mapH) canvas.height = mapH;

      // ── DETECT COMBAT EVENTS FOR PARTICLES, AUDIO & SCREEN SHAKE ──
      // 1. Mega Laser Beam Trigger Detection
      curLaserBeams?.forEach(beam => {
        const now = Date.now();
        if (now - beam.createdAt < 70) {
          triggerShake(16);
          soundFx.playMegaLaser();
          spawnParticles((beam.x1 + beam.x2) / 2, (beam.y1 + beam.y2) / 2, 20, ['#06b6d4', '#38bdf8', '#fef08a', '#ffffff'], 'SPARK', 5, 4);
        }
      });

      // 2. Tank HP change / Destruction
      curTanks?.forEach(tank => {
        const prevHp = prevTanksHpRef.current.get(tank.id);
        if (prevHp !== undefined && tank.hp < prevHp) {
          // Tank took damage!
          const cx = tank.x + tank.width / 2;
          const cy = tank.y + tank.height / 2;
          if (tank.hp <= 0) {
            // Tank Destroyed Mega Explosion!
            triggerShake(14);
            soundFx.playExplosionDeep();
            spawnParticles(cx, cy, 28, ['#ef4444', '#f97316', '#fde047', '#ffffff', '#78716c'], 'SMOKE', 5, 5);
          } else {
            // Hit spark
            triggerShake(5);
            spawnParticles(cx, cy, 10, ['#fde047', '#ef4444', '#ffffff'], 'SPARK', 3, 3);
          }
        }
        prevTanksHpRef.current.set(tank.id, tank.hp);

        // Tread Dust when moving
        if (tank.isMoving && !tank.isDead && tick % 4 === 0) {
          const tx = tank.x + tank.width / 2;
          const ty = tank.y + tank.height / 2;
          let dustX = tx;
          let dustY = ty;
          if (tank.direction === 'UP') dustY = tank.y + tank.height;
          if (tank.direction === 'DOWN') dustY = tank.y;
          if (tank.direction === 'LEFT') dustX = tank.x + tank.width;
          if (tank.direction === 'RIGHT') dustX = tank.x;
          spawnParticles(dustX + (Math.random() * 8 - 4), dustY + (Math.random() * 8 - 4), 2, ['#475569', '#64748b', '#334155'], 'DUST', 0.8, 2);
        }
      });

      // 2. Bullets Ricochet & Explosions
      curBullets?.forEach(b => {
        const prevB = prevBulletsRef.current.get(b.id);
        if (prevB) {
          // AP Bullet bounced off steel
          if (b.bouncesLeft !== undefined && prevB.bouncesLeft !== undefined && b.bouncesLeft < prevB.bouncesLeft) {
            triggerShake(3);
            soundFx.playRicochet();
            spawnParticles(b.x, b.y, 8, ['#38bdf8', '#0284c7', '#ffffff'], 'SPARK', 4, 3);
          }
        }
        prevBulletsRef.current.set(b.id, { ...b });
      });

      // ── SCREEN SHAKE OFFSET ──
      const curShake = shakeRef.current;
      let shakeX = 0;
      let shakeY = 0;
      if (curShake > 0.1) {
        shakeX = (Math.random() - 0.5) * curShake;
        shakeY = (Math.random() - 0.5) * curShake;
        shakeRef.current *= 0.86;
      } else {
        shakeRef.current = 0;
      }

      ctx.save();
      if (shakeX !== 0 || shakeY !== 0) {
        ctx.translate(shakeX, shakeY);
      }

      // 1. Clear background (Classic black battlefield)
      ctx.fillStyle = '#0a0a0c';
      ctx.fillRect(-20, -20, mapW + 40, mapH + 40);

      // 2. Render Ground & Low Tiles (Ice, Water, Brick, Steel)
      if (curMap && curMap.length > 0) {
        for (let r = 0; r < curMap.length; r++) {
          for (let c = 0; c < curMap[r].length; c++) {
            const tile = curMap[r][c];
            const x = c * TILE_SIZE;
            const y = r * TILE_SIZE;

            if (tile === 'BRICK') {
              drawBrickTile(ctx, x, y);
            } else if (tile === 'STEEL') {
              drawSteelTile(ctx, x, y);
            } else if (tile === 'WATER') {
              drawWaterTile(ctx, x, y, tick);
            } else if (tile === 'ICE') {
              drawIceTile(ctx, x, y);
            }
          }
        }
      }

      // 3. Render Quiz Crates (including Ghost Airdrop)
      curCrates?.forEach((crate) => {
        if (crate.isActive) {
          drawQuizCrate(ctx, crate.x, crate.y, crate.category, tick, !!crate.isGhostAirdrop);
        }
      });

      // 4. Render Bullets (AP, CRYO, EXPLOSIVE, RAPID, HEAL, STD, DUD)
      curBullets?.forEach((bullet) => {
        if (!bullet.isDestroyed) {
          drawBullet(ctx, bullet.x, bullet.y, bullet.specialKind || bullet.shell?.kind);
        }
      });

      // 5. Render Tanks (All visible across the entire 28x28 battlefield)
      curTanks?.forEach((tank) => {
        if (!tank.isDead) {
          drawTank(ctx, tank, tank.id === curMyTankId, tick);
        }
      });

      // 5.5. Render Mega Laser Beams (Above tanks, below high bushes)
      curLaserBeams?.forEach((beam) => {
        const now = Date.now();
        if (now < beam.expiresAt) {
          drawMegaLaserBeam(ctx, beam, tick);
        }
      });

      // 6. Render High Obstacles / Bush over tanks
      if (curMap && curMap.length > 0) {
        for (let r = 0; r < curMap.length; r++) {
          for (let c = 0; c < curMap[r].length; c++) {
            if (curMap[r][c] === 'BUSH') {
              drawBushTile(ctx, c * TILE_SIZE, r * TILE_SIZE);
            }
          }
        }
      }

      // 7. Render 8-Bit Retro Particles
      for (let pIdx = particlesRef.current.length - 1; pIdx >= 0; pIdx--) {
        const p = particlesRef.current[pIdx];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 1;

        if (p.life <= 0) {
          particlesRef.current.splice(pIdx, 1);
          continue;
        }

        const alpha = p.life / p.maxLife;
        ctx.globalAlpha = Math.max(0.1, alpha);
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      }
      ctx.globalAlpha = 1.0;

      ctx.restore();

      animationFrameRef.current = requestAnimationFrame(render);
    };

    animationFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // --- DRAWING PRIMITIVES ---

  const drawBrickTile = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    ctx.fillStyle = '#b91c1c';
    ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
    ctx.fillStyle = '#7f1d1d';
    ctx.fillRect(x, y, TILE_SIZE, 2);
    ctx.fillRect(x, y + 15, TILE_SIZE, 2);
    ctx.fillRect(x + 15, y, 2, 15);
    ctx.fillRect(x + 7, y + 15, 2, 17);
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(x + 2, y + 2, 12, 4);
    ctx.fillRect(x + 18, y + 2, 12, 4);
    ctx.fillRect(x + 10, y + 18, 12, 4);
  };

  const drawSteelTile = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4);
    ctx.fillStyle = '#475569';
    ctx.fillRect(x + 6, y + 6, TILE_SIZE - 12, TILE_SIZE - 12);
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(x + 10, y + 10, TILE_SIZE - 20, TILE_SIZE - 20);
  };

  const drawBushTile = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    ctx.fillStyle = '#15803d';
    ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
    ctx.fillStyle = '#22c55e';
    for (let i = 0; i < 8; i++) {
      const bx = x + ((i * 7) % 24);
      const by = y + ((i * 11) % 24);
      ctx.fillRect(bx, by, 6, 6);
    }
  };

  const drawWaterTile = (ctx: CanvasRenderingContext2D, x: number, y: number, tick: number) => {
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
    ctx.fillStyle = '#38bdf8';
    const offset = (tick % 16);
    ctx.fillRect(x, y + ((offset) % TILE_SIZE), TILE_SIZE, 3);
    ctx.fillRect(x, y + ((offset + 16) % TILE_SIZE), TILE_SIZE, 3);
  };

  const drawIceTile = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    ctx.fillStyle = '#e0f2fe';
    ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
    ctx.fillStyle = '#bae6fd';
    ctx.fillRect(x + 4, y + 4, TILE_SIZE - 8, TILE_SIZE - 8);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x + 8, y + 8, 4, 4);
    ctx.fillRect(x + 20, y + 16, 6, 2);
  };

  const drawQuizCrate = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    category: string,
    tick: number,
    isGhostAirdrop: boolean = false
  ) => {
    const pulse = Math.sin(tick * 0.1) * 2;
    const cy = y + pulse;

    // 1. Crate Box Base
    ctx.fillStyle = isGhostAirdrop ? '#7e22ce' : '#b45309';
    ctx.fillRect(x, cy, 24, 24);
    ctx.fillStyle = isGhostAirdrop ? '#a855f7' : '#f59e0b';
    ctx.fillRect(x + 2, cy + 2, 20, 20);

    // 2. Corner Brackets
    ctx.fillStyle = '#000000';
    ctx.fillRect(x, cy, 4, 4);
    ctx.fillRect(x + 20, cy, 4, 4);
    ctx.fillRect(x, cy + 20, 4, 4);
    ctx.fillRect(x + 20, cy + 20, 4, 4);

    // 3. Question Mark / Star Glow
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(isGhostAirdrop ? '★' : '?', x + 12, cy + 12);

    // 4. Category Label Tag
    if (category) {
      ctx.fillStyle = isGhostAirdrop ? '#c084fc' : '#fde047';
      ctx.font = 'bold 7px "Prompt", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(category.slice(0, 4), x + 12, cy - 4);
    }
  };

  const drawBullet = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    kind?: any
  ) => {
    if (kind === 'AP') {
      // ⚡ Electric Cyan Armor-Piercing Bullet
      ctx.fillStyle = '#0284c7';
      ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(x, y, 2, 0, Math.PI * 2); ctx.fill();
    } else if (kind === 'CRYO') {
      // ❄️ Cryo Ice Frost Bullet
      ctx.fillStyle = '#06b6d4';
      ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#bae6fd';
      ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(x, y, 2, 0, Math.PI * 2); ctx.fill();
    } else if (kind === 'EXPLOSIVE') {
      // 💣 High Explosive Fiery Bullet
      ctx.fillStyle = '#ea580c';
      ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#f97316';
      ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fef08a';
      ctx.beginPath(); ctx.arc(x, y, 2, 0, Math.PI * 2); ctx.fill();
    } else if (kind === 'HEAL') {
      // 💚 Repair Nanobot Cross Bullet
      ctx.fillStyle = '#16a34a';
      ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#4ade80';
      ctx.fillRect(x - 3, y - 1, 6, 2);
      ctx.fillRect(x - 1, y - 3, 2, 6);
    } else if (kind === 'RAPID') {
      // 💥 Rapid Golden Tracer
      ctx.fillStyle = '#eab308';
      ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(x, y, 2, 0, Math.PI * 2); ctx.fill();
    } else if (kind === 'DUD') {
      // Grey Smoke Dud Bullet
      ctx.fillStyle = '#64748b';
      ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill();
    } else {
      // Standard Bright Gold Bullet
      ctx.fillStyle = '#facc15';
      ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(x, y, 2, 0, Math.PI * 2); ctx.fill();
    }
  };

  const drawMegaLaserBeam = (
    ctx: CanvasRenderingContext2D,
    beam: LaserBeamEffect,
    tick: number
  ) => {
    const { x1, y1, x2, y2, width } = beam;
    const pulse = Math.sin(tick * 0.4) * 3;
    const bWidth = Math.max(12, width + pulse);

    ctx.save();

    // 1. Outer Cyan Plasma Glow
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.45)';
    ctx.lineWidth = bWidth + 16;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    // 2. Mid Electric Blue Energy Beam
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = bWidth;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    // 3. Inner White-Hot Laser Core
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(4, bWidth * 0.45);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    // 4. Electric Discharges along the beam
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 2;
    for (let i = 0; i < 6; i++) {
      const t = (i / 5);
      const bx = x1 + (x2 - x1) * t;
      const by = y1 + (y2 - y1) * t;
      const offset = (Math.sin(tick * 0.5 + i) * (bWidth / 2));
      ctx.beginPath();
      if (beam.direction === 'UP' || beam.direction === 'DOWN') {
        ctx.moveTo(bx - offset, by);
        ctx.lineTo(bx + offset, by);
      } else {
        ctx.moveTo(bx, by - offset);
        ctx.lineTo(bx, by + offset);
      }
      ctx.stroke();
    }

    ctx.restore();
  };

  const drawTank = (
    ctx: CanvasRenderingContext2D,
    tank: Tank,
    isMe: boolean,
    tick: number
  ) => {
    const { x, y, width, height, direction, isMoving, color } = tank;
    const now = Date.now();
    const cx = x + width / 2;
    const cy = y + height / 2;

    // 0. Special Ammo Aura (Animated Glowing Aura around Tank Body)
    if (tank.specialAmmo && now <= tank.specialAmmo.expiresAt) {
      const specKind = tank.specialAmmo.kind;
      const pulse = Math.sin(tick * 0.15);
      const auraRadius = 20 + pulse * 2.5;

      ctx.save();
      if (specKind === 'AP') {
        // ⚡ Cyan Electric Aura
        ctx.strokeStyle = `rgba(6, 182, 212, ${0.65 + pulse * 0.3})`;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(cx, cy, auraRadius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = '#67e8f9';
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 4; i++) {
          const angle = tick * 0.1 + (i * Math.PI) / 2;
          const r1 = auraRadius - 2;
          const r2 = auraRadius + 5;
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(angle) * r1, cy + Math.sin(angle) * r1);
          ctx.lineTo(cx + Math.cos(angle) * r2, cy + Math.sin(angle) * r2);
          ctx.stroke();
        }
      } else if (specKind === 'CRYO') {
        // ❄️ Frost Blue Ice Aura
        ctx.strokeStyle = `rgba(56, 189, 248, ${0.65 + pulse * 0.3})`;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(cx, cy, auraRadius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#bae6fd';
        for (let i = 0; i < 4; i++) {
          const a = tick * 0.08 + (i * Math.PI) / 2;
          const fx = cx + Math.cos(a) * (auraRadius + 2);
          const fy = cy + Math.sin(a) * (auraRadius + 2);
          ctx.fillRect(fx - 2, fy - 2, 4, 4);
        }
      } else if (specKind === 'EXPLOSIVE') {
        // 💣 Fiery Orange Flame Aura
        ctx.strokeStyle = `rgba(249, 115, 22, ${0.7 + pulse * 0.3})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(cx, cy, auraRadius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#fef08a';
        for (let i = 0; i < 5; i++) {
          const a = tick * 0.12 + (i * Math.PI * 2) / 5;
          const fx = cx + Math.cos(a) * (auraRadius + 3);
          const fy = cy + Math.sin(a) * (auraRadius + 3);
          ctx.beginPath();
          ctx.arc(fx, fy, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (specKind === 'RAPID') {
        // 💥 Golden Turbo Aura
        ctx.strokeStyle = `rgba(250, 204, 21, ${0.7 + pulse * 0.3})`;
        ctx.lineWidth = 2.5;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.arc(cx, cy, auraRadius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      } else if (specKind === 'HEAL') {
        // 💚 Emerald Green Healing Aura
        ctx.strokeStyle = `rgba(34, 197, 94, ${0.65 + pulse * 0.3})`;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(cx, cy, auraRadius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#86efac';
        for (let i = 0; i < 3; i++) {
          const a = tick * 0.07 + (i * Math.PI * 2) / 3;
          const hx = cx + Math.cos(a) * (auraRadius + 2);
          const hy = cy + Math.sin(a) * (auraRadius + 2);
          ctx.fillRect(hx - 2.5, hy - 1, 5, 2);
          ctx.fillRect(hx - 1, hy - 2.5, 2, 5);
        }
      }
      ctx.restore();
    }

    // 1. Tank Body
    ctx.fillStyle = color || '#eab308';
    ctx.fillRect(x + 4, y + 4, width - 8, height - 8);

    // 2. Tread Tracks (Left/Right or Top/Bottom)
    ctx.fillStyle = '#1e293b';
    const treadAnim = isMoving ? (tick % 4 < 2 ? 0 : 2) : 0;

    if (direction === 'UP' || direction === 'DOWN') {
      ctx.fillRect(x, y, 5, height);
      ctx.fillRect(x + width - 5, y, 5, height);

      ctx.fillStyle = '#64748b';
      for (let ty = 0; ty < height; ty += 6) {
        ctx.fillRect(x, y + ((ty + treadAnim) % height), 5, 2);
        ctx.fillRect(x + width - 5, y + ((ty + treadAnim) % height), 5, 2);
      }
    } else {
      ctx.fillRect(x, y, width, 5);
      ctx.fillRect(x + height - 5, y, width, 5);

      ctx.fillStyle = '#64748b';
      for (let tx = 0; tx < width; tx += 6) {
        ctx.fillRect(x + ((tx + treadAnim) % width), y, 2, 5);
        ctx.fillRect(x + ((tx + treadAnim) % width), y + height - 5, 2, 5);
      }
    }

    // 3. Central Turret
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(x + width / 2, y + height / 2, 6, 0, Math.PI * 2);
    ctx.fill();

    // 4. Cannon Barrel
    ctx.fillStyle = '#334155';
    if (direction === 'UP') {
      ctx.fillRect(cx - 2, cy - 14, 4, 12);
    } else if (direction === 'DOWN') {
      ctx.fillRect(cx - 2, cy + 2, 4, 12);
    } else if (direction === 'LEFT') {
      ctx.fillRect(cx - 14, cy - 2, 12, 4);
    } else if (direction === 'RIGHT') {
      ctx.fillRect(cx + 2, cy - 2, 12, 4);
    }

    // 5. Shield Effect (Pulsing Energy Ring)
    if (now < tank.shieldEndTime) {
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, 18 + Math.sin(tick * 0.2) * 2, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 6. Stunned Effect (Stars)
    if (now < tank.stunEndTime) {
      ctx.fillStyle = '#facc15';
      ctx.font = '10px monospace';
      ctx.fillText('★ ★', cx - 8, y - 10);
    }

    // 7. Tank Overhead HUD (Name, HP Bar, Ammo Badge, Special Ammo Floating Tag)
    const hudY = y - 8;

    // Special Ammo Floating Tag & Remaining Time
    if (tank.specialAmmo && now <= tank.specialAmmo.expiresAt) {
      const remainingSec = ((tank.specialAmmo.expiresAt - now) / 1000).toFixed(1);
      const specLabel = 
        tank.specialAmmo.kind === 'AP' ? `⚡ AP (${remainingSec}s)` :
        tank.specialAmmo.kind === 'CRYO' ? `❄️ CRYO (${remainingSec}s)` :
        tank.specialAmmo.kind === 'EXPLOSIVE' ? `💣 HE (${remainingSec}s)` :
        tank.specialAmmo.kind === 'RAPID' ? `💥 RAPID (${remainingSec}s)` :
        `💚 HEAL (${remainingSec}s)`;

      const badgeColor = 
        tank.specialAmmo.kind === 'AP' ? '#38bdf8' :
        tank.specialAmmo.kind === 'CRYO' ? '#7dd3fc' :
        tank.specialAmmo.kind === 'EXPLOSIVE' ? '#fb923c' :
        tank.specialAmmo.kind === 'RAPID' ? '#fde047' :
        '#4ade80';

      ctx.fillStyle = badgeColor;
      ctx.font = 'bold 8px "Prompt", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(specLabel, cx, hudY - 14);
    }

    ctx.fillStyle = isMe ? '#fde047' : '#ffffff';
    ctx.font = isMe ? 'bold 9px "Prompt", sans-serif' : '8px "Prompt", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${tank.playerName}${isMe ? ' (คุณ)' : ''}`, cx, hudY - 4);

    const hpBarW = 24;
    const hpBarH = 3;
    const hpBarX = cx - hpBarW / 2;
    ctx.fillStyle = '#000000';
    ctx.fillRect(hpBarX, hudY + 4, hpBarW, hpBarH);

    const hpRatio = Math.max(0, tank.hp / tank.maxHp);
    ctx.fillStyle = hpRatio > 0.5 ? '#22c55e' : hpRatio > 0.25 ? '#eab308' : '#ef4444';
    ctx.fillRect(hpBarX, hudY + 4, hpBarW * hpRatio, hpBarH);

    const ammoText = `⚡ ${tank.ammo}/${tank.maxAmmo}`;
    ctx.fillStyle = tank.ammo > 0 ? '#38bdf8' : '#f87171';
    ctx.font = 'bold 8px "Prompt", monospace';
    ctx.fillText(ammoText, cx, hudY + 12);
  };

  return (
    <div className={`relative flex justify-center items-center p-1 sm:p-2 pixel-box bg-[#050508] shadow-2xl w-full max-w-[min(96vw,680px,calc(100vh-220px))] mx-auto aspect-square ${isCrtMode ? 'crt-mode' : ''}`}>
      {/* 8-Bit Arcade Cabinet Corner Rivets */}
      <div className="absolute top-1.5 left-1.5 w-2 h-2 bg-amber-400 border border-black z-30 pointer-events-none opacity-80" />
      <div className="absolute top-1.5 right-1.5 w-2 h-2 bg-amber-400 border border-black z-30 pointer-events-none opacity-80" />
      <div className="absolute bottom-1.5 left-1.5 w-2 h-2 bg-amber-400 border border-black z-30 pointer-events-none opacity-80" />
      <div className="absolute bottom-1.5 right-1.5 w-2 h-2 bg-amber-400 border border-black z-30 pointer-events-none opacity-80" />

      <canvas
        ref={canvasRef}
        className="w-full h-full aspect-square bg-black object-contain cursor-crosshair rounded-sm"
      />
    </div>
  );
});
