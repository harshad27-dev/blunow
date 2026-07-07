const DEFAULT_DEV_API_URL = "http://10.223.212.248:3001";
const DEFAULT_PROD_API_URL = "https://api.blunow.app";

const API_URL = (
  process.env.EXPO_PUBLIC_API_URL ||
  (__DEV__ ? DEFAULT_DEV_API_URL : DEFAULT_PROD_API_URL)
).replace(/\/$/, "");

export const Config = {
  API_URL,
  TOKEN_KEY: 'blunow_access_token',
  REFRESH_TOKEN_KEY: 'blunow_refresh_token',
  ONBOARDING_PROGRESS_KEY: 'blunow_onboarding_progress',
  GOOGLE_EXPO_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID,
  GOOGLE_IOS_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  GOOGLE_ANDROID_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
  GOOGLE_WEB_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  REQUEST_TIMEOUT: 15000,
};
