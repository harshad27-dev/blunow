import React from "react";
import { Image, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";
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
    "Datebl user";
  const avatarUrl = sender?.profile?.avatarUrl;

  return (
    <View className="flex-row items-center rounded-2xl border border-border bg-bg-card p-3">
      {avatarUrl ? (
        <Image source={{ uri: avatarUrl }} className="h-14 w-14 rounded-2xl" />
      ) : (
        <View className="h-14 w-14 items-center justify-center rounded-2xl bg-bg-elevated">
          <Text className="text-lg font-extrabold text-text-primary">
            {name.charAt(0).toUpperCase()}
          </Text>
        </View>
      )}

      <View className="ml-3 flex-1">
        <Text className="text-base font-extrabold text-text-primary" numberOfLines={1}>
          {name}
        </Text>
        <Text className="mt-1 text-xs font-semibold text-text-secondary" numberOfLines={2}>
          {request.message || "Wants to connect with you."}
        </Text>
      </View>

      <TouchableOpacity
        className="mr-2 h-10 w-10 items-center justify-center rounded-full bg-bg-card"
        onPress={onAccept}
        disabled={disabled}
        activeOpacity={0.84}
      >
        <Ionicons name="checkmark" size={20} color={Colors.black} />
      </TouchableOpacity>
      <TouchableOpacity
        className="h-10 w-10 items-center justify-center rounded-full border border-border bg-bg-elevated"
        onPress={onReject}
        disabled={disabled}
        activeOpacity={0.84}
      >
        <Ionicons name="close" size={20} color={Colors.textPrimary} />
      </TouchableOpacity>
    </View>
  );
};
