// WebSocket game connection load test
// Tests: WS connect → send ClientHello → receive ServerWelcome → hold 30s → disconnect
// Target: 500 VUs, ramp 60s, sustain 5min
// Thresholds: ws_connect_p95 < 100ms, ws_msgs_received > 0

import ws from 'k6/ws';
import { check, sleep } from 'k6';
import { Counter, Trend } from 'k6/metrics';

const wsGameSessionDuration = new Trend('ws_game_session_duration', true); // milliseconds
const wsMsgsReceived        = new Counter('ws_msgs_received');
const wsConnectErrors       = new Counter('ws_connect_errors');
const wsWelcomeTimeout      = new Counter('ws_welcome_timeout');

export const options = {
  stages: [
    { duration: '60s', target: 500 },
    { duration: '5m',  target: 500 },
    { duration: '30s', target: 0   },
  ],
  thresholds: {
    // k6 built-in: time spent establishing the WS upgrade handshake
    ws_connecting:             ['p(95)<100'],
    // at least one message received across the run (sanity check)
    ws_msgs_received:          ['count>0'],
    // custom: full session duration tracked for profiling
    ws_game_session_duration:  ['p(95)<35000'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';
const WS_URL   = BASE_URL.replace(/^http/, 'ws') + '/ws';

const MAX_RECONNECTS    = 3;
const SESSION_HOLD_MS   = 30_000; // hold connection for 30s after welcome
const WELCOME_TIMEOUT_MS = 2_000; // fail if server doesn't welcome within 2s

function runSession() {
  const sessionStart = Date.now();
  let welcomed       = false;
  let shouldReconnect = false;

  const res = ws.connect(WS_URL, {}, function (socket) {
    socket.on('open', function () {
      socket.send(JSON.stringify({
        type:            'client-hello',
        protocolVersion: 1,
        clientId:        `load-test-${__VU}-${__ITER}`,
        platform:        'test',
        renderingTier:   'low',
      }));
    });

    socket.on('message', function (data) {
      wsMsgsReceived.add(1);
      try {
        const msg = JSON.parse(data);
        if (msg.type === 'server-welcome') {
          welcomed = true;
          check(msg, {
            'server-welcome: has serverId':        (m) => typeof m.serverId === 'string',
            'server-welcome: protocol version 1':  (m) => m.protocolVersion === 1,
            'server-welcome: has worldId':         (m) => typeof m.worldId === 'string',
          });
          // Hold for SESSION_HOLD_MS then gracefully close
          socket.setTimeout(function () {
            socket.close(1000);
          }, SESSION_HOLD_MS);
        }
      } catch (_) {
        // Non-JSON frame — count it and move on
      }
    });

    // Fail fast if server hasn't sent welcome within 2s
    socket.setTimeout(function () {
      if (!welcomed) {
        wsWelcomeTimeout.add(1);
        check(welcomed, { 'server sent welcome within 2s': (v) => v === true });
        socket.close(1001); // abnormal → trigger reconnect
      }
    }, WELCOME_TIMEOUT_MS);

    // Safety net: never hold longer than SESSION_HOLD_MS + 5s
    socket.setTimeout(function () {
      socket.close(1000);
    }, SESSION_HOLD_MS + 5_000);

    socket.on('error', function (e) {
      wsConnectErrors.add(1);
    });

    socket.on('close', function (code) {
      wsGameSessionDuration.add(Date.now() - sessionStart);
      // Abnormal close codes (not 1000 Normal / 1001 Going Away) trigger reconnect
      shouldReconnect = code !== 1000 && code !== 1001;
    });
  });

  check(res, { 'ws: connection upgraded (101)': (r) => r && r.status === 101 });

  return shouldReconnect;
}

export default function () {
  let attempts = 0;
  let reconnect = false;

  do {
    attempts++;
    reconnect = runSession();
    if (reconnect && attempts < MAX_RECONNECTS) {
      // Exponential backoff: 1s, 2s, 4s
      sleep(Math.pow(2, attempts - 1));
    }
  } while (reconnect && attempts < MAX_RECONNECTS);
}
