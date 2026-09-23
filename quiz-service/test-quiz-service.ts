import { QuizManager, getTimeLimitForDifficulty, DEFAULT_QUESTIONS } from './src/quizBank.js';
import { ExternalAdapter } from './src/externalAdapter.js';

console.log('🧪 ========================================================');
console.log('🧪 Starting Standalone Quiz Service Unit & Logic Test Suite');
console.log('🧪 ========================================================\n');

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, testName: string) {
  totalTests++;
  if (condition) {
    console.log(`  ✅ [PASS] ${testName}`);
    passedTests++;
  } else {
    console.error(`  ❌ [FAIL] ${testName}`);
    process.exitCode = 1;
  }
}

// ── 1. Test Difficulty Time Limit Rules ──
console.log('▶️ [Test Group 1] Difficulty Time Limit Rules');
assert(getTimeLimitForDifficulty('EASY') === 5, 'EASY difficulty returns 5 seconds');
assert(getTimeLimitForDifficulty('MEDIUM') === 9, 'MEDIUM difficulty returns 9 seconds');
assert(getTimeLimitForDifficulty('HARD') === 14, 'HARD difficulty returns 14 seconds');
assert(getTimeLimitForDifficulty(undefined, 10) === 10, 'Explicit seconds override when provided');
assert(getTimeLimitForDifficulty('UNKNOWN') === 9, 'Fallback is 9 seconds');

// ── 2. Test QuizManager CRUD & Filtering ──
console.log('\n▶️ [Test Group 2] QuizManager CRUD & Query Operations');
const manager = new QuizManager();

const allQuestions = manager.getAllQuestions();
assert(allQuestions.length >= 10, `Loaded ${allQuestions.length} default questions`);

const mathQuestions = manager.getAllQuestions({ category: 'MATH' });
assert(mathQuestions.length > 0 && mathQuestions.every(q => q.category === 'MATH'), 'Filter by category MATH works');

const easyQuestions = manager.getAllQuestions({ difficulty: 'EASY' });
assert(easyQuestions.length > 0 && easyQuestions.every(q => q.difficulty === 'EASY'), 'Filter by difficulty EASY works');

const searchQuestions = manager.getAllQuestions({ search: 'สามเหลี่ยม' });
assert(searchQuestions.length > 0, 'Search keyword "สามเหลี่ยม" found question');

const randomQ = manager.getRandomQuestion('SCIENCE');
assert(randomQ && randomQ.category === 'SCIENCE', `Random question from category SCIENCE: "${randomQ.questionTh}"`);

const addedQ = manager.addQuestion({
  category: 'CUSTOM_TEST',
  categoryTh: 'วิชาทดสอบพิเศษ',
  questionTh: '1 + 1 เท่ากับเท่าใด?',
  options: ['1', '2', '3', '4'],
  correctIndex: 1,
  difficulty: 'EASY'
});
assert(addedQ.id.length > 0 && addedQ.timeLimitSeconds === 5, 'Added new question with correct time limit 5s');

const fetchedAdded = manager.getQuestionById(addedQ.id);
assert(fetchedAdded !== undefined && fetchedAdded.questionTh === '1 + 1 เท่ากับเท่าใด?', 'Get question by ID works');

const updatedQ = manager.updateQuestion(addedQ.id, {
  questionTh: '1 + 1 = ? (แก้ไข)',
  difficulty: 'HARD'
});
assert(updatedQ !== null && updatedQ.difficulty === 'HARD' && updatedQ.timeLimitSeconds === 14, 'Update question & recalculate difficulty to 14s works');

const deleted = manager.deleteQuestion(addedQ.id);
assert(deleted && manager.getQuestionById(addedQ.id) === undefined, 'Delete question works');

// ── 3. Test Bulk Import & Provider Sync ──
console.log('\n▶️ [Test Group 3] Bulk Import & External Provider Sync');
const importPayload = [
  {
    questionTh: 'โจทย์นำเข้าข้อที่ 1',
    options: ['ก', 'ข', 'ค', 'ง'],
    correctIndex: 0,
    difficulty: 'EASY'
  },
  {
    questionTh: 'โจทย์นำเข้าข้อที่ 2',
    options: ['A', 'B', 'C', 'D'],
    correctIndex: 3,
    difficulty: 'HARD'
  }
];

const importRes = manager.bulkImport(importPayload, 'append');
assert(importRes.added === 2, `Bulk imported ${importRes.added} questions`);

const syncRes = manager.syncFromExternalProvider('MoodleLMS', [
  {
    id: 'moodle-101',
    category: 'CS101',
    categoryTh: 'Computer Science',
    questionTh: 'What does CPU stand for?',
    options: ['Central Processing Unit', 'Computer Personal Unit', 'Central Power Unit', 'Core Processing Utility'],
    correctIndex: 0,
    difficulty: 'MEDIUM'
  }
], false);
assert(syncRes.added === 1, 'Sync from External Provider (MoodleLMS) succeeded');

const externalQuestions = manager.getAllQuestions({ source: 'EXTERNAL' });
assert(externalQuestions.length >= 1, `Found ${externalQuestions.length} questions from external sources`);

// ── 4. Test ExternalAdapter Configuration ──
console.log('\n▶️ [Test Group 4] ExternalAdapter Configuration & Behavior');
const adapter = new ExternalAdapter({
  apiUrl: 'https://mock-school-lms.edu/api/quiz',
  apiKey: 'test-api-key-12345',
  fetchOnDemand: false,
  webhookUrl: 'https://mock-school-lms.edu/api/scores'
});

const config = adapter.getConfig();
assert(config.apiUrl === 'https://mock-school-lms.edu/api/quiz', 'Adapter API URL set properly');
assert(config.hasApiKey === true, 'Adapter API Key registered');

// ── Summary ──
console.log('\n========================================================');
console.log(`📊 Test Summary: ${passedTests}/${totalTests} Passed (${Math.round((passedTests/totalTests)*100)}%)`);
console.log('========================================================\n');

if (passedTests === totalTests) {
  console.log('🎉 ALL STANDALONE QUIZ SERVICE TESTS PASSED PERFECTLY!\n');
  process.exit(0);
} else {
  console.error('❌ SOME TESTS FAILED!\n');
  process.exit(1);
}
