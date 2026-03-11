/**
 * Load Testing Framework — k6-compatible test scenarios for
 * stress-testing the Loom server under various player loads.
 *
 * Simulates realistic player behavior patterns:
 *   - Connection storms (login spikes)
 *   - Steady-state gameplay (movement, combat, trade)
 *   - World transition stress (Silfen Weave)
 *   - Economy stress (mass trading)
 *
 * Thread: carbon/tools/load-testing
 * Tier: R
 */

// ─── Test Scenario Configuration ────────────────────────────────

export interface LoadScenario {
  readonly name: string;
  readonly description: string;
  readonly targetVUs: number;          // virtual users
  readonly rampUpSeconds: number;
  readonly sustainSeconds: number;
  readonly rampDownSeconds: number;
  readonly thresholds: ScenarioThresholds;
  readonly behavior: BehaviorProfile;
}

export interface ScenarioThresholds {
  readonly p95ResponseMs: number;
  readonly p99ResponseMs: number;
  readonly maxErrorRate: number;       // 0.0 – 1.0
  readonly minThroughputRps: number;
}

export type BehaviorProfile =
  | 'login_storm'
  | 'steady_gameplay'
  | 'world_transition'
  | 'economy_stress'
  | 'mixed_realistic';

// ─── Pre-built Scenarios ────────────────────────────────────────

export const SCENARIOS: Record<string, LoadScenario> = {
  smoke: {
    name: 'Smoke Test',
    description: 'Minimal load — verify system works under light traffic',
    targetVUs: 10,
    rampUpSeconds: 5,
    sustainSeconds: 30,
    rampDownSeconds: 5,
    thresholds: { p95ResponseMs: 100, p99ResponseMs: 200, maxErrorRate: 0, minThroughputRps: 10 },
    behavior: 'mixed_realistic',
  },
  load: {
    name: 'Load Test',
    description: 'Normal expected load — 5K concurrent players',
    targetVUs: 5000,
    rampUpSeconds: 120,
    sustainSeconds: 600,
    rampDownSeconds: 60,
    thresholds: { p95ResponseMs: 50, p99ResponseMs: 100, maxErrorRate: 0.001, minThroughputRps: 5000 },
    behavior: 'steady_gameplay',
  },
  stress: {
    name: 'Stress Test',
    description: 'Beyond capacity — find breaking point at 50K',
    targetVUs: 50000,
    rampUpSeconds: 300,
    sustainSeconds: 300,
    rampDownSeconds: 120,
    thresholds: { p95ResponseMs: 200, p99ResponseMs: 500, maxErrorRate: 0.01, minThroughputRps: 20000 },
    behavior: 'mixed_realistic',
  },
  spike: {
    name: 'Spike Test',
    description: 'Sudden 10x traffic burst (event launch)',
    targetVUs: 25000,
    rampUpSeconds: 10,
    sustainSeconds: 120,
    rampDownSeconds: 30,
    thresholds: { p95ResponseMs: 300, p99ResponseMs: 1000, maxErrorRate: 0.05, minThroughputRps: 10000 },
    behavior: 'login_storm',
  },
  soak: {
    name: 'Soak Test',
    description: '12-hour endurance — detect memory leaks and degradation',
    targetVUs: 10000,
    rampUpSeconds: 300,
    sustainSeconds: 43200,
    rampDownSeconds: 300,
    thresholds: { p95ResponseMs: 100, p99ResponseMs: 200, maxErrorRate: 0.001, minThroughputRps: 8000 },
    behavior: 'steady_gameplay',
  },
  worldTransition: {
    name: 'World Transition Stress',
    description: '1K players transitioning worlds simultaneously',
    targetVUs: 1000,
    rampUpSeconds: 60,
    sustainSeconds: 300,
    rampDownSeconds: 30,
    thresholds: { p95ResponseMs: 500, p99ResponseMs: 2000, maxErrorRate: 0.01, minThroughputRps: 500 },
    behavior: 'world_transition',
  },
  economy: {
    name: 'Economy Stress',
    description: 'Mass trading stress test — market maker simulation',
    targetVUs: 2000,
    rampUpSeconds: 60,
    sustainSeconds: 300,
    rampDownSeconds: 30,
    thresholds: { p95ResponseMs: 100, p99ResponseMs: 300, maxErrorRate: 0.001, minThroughputRps: 2000 },
    behavior: 'economy_stress',
  },
};

