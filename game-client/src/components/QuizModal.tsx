import React, { useState, useEffect } from 'react';
import { QuizQuestion } from '../types.js';
import { soundFx } from '../audio/soundFx.js';
import { Sparkles, Clock, CheckCircle2, XCircle, Zap } from 'lucide-react';

interface QuizModalProps {
  question: QuizQuestion;
  tankId: string;
  crateId: string;
  onAnswer: (selectedIndex: number) => void;
  onClose: () => void;
}

export const QuizModal: React.FC<QuizModalProps> = ({
  question,
  onAnswer,
  onClose
}) => {
  const [timeLeft, setTimeLeft] = useState<number>(question.timeLimitSeconds || 15);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState<boolean>(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

  useEffect(() => {
    if (isAnswered) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSelect(-1); // Timeout
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isAnswered]);

  const handleSelect = (index: number) => {
    if (isAnswered) return;
    setIsAnswered(true);
    setSelectedIndex(index);

    const correct = index === question.correctIndex;
    setIsCorrect(correct);

    if (correct) {
      soundFx.playQuizCorrect();
    } else {
      soundFx.playQuizWrong();
    }

    onAnswer(index);

    // Auto close after 2.5s
    setTimeout(() => {
      onClose();
    }, 2500);
  };

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'MATH': return 'bg-amber-500/20 text-amber-300 border-amber-500/50';
      case 'SCIENCE': return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50';
      case 'ENGLISH': return 'bg-blue-500/20 text-blue-300 border-blue-500/50';
      case 'LOGIC': return 'bg-purple-500/20 text-purple-300 border-purple-500/50';
      default: return 'bg-rose-500/20 text-rose-300 border-rose-500/50';
    }
  };

  const progressPercent = (timeLeft / (question.timeLimitSeconds || 15)) * 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-xl bg-slate-900 border-4 border-amber-500 rounded-2xl p-6 shadow-[0_0_50px_rgba(245,158,11,0.4)] text-slate-100 font-thai">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-slate-700 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getCategoryColor(question.category)}`}>
              {question.categoryTh || question.category}
            </span>
            <div className="flex items-center gap-1 text-amber-400 text-xs font-bold px-2 py-1 bg-amber-950/60 rounded-md border border-amber-700/50">
              <Zap className="w-3.5 h-3.5 fill-amber-400" />
              <span>รางวัล: +{question.rewardAmmo} กระสุน</span>
            </div>
          </div>

          {/* Timer */}
          <div className="flex items-center gap-1.5 text-rose-400 font-bold font-mono">
            <Clock className="w-4 h-4" />
            <span>{timeLeft}s</span>
          </div>
        </div>

        {/* Timer Bar */}
        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mb-5">
          <div 
            className={`h-full transition-all duration-1000 ${
              progressPercent > 50 ? 'bg-emerald-500' : progressPercent > 25 ? 'bg-amber-500' : 'bg-rose-500 animate-pulse'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Question Text */}
        <div className="mb-6 text-lg sm:text-xl font-bold text-center text-amber-100 leading-relaxed bg-slate-800/60 p-4 rounded-xl border border-slate-700">
          {question.questionTh}
        </div>

        {/* 4 Choices */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          {question.options.map((option, idx) => {
            const letter = ['A', 'B', 'C', 'D'][idx];
            let btnStyle = 'bg-slate-800 hover:bg-slate-700 border-slate-600 text-slate-200';

            if (isAnswered) {
              if (idx === question.correctIndex) {
                btnStyle = 'bg-emerald-600 border-emerald-400 text-white font-extrabold shadow-[0_0_20px_rgba(16,185,129,0.5)]';
              } else if (idx === selectedIndex) {
                btnStyle = 'bg-rose-600 border-rose-400 text-white opacity-80';
              } else {
                btnStyle = 'bg-slate-800/50 border-slate-700 text-slate-500 opacity-40';
              }
            }

            return (
              <button
                key={idx}
                disabled={isAnswered}
                onClick={() => handleSelect(idx)}
                className={`flex items-center gap-3 p-4 rounded-xl border-2 font-bold text-left transition-all active:scale-95 ${btnStyle}`}
              >
                <span className="w-7 h-7 flex items-center justify-center rounded-lg bg-black/40 text-amber-400 font-mono text-sm border border-white/10">
                  {letter}
                </span>
                <span className="flex-1 text-sm sm:text-base">{option}</span>
              </button>
            );
          })}
        </div>

        {/* Feedback Alert */}
        {isAnswered && (
          <div className={`p-4 rounded-xl border-2 flex items-center gap-3 animate-fade-in ${
            isCorrect ? 'bg-emerald-950/80 border-emerald-500 text-emerald-200' : 'bg-rose-950/80 border-rose-500 text-rose-200'
          }`}>
            {isCorrect ? (
              <>
                <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                <div>
                  <div className="font-extrabold text-sm text-emerald-300">ถูกต้อง! ได้รับกระสุน +{question.rewardAmmo} นัด 💥</div>
                  <div className="text-xs text-emerald-400/80 mt-0.5">{question.explanationTh}</div>
                </div>
              </>
            ) : (
              <>
                <XCircle className="w-6 h-6 text-rose-400 shrink-0" />
                <div>
                  <div className="font-extrabold text-sm text-rose-300">ตอบผิด! ไม่ได้กระสุน (ติดสตัน 1.5 วิ) ⚡</div>
                  <div className="text-xs text-rose-400/80 mt-0.5">{question.explanationTh}</div>
                </div>
              </>
            )}
          </div>
        )}

      </div>
    </div>
  );
};
