# Project Loom — Launch Runbook

> **Audience**: Ops team, founders, on-call engineers  
> **Purpose**: Step-by-step guide from zero infrastructure to players connected

---

## Phase 0 — Internal Alpha

> **Goal**: One engineer can run the full stack locally. Team of 5 can play together.

### Prerequisites

- [ ] Docker Desktop installed (or Docker Engine on Linux)
- [ ] `node` ≥ 22, `npm` ≥ 10
- [ ] Git access to `robertwaltos/Koydo_Loom`
- [ ] `.env` file created from `.env.example`

### Step 1 — Clone and install

```bash
git clone https://github.com/robertwaltos/Koydo_Loom.git
cd Koydo_Loom
npm ci
```

### Step 2 — Configure environment

```bash
cp .env.example .env
# Edit .env and fill in:
#   PG_PASSWORD       — any strong password for local dev
#   NAKAMA_SERVER_KEY — "defaultkey" is fine for local
#   REDIS_PASSWORD    — leave blank for local dev
```

### Step 3 — Start the local stack

```bash
docker compose up -d
```

This starts:
- **PostgreSQL 16** on port 5432
- **Redis 7** on port 6379
- **Nakama 3.22** on ports 7349 (gRPC), 7350 (HTTP), 7351 (admin)
- **Loom server** on port 8080 (HTTP+WS) and 50051 (gRPC bridge)

### Step 4 — Verify services

```bash
# Loom health
curl http://localhost:8080/health
# → {"status":"ok"}

# Nakama health
curl http://localhost:7350/healthcheck
# → {}

# Create a test account
curl -X POST http://localhost:8080/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testplayer","email":"test@example.com","password":"password123"}'
# → {"ok":true,"token":"...","playerId":"..."}
```

### Step 5 — Run the test suite

```bash
npm run typecheck  # must pass with 0 errors
npm test          # must pass (16,000+ tests)
```

### Phase 0 sign-off checklist

- [ ] `docker compose up` succeeds without errors
- [ ] `/health` returns `{"status":"ok"}`
- [ ] Nakama `/healthcheck` returns 200
- [ ] Player registration endpoint returns token
- [ ] UE5 client connects via gRPC on port 50051
- [ ] TypeScript: 0 errors
- [ ] All tests: passing

---

## Phase 1 — Private Beta

> **Goal**: 50–200 invited testers can play. Ops team has visibility into all systems.

### Prerequisites

- [ ] Kubernetes cluster provisioned (EKS, GKE, or AKS — minimum 3 nodes, 4 vCPU / 8 GB each)
- [ ] `kubectl` configured with cluster credentials
- [ ] Container registry access (GHCR)
- [ ] Domain name configured (`*.koydoloom.com`)
- [ ] TLS certificate provisioned (cert-manager or ACM)

### Step 1 — Create namespace and secrets

```bash
kubectl apply -f k8s/namespace.yml

# Fill in REAL values before applying — never commit these!
kubectl create secret generic loom-secrets \
  --namespace loom \
  --from-literal=pg-user=loom \
  --from-literal=pg-password=<STRONG_PASSWORD> \
  --from-literal=redis-password=<STRONG_PASSWORD>

kubectl create secret generic nakama-secrets \
  --namespace loom \
  --from-literal=database-address=postgres:5432/nakama?sslmode=disable \
  --from-literal=session-encryption-key=<EXACTLY_32_CHARS_LONG_KEY_HERE!> \
  --from-literal=server-key=<UNIQUE_SERVER_KEY>
```

### Step 2 — Apply ConfigMaps

```bash
kubectl apply -f k8s/config.yml
```

Edit `k8s/config.yml` first and replace placeholder values:
- `pg-host: postgres` (leave as-is for in-cluster)
- `redis-url: redis://redis:6379` (leave as-is)
- `nakama-http-url: http://nakama:7350` (leave as-is)

### Step 3 — Deploy PostgreSQL and Redis