// ─── Result Collection ──────────────────────────────────────────

export interface LoadTestResult {
  readonly scenarioName: string;
  readonly startedAt: string;
  readonly duration: number;
  readonly metrics: LoadMetrics;
  readonly passed: boolean;
  readonly failures: ReadonlyArray<string>;
}

export interface LoadMetrics {
  readonly totalRequests: number;
  readonly successfulRequests: number;
  readonly failedRequests: number;
  readonly p50ResponseMs: number;
  readonly p95ResponseMs: number;
  readonly p99ResponseMs: number;
  readonly maxResponseMs: number;
  readonly rps: number;
  readonly peakVUs: number;
  readonly dataTransferredMb: number;
}

// ─── k6 Script Generator ───────────────────────────────────────

export function generateK6Script(scenario: LoadScenario, baseUrl: string): string {
  const stages = [
    `{ duration: '${scenario.rampUpSeconds}s', target: ${scenario.targetVUs} }`,
    `{ duration: '${scenario.sustainSeconds}s', target: ${scenario.targetVUs} }`,
    `{ duration: '${scenario.rampDownSeconds}s', target: 0 }`,
  ].join(',\n    ');

  return `
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Scenario: ${scenario.name}
// ${scenario.description}

const errorRate = new Rate('errors');
const responseTrend = new Trend('response_time');

export const options = {
  stages: [
    ${stages}
  ],
  thresholds: {
    'http_req_duration': ['p(95)<${scenario.thresholds.p95ResponseMs}', 'p(99)<${scenario.thresholds.p99ResponseMs}'],
    'errors': ['rate<${scenario.thresholds.maxErrorRate}'],
    'http_reqs': ['rate>=${scenario.thresholds.minThroughputRps}'],
  },
};

export default function () {
  ${generateBehavior(scenario.behavior, baseUrl)}
}
`.trim();
}

