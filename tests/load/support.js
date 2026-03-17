// Support report endpoint load test
// Tests: POST /v1/support/report
// Target: 10 VUs constant, 5min duration
// Thresholds: p99 < 500ms, error rate < 0.5%

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate } from 'k6/metrics';

const supportReportSuccess = new Counter('support_report_success');
const supportReportErrors  = new Counter('support_report_errors');
const supportErrorRate     = new Rate('support_error_rate');

export const options = {
  vus:      10,
  duration: '5m',
  thresholds: {
    http_req_duration: ['p(99)<500'],
    support_error_rate: ['rate<0.005'],
  },
};

const BASE_URL    = __ENV.BASE_URL || 'http://localhost:8080';
const TEST_PASS   = __ENV.TEST_PASSWORD || 'LoadTest#2024!';
const JSON_HEADERS = { 'Content-Type': 'application/json' };

const CATEGORIES = [
  'cheating',
  'harassment',
  'spam',
  'inappropriate_content',
  'bug',
  'other',
];

const DESCRIPTIONS = {
  cheating:             'Player is using speed hacks to move across the map instantly. Observed consistently over the past 10 minutes in world Terra-07.',
  harassment:           'This player has been sending repeated hostile messages and following my character to disrupt gameplay despite being asked to stop.',
  spam:                 'User is flooding the world chat with repeated identical messages every few seconds, making it impossible to communicate.',
  inappropriate_content: 'Player created a character with an offensive display name containing slurs that violates community guidelines.',
  bug:                  'After completing the Silfen transit sequence the player entity gets stuck in a T-pose and movement input stops responding.',
  other:                'Observed unusual behaviour that does not fit neatly into another category. Providing details for investigation.',
};

// VU-local auth state — each VU authenticates once then reuses the token
let token    = null;
let playerId = null;

function authenticate() {
  const email    = `support-tester-${__VU}@test.koydo.gg`;
  const username = `support_tester_${__VU}`;

  // Try login first; fall back to register for first-time VUs
  let res = http.post(
    `${BASE_URL}/v1/auth/login`,
    JSON.stringify({ email, password: TEST_PASS }),
    { headers: JSON_HEADERS },
  );

  if (res.status !== 200) {
    res = http.post(
      `${BASE_URL}/v1/auth/register`,
      JSON.stringify({ email, username, password: TEST_PASS, displayName: username }),
      { headers: JSON_HEADERS },
    );
  }

  if (res.status === 200 || res.status === 201) {
    token    = res.json('token');
    playerId = res.json('playerId');
  }
}

export default function () {
  if (token === null) {
    authenticate();
    sleep(0.2);
    if (token === null) return; // auth failed — skip iteration
  }

  // Cycle through all 6 categories evenly
  const category    = CATEGORIES[__ITER % CATEGORIES.length];
  const description = DESCRIPTIONS[category];

  // Alternate between targeting another player and reporting a bug/other (no target)
  const hasTarget = category !== 'bug' && category !== 'other';

  const body = {
    reporterId:  playerId,
    category,
    description,
    ...(hasTarget && { targetPlayerId: `target-player-${(__ITER % 50) + 1}` }),
    ...(category === 'bug' && { worldId: `world-${(__ITER % 10) + 1}` }),
    ...(category === 'cheating' && { evidenceUrl: `https://evidence.test.koydo.gg/clip-${__VU}-${__ITER}.mp4` }),
  };

  const res = http.post(
    `${BASE_URL}/v1/support/report`,
    JSON.stringify(body),
    {
      headers: {
        ...JSON_HEADERS,
        Authorization: `Bearer ${token}`,
      },
    },
  );

  const ok = check(res, {
    'support: status 201':     (r) => r.status === 201,
    'support: ok true':        (r) => r.json('ok') === true,
    'support: has ticketId':   (r) => typeof r.json('ticketId') === 'string' && r.json('ticketId').startsWith('TKT-'),
    'support: status is open': (r) => r.json('status') === 'open',
  });

  if (ok) {
    supportReportSuccess.add(1);
    supportErrorRate.add(false);
  } else {
    supportReportErrors.add(1);
    supportErrorRate.add(true);
    // Invalidate token on auth errors so the next iter re-authenticates
    if (res.status === 401) {
      token    = null;
      playerId = null;
    }
  }

  sleep(Math.random() * 1.5 + 0.5); // 0.5–2s think time (support reports are infrequent)
}
