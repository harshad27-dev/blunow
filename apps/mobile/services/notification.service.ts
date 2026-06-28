import { api } from "./api";
import type { NotificationPreferences } from "@/types/notification.types";

export const notificationService = {
  getNotifications: async () => {
    const response = await api.get("/notifications");
    return response.data;
  },

  getPreferences: async () => {
    const response = await api.get("/notifications/preferences");
    return response.data;
  },

  updatePreferences: async (payload: Partial<NotificationPreferences>) => {
    const response = await api.patch("/notifications/preferences", payload);
    return response.data;
  },

  markAsRead: async (id: string) => {
    const response = await api.patch(`/notifications/${id}/read`);
    return response.data;
  },

  markAllAsRead: async () => {
    const response = await api.patch("/notifications/read-all");
    return response.data;
  },

  deleteNotification: async (id: string) => {
    const response = await api.delete(`/notifications/${id}`);
    return response.data;
  },
};
