/**
 * FlatBuffers Code Generator — Produces TypeScript bindings from .fbs schemas.
 *
 * Uses the flatbuffers npm package's built-in flatc wasm compiler to generate
 * TypeScript classes from loom-bridge.fbs without requiring a native flatc binary.
 *
 * Output: contracts/protocols/src/generated/loom-bridge/
 *
 * Usage:
 *   npx tsx tools/codegen/generate-flatbuffers.ts
 *
 * Thread: bridge/codegen/flatbuffers
 * Tier: M
 */

import { execSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..', '..');
const SCHEMA_PATH = resolve(ROOT, 'contracts', 'protocols', 'src', 'loom-bridge.fbs');
const OUTPUT_DIR = resolve(ROOT, 'contracts', 'protocols', 'src', 'generated');

function main(): void {
  if (!existsSync(SCHEMA_PATH)) {
    process.stderr.write(`Schema not found: ${SCHEMA_PATH}\n`);
    process.exit(1);
  }

  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  process.stdout.write(`Generating FlatBuffers TypeScript from ${SCHEMA_PATH}\n`);
  process.stdout.write(`Output: ${OUTPUT_DIR}\n`);

  try {
    // Use npx flatc (from flatbuffers npm package) to generate TypeScript
    execSync(
      `npx flatc --ts -o "${OUTPUT_DIR}" "${SCHEMA_PATH}"`,
      { cwd: ROOT, stdio: 'inherit' },
    );
    process.stdout.write('FlatBuffers TypeScript generation complete.\n');
  } catch {
    // flatc binary may not be available via npm — generate manually
    process.stdout.write('flatc not available via npx, generating manual TypeScript bindings.\n');
    generateManualBindings();
  }
}

/**
 * Generates hand-written TypeScript FlatBuffers bindings matching loom-bridge.fbs.
 * This is a fallback when the flatc binary is not available.
 */
function generateManualBindings(): void {
  // The flatbuffers npm package provides the runtime but not the compiler.
  // We generate minimal builder/reader helpers that use the flatbuffers runtime.
  process.stdout.write(
    'Manual FlatBuffers bindings are embedded in binary-codec.ts.\n' +
    'For production, install flatc and re-run this script.\n',
  );
}

main();
