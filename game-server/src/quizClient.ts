import { QuizQuestion } from './types.js';
import { DEFAULT_QUESTIONS, getTimeLimitForDifficulty } from './quizBank.js';

export interface QuizClientConfig {
  serviceUrl?: string;
  refreshIntervalMs?: number;
}

export interface IQuizProvider {
  getRandomQuestion(category?: string, difficulty?: string): QuizQuestion;
  getQuestionById(id: string): QuizQuestion | undefined;
  getAllQuestions(filter?: { category?: string; difficulty?: string; search?: string }): QuizQuestion[];
  getCategories(): { id: string; nameTh: string; count: number }[];
}

export class QuizClient implements IQuizProvider {
  private serviceUrl: string;
  private cachedQuestions: QuizQuestion[] = [...DEFAULT_QUESTIONS];
  private refreshTimer: NodeJS.Timeout | null = null;
  private isConnected: boolean = false;

  constructor(config: QuizClientConfig = {}) {
    this.serviceUrl = process.env.QUIZ_SERVICE_URL || config.serviceUrl || 'http://quiz-service:4001';
    
    // พยายามโหลดคำถามชุดแรกจาก quiz-service ทันที
    this.syncFromService().catch(() => {
      console.log('[QuizClient] ⚠️ quiz-service not reachable at startup, running with built-in fallback questions');
    });

    // เริ่ม Background Polling อัปเดตคลังคำถามทุก 30 วินาที
    const interval = config.refreshIntervalMs || 30000;
    this.refreshTimer = setInterval(() => {
      this.syncFromService().catch(() => {});
    }, interval);
    this.refreshTimer.unref();
  }

  /**
   * ดึงรายการคำถามทั้งหมดจาก quiz-service มาเก็บไว้ใน Memory Cache
   */
  public async syncFromService(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);

      const res = await fetch(`${this.serviceUrl}/api/quiz/questions`, {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' }
      });
      clearTimeout(timeout);

      if (res.ok) {
        const data: any = await res.json();
        if (data.success && Array.isArray(data.questions) && data.questions.length > 0) {
          this.cachedQuestions = data.questions;
          if (!this.isConnected) {
            console.log(`[QuizClient] ✅ Connected to standalone Quiz Service (${data.questions.length} questions loaded)`);
            this.isConnected = true;
          }
          return true;
        }
      }
    } catch (err: any) {
      this.isConnected = false;
    }
    return false;
  }

  /**
   * ยิงขอคำถามแบบ On-Demand ข้ามคอนเทนเนอร์ตรงไปยัง quiz-service
   */
  public async fetchRandomQuestion(category?: string, difficulty?: string): Promise<QuizQuestion> {
    try {
      const url = new URL(`${this.serviceUrl}/api/quiz/random`);
      if (category && category !== 'ALL') url.searchParams.set('category', category);
      if (difficulty && difficulty !== 'ALL') url.searchParams.set('difficulty', difficulty);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(url.toString(), {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' }
      });
      clearTimeout(timeout);

      if (res.ok) {
        const data: any = await res.json();
        if (data.success && data.question) {
          return data.question;
        }
      }
    } catch (err) {
      // Degraded graceful fallback to memory cache
    }
    return this.getRandomQuestion(category, difficulty);
  }

  /**
   * สุ่มคำถาม (แบบ Synchronous Fast Path สำหรับ 60Hz Game Tick)
   */
  public getRandomQuestion(category?: string, difficulty?: string): QuizQuestion {
    let pool = this.cachedQuestions;
    if (category && category !== 'ALL') {
      const catUpper = category.toUpperCase();
      const filtered = pool.filter(q => q.category.toUpperCase() === catUpper || q.subjectCode?.toUpperCase() === catUpper);
      if (filtered.length > 0) pool = filtered;
    }
    if (difficulty && difficulty !== 'ALL') {
      const diffUpper = difficulty.toUpperCase();
      const filteredByDiff = pool.filter(q => q.difficulty === diffUpper);
      if (filteredByDiff.length > 0) pool = filteredByDiff;
    }
    const idx = Math.floor(Math.random() * pool.length);
    const selected = pool[idx] || DEFAULT_QUESTIONS[0];
    const timeLimit = getTimeLimitForDifficulty(selected.difficulty, selected.timeLimitSeconds);
    return {
      ...selected,
      timeLimitSeconds: timeLimit
    };
  }

  /**
   * ดึงคำถามตาม ID
   */
  public getQuestionById(id: string): QuizQuestion | undefined {
    return this.cachedQuestions.find(q => q.id === id) || DEFAULT_QUESTIONS.find(q => q.id === id);
  }

  /**
   * ดึงรายการคำถามทั้งหมด
   */
  public getAllQuestions(filter?: { category?: string; difficulty?: string; search?: string }): QuizQuestion[] {
    let result = [...this.cachedQuestions];
    if (filter?.category && filter.category !== 'ALL') {
      const catUpper = filter.category.toUpperCase();
      result = result.filter(q => q.category.toUpperCase() === catUpper || q.subjectCode?.toUpperCase() === catUpper);
    }
    if (filter?.difficulty && filter.difficulty !== 'ALL') {
      result = result.filter(q => q.difficulty === filter.difficulty);
    }
    if (filter?.search) {
      const q = filter.search.toLowerCase();
      result = result.filter(item => 
        item.questionTh.toLowerCase().includes(q) || 
        item.categoryTh.toLowerCase().includes(q) ||
        item.options.some(opt => opt.toLowerCase().includes(q))
      );
    }
    return result;
  }

  /**
   * ดึงรายการหมวดหมู่วิชา
   */
  public getCategories(): { id: string; nameTh: string; count: number }[] {
    const catMap = new Map<string, { nameTh: string; count: number }>();
    for (const q of this.cachedQuestions) {
      const key = q.category.toUpperCase();
      if (!catMap.has(key)) {
        catMap.set(key, { nameTh: q.categoryTh || key, count: 0 });
      }
      catMap.get(key)!.count += 1;
    }

    const categories = Array.from(catMap.entries()).map(([id, val]) => ({
      id,
      nameTh: val.nameTh,
      count: val.count
    }));

    return [
      { id: 'ALL', nameTh: 'ทุกหมวดหมู่วิชา (All Subjects)', count: this.cachedQuestions.length },
      ...categories
    ];
  }

  /**
   * ส่งผลคะแนนของนักเรียนกลับไปยัง Quiz Service (Async Fire & Forget)
   */
  public reportScore(payload: {
    studentId?: string;
    teamId: string;
    questionId: string;
    isCorrect: boolean;
    timeSpentSeconds: number;
  }): void {
    fetch(`${this.serviceUrl}/api/quiz/webhook/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, timestamp: new Date().toISOString() })
    }).catch(() => {});
  }

  public getServiceUrl(): string {
    return this.serviceUrl;
  }

  public isServiceOnline(): boolean {
    return this.isConnected;
  }
}

export const quizClient = new QuizClient();
