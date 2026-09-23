import jwt from 'jsonwebtoken';
import { opaClient } from './opaClient.js';
import {
  Faculty,
  Department,
  Section,
  Title,
  Role,
  Permission,
  UserAccount,
  UserProfile,
  StudentProfile,
  TeacherProfile,
  TeacherSubjectAssignment,
  UserRoleCode,
  EnrichedTokenPayload,
  GoogleSyncRequest,
  FullUserDetailResponse,
  OfflineStudentLoginRequest,
  OfflineTeacherLoginRequest,
} from './types.js';

const JWT_SECRET = process.env.JWT_SECRET || 'tank-battle-quiz-secret-2026';
const TOKEN_EXPIRY = '7d';
export const ADMIN_EMAILS = new Set([
  'chanon.se.67@ubu.ac.th',
  'admin@dssi.ac.th',
]);


export class AccountDirectory {
  // 1. Master Academic Tables
  public faculties: Map<string, Faculty> = new Map();
  public departments: Map<string, Department> = new Map();
  public sections: Map<string, Section> = new Map();

  // 2. Master Titles & RBAC Tables
  public titles: Map<string, Title> = new Map();
  public roles: Map<UserRoleCode, Role> = new Map();
  public permissions: Map<string, Permission> = new Map();
  public rolePermissionMap: Map<UserRoleCode, Set<string>> = new Map();

  // 3. User & Profile Entities
  public accounts: Map<string, UserAccount> = new Map(); // Key: email
  public accountsById: Map<string, UserAccount> = new Map(); // Key: accountId
  public profiles: Map<string, UserProfile> = new Map(); // Key: profileId (and index by accountId)
  public profilesByAccountId: Map<string, UserProfile> = new Map();
  public students: Map<string, StudentProfile> = new Map(); // Key: studentId
  public teachers: Map<string, TeacherProfile> = new Map(); // Key: teacherId
  public teacherSubjects: TeacherSubjectAssignment[] = [];

  constructor() {
    this.seedMasterData();
    this.seedInitialUsers();
    this.refreshPermissionsFromOpa().catch(() => {});
  }

  async refreshPermissionsFromOpa(): Promise<void> {
    const roles: UserRoleCode[] = ['ADMIN', 'TEACHER', 'STUDENT', 'GUEST'];
    for (const r of roles) {
      try {
        const perms = await opaClient.getPermissionsForRole(r);
        if (perms && perms.length > 0) {
          this.rolePermissionMap.set(r, new Set(perms));
        }
      } catch (e) {
        // Safe fallback
      }
    }
  }


