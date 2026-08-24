import React, { useState, useEffect } from 'react';
import { QuizQuestion, Tank, TeamQuizVoteUpdate, TeamQuizFinalResult } from '../types.js';
import { soundFx } from '../audio/soundFx.js';
import { 
  PixelBrain, 
  PixelHeart, 
  PixelAmmo, 
  PixelClock, 
  PixelStar, 
  PixelCheck, 
  PixelCross, 
  PixelRadar, 
  PixelCrate, 
  PixelExplosion, 
  PixelTrophy, 
  PixelShield 
} from './PixelIcons.js';

interface SquadSupportViewProps {
  teamId?: string;
  myTeamId?: string;
  teamTank?: Tank;
  playerName?: string;
  currentQuestion: QuizQuestion | null;
  quizSession?: {
    durationSeconds?: number;
    expireAt?: number;
    timeLimitSeconds?: number;
    startTime?: number;
    endTime?: number;
  } | null;
  quizSessionData?: {
    timeLimitSeconds: number;
    startTime: number;
    endTime: number;
  } | null;
  voteUpdate?: TeamQuizVoteUpdate | null;
  finalResult?: TeamQuizFinalResult | null;
  onVote?: (choiceIndex: number) => void;
  onVoteQuestion?: (choiceIndex: number) => void;
  onSendCheer: (msg: string) => void;
}

