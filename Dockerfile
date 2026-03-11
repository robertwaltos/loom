# ── Stage 1: Build ────────────────────────────────────────────────
FROM node:22-alpine AS build

WORKDIR /app

# Copy package manifests first for layer caching
COPY package.json package-lock.json tsconfig.json ./
COPY contracts/entities/package.json       contracts/entities/
COPY contracts/events/package.json         contracts/events/
COPY contracts/protocols/package.json      contracts/protocols/
COPY contracts/bridge-loom/package.json    contracts/bridge-loom/
COPY fabrics/loom-core/package.json        fabrics/loom-core/
COPY fabrics/shuttle/package.json          fabrics/shuttle/
COPY fabrics/silfen-weave/package.json     fabrics/silfen-weave/
COPY fabrics/nakama-fabric/package.json    fabrics/nakama-fabric/
COPY fabrics/inspector/package.json        fabrics/inspector/
COPY fabrics/selvage/package.json          fabrics/selvage/
COPY fabrics/dye-house/package.json        fabrics/dye-house/
COPY fabrics/archive/package.json          fabrics/archive/

RUN npm ci --ignore-scripts

# Copy source
COPY contracts/ contracts/
COPY fabrics/   fabrics/
COPY src/       src/

RUN npx tsc --build

# ── Stage 2: Production ──────────────────────────────────────────
FROM node:22-alpine AS production

RUN addgroup -S loom && adduser -S loom -G loom

WORKDIR /app

COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/contracts/entities/package.json       contracts/entities/
COPY --from=build /app/contracts/events/package.json         contracts/events/
COPY --from=build /app/contracts/protocols/package.json      contracts/protocols/
COPY --from=build /app/contracts/bridge-loom/package.json    contracts/bridge-loom/
COPY --from=build /app/fabrics/loom-core/package.json        fabrics/loom-core/
COPY --from=build /app/fabrics/shuttle/package.json          fabrics/shuttle/
COPY --from=build /app/fabrics/silfen-weave/package.json     fabrics/silfen-weave/
COPY --from=build /app/fabrics/nakama-fabric/package.json    fabrics/nakama-fabric/
COPY --from=build /app/fabrics/inspector/package.json        fabrics/inspector/
COPY --from=build /app/fabrics/selvage/package.json          fabrics/selvage/
COPY --from=build /app/fabrics/dye-house/package.json        fabrics/dye-house/
COPY --from=build /app/fabrics/archive/package.json          fabrics/archive/

RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

# Copy compiled output
COPY --from=build /app/contracts/ contracts/
COPY --from=build /app/fabrics/   fabrics/
COPY --from=build /app/src/       src/

USER loom

ENV NODE_ENV=production
ENV LOOM_HOST=0.0.0.0
ENV LOOM_PORT=8080

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

CMD ["node", "--enable-source-maps", "src/main.js"]
