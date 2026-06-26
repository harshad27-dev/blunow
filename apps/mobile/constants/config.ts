// Change this to your machine's local IP when testing on a physical device
const DEV_API_URL = 'http://192.168.1.42:3001';
const PROD_API_URL = 'https://api.blunow.app';

export const Config = {
  API_URL: __DEV__ ? DEV_API_URL : PROD_API_URL,
  TOKEN_KEY: 'blunow_access_token',
  REFRESH_TOKEN_KEY: 'blunow_refresh_token',
  ONBOARDING_PROGRESS_KEY: 'blunow_onboarding_progress',
  GOOGLE_EXPO_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID,
  GOOGLE_IOS_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  GOOGLE_ANDROID_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
  GOOGLE_WEB_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  REQUEST_TIMEOUT: 15000,
};