```bash
kubectl apply -f k8s/postgres.yml
kubectl apply -f k8s/redis.yml

# Wait for readiness
kubectl -n loom rollout status statefulset/postgres --timeout=120s
kubectl -n loom rollout status statefulset/redis --timeout=120s
```

### Step 4 — Deploy Nakama

```bash
kubectl apply -f k8s/nakama.yml
kubectl -n loom rollout status deployment/nakama --timeout=180s
```

### Step 5 — Deploy Loom server

```bash
kubectl apply -f k8s/deployment.yml
kubectl -n loom rollout status deployment/loom-server --timeout=120s
```

### Step 6 — Verify production stack

```bash
# Get service IP / LoadBalancer address
kubectl -n loom get svc loom-server

# Health check (replace <EXTERNAL_IP>)
curl http://<EXTERNAL_IP>/health
# → {"status":"ok"}

# Check all pods running
kubectl -n loom get pods
```

### Step 7 — Enable CI/CD pipeline

GitHub Actions will automatically:
1. Run typecheck + tests on every push
2. Build Docker image and push to `ghcr.io/<org>/koydo_loom`
3. Deploy to staging on push to `main`

Required GitHub secrets:
- `KUBECONFIG_STAGING` — base64-encoded kubeconfig for staging cluster

### Monitoring setup (Phase 1)

- Deploy Grafana + Prometheus in-cluster or use managed service
- Import `tools/grafana/loom-dashboard.json`
- Set up PagerDuty alerts for:
  - `/health` returning non-200
  - Pod restart count > 3 in 10 minutes
  - Database connection failures

### Phase 1 sign-off checklist

- [ ] All 5 K8s pods: Running (postgres, redis, nakama, loom, monitoring)
- [ ] `/health` returns `{"status":"ok"}` from external URL
- [ ] Nakama admin console accessible at `admin.koydoloom.com:7351`
- [ ] CI/CD pipeline: green on `main`
- [ ] Docker image tagged with SHA and latest
- [ ] Grafana dashboard showing real-time player metrics
- [ ] PagerDuty alert fires on simulated pod crash
- [ ] 50 beta testers can register and connect
- [ ] UE5 client connects to production gRPC endpoint
- [ ] Response time P99 < 100ms

---

## Phase 2 — Open Beta

> **Goal**: Public signups open. Legal compliance in place. Anti-cheat active.

### Prerequisites

- [ ] Phase 1 sign-off complete
- [ ] Legal review of ToS and Privacy Policy complete
- [ ] Age verification provider integrated (Veriff, Onfido, or similar)
- [ ] External penetration test completed + findings remediated
- [ ] Bug bounty programme launched (HackerOne or similar)
- [ ] DPAs signed with all third-party processors (Nakama, Stripe, etc.)
- [ ] EU/UK data representative appointed (if serving those regions)

### Step 1 — Publish legal documents

```bash
# Legal docs are in docs/legal/
# Publish to https://koydoloom.com/legal/tos and /legal/privacy
# The website/ directory contains the player-facing landing page
```

### Step 2 — Enable anti-cheat system

The anti-cheat module at `fabrics/dye-house/src/anti-cheat.ts` is production-ready.

Wire it into the game loop in `src/main.ts`:

```typescript
import { createAntiCheatSystem } from '@loom/dye-house';
const antiCheat = createAntiCheatSystem({
  banDurationMs: 24 * 60 * 60 * 1000,  // 24-hour ban
  banThreshold: 15,
});
```

Violations auto-escalate: warn → kick → 24h ban.

### Step 3 — Enable support system

Wire the support webhook into the HTTP server with your Discord webhook URL:

```typescript
import { createSupportRoutes } from './tools/support/src/support-webhook.js';
// Add to routeRegistrars in createFastifyTransport config
createSupportRoutes({
  discordWebhookUrl: process.env.DISCORD_SUPPORT_WEBHOOK_URL,
  sharedSecret: process.env.SUPPORT_SHARED_SECRET,
})
```

### Step 4 — Age verification integration

