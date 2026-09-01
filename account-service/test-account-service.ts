import { accountDirectory } from './src/accountDirectory.js';

console.log('🧪 ========================================================');
console.log('🧪 Starting 3NF Account & RBAC Service Unit & Logic Test Suite');
console.log('🧪 ========================================================');

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, message: string) {
  totalTests++;
  if (condition) {
    console.log(`  ✅ [PASS] ${message}`);
    passedTests++;
  } else {
    console.error(`  ❌ [FAIL] ${message}`);
    process.exitCode = 1;
  }
}

// -------------------------------------------------------------
// Test Group 1: Academic Master Entities
// -------------------------------------------------------------
console.log('\n▶️ [Test Group 1] Academic Master Entities (3NF Structure)');
assert(accountDirectory.faculties.has('fac-eng'), 'Faculty ENG exists');
assert(accountDirectory.departments.has('dept-cpe'), 'Department CPE exists with facultyId fac-eng');
assert(accountDirectory.sections.has('sec-cpe-2026-1'), 'Section 1 exists under CPE');
assert(accountDirectory.titles.has('tit-asst-prof-dr'), 'Title Asst. Prof. Dr. exists');

// -------------------------------------------------------------
// Test Group 2: RBAC Roles & Permissions Mapping
// -------------------------------------------------------------
console.log('\n▶️ [Test Group 2] RBAC Roles & Permissions Mapping');
assert(accountDirectory.hasPermission('STUDENT', 'game:play'), 'STUDENT has game:play');
assert(accountDirectory.hasPermission('STUDENT', 'quiz:vote'), 'STUDENT has quiz:vote');
assert(!accountDirectory.hasPermission('STUDENT', 'quiz:write'), 'STUDENT CANNOT quiz:write (Blocked)');
assert(!accountDirectory.hasPermission('STUDENT', 'portal:teacher'), 'STUDENT CANNOT access portal:teacher (Blocked)');
assert(accountDirectory.hasPermission('TEACHER', 'portal:teacher'), 'TEACHER has portal:teacher');
assert(accountDirectory.hasPermission('TEACHER', 'quiz:write'), 'TEACHER has quiz:write');
assert(accountDirectory.hasPermission('ADMIN', 'anything:custom'), 'ADMIN wildcard has *');

// -------------------------------------------------------------
// Test Group 3: Google Login Auto-Sync & Profile Mapping
// -------------------------------------------------------------
console.log('\n▶️ [Test Group 3] Google Login Auto-Sync & Token Generation');

// Test Existing Teacher
const teacherSync = accountDirectory.syncGoogleLogin({
  email: 'somchai.teacher@dssi.ac.th',
  name: 'Somchai Jaidee',
  googleSub: 'google-sub-teacher-01',
});
assert(teacherSync.userDetail.account.roleId === 'TEACHER', 'Teacher Somchai mapped as TEACHER');
assert(teacherSync.userDetail.teacher?.teacherId === 'T-801', 'Teacher ID is T-801');
assert(!teacherSync.isNew, 'Existing teacher is not marked as new user');

// Verify Enriched Token
const verifyTeacher = accountDirectory.verifyToken(teacherSync.token);
assert(verifyTeacher.valid && verifyTeacher.payload?.role === 'TEACHER', 'Token payload contains role TEACHER');
assert(verifyTeacher.payload?.permissions.includes('quiz:write') === true, 'Token payload contains quiz:write permission');

// Test Existing Student
const studentSync = accountDirectory.syncGoogleLogin({
  email: 's6501001@dssi.ac.th',
  name: 'Thanakorn TankAce',
  googleSub: 'google-sub-std-01',
});
assert(studentSync.userDetail.account.roleId === 'STUDENT', 'Student 6501001 mapped as STUDENT');
assert(studentSync.userDetail.student?.studentId === '6501001', 'Student ID is 6501001');
assert(studentSync.userDetail.student?.sectionCode === 'Sec 1', 'Student belongs to Sec 1');

// Test New Student Auto-Provisioning
const newStudent = accountDirectory.syncGoogleLogin({
  email: 'newbie.student2026@dssi.ac.th',
  name: 'Anan Sukjai',
  googleSub: 'google-sub-new-01',
});
assert(newStudent.isNew, 'New student is marked as new user');
assert(newStudent.userDetail.account.roleId === 'STUDENT', 'New user auto-provisioned as STUDENT');
assert(!!newStudent.userDetail.student?.studentId, 'New student assigned unique Student ID');

console.log('\n========================================================');
console.log(`📊 Test Summary: ${passedTests}/${totalTests} Passed (${Math.round((passedTests/totalTests)*100)}%)`);
console.log('========================================================');

if (passedTests === totalTests) {
  console.log('\n🎉 ALL 3NF ACCOUNT & RBAC SERVICE TESTS PASSED PERFECTLY!\n');
} else {
  process.exit(1);
}
