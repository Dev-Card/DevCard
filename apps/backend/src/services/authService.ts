import { randomBytes } from 'node:crypto';

// Schemes that are permitted as mobile OAuth redirect targets.
// The devcard:// custom scheme is the only registered scheme for the
// DevCard mobile app; exp:// covers Expo Go during local development.
// Any URI that does not start with one of these prefixes is rejected
// before it is embedded in the OAuth state or used as a redirect target.
const ALLOWED_MOBILE_SCHEMES = ['devcard://', 'exp://'];

export function generateState(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Returns true only when the supplied URI begins with one of the
 * registered mobile app schemes.  An empty string, a plain HTTPS URL,
 * or any other value returns false.
 */
export function isSafeMobileRedirectUri(uri: string): boolean {
  return ALLOWED_MOBILE_SCHEMES.some((scheme) => uri.startsWith(scheme));
}

export function buildOAuthState(clientState: string, mobileRedirectUri: string): string {
  if (!clientState) {
    return generateState();
  }

  if (clientState.startsWith('mobile_') && mobileRedirectUri) {
    // Only embed the redirect URI when it targets a registered app scheme.
    // An attacker-supplied https:// URI is silently dropped; the callback
    // will fall back to the server-configured MOBILE_REDIRECT_URI instead.
    if (!isSafeMobileRedirectUri(mobileRedirectUri)) {
      return `${clientState}.${generateState()}`;
    }
    const encodedRedirect = Buffer.from(mobileRedirectUri, 'utf8').toString('base64url');
    return `${clientState}.${encodedRedirect}.${generateState()}`;
  }

  return `${clientState}.${generateState()}`;
}

/**
 * Decodes the mobile redirect URI from the OAuth state string and
 * validates it against the scheme allowlist.  Returns null when the
 * state is not a mobile flow, when the embedded URI is absent, or
 * when the decoded URI does not pass the allowlist check.
 */
export function getMobileRedirectUri(state?: string): string | null {
  if (!state?.startsWith('mobile_')) {
    return null;
  }

  const encodedRedirect = state.split('.')[1];
  if (!encodedRedirect) {
    return null;
  }

  try {
    const decoded = Buffer.from(encodedRedirect, 'base64url').toString('utf8');
    // Re-validate on the way out so that a tampered state string (e.g.
    // one constructed outside buildOAuthState) cannot slip a forbidden
    // URI past the initial check at flow-initiation time.
    if (!isSafeMobileRedirectUri(decoded)) {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}
