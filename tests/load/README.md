# Load Tests — Koydo Loom

Performance and load test scripts for the Koydo game server, written for [k6](https://k6.io).

---

## Prerequisites

Install k6:

```bash
# macOS
brew install k6

# Windows
choco install k6

# Linux (Debian/Ubuntu)
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg \
  --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" \
  | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update && sudo apt-get install k6

# Docker (no install needed)
docker run --rm -i grafana/k6 run - <tests/load/auth.js
```

Verify: `k6 version`

---

## Environment Variables

| Variable        | Default                   | Description                                           |
|-----------------|---------------------------|-------------------------------------------------------|
| `BASE_URL`      | `http://localhost:8080`   | Root URL of the Loom HTTP/WS server                   |
| `TEST_PASSWORD` | `LoadTest#2024!`          | Password used when registering/logging in test users  |

> **Note:** The WebSocket URL is derived automatically from `BASE_URL` by replacing `http://` with `ws://` and appending `/ws`. If you run behind HTTPS/WSS, set `BASE_URL=https://your-host` and the script will use `wss://` accordingly.

---

## Running the Tests

### Auth (`auth.js`)

Tests registration and login under concurrent load.

```bash
k6 run tests/load/auth.js --env BASE_URL=http://localhost:8080
```

Profile: 100 VUs ramp 0 → 100 over 30 s, sustain for 2 min, ramp down over 30 s.

```bash
# Against staging with a custom password
k6 run tests/load/auth.js \
  --env BASE_URL=https://staging.koydo.gg \
  --env TEST_PASSWORD='MyStagingPass!'
```

---

### WebSocket (`websocket.js`)

Simulates full game session lifecycle: connect → ClientHello → ServerWelcome → hold 30 s → disconnect.

```bash
k6 run tests/load/websocket.js --env BASE_URL=http://localhost:8080
```

Profile: 500 VUs ramp 0 → 500 over 60 s, sustain for 5 min, ramp down over 30 s.

> Requires the Loom WebSocket server to be reachable at `<BASE_URL>/ws`.

---

### Support Reports (`support.js`)

Hammers the support-report endpoint with all 6 report categories cycling in round-robin.

```bash
k6 run tests/load/support.js --env BASE_URL=http://localhost:8080
```

Profile: 10 VUs constant for 5 min.

---

## Thresholds — What They Mean

Each script will exit with a non-zero code if any threshold is breached. CI systems can treat this as a build failure.

### `auth.js`

| Threshold                     | Target     | Meaning                                                              |
|-------------------------------|------------|----------------------------------------------------------------------|
| `http_req_duration p(95)<200` | < 200 ms   | 95% of auth requests (register + login) must complete within 200 ms |
| `auth_error_rate rate<0.01`   | < 1%       | Fewer than 1% of auth requests may return a non-success response     |

### `websocket.js`

| Threshold                           | Target     | Meaning                                                             |
|-------------------------------------|------------|---------------------------------------------------------------------|
| `ws_connecting p(95)<100`           | < 100 ms   | 95% of WS handshakes (HTTP→WS upgrade) complete within 100 ms      |
| `ws_msgs_received count>0`          | > 0 total  | Server must send at least one message across the entire run         |
| `ws_game_session_duration p(95)<35000` | < 35 s  | 95% of full game sessions complete within 35 s (incl. 30 s hold)   |

Additional counters (informational, no threshold):

- `ws_connect_errors` — socket-level errors
- `ws_welcome_timeout` — sessions where server did not send `server-welcome` within 2 s

### `support.js`

| Threshold                        | Target    | Meaning                                                              |
|----------------------------------|-----------|----------------------------------------------------------------------|
| `http_req_duration p(99)<500`    | < 500 ms  | 99% of report submissions complete within 500 ms                     |
| `support_error_rate rate<0.005`  | < 0.5%    | Fewer than 0.5% of report requests may fail                          |

---

## Output & Reporting

k6 prints a summary table after each run. For richer dashboards:

```bash
# Export to JSON for offline analysis
k6 run tests/load/auth.js --out json=results/auth-$(date +%s).json

# Stream to InfluxDB + Grafana
k6 run tests/load/auth.js --out influxdb=http://localhost:8086/k6

# Stream to Prometheus remote-write
k6 run tests/load/auth.js --out experimental-prometheus-rw
```

---

## Adding More Tests

Follow the same pattern: plain `.js` file, no npm imports, use `k6/*` built-ins only.
See [k6 docs](https://k6.io/docs/) for available modules (`k6/http`, `k6/ws`, `k6/metrics`, `k6/crypto`, etc.).
