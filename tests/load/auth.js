// Auth endpoint load test
// Tests: POST /v1/auth/register (10%), POST /v1/auth/login (90%)
// Target: 100 VUs ramping over 30s, sustain 2min, ramp down 30s
// Thresholds: p95 < 200ms, error rate < 1%

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate } from 'k6/metrics';

const authRegisterSuccess = new Counter('auth_register_success');
const authLoginSuccess = new Counter('auth_login_success');
const authErrors = new Counter('auth_errors');
const authErrorRate = new Rate('auth_error_rate');

export const options = {
  stages: [
    { duration: '30s', target: 100 },
    { duration: '2m',  target: 100 },
    { duration: '30s', target: 0   },
  ],
  thresholds: {
    http_req_duration: ['p(95)<200'],
    auth_error_rate:   ['rate<0.01'],
  },
};

const BASE_URL    = __ENV.BASE_URL || 'http://localhost:8080';
const TEST_PASS   = __ENV.TEST_PASSWORD || 'LoadTest#2024!';
const JSON_HEADERS = { 'Content-Type': 'application/json' };

// VU-local state: track the first-registered email for login reuse
let myEmail = null;

function doRegister(email) {
  const username    = email.split('@')[0];
  const payload     = JSON.stringify({
    email,
    username,
    password:    TEST_PASS,
    displayName: username,
  });

  const res = http.post(`${BASE_URL}/v1/auth/register`, payload, { headers: JSON_HEADERS });

  const ok = check(res, {
    'register: status 201':   (r) => r.status === 201,
    'register: ok true':      (r) => r.json('ok') === true,
    'register: has token':    (r) => typeof r.json('token') === 'string' && r.json('token').length > 0,
    'register: has playerId': (r) => typeof r.json('playerId') === 'string',
  });

  if (ok) {
    authRegisterSuccess.add(1);
    authErrorRate.add(false);
  } else {
    authErrors.add(1);
    authErrorRate.add(true);
  }

  return ok ? res.json('token') : null;
}

function doLogin(email) {
  const payload = JSON.stringify({ email, password: TEST_PASS });
  const res     = http.post(`${BASE_URL}/v1/auth/login`, payload, { headers: JSON_HEADERS });

  const ok = check(res, {
    'login: status 200':   (r) => r.status === 200,
    'login: ok true':      (r) => r.json('ok') === true,
    'login: has token':    (r) => typeof r.json('token') === 'string' && r.json('token').length > 0,
    'login: has playerId': (r) => typeof r.json('playerId') === 'string',
  });

  if (ok) {
    authLoginSuccess.add(1);
    authErrorRate.add(false);
  } else {
    authErrors.add(1);
    authErrorRate.add(true);
  }
}

export default function () {
  // Each VU registers once on its first iteration to establish a reusable account.
  if (myEmail === null) {
    myEmail = `user_${__VU}_0@test.koydo.gg`;
    doRegister(myEmail);
    sleep(0.5);
    return;
  }

  if (Math.random() < 0.1) {
    // 10% — register a fresh user this iteration
    const email = `user_${__VU}_${__ITER}@test.koydo.gg`;
    doRegister(email);
  } else {
    // 90% — login with this VU's established account
    doLogin(myEmail);
  }

  sleep(Math.random() * 0.5 + 0.1); // 100–600 ms think time
}
