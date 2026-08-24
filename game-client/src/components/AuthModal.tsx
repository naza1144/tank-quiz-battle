import React, { useState } from 'react';
import { Shield, Sparkles, User, LogIn, GraduationCap, Trophy } from 'lucide-react';
import { soundFx } from '../audio/soundFx.js';
import { PixelTank, PixelGamepad, PixelStar } from './PixelIcons.js';

interface AuthModalProps {
  onLogin: (token: string, userName: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onLogin }) => {
  const [gamerTag, setGamerTag] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const handleStudentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    soundFx.playStart();
    const name = gamerTag.trim() || `PLAYER_${Math.floor(1000 + Math.random() * 9000)}`;
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, studentId: name })
      });
      const data = await res.json();
      if (data.token) {
        localStorage.setItem('tank_auth_token', data.token);
        localStorage.setItem('tank_user_name', data.name);
        onLogin(data.token, data.name);
        return;
      }
    } catch (err) {
      console.warn('Direct login fallback to local token', err);
    }

    // Local instant fallback
    const fallbackToken = `std-${Date.now()}:${name}`;
    localStorage.setItem('tank_auth_token', fallbackToken);
    localStorage.setItem('tank_user_name', name);
    onLogin(fallbackToken, name);
    setLoading(false);
  };

  const handleGoogleLogin = () => {
    soundFx.playSelect();
    const origin = window.location.origin;
    window.location.href = `/auth/login?redirect_uri=${encodeURIComponent(origin + '/')}`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950 font-thai text-slate-100 crt-overlay">
      
      {/* Arcade Cabinet Frame */}
      <div className="relative w-full max-w-md bg-[#121624] border-4 border-black p-6 sm:p-8 rounded-none shadow-[8px_8px_0px_#000000] text-center">
        
        {/* Top Rivet Hardware Corners */}
        <div className="absolute top-2 left-2 w-2.5 h-2.5 bg-amber-400 border border-black" />
        <div className="absolute top-2 right-2 w-2.5 h-2.5 bg-amber-400 border border-black" />
        <div className="absolute bottom-2 left-2 w-2.5 h-2.5 bg-amber-400 border border-black" />
        <div className="absolute bottom-2 right-2 w-2.5 h-2.5 bg-amber-400 border border-black" />

        {/* 8-bit Pixel Tank Header */}
        <div className="inline-flex items-center justify-center w-20 h-20 bg-amber-500 border-4 border-black shadow-[4px_4px_0_#000] mb-4 animate-bounce-short">
          <PixelTank size={48} color="#000000" />
        </div>

        {/* Arcade Title */}
        <h1 className="font-arcade text-xl sm:text-2xl text-amber-400 tracking-wider mb-2 arcade-glow-gold leading-relaxed">
          TANK QUIZ<br/>BATTLE 1990
        </h1>
        
        <div className="inline-flex items-center gap-1.5 bg-slate-900 border-2 border-slate-700 px-3 py-1 font-arcade text-[10px] text-cyan-300 mb-6 shadow-[2px_2px_0_#000]">
          <PixelStar color="#22d3ee" size={12} />
          <span>60P SQUAD MULTIPLAYER</span>
          <PixelStar color="#22d3ee" size={12} />
        </div>

        {/* Arcade Name Entry */}
        <div className="space-y-4 text-left">
          
          <form onSubmit={handleStudentLogin} className="space-y-3">
            <div>
              <label className="block font-arcade text-[10px] text-amber-300 mb-2 uppercase tracking-wide">
                ▸ ใส่ชื่อนักเรียน / รหัสนักศึกษา:
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="เช่น naza1144 หรือ ฉายา"
                  value={gamerTag}
                  onChange={(e) => setGamerTag(e.target.value)}
                  maxLength={20}
                  autoFocus
                  className="w-full px-4 py-3 bg-black border-4 border-slate-700 focus:border-amber-400 text-amber-300 font-bold font-thai text-sm placeholder-slate-600 focus:outline-none transition-all shadow-[inset_2px_2px_4px_rgba(0,0,0,0.8)]"
                />
              </div>
            </div>

            {/* 3D Push Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 arcade-btn arcade-btn-amber text-xs font-arcade tracking-wider mt-2 flex items-center justify-center gap-2 cursor-pointer"
            >
              <PixelGamepad size={16} color="#000000" />
              <span>{loading ? 'LOADING...' : 'START GAME (เข้าเล่น)'}</span>
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-1 bg-slate-800" />
            <span className="font-arcade text-[9px] text-slate-500">OR</span>
            <div className="flex-1 h-1 bg-slate-800" />
          </div>

          {/* Google SSO Button */}
          <button
            onClick={handleGoogleLogin}
            className="w-full py-3 arcade-btn arcade-btn-slate font-thai text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            <span>เข้าสู่ระบบด้วย Google Account</span>
          </button>

        </div>

        {/* Retro Arcade Insert Coin Footer */}
        <div className="mt-6 pt-4 border-t-2 border-slate-800/80 font-arcade text-[10px] text-amber-500/80 animate-blink flex items-center justify-center gap-1.5">
          <PixelStar size={10} color="#f59e0b" />
          <span>INSERT COIN / PRESS START TO PLAY</span>
          <PixelStar size={10} color="#f59e0b" />
        </div>

      </div>
    </div>
  );
};
