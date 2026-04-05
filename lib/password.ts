import { createHash, randomBytes, timingSafeEqual } from 'crypto';

const HASH_SEPARATOR = ':';

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = createHash('sha256').update(salt + password).digest('hex');
  return `${salt}${HASH_SEPARATOR}${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  // Plain text password (legacy)
  if (!stored.includes(HASH_SEPARATOR)) {
    return password === stored;
  }

  // Hashed password (new format: salt:hash)
  const [salt, hash] = stored.split(HASH_SEPARATOR);
  const testHash = createHash('sha256').update(salt + password).digest('hex');

  try {
    return timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(testHash, 'hex'));
  } catch {
    return false;
  }
}
