import { randomBytes } from 'node:crypto';

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

  const stateParts = state.split('.');
  const encodedRedirect = stateParts[1];
  if (stateParts.length < 3 || !encodedRedirect) {
    const configuredRedirect = process.env.MOBILE_REDIRECT_URI;
    return configuredRedirect && isAllowedMobileRedirectUri(configuredRedirect) ? configuredRedirect : null;
  }

  try {
    const redirectUri = Buffer.from(encodedRedirect, 'base64url').toString('utf8');
    return isAllowedMobileRedirectUri(redirectUri) ? redirectUri : null;
  } catch {
    return null;
  }
}

export function isAllowedMobileRedirectUri(redirectUri: string): boolean {
  const configuredRedirect = process.env.MOBILE_REDIRECT_URI;
  if (!configuredRedirect) {
    return false;
  }

  try {
    const candidate = new URL(redirectUri);
    const allowed = new URL(configuredRedirect);

    if (candidate.protocol !== allowed.protocol) {
      return false;
    }

    if (candidate.protocol === 'http:' || candidate.protocol === 'https:') {
      return candidate.origin === allowed.origin;
    }

    return candidate.host === allowed.host;
  } catch {
    return false;
  }
}
