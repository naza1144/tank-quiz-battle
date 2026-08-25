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
              drawWaterTile(ctx, x, y);
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

      // 4. Render Bullets (AP, STD, DUD)
      curBullets?.forEach((bullet) => {
        if (!bullet.isDestroyed) {
          drawBullet(ctx, bullet.x, bullet.y, bullet.shell?.kind);
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

  // ── Drawing Helpers ──────────────────────────────

  const drawBrickTile = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    ctx.fillStyle = '#b91c1c';
    ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

    ctx.fillStyle = '#7f1d1d';
    ctx.fillRect(x, y, TILE_SIZE, 2);
    ctx.fillRect(x, y + 16, TILE_SIZE, 2);

    ctx.fillRect(x + 15, y, 2, 16);
    ctx.fillRect(x + 7, y + 16, 2, 16);
    ctx.fillRect(x + 23, y + 16, 2, 16);

    ctx.fillStyle = '#ef4444';
    ctx.fillRect(x + 2, y + 4, 11, 8);
    ctx.fillRect(x + 18, y + 4, 11, 8);
    ctx.fillRect(x + 10, y + 20, 11, 8);
  };

  const drawSteelTile = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4);

    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(x + 4, y + 4, 8, 8);

    ctx.fillStyle = '#475569';
    ctx.fillRect(x + 16, y + 16, 12, 12);
  };

  const drawBushTile = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    ctx.fillStyle = '#15803d';
    ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

    ctx.fillStyle = '#22c55e';
    ctx.fillRect(x + 4, y + 4, 10, 10);
    ctx.fillRect(x + 18, y + 18, 10, 10);
  };

  const drawWaterTile = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(x + 2, y + 8, 12, 4);
    ctx.fillRect(x + 16, y + 20, 12, 4);
  };

  const drawIceTile = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    ctx.fillStyle = '#7dd3fc';
    ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

    ctx.fillStyle = '#bae6fd';
    ctx.fillRect(x + 4, y + 4, 10, 2);
    ctx.fillRect(x + 18, y + 18, 10, 2);
  };

  const drawQuizCrate = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    category: string,
    tick: number,
    isGhostAirdrop: boolean = false
  ) => {
    const floatY = Math.sin(tick * 0.1) * 2;
    const cy = y + floatY;

    if (isGhostAirdrop) {
      // Golden Glowing Airdrop Crate [AP]
      ctx.fillStyle = '#a855f7';
      ctx.fillRect(x - 2, cy - 2, 28, 28);

      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(x, cy, 24, 24);

      ctx.fillStyle = '#fef08a';
      ctx.fillRect(x + 2, cy + 2, 20, 20);

      ctx.fillStyle = '#7e22ce';
      ctx.font = 'bold 10px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('AP', x + 12, cy + 12);

      ctx.font = 'bold 7px "Prompt", sans-serif';
      ctx.fillStyle = '#c084fc';
      ctx.fillText('👻 AIRDROP', x + 12, cy - 6);
    } else {
      // Standard 8-Bit Crate box
      ctx.fillStyle = '#ca8a04';
      ctx.fillRect(x, cy, 24, 24);

      ctx.fillStyle = '#facc15';
      ctx.fillRect(x + 2, cy + 2, 20, 20);

      // Inner Question Mark '?'
      ctx.fillStyle = '#713f12';
      ctx.font = 'bold 14px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('?', x + 12, cy + 13);

      // Category Label Badge
      ctx.font = '7px "Prompt", sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(category.slice(0, 4), x + 12, cy - 4);
    }
  };

  const drawBullet = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    kind?: 'AP' | 'STD' | 'DUD'
  ) => {
    if (kind === 'AP') {
      // Electric Cyan Armor-Piercing Bullet
      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, Math.PI * 2);
      ctx.fill();
    } else if (kind === 'DUD') {
      // Grey Smoke Dud Bullet
      ctx.fillStyle = '#64748b';
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Standard Bright Gold Bullet
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, Math.PI * 2);
      ctx.fill();
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
    const cx = x + width / 2;
    const cy = y + height / 2;

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

    // 7. Tank Overhead HUD (Name, HP Bar, Ammo Badge)
    const hudY = y - 8;

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
