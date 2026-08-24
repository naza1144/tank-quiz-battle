import React, { useState, useRef, useEffect } from 'react';
import { Direction } from '../types.js';
import { Crosshair, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';
import { PixelCrosshair } from './PixelIcons.js';

interface TouchControlsProps {
  onMove: (dir: Direction | null, isMoving: boolean) => void;
  onShoot: () => void;
}

export const TouchControls: React.FC<TouchControlsProps> = ({ onMove, onShoot }) => {
  const [activeDir, setActiveDir] = useState<Direction | null>(null);
  const padRef = useRef<HTMLDivElement | null>(null);
  const activeDirRef = useRef<Direction | null>(null);

  const updateDirectionFromTouch = (touchX: number, touchY: number) => {
    if (!padRef.current) return;
    const rect = padRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = touchX - centerX;
    const dy = touchY - centerY;
    const dist = Math.hypot(dx, dy);

    // Deadzone check
    if (dist < 15) {
      if (activeDirRef.current !== null) {
        activeDirRef.current = null;
        setActiveDir(null);
        onMove(null, false);
      }
      return;
    }

    let newDir: Direction;
    if (Math.abs(dx) > Math.abs(dy)) {
      newDir = dx > 0 ? 'RIGHT' : 'LEFT';
    } else {
      newDir = dy > 0 ? 'DOWN' : 'UP';
    }

    if (activeDirRef.current !== newDir) {
      activeDirRef.current = newDir;
      setActiveDir(newDir);
      onMove(newDir, true);
      try {
        navigator.vibrate?.(15);
      } catch (e) {
        // ignore vibrate error on non-supporting devices
      }
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    if (touch) {
      updateDirectionFromTouch(touch.clientX, touch.clientY);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    if (touch) {
      updateDirectionFromTouch(touch.clientX, touch.clientY);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    activeDirRef.current = null;
    setActiveDir(null);
    onMove(null, false);
  };

  const handleShootTouch = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    onShoot();
    try {
      navigator.vibrate?.(30);
    } catch (e) {
      // ignore
    }
  };

  return (
    <div className="w-full flex items-center justify-between px-3 sm:px-6 py-1 sm:py-2 select-none touch-none bg-black/80 border-t-2 border-slate-800 backdrop-blur-md rounded-t-xl">
      
      {/* 1. Touch-Slide Virtual D-Pad */}
      <div className="flex flex-col items-center">
        <div
          ref={padRef}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
          className="relative w-32 h-32 sm:w-36 sm:h-36 bg-[#121624] rounded-full border-2 sm:border-4 border-slate-700 shadow-[0_0_20px_rgba(0,0,0,0.8)] flex items-center justify-center cursor-pointer active:border-cyan-400"
        >
          {/* UP Button Visual */}
          <div
            className={`absolute top-1 left-1/2 -translate-x-1/2 w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center border-2 transition-all ${
              activeDir === 'UP'
                ? 'bg-amber-400 text-black border-white shadow-[0_0_15px_#f59e0b]'
                : 'bg-slate-800/90 text-slate-300 border-slate-600'
            }`}
          >
            <ArrowUp className="w-5 h-5 sm:w-6 sm:h-6 stroke-[3]" />
          </div>

          {/* DOWN Button Visual */}
          <div
            className={`absolute bottom-1 left-1/2 -translate-x-1/2 w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center border-2 transition-all ${
              activeDir === 'DOWN'
                ? 'bg-amber-400 text-black border-white shadow-[0_0_15px_#f59e0b]'
                : 'bg-slate-800/90 text-slate-300 border-slate-600'
            }`}
          >
            <ArrowDown className="w-5 h-5 sm:w-6 sm:h-6 stroke-[3]" />
          </div>

          {/* LEFT Button Visual */}
          <div
            className={`absolute left-1 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center border-2 transition-all ${
              activeDir === 'LEFT'
                ? 'bg-amber-400 text-black border-white shadow-[0_0_15px_#f59e0b]'
                : 'bg-slate-800/90 text-slate-300 border-slate-600'
            }`}
          >
            <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6 stroke-[3]" />
          </div>

          {/* RIGHT Button Visual */}
          <div
            className={`absolute right-1 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center border-2 transition-all ${
              activeDir === 'RIGHT'
                ? 'bg-amber-400 text-black border-white shadow-[0_0_15px_#f59e0b]'
                : 'bg-slate-800/90 text-slate-300 border-slate-600'
            }`}
          >
            <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6 stroke-[3]" />
          </div>

          {/* Center Stick */}
          <div className="w-8 h-8 rounded-full bg-slate-900 border-2 border-cyan-500/70 shadow-inner flex items-center justify-center">
            <div className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
          </div>
        </div>

        <span className="text-[8px] sm:text-[9px] font-arcade text-slate-400 mt-0.5">
          🕹️ D-PAD (เลื่อนบังคับ)
        </span>
      </div>

      {/* 2. Tactical FIRE Arcade Button */}
      <div className="flex flex-col items-center gap-1">
        <button
          onTouchStart={handleShootTouch}
          onClick={handleShootTouch}
          className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-rose-500 via-rose-600 to-amber-600 active:scale-90 border-4 border-white shadow-[0_0_25px_rgba(239,68,68,0.6)] flex flex-col items-center justify-center text-white font-arcade text-xs transition-transform active:bg-rose-700 cursor-pointer"
        >
          <Crosshair className="w-7 h-7 sm:w-8 sm:h-8 mb-0.5 drop-shadow stroke-[2.5]" />
          <span className="tracking-widest font-black text-xs sm:text-sm">FIRE!</span>
        </button>

        <span className="text-[8px] sm:text-[9px] font-arcade text-amber-300">
          💥 ปุ่มยิง
        </span>
      </div>

    </div>
  );
};
