export type DifficultyLevel = 'EASY' | 'MEDIUM' | 'HARD';

export interface QuizQuestion {
  id: string;
  category: string;             // e.g. 'MATH', 'SCIENCE', 'ENGLISH', 'TECH', 'HISTORY', 'GENERAL'
  categoryTh: string;           // e.g. 'คณิตศาสตร์', 'วิทยาศาสตร์'
  questionTh: string;           // โจทย์คำถาม (ภาษาไทย)
  questionEn?: string;          // English Question (Optional)
  options: string[];            // ตัวเลือกคำตอบ 4 ตัวเลือก
  correctIndex: number;         // ดัชนีคำตอบที่ถูกต้อง (0-3)
  explanationTh?: string;       // คำอธิบายเฉลย
  timeLimitSeconds?: number;    // เวลาจำกัด (EASY=30s, MEDIUM=60s, HARD=180s)
  rewardAmmo?: number;          // จำนวนกระสุนที่ได้รับเมื่อตอบถูก (3-5 นัด)
  bonusPoints?: number;         // คะแนนโบนัสทีม (100-150)
  difficulty?: DifficultyLevel; // ระดับความยาก
  subjectCode?: string;         // รหัสวิชา (เช่น CS101, MATH201)
  source?: 'LOCAL' | 'EXTERNAL';// แหล่งที่มาของข้อสอบ
  externalId?: string;          // ID อ้างอิงจากระบบภายนอก
  level?: number;               // ระดับความยากของโจทย์ (เช่น 1-5)
}

export interface CategorySummary {
  category: string;
  categoryTh: string;
  count: number;
  difficulties: {
    EASY: number;
    MEDIUM: number;
    HARD: number;
  };
}

export interface ExternalProviderConfig {
  apiUrl?: string;
  apiKey?: string;
  fetchOnDemand?: boolean;
  webhookUrl?: string;
  timeoutMs?: number;
}

export interface QuizSyncPayload {
  providerId?: string;
  category?: string;
  categoryTh?: string;
  questions: Array<{
    id?: string;
    questionTh: string;
    questionEn?: string;
    options: string[];
    correctIndex: number;
    explanationTh?: string;
    difficulty?: DifficultyLevel;
    category?: string;
    categoryTh?: string;
    timeLimitSeconds?: number;
    subjectCode?: string;
  }>;
  replaceExisting?: boolean;
}

export interface StudentScoreWebhookPayload {
  studentId?: string;
  teamId: string;
  questionId: string;
  isCorrect: boolean;
  timeSpentSeconds: number;
  timestamp: string;
}
