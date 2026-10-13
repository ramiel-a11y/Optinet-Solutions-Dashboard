/**
 * App-level encryption for sensitive columns (passwords, API tokens).
 *
 * Algorithm: AES-256-GCM with a random 96-bit IV per row.
 * Storage format: `enc:v1:<iv-b64>:<tag-b64>:<ciphertext-b64>`.
 * Legacy plaintext values (no prefix) pass through decrypt() unchanged so the
 * app stays usable while we backfill encryption.
 */
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const PREFIX = 'enc:v1:';

function loadKey(): Buffer {
  const hex = process.env.ENCRYPTION_KEY;
  if (!hex) throw new Error('ENCRYPTION_KEY env var is not set');
  if (hex.length !== 64) throw new Error('ENCRYPTION_KEY must be 64 hex chars (32 bytes)');
  return Buffer.from(hex, 'hex');
}

export function encrypt(plaintext: string | null | undefined): string | null {
  if (plaintext == null || plaintext === '') return null;
  if (typeof plaintext === 'string' && plaintext.startsWith(PREFIX)) return plaintext;
  const key = loadKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString('base64')}:${tag.toString('base64')}:${enc.toString('base64')}`;
}

export function decrypt(ciphertext: string | null | undefined): string | null {
  if (ciphertext == null || ciphertext === '') return null;
  const s = String(ciphertext);
  if (!s.startsWith(PREFIX)) return s; // legacy plaintext
  const parts = s.slice(PREFIX.length).split(':');
  if (parts.length !== 3) return null;
  try {
    const key = loadKey();
    const iv = Buffer.from(parts[0], 'base64');
    const tag = Buffer.from(parts[1], 'base64');
    const enc = Buffer.from(parts[2], 'base64');
    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
  } catch {
    return null;
  }
}

/** Tables and columns that should be encrypted on write + decrypted on read. */
export const ENCRYPTED_COLUMNS: Record<string, string[]> = {
  credentials: ['password'],
  software_licenses: ['password', 'apiToken'],
  clients: ['password'],
};
