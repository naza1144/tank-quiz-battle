import { QuizQuestion } from './types.js';

export function getTimeLimitForDifficulty(difficulty?: string, explicitSeconds?: number): number {
  if (difficulty === 'HARD') return 7;
  if (difficulty === 'MEDIUM') return 5;
  if (difficulty === 'EASY') return 2;
  if (explicitSeconds && explicitSeconds > 0) return explicitSeconds;
  return 5;
}

export const DEFAULT_QUESTIONS: QuizQuestion[] = [
  // ── MATH (คณิตศาสตร์) ──
  {
    id: 'math-1',
    category: 'MATH',
    categoryTh: 'คณิตศาสตร์',
    questionTh: 'ถ้า 7 x 8 = 56 แล้ว 56 ÷ 7 เท่ากับเท่าใด?',
    options: ['6', '7', '8', '9'],
    correctIndex: 2,
    explanationTh: 'การคูณและการหารสัมพันธ์กัน: 56 ÷ 7 = 8',
    timeLimitSeconds: 5,
    difficulty: 'MEDIUM',
    rewardAmmo: 3,
    bonusPoints: 100
  },
  {
    id: 'math-2',
    category: 'MATH',
    categoryTh: 'คณิตศาสตร์',
    questionTh: 'มุมภายในทั้ง 3 มุมของรูปสามเหลี่ยมรวมกันได้กี่องศา?',
    options: ['90 องศา', '180 องศา', '270 องศา', '360 องศา'],
    correctIndex: 1,
    explanationTh: 'ผลรวมมุมภายในรูปสามเหลี่ยมทุกรูปคือ 180 องศา',
    timeLimitSeconds: 2,
    difficulty: 'EASY',
    rewardAmmo: 3,
    bonusPoints: 100
  },
  {
    id: 'math-3',
    category: 'MATH',
    categoryTh: 'คณิตศาสตร์',
    questionTh: 'เลขจำนวนเฉพาะ (Prime Number) ในตัวเลือกนี้คือข้อใด?',
    options: ['9', '15', '17', '21'],
    correctIndex: 2,
    explanationTh: '17 มีตัวประกอบแค่ 1 และตัวมันเองเท่านั้น',
    timeLimitSeconds: 7,
    difficulty: 'HARD',
    rewardAmmo: 4,
    bonusPoints: 120
  },
  {
    id: 'math-4',
    category: 'MATH',
    categoryTh: 'คณิตศาสตร์',
    questionTh: 'รถถังมีความเร็ว 120 กม./ชม. วิ่งเป็นเวลา 30 นาที จะได้ระยะทางเท่าใด?',
    options: ['30 กม.', '60 กม.', '90 กม.', '120 กม.'],
    correctIndex: 1,
    explanationTh: '30 นาที = 0.5 ชม. -> ระยะทาง = 120 x 0.5 = 60 กม.',
    timeLimitSeconds: 7,
    difficulty: 'HARD',
    rewardAmmo: 4,
    bonusPoints: 150
  },
  {
    id: 'math-5',
    category: 'MATH',
    categoryTh: 'คณิตศาสตร์',
    questionTh: 'ค่าของ 2 ยกกำลัง 5 (2⁵) มีค่าเท่ากับเท่าไร?',
    options: ['10', '16', '32', '64'],
    correctIndex: 2,
    explanationTh: '2 x 2 x 2 x 2 x 2 = 32',
    timeLimitSeconds: 5,
    difficulty: 'MEDIUM',
    rewardAmmo: 3,
    bonusPoints: 100
  },

  // ── SCIENCE (วิทยาศาสตร์) ──
  {
    id: 'sci-1',
    category: 'SCIENCE',
    categoryTh: 'วิทยาศาสตร์',
    questionTh: 'ดาวเคราะห์ดวงใดในระบบสุริยะที่ได้ฉายาว่า "ดาวเคราะห์สีแดง"?',
    options: ['ดาวศุกร์', 'ดาวพฤหัสบดี', 'ดาวอังคาร', 'ดาวเสาร์'],
    correctIndex: 2,
    explanationTh: 'ดาวอังคาร (Mars) มีผิวที่เต็มไปด้วยเหล็กออกไซด์ (สนิมเหล็ก) จึงเห็นเป็นสีแดง',
    timeLimitSeconds: 2,
    difficulty: 'EASY',
    rewardAmmo: 3,
    bonusPoints: 100
  },
  {
    id: 'sci-2',
    category: 'SCIENCE',
    categoryTh: 'วิทยาศาสตร์',
    questionTh: 'พืชใช้ก๊าซอะไรในกระบวนการสังเคราะห์ด้วยแสง (Photosynthesis)?',
    options: ['ออกซิเจน', 'คาร์บอนไดออกไซด์', 'ไนโตรเจน', 'ไฮโดรเจน'],
    correctIndex: 1,
    explanationTh: 'พืชดูดซับคาร์บอนไดออกไซด์และปล่อยออกซิเจนออกมา',
    timeLimitSeconds: 5,
    difficulty: 'MEDIUM',
    rewardAmmo: 3,
    bonusPoints: 100
  },
  {
    id: 'sci-3',
    category: 'SCIENCE',
    categoryTh: 'วิทยาศาสตร์',
    questionTh: 'สูตรเคมีของ "น้ำบริสุทธิ์" คือข้อใด?',
    options: ['CO₂', 'NaCl', 'H₂O', 'O₂'],
    correctIndex: 2,
    explanationTh: 'น้ำประกอบด้วย ไฮโดรเจน 2 อะตอม และออกซิเจน 1 อะตอม (H₂O)',
    timeLimitSeconds: 2,
    difficulty: 'EASY',
    rewardAmmo: 3,
    bonusPoints: 100
  },
  {
    id: 'sci-4',
    category: 'SCIENCE',
    categoryTh: 'วิทยาศาสตร์',
    questionTh: 'อวัยวะใดของร่างกายมนุษย์ทำหน้าที่สูบฉีดเลือดไปเลี้ยงส่วนต่างๆ?',
    options: ['ปอด', 'หัวใจ', 'ตับ', 'ไต'],
    correctIndex: 1,
    explanationTh: 'หัวใจทำหน้าที่เป็นปั๊มสูบฉีดเลือดผ่านระบบไหลเวียนโลหิต',
    timeLimitSeconds: 2,
    difficulty: 'EASY',
    rewardAmmo: 3,
    bonusPoints: 100
  },

  // ── ENGLISH (ภาษาอังกฤษ) ──
  {
    id: 'eng-1',
    category: 'ENGLISH',
    categoryTh: 'ภาษาอังกฤษ',
    questionTh: 'คำตรงข้าม (Antonym) ของคำว่า "VICTORY" (ชัยชนะ) คือข้อใด?',
    options: ['DEFEAT', 'WIN', 'CHAMPION', 'SUCCESS'],
    correctIndex: 0,
    explanationTh: 'DEFEAT แปลว่า ความพ่ายแพ้',
    timeLimitSeconds: 2,
    difficulty: 'EASY',
    rewardAmmo: 3,
    bonusPoints: 100
  },
  {
    id: 'eng-2',
    category: 'ENGLISH',
    categoryTh: 'ภาษาอังกฤษ',
    questionTh: 'จงเติมคำในช่องว่าง: "Yesterday, the tank ______ through the brick wall."',
    options: ['drive', 'drives', 'drove', 'driving'],
    correctIndex: 2,
    explanationTh: 'Yesterday แสดงเหตุการณ์ในอดีต (Past Simple) ต้องใช้กริยาช่อง 2 คือ drove',
    timeLimitSeconds: 5,
    difficulty: 'MEDIUM',
    rewardAmmo: 4,
    bonusPoints: 120
  },
  {
    id: 'eng-3',
    category: 'ENGLISH',
    categoryTh: 'ภาษาอังกฤษ',
    questionTh: 'คำศัพท์ภาษาอังกฤษของคำว่า "เกราะกำบัง" คือข้อใด?',
    options: ['Sword', 'Shield / Armor', 'Bullet', 'Engine'],
    correctIndex: 1,
    explanationTh: 'Shield หรือ Armor แปลว่า เกราะป้องกัน',
    timeLimitSeconds: 2,
    difficulty: 'EASY',
    rewardAmmo: 3,
    bonusPoints: 100
  },

  // ── LOGIC / CODING (ตรรกศาสตร์และการคิด) ──
  {
    id: 'logic-1',
    category: 'LOGIC',
    categoryTh: 'ตรรกะ & การเขียนโปรแกรม',
    questionTh: 'ถ้าเงื่อนไขคือ "ถ้ากระสุน = 0 ให้วิ่งไปเก็บกล่องคำถาม" จัดเป็นโครงสร้างแบบใดในการเขียนโค้ด?',
    options: ['Loop (วนซ้ำ)', 'If-Else (เงื่อนไข)', 'Variable (ตัวแปร)', 'Function (ฟังก์ชัน)'],
    correctIndex: 1,
    explanationTh: 'การตัดสินใจด้วย "ถ้า...แล้ว..." คือเงื่อนไขแบบ If-Else',
    timeLimitSeconds: 7,
    difficulty: 'HARD',
    rewardAmmo: 4,
    bonusPoints: 120
  },
  {
    id: 'logic-2',
    category: 'LOGIC',
    categoryTh: 'ตรรกะ & การคิดวิเคราะห์',
    questionTh: 'ลำดับตัวเลข: 2, 4, 8, 16, ? ตัวเลขถัดไปคืออะไร?',
    options: ['24', '30', '32', '64'],
    correctIndex: 2,
    explanationTh: 'เพิ่มขึ้นทีละ 2 เท่า (คูณ 2 ต่อเนื่อง): 16 x 2 = 32',
    timeLimitSeconds: 5,
    difficulty: 'MEDIUM',
    rewardAmmo: 3,
    bonusPoints: 100
  },

  // ── GENERAL (ความรู้รอบตัว) ──
  {
    id: 'gen-1',
    category: 'GENERAL',
    categoryTh: 'ความรู้รอบตัว',
    questionTh: 'เข็มทิศจะชี้ปลายไปทางทิศใดเสมอตามสนามแม่เหล็กโลก?',
    options: ['ทิศตะวันออก', 'ทิศใต้', 'ทิศเหนือ', 'ทิศตะวันตก'],
    correctIndex: 2,
    explanationTh: 'เข็มทิศแม่เหล็กจะชี้ขั้วเหนือเข้าหาขั้วแม่เหล็กโลกทางทิศเหนือเสมอ',
    timeLimitSeconds: 2,
    difficulty: 'EASY',
    rewardAmmo: 3,
    bonusPoints: 100
  }
];

