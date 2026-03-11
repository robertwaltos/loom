/**
 * Chronicle Hasher — SHA-256 hash computation for the chain.
 *
 * Uses the Web Crypto API (available in Node 22+).
 * Each entry's hash = SHA-256(previousHash + entryId + timestamp + category + content).
 */

export interface HashInput {
  readonly previousHash: string;
  readonly entryId: string;
  readonly timestamp: number;
  readonly category: string;
  readonly content: string;
}

export async function computeEntryHash(input: HashInput): Promise<string> {
  const data = buildHashPayload(input);
  const buffer = new TextEncoder().encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  return bufferToHex(hashBuffer);
}

function buildHashPayload(input: HashInput): string {
  return [
    input.previousHash,
    input.entryId,
    String(input.timestamp),
    input.category,
    input.content,
  ].join(':');
}

function bufferToHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const hexParts: string[] = [];
  for (const byte of bytes) {
    hexParts.push(byte.toString(16).padStart(2, '0'));
  }
  return hexParts.join('');
}
