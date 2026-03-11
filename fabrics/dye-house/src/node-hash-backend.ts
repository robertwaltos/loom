/**
 * Node Crypto Hash Backend — Production HashBackend using Node.js crypto.
 *
 * Implements SHA-256, HMAC-SHA256, and constant-time comparison
 * using the built-in Node.js crypto module. No external dependencies.
 *
 * Thread: sentinel/dye-house/node-hash-backend
 * Tier: 0
 */

import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import type { HashBackend } from './hash-service.js';

export function createNodeHashBackend(): HashBackend {
  return {
    sha256: (data) => nodeSha256(data),
    hmacSha256: (key, data) => nodeHmacSha256(key, data),
    constantTimeEquals: (a, b) => nodeConstantTimeEquals(a, b),
  };
}

function nodeSha256(data: string): string {
  return createHash('sha256').update(data, 'utf8').digest('hex');
}

function nodeHmacSha256(key: string, data: string): string {
  return createHmac('sha256', key).update(data, 'utf8').digest('hex');
}

function nodeConstantTimeEquals(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  return timingSafeEqual(bufA, bufB);
}