function generateBehavior(profile: BehaviorProfile, baseUrl: string): string {
  switch (profile) {
    case 'login_storm':
      return `
  // Login storm: rapid authentication attempts
  const loginRes = http.post('${baseUrl}/api/v1/auth/login', JSON.stringify({
    email: \`player_\${__VU}@test.loom\`,
    password: 'test_password',
  }), { headers: { 'Content-Type': 'application/json' } });
  check(loginRes, { 'login success': (r) => r.status === 200 });
  errorRate.add(loginRes.status !== 200);
  responseTrend.add(loginRes.timings.duration);
  sleep(Math.random() * 0.5);`;

    case 'steady_gameplay':
      return `
  // Steady gameplay: heartbeat + movement + occasional actions
  const hb = http.post('${baseUrl}/api/v1/session/heartbeat');
  check(hb, { 'heartbeat ok': (r) => r.status === 200 });

  const move = http.post('${baseUrl}/api/v1/input', JSON.stringify({
    moveX: Math.random() * 2 - 1,
    moveY: 0,
    moveZ: Math.random() * 2 - 1,
    yaw: Math.random() * 360,
    pitch: 0,
    actions: 0,
  }), { headers: { 'Content-Type': 'application/json' } });
  check(move, { 'move ok': (r) => r.status === 200 });
  errorRate.add(move.status !== 200);
  responseTrend.add(move.timings.duration);
  sleep(0.033); // ~30 ticks/sec`;

    case 'world_transition':
      return `
  // World transition: request transit to random world
  const worlds = ['alpha', 'beta', 'gamma', 'delta'];
  const target = worlds[Math.floor(Math.random() * worlds.length)];
  const transit = http.post('${baseUrl}/api/v1/transit/request', JSON.stringify({
    targetWorldId: target,
  }), { headers: { 'Content-Type': 'application/json' } });
  check(transit, { 'transit ok': (r) => r.status === 200 || r.status === 202 });
  errorRate.add(transit.status >= 400);
  responseTrend.add(transit.timings.duration);
  sleep(2 + Math.random() * 3);`;

    case 'economy_stress':
      return `
  // Economy stress: rapid trades and market operations
  const trade = http.post('${baseUrl}/api/v1/trade/offer', JSON.stringify({
    itemType: 'raw_materials',
    quantity: Math.floor(Math.random() * 100) + 1,
    priceKalon: Math.floor(Math.random() * 1000) + 10,
  }), { headers: { 'Content-Type': 'application/json' } });
  check(trade, { 'trade ok': (r) => r.status === 200 || r.status === 201 });
  errorRate.add(trade.status >= 400);
  responseTrend.add(trade.timings.duration);
  sleep(0.1 + Math.random() * 0.5);`;

    case 'mixed_realistic':
      return `
  // Mixed realistic: weighted random behavior
  const roll = Math.random();
  if (roll < 0.6) {
    // 60% movement
    const move = http.post('${baseUrl}/api/v1/input', JSON.stringify({
      moveX: Math.random() * 2 - 1, moveY: 0, moveZ: Math.random() * 2 - 1,
      yaw: Math.random() * 360, pitch: 0, actions: 0,
    }), { headers: { 'Content-Type': 'application/json' } });
    errorRate.add(move.status !== 200);
    responseTrend.add(move.timings.duration);
  } else if (roll < 0.8) {
    // 20% heartbeat
    const hb = http.post('${baseUrl}/api/v1/session/heartbeat');
    errorRate.add(hb.status !== 200);
  } else if (roll < 0.95) {
    // 15% trade
    const trade = http.post('${baseUrl}/api/v1/trade/offer', JSON.stringify({
      itemType: 'raw_materials', quantity: 10, priceKalon: 100,
    }), { headers: { 'Content-Type': 'application/json' } });
    errorRate.add(trade.status >= 400);
    responseTrend.add(trade.timings.duration);
  } else {
    // 5% world transition
    const transit = http.post('${baseUrl}/api/v1/transit/request', JSON.stringify({
      targetWorldId: 'beta',
    }), { headers: { 'Content-Type': 'application/json' } });
    errorRate.add(transit.status >= 400);
    responseTrend.add(transit.timings.duration);
  }
  sleep(0.033);`;
  }
}

// ─── Result Evaluator ───────────────────────────────────────────

export function evaluateResults(
  scenario: LoadScenario,
  metrics: LoadMetrics,
): LoadTestResult {
  const failures: string[] = [];

  if (metrics.p95ResponseMs > scenario.thresholds.p95ResponseMs) {
    failures.push(`p95 ${metrics.p95ResponseMs}ms > threshold ${scenario.thresholds.p95ResponseMs}ms`);
  }
  if (metrics.p99ResponseMs > scenario.thresholds.p99ResponseMs) {
    failures.push(`p99 ${metrics.p99ResponseMs}ms > threshold ${scenario.thresholds.p99ResponseMs}ms`);
  }
  const errorRate = metrics.failedRequests / Math.max(1, metrics.totalRequests);
  if (errorRate > scenario.thresholds.maxErrorRate) {
    failures.push(`error rate ${(errorRate * 100).toFixed(2)}% > threshold ${(scenario.thresholds.maxErrorRate * 100).toFixed(2)}%`);
  }
  if (metrics.rps < scenario.thresholds.minThroughputRps) {
    failures.push(`throughput ${metrics.rps} rps < threshold ${scenario.thresholds.minThroughputRps} rps`);
  }

  return {
    scenarioName: scenario.name,
    startedAt: new Date().toISOString(),
    duration: scenario.rampUpSeconds + scenario.sustainSeconds + scenario.rampDownSeconds,
    metrics,
    passed: failures.length === 0,
    failures,
  };
}
