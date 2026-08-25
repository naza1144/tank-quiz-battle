import React, { useEffect, useRef } from 'react';
import { Tank, Bullet, QuizCrate, TileType, Direction } from '../types.js';

export interface GameStateSnapshot {
  map: TileType[][];
  tanks: Tank[];
  bullets: Bullet[];
  crates: QuizCrate[];
  pings?: { id: string; x: number; y: number; senderName: string; timestamp: number }[];
  myTankId: string;
}

interface RetroCanvasProps {
  stateRef: React.RefObject<GameStateSnapshot>;
}

const TILE_SIZE = 32;

export const RetroCanvas: React.FC<RetroCanvasProps> = React.memo(({ stateRef }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const tickRef = useRef<number>(0);

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
        pings: curPings,
        myTankId: curMyTankId 
      } = curState;

      const gridRows = curMap && curMap.length > 0 ? curMap.length : 20;
      const gridCols = curMap && curMap[0]?.length > 0 ? curMap[0].length : 20;
      const mapW = gridCols * TILE_SIZE;
      const mapH = gridRows * TILE_SIZE;

      if (canvas.width !== mapW) canvas.width = mapW;
      if (canvas.height !== mapH) canvas.height = mapH;

      // 1. Clear background (Classic black battlefield)
      ctx.fillStyle = '#0a0a0c';
      ctx.fillRect(0, 0, mapW, mapH);

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
    <div className="relative flex justify-center items-center p-1 sm:p-2 pixel-box bg-black shadow-2xl w-full max-w-[min(96vw,680px,calc(100vh-220px))] mx-auto aspect-square">
      <canvas
        ref={canvasRef}
        className="w-full h-full aspect-square bg-black object-contain cursor-crosshair rounded-sm"
      />
    </div>
  );
});