export const SquadSupportView: React.FC<SquadSupportViewProps> = ({
  myTeamId,
  teamTank,
  playerName,
  currentQuestion,
  quizSession,
  quizSessionData,
  voteUpdate,
  finalResult,
  onVote,
  onVoteQuestion,
  onSendCheer
}) => {
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(12);
  const [duration, setDuration] = useState<number>(12);

  const endTimeRef = React.useRef<number>(0);
  const durationRef = React.useRef<number>(12);

  // When a new question arrives, lock in endTime and duration ONCE (immune to 30fps game_tick re-renders!)
  useEffect(() => {
    if (currentQuestion) {
      setSelectedChoice(null);
      
      const dur = 
        quizSession?.timeLimitSeconds || 
        quizSession?.durationSeconds || 
        quizSessionData?.timeLimitSeconds || 
        currentQuestion.timeLimitSeconds || 
        12;

      const end = 
        quizSession?.endTime || 
        quizSession?.expireAt || 
        quizSessionData?.endTime || 
        (Date.now() + dur * 1000);

      endTimeRef.current = end;
      durationRef.current = dur;
      setDuration(dur);

      const initialRemaining = Math.max(0, (end - Date.now()) / 1000);
      setTimeLeft(initialRemaining);
    }
  }, [currentQuestion?.id, quizSession?.startTime, quizSession?.endTime]);

  // Smooth High-Precision Countdown Loop (100ms interval)
  useEffect(() => {
    if (!currentQuestion || endTimeRef.current <= 0) return;

    let lastTickSecond = -1;

    const interval = setInterval(() => {
      const remainingMs = endTimeRef.current - Date.now();
      const remainingSec = Math.max(0, remainingMs / 1000);
      setTimeLeft(remainingSec);

      // Play tick sound when 3 seconds remaining
      const currentIntSec = Math.ceil(remainingSec);
      if (currentIntSec > 0 && currentIntSec <= 3 && currentIntSec !== lastTickSecond) {
        lastTickSecond = currentIntSec;
        soundFx.playCountdownTick();
      }

      if (remainingSec <= 0) {
        clearInterval(interval);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [currentQuestion?.id, quizSession?.startTime, quizSession?.endTime]);

  const handleVote = (index: number) => {
    if (selectedChoice !== null || finalResult || timeLeft <= 0) return;
    soundFx.playVote();
    setSelectedChoice(index);
    if (onVote) onVote(index);
    if (onVoteQuestion) onVoteQuestion(index);
  };

  const voteCounts = voteUpdate?.voteCounts || [0, 0, 0, 0];
  const totalVotes = voteUpdate?.totalVotes || 0;
  const progressPercent = duration > 0 ? Math.max(0, Math.min(100, (timeLeft / duration) * 100)) : 0;

  return (
    <div className="w-full max-w-4xl mx-auto p-3 sm:p-4 font-thai text-slate-100">
      
      {/* Top Tactical Command Uplink Header */}
      <div className="pixel-box bg-[#121624] p-3 sm:p-4 mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-cyan-600 border-2 border-black flex items-center justify-center shadow-[2px_2px_0_#000]">
            <PixelBrain size={24} color="#000000" />
          </div>
          <div>
            <div className="font-arcade text-[9px] text-cyan-400 flex items-center gap-1.5">
              <PixelStar size={10} color="#22d3ee" />
              <span>SQUAD SUPPORT COMMAND CONSOLE</span>
              <PixelStar size={10} color="#22d3ee" />
            </div>
            <div className="text-xs sm:text-sm font-bold text-white">
              หน่วยสนับสนุนตอบคำถาม • <span className="text-amber-300">ระบบโหวตเสียงส่วนมาก</span>
            </div>
          </div>
        </div>

        {/* Live Driver Tank Status */}
        <div className="flex items-center gap-3 bg-black/80 border-2 border-slate-700 px-3 py-1.5 font-arcade text-xs">
          <div className="text-rose-400 flex items-center gap-1">
            <PixelHeart size={14} color="#ef4444" />
            <span>HP: {teamTank?.hp || 0}/{teamTank?.maxHp || 2}</span>
          </div>
          <div className="text-amber-300 flex items-center gap-1">
            <PixelAmmo size={14} color="#fbbf24" />
            <span>AMMO: {teamTank?.ammo || 0}</span>
          </div>
        </div>
      </div>

      {/* Driver Tank Vital Bar */}
      <div className="mb-4 bg-[#151a2d] border-2 border-black p-2.5 flex items-center justify-between font-arcade text-[9px] text-slate-300">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 border border-black shadow shrink-0" style={{ backgroundColor: teamTank?.color || '#3b82f6' }} />
          <span>DRIVER: {teamTank?.playerName || playerName || 'กำลังรอพลขับ...'} ({teamTank?.archetype || 'STANDARD'})</span>
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
            <div className={`px-2.5 py-0.5 border-2 text-[10px] flex items-center gap-1.5 ${
              timeLeft <= 1.5 
                ? 'bg-rose-950 text-rose-300 border-rose-500 animate-blink' 
                : 'bg-black text-amber-300 border-amber-500'
            }`}>
              <PixelClock size={12} color={timeLeft <= 1.5 ? '#f43f5e' : '#fbbf24'} />
              <span>{timeLeft.toFixed(1)}s</span>
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
            <span className="flex items-center gap-1">
              <PixelStar size={10} color="#38bdf8" />
              <span>SQUAD VOTES: {totalVotes}</span>
            </span>
            <span className="text-amber-400 flex items-center gap-1">
              <PixelAmmo size={10} color="#fbbf24" />
              <span>+{currentQuestion.rewardAmmo} AMMO REWARD</span>
            </span>
          </div>

          {/* Options with Live Voting Percentage Bars */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-4">
            {currentQuestion.options.map((opt, idx) => {
              const letter = ['A', 'B', 'C', 'D'][idx];
              const count = voteCounts[idx] || 0;
              const percent = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
              const isSelected = selectedChoice === idx;

              let btnBorder = 'border-black';
              let btnBg = 'bg-black/80 hover:bg-black/95';

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
                  className={`relative overflow-hidden p-3.5 sm:p-4 min-h-[58px] border-2 font-bold text-left transition-all active:scale-95 ${btnBorder} ${btnBg} cursor-pointer rounded-sm`}
                >
                  {/* Live Voting Progress Fill Bar */}
                  <div
                    className="absolute left-0 top-0 bottom-0 bg-cyan-500/30 pointer-events-none transition-all duration-300"
                    style={{ width: `${percent}%` }}
                  />

                  <div className="relative z-10 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                      <span className={`w-7 h-7 shrink-0 flex items-center justify-center font-arcade text-xs border ${
                        isSelected 
                          ? 'bg-amber-400 text-black border-black shadow'
                          : 'bg-black text-cyan-300 border-cyan-600'
                      }`}>
                        {letter}
                      </span>
                      <span className="text-xs sm:text-sm font-bold text-slate-100 break-words">{opt}</span>
                    </div>

                    <div className="text-right shrink-0 font-arcade text-[10px] sm:text-xs">
                      <span className="text-cyan-300 font-bold">{percent}%</span>
                      <span className="text-slate-400 block text-[8px]">({count} เสียง)</span>
                    </div>
                  </div>

                  {isSelected && (
                    <div className="relative z-10 mt-1.5 font-arcade text-[8px] text-amber-300 flex items-center gap-1">
                      <PixelStar size={8} color="#fbbf24" />
                      <span>โหวตข้อนี้แล้ว (YOUR VOTE)</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Waiting for timer banner after voting */}
          {selectedChoice !== null && !finalResult && (
            <div className="p-2.5 mb-2 bg-cyan-950/70 border-2 border-cyan-500/70 text-cyan-300 font-arcade text-[8px] sm:text-[9px] text-center animate-pulse flex items-center justify-center gap-2">
              <PixelClock size={12} color="#38bdf8" />
              <span>บันทึกการโหวตของคุณแล้ว! กำลังรอหมดเวลาเพื่อรวมคะแนนเสียงส่วนใหญ่...</span>
            </div>
          )}

          {/* Final Result / Majority Banner */}
          {finalResult && (
            <div className={`p-3 border-2 font-thai text-xs flex items-center gap-2.5 animate-fade-in ${
              finalResult.isCorrect 
                ? 'bg-emerald-950 border-emerald-500 text-emerald-200' 
                : 'bg-rose-950 border-rose-500 text-rose-200'
            }`}>
              <div className="shrink-0">
                {finalResult.isCorrect ? (
                  <PixelCheck size={28} color="#34d399" />
                ) : (
                  <PixelCross size={28} color="#f87171" />
                )}
              </div>
              <div>
                <div className="font-extrabold text-white font-arcade text-[10px] flex items-center gap-1.5">
                  <PixelStar size={10} color={finalResult.isCorrect ? '#34d399' : '#f87171'} />
                  <span>
                    {finalResult.isCorrect 
                      ? `MAJORITY CORRECT! (+${finalResult.rewardAmmo} AMMO DELIVERED)` 
                      : 'MAJORITY WRONG! (NO AMMO)'}
                  </span>
                  <PixelStar size={10} color={finalResult.isCorrect ? '#34d399' : '#f87171'} />
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
          <div className="inline-block mb-3 animate-bounce-short">
            <PixelRadar size={36} color="#06b6d4" />
          </div>
          <div className="font-arcade text-xs text-amber-400 mb-1 flex items-center justify-center gap-1.5">
            <PixelStar size={10} color="#fbbf24" />
            <span>RADAR SCANNING FOR CRATES...</span>
            <PixelStar size={10} color="#fbbf24" />
          </div>
          <div className="text-xs text-slate-400 flex items-center justify-center gap-1.5 mt-1">
            <span>เมื่อคนขับเก็บกล่อง</span>
            <PixelCrate size={14} color="#f59e0b" />
            <span>โหมดโหวตเสียงส่วนมาก (3-5 วินาที) จะเริ่มต้นขึ้นทันที!</span>
          </div>
        </div>
      )}

      {/* Quick 8-bit Tactical Radio Cheering (2x2 grid on mobile) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
        <button
          onClick={() => {
            soundFx.playSelect();
            onSendCheer('เติมกระสุนแล้วนะ สู้ๆ!');
          }}
          className="px-2.5 py-2.5 arcade-btn arcade-btn-slate font-arcade text-[8px] flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <PixelAmmo size={12} color="#fbbf24" />
          <span>AMMO SENT!</span>
        </button>
        <button
          onClick={() => {
            soundFx.playSelect();
            onSendCheer('ระวังศัตรูทางซ้าย!');
          }}
          className="px-2.5 py-2.5 arcade-btn arcade-btn-rose font-arcade text-[8px] flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <PixelExplosion size={12} color="#ffffff" />
          <span>ENEMY LEFT!</span>
        </button>
        <button
          onClick={() => {
            soundFx.playSelect();
            onSendCheer('ลุยเลยเพื่อน รอดแน่นอน!');
          }}
          className="px-2.5 py-2.5 arcade-btn arcade-btn-amber font-arcade text-[8px] flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <PixelTrophy size={12} color="#000000" />
          <span>WE GOT THIS!</span>
        </button>
        <button
          onClick={() => {
            soundFx.playSelect();
            onSendCheer('รวมพลังโหวตข้อถูกเร็ว!');
          }}
          className="px-2.5 py-2.5 arcade-btn arcade-btn-cyan font-arcade text-[8px] flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <PixelBrain size={12} color="#000000" />
          <span>VOTE FAST!</span>
        </button>
      </div>

    </div>
  );
};
