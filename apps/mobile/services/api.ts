import axios from "axios";
import { Config } from "@/constants/config";
import { storage } from "@/utils/storage";

export const api = axios.create({
  baseURL: `${Config.API_URL}/api`,
  timeout: Config.REQUEST_TIMEOUT,
  headers: { "Content-Type": "application/json" },
});

let refreshPromise: Promise<string> | null = null;

// Request interceptor: attach token
api.interceptors.request.use(async (config) => {
  const token = await storage.get(Config.TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: handle 401 / refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    const authRefreshBlockedRoutes = [
      "/auth/login",
      "/auth/start",
      "/auth/login/otp",
      "/auth/google/mobile",
      "/auth/password-reset",
      "/auth/password-reset/otp",
      "/auth/register",
      "/auth/refresh",
      "/auth/logout",
    ];
    const shouldSkipRefresh = authRefreshBlockedRoutes.some((route) =>
      originalRequest.url?.includes(route),
    );
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !shouldSkipRefresh
    ) {
      originalRequest._retry = true;
      try {
        const refreshToken = await storage.get(Config.REFRESH_TOKEN_KEY);
        if (!refreshToken) throw new Error("No refresh token");

        if (!refreshPromise) {
          refreshPromise = axios
            .post(`${Config.API_URL}/api/auth/refresh`, { refreshToken })
            .then(async ({ data }) => {
              const newToken: string | undefined = data.data.accessToken;
              const newRefresh: string | undefined = data.data.refreshToken;

              if (!newToken) throw new Error("No access token returned");
              await storage.set(Config.TOKEN_KEY, newToken);
              if (newRefresh) {
                await storage.set(Config.REFRESH_TOKEN_KEY, newRefresh);
              }
              return newToken;
            })
            .finally(() => {
              refreshPromise = null;
            });
        }

        const newToken = await refreshPromise;

        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch {
        // Refresh failed, so clear local auth tokens.
        await storage.delete(Config.TOKEN_KEY);
        await storage.delete(Config.REFRESH_TOKEN_KEY);
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  },
);

