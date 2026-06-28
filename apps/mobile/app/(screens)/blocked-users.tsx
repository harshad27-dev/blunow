import { Alert, Image, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  SettingsRow,
  SettingsScreen,
  SettingsSection,
} from "@/components/settings/SettingsUi";
import { Colors } from "@/constants/colors";
import { userService, type BlockedUser } from "@/services/user.service";

export default function BlockedUsersScreen() {
  const queryClient = useQueryClient();
  const queryKey = ["blocked-users"];
  const { data = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const response = await userService.getBlockedUsers();
      return (response?.data || []) as BlockedUser[];
    },
  });
  const unblock = useMutation({
    mutationFn: userService.unblockUser,
    onSuccess: (_response, userId) => {
      queryClient.setQueryData(
        queryKey,
        data.filter((user) => user.id !== userId),
      );
    },
  });

  const confirmUnblock = (user: BlockedUser) => {
    Alert.alert("Unblock user?", user.username + " will be able to find you again.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Unblock",
        onPress: () => unblock.mutate(user.id),
      },
    ]);
  };

  return (
    <SettingsScreen title="Blocked users" loading={isLoading}>
      {data.length ? (
        <SettingsSection>
          {data.map((user) => (
            <SettingsRow
              key={user.id}
              title={user.username}
              subtitle="Blocked account"
              icon="person-remove-outline"
              onPress={() => confirmUnblock(user)}
              right={
                user.avatarUrl ? (
                  <Image
                    source={{ uri: user.avatarUrl }}
                    style={{ height: 42, width: 42, borderRadius: 21 }}
                  />
                ) : undefined
              }
            />
          ))}
        </SettingsSection>
      ) : (
        <View style={{ alignItems: "center", paddingTop: 80 }}>
          <Text style={{ color: Colors.textPrimary, fontSize: 18, fontWeight: "700" }}>
            No blocked users
          </Text>
          <Text style={{ color: Colors.textSecondary, marginTop: 8 }}>
            Accounts you block will appear here.
          </Text>
        </View>
      )}
    </SettingsScreen>
  );
}