export class QuizManager {
  private questions: QuizQuestion[] = [...DEFAULT_QUESTIONS];

  public getRandomQuestion(category?: string): QuizQuestion {
    let pool = this.questions;
    if (category && category !== 'ALL') {
      pool = this.questions.filter(q => q.category.toUpperCase() === category.toUpperCase() || q.subjectCode?.toUpperCase() === category.toUpperCase());
      if (pool.length === 0) pool = this.questions;
    }
    const idx = Math.floor(Math.random() * pool.length);
    const selected = pool[idx];
    const timeLimit = getTimeLimitForDifficulty(selected.difficulty, selected.timeLimitSeconds);
    return {
      ...selected,
      timeLimitSeconds: timeLimit
    };
  }

  public getAllQuestions(filter?: { category?: string; difficulty?: string; search?: string }): QuizQuestion[] {
    let result = [...this.questions];
    if (filter?.category && filter.category !== 'ALL') {
      result = result.filter(q => q.category.toUpperCase() === filter.category!.toUpperCase() || q.subjectCode?.toUpperCase() === filter.category!.toUpperCase());
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

  public getQuestionById(id: string): QuizQuestion | undefined {
    return this.questions.find(q => q.id === id);
  }

  public addQuestion(question: Omit<QuizQuestion, 'id'> & { id?: string }): QuizQuestion {
    const newId = question.id || `custom-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const timeLimit = getTimeLimitForDifficulty(question.difficulty, question.timeLimitSeconds);
    const newQ: QuizQuestion = {
      ...question,
      id: newId,
      timeLimitSeconds: timeLimit,
      rewardAmmo: question.rewardAmmo || 3,
      bonusPoints: question.bonusPoints || 100
    };
    this.questions.push(newQ);
    return newQ;
  }

  public updateQuestion(id: string, updates: Partial<QuizQuestion>): QuizQuestion | null {
    const idx = this.questions.findIndex(q => q.id === id);
    if (idx === -1) return null;
    const diff = updates.difficulty || this.questions[idx].difficulty;
    const timeLimit = getTimeLimitForDifficulty(diff, updates.timeLimitSeconds || this.questions[idx].timeLimitSeconds);
    this.questions[idx] = { ...this.questions[idx], ...updates, timeLimitSeconds: timeLimit, id };
    return this.questions[idx];
  }

  public deleteQuestion(id: string): boolean {
    const lenBefore = this.questions.length;
    this.questions = this.questions.filter(q => q.id !== id);
    return this.questions.length < lenBefore;
  }

  public getCategories(): { id: string; nameTh: string; count: number }[] {
    const catMap = new Map<string, { nameTh: string; count: number }>();
    for (const q of this.questions) {
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
      { id: 'ALL', nameTh: 'ทุกหมวดหมู่วิชา (All Subjects)', count: this.questions.length },
      ...categories
    ];
  }

  public bulkImport(newQuestions: any[], mode: 'append' | 'replace' = 'append'): { added: number; total: number } {
    const validated: QuizQuestion[] = [];
    for (let i = 0; i < newQuestions.length; i++) {
      const item = newQuestions[i];
      if (item && item.questionTh && Array.isArray(item.options) && item.options.length >= 2) {
        const diff = item.difficulty || 'MEDIUM';
        const timeLimit = getTimeLimitForDifficulty(diff, item.timeLimitSeconds ? Number(item.timeLimitSeconds) : undefined);
        validated.push({
          id: item.id || `imp-${Date.now()}-${i}`,
          category: (item.category || 'CUSTOM').toUpperCase(),
          categoryTh: item.categoryTh || item.category || 'โจทย์กำหนดเอง',
          questionTh: item.questionTh,
          options: item.options.slice(0, 4),
          correctIndex: typeof item.correctIndex === 'number' ? item.correctIndex : 0,
          explanationTh: item.explanationTh || 'ตอบถูกต้อง!',
          timeLimitSeconds: timeLimit,
          rewardAmmo: item.rewardAmmo ? Number(item.rewardAmmo) : 3,
          bonusPoints: item.bonusPoints ? Number(item.bonusPoints) : 100,
          difficulty: diff
        });
      }
    }

    if (mode === 'replace') {
      this.questions = validated;
    } else {
      this.questions = [...this.questions, ...validated];
    }

    return { added: validated.length, total: this.questions.length };
  }

  public resetToDefault(): void {
    this.questions = [...DEFAULT_QUESTIONS];
  }
}

export const quizManager = new QuizManager();
