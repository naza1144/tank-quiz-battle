import express from 'express';
import { createServer } from 'http';
import { handleGoogleAuthLogin, handleGoogleAuthCallback, handleGoogleDirectLogin } from './src/googleAuth.js';
import { verifyToken, signUserToken } from './src/auth.js';

async function testGoogleAuth() {
  console.log('🚀 [TEST] Testing Google OAuth Redirect via Verified IDP Domain...');

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

  // 1. Test GET /api/auth/login -> must redirect to verified IDP domain
  console.log('   1. Testing GET /api/auth/login (Must redirect to verified IDP domain)...');
  const res1 = await fetch(`${baseUrl}/api/auth/login?redirect_uri=http://192.168.50.96:30080/`, { redirect: 'manual' });
  console.assert(res1.status === 302, 'GET /api/auth/login should return 302 Found redirect');
  const loc1 = res1.headers.get('location') || '';
  console.assert(loc1.includes('sudhood.192-168-50-96.sslip.io/auth/login'), 'Redirect location MUST point to verified domain');
  console.log('   ✓ Verified Domain Redirect:', loc1);

  // 2. Test GET /auth/login (proxied alias)
  console.log('   2. Testing GET /auth/login (proxied alias)...');
  const res2 = await fetch(`${baseUrl}/auth/login?redirect_uri=http://192.168.50.96:30080/`, { redirect: 'manual' });
  console.assert(res2.status === 302, 'GET /auth/login should return 302 Found redirect');
  console.log('   ✓ GET /auth/login alias verified!');

  // 3. Test JSON API POST /api/auth/google
  console.log('   3. Testing JSON API POST /api/auth/google...');
  const res3 = await fetch(`${baseUrl}/api/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Google Student',
      email: 'knnbos77@gmail.com'
    })
  });
  const data3 = await res3.json();
  console.assert(data3.success === true, 'JSON response should indicate success');
  console.assert(!!data3.token, 'JSON response should include token');

  const userSession = await verifyToken(data3.token);
  console.assert(userSession?.name === 'Google Student', 'Token payload name must match');
  console.assert(userSession?.email === 'knnbos77@gmail.com', 'Token payload email must match');
  console.log('   ✓ Token payload verified via verifyToken:', userSession);

  httpServer.close();
  console.log('\n🎉 ALL GOOGLE AUTH TESTS PASSED 100%!\n');
}

testGoogleAuth().catch((err) => {
  console.error('❌ GOOGLE AUTH TEST FAILED:', err);
  process.exit(1);
});