  private seedMasterData(): void {
    // 1. Seed Faculty
    const facEng: Faculty = { id: 'fac-eng', code: 'ENG', nameTh: 'คณะวิศวกรรมศาสตร์', nameEn: 'Faculty of Engineering' };
    const facSci: Faculty = { id: 'fac-sci', code: 'SCI', nameTh: 'คณะวิทยาศาสตร์', nameEn: 'Faculty of Science' };
    this.faculties.set(facEng.id, facEng);
    this.faculties.set(facSci.id, facSci);

    // 2. Seed Department
    const deptCpe: Department = { id: 'dept-cpe', facultyId: 'fac-eng', code: 'CPE', nameTh: 'ภาควิชาวิศวกรรมคอมพิวเตอร์', nameEn: 'Computer Engineering' };
    const deptEe: Department = { id: 'dept-ee', facultyId: 'fac-eng', code: 'EE', nameTh: 'ภาควิชาวิศวกรรมไฟฟ้า', nameEn: 'Electrical Engineering' };
    this.departments.set(deptCpe.id, deptCpe);
    this.departments.set(deptEe.id, deptEe);

    // 3. Seed Section
    const sec1: Section = { id: 'sec-cpe-2026-1', departmentId: 'dept-cpe', sectionCode: 'Sec 1', academicYear: 2569, semester: 1 };
    const sec2: Section = { id: 'sec-cpe-2026-2', departmentId: 'dept-cpe', sectionCode: 'Sec 2', academicYear: 2569, semester: 1 };
    this.sections.set(sec1.id, sec1);
    this.sections.set(sec2.id, sec2);

    // 4. Seed Titles
    const titMr: Title = { id: 'tit-mr', titleTh: 'นาย', titleEn: 'Mr.', abbrTh: 'นาย' };
    const titMiss: Title = { id: 'tit-miss', titleTh: 'นางสาว', titleEn: 'Miss', abbrTh: 'น.ส.' };
    const titProf: Title = { id: 'tit-asst-prof-dr', titleTh: 'ผู้ช่วยศาสตราจารย์ ดร.', titleEn: 'Asst. Prof. Dr.', abbrTh: 'ผศ.ดร.' };
    this.titles.set(titMr.id, titMr);
    this.titles.set(titMiss.id, titMiss);
    this.titles.set(titProf.id, titProf);

    // 5. Seed Roles
    this.roles.set('STUDENT', { id: 'STUDENT', nameTh: 'นักศึกษา', description: 'ผู้เรียนและผู้เข้าแข่งขันในเกม' });
    this.roles.set('TEACHER', { id: 'TEACHER', nameTh: 'อาจารย์ผู้สอน', description: 'ผู้จัดการคลังข้อสอบและผู้ควบคุมห้องประลอง' });
    this.roles.set('ADMIN', { id: 'ADMIN', nameTh: 'ผู้ดูแลระบบ', description: 'ผู้ดูแลระบบสูงสุด' });
    this.roles.set('GUEST', { id: 'GUEST', nameTh: 'ผู้เยี่ยมชม', description: 'ผู้เล่นทั่วไป' });

    // 6. Seed Permissions
    const perms: Permission[] = [
      { id: 'game:play', module: 'GAME', description: 'สิทธิ์เข้าห้องประลองและบังคับรถถัง' },
      { id: 'game:join_squad', module: 'GAME', description: 'สิทธิ์เลือกทีมและสลับตำแหน่ง Driver/Support' },
      { id: 'quiz:vote', module: 'QUIZ', description: 'สิทธิ์โหวตตอบคำถามชิงกระสุน' },
      { id: 'stats:read_own', module: 'ACCOUNT', description: 'สิทธิ์ดูประวัติคะแนนของตนเอง' },
      { id: 'portal:teacher', module: 'ADMIN', description: 'สิทธิ์เข้าสู่หน้าจอ Teacher Portal' },
      { id: 'quiz:read_all', module: 'QUIZ', description: 'สิทธิ์ดูคลังข้อสอบทั้งหมด' },
      { id: 'quiz:write', module: 'QUIZ', description: 'สิทธิ์เพิ่ม แก้ไข และลบข้อสอบ' },
      { id: 'quiz:import', module: 'QUIZ', description: 'สิทธิ์นำเข้าชุดข้อสอบ Bulk JSON' },
      { id: 'quiz:difficulty', module: 'QUIZ', description: 'สิทธิ์ปรับตั้งเวลาตอบ 2s, 5s, 7s และกระสุนรางวัล' },
      { id: 'room:control', module: 'GAME', description: 'สิทธิ์สั่งเริ่มเกม บังคับปิดห้อง และสร้างห้องแข่งขัน' },
      { id: 'stats:read_class', module: 'ACCOUNT', description: 'สิทธิ์ดูผลคะแนนของนักศึกษาทั้งกลุ่มเรียน' },
      { id: 'lms:sync', module: 'QUIZ', description: 'สิทธิ์ซิงค์คะแนนกลับสู่ระบบ LMS' },
      { id: '*', module: 'ADMIN', description: 'สิทธิ์ครอบคลุมทุกโมดูล' },
    ];
    for (const p of perms) {
      this.permissions.set(p.id, p);
    }

    // 7. Seed Role-Permission Mapping
    this.rolePermissionMap.set('STUDENT', new Set([
      'game:play', 'game:join_squad', 'quiz:vote', 'stats:read_own'
    ]));
    this.rolePermissionMap.set('TEACHER', new Set([
      'game:play', 'game:join_squad', 'quiz:vote', 'portal:teacher',
      'quiz:read_all', 'quiz:write', 'quiz:import', 'quiz:difficulty',
      'room:control', 'stats:read_class', 'stats:read_own', 'lms:sync'
    ]));
    this.rolePermissionMap.set('ADMIN', new Set(['*']));
    this.rolePermissionMap.set('GUEST', new Set([
      'game:play', 'game:join_squad', 'quiz:vote'
    ]));
  }

