import React, { useState } from 'react';
import { GameMode, RoomConfig } from '../types.js';
import { Users, Plus, Play, Shield, Zap, Sparkles, LogOut } from 'lucide-react';

interface RoomSelectViewProps {
  rooms: {
    id: string;
    name: string;
    mode: GameMode;
    maxTanks: number;
    playerCount: number;
    state: string;
  }[];
  userName: string;
  onJoinRoom: (roomId: string) => void;
  onCreateRoom: (config: Partial<RoomConfig>) => void;
  onLogout: () => void;
}

export const RoomSelectView: React.FC<RoomSelectViewProps> = ({
  rooms,
  userName,
  onJoinRoom,
  onCreateRoom,
  onLogout
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [mode, setMode] = useState<GameMode>('FFA');
  const [maxTanks, setMaxTanks] = useState<number>(6);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    onCreateRoom({
      name: roomName.trim() || 'ห้องประลองใหม่',
      mode,
      maxTanks,
      roundTimeSeconds: 240,
      isPrivate: false
    });
    setShowCreateModal(false);
  };

  return (
    <div className="w-full max-w-5xl mx-auto p-4 sm:p-6 font-thai text-slate-100 animate-fade-in">
      
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/90 border-2 border-slate-800 p-5 rounded-3xl mb-8 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500 text-black flex items-center justify-center text-2xl font-bold shadow-lg">
            🎮
          </div>
          <div>
            <div className="text-xs text-amber-400 font-bold uppercase tracking-wider">
              ศูนย์รวมสนามรบ (BATTLE LOBBY)
            </div>
            <div className="text-xl font-extrabold text-white">
              ยินดีต้อนรับ, <span className="text-amber-400">{userName}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-extrabold text-xs sm:text-sm rounded-2xl shadow-lg flex items-center gap-2 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" /> สร้างห้องใหม่
          </button>
          <button
            onClick={onLogout}
            className="p-2.5 bg-slate-800 hover:bg-rose-900/50 border border-slate-700 hover:border-rose-600 rounded-2xl text-slate-400 hover:text-rose-200 transition-all"
            title="ออกจากระบบ"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Room Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {rooms.map((room) => {
          const isPlaying = room.state === 'IN_GAME';

          return (
            <div
              key={room.id}
              className="bg-slate-900/80 border-2 border-slate-800 hover:border-amber-500/60 p-5 rounded-3xl shadow-lg transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="px-3 py-1 bg-slate-800 text-amber-300 rounded-xl text-xs font-bold border border-slate-700">
                    {room.mode === 'SQUAD' ? 'โหมดทีม Squad Co-op 🤝' : 'โหมดประลองเดี่ยว FFA ⚔️'}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                    isPlaying ? 'bg-rose-950 text-rose-400 border border-rose-700/50' : 'bg-emerald-950 text-emerald-400 border border-emerald-700/50'
                  }`}>
                    {isPlaying ? 'กำลังแข่ง' : 'รอผู้เล่น'}
                  </span>
                </div>

                <h3 className="text-lg font-extrabold text-white mb-1">
                  {room.name}
                </h3>
                <p className="text-xs text-slate-400 mb-4">
                  {room.mode === 'SQUAD'
                    ? '1 คนขับ + เพื่อนร่วมทีมช่วยตอบโจทย์ Quiz เพื่อโหลดกระสุน'
                    : 'ทุกคนขับรถถังชนกล่องคำถาม แลกกระสุนเพื่อยิงเอาตัวรอด'}
                </p>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-800/80">
                <div className="flex items-center gap-1.5 text-xs text-slate-400 font-bold">
                  <Users className="w-4 h-4 text-cyan-400" />
                  <span>{room.playerCount} / {room.maxTanks} ผู้เล่น</span>
                </div>

                <button
                  onClick={() => onJoinRoom(room.id)}
                  className="px-4 py-2 bg-slate-800 hover:bg-amber-500 hover:text-black border border-slate-700 hover:border-amber-400 rounded-xl text-xs font-extrabold text-amber-300 transition-all flex items-center gap-1.5 active:scale-95"
                >
                  <Play className="w-3.5 h-3.5 fill-current" /> เข้าร่วมรบ
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Room Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border-4 border-amber-500 rounded-3xl p-6 shadow-2xl text-slate-100">
            <h2 className="text-xl font-extrabold text-amber-400 mb-4">สร้างห้องประลองใหม่</h2>
            
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">ชื่อห้อง</label>
                <input
                  type="text"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  placeholder="เช่น สนามประลองห้อง ม.1/2"
                  className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm font-bold text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">โหมดการเล่น</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setMode('FFA')}
                    className={`p-3 rounded-xl border text-xs font-bold ${
                      mode === 'FFA' ? 'bg-amber-500/20 border-amber-500 text-amber-300' : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    ⚔️ Free-for-All (เดี่ยว)
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('SQUAD')}
                    className={`p-3 rounded-xl border text-xs font-bold ${
                      mode === 'SQUAD' ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300' : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    🤝 Squad Co-op (ทีม)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">จำนวนรถถังสูงสุด</label>
                <select
                  value={maxTanks}
                  onChange={(e) => setMaxTanks(Number(e.target.value))}
                  className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm font-bold text-white focus:outline-none focus:border-amber-400"
                >
                  <option value={4}>4 คัน (กำลังดี)</option>
                  <option value={6}>6 คัน (เต็มรูปแบบ)</option>
                </select>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold text-slate-400"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs rounded-xl shadow-lg"
                >
                  สร้างห้อง
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
