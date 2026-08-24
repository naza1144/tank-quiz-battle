import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { LeaderboardEntry } from '../types.js';
import { soundFx } from '../audio/soundFx.js';
import { Trophy, RotateCcw, Medal, Zap, Skull } from 'lucide-react';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in font-thai">
      <div className="relative w-full max-w-lg bg-slate-900 border-4 border-amber-500 rounded-3xl p-6 shadow-[0_0_60px_rgba(245,158,11,0.5)] text-slate-100 text-center">
        
        {/* Trophy Icon */}
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-tr from-amber-600 to-yellow-300 border-4 border-white shadow-xl mb-4 animate-bounce-short">
          <Trophy className="w-10 h-10 text-slate-950 fill-slate-950" />
        </div>

        {/* Title */}
        <h2 className="text-2xl sm:text-3xl font-extrabold text-amber-400 mb-1">
          การประลองสิ้นสุดลงแล้ว!
        </h2>
        <div className="text-sm text-slate-300 mb-6">
          ผู้ชนะคนสุดท้าย: <strong className="text-yellow-300 font-extrabold text-lg">{winnerName || 'ทุกคนยอดเยี่ยมมาก'}</strong> 🏆
        </div>

        {/* Leaderboard Table */}
        <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-4 mb-6 text-left">
          <div className="text-xs uppercase font-extrabold text-slate-400 mb-3 flex items-center gap-1.5">
            <Medal className="w-4 h-4 text-amber-400" /> ตารางคะแนนสรุปการรบ
          </div>

          <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
            {leaderboard.map((entry, idx) => (
              <div
                key={idx}
                className={`flex items-center justify-between p-2.5 rounded-xl border text-xs sm:text-sm font-bold ${
                  idx === 0
                    ? 'bg-amber-950/60 border-amber-500 text-amber-200'
                    : 'bg-slate-900/60 border-slate-700/60 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="w-6 text-center font-mono text-amber-400 font-extrabold">
                    #{idx + 1}
                  </span>
                  <span>{entry.name}</span>
                </div>

                <div className="flex items-center gap-3 text-xs">
                  <span className="text-rose-400 flex items-center gap-0.5">
                    <Skull className="w-3 h-3" /> {entry.kills}
                  </span>
                  <span className="text-cyan-400 flex items-center gap-0.5">
                    <Zap className="w-3 h-3" /> {entry.correctAnswers} ข้อ
                  </span>
                  <span className="text-yellow-400 font-extrabold">
                    {entry.score} แต้ม
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={onPlayAgain}
          className="w-full py-4 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-extrabold text-base rounded-2xl shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all"
        >
          <RotateCcw className="w-5 h-5" /> กลับไปหน้าล็อบบี้ (PLAY AGAIN)
        </button>

      </div>
    </div>
  );
};
