import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { QuizManager } from './quizBank.js';
import { ExternalAdapter } from './externalAdapter.js';
import { DifficultyLevel } from './types.js';

dotenv.config();

const PORT = process.env.PORT || 4001;
const API_SECRET_KEY = process.env.QUIZ_SERVICE_API_KEY || 'tank-quiz-api-key-2026';

const app = express();
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const quizManager = new QuizManager();
const externalAdapter = new ExternalAdapter();

// ── Health Check ─────────────────────────────────────────────────────────────
app.get(['/api/quiz/health', '/health'], (req, res) => {
  res.json({
    status: 'ok',
    service: 'tank-quiz-service',
    standalone: true,
    totalQuestions: quizManager.getAllQuestions().length,
    categoriesCount: quizManager.getCategories().length,
    timestamp: new Date().toISOString()
  });
});

// ── 1. ดึงรายการโจทย์คำถามทั้งหมด (รองรับ filter category, difficulty, search) ─────
app.get(['/api/quiz/questions', '/api/quizzes'], (req, res) => {
  const { category, difficulty, search, source } = req.query;
  const questions = quizManager.getAllQuestions({
    category: category ? String(category) : undefined,
    difficulty: difficulty ? String(difficulty) : undefined,
    search: search ? String(search) : undefined,
    source: source ? String(source) : undefined
  });
  res.json({
    success: true,
    total: questions.length,
    questions
  });
});

// ── 2. ดึงหมวดหมู่และรายวิชาทั้งหมดพร้อมจำนวนข้อ ─────────────────────────────
app.get('/api/quiz/categories', (req, res) => {
  const categories = quizManager.getCategories();
  res.json({
    success: true,
    categories
  });
});

// ── 3. สุ่มคำถามสำหรับ Game Server (GET /api/quiz/random) ────────────────────
app.get('/api/quiz/random', async (req, res) => {
  const { category, difficulty, useExternal } = req.query;
  
  // หากเปิดใช้ On-Demand External Fetching
  if (useExternal === 'true' || process.env.EXTERNAL_FETCH_ON_DEMAND === 'true') {
    const extQuestion = await externalAdapter.fetchFromExternalApi(
      category ? String(category) : undefined,
      difficulty ? String(difficulty) : undefined
    );
    if (extQuestion) {
      return res.json({ success: true, source: 'EXTERNAL', question: extQuestion });
    }
  }

  const question = quizManager.getRandomQuestion(
    category ? String(category) : undefined,
    difficulty ? String(difficulty) : undefined
  );

  res.json({
    success: true,
    source: 'LOCAL',
    question
  });
});

// ── 4. ดึงโจทย์คำถามรายข้อตาม ID ─────────────────────────────────────────────
app.get('/api/quiz/questions/:id', (req, res) => {
  const question = quizManager.getQuestionById(req.params.id);
  if (!question) {
    return res.status(404).json({ success: false, error: 'ไม่พบโจทย์คำถามที่ระบุ' });
  }
  res.json({ success: true, question });
});

