export type UserRoleCode = 'STUDENT' | 'TEACHER' | 'ADMIN' | 'GUEST';

// -------------------------------------------------------------
// 1. Academic Master Entities
// -------------------------------------------------------------
export interface Faculty {
  id: string;        // e.g. "fac-eng"
  code: string;      // e.g. "ENG"
  nameTh: string;    // e.g. "คณะวิศวกรรมศาสตร์"
  nameEn?: string;   // e.g. "Faculty of Engineering"
}

export interface Department {
  id: string;        // e.g. "dept-cpe"
  facultyId: string; // FK -> Faculty.id
  code: string;      // e.g. "CPE"
  nameTh: string;    // e.g. "ภาควิชาวิศวกรรมคอมพิวเตอร์"
  nameEn?: string;   // e.g. "Department of Computer Engineering"
}

export interface Section {
  id: string;            // e.g. "sec-cpe-2026-1"
  departmentId: string;  // FK -> Department.id
  sectionCode: string;   // e.g. "Sec 1"
  academicYear: number;  // e.g. 2569 / 2026
  semester: number;      // e.g. 1
}

// -------------------------------------------------------------
// 2. Identity, Title & RBAC Entities
// -------------------------------------------------------------
export interface Title {
  id: string;        // e.g. "tit-mr", "tit-miss", "tit-asst-prof-dr"
  titleTh: string;   // e.g. "นาย", "นางสาว", "ผู้ช่วยศาสตราจารย์ ดร."
  titleEn?: string;  // e.g. "Mr.", "Miss", "Asst. Prof. Dr."
  abbrTh: string;    // e.g. "นาย", "น.ส.", "ผศ.ดร."
}

export interface Role {
  id: UserRoleCode;  // "STUDENT" | "TEACHER" | "ADMIN" | "GUEST"
  nameTh: string;
  description: string;
}

export interface Permission {
  id: string;        // e.g. "game:play", "quiz:write", "portal:teacher"
  module: string;    // "GAME" | "QUIZ" | "ADMIN" | "ACCOUNT"
  description: string;
}

// -------------------------------------------------------------
// 3. Account & Profile Entities
// -------------------------------------------------------------
export interface UserAccount {
  id: string;              // e.g. "usr-6501001"
  email: string;           // Google OAuth Email (Unique Index)
  googleSub?: string;      // Google Subject ID
  roleId: UserRoleCode;    // FK -> Role.id
  status: 'ACTIVE' | 'SUSPENDED';
  createdAt: number;
  lastLoginAt: number;
}

export interface UserProfile {
  id: string;              // e.g. "prof-6501001"
  accountId: string;       // FK -> UserAccount.id (Unique)
  titleId?: string;        // FK -> Title.id
  firstNameTh: string;     // ชื่อภาษาไทย
  lastNameTh: string;      // นามสกุลภาษาไทย
  firstNameEn?: string;    // First Name
  lastNameEn?: string;     // Last Name
  displayName: string;     // In-Game Display Name / ฉายา
  avatarUrl?: string;      // Google Profile Image URL
}

export interface StudentProfile {
  studentId: string;       // PK: รหัสนักศึกษา เช่น "6501001"
  userProfileId: string;   // FK -> UserProfile.id
  facultyId: string;       // FK -> Faculty.id
  departmentId: string;    // FK -> Department.id
  sectionId: string;       // FK -> Section.id
  enrollmentYear: number;  // e.g. 2565 / 2022
}

export interface TeacherProfile {
  teacherId: string;       // PK: รหัสอาจารย์ เช่น "T-801"
  userProfileId: string;   // FK -> UserProfile.id
  facultyId: string;       // FK -> Faculty.id
  departmentId: string;    // FK -> Department.id
  positionTitle: string;   // e.g. "อาจารย์ประจำสาขา", "ผศ.ดร."
}

export interface TeacherSubjectAssignment {
  teacherId: string;       // FK -> TeacherProfile.teacherId
  categoryId: string;      // FK -> Category.id (MATH, SCIENCE, etc.)
}

// -------------------------------------------------------------
// 4. Token & API DTOs
// -------------------------------------------------------------
export interface EnrichedTokenPayload {
  userId: string;
  profileId: string;
  email: string;
  name: string;
  role: UserRoleCode;
  studentId?: string;
  teacherId?: string;
  facultyCode?: string;
  departmentCode?: string;
  sectionCode?: string;
  permissions: string[];
  iat?: number;
  exp?: number;
}

export interface GoogleSyncRequest {
  email: string;
  name: string;
  googleSub?: string;
  avatarUrl?: string;
  studentId?: string;
}

export interface FullUserDetailResponse {
  account: UserAccount;
  profile: UserProfile;
  title?: Title;
  student?: StudentProfile & { facultyName?: string; departmentName?: string; sectionCode?: string };
  teacher?: TeacherProfile & { facultyName?: string; departmentName?: string };
  permissions: string[];
}

export interface OfflineStudentLoginRequest {
  studentId?: string;
  name: string;
  facultyId?: string;
  departmentId?: string;
  sectionId?: string;
}

export interface OfflineTeacherLoginRequest {
  username: string;
  password: string;
}

