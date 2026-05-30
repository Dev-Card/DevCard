import { Platform } from 'react-native';

// ── DevCard API Configuration ─────────────────────────────────────────────────
// Environment-aware URLs with no Expo dependency. On Android emulators the
// loopback address is 10.0.2.2; on iOS simulators localhost works directly.

const ANDROID_LOCALHOST = '10.0.2.2';
const IOS_LOCALHOST = 'localhost';
const DEV_HOST = Platform.OS === 'android' ? ANDROID_LOCALHOST : IOS_LOCALHOST;

export const API_BASE_URL: string = __DEV__
  ? `http://${DEV_HOST}:3000`
  : 'https://api.devcard.dev';

export const APP_URL: string = __DEV__
  ? 'http://localhost:5173'
  : 'https://devcard.dev';

// Deep link scheme — must match android/app/build.gradle and ios/Info.plist
export const DEEP_LINK_SCHEME = 'devcard';

export const OAUTH_REDIRECT_URI = `${DEEP_LINK_SCHEME}://oauth/callback`;