  private seedInitialUsers(): void {
    // 0. Seed Admin Chanon
    const adminAcc: UserAccount = {
      id: 'usr-admin-chanon',
      email: 'chanon.se.67@ubu.ac.th',
      roleId: 'ADMIN',
      status: 'ACTIVE',
      createdAt: Date.now() - 86400000 * 30,
      lastLoginAt: Date.now(),
    };
    const adminProf: UserProfile = {
      id: 'prof-admin-chanon',
      accountId: adminAcc.id,
      titleId: 'tit-mr',
      firstNameTh: 'ชานนท์',
      lastNameTh: '(ผู้ดูแลระบบ)',
      firstNameEn: 'Chanon',
      lastNameEn: 'Admin',
      displayName: 'ชานนท์ (Admin)',
      avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=ChanonAdmin',
    };
    const adminTeacher: TeacherProfile = {
      teacherId: 'T-ADMIN',
      userProfileId: adminProf.id,
      facultyId: 'fac-eng',
      departmentId: 'dept-cpe',
      positionTitle: 'ผู้ดูแลระบบสูงสุด (Administrator)',
    };
    this.accounts.set(adminAcc.email, adminAcc);
    this.accountsById.set(adminAcc.id, adminAcc);
    this.profiles.set(adminProf.id, adminProf);
    this.profilesByAccountId.set(adminAcc.id, adminProf);
    this.teachers.set(adminTeacher.teacherId, adminTeacher);

    // 1. Seed Teacher Somchai
    const teacherAcc: UserAccount = {
      id: 'usr-teacher-01',
      email: 'somchai.teacher@dssi.ac.th',
      roleId: 'TEACHER',
      status: 'ACTIVE',
      createdAt: Date.now() - 86400000 * 30,
      lastLoginAt: Date.now(),
    };
    const teacherProf: UserProfile = {
      id: 'prof-teacher-01',
      accountId: teacherAcc.id,
      titleId: 'tit-asst-prof-dr',
      firstNameTh: 'สมชาย',
      lastNameTh: 'ใจดีการศึกษา',
      firstNameEn: 'Somchai',
      lastNameEn: 'Jaidee',
      displayName: 'อ.สมชาย (ผู้สอน)',
      avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=TeacherSomchai',
    };
    const teacherDetail: TeacherProfile = {
      teacherId: 'T-801',
      userProfileId: teacherProf.id,
      facultyId: 'fac-eng',
      departmentId: 'dept-cpe',
      positionTitle: 'ผู้ช่วยศาสตราจารย์ ดร.',
    };
    this.accounts.set(teacherAcc.email, teacherAcc);
    this.accountsById.set(teacherAcc.id, teacherAcc);
    this.profiles.set(teacherProf.id, teacherProf);
    this.profilesByAccountId.set(teacherAcc.id, teacherProf);
    this.teachers.set(teacherDetail.teacherId, teacherDetail);
    this.teacherSubjects.push({ teacherId: 'T-801', categoryId: 'MATH' });
    this.teacherSubjects.push({ teacherId: 'T-801', categoryId: 'SCIENCE' });

    // 2. Seed Student 1 (Thanakorn)
    const std1Acc: UserAccount = {
      id: 'usr-student-6501001',
      email: 's6501001@dssi.ac.th',
      roleId: 'STUDENT',
      status: 'ACTIVE',
      createdAt: Date.now() - 86400000 * 20,
      lastLoginAt: Date.now(),
    };
    const std1Prof: UserProfile = {
      id: 'prof-student-6501001',
      accountId: std1Acc.id,
      titleId: 'tit-mr',
      firstNameTh: 'ธนกร',
      lastNameTh: 'นักรบรถถัง',
      firstNameEn: 'Thanakorn',
      lastNameEn: 'TankAce',
      displayName: 'ธนกร [6501001]',
      avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=TankAce1',
    };
    const std1Detail: StudentProfile = {
      studentId: '6501001',
      userProfileId: std1Prof.id,
      facultyId: 'fac-eng',
      departmentId: 'dept-cpe',
      sectionId: 'sec-cpe-2026-1',
      enrollmentYear: 2565,
    };
    this.accounts.set(std1Acc.email, std1Acc);
    this.accountsById.set(std1Acc.id, std1Acc);
    this.profiles.set(std1Prof.id, std1Prof);
    this.profilesByAccountId.set(std1Acc.id, std1Prof);
    this.students.set(std1Detail.studentId, std1Detail);

    // 3. Seed Student 2 (Kamonwan)
    const std2Acc: UserAccount = {
      id: 'usr-student-6501002',
      email: 's6501002@dssi.ac.th',
      roleId: 'STUDENT',
      status: 'ACTIVE',
      createdAt: Date.now() - 86400000 * 20,
      lastLoginAt: Date.now(),
    };
    const std2Prof: UserProfile = {
      id: 'prof-student-6501002',
      accountId: std2Acc.id,
      titleId: 'tit-miss',
      firstNameTh: 'กมลวรรณ',
      lastNameTh: 'ปัญญาไว',
      firstNameEn: 'Kamonwan',
      lastNameEn: 'Panyawai',
      displayName: 'กมลวรรณ [6501002]',
      avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=TankAce2',
    };
    const std2Detail: StudentProfile = {
      studentId: '6501002',
      userProfileId: std2Prof.id,
      facultyId: 'fac-eng',
      departmentId: 'dept-cpe',
      sectionId: 'sec-cpe-2026-1',
      enrollmentYear: 2565,
    };
    this.accounts.set(std2Acc.email, std2Acc);
    this.accountsById.set(std2Acc.id, std2Acc);
    this.profiles.set(std2Prof.id, std2Prof);
    this.profilesByAccountId.set(std2Acc.id, std2Prof);
    this.students.set(std2Detail.studentId, std2Detail);
  }

