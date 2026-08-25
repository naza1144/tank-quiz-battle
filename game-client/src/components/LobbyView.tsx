import React, { useState } from 'react';
import { TankArchetype, PlayerRole, Player, RoomConfig } from '../types.js';
import { 
  Shield, 
  Zap, 
  Crosshair, 
  Play, 
  Check, 
  Users, 
  Sparkles, 
  Crown,
  Volume2,
  VolumeX,
  Music,
  Swords
} from 'lucide-react';
import { soundFx } from '../audio/soundFx.js';
import { 
  PixelTank, 
  PixelGamepad, 
  PixelBrain, 
  PixelShield, 
  PixelZap, 
  PixelCrosshair, 
  PixelFlame, 
  PixelLeaf, 
  PixelCrown, 
  PixelScale, 
  PixelStar, 
  PixelCrate, 
  PixelAmmo,
  PixelSpeaker,
  PixelMusic
} from './PixelIcons.js';

interface LobbyViewProps {
  roomConfig: RoomConfig | null;
  players: Player[];
  myPlayerId: string;
  isHost: boolean;
  onSelectTank: (archetype: TankArchetype, color: string, role: PlayerRole, teamId?: string) => void;
  onSetReady: (isReady: boolean) => void;
  onAutoBalanceTeams?: () => void;
  onStartGame: () => void;
  onLeaveRoom: () => void;
}

const TANK_PRESETS: {
  type: TankArchetype;
  nameTh: string;
  desc: string;
  hp: number;
  hpBlocks: string;
  speed: string;
  speedBlocks: string;
  damage: number;
  damageBlocks: string;
  icon: React.ReactNode;
}[] = [
  {
    type: 'STANDARD',
    nameTh: 'STANDARD (สมดุล)',
    desc: 'เกราะ 3 HP สมดุลรอบด้าน ยิงกระสุนพิเศษทุกชนิดได้อย่างมีประสิทธิภาพ',
    hp: 3,
    hpBlocks: '■■■□□',
    speed: 'MEDIUM',
    speedBlocks: '■■■□',
    damage: 1,
    damageBlocks: '■□□□',
    icon: <PixelShield size={28} color="#3b82f6" />
  },
  {
    type: 'SCOUT',
    nameTh: 'SCOUT (สายสปีด)',
    desc: 'เร็วที่สุดในเกม จุกระสุน 8 นัด! คอมโบเทพกับ RAPID 💥 และ CRYO ❄️',
    hp: 2,
    hpBlocks: '■■□□□',
    speed: 'TURBO',
    speedBlocks: '■■■■',
    damage: 1,
    damageBlocks: '■□□□',
    icon: <PixelZap size={28} color="#facc15" />
  },
  {
    type: 'HEAVY',
    nameTh: 'HEAVY (เกราะเหล็ก)',
    desc: 'เกราะหนาพิเศษ 5 HP ทนทาน ยืนชนได้นาน เหมาะกับ EXPLOSIVE 💣 และ HEAL 💚',
    hp: 5,
    hpBlocks: '■■■■■',
    speed: 'SLOW',
    speedBlocks: '■■□□',
    damage: 1.5,
    damageBlocks: '■■□□',
    icon: <PixelTank size={28} color="#a855f7" />
  },
  {
    type: 'SNIPER',
    nameTh: 'SNIPER (สไนเปอร์)',
    desc: 'กระสุนเร็วยิ่งยวด ยิงไกลแม่นยำ เหมาะกับ AP ⚡ ทะลวงชิ่ง และ CRYO ❄️ สตั๊นไกล',
    hp: 2,
    hpBlocks: '■■□□□',
    speed: 'FAST',
    speedBlocks: '■■■□',
    damage: 1.5,
    damageBlocks: '■■□□',
    icon: <PixelCrosshair size={28} color="#ef4444" />
  }
];

const COLORS = [
  { name: 'YELLOW', value: '#eab308' },
  { name: 'GREEN', value: '#22c55e' },
  { name: 'BLUE', value: '#3b82f6' },
  { name: 'RED', value: '#ef4444' },
  { name: 'PURPLE', value: '#a855f7' },
  { name: 'CYAN', value: '#06b6d4' }
];

