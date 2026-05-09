// Change this to your machine's local IP when testing on a physical device
const DEV_API_URL = 'http://192.168.1.9:3001';
const PROD_API_URL = 'https://api.blunow.app';

export const Config = {
  API_URL: __DEV__ ? DEV_API_URL : PROD_API_URL,
  TOKEN_KEY: 'blunow_access_token',
  REFRESH_TOKEN_KEY: 'blunow_refresh_token',
  REQUEST_TIMEOUT: 15000,
};
