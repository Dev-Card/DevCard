import crypto from 'node:crypto';

export function generateRefreshToken():string {
  return crypto.randomBytes(64).toString('hex');
}

export function hashRefreshToken(token: string):string {
  return crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');
}

export function hashIp(ip: string): string {
  return crypto
    .createHash('sha256')
    .update(ip)
    .digest('hex');
}