1. Integrate Veriff or Onfido SDK in the registration flow
2. Block account activation until age verification passes for new users
3. Existing beta users require reverification within 30 days
4. Store consent records per COPPA/GDPR requirements

### Step 5 — Open registration

1. Deploy the player-facing website: `website/index.html`
2. Configure signup flow to call `POST /v1/auth/register`
3. Send welcome email sequence via your email provider (Postmark, SendGrid)
4. Monitor new registrations in Nakama admin console

### Phase 2 sign-off checklist

- [ ] ToS published at `koydoloom.com/legal/tos`
- [ ] Privacy Policy published at `koydoloom.com/legal/privacy`
- [ ] Age verification working for new signups
- [ ] Under-13 rejection working correctly
- [ ] Parental consent flow working for 13–17
- [ ] Anti-cheat: speed hack detected and player kicked
- [ ] Anti-cheat: repeat offender automatically banned
- [ ] Support webhook: ticket appears in Discord within 5s
- [ ] Support: ban action removes player from active session
- [ ] External pen test: 0 critical findings
- [ ] Bug bounty: programme live and accepting submissions
- [ ] DPAs signed with Nakama, Stripe, Pagerduty
- [ ] GDPR data subject request process tested
- [ ] Player data export working
- [ ] Account deletion working (with Chronicle exception noted)
- [ ] 500+ concurrent players tested on production

---

## Rollback Procedures

### Roll back a bad Loom server deployment

```bash
kubectl -n loom rollout undo deployment/loom-server
kubectl -n loom rollout status deployment/loom-server --timeout=60s
```

### Roll back Nakama

```bash
kubectl -n loom rollout undo deployment/nakama
```

### Emergency: take the game offline for maintenance

```bash
# Scale down to 0
kubectl -n loom scale deployment/loom-server --replicas=0

# Display maintenance page via ingress annotation or CDN rule
# ...

# Scale back up
kubectl -n loom scale deployment/loom-server --replicas=2
kubectl -n loom rollout status deployment/loom-server
```

---

## Environment Variable Reference

| Variable | Default | Required | Description |
|----------|---------|----------|-------------|
| `LOOM_HOST` | `0.0.0.0` | No | Bind address |
| `LOOM_PORT` | `8080` | No | HTTP port |
| `LOOM_GRPC_PORT` | `50051` | No | gRPC bridge port |
| `LOOM_TICK_RATE` | `20` | No | Game tick rate (Hz) |
| `PG_HOST` | `127.0.0.1` | **Yes** | PostgreSQL host |
| `PG_PORT` | `5432` | No | PostgreSQL port |
| `PG_DATABASE` | `loom` | No | Database name |
| `PG_USER` | `loom` | **Yes** | Database user |
| `PG_PASSWORD` | `` | **Yes** | Database password |
| `REDIS_HOST` | `127.0.0.1` | **Yes** | Redis host |
| `REDIS_PORT` | `6379` | No | Redis port |
| `REDIS_PASSWORD` | `` | No | Redis password |
| `NAKAMA_HOST` | `127.0.0.1` | **Yes** | Nakama HTTP host |
| `NAKAMA_PORT` | `7350` | No | Nakama HTTP port |
| `NAKAMA_SERVER_KEY` | `defaultkey` | **Yes** (prod) | Nakama server key |
| `DISCORD_SUPPORT_WEBHOOK_URL` | `` | Phase 2 | Support Discord webhook |
| `SUPPORT_SHARED_SECRET` | `` | Phase 2 | Internal moderation auth |

---

## Health Check Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/health` | GET | None | Loom server health |
| `/v1/auth/register` | POST | None | Player registration |
| `/v1/auth/login` | POST | None | Player authentication |
| `/v1/auth/me` | GET | Bearer token | Current session |
| `/v1/support/report` | POST | None | Submit support ticket |
| `http://nakama:7350/healthcheck` | GET | None | Nakama health |

---

*Last updated: March 2026 — Thread: silk/launch-readiness*
