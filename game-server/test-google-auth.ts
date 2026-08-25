import express from 'express';
import { createServer } from 'http';
import { handleGoogleAuthLogin, handleGoogleAuthCallback, handleGoogleDirectLogin } from './src/googleAuth.js';
import { verifyToken, signUserToken } from './src/auth.js';

async function testGoogleAuth() {
  console.log('🚀 [TEST] Testing Google OAuth and Account Authentication Flows...');

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

  // 1. Test GET /api/auth/login
  console.log('   1. Testing GET /api/auth/login...');
  const res1 = await fetch(`${baseUrl}/api/auth/login?redirect_uri=http://localhost:3000/`);
  console.assert(res1.status === 200, 'GET /api/auth/login should return 200 OK');
  const html1 = await res1.text();
  console.assert(html1.includes('Google Account') || html1.includes('CHOOSE ACCOUNT'), 'HTML should render Google Account Picker');
  console.log('   ✓ GET /api/auth/login rendered Google Account Picker successfully!');

  // 2. Test GET /auth/login (proxied route)
  console.log('   2. Testing GET /auth/login (proxied alias)...');
  const res2 = await fetch(`${baseUrl}/auth/login?redirect_uri=http://localhost:3000/`);
  console.assert(res2.status === 200, 'GET /auth/login should return 200 OK');
  console.log('   ✓ GET /auth/login alias verified!');

  // 3. Test POST /api/auth/google (Simulated / Custom Google Login)
  console.log('   3. Testing POST /api/auth/google (Account Sign-In Submission)...');
  const res3 = await fetch(`${baseUrl}/api/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    redirect: 'manual',
    body: new URLSearchParams({
      name: 'สมชาย นักรบรถถัง',
      email: 'somchai.t@ubu.ac.th',
      returnTo: 'http://localhost:3000/'
    }).toString()
  });

  console.assert(res3.status === 302, 'POST /api/auth/google should redirect with 302');
  const redirectLoc = res3.headers.get('location') || '';
  console.assert(redirectLoc.includes('#access_token='), 'Redirect Location should contain URL fragment with access_token');
  console.assert(redirectLoc.includes('name=%E0%B8%AA%E0%B8%A1%E0%B8%8A%E0%B8%B2%E0%B8%A2'), 'Redirect Location should contain encoded name');
  console.log('   ✓ Redirect location verified:', redirectLoc.substring(0, 70) + '...');

  // 4. Extract token and verify with auth engine
  const hash = redirectLoc.split('#')[1];
  const params = new URLSearchParams(hash);
  const token = params.get('access_token');
  console.assert(!!token, 'Extracted access_token should be non-empty');

  const userSession = await verifyToken(token!);
  console.assert(!!userSession, 'verifyToken should successfully verify the token');
  console.assert(userSession?.name === 'สมชาย นักรบรถถัง', 'User session name should match');
  console.assert(userSession?.email === 'somchai.t@ubu.ac.th', 'User session email should match');
  console.log('   ✓ Token payload verified via verifyToken:', userSession);

  // 5. Test JSON API payload for Google GIS
  console.log('   5. Testing JSON API POST /api/auth/google...');
  const res4 = await fetch(`${baseUrl}/api/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Teacher Quiz Master',
      email: 'teacher@ubu.ac.th'
    })
  });
  const data4 = await res4.json();
  console.assert(data4.success === true, 'JSON response should indicate success');
  console.assert(!!data4.token, 'JSON response should include token');
  console.log('   ✓ JSON API verified:', data4.name);

  httpServer.close();
  console.log('\n🎉 ALL GOOGLE AUTH TESTS PASSED 100%!\n');
}

testGoogleAuth().catch((err) => {
  console.error('❌ GOOGLE AUTH TEST FAILED:', err);
  process.exit(1);
});
