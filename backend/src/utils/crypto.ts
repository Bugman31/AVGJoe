import crypto from 'crypto';
import { env } from '../config/env';

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

function getKey(): Buffer | null {
  if (!env.ENCRYPTION_KEY) return null;
  return Buffer.from(env.ENCRYPTION_KEY, 'hex');
}

export function encrypt(text: string): string {
  const key = getKey();
  if (!key) return text;

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);

  return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decrypt(encrypted: string): string {
  const key = getKey();
  if (!key) return encrypted;

  // If the value doesn't contain a colon separator, it may be stored as plaintext
  if (!encrypted.includes(':')) return encrypted;

  const [ivHex, encryptedHex] = encrypted.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const encryptedBuffer = Buffer.from(encryptedHex, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  const decrypted = Buffer.concat([decipher.update(encryptedBuffer), decipher.final()]);

  return decrypted.toString('utf8');
}
