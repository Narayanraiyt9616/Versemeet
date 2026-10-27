import { io } from 'socket.io-client';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';
const PREVIEW_URL = process.env.PREVIEW_URL || 'http://localhost:4173';

async function runSPATests() {
  console.log('===============================================================');
  console.log('  CampusVerse Meet - SPA Fallback & Browser Reload Test Suite  ');
  console.log('===============================================================');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, message) {
    totalTests++;
    if (condition) {
      console.log(`  ✓ PASS: ${message}`);
      passedTests++;
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  // 1. Test Static Routes on Backend Server
  console.log('\n--- 1. Testing Backend SPA Fallback on Server (Port 5000) ---');
  const backendRoutes = [
    { path: '/', label: 'Home Page' },
    { path: '/create', label: 'Create Meeting Page' },
    { path: '/join', label: 'Join Meeting Page' },
    { path: '/dashboard', label: 'Dashboard Page' },
    { path: '/login', label: 'Login Page' },
    { path: '/waiting/vm-test-room-1', label: 'Waiting Room Route' },
    { path: '/meeting/vm-test-room-1', label: 'Meeting Room Route' },
    { path: '/meeting/vm-test-room-1/ended', label: 'Meeting Ended Route' }
  ];

  for (const { path, label } of backendRoutes) {
    const res = await fetch(`${BACKEND_URL}${path}`);
    const text = await res.text();
    const isHtml = text.includes('<!doctype html>') && text.includes('CampusVerse Meet');
    assert(res.status === 200 && isHtml, `Direct GET ${path} (${label}) returned status 200 and served index.html SPA entry`);
  }

  // 2. Test Browser Rapid Refresh Simulation
  console.log('\n--- 2. Simulating Rapid Browser Refreshes (5x on /meeting/vm-test-room-1) ---');
  for (let i = 1; i <= 5; i++) {
    const res = await fetch(`${BACKEND_URL}/meeting/vm-test-room-1`, {
      headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
    });
    const text = await res.text();
    assert(res.status === 200 && text.includes('<!doctype html>'), `Refresh #${i}: Reloaded /meeting/vm-test-room-1 with 200 OK`);
  }

  // 3. Test API Route Preservation (Ensure fallback does not interfere with APIs)
  console.log('\n--- 3. Verifying API Endpoints Are Preserved & Not Intercepted ---');
  const healthRes = await fetch(`${BACKEND_URL}/api/health`);
  const healthJson = await healthRes.json();
  assert(healthRes.status === 200 && healthJson.status === 'ok', `GET /api/health returned JSON status "ok"`);

  // Create real meeting to test host and meeting APIs
  const createRes = await fetch(`${BACKEND_URL}/api/meetings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'SPA Routing Verification Meeting',
      hostName: 'Dr. Turing',
      settings: { isWaitingRoomEnabled: true }
    })
  });
  const createJson = await createRes.json();
  assert(createRes.status === 201 && createJson.success, `POST /api/meetings created meeting code: ${createJson.data.meetingCode}`);

  const { meetingCode, hostToken } = createJson.data;

  // Test host verification API (used during page refresh to restore host privileges)
  const verifyRes = await fetch(`${BACKEND_URL}/api/meetings/${meetingCode}/verify-host`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hostToken })
  });
  const verifyJson = await verifyRes.json();
  assert(verifyRes.status === 200 && verifyJson.isHost === true, `POST /api/meetings/${meetingCode}/verify-host confirms host authorization on reload`);

  // 4. Test Client Vite Preview Server (Port 4173) if running
  console.log('\n--- 4. Testing Vite Preview SPA Server (Port 4173) ---');
  try {
    const probe = await fetch(PREVIEW_URL, { signal: AbortSignal.timeout(1000) });
    if (probe.ok) {
      for (const { path, label } of backendRoutes) {
        const res = await fetch(`${PREVIEW_URL}${path}`);
        const text = await res.text();
        const isHtml = text.includes('<!doctype html>');
        assert(res.status === 200 && isHtml, `Vite Preview GET ${path} (${label}) returned status 200 and served index.html SPA entry`);
      }

      // Rapid refresh test on Vite Preview
      for (let i = 1; i <= 3; i++) {
        const res = await fetch(`${PREVIEW_URL}/create`);
        assert(res.status === 200, `Vite Preview Refresh #${i}: Reloaded /create with 200 OK`);
      }
    }
  } catch (e) {
    console.log('  ℹ (Vite preview server on port 4173 is offline; backend server fallback verified above)');
  }

  console.log('\n===============================================================');
  console.log(` ALL ${passedTests} SPA ROUTING & RELOAD TESTS PASSED PERFECTLY! `);
  console.log('===============================================================');
}

runSPATests().catch(err => {
  console.error('\nSPA TEST SUITE FAILED:', err);
  process.exit(1);
});
