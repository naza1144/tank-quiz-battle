import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { LeaderboardEntry } from '../types.js';
import { soundFx } from '../audio/soundFx.js';
import { RotateCcw } from 'lucide-react';
import { 
  PixelTrophy, 
  PixelMedal, 
  PixelCrown, 
  PixelSwords, 
  PixelBrain, 
  PixelStar 
} from './PixelIcons.js';

interface GameOverModalProps {
  winnerName?: string;
  leaderboard: LeaderboardEntry[];
  onPlayAgain: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  winnerName,
  leaderboard,
  onPlayAgain
}) => {
  useEffect(() => {
    soundFx.playVictory();
    try {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch {
      // ignore
    }
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in font-thai crt-overlay">
      <div className="relative w-full max-w-lg pixel-box bg-[#121624] p-6 text-slate-100 text-center">
        
        {/* Retro Rivet Corners */}
        <div className="absolute top-2 left-2 w-2 h-2 bg-amber-400 border border-black" />
        <div className="absolute top-2 right-2 w-2 h-2 bg-amber-400 border border-black" />
        <div className="absolute bottom-2 left-2 w-2 h-2 bg-amber-400 border border-black" />
        <div className="absolute bottom-2 right-2 w-2 h-2 bg-amber-400 border border-black" />

        {/* 8-bit Victory Trophy */}
        <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-500 border-4 border-black shadow-[4px_4px_0_#000] mb-3 animate-bounce-short">
          <PixelTrophy size={40} color="#000000" />
        </div>

        {/* Arcade Stage Clear Title */}
        <h2 className="font-arcade text-lg sm:text-xl text-amber-400 mb-1 arcade-glow-gold flex items-center justify-center gap-2">
          <PixelStar size={14} color="#fbbf24" />
          <span>STAGE CLEAR</span>
          <PixelStar size={14} color="#fbbf24" />
        </h2>
        <div className="font-arcade text-[10px] text-slate-300 mb-5 flex items-center justify-center gap-1.5">
          <span>WINNER:</span>
          <strong className="text-yellow-300 text-xs">{winnerName || 'ALL PLAYERS'}</strong>
          <PixelCrown size={14} color="#fbbf24" />
        </div>

        {/* Arcade High Score Rankings */}
        <div className="pixel-box bg-black/80 p-3.5 mb-5 text-left">
          <div className="font-arcade text-[9px] uppercase text-amber-400 mb-3 flex items-center justify-between border-b-2 border-slate-800 pb-2">
            <span>RANK & CALLSIGN</span>
            <span>KILLS / QUIZ / PTS</span>
          </div>

          <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
            {leaderboard.map((entry, idx) => {
              const rankNum = (idx + 1) as 1 | 2 | 3;
              
              return (
                <div
                  key={idx}
                  className={`flex items-center justify-between p-2 border-2 text-xs font-bold ${
                    idx === 0
                      ? 'border-amber-400 bg-amber-950/60 text-amber-200 shadow-[2px_2px_0_#f59e0b]'
                      : 'border-slate-800 bg-black/60 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-6 flex items-center justify-center font-arcade text-xs text-amber-400">
                      {idx < 3 ? (
                        <PixelMedal rank={rankNum} size={18} />
                      ) : (
                        `#${idx + 1}`
                      )}
                    </span>
                    <span className="truncate max-w-[140px]">{entry.name}</span>
                  </div>

                  <div className="flex items-center gap-2.5 font-arcade text-[9px]">
                    <span className="text-rose-400 flex items-center gap-1">
                      <PixelSwords size={12} color="#f87171" />
                      <span>{entry.kills}</span>
                    </span>
                    <span className="text-cyan-400 flex items-center gap-1">
                      <PixelBrain size={12} color="#22d3ee" />
                      <span>{entry.correctAnswers}</span>
                    </span>
                    <span className="text-yellow-300 font-extrabold">{entry.score}P</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 3D Tactile Play Again Button */}
        <button
          onClick={() => {
            soundFx.playStart();
            onPlayAgain();
          }}
          className="w-full py-4 arcade-btn arcade-btn-amber font-arcade text-xs tracking-wider flex items-center justify-center gap-2 cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" /> CONTINUE (เล่นอีกครั้ง)
        </button>

      </div>
    </div>
  );
};
