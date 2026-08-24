import React, { useState } from 'react';
import { TankArchetype, PlayerRole, Player, RoomConfig } from '../types.js';
import { 
  Shield, 
  Zap, 
  Crosshair, 
  Gauge, 
  Bot, 
  Play, 
  Plus, 
  Check, 
  Users, 
  Sparkles, 
  Crown,
  Volume2,
  VolumeX
} from 'lucide-react';
import { soundFx } from '../audio/soundFx.js';

interface LobbyViewProps {
  roomConfig: RoomConfig | null;
  players: Player[];
  myPlayerId: string;
  isHost: boolean;
  onSelectTank: (archetype: TankArchetype, color: string, role: PlayerRole, teamId?: string) => void;
  onSetReady: (isReady: boolean) => void;
  onAddBot: (difficulty: 'EASY' | 'MEDIUM' | 'HARD') => void;
  onAutoBalanceTeams?: () => void;
  onStartGame: () => void;
  onLeaveRoom: () => void;
}

const TANK_PRESETS: {
  type: TankArchetype;
  nameTh: string;
  desc: string;
  hp: number;
  speed: string;
  damage: number;
  icon: string;
}[] = [
  {
    type: 'STANDARD',
    nameTh: 'รถถังมาตรฐาน (Standard)',
    desc: 'สมดุลทั้งความเร็วและเกราะ ยิงได้แม่นยำ เหมาะกับทุกสถานการณ์',
    hp: 2,
    speed: 'ปานกลาง',
    damage: 1,
    icon: '🛡️'
  },
  {
    type: 'SCOUT',
    nameTh: 'สายสปีดคล่องแคล่ว (Scout)',
    desc: 'เคลื่อนที่ไว วิ่งเก็บกล่องคำถามได้เร็วสุด แต่เกราะบาง (1 HP)',
    hp: 1,
    speed: 'เร็วมาก ⚡',
    damage: 1,
    icon: '⚡'
  },
  {
    type: 'HEAVY',
    nameTh: 'เกราะหนักจอมพลัง (Heavy)',
    desc: 'เกราะหนา 4 HP ยิงหนัก 2 เท่า แต่เคลื่อนที่ช้า ชนกำแพงแกร่ง',
    hp: 4,
    speed: 'ช้า',
    damage: 2,
    icon: '🦾'
  },
  {
    type: 'SNIPER',
    nameTh: 'สไนเปอร์ซุ่มยิง (Sniper)',
    desc: 'กระสุนความเร็วสูง ยิงทะลุเป้าหมายระยะไกล เกราะบาง (1 HP)',
    hp: 1,
    speed: 'ปานกลาง',
    damage: 2,
    icon: '🎯'
  }
];

const COLORS = [
  { name: 'เหลืองทอง (Classic)', value: '#eab308' },
  { name: 'เขียวทหาร', value: '#22c55e' },
  { name: 'น้ำเงินเทอร์โบ', value: '#3b82f6' },
  { name: 'แดงเพลิง', value: '#ef4444' },
  { name: 'ม่วงพลาสม่า', value: '#a855f7' },
  { name: 'ฟ้าไซเบอร์', value: '#06b6d4' }
];

export const TEAM_PRESETS = [
  {
    id: 'team-1',
    name: 'ทีมแดงเพลิง (Red)',
    color: '#ef4444',
    bg: 'from-rose-950/70 to-slate-900',
    border: 'border-rose-500/70',
    badgeBg: 'bg-rose-500 text-white',
    textColor: 'text-rose-400',
    icon: '🔥'
  },
  {
    id: 'team-2',
    name: 'ทีมน้ำเงินพายุ (Blue)',
    color: '#3b82f6',
    bg: 'from-blue-950/70 to-slate-900',
    border: 'border-blue-500/70',
    badgeBg: 'bg-blue-500 text-white',
    textColor: 'text-blue-400',
    icon: '⚡'
  },
  {
    id: 'team-3',
    name: 'ทีมเขียวมรกต (Green)',
    color: '#22c55e',
    bg: 'from-emerald-950/70 to-slate-900',
    border: 'border-emerald-500/70',
    badgeBg: 'bg-emerald-500 text-white',
    textColor: 'text-emerald-400',
    icon: '🌿'
  },
  {
    id: 'team-4',
    name: 'ทีมเหลืองสายฟ้า (Yellow)',
    color: '#eab308',
    bg: 'from-amber-950/70 to-slate-900',
    border: 'border-amber-500/70',
    badgeBg: 'bg-amber-500 text-slate-950',
    textColor: 'text-amber-400',
    icon: '👑'
  }
];

