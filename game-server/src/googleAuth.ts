import type { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { signUserToken, UserSession } from './auth.js';

function cleanReturnTo(returnTo: string): string {
  if (!returnTo) return '/';
  const base = returnTo.split('#')[0].replace(/\/$/, '');
  return base ? `${base}/` : '/';
}

/**
 * Initiates Google OAuth Login or displays the Retro Google Account Selection screen
 */
export async function handleGoogleAuthLogin(req: Request, res: Response) {
  const redirectUriParam = (req.query.redirect_uri as string) || (req.query.return_to as string);
  const host = (req.headers['x-forwarded-host'] as string) || req.get('host') || 'localhost:3000';
  const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'http';
  const fallbackReturn = `${proto}://${host}/`;
  const returnTo = redirectUriParam || fallbackReturn;

  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

  // 1. If real Google Client ID is configured and not placeholder
  if (
    googleClientId &&
    googleClientSecret &&
    !googleClientId.includes('YOUR_') &&
    !googleClientId.includes('placeholder')
  ) {
    const callbackUrl = process.env.GOOGLE_REDIRECT_URI || `${proto}://${host}/api/auth/callback`;
    const state = Buffer.from(JSON.stringify({ returnTo, nonce: Date.now() })).toString('base64url');

    const googleAuthUrl =
      `https://accounts.google.com/o/oauth2/v2/auth?` +
      new URLSearchParams({
        client_id: googleClientId,
        redirect_uri: callbackUrl,
        response_type: 'code',
        scope: 'openid email profile',
        state: state,
        prompt: 'select_account'
      }).toString();

    return res.redirect(googleAuthUrl);
  }

  // 2. Otherwise: Render Retro 1990 Arcade Google Account Picker & Simulator
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.send(renderGoogleAccountPickerHtml(returnTo, host, proto));
}

/**
 * Handles OAuth callback from Google
 */
export async function handleGoogleAuthCallback(req: Request, res: Response) {
  const code = req.query.code as string;
  const stateStr = req.query.state as string;
  const error = req.query.error as string;

  let returnTo = '/';
  try {
    if (stateStr) {
      const parsed = JSON.parse(Buffer.from(stateStr, 'base64url').toString('utf8'));
      if (parsed.returnTo) returnTo = parsed.returnTo;
    }
  } catch (e) {
    // Ignore parse error
  }

  const baseTarget = cleanReturnTo(returnTo);

  if (error) {
    return res.redirect(`${baseTarget}?error=${encodeURIComponent(error)}`);
  }

  if (!code) {
    return res.redirect(`${baseTarget}?error=missing_code`);
  }

  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const host = (req.headers['x-forwarded-host'] as string) || req.get('host') || 'localhost:3000';
  const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'http';
  const callbackUrl = process.env.GOOGLE_REDIRECT_URI || `${proto}://${host}/api/auth/callback`;

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: googleClientId || '',
        client_secret: googleClientSecret || '',
        redirect_uri: callbackUrl,
        grant_type: 'authorization_code'
      }).toString()
    });

    const tokenData = (await tokenRes.json()) as any;
    if (!tokenData.id_token && !tokenData.access_token) {
      throw new Error(tokenData.error_description || tokenData.error || 'Failed to exchange token');
    }

    let name = 'GoogleTanker';
    let email = 'student@ubu.ac.th';
    let avatar = '';
    let sub = `google-${Date.now()}`;

    if (tokenData.id_token) {
      const decoded: any = jwt.decode(tokenData.id_token);
      if (decoded) {
        sub = decoded.sub || sub;
        name = decoded.name || decoded.email?.split('@')[0] || name;
        email = decoded.email || email;
        avatar = decoded.picture || '';
      }
    }

    const sessionToken = signUserToken({
      id: `google-${sub}`,
      name,
      email,
      avatar,
      isGuest: false
    });

    return res.redirect(
      `${baseTarget}#access_token=${encodeURIComponent(sessionToken)}&token=${encodeURIComponent(
        sessionToken
      )}&name=${encodeURIComponent(name)}`
    );
  } catch (err: any) {
    console.error('[Google OAuth Callback Error]:', err);
    return res.redirect(`${baseTarget}?error=${encodeURIComponent(err.message || 'oauth_failed')}`);
  }
}

/**
 * Handles Direct Google Sign-In or Google Mock Submission
 */
