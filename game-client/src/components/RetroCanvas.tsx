import React, { useEffect, useRef } from 'react';
import { Tank, Bullet, QuizCrate, TileType, Direction } from '../types.js';

interface RetroCanvasProps {
  map: TileType[][];
  tanks: Tank[];
  bullets: Bullet[];
  crates: QuizCrate[];
  myTankId?: string;
}

const TILE_SIZE = 32;

export const RetroCanvas: React.FC<RetroCanvasProps> = ({
  map,
  tanks,
  bullets,
  crates,
  myTankId
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const tickRef = useRef<number>(0);

  // Keep latest props in ref so continuous rAF loop never tears down
  const stateRef = useRef({ map, tanks, bullets, crates, myTankId });
  stateRef.current = { map, tanks, bullets, crates, myTankId };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;

    const render = () => {
      tickRef.current += 1;
      const tick = tickRef.current;
      const { 
        map: curMap, 
        tanks: curTanks, 
        bullets: curBullets, 
        crates: curCrates, 
        myTankId: curMyTankId 
      } = stateRef.current;

      const gridRows = curMap && curMap.length > 0 ? curMap.length : 28;
      const gridCols = curMap && curMap[0]?.length > 0 ? curMap[0].length : 28;
      const mapW = gridCols * TILE_SIZE;
      const mapH = gridRows * TILE_SIZE;

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

      // 3. Render Quiz Crates
      curCrates.forEach((crate) => {
        if (crate.isActive) {
          drawQuizCrate(ctx, crate.x, crate.y, crate.category, tick);
        }
      });

      // 4. Render Bullets
      curBullets.forEach((bullet) => {
        if (!bullet.isDestroyed) {
          drawBullet(ctx, bullet.x, bullet.y, bullet.vx, bullet.vy);
        }
      });

      // 5. Render Tanks
      curTanks.forEach((tank) => {
        if (!tank.isDead) {
          const isMe = tank.id === curMyTankId;
          drawTank(ctx, tank, isMe, tick);
        }
      });

      // 6. Render High Tiles (Bushes) - bushes cover tanks inside them!
      if (curMap && curMap.length > 0) {
        for (let r = 0; r < curMap.length; r++) {
          for (let c = 0; c < curMap[r].length; c++) {
            if (curMap[r][c] === 'BUSH') {
              drawBushTile(ctx, c * TILE_SIZE, r * TILE_SIZE, tick);
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
    // Red-brown base
    ctx.fillStyle = '#b43a12';
    ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

    // Brick mortar lines
    ctx.fillStyle = '#1c1917';
    ctx.fillRect(x, y + 7, TILE_SIZE, 2);
    ctx.fillRect(x, y + 15, TILE_SIZE, 2);
    ctx.fillRect(x, y + 23, TILE_SIZE, 2);
    ctx.fillRect(x, y + 31, TILE_SIZE, 1);

    ctx.fillRect(x + 15, y, 2, 7);
    ctx.fillRect(x + 7, y + 8, 2, 7);
    ctx.fillRect(x + 23, y + 8, 2, 7);
    ctx.fillRect(x + 15, y + 16, 2, 7);
    ctx.fillRect(x + 7, y + 24, 2, 7);
    ctx.fillRect(x + 23, y + 24, 2, 7);

    // Brick highlights
    ctx.fillStyle = '#ea580c';
    ctx.fillRect(x + 1, y + 1, 13, 2);
    ctx.fillRect(x + 17, y + 1, 13, 2);
    ctx.fillRect(x + 1, y + 9, 5, 2);
    ctx.fillRect(x + 9, y + 9, 13, 2);
  };

  const drawSteelTile = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    // Silver metal block with 4 plates
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

    // Dark grooves
    ctx.fillStyle = '#334155';
    ctx.fillRect(x + 15, y, 2, TILE_SIZE);
    ctx.fillRect(x, y + 15, TILE_SIZE, 2);

    // White highlights
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(x + 1, y + 1, 13, 2);
    ctx.fillRect(x + 1, y + 1, 2, 13);
    ctx.fillRect(x + 17, y + 1, 13, 2);
    ctx.fillRect(x + 17, y + 1, 2, 13);
    ctx.fillRect(x + 1, y + 17, 13, 2);
    ctx.fillRect(x + 1, y + 17, 2, 13);
    ctx.fillRect(x + 17, y + 17, 13, 2);
    ctx.fillRect(x + 17, y + 17, 2, 13);
  };

  const drawBushTile = (ctx: CanvasRenderingContext2D, x: number, y: number, tick: number) => {
    ctx.fillStyle = '#15803d';
    ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

    // Foliage pattern
    ctx.fillStyle = '#22c55e';
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        if ((i + j + (tick >> 4)) % 2 === 0) {
          ctx.fillRect(x + i * 8 + 1, y + j * 8 + 1, 6, 6);
        }
      }
    }
    ctx.fillStyle = '#14532d';
    ctx.fillRect(x + 4, y + 4, 3, 3);
    ctx.fillRect(x + 20, y + 12, 3, 3);
    ctx.fillRect(x + 12, y + 20, 3, 3);
  };

  const drawWaterTile = (ctx: CanvasRenderingContext2D, x: number, y: number, tick: number) => {
    ctx.fillStyle = '#0369a1';
    ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

    // Moving water waves
    ctx.fillStyle = '#38bdf8';
    const offset = Math.floor((tick / 6) % 8);
    for (let r = 0; r < 4; r++) {
      const wx = (x + (r * 4) + offset) % TILE_SIZE;
      ctx.fillRect(x + wx, y + r * 8 + 2, 8, 2);
    }
  };

  const drawIceTile = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    ctx.fillStyle = '#e0f2fe';
    ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

    // Shiny diagonals
    ctx.fillStyle = '#bae6fd';
    ctx.fillRect(x + 4, y + 4, 10, 2);
    ctx.fillRect(x + 18, y + 18, 10, 2);
  };

  const drawQuizCrate = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    category: string,
    tick: number
  ) => {
    const floatY = Math.sin(tick * 0.1) * 3;
    const cy = y + floatY;

    // Glowing aura
    ctx.shadowColor = '#eab308';
    ctx.shadowBlur = 10;

    // Crate box (Golden question box)
    ctx.fillStyle = '#ca8a04';
    ctx.fillRect(x, cy, 24, 24);

    ctx.fillStyle = '#facc15';
    ctx.fillRect(x + 2, cy + 2, 20, 20);

    ctx.shadowBlur = 0;

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
  };

  const drawBullet = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    vx: number,
    vy: number
  ) => {
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();

    // Hot bullet core
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x, y, 2, 0, Math.PI * 2);
    ctx.fill();
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
      // Left tread
      ctx.fillRect(x, y, 5, height);
      // Right tread
      ctx.fillRect(x + width - 5, y, 5, height);

      // Tread notches
      ctx.fillStyle = '#64748b';
      for (let ty = 0; ty < height; ty += 6) {
        ctx.fillRect(x, y + ((ty + treadAnim) % height), 5, 2);
        ctx.fillRect(x + width - 5, y + ((ty + treadAnim) % height), 5, 2);
      }
    } else {
      // Top tread
      ctx.fillRect(x, y, width, 5);
      // Bottom tread
      ctx.fillRect(x, y + height - 5, width, 5);

      // Tread notches
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

    // Player Name
    ctx.fillStyle = isMe ? '#fde047' : '#ffffff';
    ctx.font = isMe ? 'bold 9px "Prompt", sans-serif' : '8px "Prompt", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${tank.playerName}${isMe ? ' (คุณ)' : ''}`, cx, hudY - 4);

    // HP Bar
    const hpBarW = 28;
    const hpBarH = 4;
    ctx.fillStyle = '#334155';
    ctx.fillRect(cx - hpBarW / 2, hudY, hpBarW, hpBarH);

    const hpPercent = Math.max(0, tank.hp / tank.maxHp);
    ctx.fillStyle = hpPercent > 0.5 ? '#22c55e' : (hpPercent > 0.25 ? '#eab308' : '#ef4444');
    ctx.fillRect(cx - hpBarW / 2, hudY, hpBarW * hpPercent, hpBarH);

    // Ammo Indicator (Dots or Number)
    const ammoText = `⚡ ${tank.ammo}/${tank.maxAmmo}`;
    ctx.fillStyle = tank.ammo > 0 ? '#38bdf8' : '#f87171';
    ctx.font = 'bold 8px "Prompt", monospace';
    ctx.fillText(ammoText, cx, hudY + 12);
  };

  const canvasW = (map && map[0]?.length ? map[0].length : 20) * TILE_SIZE;
  const canvasH = (map && map.length ? map.length : 20) * TILE_SIZE;

  return (
    <div className="relative flex justify-center items-center p-1 sm:p-2.5 pixel-box bg-black shadow-2xl w-full max-w-[min(96vw,700px,68vh)] mx-auto aspect-square">
      <canvas
        ref={canvasRef}
        width={canvasW}
        height={canvasH}
        className="w-full h-full aspect-square bg-black object-contain cursor-crosshair rounded-sm"
      />
    </div>
  );
};
