import React, { useState } from 'react';
import { 
  BookOpen, 
  X, 
  Gamepad2, 
  Shield, 
  Zap, 
  Crosshair, 
  Sparkles, 
  Layers, 
  HelpCircle, 
  Target, 
  Flame, 
  RefreshCw, 
  Ghost, 
  Radio, 
  CheckCircle2, 
  Clock, 
  Cpu
} from 'lucide-react';
import { soundFx } from '../audio/soundFx.js';
import { 
  PixelGamepad, 
  PixelStar, 
  PixelShield, 
  PixelZap, 
  PixelCrosshair, 
  PixelBrain, 
  PixelCrate, 
  PixelAmmo, 
  PixelFlame 
} from './PixelIcons.js';

interface GameGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type GuideTab = 'RULES' | 'TANKS' | 'SYNERGY' | 'TERRAIN' | 'TIPS';

export const GameGuideModal: React.FC<GameGuideModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<GuideTab>('RULES');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in font-thai">
      <div className="pixel-box bg-[#0c101d] border-4 border-amber-500 w-full max-w-4xl max-h-[92vh] flex flex-col shadow-[0_0_30px_rgba(245,158,11,0.3)] text-slate-100 overflow-hidden">
        
        {/* Modal Header */}
        <div className="bg-[#161c2e] border-b-2 border-amber-500 p-3 sm:p-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-amber-500 border-2 border-black flex items-center justify-center shadow-[2px_2px_0_#000]">
              <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-black" />
            </div>
            <div>
              <div className="font-arcade text-xs sm:text-sm text-amber-400 font-bold flex items-center gap-1.5">
                <PixelStar size={12} color="#fbbf24" />
                <span>FIELD MANUAL: TANK QUIZ BATTLE 1990</span>
              </div>
              <div className="text-[11px] sm:text-xs text-slate-400 font-mono">
                คู่มือการเล่นและระบบกลยุทธ์สนามรบฉบับสมบูรณ์
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              soundFx.playSelect();
              onClose();
            }}
            className="p-1.5 sm:p-2 arcade-btn arcade-btn-rose hover:scale-105 transition-transform"
            title="ปิดคู่มือ"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="bg-[#101424] border-b border-slate-800 px-2 sm:px-4 py-2 flex items-center gap-1.5 sm:gap-2 overflow-x-auto shrink-0 scrollbar-thin">
          <button
            onClick={() => {
              soundFx.playSelect();
              setActiveTab('RULES');
            }}
            className={`px-2.5 sm:px-3 py-1.5 arcade-btn text-[10px] sm:text-xs flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'RULES' ? 'arcade-btn-amber font-bold' : 'arcade-btn-slate opacity-75 hover:opacity-100'
            }`}
          >
            <PixelGamepad size={14} color={activeTab === 'RULES' ? '#000000' : '#cbd5e1'} />
            <span>1. กฎกติกา & โหมด</span>
          </button>

          <button
            onClick={() => {
              soundFx.playSelect();
              setActiveTab('TANKS');
            }}
            className={`px-2.5 sm:px-3 py-1.5 arcade-btn text-[10px] sm:text-xs flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'TANKS' ? 'arcade-btn-cyan font-bold' : 'arcade-btn-slate opacity-75 hover:opacity-100'
            }`}
          >
            <PixelCrosshair size={14} color={activeTab === 'TANKS' ? '#000000' : '#cbd5e1'} />
            <span>2. รถถัง & ควบคุม</span>
          </button>

          <button
            onClick={() => {
              soundFx.playSelect();
              setActiveTab('SYNERGY');
            }}
            className={`px-2.5 sm:px-3 py-1.5 arcade-btn text-[10px] sm:text-xs flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'SYNERGY' ? 'arcade-btn-emerald font-bold' : 'arcade-btn-slate opacity-75 hover:opacity-100'
            }`}
          >
            <PixelZap size={14} color={activeTab === 'SYNERGY' ? '#000000' : '#cbd5e1'} />
            <span>3. ท่าไม้ตาย & เสบียง</span>
          </button>

          <button
            onClick={() => {
              soundFx.playSelect();
              setActiveTab('TERRAIN');
            }}
            className={`px-2.5 sm:px-3 py-1.5 arcade-btn text-[10px] sm:text-xs flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'TERRAIN' ? 'arcade-btn-rose font-bold' : 'arcade-btn-slate opacity-75 hover:opacity-100'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>4. แผนที่ & ไอเทม</span>
          </button>

          <button
            onClick={() => {
              soundFx.playSelect();
              setActiveTab('TIPS');
            }}
            className={`px-2.5 sm:px-3 py-1.5 arcade-btn text-[10px] sm:text-xs flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'TIPS' ? 'arcade-btn-purple font-bold' : 'arcade-btn-slate opacity-75 hover:opacity-100'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>5. กลยุทธ์โปร</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 text-xs sm:text-sm space-y-4">
          
          {/* TAB 1: RULES & MODES */}
          {activeTab === 'RULES' && (
            <div className="space-y-4 animate-fade-in">
              <div className="pixel-box bg-amber-950/40 border-2 border-amber-500/60 p-3.5">
                <div className="font-arcade text-amber-300 font-bold text-xs sm:text-sm mb-1.5 flex items-center gap-2">
                  <span>🎯 หัวใจสำคัญ: กระสุนได้จากการทำ Quiz 100%</span>
                </div>
                <p className="text-slate-300 text-xs leading-relaxed">
                  เกมนี้ไม่มีกระสุนแจกฟรีหรือรีเจนอัตโนมัติ! การจะได้กระสุนมาบรรจุในปืนใหญ่ รถถังจะต้องวิ่งชนกล่องคำถาม <span className="text-amber-300 font-bold font-mono">[?]</span> ในสนาม และตอบคำถาม Multiple Choice ให้ถูกต้องเท่านั้น
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {/* SQUAD Mode */}
                <div className="pixel-box bg-[#121626] border-2 border-cyan-500/50 p-3.5 flex flex-col justify-between">
                  <div>
                    <div className="font-arcade text-cyan-300 font-bold text-xs mb-2 flex items-center gap-2">
                      <PixelBrain size={16} color="#22d3ee" />
                      <span>โหมด SQUAD (ทีมเวิร์ก 6 ทีม)</span>
                    </div>
                    <p className="text-slate-300 text-xs mb-2">
                      แบ่งการเล่นเป็น 6 ทีม ทีมละ 2 บทบาท:
                    </p>
                    <ul className="space-y-1.5 text-xs text-slate-300">
                      <li className="flex items-start gap-1.5">
                        <span className="text-cyan-400 font-bold">🚗 พลขับ (Driver):</span> ขับรถถัง 1 คันต่อทีม หลบกระสุน ยิงต่อสู้ และวิ่งชนกล่องคำถาม
                      </li>
                      <li className="flex items-start gap-1.5">
                        <span className="text-amber-400 font-bold">🧠 ผู้ช่วย (Supporter):</span> คำถามจะเด้งขึ้นหน้าจอ ช่วยกันโหวตคำถามเพื่อส่งกระสุนและพลังให้พลขับ
                      </li>
                    </ul>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-800 text-[10px] text-cyan-200">
                    💡 โหวตข้อที่คนส่วนใหญ่ตอบถูก จะได้กระสุน + โบนัสคะแนน
                  </div>
                </div>

                {/* FFA Mode */}
                <div className="pixel-box bg-[#121626] border-2 border-rose-500/50 p-3.5 flex flex-col justify-between">
                  <div>
                    <div className="font-arcade text-rose-300 font-bold text-xs mb-2 flex items-center gap-2">
                      <PixelCrosshair size={16} color="#f43f5e" />
                      <span>โหมด FFA (Free For All เดี่ยวดวลเดี่ยว)</span>
                    </div>
                    <p className="text-slate-300 text-xs mb-2">
                      ผู้เล่นทุกคนขับรถถังของตัวเอง ชนกล่องคำถามแล้วตอบโจทย์บนหน้าจอตัวเองทันที
                    </p>
                    <ul className="space-y-1.5 text-xs text-slate-300">
                      <li className="flex items-start gap-1.5">
                        <span className="text-rose-400 font-bold">💥 รถถังเดี่ยว:</span> สู้กันทุกคน ใครอยู่รอดคนสุดท้ายหรือคะแนนสูงสุดชนะ
                      </li>
                      <li className="flex items-start gap-1.5">
                        <span className="text-amber-400 font-bold">⚡ สปีดควิซ:</span> ตอบถูกได้กระสุนทันที ตอบผิดเสียเวลา
                      </li>
                    </ul>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-800 text-[10px] text-rose-200">
                    💡 เหมาะสำหรับการประลองความเร็วและการตอบสนองเฉพาะบุคคล
                  </div>
                </div>
              </div>

              {/* Time Limits by Difficulty */}
              <div className="pixel-box bg-[#131929] border border-slate-700 p-3">
                <div className="font-arcade text-xs text-slate-300 font-bold mb-2 flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>เวลานับถอยหลังตามระดับความยากของคำถาม:</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-emerald-950/60 border border-emerald-500/50 p-2 rounded">
                    <div className="text-[10px] text-emerald-400 font-bold font-arcade">🟢 EASY (ง่าย)</div>
                    <div className="text-sm font-arcade text-white mt-1">2 วินาที</div>
                    <div className="text-[9px] text-emerald-200">Speed Quiz ไวจัด</div>
                  </div>
                  <div className="bg-amber-950/60 border border-amber-500/50 p-2 rounded">
                    <div className="text-[10px] text-amber-400 font-bold font-arcade">⚡ MEDIUM (ปานกลาง)</div>
                    <div className="text-sm font-arcade text-white mt-1">5 วินาที</div>
                    <div className="text-[9px] text-amber-200">คิดไว วิเคราะห์ไว</div>
                  </div>
                  <div className="bg-rose-950/60 border border-rose-500/50 p-2 rounded">
                    <div className="text-[10px] text-rose-400 font-bold font-arcade">🔥 HARD (ยาก)</div>
                    <div className="text-sm font-arcade text-white mt-1">7 วินาที</div>
                    <div className="text-[9px] text-rose-200">โจทย์คำนวณซับซ้อน</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TANKS & CONTROLS */}
          {activeTab === 'TANKS' && (
            <div className="space-y-4 animate-fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Standard */}
                <div className="pixel-box bg-[#121626] border-2 border-emerald-500/50 p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-arcade text-emerald-400 font-bold text-xs">🟢 STANDARD (ทหารราบ)</span>
                    <span className="text-[10px] bg-emerald-900/60 px-1.5 py-0.5 text-emerald-300 font-mono">สมดุลรอบด้าน</span>
                  </div>
                  <p className="text-slate-300 text-xs mb-2">
                    เหมาะสำหรับมือใหม่ พลังชีวิตและความเร็วอยู่ในเกณฑ์มาตรฐาน คล่องตัวในทุกสนาม
                  </p>
                  <div className="grid grid-cols-3 gap-1 text-[10px] font-arcade text-slate-300">
                    <div>HP: <span className="text-emerald-400">■■■ (3)</span></div>
                    <div>SPD: <span className="text-cyan-400">■■■ (ปานกลาง)</span></div>
                    <div>DMG: <span className="text-rose-400">■ (1)</span></div>
                  </div>
                </div>

                {/* Scout */}
                <div className="pixel-box bg-[#121626] border-2 border-amber-500/50 p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-arcade text-amber-400 font-bold text-xs">🟡 SCOUT (ลาดตระเวน)</span>
                    <span className="text-[10px] bg-amber-900/60 px-1.5 py-0.5 text-amber-300 font-mono">ความเร็วสูง</span>
                  </div>
                  <p className="text-slate-300 text-xs mb-2">
                    เคลื่อนที่เร็วสูงสุด วิ่งฉกกล่องคำถามได้ไว เหมาะกับผู้เล่นสายพริ้ว แต่เลือดน้อย
                  </p>
                  <div className="grid grid-cols-3 gap-1 text-[10px] font-arcade text-slate-300">
                    <div>HP: <span className="text-amber-400">■■ (2)</span></div>
                    <div>SPD: <span className="text-cyan-400">■■■■■ (เร็วสุด)</span></div>
                    <div>DMG: <span className="text-rose-400">■ (1)</span></div>
                  </div>
                </div>

                {/* Heavy */}
                <div className="pixel-box bg-[#121626] border-2 border-rose-500/50 p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-arcade text-rose-400 font-bold text-xs">🔴 HEAVY (เกราะหนัก)</span>
                    <span className="text-[10px] bg-rose-900/60 px-1.5 py-0.5 text-rose-300 font-mono">ถึกทน ดาเมจแรง</span>
                  </div>
                  <p className="text-slate-300 text-xs mb-2">
                    เลือดสูงสุด 4 หน่วย และยิงแรง 2 DMG แลกกับความเร็วที่ช้าลง เหมาะกับการเฝ้าป้อม
                  </p>
                  <div className="grid grid-cols-3 gap-1 text-[10px] font-arcade text-slate-300">
                    <div>HP: <span className="text-rose-400">■■■■ (4)</span></div>
                    <div>SPD: <span className="text-cyan-400">■■ (ช้า)</span></div>
                    <div>DMG: <span className="text-rose-400">■■ (2)</span></div>
                  </div>
                </div>

                {/* Sniper */}
                <div className="pixel-box bg-[#121626] border-2 border-purple-500/50 p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-arcade text-purple-400 font-bold text-xs">🟣 SNIPER (ซุ่มยิง)</span>
                    <span className="text-[10px] bg-purple-900/60 px-1.5 py-0.5 text-purple-300 font-mono">ยิงไกล ทะลุสิ่งกีดขวาง</span>
                  </div>
                  <p className="text-slate-300 text-xs mb-2">
                    กระสุนพุ่งเร็วและทะลวงบล็อกอิฐได้ในนัดเดียว เล็งยิงระยะไกลจากพุ่มไม้ได้เฉียบคม
                  </p>
                  <div className="grid grid-cols-3 gap-1 text-[10px] font-arcade text-slate-300">
                    <div>HP: <span className="text-purple-400">■■ (2)</span></div>
                    <div>SPD: <span className="text-cyan-400">■■■ (ปานกลาง)</span></div>
                    <div>DMG: <span className="text-rose-400">■ (1)</span></div>
                  </div>
                </div>
              </div>

              {/* Controls Cheatsheet */}
              <div className="pixel-box bg-[#131929] border border-slate-700 p-3">
                <div className="font-arcade text-xs text-amber-300 font-bold mb-2">
                  🕹️ การควบคุม (Controls Guide)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="bg-black/50 p-2.5 border border-slate-800">
                    <div className="text-cyan-400 font-bold font-arcade mb-1">💻 คีย์บอร์ด (PC / Mac)</div>
                    <ul className="space-y-1 text-slate-300 text-[11px]">
                      <li>• <strong>[W][A][S][D]</strong> หรือ <strong>[ลูกศร]</strong> : เคลื่อนที่ 4 ทิศทาง</li>
                      <li>• <strong>[Spacebar]</strong> : ยิงกระสุนปืนใหญ่</li>
                      <li>• <strong>[E]</strong> : ปล่อยท่าไม้ตายเลเซอร์ (เมื่อเกจเต็ม)</li>
                    </ul>
                  </div>
                  <div className="bg-black/50 p-2.5 border border-slate-800">
                    <div className="text-amber-400 font-bold font-arcade mb-1">📱 หน้าจอสัมผัส (Mobile / Tablet)</div>
                    <ul className="space-y-1 text-slate-300 text-[11px]">
                      <li>• <strong>Virtual D-Pad (ซ้าย)</strong> : แตะลากนิ้ว 8 ทิศทางต่อเนื่อง</li>
                      <li>• <strong>[🔥 FIRE] (ขวา)</strong> : ปุ่มยิงกระสุนขนาดใหญ่</li>
                      <li>• <strong>[⚡ LASER] (บนขวา)</strong> : ปุ่มปล่อยไม้ตายเลเซอร์สีทองฟ้า</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: CO-OP SYNERGY & ULTIMATE */}
          {activeTab === 'SYNERGY' && (
            <div className="space-y-4 animate-fade-in">
              {/* Ultimate Laser */}
              <div className="pixel-box bg-gradient-to-r from-cyan-950/60 to-blue-950/60 border-2 border-cyan-400 p-4 shadow-[0_0_15px_rgba(34,211,238,0.2)]">
                <div className="font-arcade text-cyan-300 font-bold text-xs sm:text-sm mb-2 flex items-center gap-2">
                  <PixelZap size={18} color="#22d3ee" />
                  <span>⚡ ท่าไม้ตายร่วมมือ (Ultimate Synergy Beam)</span>
                </div>
                <p className="text-slate-200 text-xs mb-3 leading-relaxed">
                  เมื่อหน่วยสนับสนุนตอบคำถามถูกต้องต่อเนื่อง <strong className="text-amber-300 font-arcade">3 ข้อติด (Streak x3)</strong> เกจพลังงานจะเต็ม 100% ทันที พลขับสามารถกด <strong className="text-cyan-300">[E]</strong> หรือแตะปุ่ม <strong className="text-cyan-300">[⚡ LASER]</strong> เพื่อยิง:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="bg-black/40 p-2 border border-cyan-500/40 text-cyan-200">
                    💥 <strong>ระเบิดกำแพงอิฐทุกก้อน</strong> ในแนววิถีลำแสงราบเป็นหน้ากลอง
                  </div>
                  <div className="bg-black/40 p-2 border border-cyan-500/40 text-cyan-200">
                    ⚡ <strong>สร้างความเสียหาย 3 DMG ทะลวงเกราะ</strong> แก่ศัตรูทุกคันในแนวตรง
                  </div>
                </div>
              </div>

              {/* Supporter Airdrop Supply Drone */}
              <div className="pixel-box bg-[#121626] border-2 border-emerald-500/50 p-4">
                <div className="font-arcade text-emerald-300 font-bold text-xs mb-2 flex items-center gap-2">
                  <Radio className="w-4 h-4 text-emerald-400" />
                  <span>🛸 โดรนหย่อนเสบียงยุทธวิธี (Supporter Airdrop Supply)</span>
                </div>
                <p className="text-slate-300 text-xs mb-3">
                  ผู้ช่วยรบสามารถกดเลือกส่งโดรนเสบียงสนับสนุนพลขับได้จากหน้าจอ Console (คูลดาวน์ทีม 25 วินาที):
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="bg-emerald-950/40 border border-emerald-500/40 p-2.5">
                    <div className="font-arcade text-xs text-cyan-300 font-bold flex items-center gap-1.5 mb-1">
                      <span>🛡️ BARRIER SHIELD (4.5s)</span>
                    </div>
                    <div className="text-[11px] text-slate-300">
                      สร้างม่านพลังงานอมตะรอบตัวรถถังพลขับ ป้องกันกระสุนทุกชนิด 4.5 วินาที
                    </div>
                  </div>
                  <div className="bg-emerald-950/40 border border-emerald-500/40 p-2.5">
                    <div className="font-arcade text-xs text-emerald-300 font-bold flex items-center gap-1.5 mb-1">
                      <span>💚 REPAIR KIT (+1 HP)</span>
                    </div>
                    <div className="text-[11px] text-slate-300">
                      ซ่อมแซมและฟื้นฟูพลังชีวิตของรถถังพลขับทันที +1 HP (ไม่เกินหลอดเลือดสูงสุด)
                    </div>
                  </div>
                </div>
              </div>

              {/* Ghost Revival Protocol */}
              <div className="pixel-box bg-purple-950/60 border-2 border-purple-400 p-4 shadow-[0_0_15px_rgba(168,85,247,0.25)]">
                <div className="font-arcade text-purple-300 font-bold text-xs mb-2 flex items-center gap-2">
                  <Ghost className="w-4 h-4 text-purple-300" />
                  <span>👻 ระบบวิญญาณผู้ช่วยหลังตาย & ชุบชีวิต (Ghost Revival Protocol)</span>
                </div>
                <p className="text-slate-200 text-xs leading-relaxed mb-2">
                  ถ้ารถถังของทีมถูกยิงทำลายจนพัง ผู้เล่นทุกคนจะเข้าสู่สถานะ <strong className="text-purple-300 font-arcade">GHOST</strong> โดยหน้าจอผู้ช่วยจะมีโจทย์ท้าทายพิเศษขึ้นมา:
                </p>
                <div className="bg-black/50 p-2.5 border border-purple-500/40 text-xs text-purple-200">
                  ✨ <strong>ตอบคำถามท้าทายให้ถูก 2 ข้อติดกัน (Streak 2/2):</strong> รถถังจะ <strong className="text-amber-300">ฟื้นคืนชีพกลับสู่สนามรบ (Respawn)</strong> พร้อมพลังชีวิต 2 HP และม่านพลังอมตะ 4 วินาทีทันที! (สิทธิ์ชุบชีวิต 1 ครั้งต่อทีมต่อเกม)
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: TERRAIN & ITEMS */}
          {activeTab === 'TERRAIN' && (
            <div className="space-y-4 animate-fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="pixel-box bg-[#121626] border border-amber-700/60 p-3">
                  <div className="font-arcade text-amber-400 font-bold text-xs mb-1">🧱 กำแพงอิฐ (Brick Wall)</div>
                  <div className="text-xs text-slate-300">
                    สิ่งกีดขวางพื้นฐาน บดบังวิถีกระสุนและเส้นทางเดิน กระสุนธรรมดาสามารถยิงทำลายได้
                  </div>
                </div>

                <div className="pixel-box bg-[#121626] border border-slate-600 p-3">
                  <div className="font-arcade text-slate-200 font-bold text-xs mb-1">⛓️ กำแพงเหล็ก (Steel Wall)</div>
                  <div className="text-xs text-slate-300">
                    สิ่งกีดขวางระดับสูง ทำลายไม่ได้ และ<strong>กระสุนธรรมดาจะเด้งสะท้อน (Ricochet)</strong> ในทิศทางตรงข้าม
                  </div>
                </div>

                <div className="pixel-box bg-[#121626] border border-cyan-700/60 p-3">
                  <div className="font-arcade text-cyan-400 font-bold text-xs mb-1">🌊 คลองน้ำ (River Canal)</div>
                  <div className="text-xs text-slate-300">
                    คลองน้ำกั้นสนามรบ รถถังขับผ่านไม่ได้ แต่<strong>กระสุนปืนใหญ่สามารถยิงข้ามคลองได้</strong>
                  </div>
                </div>

                <div className="pixel-box bg-[#121626] border border-blue-400/60 p-3">
                  <div className="font-arcade text-blue-300 font-bold text-xs mb-1">❄️ ทางน้ำแข็ง (Ice Floor)</div>
                  <div className="text-xs text-slate-300">
                    พื้นน้ำแข็งลื่น รถถังขับผ่านแล้วจะสไลด์ตัวต่อเนื่องด้วยความเร็วสูง เบรกยากแต่หนีได้ไว
                  </div>
                </div>

                <div className="pixel-box bg-[#121626] border border-emerald-700/60 p-3 sm:col-span-2">
                  <div className="font-arcade text-emerald-400 font-bold text-xs mb-1">🌿 พุ่มไม้ป่าทึบ (Bush & Forest)</div>
                  <div className="text-xs text-slate-300">
                    ดงพุ่มไม้สำหรับการซุ่มโจมตี เมื่อรถถังขับเข้าไปจะพรางตัวจากการมองเห็นของศัตรู
                  </div>
                </div>
              </div>

              {/* Special Ammunition Types */}
              <div className="pixel-box bg-[#131929] border border-slate-700 p-3">
                <div className="font-arcade text-xs text-amber-300 font-bold mb-2">
                  💎 กระสุนพิเศษและเอฟเฟกต์ (Special Ammunition Tiers)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <div className="bg-cyan-950/40 p-2 border border-cyan-500/40">
                    <div className="text-cyan-300 font-bold font-arcade mb-1">❄️ CRYO (แช่แข็ง)</div>
                    <div className="text-slate-300 text-[11px]">ทำให้ศัตรูที่โดนยิงติดสถานะแช่แข็ง ขยับไม่ได้ 3 วินาที</div>
                  </div>
                  <div className="bg-amber-950/40 p-2 border border-amber-500/40">
                    <div className="text-amber-300 font-bold font-arcade mb-1">⚡ AP (เจาะเกราะ)</div>
                    <div className="text-slate-300 text-[11px]">ดาเมจ 2 หน่วย ทะลวงกำแพงอิฐและสิ่งกีดขวางฉับพลัน</div>
                  </div>
                  <div className="bg-rose-950/40 p-2 border border-rose-500/40">
                    <div className="text-rose-300 font-bold font-arcade mb-1">💥 EXPLOSIVE (ระเบิด)</div>
                    <div className="text-slate-300 text-[11px]">สร้างแรงระเบิดรอบทิศ ทำลายบล็อกอิฐเป็นวงกว้าง</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: PRO TIPS & TRICKS */}
          {activeTab === 'TIPS' && (
            <div className="space-y-3.5 animate-fade-in">
              <div className="pixel-box bg-[#121626] border-2 border-amber-500/40 p-3.5 flex items-start gap-3">
                <div className="p-2 bg-amber-500/20 text-amber-300 border border-amber-500 font-arcade text-xs">01</div>
                <div>
                  <div className="font-arcade text-amber-300 font-bold text-xs mb-1">โหวตมั่นใจคูณคะแนน (Confidence Betting)</div>
                  <div className="text-slate-300 text-xs leading-relaxed">
                    ผู้ช่วยรบที่มั่นใจในคำตอบสามารถกดปุ่ม <span className="text-amber-400 font-bold">"มั่นใจ (Confidence x2)"</span> ก่อนส่งคำตอบ หากตอบถูกจะได้รับโบนัสคะแนนคูณพิเศษและช่วยชาร์จกระสุนเกรด AP ให้ทีม!
                  </div>
                </div>
              </div>

              <div className="pixel-box bg-[#121626] border-2 border-cyan-500/40 p-3.5 flex items-start gap-3">
                <div className="p-2 bg-cyan-500/20 text-cyan-300 border border-cyan-500 font-arcade text-xs">02</div>
                <div>
                  <div className="font-arcade text-cyan-300 font-bold text-xs mb-1">สลับโหมดจอแก้ว CRT 1990 เรโทร</div>
                  <div className="text-slate-300 text-xs leading-relaxed">
                    ผู้เล่นสามารถกดปุ่ม <span className="text-cyan-400 font-bold font-arcade">[📺 CRT]</span> ที่แถบเมนูด้านบนได้ตลอดเวลา เพื่อเปิด/ปิดฟิลเตอร์เส้นสแกนไลน์ CRT และจอแก้วโค้งยุค 90 ตามความชอบ
                  </div>
                </div>
              </div>

              <div className="pixel-box bg-[#121626] border-2 border-emerald-500/40 p-3.5 flex items-start gap-3">
                <div className="p-2 bg-emerald-500/20 text-emerald-300 border border-emerald-500 font-arcade text-xs">03</div>
                <div>
                  <div className="font-arcade text-emerald-300 font-bold text-xs mb-1">เทคนิค Ricochet ยิงชิ่งกำแพงเหล็ก</div>
                  <div className="text-slate-300 text-xs leading-relaxed">
                    ใช้กำแพงเหล็ก <span className="text-slate-200 font-bold">Steel Wall</span> ให้เป็นประโยชน์! ยิงกระสุนทำมุมเข้าหากำแพงเหล็กเพื่อให้กระสุนชิ่งไปโดนรถถังศัตรูที่แอบอยู่หลังมุมกำแพงได้โดยไม่ต้องเสี่ยงวิ่งออกไปประจันหน้า
                  </div>
                </div>
              </div>

              <div className="pixel-box bg-[#121626] border-2 border-purple-500/40 p-3.5 flex items-start gap-3">
                <div className="p-2 bg-purple-500/20 text-purple-300 border border-purple-500 font-arcade text-xs">04</div>
                <div>
                  <div className="font-arcade text-purple-300 font-bold text-xs mb-1">การเก็บกล่องซ้อน (Sequential Queue)</div>
                  <div className="text-slate-300 text-xs leading-relaxed">
                    พลขับสามารถวิ่งชนกล่องคำถามหลายกล่องต่อเนื่องได้โดยคำถามไม่สูญหาย! ระบบจะจัดเก็บเข้าคิวคำถามและส่งให้ผู้ช่วยตอบทีละข้ออย่างเป็นระเบียบ
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="bg-[#161c2e] border-t border-slate-800 p-3 px-4 flex items-center justify-between shrink-0">
          <div className="font-arcade text-[10px] text-slate-400 flex items-center gap-1.5">
            <PixelStar size={10} color="#fbbf24" />
            <span>TANK QUIZ BATTLE 1990 • ARCADE EDITION</span>
          </div>

          <button
            onClick={() => {
              soundFx.playSelect();
              onClose();
            }}
            className="px-4 py-1.5 arcade-btn arcade-btn-amber text-xs font-bold font-arcade"
          >
            เข้าใจแล้ว (CLOSE)
          </button>
        </div>

      </div>
    </div>
  );
};
