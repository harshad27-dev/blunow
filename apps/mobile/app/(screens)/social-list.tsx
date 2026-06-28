import { Image, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";

import {
  SettingsRow,
  SettingsScreen,
  SettingsSection,
} from "@/components/settings/SettingsUi";
import { Colors } from "@/constants/colors";
import { userService } from "@/services/user.service";

type SocialUser = {
  userId: string;
  username?: string | null;
  avatarUrl?: string | null;
};

export default function SocialListScreen() {
  const router = useRouter();
  const { userId, mode = "followers" } = useLocalSearchParams<{
    userId: string;
    mode: "followers" | "following";
  }>();
  const { data = [], isLoading } = useQuery({
    queryKey: ["social-list", userId, mode],
    queryFn: async () => {
      const response =
        mode === "followers"
          ? await userService.getFollowers(userId)
          : await userService.getFollowing(userId);
      return (response?.[mode] || []) as SocialUser[];
    },
    enabled: Boolean(userId),
  });

  return (
    <SettingsScreen
      title={mode === "followers" ? "Followers" : "Following"}
      loading={isLoading}
    >
      {data.length ? (
        <SettingsSection>
          {data.map((person) => (
            <SettingsRow
              key={person.userId}
              title={person.username || "Datebl user"}
              icon="person-outline"
              onPress={() =>
                router.push({
                  pathname: "/(screens)/user/[userId]",
                  params: { userId: person.userId },
                })
              }
              right={
                person.avatarUrl ? (
                  <Image
                    source={{ uri: person.avatarUrl }}
                    style={{ borderRadius: 21, height: 42, width: 42 }}
                  />
                ) : undefined
              }
            />
          ))}
        </SettingsSection>
      ) : (
        <View style={{ alignItems: "center", paddingTop: 80 }}>
          <Text style={{ color: Colors.textSecondary }}>
            No {mode} yet.
          </Text>
        </View>
      )}
    </SettingsScreen>
  );
}
