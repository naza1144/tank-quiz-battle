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
        if (prev <= 3) {
          soundFx.playCountdownTick(true);
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

  const progressPercent = (timeLeft / (question.timeLimitSeconds || 15)) * 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in crt-overlay">
      <div className="relative w-full max-w-xl pixel-box bg-[#121624] p-5 sm:p-6 text-slate-100 font-thai">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-slate-800 pb-3 mb-3">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-cyan-950 text-cyan-300 border border-cyan-500 font-arcade text-[9px]">
              {question.categoryTh || question.category}
            </span>
            <div className="flex items-center gap-1 text-amber-300 font-arcade text-[9px] px-2 py-0.5 bg-black border border-amber-500">
              <span>★ +{question.rewardAmmo} AMMO</span>
            </div>
          </div>

          {/* 8-bit Timer */}
          <div className={`flex items-center gap-1 font-arcade text-xs ${
            timeLeft <= 3 ? 'text-rose-400 animate-blink' : 'text-amber-300'
          }`}>
            <span>⏱ {timeLeft}s</span>
          </div>
        </div>

        {/* Segmented Pixel Timer Bar */}
        <div className="w-full bg-black h-2.5 border-2 border-slate-700 p-0.5 mb-4">
          <div 
            className={`h-full transition-all duration-1000 ${
              progressPercent > 50 ? 'bg-emerald-500' : progressPercent > 25 ? 'bg-amber-500' : 'bg-rose-500'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Question Text */}
        <div className="mb-4 text-base sm:text-lg font-bold text-center text-amber-300 leading-relaxed bg-black/70 p-4 border-2 border-slate-800">
          {question.questionTh}
        </div>

        {/* 4 Choices */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-4">
          {question.options.map((option, idx) => {
            const letter = ['A', 'B', 'C', 'D'][idx];
            let btnStyle = 'border-black bg-black/70 hover:bg-slate-800 text-slate-100';

            if (isAnswered) {
              if (idx === question.correctIndex) {
                btnStyle = 'border-emerald-400 bg-emerald-950 text-emerald-200 font-bold';
              } else if (idx === selectedIndex) {
                btnStyle = 'border-rose-500 bg-rose-950 text-rose-200';
              } else {
                btnStyle = 'border-black bg-black/40 text-slate-500 opacity-40';
              }
            }

            return (
              <button
                key={idx}
                disabled={isAnswered}
                onClick={() => handleSelect(idx)}
                className={`flex items-center gap-2.5 p-3 border-2 font-bold text-left transition-all active:scale-98 ${btnStyle} cursor-pointer`}
              >
                <span className="w-6 h-6 flex items-center justify-center bg-black text-cyan-300 font-arcade text-xs border border-cyan-500">
                  {letter}
                </span>
                <span className="flex-1 text-xs sm:text-sm">{option}</span>
              </button>
            );
          })}
        </div>

        {/* Feedback Alert */}
        {isAnswered && (
          <div className={`p-3 border-2 flex items-center gap-2.5 animate-fade-in ${
            isCorrect ? 'bg-emerald-950 border-emerald-500 text-emerald-200' : 'bg-rose-950 border-rose-500 text-rose-200'
          }`}>
            <span className="text-2xl">{isCorrect ? '🎉' : '❌'}</span>
            <div className="text-xs">
              <div className="font-arcade text-[10px] text-white">
                {isCorrect ? `★ CORRECT! (+${question.rewardAmmo} AMMO) ★` : '★ WRONG ANSWER! ★'}
              </div>
              <div className="text-slate-300 text-xs mt-0.5 font-thai">
                {question.explanationTh}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