export const LobbyView: React.FC<LobbyViewProps> = ({
  roomConfig,
  players,
  myPlayerId,
  isHost,
  onSelectTank,
  onSetReady,
  onAddBot,
  onAutoBalanceTeams,
  onStartGame,
  onLeaveRoom
}) => {
  const myPlayer = players.find(p => p.id === myPlayerId || p.socketId === myPlayerId);
  const [selectedArchetype, setSelectedArchetype] = useState<TankArchetype>(myPlayer?.tankArchetype || 'STANDARD');
  const [selectedColor, setSelectedColor] = useState<string>(myPlayer?.tankColor || '#eab308');
  const [selectedRole, setSelectedRole] = useState<PlayerRole>(myPlayer?.role || 'DRIVER');
  const [selectedTeam, setSelectedTeam] = useState<string>(myPlayer?.teamId || 'team-1');
  const [isMuted, setIsMuted] = useState<boolean>(soundFx.getIsMuted());

  const handleUpdateTank = (arch: TankArchetype, col: string, rol: PlayerRole, team: string) => {
    setSelectedArchetype(arch);
    setSelectedColor(col);
    setSelectedRole(rol);
    setSelectedTeam(team);
    onSelectTank(arch, col, rol, team);
  };

  const handleToggleSound = () => {
    const muted = soundFx.toggleMute();
    setIsMuted(muted);
  };

  const isSquadMode = roomConfig?.mode === 'SQUAD';

  return (
    <div className="w-full max-w-6xl mx-auto p-4 sm:p-6 font-thai text-slate-100 animate-fade-in">
      
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/90 border-2 border-slate-800 p-4 rounded-3xl mb-6 shadow-xl">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🎮</span>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-amber-400">
              {roomConfig?.name || 'สนามรบรถถัง'}
            </h1>
            <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
              <span className={`px-2 py-0.5 rounded border font-bold ${
                isSquadMode 
                  ? 'bg-cyan-950/80 border-cyan-500 text-cyan-300' 
                  : 'bg-amber-950/80 border-amber-500 text-amber-300'
              }`}>
                โหมด: {isSquadMode ? 'ทีมเวิร์ก (Squad Co-op)' : 'ประลองอิสระ (FFA Battle Royale)'}
              </span>
              <span>• รองรับนักเรียนทั้งห้อง (60+ คน)</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleSound}
            className="p-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition-all"
            title="เปิด/ปิดเสียง"
          >
            {isMuted ? <VolumeX className="w-5 h-5 text-rose-400" /> : <Volume2 className="w-5 h-5 text-emerald-400" />}
          </button>
          <button
            onClick={onLeaveRoom}
            className="px-4 py-2 bg-slate-800 hover:bg-rose-900/60 border border-slate-700 hover:border-rose-600 rounded-2xl text-xs font-bold text-slate-300 hover:text-rose-200 transition-all"
          >
            ออกจากห้อง
          </button>
        </div>
      </div>

      {/* SQUAD / TEAM SELECTION BOARD (For Squad Mode) */}
      {isSquadMode && (
        <div className="mb-6 bg-slate-900/90 border-2 border-slate-800 p-5 rounded-3xl shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800">
            <div>
              <h2 className="text-base font-extrabold text-cyan-400 flex items-center gap-2">
                <Users className="w-5 h-5" /> การจัดทีมและบทบาท (Team & Role Formation)
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                รองรับนักเรียนทั้งห้อง (60+ คน): มีคนขับรถถังทีมละ 1 คน 🎯 และผู้ช่วยตอบคำถามไม่จำกัดจำนวน 🧠
              </p>
            </div>

            {isHost && (
              <button
                onClick={onAutoBalanceTeams}
                className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-extrabold text-xs rounded-xl shadow-md border border-cyan-400 flex items-center gap-1.5 active:scale-95 transition-all"
              >
                <span>⚖️</span> จัดทีมสมดุลอัตโนมัติ (Auto-Balance)
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {TEAM_PRESETS.map((team) => {
              const teamPlayers = players.filter(p => p.teamId === team.id);
              const driver = teamPlayers.find(p => p.role === 'DRIVER');
              const supporters = teamPlayers.filter(p => p.role === 'SUPPORT');
              const isMyTeam = (myPlayer?.teamId || selectedTeam) === team.id;

              return (
                <div
                  key={team.id}
                  className={`bg-gradient-to-b ${team.bg} border-2 ${
                    isMyTeam ? `${team.border} shadow-[0_0_20px_rgba(255,255,255,0.1)] ring-2 ring-white/30` : 'border-slate-800 opacity-90'
                  } rounded-2xl p-4 flex flex-col justify-between transition-all`}
                >
                  {/* Team Header */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{team.icon}</span>
                        <span className={`font-extrabold text-sm ${team.textColor}`}>{team.name}</span>
                      </div>
                      {isMyTeam && (
                        <span className="px-2 py-0.5 rounded-full bg-white text-slate-950 font-extrabold text-[10px]">
                          ทีมของคุณ
                        </span>
                      )}
                    </div>

                    {/* Driver Slot */}
                    <div className="mb-3 bg-slate-950/60 border border-slate-800 rounded-xl p-2.5">
                      <div className="text-[11px] font-bold text-amber-400 mb-1 flex items-center justify-between">
                        <span>🎮 พลขับ (Driver)</span>
                        {driver && <span className="text-[10px] text-slate-400">{driver.tankArchetype}</span>}
                      </div>
                      {driver ? (
                        <div className="flex items-center justify-between">
                          <div className="font-bold text-xs text-white truncate max-w-[120px]">
                            {driver.name} {driver.id === myPlayerId && '(คุณ)'}
                          </div>
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
                        </div>
                      ) : (
                        <button
                          onClick={() => handleUpdateTank(selectedArchetype, team.color, 'DRIVER', team.id)}
                          className="w-full py-1.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 rounded-lg text-xs font-bold text-amber-300 transition-all text-center"
                        >
                          + เข้าเป็นคนขับ
                        </button>
                      )}
                    </div>

                    {/* Supporters Slot */}
                    <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-2.5">
                      <div className="text-[11px] font-bold text-cyan-400 mb-1 flex items-center justify-between">
                        <span>🧠 ผู้ช่วยตอบคำถาม (Support)</span>
                        <span className="text-[10px] text-slate-400">{supporters.length} คน</span>
                      </div>
                      {supporters.length > 0 ? (
                        <div className="space-y-1 max-h-20 overflow-y-auto pr-1">
                          {supporters.map((sup) => (
                            <div key={sup.socketId} className="flex items-center justify-between text-xs text-slate-200">
                              <span className="truncate max-w-[120px]">{sup.name} {sup.id === myPlayerId && '(คุณ)'}</span>
                              <span className="w-2 h-2 rounded-full bg-cyan-400" />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-[11px] text-slate-500 italic mb-1">ยังไม่มีผู้ช่วย</div>
                      )}
                      
                      {(!isMyTeam || selectedRole !== 'SUPPORT') && (
                        <button
                          onClick={() => handleUpdateTank(selectedArchetype, team.color, 'SUPPORT', team.id)}
                          className="w-full mt-1.5 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/50 rounded-lg text-xs font-bold text-cyan-300 transition-all text-center"
                        >
                          + เข้าร่วมช่วยตอบ
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Team Switch Footer */}
                  {isMyTeam && (
                    <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-between text-xs">
                      <span className="text-slate-400">บทบาทของคุณ:</span>
                      <button
                        onClick={() => handleUpdateTank(
                          selectedArchetype,
                          team.color,
                          selectedRole === 'DRIVER' ? 'SUPPORT' : 'DRIVER',
                          team.id
                        )}
                        className="font-bold text-amber-300 hover:text-amber-200 underline text-[11px]"
                      >
                        สลับเป็น {selectedRole === 'DRIVER' ? 'ผู้ช่วยตอบ 🧠' : 'คนขับ 🎮'}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Tank Customization */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Tank Archetype Selector */}
          <div className="bg-slate-900/90 border-2 border-slate-800 p-5 rounded-3xl shadow-lg">
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-amber-400 mb-4 flex items-center gap-2">
              <Crosshair className="w-4 h-4" /> 1. เลือกรุ่นรถถัง (Tank Class)
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {TANK_PRESETS.map((t) => {
                const isSelected = selectedArchetype === t.type;
                return (
                  <button
                    key={t.type}
                    onClick={() => handleUpdateTank(t.type, selectedColor, selectedRole, selectedTeam)}
                    className={`p-4 rounded-2xl border-2 text-left transition-all relative overflow-hidden ${
                      isSelected
                        ? 'bg-amber-950/70 border-amber-400 text-white shadow-[0_0_20px_rgba(245,158,11,0.25)]'
                        : 'bg-slate-800/60 border-slate-700/80 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-2xl">{t.icon}</div>
                      {isSelected && (
                        <span className="w-5 h-5 rounded-full bg-amber-500 text-black flex items-center justify-center font-bold text-xs">
                          ✓
                        </span>
                      )}
                    </div>
                    <div className="font-extrabold text-sm text-amber-300">{t.nameTh}</div>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">{t.desc}</p>
                    
                    {/* Stats bar */}
                    <div className="flex items-center gap-3 mt-3 pt-2 border-t border-slate-700/60 text-xs">
                      <span className="text-rose-400 font-bold">❤️ {t.hp} HP</span>
                      <span className="text-cyan-400 font-bold">⚡ {t.speed}</span>
                      <span className="text-amber-400 font-bold">💥 {t.damage} DMG</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tank Color Selector (in FFA mode) */}
          {!isSquadMode && (
            <div className="bg-slate-900/90 border-2 border-slate-800 p-5 rounded-3xl shadow-lg">
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-amber-400 mb-4 flex items-center gap-2">
                <Sparkles className="w-4 h-4" /> 2. เลือกสีรถถัง (Tank Paint)
              </h2>
              <div className="flex flex-wrap gap-3">
                {COLORS.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => handleUpdateTank(selectedArchetype, c.value, selectedRole, selectedTeam)}
                    className={`flex items-center gap-2.5 px-3.5 py-2 rounded-2xl border-2 transition-all ${
                      selectedColor === c.value
                        ? 'border-white bg-slate-800 shadow-md scale-105'
                        : 'border-slate-700 bg-slate-900 hover:border-slate-500'
                    }`}
                  >
                    <span
                      className="w-4 h-4 rounded-full border border-white/40 shadow"
                      style={{ backgroundColor: c.value }}
                    />
                    <span className="text-xs font-bold text-slate-200">{c.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Right: Players in Room & Match Control */}
        <div className="lg:col-span-5 space-y-6">
          
          <div className="bg-slate-900/90 border-2 border-slate-800 p-5 rounded-3xl shadow-lg">
            <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Users className="w-4 h-4 text-cyan-400" /> รายชื่อผู้เล่น ({players.length}/{roomConfig?.maxTanks || 6})
              </h2>
              {isHost && (
                <button
                  onClick={() => onAddBot('MEDIUM')}
                  className="px-3 py-1.5 bg-indigo-950 hover:bg-indigo-900 border border-indigo-500/50 rounded-xl text-xs font-bold text-indigo-300 flex items-center gap-1.5 transition-all"
                >
                  <Bot className="w-3.5 h-3.5" /> + เพิ่ม AI Bot
                </button>
              )}
            </div>

            {/* Players List */}
            <div className="space-y-2.5 mb-6 max-h-72 overflow-y-auto pr-1">
              {players.map((p) => {
                const isMe = p.id === myPlayerId || p.socketId === myPlayerId;
                const teamPreset = TEAM_PRESETS.find(t => t.id === p.teamId);

                return (
                  <div
                    key={p.socketId}
                    className={`flex items-center justify-between p-3 rounded-2xl border ${
                      isMe
                        ? 'bg-amber-950/40 border-amber-500/60'
                        : 'bg-slate-800/60 border-slate-700/60'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="w-4 h-4 rounded-full border border-white/50 shadow shrink-0"
                        style={{ backgroundColor: p.tankColor }}
                      />
                      <div>
                        <div className="font-bold text-sm text-white flex items-center gap-1.5">
                          {p.name}
                          {p.isHost && <Crown className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />}
                          {isMe && <span className="text-xs text-amber-400 font-normal">(คุณ)</span>}
                        </div>
                        <div className="text-xs text-slate-400">
                          {isSquadMode && teamPreset && (
                            <span className={`font-bold mr-1.5 ${teamPreset.textColor}`}>
                              [{teamPreset.name.split(' ')[0]}]
                            </span>
                          )}
                          {p.role === 'DRIVER' ? 'พลขับรถถัง' : 'หน่วยตอบคำถาม'} • {p.tankArchetype}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {p.isReady ? (
                        <span className="px-2.5 py-1 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-600/50 text-xs font-bold flex items-center gap-1">
                          <Check className="w-3 h-3" /> พร้อม
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-500 text-xs font-bold">
                          กำลังเลือก
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Ready / Start Buttons */}
            <div className="space-y-3 pt-3 border-t border-slate-800">
              {isHost ? (
                <button
                  onClick={onStartGame}
                  className="w-full py-4 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-extrabold text-base rounded-2xl shadow-[0_0_30px_rgba(245,158,11,0.4)] flex items-center justify-center gap-2 active:scale-98 transition-all"
                >
                  <Play className="w-5 h-5 fill-slate-950" /> เริ่มการประลองทันที (START BATTLE)
                </button>
              ) : (
                <button
                  onClick={() => onSetReady(!myPlayer?.isReady)}
                  className={`w-full py-4 font-extrabold text-base rounded-2xl transition-all shadow-lg flex items-center justify-center gap-2 ${
                    myPlayer?.isReady
                      ? 'bg-slate-800 border-2 border-emerald-500 text-emerald-400'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  }`}
                >
                  <Check className="w-5 h-5" /> {myPlayer?.isReady ? 'ยกเลิกพร้อม' : 'กดพร้อมเล่น'}
                </button>
              )}

              <p className="text-center text-xs text-slate-500">
                {isHost ? '🎮 หัวหน้าห้องสามารถกดเริ่มได้เมื่อมีรถถังพร้อม' : '⏳ รอหัวหน้าห้องกดเริ่มเกม...'}
              </p>
            </div>

          </div>

          {/* Quick Help Card */}
          <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-3xl text-xs text-slate-400 space-y-1.5 leading-relaxed">
            <div className="font-bold text-amber-400">💡 กติกาโหมดทีมเวิร์ก (Squad Co-op):</div>
            <div>• <strong className="text-amber-300">คนขับ 🎮</strong> วิ่งเก็บกล่องคำถาม <strong className="text-yellow-300">[?]</strong> บนแมพ</div>
            <div>• คำถามจะ <strong className="text-cyan-300">เด้งไปที่หน้าจอของผู้ช่วยตอบคำถาม 🧠 เท่านั้น</strong></div>
            <div>• เมื่อผู้ช่วยตอบถูก กระสุนจะถูกส่งเข้าตัวรถถังของคนขับทันที! 🚀</div>
          </div>

        </div>

      </div>

    </div>
  );
};
