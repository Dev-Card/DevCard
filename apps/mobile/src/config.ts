// DevCard API Configuration

// For Android emulator, use localhost with 'adb reverse tcp:3000 tcp:3000'
export const API_BASE_URL = __DEV__
  ? 'http://localhost:3000'
  : 'https://api.devcard.dev';

export const APP_URL = __DEV__
  ? 'http://localhost:5173'
  : 'https://devcard.dev';

export const OAUTH_REDIRECT_URI = 'devcard://oauth/callback';
