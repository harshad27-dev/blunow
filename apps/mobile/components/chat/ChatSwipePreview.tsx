import { Image, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Colors } from "@/constants/colors";
import { useChatConversationsQuery } from "@/hooks/useChat";
import type { ChatParticipant } from "@/types/chat.types";

const getParticipantName = (participant?: ChatParticipant) =>
  participant?.profile?.username || participant?.username || "Datebl user";

const getInitials = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "BN";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
};

export type ChatSwipePreviewTarget = {
  roomId: string;
  name: string;
  avatarUrl?: string;
};

export default function ChatSwipePreview({
  currentUserId,
  onOpenChat,
}: {
  currentUserId?: string;
  onOpenChat?: (target: ChatSwipePreviewTarget) => void;
}) {
  const { data: conversations = [] } = useChatConversationsQuery(false);
  const activeConversations = conversations
    .filter((chat) => chat.status !== "REQUESTED")
    .slice(0, 5);

  return (
    <View className="flex-1 justify-center bg-bg px-4">
      <View className="w-[20%] items-center">
        <View className="mb-5 h-10 w-10 items-center justify-center rounded-full bg-bg-elevated">
          <Ionicons name="chatbubbles" size={19} color={Colors.primaryLight} />
        </View>

        {activeConversations.length === 0 ? (
          <View className="h-14 w-14 items-center justify-center rounded-full border border-border bg-bg-card">
            <Ionicons
              name="person-outline"
              size={22}
              color={Colors.textSecondary}
            />
          </View>
        ) : (
          activeConversations.map((chat, index) => {
            const participant =
              chat.user1Id === currentUserId ? chat.user2 : chat.user1;
            const name = getParticipantName(participant);
            const avatarUrl = participant?.profile?.avatarUrl || undefined;

            return (
              <TouchableOpacity
                key={chat.id}
                activeOpacity={0.78}
                onPress={() =>
                  onOpenChat?.({ roomId: chat.id, name, avatarUrl })
                }
                className="mb-3 h-14 w-14 items-center justify-center rounded-full border-2 border-bg-card bg-bg-elevated"
                style={{ marginTop: index === 0 ? 0 : -4 }}
              >
                {avatarUrl ? (
                  <Image
                    source={{ uri: avatarUrl }}
                    className="h-full w-full rounded-full"
                  />
                ) : (
                  <Text className="text-sm font-extrabold text-primary">
                    {getInitials(name)}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })
        )}
      </View>
    </View>
  );
}
