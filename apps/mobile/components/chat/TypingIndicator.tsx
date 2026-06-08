import React from "react";
import { View } from "react-native";

export const TypingIndicator = ({ visible }: { visible: boolean }) => {
  if (!visible) return null;

  return (
    <View className="flex-row items-center gap-1 self-start rounded-full border border-[#E4DDD7] bg-white px-4 py-3">
      <View className="h-1.5 w-1.5 rounded-full bg-[#B19F91]" />
      <View className="h-1.5 w-1.5 rounded-full bg-[#B19F91]/80" />
      <View className="h-1.5 w-1.5 rounded-full bg-[#B19F91]/60" />
    </View>
  );
};
