import React from 'react';
import { Direction } from '../types.js';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Crosshair } from 'lucide-react';

interface TouchControlsProps {
  onMove: (dir: Direction | null, isMoving: boolean) => void;
  onShoot: () => void;
}

export const TouchControls: React.FC<TouchControlsProps> = ({ onMove, onShoot }) => {
  return (
    <div className="w-full flex items-center justify-between px-4 py-2 select-none touch-none">
      
      {/* Virtual D-Pad */}
      <div className="relative w-36 h-36 bg-slate-900/80 rounded-full border-2 border-slate-700 p-2 flex items-center justify-center shadow-lg">
        {/* UP */}
        <button
          onTouchStart={() => onMove('UP', true)}
          onTouchEnd={() => onMove(null, false)}
          onMouseDown={() => onMove('UP', true)}
          onMouseUp={() => onMove(null, false)}
          className="absolute top-1 left-1/2 -translate-x-1/2 w-11 h-11 bg-slate-800 active:bg-amber-500 rounded-xl flex items-center justify-center text-slate-200 active:text-black border border-slate-600 transition-all shadow"
        >
          <ArrowUp className="w-5 h-5" />
        </button>

        {/* DOWN */}
        <button
          onTouchStart={() => onMove('DOWN', true)}
          onTouchEnd={() => onMove(null, false)}
          onMouseDown={() => onMove('DOWN', true)}
          onMouseUp={() => onMove(null, false)}
          className="absolute bottom-1 left-1/2 -translate-x-1/2 w-11 h-11 bg-slate-800 active:bg-amber-500 rounded-xl flex items-center justify-center text-slate-200 active:text-black border border-slate-600 transition-all shadow"
        >
          <ArrowDown className="w-5 h-5" />
        </button>

        {/* LEFT */}
        <button
          onTouchStart={() => onMove('LEFT', true)}
          onTouchEnd={() => onMove(null, false)}
          onMouseDown={() => onMove('LEFT', true)}
          onMouseUp={() => onMove(null, false)}
          className="absolute left-1 top-1/2 -translate-y-1/2 w-11 h-11 bg-slate-800 active:bg-amber-500 rounded-xl flex items-center justify-center text-slate-200 active:text-black border border-slate-600 transition-all shadow"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        {/* RIGHT */}
        <button
          onTouchStart={() => onMove('RIGHT', true)}
          onTouchEnd={() => onMove(null, false)}
          onMouseDown={() => onMove('RIGHT', true)}
          onMouseUp={() => onMove(null, false)}
          className="absolute right-1 top-1/2 -translate-y-1/2 w-11 h-11 bg-slate-800 active:bg-amber-500 rounded-xl flex items-center justify-center text-slate-200 active:text-black border border-slate-600 transition-all shadow"
        >
          <ArrowRight className="w-5 h-5" />
        </button>

        {/* Center Pad */}
        <div className="w-7 h-7 rounded-full bg-slate-700/50 border border-slate-600" />
      </div>

      {/* Shoot Button */}
      <div className="flex flex-col items-center gap-2">
        <button
          onTouchStart={onShoot}
          onClick={onShoot}
          className="w-20 h-20 rounded-full bg-gradient-to-tr from-rose-600 to-amber-500 active:scale-90 border-4 border-white/80 shadow-[0_0_25px_rgba(239,68,68,0.5)] flex flex-col items-center justify-center text-white font-extrabold text-xs transition-transform"
        >
          <Crosshair className="w-7 h-7 mb-0.5" />
          <span>FIRE</span>
        </button>
        <span className="text-[10px] text-slate-400 font-mono">SPACE / ปุ่มยิง</span>
      </div>

    </div>
  );
};
