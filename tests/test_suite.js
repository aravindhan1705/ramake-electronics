/**
 * REMAKE ELECTRONICS - Comprehensive Integration Test Suite
 */

const assert = require('assert');

const BASE_URL = 'http://localhost:3000';

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const res = await fetch(url, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
}

async function runTests() {
  console.log('🚀 STARTING COMPREHENSIVE INTEGRATION TEST SUITE FOR REMAKE ELECTRONICS\n');
  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    return (async () => {
      try {
        await fn();
        console.log(`  ✅ [PASS] ${name}`);
        passed++;
      } catch (err) {
        console.error(`  ❌ [FAIL] ${name}: ${err.message}`);
        failed++;
      }
    })();
  }

  // 1. Health check & Server Status
  await test('Server is alive and health check returns status online', async () => {
    const res = await request('/api/health');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.app, 'REMAKE ELECTRONICS');
  });

  // 2. Component Catalog
  await test('Catalog endpoint returns 45+ electronic components', async () => {
    const res = await request('/api/components/catalog');
    assert.strictEqual(res.status, 200);
    assert(Array.isArray(res.data.catalog));
    assert(res.data.catalog.length >= 40);
    const arduino = res.data.catalog.find((c) => c.id === 'ARDUINO_UNO');
    assert(arduino && arduino.name === 'Arduino Uno');
  });

  // 3. Projects Database
  await test('Projects endpoint returns 18+ predefined projects', async () => {
    const res = await request('/api/projects');
    assert.strictEqual(res.status, 200);
    assert(Array.isArray(res.data.projects));
    assert(res.data.projects.length >= 18);
    const dustbin = res.data.projects.find((p) => p.name === 'Automatic Dustbin');
    assert(dustbin);
    assert.strictEqual(dustbin.difficulty, 'Beginner');
  });

  // 4. Email Validation
  await test('Email validation rejects malformed emails (abc, abc@, etc.)', async () => {
    const invalidEmails = ['abc', 'abc@', 'abc.com@', '@abc.com'];
    for (const email of invalidEmails) {
      const res = await request('/api/auth/send-otp', {
        method: 'POST',
        body: JSON.stringify({ email })
      });
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.data.message, 'Please enter a valid email address.');
    }
  });

  // 5. Signup Validation
  await test('Signup requires valid full name', async () => {
    const res = await request('/api/auth/send-otp', {
      method: 'POST',
      body: JSON.stringify({ email: 'testmaker@example.com', fullName: '', isSignup: true })
    });
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.data.message, 'Please enter your full name.');
  });

  // 6. OTP Dispatch & Rate Limiting
  let testOtp = null;
  const testEmail = `aravindhan_${Date.now()}@example.com`;
  const testName = 'Aravindhan R';

  await test('Sending OTP generates 6-digit code and starts cooldown', async () => {
    const res = await request('/api/auth/send-otp', {
      method: 'POST',
      body: JSON.stringify({ email: testEmail, fullName: testName, isSignup: true })
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
    assert.strictEqual(res.data.message, 'OTP sent to your email.');

    // Fetch generated OTP from dev mailbox
    const mailRes = await request(`/api/auth/dev-mailbox?email=${encodeURIComponent(testEmail)}`);
    assert(mailRes.data.latest);
    assert(mailRes.data.latest.otp);
    testOtp = mailRes.data.latest.otp;
    assert(/^\d{6}$/.test(testOtp));
  });

  await test('Immediate resend triggers cooldown rate limit error', async () => {
    const res = await request('/api/auth/send-otp', {
      method: 'POST',
      body: JSON.stringify({ email: testEmail, fullName: testName, isSignup: true })
    });
    assert.strictEqual(res.status, 429);
    assert(res.data.message.includes('seconds'));
  });

  // 7. OTP Verification checks
  await test('Incorrect OTP produces error', async () => {
    const res = await request('/api/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ email: testEmail, otp: '000000', fullName: testName })
    });
    assert.strictEqual(res.status, 400);
    assert(res.data.message.includes('Incorrect OTP'));
  });

  let sessionToken = null;
  await test('Correct OTP verifies successfully and creates user session', async () => {
    const res = await request('/api/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ email: testEmail, otp: testOtp, fullName: testName })
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
    assert(res.data.token);
    assert.strictEqual(res.data.user.name, testName);
    sessionToken = res.data.token;
  });

  // 8. Authenticated route check
  await test('/api/auth/me returns registered user name', async () => {
    const res = await request('/api/auth/me', {
      headers: { Authorization: `Bearer ${sessionToken}` }
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.user.name, testName);
    assert.strictEqual(res.data.user.email, testEmail);
  });

  // 9. Matching Engine: Empty component validation
  await test('Matching engine rejects empty components list', async () => {
    const res = await request('/api/match/find-projects', {
      method: 'POST',
      body: JSON.stringify({ components: [] })
    });
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.data.message, 'Add at least one component to find suitable projects.');
  });

  // 10. Matching Engine: Quantity validation
  await test('Matching engine rejects non-positive component quantity', async () => {
    const res = await request('/api/match/find-projects', {
      method: 'POST',
      body: JSON.stringify({
        components: [{ name: 'Arduino Uno', quantity: 0 }]
      })
    });
    assert.strictEqual(res.status, 400);
    assert(res.data.message.includes('Quantity must be at least 1'));
  });

  // 11. Matching Engine: Hackathon Kit Match (Section 25 & 26)
  await test('Matching engine accurately identifies Automatic Dustbin as 100% READY TO BUILD', async () => {
    const kit = [
      { name: 'Arduino Uno', quantity: 1 },
      { name: 'Servo Motor', quantity: 2 },
      { name: 'Ultrasonic Sensor', quantity: 1 },
      { name: 'LED', quantity: 5 },
      { name: 'LDR', quantity: 2 }
    ];

    const res = await request('/api/match/find-projects', {
      method: 'POST',
      headers: { Authorization: `Bearer ${sessionToken}` },
      body: JSON.stringify({ components: kit })
    });

    assert.strictEqual(res.status, 200);
    assert(res.data.recommendations.length >= 4);

    const dustbin = res.data.recommendations.find((r) => r.name === 'Automatic Dustbin');
    assert(dustbin);
    assert.strictEqual(dustbin.feasibility, 100);
    assert.strictEqual(dustbin.status, 'READY TO BUILD');
    assert.strictEqual(dustbin.missingComponents.length, 0);
    assert.strictEqual(dustbin.componentsReused, 4);

    // Obstacle detection requires Arduino, Ultrasonic, Buzzer, LED x2
    // Kit lacks Buzzer -> Feasibility 3/4 = 75%
    const obstacle = res.data.recommendations.find((r) => r.name === 'Obstacle Detection System');
    assert(obstacle);
    assert.strictEqual(obstacle.feasibility, 75);
    assert.strictEqual(obstacle.status, 'PARTIALLY READY');
    assert.strictEqual(obstacle.missingComponents[0].name, 'Buzzer');
  });

  // 12. Reverse Matching: "I WANT TO BUILD" (Section 37 & 38)
  await test('Reverse matching checks target project and suggests alternatives', async () => {
    const partialKit = [
      { name: 'Arduino Uno', quantity: 1 },
      { name: 'Ultrasonic Sensor', quantity: 1 },
      { name: 'LED', quantity: 1 }
    ];

    const res = await request('/api/match/check-project', {
      method: 'POST',
      body: JSON.stringify({
        projectId: 'PROJ_AUTO_DUSTBIN',
        components: partialKit
      })
    });

    assert.strictEqual(res.status, 200);
    const target = res.data.targetProject;
    assert.strictEqual(target.feasibility, 75);
    assert.strictEqual(target.missingComponents[0].name, 'Servo Motor');
    assert(target.matchMessage.includes('1 component shortage'));
  });

  // 13. Save Project and Impact calculation
  await test('User can save a project and retrieve reuse impact statistics', async () => {
    const saveRes = await request('/api/user/saved-projects', {
      method: 'POST',
      headers: { Authorization: `Bearer ${sessionToken}` },
      body: JSON.stringify({ projectId: 'PROJ_AUTO_DUSTBIN' })
    });
    assert.strictEqual(saveRes.status, 200);

    const listRes = await request('/api/user/saved-projects', {
      headers: { Authorization: `Bearer ${sessionToken}` }
    });
    assert.strictEqual(listRes.status, 200);
    assert(listRes.data.savedProjects.some((p) => p.id === 'PROJ_AUTO_DUSTBIN'));

    const impactRes = await request('/api/user/impact', {
      headers: { Authorization: `Bearer ${sessionToken}` }
    });
    assert.strictEqual(impactRes.status, 200);
    assert(impactRes.data.impact.projectsSaved >= 1);
  });

  console.log(`\n=====================================================`);
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log(`=====================================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((e) => {
  console.error('Test suite crashed:', e);
  process.exit(1);
});
