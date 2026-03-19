#!/usr/bin/env bash
# sync-to-kindler.sh — Port shared infrastructure from LOOM → Kindler
#
# Usage:
#   ./scripts/sync-to-kindler.sh              # dry run (shows what would sync)
#   ./scripts/sync-to-kindler.sh --apply      # actually copies files
#   ./scripts/sync-to-kindler.sh --apply --push  # copy + commit + push Kindler
#
# RULES:
#   - Only syncs files in the SHARED list below
#   - Never touches LOOM-only files (pvp, guilds, dynasty, etc.)
#   - Never overwrites Kindler-only files (coppa, parental, curriculum standards)
#   - Always shows a diff before applying

set -euo pipefail

LOOM="D:/pythonprojects/loom/loom"
KINDLER="D:/pythonprojects/Kindler"
APPLY=false
PUSH=false

for arg in "$@"; do
  case $arg in
    --apply) APPLY=true ;;
    --push)  PUSH=true ;;
  esac
done

# ─────────────────────────────────────────────
# FILES TO SYNC (add new shared files here)
# ─────────────────────────────────────────────
SHARED_ROUTES=(
  src/routes/auth.ts
  src/routes/account.ts
  src/routes/worlds.ts
  src/routes/fading.ts
  src/routes/guide.ts
  src/routes/npcs.ts
  src/routes/npc-relationships.ts
  src/routes/quest-chains.ts
  src/routes/quest-tracker.ts
  src/routes/procedural-quests.ts
  src/routes/achievements.ts
  src/routes/progression.ts
  src/routes/leaderboard.ts
  src/routes/mini-games.ts
  src/routes/seasonal.ts
  src/routes/weather.ts
  src/routes/terrain.ts
  src/routes/biome.ts
  src/routes/day-night.ts
  src/routes/settlements.ts
  src/routes/spawn-budget.ts
  src/routes/hidden-zones.ts
  src/routes/threadways.ts
  src/routes/adventures.ts
  src/routes/dungeons.ts
  src/routes/world-events.ts
  src/routes/visitor-characters.ts
  src/routes/loot-tables.ts
  src/routes/status-effects.ts
  src/routes/audio.ts
  src/routes/encyclopedia.ts
  src/routes/entry-types.ts
  src/routes/leitmotifs.ts
  src/routes/character-dossiers.ts
  src/routes/forgetting-well.ts
  src/routes/feature-flags.ts
  src/routes/moderation.ts
  src/routes/notifications.ts
  src/routes/analytics.ts
  src/routes/revenue.ts
  src/routes/safety.ts
  src/routes/save-game.ts
  src/routes/session.ts
  src/routes/accessibility.ts
  src/routes/quiz.ts
  src/routes/content.ts
  src/routes/combat.ts
)

SHARED_CORE=(
  src/main.ts
  src/main-bootstrap.ts
  src/bootstrap-world.ts
  src/bridge-world-state-provider.ts
  src/world-seed-boot.ts
  tsconfig.json
  eslint.config.js
  vitest.config.ts
  Dockerfile
  docker-compose.yml
  nakama.yml
)

# Fabrics — entire directories that are shared
SHARED_FABRIC_DIRS=(
  fabrics/loom-core
  fabrics/nakama-fabric
  fabrics/shuttle
  fabrics/silfen-bridge
)

# UE5 plugin files that are shared engine code
SHARED_UE5=(
  ue5/Plugins/BridgeLoom/Source/BridgeLoom/Private/BridgeLoomAudio.cpp
  ue5/Plugins/BridgeLoom/Source/BridgeLoom/Private/BridgeLoomGRPC.cpp
  ue5/Plugins/BridgeLoom/Source/BridgeLoom/Private/BridgeLoomMetaHuman.cpp
  ue5/Plugins/BridgeLoom/Source/BridgeLoom/Private/BridgeLoomNiagara.cpp
  ue5/Plugins/BridgeLoom/Source/BridgeLoom/Private/BridgeLoomTelemetry.cpp
  ue5/Plugins/BridgeLoom/Source/BridgeLoom/Private/BridgeLoomWorldStream.cpp
  ue5/Plugins/BridgeLoom/Source/BridgeLoom/Private/SilfenWeave.cpp
)

# ─────────────────────────────────────────────
# NEVER SYNC THESE (LOOM-only)
# ─────────────────────────────────────────────
# src/routes/pvp.ts
# src/routes/guilds.ts
# src/routes/dynasty.ts
# src/routes/governance.ts
# src/routes/survey-corps.ts
# src/routes/realm.ts
# src/routes/ascendancy.ts
# src/routes/crafting.ts

# ─────────────────────────────────────────────
# NEVER OVERWRITE THESE (Kindler-only)
# ─────────────────────────────────────────────
# src/routes/parent-dashboard.ts   (Kindler COPPA version differs from LOOM's)
# src/routes/curriculum.ts         (Kindler curriculum standards)
# src/routes/kindler.ts            (Kindler-specific guide logic)

echo "=== LOOM → Kindler Sync ==="
echo "  Source : $LOOM"
echo "  Target : $KINDLER"
echo "  Mode   : $([ "$APPLY" = true ] && echo APPLY || echo DRY RUN)"
echo ""

changed=0
skipped=0

sync_file() {
  local rel="$1"
  local src="$LOOM/$rel"
  local dst="$KINDLER/$rel"

  if [ ! -f "$src" ]; then
    echo "  [MISSING in LOOM] $rel"
    return
  fi

  if [ -f "$dst" ] && diff -q "$src" "$dst" > /dev/null 2>&1; then
    skipped=$((skipped + 1))
    return
  fi

  changed=$((changed + 1))
  if [ "$APPLY" = true ]; then
    mkdir -p "$(dirname "$dst")"
    cp "$src" "$dst"
    echo "  [copied] $rel"
  else
    echo "  [would copy] $rel"
  fi
}

sync_dir() {
  local dir="$1"
  if [ ! -d "$LOOM/$dir" ]; then
    echo "  [MISSING dir in LOOM] $dir"
    return
  fi
  while IFS= read -r -d '' file; do
    rel="${file#$LOOM/}"
    sync_file "$rel"
  done < <(find "$LOOM/$dir" -type f \( -name "*.ts" -o -name "*.cpp" -o -name "*.h" \) -print0)
}

echo "--- Routes ---"
for f in "${SHARED_ROUTES[@]}"; do sync_file "$f"; done

echo ""
echo "--- Core files ---"
for f in "${SHARED_CORE[@]}"; do sync_file "$f"; done

echo ""
echo "--- Fabrics ---"
for d in "${SHARED_FABRIC_DIRS[@]}"; do sync_dir "$d"; done

echo ""
echo "--- UE5 engine ---"
for f in "${SHARED_UE5[@]}"; do sync_file "$f"; done

echo ""
echo "=== Summary: $changed file(s) changed, $skipped already in sync ==="

if [ "$APPLY" = true ] && [ "$changed" -gt 0 ]; then
  cd "$KINDLER"
  git add -A
  git commit -m "chore: sync shared infrastructure from LOOM ($(date +%Y-%m-%d))"
  echo "Committed to Kindler."

  if [ "$PUSH" = true ]; then
    git push origin main
    echo "Pushed Kindler."
  fi
fi
