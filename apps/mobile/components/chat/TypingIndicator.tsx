import React from "react";
import { View } from "react-native";

export const TypingIndicator = ({ visible }: { visible: boolean }) => {
  if (!visible) return null;

  return (
    <View className="flex-row items-center gap-1 self-start rounded-full border border-white/10 bg-[#281D15]/80 px-4 py-3">
      <View className="h-1.5 w-1.5 rounded-full bg-[#FFB77F]" />
      <View className="h-1.5 w-1.5 rounded-full bg-[#FFB77F]/80" />
      <View className="h-1.5 w-1.5 rounded-full bg-[#FFB77F]/60" />
    </View>
  );
};
