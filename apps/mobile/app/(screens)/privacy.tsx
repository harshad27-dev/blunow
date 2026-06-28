import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";

import {
  SettingsRow,
  SettingsScreen,
  SettingsSection,
  SettingsToggle,
} from "@/components/settings/SettingsUi";
import { userService, type PrivacySettings } from "@/services/user.service";

const DEFAULTS: PrivacySettings = {
  isPrivate: false,
  discoverable: true,
  showOnlineStatus: true,
  readReceipts: true,
};

export default function PrivacyScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const queryKey = ["privacy-settings"];
  const { data = DEFAULTS, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const response = await userService.getPrivacy();
      return { ...DEFAULTS, ...(response?.data || {}) } as PrivacySettings;
    },
  });
  const update = useMutation({
    mutationFn: userService.updatePrivacy,
    onSuccess: (response) => {
      queryClient.setQueryData(queryKey, {
        ...data,
        ...(response?.data || {}),
      });
    },
  });

  const setValue = (key: keyof PrivacySettings, value: boolean) => {
    queryClient.setQueryData(queryKey, { ...data, [key]: value });
    update.mutate({ [key]: value });
  };

  return (
    <SettingsScreen title="Privacy & safety" loading={isLoading}>
      <SettingsSection title="Profile visibility">
        <SettingsToggle
          title="Private profile"
          subtitle="Only people you approve can see private profile content"
          value={data.isPrivate}
          onChange={(value) => setValue("isPrivate", value)}
        />
        <SettingsToggle
          title="Appear in discovery"
          subtitle="Allow your profile to be recommended to others"
          value={data.discoverable}
          onChange={(value) => setValue("discoverable", value)}
        />
      </SettingsSection>
      <SettingsSection title="Activity">
        <SettingsToggle
          title="Show online status"
          subtitle="Let matches see when you are active"
          value={data.showOnlineStatus}
          onChange={(value) => setValue("showOnlineStatus", value)}
        />
        <SettingsToggle
          title="Read receipts"
          subtitle="Let matches know when you have read a message"
          value={data.readReceipts}
          onChange={(value) => setValue("readReceipts", value)}
        />
      </SettingsSection>
      <SettingsSection title="Safety">
        <SettingsRow
          title="Blocked users"
          subtitle="Review and unblock accounts"
          icon="ban-outline"
          onPress={() => router.push("/(screens)/blocked-users")}
        />
      </SettingsSection>
    </SettingsScreen>
  );
}
