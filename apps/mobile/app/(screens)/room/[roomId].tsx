import { Text, TouchableOpacity, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  InfoParagraph,
  SettingsScreen,
  SettingsSection,
} from "@/components/settings/SettingsUi";
import { Colors } from "@/constants/colors";
import { Radius, Spacing } from "@/constants/spacing";
import { roomService } from "@/services/room.service";
import { showToast } from "@/utils/toast";

export default function RoomDetailScreen() {
  const { roomId } = useLocalSearchParams<{ roomId: string }>();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["room", roomId],
    queryFn: async () => {
      const [roomResponse, memberResponse] = await Promise.all([
        roomService.getRoom(roomId),
        roomService.getMembers(roomId),
      ]);
      return {
        room: roomResponse?.data,
        members: memberResponse?.data || [],
      };
    },
    enabled: Boolean(roomId),
  });
  const join = useMutation({
    mutationFn: () => roomService.joinRoom(roomId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["room", roomId] });
      showToast("You are now a member of this room.", "Joined room");
    },
  });

  return (
    <SettingsScreen title={data?.room?.name || "Room"} loading={isLoading}>
      <InfoParagraph title="About">
        {data?.room?.description || "A space to meet and talk with the community."}
      </InfoParagraph>
      <SettingsSection title="Room details">
        <View style={{ padding: Spacing.md }}>
          <Text style={{ color: Colors.textPrimary }}>
            {data?.members?.length || 0} members · {data?.room?.type || "PUBLIC"}
          </Text>
        </View>
      </SettingsSection>
      <TouchableOpacity
        style={{
          alignItems: "center",
          backgroundColor: Colors.primary,
          borderRadius: Radius.full,
          minHeight: 52,
          justifyContent: "center",
        }}
        disabled={join.isPending}
        onPress={() => join.mutate()}
      >
        <Text style={{ color: Colors.textInverse, fontWeight: "700" }}>
          {join.isPending ? "Joining..." : "Join room"}
        </Text>
      </TouchableOpacity>
    </SettingsScreen>
  );
}
