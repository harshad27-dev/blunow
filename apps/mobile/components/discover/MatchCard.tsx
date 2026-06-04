import React from "react";
import { Image, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Match, MatchUser } from "@/types/match.types";

type MatchCardProps = {
  match: Match;
  currentUserId?: string;
  onPress?: () => void;
  onUnmatch?: () => void;
};

const getOtherUser = (match: Match, currentUserId?: string): MatchUser | undefined =>
  match.user1Id === currentUserId ? match.user2 : match.user1;

export const MatchCard = ({
  match,
  currentUserId,
  onPress,
  onUnmatch,
}: MatchCardProps) => {
  const user = getOtherUser(match, currentUserId);
  const name =
    user?.profile?.username ||
    user?.username ||
    user?.email ||
    "Blunow user";
  const avatarUrl = user?.profile?.avatarUrl;

  return (
    <TouchableOpacity
      className="flex-row items-center rounded-2xl border border-[#222] bg-[#111] p-3"
      onPress={onPress}
      activeOpacity={0.86}
    >
      {avatarUrl ? (
        <Image source={{ uri: avatarUrl }} className="h-14 w-14 rounded-2xl" />
      ) : (
        <View className="h-14 w-14 items-center justify-center rounded-2xl bg-[#1A1A1A]">
          <Text className="text-lg font-extrabold text-white">
            {name.charAt(0).toUpperCase()}
          </Text>
        </View>
      )}

      <View className="ml-3 flex-1">
        <Text className="text-base font-extrabold text-white" numberOfLines={1}>
          {name}
        </Text>
        <Text className="mt-1 text-xs font-semibold text-[#888]">
          Matched and ready to chat
        </Text>
      </View>

      {onUnmatch ? (
        <TouchableOpacity
          className="h-10 w-10 items-center justify-center rounded-full border border-[#333] bg-[#181818]"
          onPress={(event) => {
            event.stopPropagation();
            onUnmatch();
          }}
          activeOpacity={0.84}
        >
          <Ionicons name="close" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      ) : null}
    </TouchableOpacity>
  );
};
