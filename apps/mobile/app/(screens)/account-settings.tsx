import { Alert } from "react-native";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";

import {
  SettingsRow,
  SettingsScreen,
  SettingsSection,
} from "@/components/settings/SettingsUi";
import { userService } from "@/services/user.service";
import { useAuthStore } from "@/store/authStore";

export default function AccountSettingsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const clearSession = useAuthStore((state) => state.clearSession);

  const finish = async () => {
    queryClient.clear();
    await clearSession();
    router.replace("/");
  };

  const deactivate = () => {
    Alert.alert(
      "Deactivate account?",
      "Your profile will stop appearing until account access is restored by support.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Deactivate",
          style: "destructive",
          onPress: async () => {
            await userService.deactivateAccount();
            await finish();
          },
        },
      ],
    );
  };

  const deleteAccount = () => {
    Alert.alert(
      "Delete account permanently?",
      "Your profile, posts, matches and messages will be permanently removed. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete permanently",
          style: "destructive",
          onPress: async () => {
            await userService.deleteAccount();
            await finish();
          },
        },
      ],
    );
  };

  return (
    <SettingsScreen title="Account">
      <SettingsSection title="Profile">
        <SettingsRow
          title="Personal information"
          subtitle="Update your profile and dating preferences"
          icon="person-outline"
          onPress={() => router.push("/(screens)/edit-profile")}
        />
        <SettingsRow
          title="Profile verification"
          subtitle="Verify your identity and build trust"
          icon="shield-checkmark-outline"
          onPress={() => router.push("/(screens)/verification")}
        />
      </SettingsSection>
      <SettingsSection title="Account access">
        <SettingsRow
          title="Deactivate account"
          subtitle="Temporarily hide and disable your account"
          icon="pause-circle-outline"
          destructive
          onPress={deactivate}
        />
        <SettingsRow
          title="Delete account"
          subtitle="Permanently remove your data"
          icon="trash-outline"
          destructive
          onPress={deleteAccount}
        />
      </SettingsSection>
    </SettingsScreen>
  );
}
