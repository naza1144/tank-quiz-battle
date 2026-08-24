import React, { useState, useEffect } from 'react';
import { QuizQuestion, Tank, TeamQuizVoteUpdate, TeamQuizFinalResult } from '../types.js';
import { soundFx } from '../audio/soundFx.js';
import { Zap, Heart, CheckCircle2, XCircle, Users, Send, Clock, Award, Radio, Shield } from 'lucide-react';

interface SquadSupportViewProps {
  teamId: string;
  teamTank?: Tank;
  playerName: string;
  currentQuestion: QuizQuestion | null;
  quizSessionData?: {
    timeLimitSeconds: number;
    startTime: number;
    endTime: number;
  } | null;
  voteUpdate?: TeamQuizVoteUpdate | null;
  finalResult?: TeamQuizFinalResult | null;
  onVoteQuestion: (choiceIndex: number) => void;
  onSendCheer: (msg: string) => void;
}

export const SquadSupportView: React.FC<SquadSupportViewProps> = ({
  teamId,
  teamTank,
  playerName,
  currentQuestion,
  quizSessionData,
  voteUpdate,
  finalResult,
  onVoteQuestion,
  onSendCheer
}) => {
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);

  // Reset selected choice when question changes
  useEffect(() => {
    setSelectedChoice(null);
  }, [currentQuestion?.id]);

  // Live Countdown Timer with chiptune tick
  useEffect(() => {
    if (!quizSessionData?.endTime) {
      setTimeLeft(0);
      return;
    }

    const interval = setInterval(() => {
      const remainingMs = Math.max(0, quizSessionData.endTime - Date.now());
      const remainingSec = remainingMs / 1000;
      setTimeLeft(remainingSec);

      if (remainingSec <= 1.0 && remainingSec > 0.05) {
        soundFx.playCountdownTick(true);
      }

      if (remainingMs <= 0) {
        clearInterval(interval);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [quizSessionData?.endTime]);

  const handleVote = (idx: number) => {
    if (selectedChoice !== null || finalResult || timeLeft <= 0) return;
    soundFx.playVote();
    setSelectedChoice(idx);
    onVoteQuestion(idx);
  };

  const totalVotes = voteUpdate?.totalVotes || (selectedChoice !== null ? 1 : 0);
  const voteCounts = voteUpdate?.voteCounts || [0, 0, 0, 0];
  const maxTime = quizSessionData?.timeLimitSeconds || 4;
  const progressPercent = Math.max(0, Math.min(100, (timeLeft / maxTime) * 100));

  return (
    <div className="w-full max-w-2xl mx-auto p-4 sm:p-6 pixel-box bg-[#101422] text-slate-100 font-thai crt-overlay">
      
      {/* Top Arcade Tactical Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-slate-800 pb-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-cyan-600 border-2 border-black flex items-center justify-center text-xl shadow-[2px_2px_0_#000]">
            📡
          </div>
          <div>
            <div className="font-arcade text-[9px] text-cyan-400 uppercase tracking-widest flex items-center gap-1.5">
              <span>★</span> SQUAD TACTICAL CONSOLE <span>★</span>
            </div>
            <div className="font-arcade text-xs text-white">
              SUPPORT: <span className="text-amber-300">{playerName}</span>
            </div>
          </div>
        </div>

        {/* Live Tank Stats */}
        {teamTank && (
          <div className="flex items-center gap-2 bg-black border-2 border-slate-700 px-3 py-1.5 font-arcade text-[9px]">
            <span className="text-rose-400">HP: {teamTank.hp}/{teamTank.maxHp}</span>
            <span className="text-slate-600">|</span>
            <span className="text-amber-400">AMMO: {teamTank.ammo}</span>
          </div>
        )}
      </div>

      {/* Driver Info Banner */}
      <div className="p-2.5 mb-4 bg-black border-2 border-slate-800 flex items-center justify-between font-arcade text-[9px]">
        <span className="text-slate-300">
          ▸ DRIVER: <strong className="text-cyan-300">{teamTank?.playerName || 'READY'}</strong>
        </span>
        <span className="text-amber-400">
          SCORE: {teamTank?.score || 0}
        </span>
      </div>

      {/* Main Quiz & Voting Area */}
      {currentQuestion ? (
        <div className="pixel-box bg-[#151a2d] p-4 sm:p-5 mb-4 relative overflow-hidden">
          
          {/* Header with Category & 8-bit Timer */}
          <div className="flex items-center justify-between text-xs font-bold mb-3 font-arcade">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-cyan-950 text-cyan-300 border border-cyan-500 text-[8px]">
                {currentQuestion.categoryTh || currentQuestion.category}
              </span>
              <span className="px-2 py-0.5 bg-amber-950 text-amber-300 border border-amber-500 text-[8px]">
                DIFF: {currentQuestion.difficulty || 'MEDIUM'}
              </span>
            </div>
            
            {/* Live 8-bit Countdown */}
            <div className={`px-2.5 py-0.5 border-2 text-[10px] ${
              timeLeft <= 1.5 
                ? 'bg-rose-950 text-rose-300 border-rose-500 animate-blink' 
                : 'bg-black text-amber-300 border-amber-500'
            }`}>
              ⏱ {timeLeft.toFixed(1)}s
            </div>
          </div>

          {/* Segmented Pixel Countdown Bar */}
          <div className="w-full h-3 bg-black border-2 border-slate-700 p-0.5 mb-4">
            <div
              className={`h-full transition-all duration-75 ${
                timeLeft <= 1.5 ? 'bg-rose-500' : 'bg-gradient-to-r from-cyan-400 to-amber-400'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Question Title */}
          <div className="text-base sm:text-lg font-extrabold text-amber-300 mb-4 text-center leading-relaxed font-thai">
            {currentQuestion.questionTh}
          </div>

          {/* Voting Consensus Header */}
          <div className="flex items-center justify-between font-arcade text-[8px] text-slate-400 mb-2 px-1">
            <span>🗳️ SQUAD VOTES: {totalVotes}</span>
            <span className="text-amber-400">+{currentQuestion.rewardAmmo} AMMO REWARD</span>
          </div>

          {/* Options with Live Voting Percentage Bars */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-4">
            {currentQuestion.options.map((opt, idx) => {
              const letter = ['A', 'B', 'C', 'D'][idx];
              const count = voteCounts[idx] || 0;
              const percent = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
              const isSelected = selectedChoice === idx;

              let btnBorder = 'border-black';
              let btnBg = 'bg-black/70 hover:bg-black/90';

              if (finalResult) {
                if (idx === finalResult.correctIndex) {
                  btnBorder = 'border-emerald-400 bg-emerald-950';
                } else if (idx === finalResult.majorityChoice && !finalResult.isCorrect) {
                  btnBorder = 'border-rose-500 bg-rose-950';
                } else {
                  btnBg = 'bg-black/40 opacity-50';
                }
              } else if (isSelected) {
                btnBorder = 'border-amber-400 bg-amber-950/80 shadow-[2px_2px_0_#f59e0b]';
              }

              return (
                <button
                  key={idx}
                  disabled={selectedChoice !== null || !!finalResult || timeLeft <= 0}
                  onClick={() => handleVote(idx)}
                  className={`relative overflow-hidden p-3 border-2 font-bold text-left transition-all active:scale-98 ${btnBorder} ${btnBg} cursor-pointer`}
                >
                  {/* Live Voting Progress Fill Bar */}
                  <div
                    className="absolute left-0 top-0 bottom-0 bg-cyan-500/25 pointer-events-none transition-all duration-300"
                    style={{ width: `${percent}%` }}
                  />

                  <div className="relative z-10 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`w-6 h-6 flex items-center justify-center font-arcade text-xs border ${
                        isSelected 
                          ? 'bg-amber-400 text-black border-black'
                          : 'bg-black text-cyan-300 border-cyan-600'
                      }`}>
                        {letter}
                      </span>
                      <span className="text-xs font-bold text-slate-100">{opt}</span>
                    </div>

                    <div className="text-right shrink-0 font-arcade text-[9px]">
                      <span className="text-cyan-300">{percent}%</span>
                      <span className="text-slate-500 block text-[7px]">({count})</span>
                    </div>
                  </div>

                  {isSelected && (
                    <div className="relative z-10 mt-1 font-arcade text-[7px] text-amber-300">
                      ★ YOUR VOTE
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Final Result / Majority Banner */}
          {finalResult && (
            <div className={`p-3 border-2 font-thai text-xs flex items-center gap-2.5 animate-fade-in ${
              finalResult.isCorrect 
                ? 'bg-emerald-950 border-emerald-500 text-emerald-200' 
                : 'bg-rose-950 border-rose-500 text-rose-200'
            }`}>
              <span className="text-2xl">{finalResult.isCorrect ? '🎉' : '❌'}</span>
              <div>
                <div className="font-extrabold text-white font-arcade text-[10px]">
                  {finalResult.isCorrect 
                    ? `★ MAJORITY CORRECT! (+${finalResult.rewardAmmo} AMMO DELIVERED) ★` 
                    : '★ MAJORITY WRONG! (NO AMMO) ★'}
                </div>
                <div className="text-slate-300 text-xs mt-0.5">
                  {finalResult.explanationTh}
                </div>
              </div>
            </div>
          )}

        </div>
      ) : (
        <div className="text-center p-6 pixel-box bg-black/60 mb-4">
          <div className="text-3xl mb-2 animate-bounce-short">📡</div>
          <div className="font-arcade text-xs text-amber-400 mb-1">
            RADAR SCANNING FOR CRATES...
          </div>
          <div className="text-xs text-slate-400">
            เมื่อคนขับเก็บกล่อง [?] โหมดโหวตเสียงส่วนมาก (3-5 วินาที) จะเริ่มต้นขึ้นทันที!
          </div>
        </div>
      )}

      {/* Quick 8-bit Tactical Radio Cheering */}
      <div className="flex flex-wrap gap-2 justify-center pt-2">
        <button
          onClick={() => {
            soundFx.playSelect();
            onSendCheer('เติมกระสุนแล้วนะ สู้ๆ! 💥');
          }}
          className="px-3 py-1.5 arcade-btn arcade-btn-slate font-arcade text-[8px] flex items-center gap-1 cursor-pointer"
        >
          <span>💥</span> <span>AMMO SENT!</span>
        </button>
        <button
          onClick={() => {
            soundFx.playSelect();
            onSendCheer('ระวังศัตรูทางซ้าย! 👈');
          }}
          className="px-3 py-1.5 arcade-btn arcade-btn-rose font-arcade text-[8px] flex items-center gap-1 cursor-pointer"
        >
          <span>⚠️</span> <span>ENEMY LEFT!</span>
        </button>
        <button
          onClick={() => {
            soundFx.playSelect();
            onSendCheer('ลุยเลยเพื่อน รอดแน่นอน! 🏆');
          }}
          className="px-3 py-1.5 arcade-btn arcade-btn-amber font-arcade text-[8px] flex items-center gap-1 cursor-pointer"
        >
          <span>👑</span> <span>GO TEAM!</span>
        </button>
      </div>

    </div>
  );
};
