import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto';

export function id(prefix = ''): string {
  return `${prefix}${randomBytes(16).toString('hex')}`;
}

const KEY_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

/** STM-XXXX-XXXX-XXXX-XXXX using A–Z and 0–9, which is what the installer accepts. */
export function licenseKey(): string {
  const raw = Array.from(randomBytes(16), (b) => KEY_ALPHABET[b % KEY_ALPHABET.length]).join('');
  return `STM-${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}-${raw.slice(12, 16)}`;
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const next = scryptSync(password, salt, 64);
  const prev = Buffer.from(hash, 'hex');
  return prev.length === next.length && timingSafeEqual(prev, next);
}

export function machineHash(machine: string): string {
  return createHash('sha256').update(machine).digest('hex');
}
