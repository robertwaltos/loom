#!/usr/bin/env bash
# ── C++ Bridge Code Generator ────────────────────────────────────
#
# Generates FlatBuffers and protobuf/gRPC C++ headers from schemas
# into the UE5 plugin's Public/Generated/ directory.
#
# Prerequisites:
#   - flatc  (FlatBuffers compiler)
#   - protoc (protobuf compiler)
#   - grpc_cpp_plugin (gRPC code generator)
#
# Usage:
#   bash tools/codegen/generate-cpp-bridge.sh
#
# Thread: bridge/codegen/cpp
# Tier: M

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
FBS_SCHEMA="${ROOT}/contracts/protocols/src/loom-bridge.fbs"
PROTO_SCHEMA="${ROOT}/contracts/protocols/src/loom-bridge.proto"
OUTPUT_DIR="${ROOT}/fabrics/bridge-loom-ue5/Source/BridgeLoom/Public/Generated"

echo "=== Loom C++ Bridge Codegen ==="
echo "Root:   ${ROOT}"
echo "Output: ${OUTPUT_DIR}"

mkdir -p "${OUTPUT_DIR}"

# ── FlatBuffers ──────────────────────────────────────────────────

if command -v flatc &>/dev/null; then
  echo ""
  echo "--- FlatBuffers C++ generation ---"
  echo "Schema: ${FBS_SCHEMA}"
  flatc --cpp \
    --gen-mutable \
    --gen-object-api \
    --scoped-enums \
    -o "${OUTPUT_DIR}" \
    "${FBS_SCHEMA}"
  echo "Generated: ${OUTPUT_DIR}/loom_bridge_generated.h"
else
  echo "WARNING: flatc not found. Skipping FlatBuffers generation."
  echo "Install: https://github.com/google/flatbuffers/releases"
fi

# ── Protobuf + gRPC ─────────────────────────────────────────────

if command -v protoc &>/dev/null; then
  echo ""
  echo "--- Protobuf C++ generation ---"
  echo "Schema: ${PROTO_SCHEMA}"

  GRPC_PLUGIN="$(command -v grpc_cpp_plugin 2>/dev/null || true)"

  protoc \
    --proto_path="$(dirname "${PROTO_SCHEMA}")" \
    --cpp_out="${OUTPUT_DIR}" \
    "$(basename "${PROTO_SCHEMA}")"
  echo "Generated: ${OUTPUT_DIR}/loom_bridge.pb.h"

  if [ -n "${GRPC_PLUGIN}" ]; then
    echo ""
    echo "--- gRPC C++ generation ---"
    protoc \
      --proto_path="$(dirname "${PROTO_SCHEMA}")" \
      --grpc_out="${OUTPUT_DIR}" \
      --plugin=protoc-gen-grpc="${GRPC_PLUGIN}" \
      "$(basename "${PROTO_SCHEMA}")"
    echo "Generated: ${OUTPUT_DIR}/loom_bridge.grpc.pb.h"
  else
    echo "WARNING: grpc_cpp_plugin not found. Skipping gRPC generation."
  fi
else
  echo "WARNING: protoc not found. Skipping protobuf/gRPC generation."
  echo "Install: https://github.com/protocolbuffers/protobuf/releases"
fi

echo ""
echo "=== Codegen complete ==="
ls -la "${OUTPUT_DIR}"