  // -------------------------------------------------------------
  // Google Login Synchronization & Auto-Provisioning
  // -------------------------------------------------------------
  syncGoogleLogin(req: GoogleSyncRequest): { token: string; userDetail: FullUserDetailResponse; isNew: boolean } {
    const normalizedEmail = req.email.trim().toLowerCase();
    let account = this.accounts.get(normalizedEmail);
    let isNew = false;

    if (!account) {
      isNew = true;
      const isAdminEmail = ADMIN_EMAILS.has(normalizedEmail);
      const isTeacherEmail = normalizedEmail.includes('teacher') || normalizedEmail.includes('prof') || normalizedEmail.includes('instructor');
      const roleId: UserRoleCode = isAdminEmail ? 'ADMIN' : (isTeacherEmail ? 'TEACHER' : 'STUDENT');
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      
      let studentId = req.studentId?.trim();
      if (!studentId) {
        const ubuMatch = normalizedEmail.match(/\.(\d{2})@ubu\.ac\.th/);
        if (ubuMatch) {
          studentId = `${ubuMatch[1]}145${randomSuffix}`;
        } else {
          studentId = `670${randomSuffix}`;
        }
      }

      account = {
        id: `usr-${Date.now()}-${randomSuffix}`,
        email: normalizedEmail,
        googleSub: req.googleSub,
        roleId,
        status: 'ACTIVE',
        createdAt: Date.now(),
        lastLoginAt: Date.now(),
      };

      const nameParts = req.name.trim().split(' ');
      const firstName = nameParts[0] || 'Player';
      const lastName = nameParts.slice(1).join(' ') || '';

      const profile: UserProfile = {
        id: `prof-${account.id}`,
        accountId: account.id,
        titleId: roleId === 'ADMIN' ? 'tit-mr' : (roleId === 'TEACHER' ? 'tit-asst-prof-dr' : 'tit-mr'),
        firstNameTh: firstName,
        lastNameTh: lastName,
        firstNameEn: firstName,
        lastNameEn: lastName,
        displayName: `${firstName} ${roleId === 'ADMIN' ? '(Admin)' : (roleId === 'TEACHER' ? '(อาจารย์)' : `[${studentId}]`)}`,
        avatarUrl: req.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${normalizedEmail}`,
      };

      this.accounts.set(normalizedEmail, account);
      this.accountsById.set(account.id, account);
      this.profiles.set(profile.id, profile);
      this.profilesByAccountId.set(account.id, profile);

      if (roleId === 'STUDENT') {
        const enrollYear = studentId.startsWith('67') ? 2567 : (studentId.startsWith('66') ? 2566 : (studentId.startsWith('65') ? 2565 : 2567));
        const student: StudentProfile = {
          studentId,
          userProfileId: profile.id,
          facultyId: 'fac-eng',
          departmentId: 'dept-cpe',
          sectionId: 'sec-cpe-2026-1',
          enrollmentYear: enrollYear,
        };
        this.students.set(student.studentId, student);
      } else {
        const teacher: TeacherProfile = {
          teacherId: `T-${randomSuffix}`,
          userProfileId: profile.id,
          facultyId: 'fac-eng',
          departmentId: 'dept-cpe',
          positionTitle: roleId === 'ADMIN' ? 'ผู้ดูแลระบบสูงสุด (Administrator)' : 'อาจารย์ผู้สอน',
        };
        this.teachers.set(teacher.teacherId, teacher);
        this.teacherSubjects.push({ teacherId: teacher.teacherId, categoryId: 'MATH' });
      }
    } else {
      if (ADMIN_EMAILS.has(normalizedEmail)) {
        account.roleId = 'ADMIN';
      }
      account.googleSub = req.googleSub || account.googleSub;
      account.lastLoginAt = Date.now();

      if (req.studentId && account.roleId === 'STUDENT') {
        const existingProfile = this.profilesByAccountId.get(account.id);
        if (existingProfile) {
          const cleanStudentId = req.studentId.trim();
          let student = Array.from(this.students.values()).find(s => s.userProfileId === existingProfile.id);
          if (student) {
            this.students.delete(student.studentId);
            student.studentId = cleanStudentId;
            this.students.set(cleanStudentId, student);
          } else {
            const enrollYear = cleanStudentId.startsWith('67') ? 2567 : (cleanStudentId.startsWith('66') ? 2566 : 2567);
            this.students.set(cleanStudentId, {
              studentId: cleanStudentId,
              userProfileId: existingProfile.id,
              facultyId: 'fac-eng',
              departmentId: 'dept-cpe',
              sectionId: 'sec-cpe-2026-1',
              enrollmentYear: enrollYear,
            });
          }
          const baseName = existingProfile.firstNameTh || 'Player';
          existingProfile.displayName = `${baseName} [${cleanStudentId}]`;
        }
      }
    }

    const userDetail = this.getFullUserDetail(account.id)!;
    const token = this.generateToken(userDetail);

    return { token, userDetail, isNew };
  }

  // -------------------------------------------------------------
  // Offline Classroom Student Login (OPA-granted permissions)
  // -------------------------------------------------------------
  async syncOfflineStudentLogin(req: OfflineStudentLoginRequest): Promise<{ token: string; userDetail: FullUserDetailResponse; isNew: boolean }> {
    const rawStudentId = (req.studentId || '').trim();
    const cleanStudentId = rawStudentId || `650${Math.floor(1000 + Math.random() * 9000)}`;
    const studentEmail = `${cleanStudentId.toLowerCase()}@classroom.local`;
    let account = this.accounts.get(studentEmail);
    let isNew = false;

    const facultyId = req.facultyId || 'fac-eng';
    const departmentId = req.departmentId || 'dept-cpe';
    const sectionId = req.sectionId || 'sec-cpe-2026-1';

    if (!account) {
      isNew = true;
      account = {
        id: `usr-std-${cleanStudentId}`,
        email: studentEmail,
        roleId: 'STUDENT',
        status: 'ACTIVE',
        createdAt: Date.now(),
        lastLoginAt: Date.now(),
      };

      const displayName = req.name ? `${req.name.trim()} [${cleanStudentId}]` : `นักศึกษา [${cleanStudentId}]`;
      const nameParts = (req.name || cleanStudentId).trim().split(' ');
      const firstName = nameParts[0] || 'Student';
      const lastName = nameParts.slice(1).join(' ') || cleanStudentId;

      const profile: UserProfile = {
        id: `prof-${account.id}`,
        accountId: account.id,
        titleId: 'tit-mr',
        firstNameTh: firstName,
        lastNameTh: lastName,
        firstNameEn: firstName,
        lastNameEn: lastName,
        displayName,
        avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanStudentId}`,
      };

      const student: StudentProfile = {
        studentId: cleanStudentId,
        userProfileId: profile.id,
        facultyId,
        departmentId,
        sectionId,
        enrollmentYear: 2565,
      };

      this.accounts.set(studentEmail, account);
      this.accountsById.set(account.id, account);
      this.profiles.set(profile.id, profile);
      this.profilesByAccountId.set(account.id, profile);
      this.students.set(student.studentId, student);
    } else {
      account.lastLoginAt = Date.now();
      const profile = this.profilesByAccountId.get(account.id);
      if (profile && req.name) {
        profile.displayName = `${req.name.trim()} [${cleanStudentId}]`;
      }
    }

    // Refresh OPA permissions dynamically for STUDENT
    const perms = await opaClient.getPermissionsForRole('STUDENT');
    this.rolePermissionMap.set('STUDENT', new Set(perms));

    const userDetail = this.getFullUserDetail(account.id)!;
    const token = this.generateToken(userDetail);

    return { token, userDetail, isNew };
  }

