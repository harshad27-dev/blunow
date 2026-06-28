import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  SettingsScreen,
  SettingsSection,
  SettingsToggle,
} from "@/components/settings/SettingsUi";
import { notificationService } from "@/services/notification.service";
import type { NotificationPreferences } from "@/types/notification.types";

const DEFAULTS: NotificationPreferences = {
  pushEnabled: true,
  matches: true,
  messages: true,
  likes: true,
  comments: true,
  storyViews: true,
  confessions: true,
  roomInvites: true,
  system: true,
};

const LABELS: {
  key: keyof NotificationPreferences;
  title: string;
  subtitle: string;
}[] = [
  { key: "matches", title: "Matches", subtitle: "New matches and connection requests" },
  { key: "messages", title: "Messages", subtitle: "New chat messages" },
  { key: "likes", title: "Likes", subtitle: "Likes on your posts" },
  { key: "comments", title: "Comments", subtitle: "Comments and replies" },
  { key: "storyViews", title: "Story views", subtitle: "Activity on your stories" },
  { key: "confessions", title: "Confessions", subtitle: "Reveal requests and updates" },
  { key: "roomInvites", title: "Room invites", subtitle: "Invitations to join rooms" },
  { key: "system", title: "Service updates", subtitle: "Security and account notices" },
];

export default function NotificationPreferencesScreen() {
  const queryClient = useQueryClient();
  const queryKey = ["notification-preferences"];
  const { data = DEFAULTS, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const response = await notificationService.getPreferences();
      return { ...DEFAULTS, ...(response?.data || {}) } as NotificationPreferences;
    },
  });
  const update = useMutation({
    mutationFn: notificationService.updatePreferences,
    onSuccess: (response) => {
      queryClient.setQueryData(queryKey, {
        ...data,
        ...(response?.data || {}),
      });
    },
  });

  const setValue = (key: keyof NotificationPreferences, value: boolean) => {
    queryClient.setQueryData(queryKey, { ...data, [key]: value });
    update.mutate({ [key]: value });
  };

  return (
    <SettingsScreen title="Notifications" loading={isLoading}>
      <SettingsSection title="Delivery">
        <SettingsToggle
          title="Push notifications"
          subtitle="Allow alerts when Datebl is not open"
          value={data.pushEnabled}
          onChange={(value) => setValue("pushEnabled", value)}
        />
      </SettingsSection>
      <SettingsSection title="Notify me about">
        {LABELS.map((item) => (
          <SettingsToggle
            key={item.key}
            title={item.title}
            subtitle={item.subtitle}
            value={data[item.key]}
            onChange={(value) => setValue(item.key, value)}
          />
        ))}
      </SettingsSection>
    </SettingsScreen>
  );
}
