import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notificationService } from "@/services/notification.service";
import type { AppNotification } from "@/types/notification.types";

export const notificationKeys = {
  all: ["notifications"] as const,
};

export const useNotificationsQuery = () => {
  return useQuery({
    queryKey: notificationKeys.all,
    queryFn: async () => {
      const response = await notificationService.getNotifications();
      if (!response?.success || !Array.isArray(response.data)) return [];
      return response.data as AppNotification[];
    },
    refetchInterval: 30000,
  });
};

export const useMarkNotificationReadMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => notificationService.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
};

export const useMarkAllNotificationsReadMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => notificationService.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
};
