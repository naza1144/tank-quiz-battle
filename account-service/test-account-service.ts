import { accountDirectory } from './src/accountDirectory.js';
import { opaClient } from './src/opaClient.js';

console.log('🧪 ========================================================');
console.log('🧪 Starting 3NF Account, Offline Login & OPA Test Suite');
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

async function runTests() {
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

  // -------------------------------------------------------------
  // Test Group 4: Offline Classroom Student Login
  // -------------------------------------------------------------
  console.log('\n▶️ [Test Group 4] Offline Classroom Student Login (OPA Hydration)');
  const offlineStudent = await accountDirectory.syncOfflineStudentLogin({
    studentId: '6509999',
    name: 'สมคิด ออฟไลน์',
    sectionId: 'sec-cpe-2026-1'
  });
  assert(offlineStudent.isNew, 'Offline student created successfully');
  assert(offlineStudent.userDetail.account.roleId === 'STUDENT', 'Offline student role is STUDENT');
  assert(offlineStudent.userDetail.student?.studentId === '6509999', 'Offline student ID mapped to 6509999');

  const verifyOfflineStudent = accountDirectory.verifyToken(offlineStudent.token);
  assert(verifyOfflineStudent.valid === true, 'Offline student token is cryptographically valid');
  assert(verifyOfflineStudent.payload?.role === 'STUDENT', 'Offline token has role STUDENT');
  assert(verifyOfflineStudent.payload?.permissions.includes('game:play') === true, 'Offline token has game:play permission');
  assert(!verifyOfflineStudent.payload?.permissions.includes('portal:teacher'), 'Offline token DOES NOT have portal:teacher');

  // -------------------------------------------------------------
  // Test Group 5: Offline Classroom Teacher Login (PIN / Password)
  // -------------------------------------------------------------
  console.log('\n▶️ [Test Group 5] Offline Classroom Teacher Login (PIN / Password)');
  const offlineTeacher = await accountDirectory.syncOfflineTeacherLogin({
    username: 'somchai',
    password: '1990'
  });
  assert(offlineTeacher !== null, 'Teacher somchai authenticated with PIN 1990');
  assert(offlineTeacher?.userDetail.account.roleId === 'TEACHER', 'Teacher role is TEACHER');

  const verifyOfflineTeacher = accountDirectory.verifyToken(offlineTeacher!.token);
  assert(verifyOfflineTeacher.valid === true, 'Offline teacher token is valid');
  assert(verifyOfflineTeacher.payload?.role === 'TEACHER', 'Offline teacher role in token is TEACHER');
  assert(verifyOfflineTeacher.payload?.permissions.includes('portal:teacher') === true, 'Offline teacher has portal:teacher permission');

  // Test Admin Login
  const offlineAdmin = await accountDirectory.syncOfflineTeacherLogin({
    username: 'admin',
    password: 'admin'
  });
  assert(offlineAdmin !== null, 'Admin authenticated with password admin');
  assert(offlineAdmin?.userDetail.account.roleId === 'ADMIN', 'Admin role is ADMIN');
  assert(offlineAdmin?.userDetail.permissions.includes('*') === true, 'Admin has wildcard * permission');

  // Test Invalid Password
  const invalidLogin = await accountDirectory.syncOfflineTeacherLogin({
    username: 'somchai',
    password: 'wrongpassword'
  });
  assert(invalidLogin === null, 'Invalid password correctly rejected');

  // -------------------------------------------------------------
  // Test Group 6: OPA Client & Permission Evaluation
  // -------------------------------------------------------------
  console.log('\n▶️ [Test Group 6] OPA Client & Permission Evaluation');
  const studentCanPlay = await accountDirectory.hasPermissionWithOpa('STUDENT', 'game:play');
  assert(studentCanPlay === true, 'OPA evaluation: STUDENT can game:play');

  const studentCannotManage = await accountDirectory.hasPermissionWithOpa('STUDENT', 'portal:teacher');
  assert(studentCannotManage === false, 'OPA evaluation: STUDENT CANNOT portal:teacher (Blocked)');

  const teacherCanManage = await accountDirectory.hasPermissionWithOpa('TEACHER', 'portal:teacher');
  assert(teacherCanManage === true, 'OPA evaluation: TEACHER can portal:teacher');

  const adminCanAnything = await accountDirectory.hasPermissionWithOpa('ADMIN', 'system:destroy');
  assert(adminCanAnything === true, 'OPA evaluation: ADMIN has wildcard access');

  console.log('\n========================================================');
  console.log(`📊 Test Summary: ${passedTests}/${totalTests} Passed (${Math.round((passedTests/totalTests)*100)}%)`);
  console.log('========================================================');

  if (passedTests === totalTests) {
    console.log('\n🎉 ALL OFFLINE CLASSROOM & OPA INTEGRATION TESTS PASSED PERFECTLY!\n');
  } else {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