export const TEAM_PRESETS: {
  id: string;
  name: string;
  nameTh: string;
  color: string;
  bg: string;
  border: string;
  badgeBg: string;
  textColor: string;
  icon: React.ReactNode;
}[] = [
  {
    id: 'team-1',
    name: 'RED SQUAD',
    nameTh: 'ทีมแดงเพลิง',
    color: '#ef4444',
    bg: 'bg-rose-950/80',
    border: 'border-rose-500',
    badgeBg: 'bg-rose-600 text-white',
    textColor: 'text-rose-400',
    icon: <PixelFlame size={20} color="#ef4444" />
  },
  {
    id: 'team-2',
    name: 'BLUE SQUAD',
    nameTh: 'ทีมน้ำเงินพายุ',
    color: '#3b82f6',
    bg: 'bg-blue-950/80',
    border: 'border-blue-500',
    badgeBg: 'bg-blue-600 text-white',
    textColor: 'text-blue-400',
    icon: <PixelZap size={20} color="#3b82f6" />
  },
  {
    id: 'team-3',
    name: 'GREEN SQUAD',
    nameTh: 'ทีมเขียวมรกต',
    color: '#22c55e',
    bg: 'bg-emerald-950/80',
    border: 'border-emerald-500',
    badgeBg: 'bg-emerald-600 text-white',
    textColor: 'text-emerald-400',
    icon: <PixelLeaf size={20} color="#22c55e" />
  },
  {
    id: 'team-4',
    name: 'YELLOW SQUAD',
    nameTh: 'ทีมเหลืองสายฟ้า',
    color: '#eab308',
    bg: 'bg-amber-950/80',
    border: 'border-amber-500',
    badgeBg: 'bg-amber-500 text-black',
    textColor: 'text-amber-400',
    icon: <PixelCrown size={20} color="#fbbf24" />
  },
  {
    id: 'team-5',
    name: 'PURPLE SQUAD',
    nameTh: 'ทีมม่วงดารา',
    color: '#a855f7',
    bg: 'bg-purple-950/80',
    border: 'border-purple-500',
    badgeBg: 'bg-purple-600 text-white',
    textColor: 'text-purple-400',
    icon: <PixelShield size={20} color="#a855f7" />
  },
  {
    id: 'team-6',
    name: 'CYAN SQUAD',
    nameTh: 'ทีมฟ้าไฮเปอร์',
    color: '#06b6d4',
    bg: 'bg-cyan-950/80',
    border: 'border-cyan-500',
    badgeBg: 'bg-cyan-500 text-black',
    textColor: 'text-cyan-300',
    icon: <PixelCrosshair size={20} color="#06b6d4" />
  }
];

