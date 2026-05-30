import { Platform } from 'react-native';

// DevCard API Configuration

const getDevServerHost = () => {
  // Standard React Native localhost aliases:
  // - Android Emulator: 10.0.2.2 (maps to host localhost)
  // - iOS Simulator: localhost
  // - Physical device / Fallback: '10.155.14.65' (your development machine IP)
  return Platform.select({
    android: '10.0.2.2',
    ios: 'localhost',
    default: '10.155.14.65',
  });
};

export const API_BASE_URL = __DEV__
  ? `http://${getDevServerHost()}:3000`
  : 'https://api.devcard.dev';

export const APP_URL = __DEV__
  ? `http://${getDevServerHost()}:5173`
  : 'https://devcard.dev';

export const OAUTH_REDIRECT_URI = 'devcard://oauth/callback';