export async function handleGoogleDirectLogin(req: Request, res: Response) {
  const { credential, email, name, avatar, returnTo } = req.body;

  let displayName = name;
  let userEmail = email;
  let userAvatar = avatar;
  let userId = `google-${Date.now().toString(36)}`;

  // 1. If Google ID Token credential passed (from Google One Tap / GIS)
  if (credential) {
    try {
      const decoded: any = jwt.decode(credential);
      if (decoded) {
        userId = `google-${decoded.sub || Date.now()}`;
        displayName = decoded.name || decoded.email?.split('@')[0] || 'GooglePlayer';
        userEmail = decoded.email;
        userAvatar = decoded.picture;
      }
    } catch (e) {
      console.warn('Could not decode Google credential:', e);
    }
  }

  displayName = displayName || (userEmail ? userEmail.split('@')[0] : 'นักศึกษา Google');
  userEmail = userEmail || `${displayName.toLowerCase().replace(/\s+/g, '')}@ubu.ac.th`;

  const token = signUserToken({
    id: userId,
    name: displayName,
    email: userEmail,
    avatar: userAvatar,
    isGuest: false
  });

  // If request is from HTML form post, redirect to returnTo
  if (returnTo) {
    const baseTarget = cleanReturnTo(returnTo);
    return res.redirect(
      `${baseTarget}#access_token=${encodeURIComponent(token)}&token=${encodeURIComponent(
        token
      )}&name=${encodeURIComponent(displayName)}`
    );
  }

  return res.json({
    success: true,
    token,
    name: displayName,
    email: userEmail,
    avatar: userAvatar
  });
}

/**
 * HTML template for the 1990 Retro Arcade Google Account Picker & Simulator
 */
