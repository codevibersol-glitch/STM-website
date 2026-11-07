import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto';

export function id(prefix = ''): string {
  return `${prefix}${randomBytes(16).toString('hex')}`;
}

export function licenseKey(): string {
  const raw = randomBytes(18).toString('base64url').toUpperCase();
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
