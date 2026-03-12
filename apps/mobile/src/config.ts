// DevCard API Configuration

// For Android emulator, use 10.0.2.2 instead of localhost
// For physical device, use machine's IP address
export const API_BASE_URL = __DEV__
  ? 'http://10.0.2.2:3000'
  : 'https://api.devcard.dev';

export const APP_URL = __DEV__
  ? 'http://10.0.2.2:5173'
  : 'https://devcard.dev';

export const OAUTH_REDIRECT_URI = 'devcard://oauth/callback';
