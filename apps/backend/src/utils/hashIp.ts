import crypto from 'crypto';

/** Returns a SHA-256 hex digest of the IP, or null when absent. */
export function hashIp(ip?: string | null): string | null {
  if (!ip) return null;
  return crypto.createHash('sha256').update(ip).digest('hex');
}
