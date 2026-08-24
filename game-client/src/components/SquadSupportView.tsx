import React, { useState, useEffect } from 'react';
import { QuizQuestion, Tank, TeamQuizVoteUpdate, TeamQuizFinalResult } from '../types.js';
import { soundFx } from '../audio/soundFx.js';
import { Zap, Heart, CheckCircle2, XCircle, Users, Send, Clock, Award } from 'lucide-react';

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

  // Live Countdown Timer
  useEffect(() => {
    if (!quizSessionData?.endTime) {
      setTimeLeft(0);
      return;
    }

    const interval = setInterval(() => {
      const remainingMs = Math.max(0, quizSessionData.endTime - Date.now());
      const remainingSec = remainingMs / 1000;
      setTimeLeft(remainingSec);

      if (remainingMs <= 0) {
        clearInterval(interval);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [quizSessionData?.endTime]);

  const handleVote = (idx: number) => {
    if (selectedChoice !== null || finalResult || timeLeft <= 0) return;
    setSelectedChoice(idx);
    onVoteQuestion(idx);
  };

  const totalVotes = voteUpdate?.totalVotes || (selectedChoice !== null ? 1 : 0);
  const voteCounts = voteUpdate?.voteCounts || [0, 0, 0, 0];
  const maxTime = quizSessionData?.timeLimitSeconds || 4;
  const progressPercent = Math.max(0, Math.min(100, (timeLeft / maxTime) * 100));

  return (
    <div className="w-full max-w-2xl mx-auto p-4 sm:p-6 bg-slate-900/95 border-4 border-cyan-500 rounded-3xl shadow-[0_0_50px_rgba(6,182,212,0.3)] text-slate-100 font-thai">
      
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-slate-800 pb-4 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-cyan-950 border-2 border-cyan-400 flex items-center justify-center text-2xl shadow-inner">
            🛡️
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-cyan-400 font-extrabold flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              ศูนย์ควบคุมสนับสนุนทีม (Squad Support)
            </div>
            <div className="text-xl font-extrabold text-white">
              พลสนับสนุน: <span className="text-amber-400">{playerName}</span>
            </div>
          </div>
        </div>

        {/* Live Tank Status */}
        {teamTank && (
          <div className="flex items-center gap-3 bg-slate-800/80 px-4 py-2 rounded-2xl border border-slate-700">
            <div className="flex items-center gap-1.5 text-rose-400 font-bold text-sm">
              <Heart className="w-4 h-4 fill-rose-500" />
              <span>{teamTank.hp}/{teamTank.maxHp} HP</span>
            </div>
            <div className="flex items-center gap-1.5 text-amber-400 font-bold text-sm">
              <Zap className="w-4 h-4 fill-amber-400" />
              <span>{teamTank.ammo} กระสุน</span>
            </div>
          </div>
        )}
      </div>

      {/* Driver Info Banner */}
      <div className="p-3 mb-5 bg-gradient-to-r from-cyan-950/60 to-slate-900 border border-cyan-800/60 rounded-xl flex items-center justify-between text-xs sm:text-sm">
        <span className="text-slate-300">
          🎮 คนขับรถถังของทีม: <strong className="text-cyan-300 font-bold">{teamTank?.playerName || 'กำลังเตรียมการ'}</strong>
        </span>
        <span className="text-amber-400 font-bold">
          คะแนนรวม: {teamTank?.score || 0} แต้ม
        </span>
      </div>

      {/* Main Quiz & Voting Area */}
      {currentQuestion ? (
        <div className="bg-slate-800/90 border-2 border-cyan-500/50 rounded-2xl p-5 mb-5 shadow-xl relative overflow-hidden">
          
          {/* Header with Difficulty, Category, and Live Timer */}
          <div className="flex items-center justify-between text-xs font-bold mb-3">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-cyan-950 text-cyan-300 rounded-lg border border-cyan-700">
                โจทย์: {currentQuestion.categoryTh || currentQuestion.category}
              </span>
              <span className="px-2.5 py-1 bg-amber-950 text-amber-300 rounded-lg border border-amber-600/60">
                ความยาก: {currentQuestion.difficulty || 'MEDIUM'}
              </span>
            </div>
            
            {/* Live Countdown Badge */}
            <div className={`flex items-center gap-1 px-3 py-1 rounded-full font-mono text-sm font-extrabold border ${
              timeLeft <= 1.5 
                ? 'bg-rose-950 text-rose-300 border-rose-500 animate-pulse' 
                : 'bg-slate-900 text-amber-300 border-amber-500'
            }`}>
              <Clock className="w-3.5 h-3.5" />
              <span>{timeLeft.toFixed(1)}s</span>
            </div>
          </div>

          {/* Animated Countdown Progress Bar */}
          <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden mb-4 border border-slate-700">
            <div
              className={`h-full transition-all duration-75 rounded-full ${
                timeLeft <= 1.5
                  ? 'bg-gradient-to-r from-rose-500 to-red-600 shadow-[0_0_10px_#f43f5e]'
                  : 'bg-gradient-to-r from-cyan-400 to-amber-400 shadow-[0_0_10px_#38bdf8]'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Question Title */}
          <div className="text-lg sm:text-xl font-extrabold text-white mb-4 text-center leading-relaxed">
            {currentQuestion.questionTh}
          </div>

          {/* Voting Consensus Header */}
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2 px-1">
            <span>🗳️ โหวตตามเสียงส่วนใหญ่ ({totalVotes} เสียงแล้ว)</span>
            <span>+{currentQuestion.rewardAmmo} กระสุนให้คนขับ</span>
          </div>

          {/* Options with Live Voting Percentage Bars */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            {currentQuestion.options.map((opt, idx) => {
              const letter = ['A', 'B', 'C', 'D'][idx];
              const count = voteCounts[idx] || 0;
              const percent = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
              const isSelected = selectedChoice === idx;

              let btnBorder = 'border-slate-700';
              let btnBg = 'bg-slate-900/90 hover:bg-slate-800';

              if (finalResult) {
                if (idx === finalResult.correctIndex) {
                  btnBorder = 'border-emerald-400 ring-2 ring-emerald-500/50';
                  btnBg = 'bg-emerald-950/80';
                } else if (idx === finalResult.majorityChoice && !finalResult.isCorrect) {
                  btnBorder = 'border-rose-500 ring-2 ring-rose-500/50';
                  btnBg = 'bg-rose-950/80';
                } else {
                  btnBg = 'bg-slate-950/50 opacity-60';
                }
              } else if (isSelected) {
                btnBorder = 'border-amber-400 ring-2 ring-amber-400/40';
                btnBg = 'bg-amber-950/70';
              }

              return (
                <button
                  key={idx}
                  disabled={selectedChoice !== null || !!finalResult || timeLeft <= 0}
                  onClick={() => handleVote(idx)}
                  className={`relative overflow-hidden p-3.5 rounded-2xl border-2 font-bold text-left transition-all active:scale-98 ${btnBorder} ${btnBg}`}
                >
                  {/* Live Voting Progress Fill Bar */}
                  <div
                    className="absolute left-0 top-0 bottom-0 bg-cyan-500/20 pointer-events-none transition-all duration-300"
                    style={{ width: `${percent}%` }}
                  />

                  <div className="relative z-10 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className={`w-7 h-7 flex items-center justify-center rounded-lg font-mono text-sm font-extrabold border ${
                        isSelected 
                          ? 'bg-amber-500 text-slate-950 border-amber-400 shadow'
                          : 'bg-black/60 text-cyan-300 border-cyan-500/30'
                      }`}>
                        {letter}
                      </span>
                      <span className="text-sm font-bold text-slate-100">{opt}</span>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs font-mono font-bold text-cyan-300">
                        {percent}%
                      </span>
                      <span className="text-[10px] text-slate-400 block font-normal">
                        ({count} คน)
                      </span>
                    </div>
                  </div>

                  {isSelected && (
                    <div className="relative z-10 mt-1 text-[10px] text-amber-300 font-bold flex items-center gap-1">
                      ✓ คุณเลือกข้อนี้
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Final Result / Majority Banner */}
          {finalResult && (
            <div className={`p-4 rounded-2xl border-2 flex items-center gap-3 animate-fade-in ${
              finalResult.isCorrect 
                ? 'bg-emerald-950/90 border-emerald-500 text-emerald-200' 
                : 'bg-rose-950/90 border-rose-500 text-rose-200'
            }`}>
              {finalResult.isCorrect ? (
                <CheckCircle2 className="w-8 h-8 text-emerald-400 shrink-0" />
              ) : (
                <XCircle className="w-8 h-8 text-rose-400 shrink-0" />
              )}
              <div className="text-xs sm:text-sm">
                <div className="font-extrabold text-white flex items-center gap-1.5">
                  <span>
                    {finalResult.isCorrect 
                      ? `🎉 เสียงส่วนใหญ่ตอบถูก! (ส่งกระสุน +${finalResult.rewardAmmo} นัดให้คนขับแล้ว)` 
                      : '❌ เสียงส่วนใหญ่ตอบผิด! (คนขับไม่ได้รับกระสุน)'}
                  </span>
                </div>
                <div className="text-slate-300 text-xs mt-1">
                  {finalResult.explanationTh}
                </div>
              </div>
            </div>
          )}

        </div>
      ) : (
        <div className="text-center p-8 bg-slate-800/40 rounded-2xl border border-slate-700 mb-5">
          <div className="text-4xl mb-3 animate-bounce">⏳</div>
          <div className="text-base font-bold text-slate-300">กำลังรอโจทย์ชุดถัดไปจากสนามรบ...</div>
          <div className="text-xs text-slate-400 mt-1">เมื่อคนขับเก็บกล่องคำถาม ทุกคนในทีมจะช่วยกันโหวตคำตอบแบบเรียลไทม์!</div>
        </div>
      )}

      {/* Quick Tactical Cheering Buttons */}
      <div className="flex flex-wrap gap-2 justify-center">
        <button
          onClick={() => onSendCheer('เติมกระสุนแล้วนะ สู้ๆ! 💥')}
          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-xl text-xs font-bold text-slate-300 active:scale-95 transition-all flex items-center gap-1"
        >
          <Send className="w-3 h-3 text-cyan-400" /> เติมกระสุนแล้วนะ!
        </button>
        <button
          onClick={() => onSendCheer('ระวังศัตรูทางซ้าย! 👈')}
          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-xl text-xs font-bold text-slate-300 active:scale-95 transition-all flex items-center gap-1"
        >
          <Send className="w-3 h-3 text-rose-400" /> ระวังทางซ้าย!
        </button>
        <button
          onClick={() => onSendCheer('ลุยเลยเพื่อน รอดแน่นอน! 🏆')}
          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-xl text-xs font-bold text-slate-300 active:scale-95 transition-all flex items-center gap-1"
        >
          <Send className="w-3 h-3 text-amber-400" /> ลุยเลยเพื่อน!
        </button>
      </div>

    </div>
  );
};
