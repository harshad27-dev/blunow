import axios from "axios";
import { Config } from "@/constants/config";
import { storage } from "@/utils/storage";
import { useAuthStore } from "@/store/authStore";

export const api = axios.create({
  baseURL: `${Config.API_URL}/api`,
  timeout: Config.REQUEST_TIMEOUT,
  headers: { "Content-Type": "application/json" },
});

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

    // Skip retry for auth routes to prevent infinite logout loop
    const isAuthRoute = originalRequest.url?.includes("/auth/");
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !isAuthRoute
    ) {
      originalRequest._retry = true;
      try {
        const refreshToken = await storage.get(Config.REFRESH_TOKEN_KEY);
        if (!refreshToken) throw new Error("No refresh token");

        const { data } = await axios.post(
          `${Config.API_URL}/api/auth/refresh`,
          { refreshToken },
        );

        const newToken: string | undefined = data.data.accessToken;
        const newRefresh: string | undefined = data.data.refreshToken;

        if (!newToken) throw new Error("No access token returned");
        await storage.set(Config.TOKEN_KEY, newToken);
        if (newRefresh) {
          await storage.set(Config.REFRESH_TOKEN_KEY, newRefresh);
        }
        useAuthStore.setState({
          token: newToken,
          isAuthenticated: true,
        });

        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch {
        // Refresh failed, so clear local auth state.
        useAuthStore.getState().logout();
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  },
);
