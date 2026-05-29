import { randomBytes } from 'crypto';

export function generateState(): string {
  return randomBytes(32).toString('hex');
}

export function buildOAuthState(clientState: string, mobileRedirectUri: string): string {
  if (!clientState) {
    return generateState();
  }

  if (clientState.startsWith('mobile_') && mobileRedirectUri) {
    const encodedRedirect = Buffer.from(mobileRedirectUri, 'utf8').toString('base64url');
    return `${clientState}.${encodedRedirect}.${generateState()}`;
  }

  return `${clientState}.${generateState()}`;
}

export function getMobileRedirectUri(state?: string): string | null {
  if (!state?.startsWith('mobile_')) {
    return null;
  }

  const encodedRedirect = state.split('.')[1];
  if (!encodedRedirect) {
    return null;
  }

  try {
    return Buffer.from(encodedRedirect, 'base64url').toString('utf8');
  } catch {
    return null;
  }
}