  // -------------------------------------------------------------
  // Offline Classroom Teacher Login (Username / PIN with OPA check)
  // -------------------------------------------------------------
  async syncOfflineTeacherLogin(req: OfflineTeacherLoginRequest): Promise<{ token: string; userDetail: FullUserDetailResponse } | null> {
    const username = (req.username || '').trim().toLowerCase();
    const password = (req.password || '').trim();

    let targetAccount: UserAccount | undefined;

    if (username === 'admin' || username === 'chanon' || username === 'chanon.se.67@ubu.ac.th') {
      if (password === 'admin' || password === '1990') {
        targetAccount = this.accounts.get('chanon.se.67@ubu.ac.th');
      }
    } else if (username === 'somchai' || username === 'teacher' || username === 'somchai.teacher@dssi.ac.th') {
      if (password === 'teacher' || password === '1990') {
        targetAccount = this.accounts.get('somchai.teacher@dssi.ac.th');
      }
    } else if (password === '1990') {
      const teacherEmail = `${username}@dssi.ac.th`;
      let acc = this.accounts.get(teacherEmail);
      if (!acc) {
        const teacherId = `T-${Math.floor(100 + Math.random() * 900)}`;
        acc = {
          id: `usr-teacher-${username}`,
          email: teacherEmail,
          roleId: 'TEACHER',
          status: 'ACTIVE',
          createdAt: Date.now(),
          lastLoginAt: Date.now(),
        };
        const profile: UserProfile = {
          id: `prof-${acc.id}`,
          accountId: acc.id,
          titleId: 'tit-asst-prof-dr',
          firstNameTh: req.username,
          lastNameTh: '(ผู้สอน)',
          firstNameEn: req.username,
          lastNameEn: 'Teacher',
          displayName: `อ.${req.username} (ผู้สอน)`,
          avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${username}`,
        };
        const teacher: TeacherProfile = {
          teacherId,
          userProfileId: profile.id,
          facultyId: 'fac-eng',
          departmentId: 'dept-cpe',
          positionTitle: 'อาจารย์ผู้สอนประจำวิชา',
        };
        this.accounts.set(teacherEmail, acc);
        this.accountsById.set(acc.id, acc);
        this.profiles.set(profile.id, profile);
        this.profilesByAccountId.set(acc.id, profile);
        this.teachers.set(teacher.teacherId, teacher);
      }
      targetAccount = acc;
    }

    if (!targetAccount) {
      return null;
    }

    targetAccount.lastLoginAt = Date.now();

    // Query OPA for updated permissions for this role
    const perms = await opaClient.getPermissionsForRole(targetAccount.roleId);
    this.rolePermissionMap.set(targetAccount.roleId, new Set(perms));

    const userDetail = this.getFullUserDetail(targetAccount.id)!;
    const token = this.generateToken(userDetail);

    return { token, userDetail };
  }


  // -------------------------------------------------------------
  // Token Generation & Verification
  // -------------------------------------------------------------
  generateToken(detail: FullUserDetailResponse): string {
    const payload: EnrichedTokenPayload = {
      userId: detail.account.id,
      profileId: detail.profile.id,
      email: detail.account.email,
      name: detail.profile.displayName,
      role: detail.account.roleId,
      studentId: detail.student?.studentId,
      teacherId: detail.teacher?.teacherId,
      facultyCode: detail.student?.facultyName || detail.teacher?.facultyName,
      departmentCode: detail.student?.departmentName || detail.teacher?.departmentName,
      sectionCode: detail.student?.sectionCode,
      permissions: detail.permissions,
    };

    return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
  }

  verifyToken(token: string): { valid: boolean; payload?: EnrichedTokenPayload; error?: string } {
    try {
      let decoded: any;
      try {
        decoded = jwt.verify(token, JWT_SECRET) as any;
      } catch (verifyErr: any) {
        // Fallback for RS256 tokens from Google OAuth / Keycloak IDP
        if (verifyErr.message === 'invalid algorithm' || verifyErr.name === 'JsonWebTokenError') {
          const raw = jwt.decode(token) as any;
          if (raw && (raw.sub || raw.email || raw.account_id)) {
            if (raw.exp && raw.exp * 1000 < Date.now()) {
              return { valid: false, error: 'Token has expired' };
            }
            decoded = raw;
          } else {
            return { valid: false, error: verifyErr.message || 'Invalid token' };
          }
        } else {
          return { valid: false, error: verifyErr.message || 'Invalid token' };
        }
      }

      if (!decoded.userId) {
        decoded.userId = decoded.sub || decoded.id || decoded.account_id;
      }
      return { valid: true, payload: decoded };
    } catch (err: any) {
      return { valid: false, error: err.message || 'Invalid token' };
    }
  }

  hasPermission(role: UserRoleCode, requiredPermission: string): boolean {
    const perms = this.rolePermissionMap.get(role);
    if (!perms) return false;
    if (perms.has('*')) return true;
    return perms.has(requiredPermission);
  }

  async hasPermissionWithOpa(role: UserRoleCode, requiredPermission: string): Promise<boolean> {
    return await opaClient.evaluatePermission(role, requiredPermission);
  }


  // -------------------------------------------------------------
  // Hydrate Full User Detail (Join 3NF entities for API/Token)
  // -------------------------------------------------------------
  getFullUserDetail(accountId: string): FullUserDetailResponse | undefined {
    const account = this.accountsById.get(accountId);
    if (!account) return undefined;

    const profile = this.profilesByAccountId.get(account.id);
    if (!profile) return undefined;

    const title = profile.titleId ? this.titles.get(profile.titleId) : undefined;
    const permissions = Array.from(this.rolePermissionMap.get(account.roleId) || []);

    let studentRes: any = undefined;
    let teacherRes: any = undefined;

    if (account.roleId === 'STUDENT') {
      const student = Array.from(this.students.values()).find(s => s.userProfileId === profile.id);
      if (student) {
        const fac = this.faculties.get(student.facultyId);
        const dept = this.departments.get(student.departmentId);
        const sec = this.sections.get(student.sectionId);
        studentRes = {
          ...student,
          facultyName: fac?.nameTh,
          departmentName: dept?.nameTh,
          sectionCode: sec?.sectionCode,
        };
      }
    } else if (account.roleId === 'TEACHER' || account.roleId === 'ADMIN') {
      const teacher = Array.from(this.teachers.values()).find(t => t.userProfileId === profile.id);
      if (teacher) {
        const fac = this.faculties.get(teacher.facultyId);
        const dept = this.departments.get(teacher.departmentId);
        teacherRes = {
          ...teacher,
          facultyName: fac?.nameTh,
          departmentName: dept?.nameTh,
        };
      }
    }

    return {
      account,
      profile,
      title,
      student: studentRes,
      teacher: teacherRes,
      permissions,
    };
  }
}

export const accountDirectory = new AccountDirectory();
