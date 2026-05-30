import Constants from 'expo-constants';
import * as Linking from 'expo-linking';

// DevCard API Configuration

// Prefer explicit configuration via Expo/EAS extras. Fallback to sensible defaults
const extras = (Constants as any).manifest?.extra || (Constants as any).expoConfig?.extra;

const DEV_API = extras?.API_BASE_URL || extras?.DEV_API_BASE_URL;
const DEV_APP = extras?.APP_URL;

export const API_BASE_URL = __DEV__
  ? DEV_API ?? `http://10.0.2.2:3000` // 10.0.2.2 is a common emulator host for Android
  : extras?.API_BASE_URL ?? 'https://api.devcard.dev';

export const APP_URL = __DEV__
  ? DEV_APP ?? `http://localhost:5173`
  : extras?.APP_URL ?? 'https://devcard.dev';

export const OAUTH_REDIRECT_URI = Linking.createURL('oauth/callback');
