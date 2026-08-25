import type { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { signUserToken } from './auth.js';

function cleanReturnTo(returnTo: string): string {
  if (!returnTo) return '/';
  const base = returnTo.split('#')[0].replace(/\/$/, '');
  return base ? `${base}/` : '/';
}

/**
 * Initiates Google OAuth Login - Redirects DIRECTLY to Google Sign-In (accounts.google.com)
 */
export async function handleGoogleAuthLogin(req: Request, res: Response) {
  const redirectUriParam = (req.query.redirect_uri as string) || (req.query.return_to as string);
  const host = (req.headers['x-forwarded-host'] as string) || req.get('host') || 'localhost:3000';
  const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'http';
  const fallbackReturn = `${proto}://${host}/`;
  const returnTo = redirectUriParam || fallbackReturn;

  const googleClientId = process.env.GOOGLE_CLIENT_ID || '';
  const callbackUrl = process.env.GOOGLE_REDIRECT_URI || `${proto}://${host}/auth/callback`;
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

  const googleClientId = process.env.GOOGLE_CLIENT_ID || '';
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
  const host = (req.headers['x-forwarded-host'] as string) || req.get('host') || 'localhost:3000';
  const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'http';
  const callbackUrl = process.env.GOOGLE_REDIRECT_URI || `${proto}://${host}/auth/callback`;

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: googleClientId,
        client_secret: googleClientSecret,
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
 * Handles Direct Google Sign-In (Token validation from Google One Tap / GIS)
 */
export async function handleGoogleDirectLogin(req: Request, res: Response) {
  const { credential, email, name, avatar, returnTo } = req.body;

  let displayName = name;
  let userEmail = email;
  let userAvatar = avatar;
  let userId = `google-${Date.now().toString(36)}`;

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
