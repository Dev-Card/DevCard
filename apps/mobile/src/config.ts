import Constants from 'expo-constants';
import * as Linking from 'expo-linking';

// DevCard API Configuration

const getDevServerHost = () => {
  const constants = Constants as any;
  const hostUri =
    Constants.expoConfig?.hostUri ||
    constants.manifest2?.extra?.expoGo?.debuggerHost ||
    constants.manifest?.debuggerHost;

  return hostUri?.split(':')[0] || '10.155.14.65';
};

export const API_BASE_URL = __DEV__
  ? `http://${getDevServerHost()}:3000`
  : 'https://api.devcard.dev';

export const APP_URL = __DEV__
  ? `http://${getDevServerHost()}:5173`
  : 'https://devcard.dev';

export const OAUTH_REDIRECT_URI = Linking.createURL('oauth/callback');