export const LobbyView: React.FC<LobbyViewProps> = ({
  roomConfig,
  players,
  myPlayerId,
  isHost,
  onSelectTank,
  onSetReady,
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
  const [isBgmMuted, setIsBgmMuted] = useState<boolean>(!soundFx.isBgmActive());

  const handleUpdateTank = (arch: TankArchetype, col: string, rol: PlayerRole, team: string) => {
    soundFx.playSelect();
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

  const handleToggleBgm = () => {
    const active = soundFx.toggleBgm();
    setIsBgmMuted(!active);
  };

  const isSquadMode = roomConfig?.mode === 'SQUAD';
  const maxTanks = Math.min(6, Math.max(2, roomConfig?.maxTanks || 4));
  const activeTeams = TEAM_PRESETS.slice(0, maxTanks);

  return (
    <div className="w-full max-w-6xl mx-auto p-2 sm:p-5 font-thai text-slate-100 space-y-4 sm:space-y-6">
      
      {/* Top Arcade Status Bar */}
      <div className="pixel-box bg-[#121624] p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-amber-500 border-2 border-black flex items-center justify-center shadow-[2px_2px_0_#000] shrink-0">
            <PixelGamepad size={24} color="#000000" />
          </div>
          <div>
            <h1 className="font-arcade text-xs sm:text-sm text-amber-400 truncate max-w-[200px] sm:max-w-none">
              {roomConfig?.name || 'TANK BATTLE ROOM'}
            </h1>
            <div className="font-arcade text-[8px] sm:text-[9px] text-slate-400 flex flex-wrap items-center gap-1.5 mt-0.5">
              <span className={`px-1.5 py-0.5 border border-black ${
                isSquadMode 
                  ? 'bg-cyan-950 text-cyan-300' 
                  : 'bg-amber-950 text-amber-300'
              }`}>
                {isSquadMode ? `SQUAD (${maxTanks} TEAMS)` : `FFA (${maxTanks} TANKS)`}
              </span>
              <span className="px-1.5 py-0.5 border border-slate-700 bg-black text-amber-300">
                📚 {roomConfig?.selectedSubject && roomConfig.selectedSubject !== 'ALL' ? roomConfig.selectedSubject : 'ALL SUBJECTS'}
              </span>
              <span>• CAP: 60+ PLAYERS</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={handleToggleBgm}
            className={`p-2 arcade-btn ${isBgmMuted ? 'arcade-btn-slate' : 'arcade-btn-cyan'}`}
            title="เปิด/ปิดเพลงประกอบ 8-bit"
          >
            <PixelMusic size={14} color={isBgmMuted ? '#94a3b8' : '#000000'} />
          </button>
          
          <button
            onClick={handleToggleSound}
            className={`p-2 arcade-btn ${isMuted ? 'arcade-btn-rose' : 'arcade-btn-emerald'}`}
            title="เปิด/ปิดเสียงเอฟเฟกต์"
          >
            <PixelSpeaker size={14} color={isMuted ? '#ffffff' : '#000000'} isMuted={isMuted} />
          </button>
          
          <button
            onClick={() => {
              soundFx.playSelect();
              onLeaveRoom();
            }}
            className="px-2.5 py-2 arcade-btn arcade-btn-slate font-arcade text-[9px]"
          >
            EXIT
          </button>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════════ */}
      {/* 1. SQUAD / TEAM SELECTION BOARD (For Squad Mode: 4 or 6 Teams)         */}
      {/* ════════════════════════════════════════════════════════════════════════ */}
      {isSquadMode && (
        <div className="pixel-box bg-[#151a2d] p-3 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-2.5 border-b-2 border-slate-800">
            <div>
              <h2 className="font-arcade text-xs text-cyan-400 flex items-center gap-1.5">
                <PixelStar size={10} color="#22d3ee" />
                <span>SQUAD FORMATION ({maxTanks} TEAMS CO-OP)</span>
                <PixelStar size={10} color="#22d3ee" />
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                <span>รถถัง 1 คันต่อทีม</span>
                <PixelCrosshair size={12} color="#f59e0b" />
                <span>• ผู้ช่วยตอบคำถามโหวตเสียงส่วนมากไม่จำกัด</span>
              </p>
            </div>

            {isHost && (
              <button
                onClick={() => {
                  soundFx.playSelect();
                  onAutoBalanceTeams?.();
                }}
                className="px-3 py-1.5 sm:px-4 sm:py-2 arcade-btn arcade-btn-cyan font-arcade text-[8px] sm:text-[9px] flex items-center gap-1.5 cursor-pointer"
              >
                <PixelScale size={12} color="#000000" />
                <span>AUTO-BALANCE ({maxTanks} TEAMS)</span>
              </button>
            )}
          </div>

          {/* SQUAD GRID: 4 Teams (2x2 / 1x4) or 6 Teams (2x3 / 3x2) */}
          <div className={`grid gap-2.5 sm:gap-3 ${
            maxTanks === 6 
              ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' 
              : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
          }`}>
            {activeTeams.map((team) => {
              const teamPlayers = players.filter(p => p.teamId === team.id);
              const driver = teamPlayers.find(p => p.role === 'DRIVER');
              const supporters = teamPlayers.filter(p => p.role === 'SUPPORT');
              const isMyTeam = (myPlayer?.teamId || selectedTeam) === team.id;

              return (
                <div
                  key={team.id}
                  className={`border-2 sm:border-4 ${
                    isMyTeam ? 'border-amber-400 shadow-[3px_3px_0_#f59e0b]' : 'border-black'
                  } ${team.bg} p-2.5 sm:p-3 flex flex-col justify-between`}
                >
                  {/* Team Header */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        {team.icon}
                        <span className={`font-arcade text-[11px] ${team.textColor}`}>{team.name}</span>
                      </div>
                      {isMyTeam && (
                        <span className="px-1.5 py-0.5 bg-amber-400 text-black font-arcade text-[8px]">
                          YOU
                        </span>
                      )}
                    </div>

                    {/* Driver Slot */}
                    <div className="mb-2 bg-black/70 border-2 border-slate-700 p-2">
                      <div className="font-arcade text-[9px] text-amber-400 mb-1 flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          <PixelGamepad size={12} color="#fbbf24" /> DRIVER
                        </span>
                        {driver && <span className="text-[8px] text-slate-400">{driver.tankArchetype}</span>}
                      </div>
                      {driver ? (
                        <div className="flex items-center justify-between">
                          <div className="font-bold text-xs text-white truncate max-w-[120px]">
                            {driver.name} {driver.id === myPlayerId && '(YOU)'}
                          </div>
                          <span className="w-2 h-2 bg-emerald-400 shadow-[0_0_6px_#34d399]" />
                        </div>
                      ) : (
                        <button
                          onClick={() => handleUpdateTank(selectedArchetype, team.color, 'DRIVER', team.id)}
                          className="w-full py-2 sm:py-1.5 arcade-btn arcade-btn-amber font-arcade text-[9px] text-center min-h-[36px] flex items-center justify-center cursor-pointer"
                        >
                          + BE DRIVER (เป็นคนขับ)
                        </button>
                      )}
                    </div>

                    {/* Supporters Slot */}
                    <div className="bg-black/70 border-2 border-slate-700 p-2">
                      <div className="font-arcade text-[9px] text-cyan-400 mb-1 flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          <PixelBrain size={12} color="#22d3ee" /> SQUAD ({supporters.length})
                        </span>
                      </div>
                      {supporters.length > 0 ? (
                        <div className="space-y-1 max-h-20 overflow-y-auto pr-1">
                          {supporters.map((sup) => (
                            <div key={sup.socketId} className="flex items-center justify-between text-xs text-slate-200">
                              <span className="truncate max-w-[120px]">{sup.name} {sup.id === myPlayerId && '(YOU)'}</span>
                              <span className="w-1.5 h-1.5 bg-cyan-400" />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-[11px] text-slate-400 italic py-1">
                          ยังไม่มีผู้ช่วย
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Join Squad as Support Button */}
                  <div className="mt-2.5 pt-2 border-t border-black/40">
                    <button
                      onClick={() => handleUpdateTank(selectedArchetype, team.color, 'SUPPORT', team.id)}
                      className={`w-full py-2 text-[9px] font-arcade text-center border-2 transition-all cursor-pointer min-h-[36px] flex items-center justify-center ${
                        isMyTeam && selectedRole === 'SUPPORT'
                          ? 'bg-cyan-500 text-black border-white font-bold'
                          : 'bg-black/80 text-slate-200 border-slate-700 hover:border-cyan-400'
                      }`}
                    >
                      {isMyTeam && selectedRole === 'SUPPORT' ? '✓ YOUR SQUAD (ทีมของคุณ)' : '+ JOIN SQUAD (เข้าร่วมโหวต)'}
                    </button>
                  </div>

                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════ */}
      {/* 2. FFA 6-COMBATANT ARENA GRID (For Free-For-All Mode: 6 Tanks)          */}
      {/* ════════════════════════════════════════════════════════════════════════ */}
      {!isSquadMode && (
        <div className="pixel-box bg-[#151a2d] p-3 sm:p-5">
          <div className="flex items-center justify-between mb-3 pb-2 border-b-2 border-slate-800">
            <h2 className="font-arcade text-xs text-amber-400 flex items-center gap-2">
              <Swords className="w-4 h-4 text-amber-400" />
              <span>FFA COMBATANT ARENA ROSTER ({players.length}/{maxTanks} TANKS)</span>
            </h2>
            <span className="font-arcade text-[8px] px-2 py-0.5 bg-amber-950 text-amber-300 border border-amber-500">
              SOLO BATTLE ROYALE
            </span>
          </div>

          <div className={`grid gap-2.5 sm:gap-3 ${
            maxTanks === 6 
              ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' 
              : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
          }`}>
            {Array.from({ length: maxTanks }).map((_, slotIdx) => {
              const p = players[slotIdx];
              const isMe = p?.id === myPlayerId || p?.socketId === myPlayerId;
              const slotColor = COLORS[slotIdx % COLORS.length];

              if (p) {
                return (
                  <div
                    key={p.socketId}
                    className={`p-3 border-2 sm:border-4 bg-black/80 flex items-center justify-between ${
                      isMe ? 'border-amber-400 shadow-[3px_3px_0_#f59e0b]' : 'border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <span
                        className="w-4 h-4 border border-black shrink-0 shadow"
                        style={{ backgroundColor: p.tankColor || slotColor.value }}
                      />
                      <div className="truncate">
                        <div className="font-bold text-xs text-white truncate flex items-center gap-1">
                          <span>{slotIdx + 1}P: {p.name}</span>
                          {p.isHost && <PixelCrown size={12} color="#fbbf24" />}
                          {isMe && <span className="text-[8px] text-amber-400 font-arcade">(YOU)</span>}
                        </div>
                        <div className="font-arcade text-[8px] text-slate-400 mt-0.5">
                          {p.tankArchetype} • {COLORS.find(c => c.value === p.tankColor)?.name || 'CUSTOM'}
                        </div>
                      </div>
                    </div>

                    <div>
                      {p.isReady ? (
                        <span className="px-2 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-500 font-arcade text-[8px]">
                          READY
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-slate-900 text-slate-500 border border-slate-700 font-arcade text-[8px]">
                          CHOOSING
                        </span>
                      )}
                    </div>
                  </div>
                );
              }

              // Empty Slot Placeholder
              return (
                <div
                  key={`empty-${slotIdx}`}
                  className="p-3 border-2 border-dashed border-slate-800 bg-black/30 flex items-center justify-between text-slate-600 font-arcade text-[9px]"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3.5 h-3.5 border border-slate-800 opacity-40"
                      style={{ backgroundColor: slotColor.value }}
                    />
                    <span>{slotIdx + 1}P: [ WAITING FOR TANKER... ]</span>
                  </div>
                  <span className="animate-pulse">OPEN</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════ */}
      {/* 3. TANK CLASS & COLOR SELECTION SECTION                                */}
      {/* ════════════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
        
        {/* Left: Tank Class Selector */}
        <div className="lg:col-span-7 space-y-4 sm:space-y-6">
          
          {/* If Squad Mode & Player is Support: Show Operator Status Card */}
          {isSquadMode && selectedRole === 'SUPPORT' ? (
            <div className="pixel-box bg-[#151a2d] p-4 sm:p-5">
              <div className="flex items-center gap-3 mb-3 border-b-2 border-slate-800 pb-3">
                <div className="w-10 h-10 bg-cyan-600 border-2 border-black flex items-center justify-center shadow-[2px_2px_0_#000]">
                  <PixelBrain size={24} color="#000000" />
                </div>
                <div>
                  <h2 className="font-arcade text-xs sm:text-sm text-cyan-400">
                    SQUAD SUPPORT OPERATOR
                  </h2>
                  <div className="text-xs text-slate-300 font-bold mt-0.5 font-thai">
                    คุณรับหน้าที่: <span className="text-cyan-300 font-extrabold">ผู้ช่วยตอบคำถามประจำทีม</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2.5 text-xs text-slate-300 leading-relaxed font-thai">
                <div className="p-3 bg-black/60 border-2 border-slate-800">
                  <div className="font-arcade text-[9px] text-amber-400 mb-1 flex items-center gap-1.5">
                    <PixelStar size={10} color="#fbbf24" />
                    <span>TANK SELECTION RESTRICTION:</span>
                  </div>
                  <div>
                    ในโหมดทีมเวิร์ก <strong className="text-amber-300">ประเภทและสีของรถถังจะถูกเลือกโดย พลขับ (Driver)</strong> ของทีมเท่านั้น
                  </div>
                </div>

                <div className="p-3 bg-black/60 border-2 border-slate-800">
                  <div className="font-arcade text-[9px] text-cyan-400 mb-1 flex items-center gap-1.5">
                    <PixelStar size={10} color="#22d3ee" />
                    <span>YOUR MISSION (ภารกิจของคุณ):</span>
                  </div>
                  <div className="space-y-1">
                    <div>• ประจำที่หน้าจอคอนโซลรอคำถามเมื่อคนขับวิ่งชนกล่องคำถาม <strong className="text-yellow-300">[?]</strong></div>
                    <div>• ช่วยกันวิเคราะห์และโหวตเลือกคำตอบที่ถูกต้องที่สุดภายใน 10-15 วินาที</div>
                    <div>• เมื่อหมดเวลา ระบบจะรวมเสียงโหวตส่วนใหญ่เพื่อเติมกระสุนให้คนขับทันที!</div>
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t-2 border-slate-800 flex flex-wrap items-center justify-between gap-2">
                <span className="font-arcade text-[8px] sm:text-[9px] text-slate-400">WANT TO DRIVE INSTEAD?</span>
                <button
                  onClick={() => handleUpdateTank(selectedArchetype, selectedColor, 'DRIVER', selectedTeam)}
                  className="px-3.5 py-1.5 arcade-btn arcade-btn-amber font-arcade text-[8px] sm:text-[9px] cursor-pointer flex items-center gap-1.5"
                >
                  <PixelGamepad size={12} color="#000000" />
                  <span>SWITCH TO DRIVER (สลับเป็นคนขับ)</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="pixel-box bg-[#151a2d] p-3 sm:p-5">
              <h2 className="font-arcade text-xs text-amber-400 mb-3 flex items-center gap-2">
                <Crosshair className="w-4 h-4" /> 1. SELECT TANK CLASS (สำหรับพลขับ)
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {TANK_PRESETS.map((t) => {
                  const isSelected = selectedArchetype === t.type;
                  return (
                    <button
                      key={t.type}
                      onClick={() => handleUpdateTank(t.type, selectedColor, selectedRole, selectedTeam)}
                      className={`p-3 border-2 sm:border-4 text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'border-amber-400 bg-amber-950/70 shadow-[3px_3px_0_#f59e0b]'
                          : 'border-black bg-black/60 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div>{t.icon}</div>
                        {isSelected && (
                          <span className="font-arcade text-[8px] bg-amber-400 text-black px-1.5 py-0.5">
                            ACTIVE
                          </span>
                        )}
                      </div>
                      <div className="font-arcade text-xs text-amber-300">{t.nameTh}</div>
                      <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{t.desc}</p>
                      
                      {/* Retro 8-bit Block Meters */}
                      <div className="space-y-0.5 mt-2 pt-2 border-t-2 border-slate-800 font-arcade text-[8px]">
                        <div className="flex justify-between text-rose-400">
                          <span>HP:</span> <span>{t.hpBlocks} ({t.hp})</span>
                        </div>
                        <div className="flex justify-between text-cyan-400">
                          <span>SPD:</span> <span>{t.speedBlocks} ({t.speed})</span>
                        </div>
                        <div className="flex justify-between text-amber-400">
                          <span>DMG:</span> <span>{t.damageBlocks} ({t.damage})</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tank Color Selector (in FFA mode) */}
          {!isSquadMode && (
            <div className="pixel-box bg-[#151a2d] p-3 sm:p-4">
              <h2 className="font-arcade text-xs text-amber-400 mb-2.5 flex items-center gap-2">
                <Sparkles className="w-4 h-4" /> 2. SELECT TANK COLOR ({COLORS.length} COLORS)
              </h2>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {COLORS.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => handleUpdateTank(selectedArchetype, c.value, selectedRole, selectedTeam)}
                    className={`flex items-center justify-center gap-1.5 p-2 border-2 cursor-pointer ${
                      selectedColor === c.value
                        ? 'border-white bg-slate-800 shadow-[2px_2px_0_#fff]'
                        : 'border-black bg-black/80 hover:border-slate-600'
                    }`}
                  >
                    <span
                      className="w-3 h-3 border border-black shadow shrink-0"
                      style={{ backgroundColor: c.value }}
                    />
                    <span className="font-arcade text-[8px] text-slate-200">{c.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Right: Roster & Match Control */}
        <div className="lg:col-span-5 space-y-4 sm:space-y-6">
          
          <div className="pixel-box bg-[#151a2d] p-3 sm:p-5">
            <div className="flex items-center justify-between mb-3 border-b-2 border-slate-800 pb-2">
              <h2 className="font-arcade text-xs text-slate-300 flex items-center gap-2">
                <Users className="w-4 h-4 text-cyan-400" /> SQUAD ROSTER ({players.length} PLAYERS)
              </h2>
            </div>

            {/* Players List */}
            <div className="space-y-1.5 mb-4 max-h-64 overflow-y-auto pr-1">
              {players.map((p) => {
                const isMe = p.id === myPlayerId || p.socketId === myPlayerId;
                const teamPreset = TEAM_PRESETS.find(t => t.id === p.teamId);

                return (
                  <div
                    key={p.socketId}
                    className={`flex items-center justify-between p-2 border-2 ${
                      isMe
                        ? 'border-amber-400 bg-amber-950/40'
                        : 'border-black bg-black/60'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span
                        className="w-3 h-3 border border-black shadow shrink-0"
                        style={{ backgroundColor: p.tankColor }}
                      />
                      <div className="truncate">
                        <div className="font-bold text-xs text-white flex items-center gap-1 truncate">
                          <span>{p.name}</span>
                          {p.isHost && <PixelCrown size={10} color="#fbbf24" />}
                          {isMe && <span className="font-arcade text-[8px] text-amber-400">(YOU)</span>}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {isSquadMode && teamPreset && (
                            <span className={`font-arcade text-[8px] mr-1 ${teamPreset.textColor}`}>
                              [{teamPreset.name.split(' ')[0]}]
                            </span>
                          )}
                          {p.role === 'DRIVER' ? 'พลขับ' : 'หน่วยโหวต'} • {p.tankArchetype}
                        </div>
                      </div>
                    </div>

                    <div>
                      {p.isReady ? (
                        <span className="px-2 py-0.5 bg-emerald-950 text-emerald-400 border border-emerald-500 font-arcade text-[8px]">
                          READY
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-slate-900 text-slate-500 border border-slate-700 font-arcade text-[8px]">
                          CHOOSING
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Ready / Start Buttons */}
            <div className="space-y-2.5 pt-3 border-t-2 border-slate-800">
              {isHost ? (
                <button
                  onClick={() => {
                    soundFx.playStart();
                    onStartGame();
                  }}
                  className="w-full py-3.5 arcade-btn arcade-btn-amber font-arcade text-xs tracking-wider flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-black" /> START BATTLE (เริ่มการแข่งขัน)
                </button>
              ) : (
                <button
                  onClick={() => {
                    soundFx.playSelect();
                    onSetReady(!myPlayer?.isReady);
                  }}
                  className={`w-full py-3.5 arcade-btn font-arcade text-xs tracking-wider cursor-pointer ${
                    myPlayer?.isReady ? 'arcade-btn-slate' : 'arcade-btn-emerald'
                  }`}
                >
                  <Check className="w-4 h-4" /> {myPlayer?.isReady ? 'CANCEL READY' : 'READY (พร้อม)'}
                </button>
              )}

              <p className="text-center font-arcade text-[8px] text-slate-500 flex items-center justify-center gap-1">
                <PixelStar size={8} color="#64748b" />
                <span>{isHost ? 'HOST: PRESS START WHEN READY' : 'WAITING FOR HOST TO START'}</span>
                <PixelStar size={8} color="#64748b" />
              </p>
            </div>

          </div>

          {/* Quick Rules */}
          <div className="pixel-box bg-[#151a2d] p-3 text-xs text-slate-400 space-y-1 font-thai leading-relaxed">
            <div className="font-bold text-amber-400 font-arcade text-[9px] flex items-center gap-1.5">
              <PixelStar size={10} color="#fbbf24" />
              <span>MISSION INTEL:</span>
            </div>
            <div>• โหมด 6 คน: รองรับผู้เล่น 6 รถถัง หรือ 6 ทีม พร้อมกันในสมรภูมิเดียว</div>
            <div>• ชนกล่อง <strong className="text-yellow-300">[?]</strong> เพื่อรับโจทย์คำถามและเติมกระสุน</div>
          </div>

        </div>

      </div>

    </div>
  );
};
