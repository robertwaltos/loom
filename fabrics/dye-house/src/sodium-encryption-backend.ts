/**
 * Sodium Encryption Backend — Production EncryptionBackend using sodium-native.
 *
 * Implements XChaCha20-Poly1305 AEAD encryption via sodium-native
 * (libsodium bindings). This provides authenticated encryption with
 * nonce-misuse resistance via extended nonces.
 *
 * Thread: sentinel/dye-house/sodium-backend
 * Tier: 0
 */

import { createRequire } from 'node:module';
import type { EncryptionBackend } from './encryption-service.js';

const require = createRequire(import.meta.url);

interface SodiumCryptoBox {
  readonly crypto_aead_xchacha20poly1305_ietf_KEYBYTES: number;
  readonly crypto_aead_xchacha20poly1305_ietf_NPUBBYTES: number;
  readonly crypto_aead_xchacha20poly1305_ietf_ABYTES: number;
  crypto_aead_xchacha20poly1305_ietf_encrypt(
    ciphertext: Buffer,
    message: Buffer,
    additionalData: Buffer | null,
    nsec: null,
    nonce: Buffer,
    key: Buffer,
  ): void;
  crypto_aead_xchacha20poly1305_ietf_decrypt(
    message: Buffer,
    nsec: null,
    ciphertext: Buffer,
    additionalData: Buffer | null,
    nonce: Buffer,
    key: Buffer,
  ): void;
  randombytes_buf(buf: Buffer): void;
}

let sodiumModule: SodiumCryptoBox | null = null;

function getSodium(): SodiumCryptoBox {
  if (!sodiumModule) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    sodiumModule = require('sodium-native') as SodiumCryptoBox;
  }
  return sodiumModule;
}

export function createSodiumEncryptionBackend(): EncryptionBackend {
  return {
    encrypt: (key, plaintext, nonce) => sodiumEncrypt(key, plaintext, nonce),
    decrypt: (key, ciphertext, nonce) => sodiumDecrypt(key, ciphertext, nonce),
    generateNonce: () => generateSodiumNonce(),
  };
}

function sodiumEncrypt(keyHex: string, plaintext: string, nonceHex: string): string {
  const sodium = getSodium();
  const key = Buffer.from(keyHex, 'hex');
  const nonce = Buffer.from(nonceHex, 'hex');
  const message = Buffer.from(plaintext, 'utf8');

  const ciphertext = Buffer.alloc(
    message.length + sodium.crypto_aead_xchacha20poly1305_ietf_ABYTES,
  );

  sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(
    ciphertext,
    message,
    null,
    null,
    nonce,
    key,
  );

  return ciphertext.toString('hex');
}

function sodiumDecrypt(keyHex: string, ciphertextHex: string, nonceHex: string): string {
  const sodium = getSodium();
  const key = Buffer.from(keyHex, 'hex');
  const nonce = Buffer.from(nonceHex, 'hex');
  const ciphertext = Buffer.from(ciphertextHex, 'hex');

  const message = Buffer.alloc(
    ciphertext.length - sodium.crypto_aead_xchacha20poly1305_ietf_ABYTES,
  );

  sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(
    message,
    null,
    ciphertext,
    null,
    nonce,
    key,
  );

  return message.toString('utf8');
}

function generateSodiumNonce(): string {
  const sodium = getSodium();
  const nonce = Buffer.alloc(sodium.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES);
  sodium.randombytes_buf(nonce);
  return nonce.toString('hex');
}
