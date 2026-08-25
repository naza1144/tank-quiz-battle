import React, { useState, useEffect } from 'react';
import { GameMode, RoomConfig } from '../types.js';
import { Users, LogOut } from 'lucide-react';
import { soundFx } from '../audio/soundFx.js';
import { 
  PixelGamepad, 
  PixelStar, 
  PixelTeam, 
  PixelSwords, 
  PixelCrosshair, 
  PixelBrain 
} from './PixelIcons.js';

interface RoomSelectViewProps {
  rooms: {
    id: string;
    name: string;
    mode: GameMode;
    maxTanks: number;
    playerCount: number;
    state: string;
    selectedSubject?: string;
  }[];
  userName: string;
  onJoinRoom: (roomId: string) => void;
  onCreateRoom: (config: Partial<RoomConfig>) => void;
  onLogout: () => void;
  onOpenTeacherRoute?: () => void;
  onOpenGuide?: () => void;
}

export const RoomSelectView: React.FC<RoomSelectViewProps> = ({
  rooms,
  userName,
  onJoinRoom,
  onCreateRoom,
  onLogout,
  onOpenTeacherRoute,
  onOpenGuide
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [mode, setMode] = useState<GameMode>('SQUAD');
  const [maxTanks, setMaxTanks] = useState<number>(4);
  const [selectedSubject, setSelectedSubject] = useState<string>('ALL');
  const [categories, setCategories] = useState<{ id: string; nameTh: string; count: number }[]>([]);

  useEffect(() => {
    fetch('/api/quiz/categories')
      .then(res => res.json())
      .then(data => {
        if (data.categories) setCategories(data.categories);
      })
      .catch(err => console.error('Failed to load categories:', err));
  }, []);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    soundFx.playStart();
    onCreateRoom({
      name: roomName.trim() || 'สนามรบรถถังใหม่',
      mode,
      maxTanks,
      roundTimeSeconds: 240,
      isPrivate: false,
      selectedSubject
    });
    setShowCreateModal(false);
  };

  return (
    <div className="w-full max-w-5xl mx-auto p-3 sm:p-6 font-thai text-slate-100">
      
      {/* Top Arcade Mission Header */}
      <div className="pixel-box bg-[#121624] p-4 sm:p-5 mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-amber-500 border-2 border-black flex items-center justify-center shadow-[2px_2px_0_#000]">
            <PixelGamepad size={28} color="#000000" />
          </div>
          <div>
            <div className="font-arcade text-[10px] text-amber-400 uppercase tracking-widest mb-1 flex items-center gap-1.5">
              <PixelStar size={10} color="#fbbf24" />
              <span>MISSION SELECT / BATTLE ROOMS</span>
              <PixelStar size={10} color="#fbbf24" />
            </div>
            <div className="font-arcade text-xs sm:text-sm text-white">
              PLAYER: <span className="text-amber-300">{userName}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              soundFx.playSelect();
              if (onOpenGuide) onOpenGuide();
            }}
            className="px-3 py-2.5 arcade-btn arcade-btn-cyan font-arcade text-[10px] flex items-center gap-1.5 cursor-pointer shadow-md hover:scale-105 transition-transform"
            title="เปิดคู่มือสนามรบและกฎกติกาการเล่น"
          >
            <span>📖</span> <span>GUIDE (คู่มือ)</span>
          </button>

          <button
            onClick={() => {
              soundFx.playSelect();
              setShowCreateModal(true);
            }}
            className="px-4 py-2.5 arcade-btn arcade-btn-amber font-arcade text-[10px] flex items-center gap-1.5 cursor-pointer"
          >
            <span>+</span> <span>CREATE ROOM (สร้างห้อง)</span>
          </button>
          
          <button
            onClick={() => {
              soundFx.playSelect();
              onLogout();
            }}
            className="p-2.5 arcade-btn arcade-btn-rose text-xs cursor-pointer"
            title="ออกจากระบบ"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Room Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {rooms.length === 0 ? (
          <div className="col-span-full pixel-box bg-slate-900/90 p-8 text-center">
            <p className="font-arcade text-xs text-amber-400 mb-4">
              NO ACTIVE BATTLE ROOMS FOUND
            </p>
            <button
              onClick={() => {
                soundFx.playSelect();
                setShowCreateModal(true);
              }}
              className="px-6 py-3 arcade-btn arcade-btn-amber font-arcade text-xs cursor-pointer inline-flex items-center gap-2"
            >
              <span>+</span> <span>CREATE FIRST ROOM (สร้างห้องแรก)</span>
            </button>
          </div>
        ) : (
          rooms.map((room) => {
            const isPlaying = room.state === 'IN_GAME';
            const catObj = categories.find(c => c.id === room.selectedSubject);
            const subjectLabel = catObj?.nameTh || (room.selectedSubject && room.selectedSubject !== 'ALL' ? room.selectedSubject : 'ทุกหมวดหมู่วิชา');

            return (
              <div
                key={room.id}
                className="pixel-box bg-[#151a2d] p-4 flex flex-col justify-between hover:bg-[#1a2138] transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <span className={`px-2 py-0.5 border-2 border-black font-arcade text-[9px] flex items-center gap-1.5 ${
                        room.mode === 'SQUAD' 
                          ? 'bg-cyan-950 text-cyan-300' 
                          : 'bg-amber-950 text-amber-300'
                      }`}>
                        {room.mode === 'SQUAD' ? (
                          <>
                            <PixelTeam size={12} color="#22d3ee" />
                            <span>SQUAD CO-OP</span>
                          </>
                        ) : (
                          <>
                            <PixelSwords size={12} color="#f59e0b" />
                            <span>FFA BATTLE</span>
                          </>
                        )}
                      </span>

                      <span className="px-2 py-0.5 border border-slate-700 bg-black/80 text-[9px] text-amber-300 font-thai">
                        📚 {subjectLabel}
                      </span>
                    </div>
                    
                    <span className={`px-2 py-0.5 border-2 border-black font-arcade text-[8px] ${
                      isPlaying 
                        ? 'bg-rose-900 text-rose-300 animate-blink' 
                        : 'bg-emerald-900 text-emerald-300'
                    }`}>
                      {isPlaying ? '● IN BATTLE' : '● WAITING'}
                    </span>
                  </div>

                  <h3 className="font-bold text-base text-amber-300 mb-1 flex items-center gap-2">
                    <PixelCrosshair size={16} color="#fbbf24" />
                    <span>{room.name}</span>
                  </h3>
                  
                  <p className="text-xs text-slate-400 mb-3">
                    {room.mode === 'SQUAD'
                      ? 'ทีมเวิร์ก 4 ทีม: คนขับรถถัง 1 คน + เพื่อนร่วมห้องช่วยกันโหวตตอบคำถาม'
                      : 'ประลองอิสระ: แข่งขันขับรถถังเก็บกล่องคำถามเพื่อเอาตัวรอด'}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-3 border-t-2 border-slate-800">
                  <div className="font-arcade text-[10px] text-slate-400 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{room.playerCount} PLAYERS</span>
                  </div>

                  <button
                    onClick={() => {
                      soundFx.playStart();
                      onJoinRoom(room.id);
                    }}
                    className="px-4 py-2 arcade-btn arcade-btn-amber font-arcade text-[10px] flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>▶</span> <span>JOIN (เข้าร่วม)</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Retro Create Room Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in crt-overlay">
          <div className="w-full max-w-md pixel-box bg-[#121624] p-6 text-slate-100">
            <div className="flex items-center justify-between mb-4 pb-2 border-b-2 border-slate-800">
              <h2 className="font-arcade text-xs sm:text-sm text-amber-400 flex items-center gap-1.5">
                <PixelStar size={12} color="#fbbf24" />
                <span>CREATE BATTLE ROOM</span>
                <PixelStar size={12} color="#fbbf24" />
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="font-arcade text-xs text-rose-400 hover:text-white"
              >
                [X]
              </button>
            </div>
            
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block font-arcade text-[10px] text-slate-400 mb-1">
                  ▸ ROOM NAME (ชื่อห้อง):
                </label>
                <input
                  type="text"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  placeholder="เช่น สนามประลองวิชาคณิต ม.1"
                  maxLength={30}
                  className="w-full px-3 py-2.5 bg-black border-2 border-slate-700 focus:border-amber-400 text-white font-bold text-sm focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-arcade text-[10px] text-slate-400 mb-1">
                  ▸ SELECT SUBJECT / TOPIC (เลือกวิชา/หมวดข้อสอบ):
                </label>
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="w-full px-3 py-2.5 bg-black border-2 border-slate-700 focus:border-amber-400 text-amber-300 font-bold text-sm focus:outline-none font-thai"
                >
                  <option value="ALL">🌟 ทุกหมวดหมู่วิชา (All Subjects)</option>
                  {categories.filter(c => c.id !== 'ALL').map((c) => (
                    <option key={c.id} value={c.id}>
                      📖 {c.nameTh} ({c.count} ข้อ)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-arcade text-[10px] text-slate-400 mb-1">
                  ▸ GAME MODE (โหมดการเล่น):
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      soundFx.playSelect();
                      setMode('SQUAD');
                    }}
                    className={`p-3 border-2 border-black font-bold text-xs flex items-center justify-center gap-1.5 ${
                      mode === 'SQUAD' 
                        ? 'bg-cyan-600 text-black shadow-[2px_2px_0_#000]' 
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    <PixelTeam size={14} color={mode === 'SQUAD' ? '#000000' : '#94a3b8'} />
                    <span>Squad Co-op (ทีม)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      soundFx.playSelect();
                      setMode('FFA');
                    }}
                    className={`p-3 border-2 border-black font-bold text-xs flex items-center justify-center gap-1.5 ${
                      mode === 'FFA' 
                        ? 'bg-amber-500 text-black shadow-[2px_2px_0_#000]' 
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    <PixelSwords size={14} color={mode === 'FFA' ? '#000000' : '#94a3b8'} />
                    <span>Free-for-All (เดี่ยว)</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-arcade text-[10px] text-slate-400 mb-1">
                  ▸ MAX TANKS (จำนวนรถถัง):
                </label>
                <select
                  value={maxTanks}
                  onChange={(e) => setMaxTanks(Number(e.target.value))}
                  className="w-full px-3 py-2.5 bg-black border-2 border-slate-700 focus:border-amber-400 text-white font-bold text-sm focus:outline-none"
                >
                  <option value={4}>4 คัน (แนะนำสำหรับ 4 ทีม)</option>
                  <option value={6}>6 คัน (สนามใหญ่)</option>
                </select>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-3 arcade-btn arcade-btn-slate font-arcade text-[10px]"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 arcade-btn arcade-btn-amber font-arcade text-[10px]"
                >
                  CONFIRM
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

