import React, { useState, useEffect } from 'react';
import { QuizQuestion, GameMode } from '../types.js';
import { soundFx } from '../audio/soundFx.js';
import { 
  PixelBrain, 
  PixelStar, 
  PixelClock, 
  PixelAmmo, 
  PixelGamepad,
  PixelShield,
  PixelCheck,
  PixelCross,
  PixelHeart
} from './PixelIcons.js';
import { 
  Plus, 
  Trash2, 
  BookOpen, 
  Upload, 
  RotateCcw, 
  Search, 
  Code2, 
  Check, 
  Copy,
  Lock,
  Unlock,
  ArrowLeft,
  Users,
  ShieldAlert,
  Swords,
  RefreshCw,
  Activity,
  UserX,
  Server,
  Radio
} from 'lucide-react';

interface TeacherPortalViewProps {
  onBackToGame: () => void;
}

interface DetailedRoom {
  id: string;
  name: string;
  mode: GameMode;
  maxTanks: number;
  playerCount: number;
  state: 'LOBBY' | 'STARTING' | 'IN_GAME' | 'GAME_OVER';
  isPrivate: boolean;
  selectedSubject: string;
  hasActiveEngine: boolean;
  players: {
    id: string;
    socketId: string;
    name: string;
    role: string;
    teamId: string;
    tankArchetype: string;
    tankColor: string;
    isHost: boolean;
    isReady: boolean;
  }[];
}

interface SystemStats {
  totalRooms: number;
  totalPlayers: number;
  activeGames: number;
  uptimeSeconds: number;
  memoryUsageMb: number;
  totalQuestionsInBank?: number;
}

const DEFAULT_TEACHER_PIN = 'teacher1234';

