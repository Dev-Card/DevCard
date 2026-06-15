import { Linking } from 'react-native';
import { AUTH_BASE_URL, BACKEND_AUTH_ROUTES, OAUTH_REDIRECT_URI } from '../config';

type AuthProvider = keyof typeof BACKEND_AUTH_ROUTES;

export function buildBackendAuthUrl(provider: AuthProvider) {
  const route = BACKEND_AUTH_ROUTES[provider];
  const params = new URLSearchParams({
    client: 'mobile',
    provider,
    state: `mobile_${provider}`,
    mobile_redirect_uri: OAUTH_REDIRECT_URI,
  });

  return `${AUTH_BASE_URL}${route}?${params.toString()}`;
}

export async function startBackendOAuth(provider: AuthProvider) {
  const url = buildBackendAuthUrl(provider);
  const canOpen = await Linking.canOpenURL(url);

  if (!canOpen) {
    throw new Error(`Cannot open auth URL for ${provider}.`);
  }

  await Linking.openURL(url);
}

export function getJwtFromCallbackUrl(url: string) {
  if (!url.startsWith(OAUTH_REDIRECT_URI)) return null;

  const queryString = url.includes('#') ? url.split('#')[1] : url.split('?')[1] || '';
  const params = new URLSearchParams(queryString);

  return params.get('token') || params.get('jwt') || params.get('access_token');
}