function renderGoogleAccountPickerHtml(returnTo: string, host: string, proto: string): string {
  const submitUrl = `${proto}://${host}/api/auth/google`;

  return `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Google Sign-In • TANK QUIZ BATTLE</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&family=Prompt:wght@400;600;700;900&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: #030712;
      color: #f8fafc;
      font-family: 'Prompt', sans-serif;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
      position: relative;
    }
    /* CRT Scanlines */
    body::before {
      content: " ";
      display: block;
      position: fixed;
      top: 0; left: 0; bottom: 0; right: 0;
      background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.4) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.03), rgba(0, 255, 0, 0.01), rgba(0, 0, 255, 0.03));
      z-index: 100;
      background-size: 100% 3px, 6px 100%;
      pointer-events: none;
    }
    .card {
      background: #111827;
      border: 4px solid #000;
      box-shadow: 8px 8px 0px #000;
      max-width: 440px;
      width: 100%;
      padding: 28px 24px;
      position: relative;
      z-index: 10;
    }
    .corner {
      position: absolute;
      width: 10px; height: 10px;
      background: #f59e0b;
      border: 1px solid #000;
    }
    .tl { top: 4px; left: 4px; }
    .tr { top: 4px; right: 4px; }
    .bl { bottom: 4px; left: 4px; }
    .br { bottom: 4px; right: 4px; }
    .font-arcade { font-family: 'Press Start 2P', monospace; }
    .title {
      color: #fbbf24;
      font-size: 13px;
      line-height: 1.6;
      text-align: center;
      margin-bottom: 6px;
      text-shadow: 2px 2px 0 #000;
    }
    .subtitle {
      font-size: 12px;
      color: #94a3b8;
      text-align: center;
      margin-bottom: 20px;
    }
    .google-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: #ffffff;
      color: #1f2937;
      padding: 6px 12px;
      border: 2px solid #000;
      font-weight: 700;
      font-size: 12px;
      margin: 0 auto 16px auto;
      box-shadow: 3px 3px 0 #000;
    }
    .account-btn {
      display: flex;
      align-items: center;
      gap: 12px;
      width: 100%;
      background: #1e293b;
      border: 3px solid #334155;
      color: #f1f5f9;
      padding: 12px;
      margin-bottom: 10px;
      cursor: pointer;
      text-align: left;
      font-family: inherit;
      box-shadow: 4px 4px 0 #000;
      transition: all 0.1s ease;
      text-decoration: none;
    }
    .account-btn:hover {
      background: #334155;
      border-color: #fbbf24;
      transform: translate(-1px, -1px);
      box-shadow: 5px 5px 0 #000;
    }
    .account-btn:active {
      transform: translate(2px, 2px);
      box-shadow: 1px 1px 0 #000;
    }
    .avatar {
      width: 36px; height: 36px;
      background: #0284c7;
      border: 2px solid #000;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 900;
      font-size: 16px;
      flex-shrink: 0;
    }
    .acc-name { font-weight: 700; font-size: 13px; color: #f8fafc; }
    .acc-email { font-size: 11px; color: #94a3b8; }
    .divider {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 16px 0;
      color: #64748b;
      font-size: 10px;
    }
    .divider::before, .divider::after {
      content: "";
      flex: 1;
      height: 2px;
      background: #334155;
    }
    .custom-input {
      width: 100%;
      padding: 10px 12px;
      background: #000;
      border: 3px solid #475569;
      color: #fbbf24;
      font-family: inherit;
      font-size: 13px;
      font-weight: 600;
      margin-bottom: 8px;
    }
    .custom-input:focus {
      outline: none;
      border-color: #fbbf24;
    }
    .submit-btn {
      width: 100%;
      padding: 12px;
      background: #eab308;
      border: 3px solid #000;
      color: #000;
      font-weight: 900;
      font-size: 12px;
      cursor: pointer;
      box-shadow: 4px 4px 0 #000;
      font-family: 'Press Start 2P', monospace;
    }
    .submit-btn:hover { background: #facc15; }
    .submit-btn:active { transform: translate(2px, 2px); box-shadow: 1px 1px 0 #000; }
    .footer-note {
      margin-top: 18px;
      padding-top: 14px;
      border-top: 2px dashed #334155;
      font-size: 10px;
      color: #64748b;
      text-align: center;
      line-height: 1.5;
    }
  </style>
</head>
<body>

  <div class="card">
    <div class="corner tl"></div>
    <div class="corner tr"></div>
    <div class="corner bl"></div>
    <div class="corner br"></div>

    <div style="text-align: center;">
      <div class="google-badge">
        <svg style="width:16px;height:16px;" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
        </svg>
        <span>Google Account</span>
      </div>
      <h1 class="font-arcade title">CHOOSE ACCOUNT</h1>
      <p class="subtitle">เลือกบัญชี Google เพื่อเข้าสู่สมรภูมิรบ</p>
    </div>

    <!-- Quick Preset 1: Student Account -->
    <form action="${submitUrl}" method="POST">
      <input type="hidden" name="returnTo" value="${encodeURI(returnTo)}">
      <input type="hidden" name="name" value="นักศึกษา ม.อุบลฯ">
      <input type="hidden" name="email" value="student.ubu@ubu.ac.th">
      <button type="submit" class="account-btn">
        <div class="avatar" style="background:#3b82f6;">🎓</div>
        <div>
          <div class="acc-name">นักศึกษา ม.อุบลฯ (Student)</div>
          <div class="acc-email">student.ubu@ubu.ac.th</div>
        </div>
      </button>
    </form>

    <!-- Quick Preset 2: Commander Account -->
    <form action="${submitUrl}" method="POST">
      <input type="hidden" name="returnTo" value="${encodeURI(returnTo)}">
      <input type="hidden" name="name" value="พลขับระดับสูง (Commander)">
      <input type="hidden" name="email" value="tank.ace@ubu.ac.th">
      <button type="submit" class="account-btn">
        <div class="avatar" style="background:#f59e0b;">⭐</div>
        <div>
          <div class="acc-name">พลขับระดับสูง (Commander)</div>
          <div class="acc-email">tank.ace@ubu.ac.th</div>
        </div>
      </button>
    </form>

    <!-- Quick Preset 3: Teacher Account -->
    <form action="${submitUrl}" method="POST">
      <input type="hidden" name="returnTo" value="${encodeURI(returnTo)}">
      <input type="hidden" name="name" value="อาจารย์ผู้สอน (Teacher)">
      <input type="hidden" name="email" value="teacher.tank@ubu.ac.th">
      <button type="submit" class="account-btn">
        <div class="avatar" style="background:#10b981;">👨‍🏫</div>
        <div>
          <div class="acc-name">อาจารย์ผู้สอน (Teacher Portal)</div>
          <div class="acc-email">teacher.tank@ubu.ac.th</div>
        </div>
      </button>
    </form>

    <div class="divider font-arcade">OR CUSTOM GOOGLE ACCOUNT</div>

    <!-- Custom Account Input -->
    <form action="${submitUrl}" method="POST">
      <input type="hidden" name="returnTo" value="${encodeURI(returnTo)}">
      <input type="text" name="name" class="custom-input" placeholder="ชื่อ-นามสกุล / ชื่อเล่น" required>
      <input type="email" name="email" class="custom-input" placeholder="อีเมล Google (เช่น somchai@gmail.com)" required>
      <button type="submit" class="submit-btn">▸ SIGN IN WITH GOOGLE</button>
    </form>

    <div class="footer-note">
      💡 <strong>เคล็ดลับสำหรับผู้ดูแลระบบ:</strong> เมื่อใส่ <code style="color:#fbbf24;">GOOGLE_CLIENT_ID</code> และ <code style="color:#fbbf24;">GOOGLE_CLIENT_SECRET</code> ในระบบ ระบบจะเปลี่ยนเป็น Google Cloud OAuth จริงโดยอัตโนมัติ
    </div>

  </div>

</body>
</html>`;
}
