import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { accountDirectory } from './accountDirectory.js';
import { opaClient } from './opaClient.js';
import {
  GoogleSyncRequest,
  UserRoleCode,
  OfflineStudentLoginRequest,
  OfflineTeacherLoginRequest
} from './types.js';


const app = express();
const PORT = process.env.PORT || 4005;

app.use(cors());
app.use(express.json());

// Auth Token Verification Middleware
function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, error: 'Authorization header required' });
  }

  const result = accountDirectory.verifyToken(token);
  if (!result.valid || !result.payload) {
    return res.status(403).json({ success: false, error: result.error || 'Invalid or expired token' });
  }

  (req as any).user = result.payload;
  next();
}

// -------------------------------------------------------------
// 1. Health Probe (With OPA Engine Status)
// -------------------------------------------------------------
app.get('/api/account/health', async (_req: Request, res: Response) => {
  const opaHealthy = await opaClient.checkHealth();
  res.json({
    status: 'ok',
    service: 'tank-quiz-account-service',
    standalone: true,
    opaEngineConnected: opaHealthy,
    totalAccounts: accountDirectory.accounts.size,
    totalStudents: accountDirectory.students.size,
    totalTeachers: accountDirectory.teachers.size,
    timestamp: new Date().toISOString(),
  });
});

// -------------------------------------------------------------
// 2. Master Data Endpoint (Faculties, Departments, Sections, Titles)
// -------------------------------------------------------------
app.get('/api/account/master-data', (_req: Request, res: Response) => {
  res.json({
    success: true,
    faculties: Array.from(accountDirectory.faculties.values()),
    departments: Array.from(accountDirectory.departments.values()),
    sections: Array.from(accountDirectory.sections.values()),
    titles: Array.from(accountDirectory.titles.values()),
    roles: Array.from(accountDirectory.roles.values()),
  });
});

// -------------------------------------------------------------
// 3. Offline Student Login Endpoint (Classroom LAN / No Internet)
// -------------------------------------------------------------
app.post('/api/account/offline-login', async (req: Request, res: Response) => {
  const { studentId, name, facultyId, departmentId, sectionId } = req.body as OfflineStudentLoginRequest;

  if (!name && !studentId) {
    return res.status(400).json({ success: false, error: 'Student ID or Player name is required' });
  }

  try {
    const result = await accountDirectory.syncOfflineStudentLogin({
      studentId,
      name,
      facultyId,
      departmentId,
      sectionId,
    });
    res.json({
      success: true,
      token: result.token,
      user: result.userDetail,
      isNew: result.isNew,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Offline login failed' });
  }
});

// -------------------------------------------------------------
// 4. Offline Teacher & Admin Login Endpoint (Classroom LAN)
// -------------------------------------------------------------
app.post('/api/account/teacher-login', async (req: Request, res: Response) => {
  const { username, password } = req.body as OfflineTeacherLoginRequest;

  if (!username || !password) {
    return res.status(400).json({ success: false, error: 'Username and password are required' });
  }

  try {
    const result = await accountDirectory.syncOfflineTeacherLogin({ username, password });
    if (!result) {
      return res.status(401).json({ success: false, error: 'Invalid teacher credentials or PIN' });
    }
    res.json({
      success: true,
      token: result.token,
      user: result.userDetail,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Teacher login failed' });
  }
});

// -------------------------------------------------------------
// 5. Google OAuth User Sync & Token Provisioning (Online Fallback)
// -------------------------------------------------------------
app.post('/api/account/sync-google', (req: Request, res: Response) => {
  const { email, name, googleSub, avatarUrl } = req.body as GoogleSyncRequest;

  if (!email || !name) {
    return res.status(400).json({ success: false, error: 'Email and name are required' });
  }

  try {
    const result = accountDirectory.syncGoogleLogin({ email, name, googleSub, avatarUrl });
    res.json({
      success: true,
      token: result.token,
      user: result.userDetail,
      isNew: result.isNew,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Sync failed' });
  }
});


// -------------------------------------------------------------
// 4. User Profile (For Logged In User)
// -------------------------------------------------------------
app.get('/api/account/profile', authenticateToken, (req: Request, res: Response) => {
  const tokenUser = (req as any).user;
  const targetId = tokenUser.userId || tokenUser.sub || tokenUser.id;
  let userDetail = targetId ? accountDirectory.getFullUserDetail(targetId) : undefined;

  if (!userDetail && tokenUser.email) {
    const acc = accountDirectory.accounts.get(tokenUser.email.trim().toLowerCase());
    if (acc) {
      userDetail = accountDirectory.getFullUserDetail(acc.id);
    } else {
      const syncResult = accountDirectory.syncGoogleLogin({
        email: tokenUser.email,
        name: tokenUser.name || 'Google User',
        googleSub: tokenUser.sub,
      });
      userDetail = syncResult.userDetail;
    }
  }

  if (!userDetail) {
    return res.status(404).json({ success: false, error: 'User profile not found' });
  }

  const sessionToken = accountDirectory.generateToken(userDetail);

  res.json({
    success: true,
    user: userDetail,
    token: sessionToken,
  });
});

// -------------------------------------------------------------
// 5. Students Directory (Teacher & Admin Only)
// -------------------------------------------------------------
app.get('/api/account/students', authenticateToken, (req: Request, res: Response) => {
  const tokenUser = (req as any).user;

  if (tokenUser.role !== 'TEACHER' && tokenUser.role !== 'ADMIN') {
    return res.status(403).json({ success: false, error: 'Access denied: Teacher or Admin role required' });
  }

  const { sectionId, facultyId } = req.query as { sectionId?: string; facultyId?: string };
  let studentList = Array.from(accountDirectory.students.values());

  if (sectionId) {
    studentList = studentList.filter(s => s.sectionId === sectionId);
  }
  if (facultyId) {
    studentList = studentList.filter(s => s.facultyId === facultyId);
  }

  const enrichedStudents = studentList.map(s => {
    const prof = accountDirectory.profiles.get(s.userProfileId);
    const fac = accountDirectory.faculties.get(s.facultyId);
    const dept = accountDirectory.departments.get(s.departmentId);
    const sec = accountDirectory.sections.get(s.sectionId);
    return {
      ...s,
      displayName: prof?.displayName,
      firstNameTh: prof?.firstNameTh,
      lastNameTh: prof?.lastNameTh,
      avatarUrl: prof?.avatarUrl,
      facultyName: fac?.nameTh,
      departmentName: dept?.nameTh,
      sectionCode: sec?.sectionCode,
    };
  });

  res.json({
    success: true,
    count: enrichedStudents.length,
    students: enrichedStudents,
  });
});

// -------------------------------------------------------------
// 6. Verify Permission (Evaluated via OPA Rego Policy Engine)
// -------------------------------------------------------------
app.post('/api/account/verify-permission', async (req: Request, res: Response) => {
  const { role, permission } = req.body as { role: UserRoleCode; permission: string };

  if (!role || !permission) {
    return res.status(400).json({ success: false, error: 'Role and permission required' });
  }

  const allowed = await accountDirectory.hasPermissionWithOpa(role, permission);
  res.json({
    success: true,
    role,
    permission,
    allowed,
    policyEngine: 'OPA-Rego',
  });
});

app.listen(PORT, () => {
  console.log(`[AccountService] 🚀 3NF Identity, Student Profile & RBAC running on port ${PORT}`);
});
