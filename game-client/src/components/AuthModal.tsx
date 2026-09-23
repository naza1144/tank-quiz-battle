import React, { useState } from 'react';
import { Shield, Sparkles, User, LogIn, GraduationCap, KeyRound, ExternalLink } from 'lucide-react';
import { soundFx } from '../audio/soundFx.js';
import { PixelTank, PixelGamepad, PixelStar } from './PixelIcons.js';

interface AuthModalProps {
  onLogin: (token: string, userName: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onLogin }) => {
  const [activeTab, setActiveTab] = useState<'student' | 'teacher'>('student');
  const [gamerTag, setGamerTag] = useState<string>('');
  const [studentId, setStudentId] = useState<string>('');
  const [teacherUsername, setTeacherUsername] = useState<string>('');
  const [teacherPassword, setTeacherPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const handleStudentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    soundFx.playStart();
    setErrorMsg('');
    const rawName = gamerTag.trim();
    const rawId = studentId.trim();
    const finalId = rawId || (rawName.match(/^\d+$/) ? rawName : `650${Math.floor(1000 + Math.random() * 9000)}`);
    const finalName = rawName || `PLAYER_${finalId.slice(-4)}`;

    setLoading(true);

    try {
      // 1. Try Offline Classroom Login via account-service (OPA-evaluated)
      const res = await fetch('/api/account/offline-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: finalId,
          name: finalName,
          sectionId: 'sec-cpe-2026-1'
        })
      });
      const data = await res.json();
      if (data.success && data.token) {
        localStorage.setItem('tank_auth_token', data.token);
        localStorage.setItem('tank_user_name', data.user?.profile?.displayName || finalName);
        onLogin(data.token, data.user?.profile?.displayName || finalName);
        return;
      }
    } catch (err) {
      console.warn('account-service offline-login fallback to game-server auth', err);
    }

    try {
      // 2. Secondary fallback via game-server login
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: finalName, studentId: finalId })
      });
      const data = await res.json();
      if (data.token) {
        localStorage.setItem('tank_auth_token', data.token);
        localStorage.setItem('tank_user_name', data.name);
        onLogin(data.token, data.name);
        return;
      }
    } catch (err) {
      console.warn('Secondary login fallback to local token', err);
    }

    // 3. Instant Standalone Local Token
    const fallbackToken = `std-${Date.now()}:${finalName}`;
    localStorage.setItem('tank_auth_token', fallbackToken);
    localStorage.setItem('tank_user_name', finalName);
    onLogin(fallbackToken, finalName);
    setLoading(false);
  };

  const handleTeacherLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    soundFx.playStart();
    setErrorMsg('');
    setLoading(true);

    try {
      const res = await fetch('/api/account/teacher-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: teacherUsername.trim(),
          password: teacherPassword.trim()
        })
      });
      const data = await res.json();

      if (data.success && data.token) {
        const displayName = data.user?.profile?.displayName || teacherUsername;
        localStorage.setItem('tank_auth_token', data.token);
        localStorage.setItem('tank_user_name', displayName);
        onLogin(data.token, displayName);
        return;
      } else {
        setErrorMsg(data.error || 'ชื่อผู้ใช้หรือรหัส PIN ไม่ถูกต้อง (ค่าเริ่มต้น: PIN 1990)');
      }
    } catch (err: any) {
      setErrorMsg('ไม่สามารถเชื่อมต่อ account-service ได้: ' + (err.message || 'Network error'));
    } finally {
      setLoading(false);
    }
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
        
        <div className="inline-flex items-center gap-1.5 bg-slate-900 border-2 border-slate-700 px-3 py-1 font-arcade text-[10px] text-cyan-300 mb-4 shadow-[2px_2px_0_#000]">
          <PixelStar color="#22d3ee" size={12} />
          <span>OFFLINE CLASSROOM & OPA RBAC</span>
          <PixelStar color="#22d3ee" size={12} />
        </div>

        {/* Mode Selector Tabs (Student vs Teacher) */}
        <div className="grid grid-cols-2 gap-2 mb-5 font-arcade text-[11px]">
          <button
            type="button"
            onClick={() => { soundFx.playSelect(); setActiveTab('student'); setErrorMsg(''); }}
            className={`py-2 border-2 border-black font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-[2px_2px_0_#000] ${
              activeTab === 'student'
                ? 'bg-amber-400 text-black border-amber-500'
                : 'bg-slate-900 text-slate-400 hover:text-white'
            }`}
          >
            <GraduationCap size={14} />
            <span>นักเรียน (STUDENT)</span>
          </button>
          <button
            type="button"
            onClick={() => { soundFx.playSelect(); setActiveTab('teacher'); setErrorMsg(''); }}
            className={`py-2 border-2 border-black font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-[2px_2px_0_#000] ${
              activeTab === 'teacher'
                ? 'bg-cyan-400 text-black border-cyan-500'
                : 'bg-slate-900 text-slate-400 hover:text-white'
            }`}
          >
            <Shield size={14} />
            <span>อาจารย์ (TEACHER)</span>
          </button>
        </div>

        {errorMsg && (
          <div className="mb-4 p-2.5 bg-rose-950/80 border-2 border-rose-600 text-rose-300 text-xs font-thai text-left shadow-[2px_2px_0_#000]">
            ⚠️ {errorMsg}
          </div>
        )}

        {/* ---------------- STUDENT TAB ---------------- */}
        {activeTab === 'student' && (
          <div className="space-y-4 text-left">
            <form onSubmit={handleStudentLogin} className="space-y-3">
              <div>
                <label className="block font-arcade text-[10px] text-amber-300 mb-1 uppercase tracking-wide">
                  ▸ รหัสนักศึกษา (STUDENT ID):
                </label>
                <input
                  type="text"
                  placeholder="เช่น 6501001"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  maxLength={15}
                  className="w-full px-4 py-2.5 bg-black border-4 border-slate-700 focus:border-amber-400 text-amber-300 font-bold font-mono text-sm placeholder-slate-600 focus:outline-none transition-all shadow-[inset_2px_2px_4px_rgba(0,0,0,0.8)]"
                />
              </div>

              <div>
                <label className="block font-arcade text-[10px] text-amber-300 mb-1 uppercase tracking-wide">
                  ▸ ชื่อเล่น / ฉายาในเกม (GAMER TAG):
                </label>
                <input
                  type="text"
                  placeholder="เช่น ธนกร หรือ TankAce"
                  value={gamerTag}
                  onChange={(e) => setGamerTag(e.target.value)}
                  maxLength={20}
                  autoFocus
                  className="w-full px-4 py-2.5 bg-black border-4 border-slate-700 focus:border-amber-400 text-amber-300 font-bold font-thai text-sm placeholder-slate-600 focus:outline-none transition-all shadow-[inset_2px_2px_4px_rgba(0,0,0,0.8)]"
                />
              </div>

              {/* 3D Push Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 arcade-btn arcade-btn-amber text-xs font-arcade tracking-wider mt-3 flex items-center justify-center gap-2 cursor-pointer"
              >
                <PixelGamepad size={16} color="#000000" />
                <span>{loading ? 'LOADING...' : 'START GAME (เข้าเล่นเกม)'}</span>
              </button>
            </form>
          </div>
        )}

        {/* ---------------- TEACHER TAB ---------------- */}
        {activeTab === 'teacher' && (
          <div className="space-y-4 text-left">
            <form onSubmit={handleTeacherLogin} className="space-y-3">
              <div>
                <label className="block font-arcade text-[10px] text-cyan-300 mb-1 uppercase tracking-wide">
                  ▸ บัญชีอาจารย์ (USERNAME / EMAIL):
                </label>
                <input
                  type="text"
                  placeholder="เช่น chanon, somchai, หรือ admin"
                  value={teacherUsername}
                  onChange={(e) => setTeacherUsername(e.target.value)}
                  maxLength={40}
                  autoFocus
                  className="w-full px-4 py-2.5 bg-black border-4 border-slate-700 focus:border-cyan-400 text-cyan-300 font-bold font-mono text-sm placeholder-slate-600 focus:outline-none transition-all shadow-[inset_2px_2px_4px_rgba(0,0,0,0.8)]"
                />
              </div>

              <div>
                <label className="block font-arcade text-[10px] text-cyan-300 mb-1 uppercase tracking-wide">
                  ▸ รหัสผ่าน / รหัสประจำห้อง (PASSWORD / PIN):
                </label>
                <input
                  type="password"
                  placeholder="เช่น 1990, admin, teacher"
                  value={teacherPassword}
                  onChange={(e) => setTeacherPassword(e.target.value)}
                  maxLength={30}
                  className="w-full px-4 py-2.5 bg-black border-4 border-slate-700 focus:border-cyan-400 text-cyan-300 font-bold text-sm placeholder-slate-600 focus:outline-none transition-all shadow-[inset_2px_2px_4px_rgba(0,0,0,0.8)]"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 arcade-btn arcade-btn-cyan text-xs font-arcade tracking-wider mt-3 flex items-center justify-center gap-2 cursor-pointer bg-cyan-400 text-black hover:bg-cyan-300 font-bold"
              >
                <KeyRound size={16} />
                <span>{loading ? 'VERIFYING...' : 'TEACHER LOGIN (สิทธิ์ OPA)'}</span>
              </button>
            </form>
          </div>
        )}

        {/* Divider & Online Google SSO Fallback */}
        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 h-1 bg-slate-800" />
          <span className="font-arcade text-[9px] text-slate-500">OR ONLINE SSO</span>
          <div className="flex-1 h-1 bg-slate-800" />
        </div>

        <button
          onClick={handleGoogleLogin}
          className="w-full py-2.5 arcade-btn arcade-btn-slate font-thai text-xs font-bold flex items-center justify-center gap-2 cursor-pointer opacity-80 hover:opacity-100 transition-opacity"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
          </svg>
          <span>เชื่อมต่อ Google OAuth (เมื่อมีอินเทอร์เน็ต)</span>
        </button>

        {/* Retro Arcade Insert Coin Footer */}
        <div className="mt-5 pt-3 border-t-2 border-slate-800/80 font-arcade text-[10px] text-amber-500/80 animate-blink flex items-center justify-center gap-1.5">
          <PixelStar size={10} color="#f59e0b" />
          <span>CLASSROOM LAN MODE • OPA POLICY ACTIVE</span>
          <PixelStar size={10} color="#f59e0b" />
        </div>

      </div>
    </div>
  );
};