// ── 5. เพิ่มโจทย์คำถามใหม่ ───────────────────────────────────────────────────
app.post(['/api/quiz/questions', '/api/quizzes'], (req, res) => {
  const q = req.body;
  if (!q.questionTh || !Array.isArray(q.options) || q.options.length < 2) {
    return res.status(400).json({ 
      success: false, 
      error: 'กรุณาระบุคำถาม (questionTh) และตัวเลือก (options) อย่างน้อย 2 ตัวเลือก' 
    });
  }

  const correctIndex = Number(q.correctIndex);
  if (isNaN(correctIndex) || correctIndex < 0 || correctIndex >= q.options.length) {
    return res.status(400).json({ 
      success: false, 
      error: 'ตำแหน่งตัวเลือกที่ถูกต้อง (correctIndex) ไม่ถูกต้อง' 
    });
  }

  const newQuestion = quizManager.addQuestion({
    id: q.id || `quiz-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    category: q.category ? String(q.category).toUpperCase() : 'GENERAL',
    categoryTh: q.categoryTh || 'ความรู้ทั่วไป',
    questionTh: q.questionTh.trim(),
    questionEn: q.questionEn?.trim(),
    options: q.options.map((opt: any) => String(opt).trim()),
    correctIndex,
    explanationTh: q.explanationTh ? q.explanationTh.trim() : 'คำตอบถูกต้อง!',
    timeLimitSeconds: Number(q.timeLimitSeconds) || 5,
    rewardAmmo: Number(q.rewardAmmo) || 3,
    bonusPoints: Number(q.bonusPoints) || 100,
    difficulty: (q.difficulty as DifficultyLevel) || 'MEDIUM',
    subjectCode: q.subjectCode,
    source: q.source || 'LOCAL'
  });

  res.status(201).json({ 
    success: true, 
    message: 'เพิ่มโจทย์คำถามสำเร็จ',
    question: newQuestion 
  });
});

// ── 6. แก้ไขโจทย์คำถาม ──────────────────────────────────────────────────────
app.put('/api/quiz/questions/:id', (req, res) => {
  const updated = quizManager.updateQuestion(req.params.id, req.body);
  if (!updated) {
    return res.status(404).json({ success: false, error: 'ไม่พบโจทย์คำถามที่ต้องการแก้ไข' });
  }
  res.json({ success: true, message: 'แก้ไขโจทย์คำถามสำเร็จ', question: updated });
});

// ── 7. ลบโจทย์คำถาม ─────────────────────────────────────────────────────────
app.delete('/api/quiz/questions/:id', (req, res) => {
  const deleted = quizManager.deleteQuestion(req.params.id);
  if (!deleted) {
    return res.status(404).json({ success: false, error: 'ไม่พบโจทย์คำถามที่ต้องการลบ' });
  }
  res.json({ success: true, message: 'ลบโจทย์คำถามสำเร็จ' });
});

// ── 8. Bulk Import สำหรับนำเข้าชุดข้อสอบ (JSON Array) ─────────────────────────
app.post('/api/quiz/import', (req, res) => {
  const { questions, mode } = req.body;
  const items = Array.isArray(questions) ? questions : (Array.isArray(req.body) ? req.body : []);
  
  if (items.length === 0) {
    return res.status(400).json({ success: false, error: 'ไม่พบข้อมูลข้อสอบสำหรับนำเข้า' });
  }

  const result = quizManager.bulkImport(items, mode === 'replace' ? 'replace' : 'append');
  res.json({
    success: true,
    message: `นำเข้าข้อสอบสำเร็จ ${result.added} ข้อ (รวมในระบบทั้งหมด ${result.total} ข้อ)`,
    result
  });
});

// ── 9. External LMS Sync Endpoint (รองรับ API Key Auth) ─────────────────────
app.post('/api/quiz/sync', (req, res) => {
  const authHeader = req.headers['authorization'] || req.headers['x-api-key'];
  const providedKey = typeof authHeader === 'string' ? authHeader.replace(/^Bearer\s+/i, '') : '';

  // ตรวจสอบ API Key
  if (providedKey !== API_SECRET_KEY && process.env.NODE_ENV === 'production') {
    return res.status(401).json({ success: false, error: 'Unauthorized: Invalid API Key' });
  }

  const { providerId, questions, replaceExisting } = req.body;
  const items = Array.isArray(questions) ? questions : (Array.isArray(req.body) ? req.body : []);

  if (items.length === 0) {
    return res.status(400).json({ success: false, error: 'No questions provided' });
  }

  const syncResult = quizManager.syncFromExternalProvider(
    providerId || 'ExternalLMS',
    items,
    !!replaceExisting
  );

  res.json({
    success: true,
    message: `Synced ${syncResult.added} questions from external provider ${providerId || 'ExternalLMS'}`,
    totalInBank: syncResult.total
  });
});

// ── 10. รีเซ็ตกลับเป็นโจทย์เริ่มต้น ───────────────────────────────────────────
app.post('/api/quiz/reset', (req, res) => {
  quizManager.resetToDefault();
  res.json({
    success: true,
    message: 'รีเซ็ตคลังข้อสอบกลับเป็นค่าเริ่มต้นสำเร็จ',
    total: quizManager.getAllQuestions().length
  });
});

// ── 11. External Adapter Configuration Endpoints ────────────────────────────
app.get('/api/quiz/adapter/config', (req, res) => {
  res.json({ success: true, config: externalAdapter.getConfig() });
});

app.post('/api/quiz/adapter/config', (req, res) => {
  externalAdapter.updateConfig(req.body);
  res.json({ success: true, message: 'External Adapter config updated', config: externalAdapter.getConfig() });
});

// ── 12. Student Score Webhook Reporting ─────────────────────────────────────
app.post('/api/quiz/webhook/report', async (req, res) => {
  const success = await externalAdapter.reportScoreToWebhook(req.body);
  res.json({ success, reported: success });
});

// ── Start Express Server ────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[QuizService] 📚 Tank Quiz Service running on http://localhost:${PORT}`);
  console.log(`[QuizService] 🚀 Default questions loaded: ${quizManager.getAllQuestions().length}`);
});
