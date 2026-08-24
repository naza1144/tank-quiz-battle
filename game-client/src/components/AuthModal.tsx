import React, { useState } from 'react';
import { Shield, Sparkles, User, LogIn, Gamepad2, GraduationCap } from 'lucide-react';

interface AuthModalProps {
  onLogin: (token: string, userName: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onLogin }) => {
  const [gamerTag, setGamerTag] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const handleStudentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = gamerTag.trim() || `นักเรียน_${Math.floor(1000 + Math.random() * 9000)}`;
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
    const origin = window.location.origin;
    window.location.href = `/auth/login?redirect_uri=${encodeURIComponent(origin + '/')}`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950 font-thai text-slate-100">
      <div className="relative w-full max-w-md bg-slate-900/90 border-4 border-amber-500 rounded-3xl p-6 sm:p-8 shadow-[0_0_60px_rgba(245,158,11,0.3)] backdrop-blur-md text-center">
        
        {/* Tank Icon Banner */}
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-amber-500 text-black text-4xl mb-4 shadow-xl border-4 border-white/80 animate-pulse-fast">
          🕹️
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-amber-400 mb-1">
          TANK QUIZ BATTLE
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mb-6">
          เกมยิงรถถังตอบคำถาม • รองรับโหมดทีมเวิร์กทั้งห้องเรียน 60+ คน
        </p>

        <div className="space-y-4">
          
          {/* Quick Classroom / Student Tag Form */}
          <form onSubmit={handleStudentLogin} className="space-y-3">
            <div className="relative">
              <GraduationCap className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-400" />
              <input
                type="text"
                placeholder="พิมพ์ชื่อ, ฉายา หรือ รหัสนักศึกษา..."
                value={gamerTag}
                onChange={(e) => setGamerTag(e.target.value)}
                maxLength={20}
                autoFocus
                className="w-full pl-10 pr-4 py-3.5 bg-slate-800/90 border-2 border-slate-700 focus:border-amber-400 rounded-2xl text-sm font-bold text-white placeholder-slate-500 focus:outline-none transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-extrabold text-sm rounded-2xl shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all"
            >
              <Gamepad2 className="w-4 h-4 fill-slate-950" /> 
              {loading ? 'กำลังเข้าสู่ห้อง...' : 'เข้าสู่สนามประลอง (Play Now)'}
            </button>
          </form>

          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-slate-800" />
            <span className="text-xs text-slate-500 font-bold">หรือ</span>
            <div className="flex-1 h-px bg-slate-800" />
          </div>

          {/* Google OAuth Button */}
          <button
            onClick={handleGoogleLogin}
            className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-2xl shadow flex items-center justify-center gap-2.5 transition-all border border-slate-700"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            <span>เข้าสู่ระบบด้วย Google Account (SSO)</span>
          </button>

        </div>

        {/* Footer Note */}
        <div className="mt-6 pt-4 border-t border-slate-800 text-[11px] text-slate-500 leading-relaxed">
          ⚡ ระบบแยกลอยอิสระแบบ Standalone 100% ไม่พึ่งพาฐานข้อมูลภายนอกเครื่อง
        </div>

      </div>
    </div>
  );
};
