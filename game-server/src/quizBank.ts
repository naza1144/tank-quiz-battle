import { QuizQuestion } from './types.js';

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
    timeLimitSeconds: 4,
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
    timeLimitSeconds: 3,
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
    timeLimitSeconds: 5,
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
    timeLimitSeconds: 5,
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
    timeLimitSeconds: 4,
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
    timeLimitSeconds: 3,
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
    timeLimitSeconds: 4,
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
    timeLimitSeconds: 3,
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
    timeLimitSeconds: 3,
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
    timeLimitSeconds: 3,
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
    timeLimitSeconds: 4,
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
    timeLimitSeconds: 3,
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
    timeLimitSeconds: 5,
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
    timeLimitSeconds: 4,
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
    timeLimitSeconds: 3,
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
      pool = this.questions.filter(q => q.category === category);
      if (pool.length === 0) pool = this.questions;
    }
    const idx = Math.floor(Math.random() * pool.length);
    return pool[idx];
  }

  public getQuestionById(id: string): QuizQuestion | undefined {
    return this.questions.find(q => q.id === id);
  }

  public addQuestion(question: QuizQuestion) {
    this.questions.push(question);
  }

  public getAllQuestions(): QuizQuestion[] {
    return this.questions;
  }
}
