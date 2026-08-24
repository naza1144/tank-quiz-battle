import React, { useState, useEffect } from 'react';
import { QuizQuestion } from '../types.js';
import { soundFx } from '../audio/soundFx.js';
import { 
  PixelBrain, 
  PixelStar, 
  PixelClock, 
  PixelAmmo 
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
  Copy
} from 'lucide-react';

interface TeacherQuizModalProps {
  onClose: () => void;
}

export const TeacherQuizModal: React.FC<TeacherQuizModalProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'LIST' | 'CREATE' | 'IMPORT' | 'API'>('LIST');
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
  const [formTimeLimit, setFormTimeLimit] = useState<number>(4);
  const [formRewardAmmo, setFormRewardAmmo] = useState<number>(3);
  const [formDifficulty, setFormDifficulty] = useState<'EASY' | 'MEDIUM' | 'HARD'>('MEDIUM');

  // JSON Import State
  const [importJsonText, setImportJsonText] = useState<string>('');
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');
  const [statusMessage, setStatusMessage] = useState<{ text: string; isError: boolean } | null>(null);

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
    fetchQuestions();
  }, []);

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
        setStatusMessage({ text: '✅ เพิ่มโจทย์คำถามใหม่สำเร็จแล้ว!', isError: false });
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in crt-overlay font-thai text-slate-100">
      <div className="w-full max-w-4xl max-h-[90vh] pixel-box bg-[#121624] flex flex-col overflow-hidden shadow-2xl">
        
        {/* Modal Top Header */}
        <div className="p-4 bg-[#151a2d] border-b-2 border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-cyan-600 border-2 border-black flex items-center justify-center shadow-[2px_2px_0_#000]">
              <PixelBrain size={20} color="#000000" />
            </div>
            <div>
              <h2 className="font-arcade text-xs sm:text-sm text-cyan-400 flex items-center gap-1.5">
                <PixelStar size={10} color="#22d3ee" />
                <span>TEACHER QUIZ BANK & OPEN APIS</span>
                <PixelStar size={10} color="#22d3ee" />
              </h2>
              <p className="text-[11px] text-slate-300 font-thai">
                ระบบจัดการคลังข้อสอบและ Open REST API สำหรับอาจารย์และวิชาเรียน
              </p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="p-1.5 font-arcade text-xs text-rose-400 hover:text-white border border-rose-500/50 hover:bg-rose-950/60"
          >
            [ESC / ปิด]
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b-2 border-slate-800 bg-black/60 px-4 pt-2 gap-2 overflow-x-auto">
          <button
            onClick={() => { soundFx.playSelect(); setActiveTab('LIST'); }}
            className={`px-3 py-2 font-arcade text-[9px] border-t-2 border-x-2 border-black flex items-center gap-1.5 ${
              activeTab === 'LIST'
                ? 'bg-[#121624] text-amber-300 border-b-2 border-transparent -mb-[2px]'
                : 'bg-slate-900 text-slate-400 hover:text-white'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" /> รายการโจทย์ ({questions.length})
          </button>
          
          <button
            onClick={() => { soundFx.playSelect(); setActiveTab('CREATE'); }}
            className={`px-3 py-2 font-arcade text-[9px] border-t-2 border-x-2 border-black flex items-center gap-1.5 ${
              activeTab === 'CREATE'
                ? 'bg-[#121624] text-amber-300 border-b-2 border-transparent -mb-[2px]'
                : 'bg-slate-900 text-slate-400 hover:text-white'
            }`}
          >
            <Plus className="w-3.5 h-3.5" /> + เพิ่มโจทย์ใหม่
          </button>

          <button
            onClick={() => { soundFx.playSelect(); setActiveTab('IMPORT'); }}
            className={`px-3 py-2 font-arcade text-[9px] border-t-2 border-x-2 border-black flex items-center gap-1.5 ${
              activeTab === 'IMPORT'
                ? 'bg-[#121624] text-amber-300 border-b-2 border-transparent -mb-[2px]'
                : 'bg-slate-900 text-slate-400 hover:text-white'
            }`}
          >
            <Upload className="w-3.5 h-3.5" /> นำเข้า / ส่งออก JSON
          </button>

          <button
            onClick={() => { soundFx.playSelect(); setActiveTab('API'); }}
            className={`px-3 py-2 font-arcade text-[9px] border-t-2 border-x-2 border-black flex items-center gap-1.5 ${
              activeTab === 'API'
                ? 'bg-[#121624] text-cyan-300 border-b-2 border-transparent -mb-[2px]'
                : 'bg-slate-900 text-slate-400 hover:text-white'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" /> ⚡ Open REST API
          </button>
        </div>

        {/* Status Message Banner */}
        {statusMessage && (
          <div className={`p-2.5 text-xs text-center border-b ${
            statusMessage.isError 
              ? 'bg-rose-950 text-rose-300 border-rose-800' 
              : 'bg-emerald-950 text-emerald-300 border-emerald-800'
          }`}>
            {statusMessage.text}
          </div>
        )}

        {/* Tab 1: Questions List */}
        {activeTab === 'LIST' && (
          <div className="flex-1 p-4 overflow-y-auto space-y-4">
            
            {/* Filters Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-black/60 p-3 border border-slate-800">
              {/* Category selector */}
              <div className="flex items-center gap-2">
                <span className="font-arcade text-[9px] text-amber-400">หมวดวิชา:</span>
                <select
                  value={selectedCat}
                  onChange={(e) => setSelectedCat(e.target.value)}
                  className="px-2.5 py-1 bg-black border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-400 font-thai"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nameTh} ({c.count} ข้อ)
                    </option>
                  ))}
                </select>
              </div>

              {/* Search Box */}
              <div className="relative flex-1 min-w-[200px] max-w-xs">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ค้นหาข้อสอบ..."
                  className="w-full pl-8 pr-3 py-1 bg-black border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-400 font-thai"
                />
              </div>

              <button
                onClick={handleResetDefault}
                className="px-2.5 py-1 arcade-btn arcade-btn-slate font-arcade text-[8px] flex items-center gap-1"
                title="รีเซ็ตกลับเป็นโจทย์มาตรฐาน 15 ข้อ"
              >
                <RotateCcw className="w-3 h-3" /> RESET DEFAULT
              </button>
            </div>

            {/* Questions Grid / List */}
            {isLoading ? (
              <div className="text-center py-12 font-arcade text-xs text-amber-400">
                LOADING QUIZ BANK...
              </div>
            ) : filteredQuestions.length === 0 ? (
              <div className="text-center py-12 text-slate-500 font-thai">
                ไม่พบโจทย์คำถามที่ตรงกับเงื่อนไข
              </div>
            ) : (
              <div className="space-y-3">
                {filteredQuestions.map((q, idx) => (
                  <div
                    key={q.id}
                    className="p-3.5 pixel-box bg-[#151a2d] border border-slate-700 hover:border-slate-500 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-arcade text-[9px] px-2 py-0.5 bg-cyan-950 text-cyan-300 border border-cyan-500">
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
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <h4 className="font-bold text-sm text-white mb-2 font-thai">
                      {idx + 1}. {q.questionTh}
                    </h4>

                    {/* Choices 4 items */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                      {q.options.map((opt, oIdx) => (
                        <div
                          key={oIdx}
                          className={`px-3 py-1.5 text-xs font-thai border ${
                            oIdx === q.correctIndex
                              ? 'bg-emerald-950/70 border-emerald-500 text-emerald-300 font-bold'
                              : 'bg-black/40 border-slate-800 text-slate-300'
                          }`}
                        >
                          <span className="font-arcade text-[9px] mr-2">
                            {String.fromCharCode(65 + oIdx)}.
                          </span>
                          {opt}
                          {oIdx === q.correctIndex && (
                            <span className="ml-2 font-arcade text-[8px] text-emerald-400">[CORRECT]</span>
                          )}
                        </div>
                      ))}
                    </div>

                    {q.explanationTh && (
                      <p className="text-[11px] text-slate-400 bg-black/50 p-2 border-l-2 border-amber-500">
                        💡 <span className="font-bold text-slate-300">คำอธิบาย:</span> {q.explanationTh}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

          </div>
        )}

        {/* Tab 2: Create Custom Question */}
        {activeTab === 'CREATE' && (
          <form onSubmit={handleCreateQuestion} className="flex-1 p-4 overflow-y-auto space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-arcade text-[9px] text-amber-400 mb-1">
                  หมวดหมู่รหัส (Category ID):
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
                  ชื่อหมวดภาษาไทย (Category Name):
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
                  <option value="EASY">EASY (ง่าย • 3 วินาที)</option>
                  <option value="MEDIUM">MEDIUM (ปานกลาง • 4 วินาที)</option>
                  <option value="HARD">HARD (ท้าทาย • 5 วินาที)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-arcade text-[9px] text-amber-400 mb-1">
                ▸ คำถาม (Question in Thai):
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
                ▸ ตัวเลือก 4 ข้อ (คลิกเลือกปุ่มวิทยุเพื่อตั้งข้อที่ถูกต้อง):
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
                  min={3}
                  max={15}
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
              className="w-full py-3 arcade-btn arcade-btn-amber font-arcade text-xs cursor-pointer flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" /> บันทึกโจทย์เข้าคลังข้อสอบ
            </button>
          </form>
        )}

        {/* Tab 3: JSON Import / Export */}
        {activeTab === 'IMPORT' && (
          <div className="flex-1 p-4 overflow-y-auto space-y-4">
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
                className="px-3 py-1.5 arcade-btn arcade-btn-cyan font-arcade text-[9px] flex items-center gap-1"
              >
                <Copy className="w-3 h-3" /> EXPORT JSON (คัดลอกทั้งหมด)
              </button>
            </div>

            <textarea
              value={importJsonText}
              onChange={(e) => setImportJsonText(e.target.value)}
              placeholder={`วางชุดข้อสอบแบบ JSON ที่นี่ เช่น:\n[\n  {\n    "category": "PHYSICS",\n    "categoryTh": "ฟิสิกส์",\n    "questionTh": "หน่วยของแรงคือข้อใด?",\n    "options": ["จูล", "นิวตัน", "วัตต์", "พาสคาล"],\n    "correctIndex": 1,\n    "explanationTh": "หน่วยของแรงคือ นิวตัน (N)",\n    "timeLimitSeconds": 4,\n    "rewardAmmo": 3\n  }\n]`}
              rows={10}
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
                className="px-6 py-2.5 arcade-btn arcade-btn-emerald font-arcade text-xs cursor-pointer flex items-center gap-1.5"
              >
                <Upload className="w-4 h-4" /> นำเข้าข้อมูล (IMPORT)
              </button>
            </div>
          </div>
        )}

        {/* Tab 4: Open REST APIs Documentation */}
        {activeTab === 'API' && (
          <div className="flex-1 p-4 overflow-y-auto space-y-4">
            <div className="bg-[#151a2d] p-3 border-l-4 border-cyan-500">
              <h3 className="font-arcade text-xs text-cyan-300 mb-1">
                🌐 OPEN QUIZ REST API SPECIFICATION
              </h3>
              <p className="text-xs text-slate-300">
                อาจารย์และนักพัฒนาสามารถเรียกใช้งาน API เหล่านี้เพื่อดึงโจทย์แบบทดสอบ นำเข้าข้อสอบ หรือเชื่อมต่อกับระบบ LMS ภายนอกได้โดยตรง
              </p>
            </div>

            <div className="space-y-3 font-mono text-xs">
              
              {/* Endpoint 1 */}
              <div className="p-3 bg-black/80 border border-slate-800 space-y-1.5">
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
                <div className="text-amber-300">/api/quiz/questions?category=MATH&difficulty=EASY&search=คำถาม</div>
                <div className="text-slate-400 text-[11px] font-thai">
                  ดึงรายการข้อสอบทั้งหมด รองรับ query parameters สำหรับกรองตามหมวดวิชา ความยาก หรือคำค้นหา
                </div>
              </div>

              {/* Endpoint 2 */}
              <div className="p-3 bg-black/80 border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 bg-emerald-950 text-emerald-400 border border-emerald-600 text-[10px] font-bold">
                    GET
                  </span>
                  <button
                    onClick={() => handleCopyApi('/api/quiz/categories')}
                    className="text-slate-400 hover:text-white text-[10px] flex items-center gap-1"
                  >
                    {copiedApi === '/api/quiz/categories' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>คัดลอก URL</span>
                  </button>
                </div>
                <div className="text-amber-300">/api/quiz/categories</div>
                <div className="text-slate-400 text-[11px] font-thai">
                  ดึงรายชื่อหมวดหมู่วิชาทั้งหมดพร้อมจำนวนข้อที่มีในระบบ
                </div>
              </div>

              {/* Endpoint 3 */}
              <div className="p-3 bg-black/80 border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 bg-cyan-950 text-cyan-400 border border-cyan-600 text-[10px] font-bold">
                    POST
                  </span>
                  <button
                    onClick={() => handleCopyApi('/api/quiz/questions')}
                    className="text-slate-400 hover:text-white text-[10px] flex items-center gap-1"
                  >
                    {copiedApi === '/api/quiz/questions' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>คัดลอก URL</span>
                  </button>
                </div>
                <div className="text-amber-300">/api/quiz/questions</div>
                <div className="text-slate-400 text-[11px] font-thai">
                  เพิ่มโจทย์คำถามใหม่เดี่ยวๆ (Body: JSON Object ของคำถาม)
                </div>
              </div>

              {/* Endpoint 4 */}
              <div className="p-3 bg-black/80 border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 bg-cyan-950 text-cyan-400 border border-cyan-600 text-[10px] font-bold">
                    POST
                  </span>
                  <button
                    onClick={() => handleCopyApi('/api/quiz/import')}
                    className="text-slate-400 hover:text-white text-[10px] flex items-center gap-1"
                  >
                    {copiedApi === '/api/quiz/import' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>คัดลอก URL</span>
                  </button>
                </div>
                <div className="text-amber-300">/api/quiz/import</div>
                <div className="text-slate-400 text-[11px] font-thai">
                  นำเข้าข้อสอบแบบกลุ่ม (Body: <code>{`{ questions: [...], mode: "append" | "replace" }`}</code>)
                </div>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
};
