import React from "react";
import { Image, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { MatchRequest } from "@/types/match.types";

type MatchRequestCardProps = {
  request: MatchRequest;
  onAccept?: () => void;
  onReject?: () => void;
  disabled?: boolean;
};

export const MatchRequestCard = ({
  request,
  onAccept,
  onReject,
  disabled = false,
}: MatchRequestCardProps) => {
  const sender = request.sender;
  const name =
    sender?.profile?.username ||
    sender?.username ||
    sender?.email ||
    "Blunow user";
  const avatarUrl = sender?.profile?.avatarUrl;

  return (
    <View className="flex-row items-center rounded-2xl border border-[#222] bg-[#111] p-3">
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
        <Text className="mt-1 text-xs font-semibold text-[#888]" numberOfLines={2}>
          {request.message || "Wants to connect with you."}
        </Text>
      </View>

      <TouchableOpacity
        className="mr-2 h-10 w-10 items-center justify-center rounded-full bg-white"
        onPress={onAccept}
        disabled={disabled}
        activeOpacity={0.84}
      >
        <Ionicons name="checkmark" size={20} color="#050505" />
      </TouchableOpacity>
      <TouchableOpacity
        className="h-10 w-10 items-center justify-center rounded-full border border-[#333] bg-[#181818]"
        onPress={onReject}
        disabled={disabled}
        activeOpacity={0.84}
      >
        <Ionicons name="close" size={20} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
};