export const TeacherPortalView: React.FC<TeacherPortalViewProps> = ({ onBackToGame }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('teacher_auth_pass') === 'true';
  });
  const [pinInput, setPinInput] = useState<string>('');
  const [pinError, setPinError] = useState<string>('');

  const [activeTab, setActiveTab] = useState<'ROOMS' | 'LIST' | 'CREATE' | 'IMPORT' | 'API'>('ROOMS');
  
  // Room Admin State
  const [adminRooms, setAdminRooms] = useState<DetailedRoom[]>([]);
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [isRefreshingRooms, setIsRefreshingRooms] = useState<boolean>(false);
  const [newRoomName, setNewRoomName] = useState<string>('');
  const [newRoomMode, setNewRoomMode] = useState<GameMode>('SQUAD');
  const [newRoomSubject, setNewRoomSubject] = useState<string>('ALL');

  // Quiz Bank State
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [categories, setCategories] = useState<{ id: string; nameTh: string; count: number }[]>([]);
  const [selectedCat, setSelectedCat] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [copiedApi, setCopiedApi] = useState<string | null>(null);

  // New Question Form State
  const [formCategory, setFormCategory] = useState<string>('MATH');
  const [formCategoryTh, setFormCategoryTh] = useState<string>('คณิตศาสตร์');
  const [formQuestionTh, setFormQuestionTh] = useState<string>('');
  const [formOptions, setFormOptions] = useState<string[]>(['', '', '', '']);
  const [formCorrectIndex, setFormCorrectIndex] = useState<number>(0);
  const [formExplanationTh, setFormExplanationTh] = useState<string>('');
  const [formTimeLimit, setFormTimeLimit] = useState<number>(12);
  const [formRewardAmmo, setFormRewardAmmo] = useState<number>(3);
  const [formDifficulty, setFormDifficulty] = useState<'EASY' | 'MEDIUM' | 'HARD'>('MEDIUM');

  // JSON Import State
  const [importJsonText, setImportJsonText] = useState<string>('');
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');
  const [statusMessage, setStatusMessage] = useState<{ text: string; isError: boolean } | null>(null);

  // Fetch Rooms & Stats for Admin Dashboard
  const fetchAdminRooms = async () => {
    try {
      setIsRefreshingRooms(true);
      const res = await fetch('/api/admin/rooms');
      const data = await res.json();
      if (data.rooms) {
        setAdminRooms(data.rooms);
      }

      const statsRes = await fetch('/api/admin/stats');
      const statsData = await statsRes.json();
      if (statsData.stats) {
        setSystemStats(statsData.stats);
      }
    } catch (err) {
      console.error('Failed to fetch admin rooms:', err);
    } finally {
      setIsRefreshingRooms(false);
    }
  };

  const fetchQuestions = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/quiz/questions');
      const data = await res.json();
      if (data.questions) {
        setQuestions(data.questions);
      }
      
      const catRes = await fetch('/api/quiz/categories');
      const catData = await catRes.json();
      if (catData.categories) {
        setCategories(catData.categories);
      }
    } catch (err) {
      console.error('Failed to load questions:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchAdminRooms();
      fetchQuestions();

      // Auto-poll rooms status every 5 seconds
      const pollInterval = setInterval(() => {
        if (activeTab === 'ROOMS') {
          fetchAdminRooms();
        }
      }, 5000);

      return () => clearInterval(pollInterval);
    }
  }, [isAuthenticated, activeTab]);

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput === DEFAULT_TEACHER_PIN || pinInput === 'admin' || pinInput === '1234') {
      soundFx.playVictory();
      sessionStorage.setItem('teacher_auth_pass', 'true');
      setIsAuthenticated(true);
      setPinError('');
    } else {
      soundFx.playQuizWrong();
      setPinError('รหัสผ่านไม่ถูกต้อง (รหัสเริ่มต้น: teacher1234)');
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('teacher_auth_pass');
    setIsAuthenticated(false);
    setPinInput('');
  };

  // Admin Actions: Delete Room
  const handleDeleteRoom = async (roomId: string, roomName: string) => {
    if (!window.confirm(`⚠️ ยืนยันการลบห้อง [${roomName}] (${roomId}) หรือไม่?\nผู้เล่นทุกคนในห้องจะถูกส่งกลับสู่หน้ารายการห้องทันที`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/rooms/${roomId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        soundFx.playExplosion();
        setStatusMessage({ text: `🗑️ ${data.message}`, isError: false });
        fetchAdminRooms();
      } else {
        setStatusMessage({ text: data.error || 'ลบห้องไม่สำเร็จ', isError: true });
      }
    } catch (err) {
      setStatusMessage({ text: 'เชื่อมต่อกับเซิร์ฟเวอร์ล้มเหลว', isError: true });
    }
  };

  // Admin Actions: Reset Room
  const handleResetRoom = async (roomId: string) => {
    if (!window.confirm(`คุณต้องการบังคับรีเซ็ตห้อง [${roomId}] กลับสู่สถานะล็อบบี้ใช่หรือไม่?`)) return;

    try {
      const res = await fetch(`/api/admin/rooms/${roomId}/reset`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        soundFx.playStart();
        setStatusMessage({ text: `🔄 ${data.message}`, isError: false });
        fetchAdminRooms();
      }
    } catch (err) {
      console.error('Reset room error:', err);
    }
  };

  // Admin Actions: Kick Player
  const handleKickPlayer = async (roomId: string, playerId: string, playerName: string) => {
    if (!window.confirm(`ต้องการเตะผู้เล่น [${playerName}] ออกจากห้องหรือไม่?`)) return;

    try {
      const res = await fetch(`/api/admin/rooms/${roomId}/kick/${playerId}`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        soundFx.playExplosion();
        setStatusMessage({ text: `👢 ${data.message}`, isError: false });
        fetchAdminRooms();
      }
    } catch (err) {
      console.error('Kick player error:', err);
    }
  };

  // Admin Actions: Create Room directly from Dashboard
  const handleAdminCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newRoomName.trim() || 'ห้องแข่งขันโดยอาจารย์',
          mode: newRoomMode,
          maxTanks: newRoomMode === 'SQUAD' ? 4 : 6,
          roundTimeSeconds: 240,
          selectedSubject: newRoomSubject
        })
      });
      const data = await res.json();
      if (data.success) {
        soundFx.playStart();
        setStatusMessage({ text: `✅ สร้างห้องใหม่ [${data.roomId}] สำเร็จแล้ว`, isError: false });
        setNewRoomName('');
        fetchAdminRooms();
      }
    } catch (err) {
      setStatusMessage({ text: 'สร้างห้องล้มเหลว', isError: true });
    }
  };

  const handleCreateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formQuestionTh.trim() || formOptions.some(opt => !opt.trim())) {
      setStatusMessage({ text: 'กรุณากรอกคำถามและตัวเลือกให้ครบทั้ง 4 ข้อ', isError: true });
      return;
    }

    try {
      const res = await fetch('/api/quiz/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: formCategory,
          categoryTh: formCategoryTh,
          questionTh: formQuestionTh.trim(),
          options: formOptions.map(o => o.trim()),
          correctIndex: formCorrectIndex,
          explanationTh: formExplanationTh.trim() || 'ตอบถูกต้อง!',
          timeLimitSeconds: Number(formTimeLimit),
          rewardAmmo: Number(formRewardAmmo),
          difficulty: formDifficulty
        })
      });
      const data = await res.json();
      if (data.success) {
        soundFx.playQuizCorrect();
        setStatusMessage({ text: '✅ เพิ่มโจทย์คำถามใหม่เข้าคลังสำเร็จแล้ว!', isError: false });
        setFormQuestionTh('');
        setFormOptions(['', '', '', '']);
        setFormExplanationTh('');
        fetchQuestions();
        setActiveTab('LIST');
      } else {
        setStatusMessage({ text: data.error || 'เกิดข้อผิดพลาดในการบันทึก', isError: true });
      }
    } catch (err) {
      setStatusMessage({ text: 'เชื่อมต่อกับเซิร์ฟเวอร์ล้มเหลว', isError: true });
    }
  };

  const handleDeleteQuestion = async (id: string) => {
    if (!window.confirm('คุณต้องการลบโจทย์ข้อนี้ใช่หรือไม่?')) return;
    try {
      const res = await fetch(`/api/quiz/questions/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        soundFx.playExplosion();
        fetchQuestions();
      }
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const handleBulkImport = async () => {
    try {
      const parsed = JSON.parse(importJsonText);
      const res = await fetch('/api/quiz/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questions: parsed, mode: importMode })
      });
      const data = await res.json();
      if (data.success) {
        soundFx.playQuizCorrect();
        setStatusMessage({ text: data.message, isError: false });
        setImportJsonText('');
        fetchQuestions();
        setActiveTab('LIST');
      } else {
        setStatusMessage({ text: data.error || 'นำเข้าไม่สำเร็จ', isError: true });
      }
    } catch (err) {
      setStatusMessage({ text: 'รูปแบบ JSON ไม่ถูกต้อง กรุณาตรวจสอบ Syntax', isError: true });
    }
  };

  const handleResetDefault = async () => {
    if (!window.confirm('คุณต้องการรีเซ็ตคำถามทั้งหมดกลับเป็นโจทย์มาตรฐาน 15 ข้อใช่หรือไม่?')) return;
    try {
      const res = await fetch('/api/quiz/reset', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        soundFx.playStart();
        fetchQuestions();
        setStatusMessage({ text: data.message, isError: false });
      }
    } catch (err) {
      console.error('Reset failed:', err);
    }
  };

  const handleCopyApi = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedApi(text);
    setTimeout(() => setCopiedApi(null), 2000);
  };

  const filteredQuestions = questions.filter(q => {
    const matchCat = selectedCat === 'ALL' || q.category.toUpperCase() === selectedCat.toUpperCase();
    const matchSearch = !searchQuery.trim() || 
      q.questionTh.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.categoryTh.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.options.some(opt => opt.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchCat && matchSearch;
  });

  // Screen 1: Locked PIN Gate (Prevents students from peeking)
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0a0d18] text-slate-100 font-thai flex items-center justify-center p-4 crt-overlay">
        <div className="w-full max-w-md pixel-box bg-[#121624] p-6 shadow-2xl animate-fade-in">
          
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto mb-3 bg-amber-500 border-4 border-black flex items-center justify-center shadow-[4px_4px_0_#000]">
              <Lock className="w-8 h-8 text-black stroke-[2.5]" />
            </div>
            <h1 className="font-arcade text-sm text-amber-400 mb-1 flex items-center justify-center gap-2">
              <PixelStar size={12} color="#fbbf24" />
              <span>TEACHER & ADMIN GATE</span>
              <PixelStar size={12} color="#fbbf24" />
            </h1>
            <p className="text-xs text-slate-400 font-thai mt-1">
              แผงควบคุมอาจารย์: จัดการห้องแข่งขัน ลบห้อง และคลังข้อสอบ
            </p>
          </div>

          <form onSubmit={handleUnlock} className="space-y-4">
            <div>
              <label className="block font-arcade text-[10px] text-amber-400 mb-1.5">
                ▸ กรุณากรอกรหัสผ่านอาจารย์ (PIN CODE):
              </label>
              <input
                type="password"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                placeholder="รหัสเริ่มต้น: teacher1234"
                required
                className="w-full px-4 py-3 bg-black border-2 border-slate-700 focus:border-amber-400 text-white font-mono text-center tracking-widest text-lg focus:outline-none"
              />
              {pinError && (
                <p className="text-xs text-rose-400 font-bold mt-2 text-center bg-rose-950/60 p-2 border border-rose-800">
                  {pinError}
                </p>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-3.5 arcade-btn arcade-btn-amber font-arcade text-xs tracking-wider flex items-center justify-center gap-2 cursor-pointer"
            >
              <Unlock className="w-4 h-4" /> ปลดล็อกเข้าสู่ระบบจัดการอาจารย์
            </button>
          </form>

          <div className="mt-6 pt-4 border-t-2 border-slate-800 flex items-center justify-between">
            <button
              onClick={onBackToGame}
              className="font-arcade text-[9px] text-slate-400 hover:text-amber-300 flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> <span>กลับสู่หน้าเกม (BACK TO GAME)</span>
            </button>
            <span className="text-[10px] text-slate-600 font-mono">ROUTE: /admin</span>
          </div>

        </div>
      </div>
    );
  }

  // Screen 2: Authenticated Teacher & Admin Dashboard
  return (
    <div className="min-h-screen bg-[#0a0d18] text-slate-100 font-thai p-3 sm:p-6 animate-fade-in crt-overlay">
      <div className="w-full max-w-6xl mx-auto space-y-5 sm:space-y-6">
        
        {/* Top Header */}
        <div className="pixel-box bg-[#121624] p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-rose-600 border-2 border-black flex items-center justify-center shadow-[2px_2px_0_#000]">
              <ShieldAlert className="w-7 h-7 text-white stroke-[2.5]" />
            </div>
            <div>
              <h1 className="font-arcade text-xs sm:text-sm text-amber-400 flex items-center gap-2">
                <PixelStar size={12} color="#fbbf24" />
                <span>TEACHER & ADMIN COMMAND CENTER</span>
                <PixelStar size={12} color="#fbbf24" />
              </h1>
              <p className="text-xs text-slate-300 font-thai">
                ระบบจัดการห้องแข่งขันแบบเรียลไทม์ • ลบ/รีเซ็ตห้อง • จัดการคลังข้อสอบ • Open APIs
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={onBackToGame}
              className="px-4 py-2.5 arcade-btn arcade-btn-amber font-arcade text-[10px] flex items-center gap-1.5 cursor-pointer"
            >
              <PixelGamepad size={14} color="#000000" />
              <span>เข้าสู่หน้าเกม (PLAY GAME)</span>
            </button>

            <button
              onClick={handleLogout}
              className="px-3 py-2.5 arcade-btn arcade-btn-rose font-arcade text-[10px] flex items-center gap-1.5 cursor-pointer"
              title="ออกจากระบบจัดการ"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>LOCK</span>
            </button>
          </div>
        </div>

        {/* System Summary Metrics Bar */}
        {systemStats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="pixel-box bg-[#121624] p-3 border border-slate-700">
              <div className="font-arcade text-[8px] sm:text-[9px] text-slate-400 flex items-center gap-1">
                <Swords className="w-3.5 h-3.5 text-amber-400" /> ห้องแข่งขันทั้งหมด
              </div>
              <div className="font-arcade text-lg sm:text-xl text-amber-300 font-bold mt-1">
                {systemStats.totalRooms} <span className="text-xs font-normal text-slate-500">ห้อง</span>
              </div>
            </div>

            <div className="pixel-box bg-[#121624] p-3 border border-slate-700">
              <div className="font-arcade text-[8px] sm:text-[9px] text-slate-400 flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-cyan-400" /> ผู้เล่นออนไลน์
              </div>
              <div className="font-arcade text-lg sm:text-xl text-cyan-300 font-bold mt-1">
                {systemStats.totalPlayers} <span className="text-xs font-normal text-slate-500">คน</span>
              </div>
            </div>

            <div className="pixel-box bg-[#121624] p-3 border border-slate-700">
              <div className="font-arcade text-[8px] sm:text-[9px] text-slate-400 flex items-center gap-1">
                <Activity className="w-3.5 h-3.5 text-emerald-400" /> กำลังต่อสู้สด
              </div>
              <div className="font-arcade text-lg sm:text-xl text-emerald-400 font-bold mt-1">
                {systemStats.activeGames} <span className="text-xs font-normal text-slate-500">แมตช์</span>
              </div>
            </div>

            <div className="pixel-box bg-[#121624] p-3 border border-slate-700">
              <div className="font-arcade text-[8px] sm:text-[9px] text-slate-400 flex items-center gap-1">
                <Server className="w-3.5 h-3.5 text-purple-400" /> Memory / Uptime
              </div>
              <div className="font-arcade text-sm sm:text-base text-purple-300 font-bold mt-1">
                {systemStats.memoryUsageMb} MB <span className="text-xs font-normal text-slate-500">({Math.floor(systemStats.uptimeSeconds / 60)}m)</span>
              </div>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex border-b-2 border-slate-800 bg-[#121624] px-4 pt-2 gap-2 overflow-x-auto">
          <button
            onClick={() => { soundFx.playSelect(); setActiveTab('ROOMS'); }}
            className={`px-4 py-2.5 font-arcade text-[10px] border-t-2 border-x-2 border-black flex items-center gap-2 ${
              activeTab === 'ROOMS'
                ? 'bg-[#151a2d] text-rose-400 border-b-2 border-transparent -mb-[2px]'
                : 'bg-black text-slate-400 hover:text-white'
            }`}
          >
            <Swords className="w-4 h-4 text-rose-400" /> 🏰 จัดการห้องแข่งขัน ({adminRooms.length})
          </button>

          <button
            onClick={() => { soundFx.playSelect(); setActiveTab('LIST'); }}
            className={`px-4 py-2.5 font-arcade text-[10px] border-t-2 border-x-2 border-black flex items-center gap-2 ${
              activeTab === 'LIST'
                ? 'bg-[#151a2d] text-amber-300 border-b-2 border-transparent -mb-[2px]'
                : 'bg-black text-slate-400 hover:text-white'
            }`}
          >
            <BookOpen className="w-4 h-4" /> คลังข้อสอบ ({questions.length} ข้อ)
          </button>
          
          <button
            onClick={() => { soundFx.playSelect(); setActiveTab('CREATE'); }}
            className={`px-4 py-2.5 font-arcade text-[10px] border-t-2 border-x-2 border-black flex items-center gap-2 ${
              activeTab === 'CREATE'
                ? 'bg-[#151a2d] text-amber-300 border-b-2 border-transparent -mb-[2px]'
                : 'bg-black text-slate-400 hover:text-white'
            }`}
          >
            <Plus className="w-4 h-4" /> + เพิ่มโจทย์ใหม่
          </button>

          <button
            onClick={() => { soundFx.playSelect(); setActiveTab('IMPORT'); }}
            className={`px-4 py-2.5 font-arcade text-[10px] border-t-2 border-x-2 border-black flex items-center gap-2 ${
              activeTab === 'IMPORT'
                ? 'bg-[#151a2d] text-amber-300 border-b-2 border-transparent -mb-[2px]'
                : 'bg-black text-slate-400 hover:text-white'
            }`}
          >
            <Upload className="w-4 h-4" /> นำเข้า / ส่งออก JSON
          </button>

          <button
            onClick={() => { soundFx.playSelect(); setActiveTab('API'); }}
            className={`px-4 py-2.5 font-arcade text-[10px] border-t-2 border-x-2 border-black flex items-center gap-2 ${
              activeTab === 'API'
                ? 'bg-[#151a2d] text-cyan-300 border-b-2 border-transparent -mb-[2px]'
                : 'bg-black text-slate-400 hover:text-white'
            }`}
          >
            <Code2 className="w-4 h-4" /> ⚡ Open REST APIs
          </button>
        </div>

        {/* Status Message Banner */}
        {statusMessage && (
          <div className={`p-3 text-xs text-center border-2 ${
            statusMessage.isError 
              ? 'bg-rose-950 text-rose-300 border-rose-800' 
              : 'bg-emerald-950 text-emerald-300 border-emerald-800'
          }`}>
            {statusMessage.text}
          </div>
        )}

        {/* Main Tab Content */}
        <div className="pixel-box bg-[#151a2d] p-4 sm:p-6">
          
          {/* ════════════════════════════════════════════════════════════════════════ */}
          {/* TAB 1: ADMIN LIVE ROOMS MANAGEMENT                                    */}
          {/* ════════════════════════════════════════════════════════════════════════ */}
          {activeTab === 'ROOMS' && (
            <div className="space-y-6">
              
              {/* Header Controls & Create Room Quick Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-black/80 p-3.5 border-2 border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="font-arcade text-[10px] text-amber-400">สถานะห้องสด:</span>
                  <span className="font-arcade text-xs text-white">
                    {adminRooms.length} ห้องที่กำลังออนไลน์
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={fetchAdminRooms}
                    disabled={isRefreshingRooms}
                    className="px-3 py-1.5 arcade-btn arcade-btn-cyan font-arcade text-[9px] flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingRooms ? 'animate-spin' : ''}`} />
                    <span>REFRESH</span>
                  </button>
                </div>
              </div>

              {/* Quick Admin Room Creator */}
              <form onSubmit={handleAdminCreateRoom} className="p-4 bg-black/60 border border-slate-800 space-y-3">
                <h3 className="font-arcade text-[10px] text-cyan-400 flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5" /> สร้างห้องแข่งขันใหม่โดยอาจารย์ (Admin Quick Create)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                  <input
                    type="text"
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                    placeholder="ชื่อห้อง เช่น ห้องสอบเก็บคะแนนคาบ 3"
                    className="px-3 py-2 bg-black border border-slate-700 text-xs focus:outline-none focus:border-amber-400 sm:col-span-2 font-thai"
                  />
                  
                  <select
                    value={newRoomMode}
                    onChange={(e) => setNewRoomMode(e.target.value as any)}
                    className="px-3 py-2 bg-black border border-slate-700 text-xs focus:outline-none focus:border-amber-400 font-thai"
                  >
                    <option value="SQUAD">SQUAD CO-OP (4 ทีม)</option>
                    <option value="FFA">FFA BATTLE (ตะลุมบอน)</option>
                  </select>

                  <select
                    value={newRoomSubject}
                    onChange={(e) => setNewRoomSubject(e.target.value)}
                    className="px-3 py-2 bg-black border border-slate-700 text-xs focus:outline-none focus:border-amber-400 font-thai"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nameTh}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 arcade-btn arcade-btn-amber font-arcade text-[9px] flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> + สร้างห้องทันที
                </button>
              </form>

              {/* Room Cards List */}
              {adminRooms.length === 0 ? (
                <div className="text-center py-16 text-slate-500 font-thai">
                  ขณะนี้ไม่มีห้องแข่งขันที่เปิดอยู่ สามารถกดสร้างห้องด้านบนได้ทันที
                </div>
              ) : (
                <div className="space-y-4">
                  {adminRooms.map((r) => {
                    const isPlaying = r.state === 'IN_GAME';
                    return (
                      <div
                        key={r.id}
                        className={`p-4 pixel-box border-2 transition-all ${
                          isPlaying 
                            ? 'bg-[#181124] border-rose-600 shadow-[0_0_15px_rgba(225,29,72,0.3)]' 
                            : 'bg-black/80 border-slate-700'
                        }`}
                      >
                        {/* Room Card Header */}
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3 mb-3">
                          <div className="flex items-center gap-2.5">
                            <span className={`w-3 h-3 rounded-full ${
                              isPlaying ? 'bg-rose-500 animate-ping' : 'bg-emerald-400'
                            }`} />
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-arcade text-xs text-white font-bold">
                                  {r.name}
                                </h4>
                                <span className="font-mono text-[10px] text-slate-500">[{r.id}]</span>
                              </div>
                              <div className="flex flex-wrap items-center gap-1.5 mt-1 font-arcade text-[8px]">
                                <span className={`px-2 py-0.5 border ${
                                  isPlaying 
                                    ? 'bg-rose-950 text-rose-300 border-rose-500' 
                                    : 'bg-emerald-950 text-emerald-300 border-emerald-500'
                                }`}>
                                  STATE: {r.state}
                                </span>
                                <span className="px-2 py-0.5 bg-cyan-950 text-cyan-300 border border-cyan-500">
                                  MODE: {r.mode}
                                </span>
                                <span className="px-2 py-0.5 bg-amber-950 text-amber-300 border border-amber-500">
                                  📚 {r.selectedSubject}
                                </span>
                                <span className="px-2 py-0.5 bg-slate-900 text-slate-300 border border-slate-700">
                                  👥 {r.playerCount} / {r.maxTanks * 15} PLAYERS
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Action Buttons for this Room */}
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleResetRoom(r.id)}
                              className="px-3 py-2 arcade-btn arcade-btn-slate font-arcade text-[9px] flex items-center gap-1 cursor-pointer"
                              title="บังคับรีเซ็ตห้องกลับสู่สถานะล็อบบี้"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>RESET</span>
                            </button>

                            <button
                              onClick={() => handleDeleteRoom(r.id, r.name)}
                              className="px-3 py-2 arcade-btn arcade-btn-rose font-arcade text-[9px] flex items-center gap-1 cursor-pointer"
                              title="ลบห้องและนำผู้เล่นทุกคนออกจากห้องทันที"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>DELETE ROOM</span>
                            </button>
                          </div>
                        </div>

                        {/* Players in Room Breakdown */}
                        <div>
                          <div className="font-arcade text-[9px] text-slate-400 mb-2 flex items-center justify-between">
                            <span>รายชื่อผู้เล่นในห้อง ({r.players.length} คน):</span>
                          </div>

                          {r.players.length === 0 ? (
                            <div className="text-xs text-slate-500 italic py-2">
                              ห้องว่าง (ไม่มีผู้เล่นอยู่ข้างใน)
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                              {r.players.map((p) => (
                                <div
                                  key={p.socketId}
                                  className="p-2 bg-black border border-slate-800 flex items-center justify-between gap-2"
                                >
                                  <div className="flex items-center gap-2 truncate">
                                    <span
                                      className="w-2.5 h-2.5 border border-black shrink-0 shadow"
                                      style={{ backgroundColor: p.tankColor || '#3b82f6' }}
                                    />
                                    <div className="truncate">
                                      <div className="text-xs font-bold text-slate-200 truncate">
                                        {p.name} {p.isHost && '👑'}
                                      </div>
                                      <div className="font-arcade text-[7px] text-slate-500">
                                        {p.role} • {p.teamId}
                                      </div>
                                    </div>
                                  </div>

                                  <button
                                    onClick={() => handleKickPlayer(r.id, p.id, p.name)}
                                    className="text-rose-400 hover:text-rose-200 p-1 shrink-0"
                                    title={`เตะ ${p.name} ออกจากห้อง`}
                                  >
                                    <UserX className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                      </div>
                    );
                  })}
                </div>
              )}

            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════════════ */}
          {/* TAB 2: QUESTIONS LIST                                                  */}
          {/* ════════════════════════════════════════════════════════════════════════ */}
          {activeTab === 'LIST' && (
            <div className="space-y-4">
              
              {/* Filter Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-black/80 p-3 border-2 border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="font-arcade text-[9px] text-amber-400">เลือกหมวดวิชา:</span>
                  <select
                    value={selectedCat}
                    onChange={(e) => setSelectedCat(e.target.value)}
                    className="px-3 py-1.5 bg-black border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-400 font-thai"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nameTh} ({c.count} ข้อ)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="relative flex-1 min-w-[220px] max-w-sm">
                  <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ค้นหาข้อสอบในคลัง..."
                    className="w-full pl-9 pr-3 py-1.5 bg-black border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-400 font-thai"
                  />
                </div>

                <button
                  onClick={handleResetDefault}
                  className="px-3 py-1.5 arcade-btn arcade-btn-slate font-arcade text-[8px] flex items-center gap-1.5"
                  title="รีเซ็ตกลับเป็นโจทย์มาตรฐาน 15 ข้อ"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> RESET DEFAULT
                </button>
              </div>

              {/* Grid / List */}
              {isLoading ? (
                <div className="text-center py-16 font-arcade text-xs text-amber-400 animate-pulse">
                  LOADING QUIZ BANK FROM CLUSTER...
                </div>
              ) : filteredQuestions.length === 0 ? (
                <div className="text-center py-16 text-slate-500 font-thai">
                  ไม่พบโจทย์คำถามที่ตรงกับเงื่อนไข
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredQuestions.map((q, idx) => (
                    <div
                      key={q.id}
                      className="p-4 pixel-box bg-black/60 border border-slate-700 hover:border-slate-500 transition-colors flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-arcade text-[8px] px-2 py-0.5 bg-cyan-950 text-cyan-300 border border-cyan-500">
                              {q.categoryTh || q.category}
                            </span>
                            <span className="font-arcade text-[8px] px-1.5 py-0.5 bg-slate-900 text-slate-400 border border-slate-700">
                              {q.difficulty || 'MEDIUM'}
                            </span>
                            <span className="font-arcade text-[8px] text-amber-400 flex items-center gap-1">
                              <PixelClock size={10} color="#fbbf24" /> {q.timeLimitSeconds}s
                            </span>
                            <span className="font-arcade text-[8px] text-emerald-400 flex items-center gap-1">
                              <PixelAmmo size={10} color="#34d399" /> +{q.rewardAmmo} นัด
                            </span>
                          </div>

                          <button
                            onClick={() => handleDeleteQuestion(q.id)}
                            className="text-rose-400 hover:text-rose-200 p-1"
                            title="ลบคำถามข้อนี้"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <h3 className="font-bold text-sm text-white mb-2.5 font-thai leading-snug">
                          {idx + 1}. {q.questionTh}
                        </h3>

                        {/* Choices */}
                        <div className="space-y-1.5 mb-2.5">
                          {q.options.map((opt, oIdx) => (
                            <div
                              key={oIdx}
                              className={`px-3 py-1 text-xs font-thai border flex items-center justify-between ${
                                oIdx === q.correctIndex
                                  ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 font-bold'
                                  : 'bg-black/40 border-slate-800 text-slate-300'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-arcade text-[9px]">
                                  {String.fromCharCode(65 + oIdx)}.
                                </span>
                                <span>{opt}</span>
                              </div>
                              {oIdx === q.correctIndex && (
                                <span className="font-arcade text-[8px] text-emerald-400">[CORRECT ✓]</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      {q.explanationTh && (
                        <p className="text-[11px] text-slate-400 bg-black/80 p-2 border-l-2 border-amber-500 mt-2">
                          💡 <span className="font-bold text-slate-300">เฉลย/คำอธิบาย:</span> {q.explanationTh}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}

            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════════════ */}
          {/* TAB 3: CREATE NEW QUESTION                                             */}
          {/* ════════════════════════════════════════════════════════════════════════ */}
          {activeTab === 'CREATE' && (
            <form onSubmit={handleCreateQuestion} className="space-y-4 max-w-3xl mx-auto">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-arcade text-[9px] text-amber-400 mb-1">
                    รหัสหมวดวิชา (Category ID):
                  </label>
                  <input
                    type="text"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value.toUpperCase())}
                    placeholder="เช่น MATH, PHYSICS, CS101"
                    required
                    className="w-full px-3 py-2 bg-black border border-slate-700 text-xs font-mono focus:border-amber-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-arcade text-[9px] text-amber-400 mb-1">
                    ชื่อวิชาภาษาไทย (Category Name):
                  </label>
                  <input
                    type="text"
                    value={formCategoryTh}
                    onChange={(e) => setFormCategoryTh(e.target.value)}
                    placeholder="เช่น ฟิสิกส์ ม.ปลาย, วิทยาการคำนวณ"
                    required
                    className="w-full px-3 py-2 bg-black border border-slate-700 text-xs focus:border-amber-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-arcade text-[9px] text-amber-400 mb-1">
                    ระดับความยาก (Difficulty):
                  </label>
                  <select
                    value={formDifficulty}
                    onChange={(e) => setFormDifficulty(e.target.value as any)}
                    className="w-full px-3 py-2 bg-black border border-slate-700 text-xs focus:border-amber-400 focus:outline-none"
                  >
                    <option value="EASY">EASY (ง่าย • 10 วินาที)</option>
                    <option value="MEDIUM">MEDIUM (ปานกลาง • 12 วินาที)</option>
                    <option value="HARD">HARD (ท้าทาย • 15 วินาที)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-arcade text-[9px] text-amber-400 mb-1">
                  ▸ คำถามโจทย์แบบทดสอบ (Question in Thai):
                </label>
                <textarea
                  value={formQuestionTh}
                  onChange={(e) => setFormQuestionTh(e.target.value)}
                  placeholder="เช่น ผลรวมมุมภายในของรูปหกเหลี่ยมคือเท่าใด?"
                  required
                  rows={2}
                  className="w-full px-3 py-2 bg-black border border-slate-700 text-sm focus:border-amber-400 focus:outline-none"
                />
              </div>

              {/* 4 Choices */}
              <div className="space-y-2">
                <label className="block font-arcade text-[9px] text-cyan-400">
                  ▸ ตัวเลือก 4 ข้อ (คลิกเลือกปุ่มวงกลมเพื่อตั้งข้อที่ถูกต้อง):
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {formOptions.map((opt, idx) => (
                    <div
                      key={idx}
                      className={`flex items-center gap-2 p-2 border ${
                        formCorrectIndex === idx ? 'border-emerald-500 bg-emerald-950/40' : 'border-slate-700 bg-black'
                      }`}
                    >
                      <input
                        type="radio"
                        name="correctChoice"
                        checked={formCorrectIndex === idx}
                        onChange={() => setFormCorrectIndex(idx)}
                        className="cursor-pointer accent-emerald-500 w-4 h-4"
                      />
                      <span className="font-arcade text-xs text-amber-400 font-bold">
                        {String.fromCharCode(65 + idx)}:
                      </span>
                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => {
                          const newOpts = [...formOptions];
                          newOpts[idx] = e.target.value;
                          setFormOptions(newOpts);
                        }}
                        placeholder={`ตัวเลือกข้อ ${String.fromCharCode(65 + idx)}`}
                        required
                        className="flex-1 bg-transparent border-none text-xs text-white focus:outline-none"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-arcade text-[9px] text-amber-400 mb-1">
                  ▸ คำอธิบายเฉลย (Explanation):
                </label>
                <input
                  type="text"
                  value={formExplanationTh}
                  onChange={(e) => setFormExplanationTh(e.target.value)}
                  placeholder="เช่น สูตรการหาคือ (n-2) x 180 = (6-2) x 180 = 720 องศา"
                  className="w-full px-3 py-2 bg-black border border-slate-700 text-xs focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-arcade text-[9px] text-slate-400 mb-1">
                    ⏱️ เวลาตอบคำถาม (วินาที):
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={30}
                    value={formTimeLimit}
                    onChange={(e) => setFormTimeLimit(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-black border border-slate-700 text-xs focus:border-amber-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-arcade text-[9px] text-slate-400 mb-1">
                    🚀 กระสุนที่ได้รับรางวัล (นัด):
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={formRewardAmmo}
                    onChange={(e) => setFormRewardAmmo(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-black border border-slate-700 text-xs focus:border-amber-400 focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 arcade-btn arcade-btn-amber font-arcade text-xs cursor-pointer flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" /> บันทึกโจทย์เข้าคลังข้อสอบ
              </button>
            </form>
          )}

          {/* ════════════════════════════════════════════════════════════════════════ */}
          {/* TAB 4: JSON IMPORT / EXPORT                                            */}
          {/* ════════════════════════════════════════════════════════════════════════ */}
          {activeTab === 'IMPORT' && (
            <div className="space-y-4 max-w-4xl mx-auto">
              <div className="flex items-center justify-between">
                <h3 className="font-arcade text-xs text-amber-400">
                  JSON BULK IMPORT / EXPORT (นำเข้าแบบชุดข้อสอบ)
                </h3>
                <button
                  onClick={() => {
                    const jsonStr = JSON.stringify(questions, null, 2);
                    navigator.clipboard.writeText(jsonStr);
                    setStatusMessage({ text: '📋 คัดลอก JSON ทั้งหมดลงคลิปบอร์ดแล้ว', isError: false });
                  }}
                  className="px-3 py-2 arcade-btn arcade-btn-cyan font-arcade text-[9px] flex items-center gap-1.5"
                >
                  <Copy className="w-3.5 h-3.5" /> EXPORT JSON (คัดลอกทั้งหมด)
                </button>
              </div>

              <textarea
                value={importJsonText}
                onChange={(e) => setImportJsonText(e.target.value)}
                placeholder={`วางชุดข้อสอบแบบ JSON ที่นี่ เช่น:\n[\n  {\n    "category": "PHYSICS",\n    "categoryTh": "ฟิสิกส์",\n    "questionTh": "หน่วยของแรงคือข้อใด?",\n    "options": ["จูล", "นิวตัน", "วัตต์", "พาสคาล"],\n    "correctIndex": 1,\n    "explanationTh": "หน่วยของแรงคือ นิวตัน (N)",\n    "timeLimitSeconds": 12,\n    "rewardAmmo": 3\n  }\n]`}
                rows={12}
                className="w-full p-3 bg-black border border-slate-700 text-xs font-mono text-cyan-300 focus:border-amber-400 focus:outline-none"
              />

              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-4 text-xs font-arcade text-slate-300">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="importMode"
                      value="append"
                      checked={importMode === 'append'}
                      onChange={() => setImportMode('append')}
                      className="accent-amber-500"
                    />
                    <span>เพิ่มต่อท้าย (Append)</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-rose-400">
                    <input
                      type="radio"
                      name="importMode"
                      value="replace"
                      checked={importMode === 'replace'}
                      onChange={() => setImportMode('replace')}
                      className="accent-rose-500"
                    />
                    <span>แทนที่ทั้งหมด (Replace All)</span>
                  </label>
                </div>

                <button
                  onClick={handleBulkImport}
                  className="px-6 py-3 arcade-btn arcade-btn-emerald font-arcade text-xs cursor-pointer flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" /> นำเข้าข้อมูล (IMPORT)
                </button>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════════════ */}
          {/* TAB 5: OPEN REST APIS                                                  */}
          {/* ════════════════════════════════════════════════════════════════════════ */}
          {activeTab === 'API' && (
            <div className="space-y-4 max-w-4xl mx-auto">
              <div className="bg-black/60 p-4 border-l-4 border-cyan-500">
                <h3 className="font-arcade text-xs text-cyan-300 mb-1">
                  🌐 OPEN QUIZ & ADMIN REST API SPECIFICATION
                </h3>
                <p className="text-xs text-slate-300">
                  อาจารย์และนักพัฒนาสามารถเรียกใช้งาน API เหล่านี้เพื่อควบคุมห้อง หรือเชื่อมต่อกับระบบ LMS ภายนอกได้โดยตรง
                </p>
              </div>

              <div className="space-y-3 font-mono text-xs">
                
                {/* Admin Endpoint 1 */}
                <div className="p-3.5 bg-black border border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 bg-emerald-950 text-emerald-400 border border-emerald-600 text-[10px] font-bold">
                      GET
                    </span>
                    <button
                      onClick={() => handleCopyApi('/api/admin/rooms')}
                      className="text-slate-400 hover:text-white text-[10px] flex items-center gap-1"
                    >
                      {copiedApi === '/api/admin/rooms' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>คัดลอก URL</span>
                    </button>
                  </div>
                  <div className="text-amber-300">/api/admin/rooms</div>
                  <div className="text-slate-400 text-[11px] font-thai">
                    ดึงรายการห้องแข่งขันทั้งหมดแบบละเอียดพร้อมรายชื่อผู้เล่นและสถานะสด
                  </div>
                </div>

                {/* Admin Endpoint 2 */}
                <div className="p-3.5 bg-black border border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 bg-rose-950 text-rose-400 border border-rose-600 text-[10px] font-bold">
                      DELETE
                    </span>
                    <button
                      onClick={() => handleCopyApi('/api/admin/rooms/:roomId')}
                      className="text-slate-400 hover:text-white text-[10px] flex items-center gap-1"
                    >
                      {copiedApi === '/api/admin/rooms/:roomId' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>คัดลอก URL</span>
                    </button>
                  </div>
                  <div className="text-amber-300">/api/admin/rooms/:roomId</div>
                  <div className="text-slate-400 text-[11px] font-thai">
                    บังคับปิดและลบห้องแข่งขันทันที (Force Delete Room)
                  </div>
                </div>

                {/* Admin Endpoint 3 */}
                <div className="p-3.5 bg-black border border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 bg-cyan-950 text-cyan-400 border border-cyan-600 text-[10px] font-bold">
                      POST
                    </span>
                    <button
                      onClick={() => handleCopyApi('/api/admin/rooms/:roomId/reset')}
                      className="text-slate-400 hover:text-white text-[10px] flex items-center gap-1"
                    >
                      {copiedApi === '/api/admin/rooms/:roomId/reset' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>คัดลอก URL</span>
                    </button>
                  </div>
                  <div className="text-amber-300">/api/admin/rooms/:roomId/reset</div>
                  <div className="text-slate-400 text-[11px] font-thai">
                    บังคับรีเซ็ตห้องแข่งขันกลับสู่สถานะล็อบบี้
                  </div>
                </div>

                {/* Quiz Endpoint 1 */}
                <div className="p-3.5 bg-black border border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 bg-emerald-950 text-emerald-400 border border-emerald-600 text-[10px] font-bold">
                      GET
                    </span>
                    <button
                      onClick={() => handleCopyApi('/api/quiz/questions')}
                      className="text-slate-400 hover:text-white text-[10px] flex items-center gap-1"
                    >
                      {copiedApi === '/api/quiz/questions' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>คัดลอก URL</span>
                    </button>
                  </div>
                  <div className="text-amber-300">/api/quiz/questions?category=MATH&difficulty=EASY</div>
                  <div className="text-slate-400 text-[11px] font-thai">
                    ดึงรายการข้อสอบทั้งหมด รองรับ query parameters สำหรับกรองวิชาและความยาก
                  </div>
                </div>

              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
