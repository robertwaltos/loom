import { describe, it, expect, afterEach } from 'vitest';
import Module from 'node:module';

type SodiumMock = {
  readonly crypto_aead_xchacha20poly1305_ietf_KEYBYTES: number;
  readonly crypto_aead_xchacha20poly1305_ietf_NPUBBYTES: number;
  readonly crypto_aead_xchacha20poly1305_ietf_ABYTES: number;
  crypto_aead_xchacha20poly1305_ietf_encrypt: (
    ciphertext: Buffer,
    message: Buffer,
    additionalData: Buffer | null,
    nsec: null,
    nonce: Buffer,
    key: Buffer,
  ) => void;
  crypto_aead_xchacha20poly1305_ietf_decrypt: (
    message: Buffer,
    nsec: null,
    ciphertext: Buffer,
    additionalData: Buffer | null,
    nonce: Buffer,
    key: Buffer,
  ) => void;
  randombytes_buf: (buf: Buffer) => void;
};

type Loader = (request: string, parent: unknown, isMain: boolean) => unknown;

const moduleWithLoad = Module as unknown as { _load: Loader };
const originalLoad = moduleWithLoad._load;

function makeSodiumMock(tagByte = 0xab): {
  module: SodiumMock;
  calls: { encrypt: number; decrypt: number; random: number };
} {
  const calls = { encrypt: 0, decrypt: 0, random: 0 };

  const module: SodiumMock = {
    crypto_aead_xchacha20poly1305_ietf_KEYBYTES: 32,
    crypto_aead_xchacha20poly1305_ietf_NPUBBYTES: 24,
    crypto_aead_xchacha20poly1305_ietf_ABYTES: 16,
    crypto_aead_xchacha20poly1305_ietf_encrypt: (ciphertext, message) => {
      calls.encrypt++;
      message.copy(ciphertext, 0);
      ciphertext.fill(tagByte, message.length);
    },
    crypto_aead_xchacha20poly1305_ietf_decrypt: (message, _nsec, ciphertext) => {
      calls.decrypt++;
      ciphertext.subarray(0, message.length).copy(message);
    },
    randombytes_buf: (buf) => {
      calls.random++;
      for (let i = 0; i < buf.length; i++) {
        buf[i] = i % 256;
      }
    },
  };

  return { module, calls };
}

function installSodiumInterceptor(sodium: SodiumMock): void {
  moduleWithLoad._load = (request: string, parent: unknown, isMain: boolean): unknown => {
    if (request === 'sodium-native') {
      return sodium;
    }
    return originalLoad(request, parent, isMain);
  };
}

function restoreModuleLoader(): void {
  moduleWithLoad._load = originalLoad;
}

afterEach(async () => {
  restoreModuleLoader();
  const { vi } = await import('vitest');
  vi.resetModules();
});

describe('Sodium Encryption Backend Simulation', () => {
  it('encrypts plaintext into hex ciphertext using mocked sodium AEAD', async () => {
    const sodium = makeSodiumMock(0xcc);
    installSodiumInterceptor(sodium.module);

    const { createSodiumEncryptionBackend } = await import('../sodium-encryption-backend.js');
    const backend = createSodiumEncryptionBackend();

    const key = '11'.repeat(32);
    const nonce = '22'.repeat(24);
    const ciphertextHex = backend.encrypt(key, 'loom', nonce);

    const raw = Buffer.from(ciphertextHex, 'hex');
    expect(raw.subarray(0, 4).toString('utf8')).toBe('loom');
    expect(raw.subarray(4)).toEqual(Buffer.alloc(16, 0xcc));
    expect(sodium.calls.encrypt).toBe(1);
  });

  it('decrypts ciphertext back to plaintext using mocked sodium AEAD', async () => {
    const sodium = makeSodiumMock(0xdd);
    installSodiumInterceptor(sodium.module);

    const { createSodiumEncryptionBackend } = await import('../sodium-encryption-backend.js');
    const backend = createSodiumEncryptionBackend();

    const key = 'aa'.repeat(32);
    const nonce = 'bb'.repeat(24);
    const ciphertext = backend.encrypt(key, 'cipher-text', nonce);

    const plaintext = backend.decrypt(key, ciphertext, nonce);

    expect(plaintext).toBe('cipher-text');
    expect(sodium.calls.decrypt).toBe(1);
  });

  it('generates deterministic nonce bytes from mocked randombytes_buf', async () => {
    const sodium = makeSodiumMock();
    installSodiumInterceptor(sodium.module);

    const { createSodiumEncryptionBackend } = await import('../sodium-encryption-backend.js');
    const backend = createSodiumEncryptionBackend();

    const nonceHex = backend.generateNonce();

    expect(nonceHex).toBe('000102030405060708090a0b0c0d0e0f1011121314151617');
    expect(sodium.calls.random).toBe(1);
  });

  it('reuses cached sodium module across backend operations after first load', async () => {
    const sodium = makeSodiumMock(0xee);
    installSodiumInterceptor(sodium.module);

    const { createSodiumEncryptionBackend } = await import('../sodium-encryption-backend.js');
    const backend = createSodiumEncryptionBackend();

    const key = '33'.repeat(32);
    const nonce = '44'.repeat(24);
    const encrypted = backend.encrypt(key, 'a', nonce);
    backend.decrypt(key, encrypted, nonce);
    backend.generateNonce();

    expect(sodium.calls.encrypt).toBe(1);
    expect(sodium.calls.decrypt).toBe(1);
    expect(sodium.calls.random).toBe(1);
  });
});
