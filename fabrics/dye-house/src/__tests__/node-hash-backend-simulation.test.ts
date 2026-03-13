import { describe, it, expect } from 'vitest';
import { createNodeHashBackend } from '../node-hash-backend.js';

describe('Node Hash Backend Simulation', () => {
  it('produces deterministic SHA-256 hex for utf8 input', () => {
    const backend = createNodeHashBackend();

    const hash = backend.sha256('loom-kalon');

    expect(hash).toBe('08c8970379b3430f48a71a6b1a6bb485ef65dd7f2afa5435c4f40a1d3cd8c497');
  });

  it('produces deterministic HMAC-SHA256 hex with key and message', () => {
    const backend = createNodeHashBackend();

    const hmac = backend.hmacSha256('secret-key', 'loom-kalon');

    expect(hmac).toBe('e4f3a6ad6e8c5f683088920b48f6b6842757d4e2fed80c474cde10be10a7daff');
  });

  it('returns true for equal strings and false for unequal strings', () => {
    const backend = createNodeHashBackend();

    expect(backend.constantTimeEquals('alpha', 'alpha')).toBe(true);
    expect(backend.constantTimeEquals('alpha', 'alphb')).toBe(false);
  });

  it('fails fast when lengths differ before comparing bytes', () => {
    const backend = createNodeHashBackend();

    expect(backend.constantTimeEquals('short', 'much-longer')).toBe(false);
  });

  it('treats unicode input as utf8 for hashing APIs', () => {
    const backend = createNodeHashBackend();

    const text = 'koydo-\u7e54\u308a';
    const key = '\u9375';
    const sha = backend.sha256(text);
    const hmac = backend.hmacSha256(key, text);

    expect(sha).toBe('d3aa5058e4956041c67c157555e70ca5b6461bcfe9667510d05090558f17353f');
    expect(hmac).toBe('8c91ad1974b669928049bdedde1bb7788fb934d171b258396a2868b345b414d8');
  });
});
