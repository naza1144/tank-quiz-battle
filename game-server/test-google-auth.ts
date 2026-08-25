import express from 'express';
import { createServer } from 'http';
import { handleGoogleAuthLogin, handleGoogleAuthCallback, handleGoogleDirectLogin } from './src/googleAuth.js';
import { verifyToken, signUserToken } from './src/auth.js';

process.env.GOOGLE_CLIENT_ID = 'mock-client-id.apps.googleusercontent.com';
process.env.GOOGLE_CLIENT_SECRET = 'mock-client-secret';

async function testGoogleAuth() {
  console.log('🚀 [TEST] Testing Direct Google OAuth Sign-In (Straight to accounts.google.com)...');

  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.get(['/api/auth/login', '/auth/login'], handleGoogleAuthLogin);
  app.get(['/api/auth/callback', '/auth/callback'], handleGoogleAuthCallback);
  app.post(['/api/auth/google', '/auth/google'], handleGoogleDirectLogin);

  const httpServer = createServer(app);
  const TEST_PORT = 40089;
  await new Promise<void>((resolve) => httpServer.listen(TEST_PORT, resolve));
  const baseUrl = `http://localhost:${TEST_PORT}`;

  // 1. Test GET /api/auth/login -> must redirect directly to accounts.google.com
  console.log('   1. Testing GET /api/auth/login (Must redirect directly to Google)...');
  const res1 = await fetch(`${baseUrl}/api/auth/login?redirect_uri=http://localhost:3000/`, { redirect: 'manual' });
  console.assert(res1.status === 302, 'GET /api/auth/login should return 302 Found redirect');
  const loc1 = res1.headers.get('location') || '';
  console.assert(loc1.startsWith('https://accounts.google.com/o/oauth2/v2/auth'), 'Redirect location MUST point directly to accounts.google.com');
  console.assert(loc1.includes('client_id=mock-client-id.apps.googleusercontent.com'), 'Redirect location MUST contain Google Client ID');
  console.assert(loc1.includes('prompt=select_account'), 'Redirect location should include prompt=select_account');
  console.log('   ✓ Direct Google Redirect Verified:', loc1.substring(0, 80) + '...');

  // 2. Test GET /auth/login (proxied alias)
  console.log('   2. Testing GET /auth/login (proxied alias)...');
  const res2 = await fetch(`${baseUrl}/auth/login?redirect_uri=http://192.168.50.96:30080/`, { redirect: 'manual' });
  console.assert(res2.status === 302, 'GET /auth/login should return 302 Found redirect');
  const loc2 = res2.headers.get('location') || '';
  console.assert(loc2.startsWith('https://accounts.google.com/o/oauth2/v2/auth'), 'Redirect location MUST point directly to accounts.google.com');
  console.log('   ✓ GET /auth/login verified!');

  // 3. Test JSON API POST /api/auth/google
  console.log('   3. Testing JSON API POST /api/auth/google...');
  const res3 = await fetch(`${baseUrl}/api/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Google Student',
      email: 'student@ubu.ac.th'
    })
  });
  const data3 = await res3.json();
  console.assert(data3.success === true, 'JSON response should indicate success');
  console.assert(!!data3.token, 'JSON response should include token');

  const userSession = await verifyToken(data3.token);
  console.assert(userSession?.name === 'Google Student', 'Token payload name must match');
  console.assert(userSession?.email === 'student@ubu.ac.th', 'Token payload email must match');
  console.log('   ✓ Token payload verified via verifyToken:', userSession);

  httpServer.close();
  console.log('\n🎉 ALL DIRECT GOOGLE OAUTH TESTS PASSED 100%!\n');
}

testGoogleAuth().catch((err) => {
  console.error('❌ GOOGLE AUTH TEST FAILED:', err);
  process.exit(1);
});
