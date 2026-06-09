import React from "react";
import { View } from "react-native";

export const TypingIndicator = ({ visible }: { visible: boolean }) => {
  if (!visible) return null;

  return (
    <View className="flex-row items-center gap-1 self-start rounded-full border border-border bg-bg-card px-4 py-3">
      <View className="h-1.5 w-1.5 rounded-full bg-primary-light" />
      <View className="h-1.5 w-1.5 rounded-full bg-primary-light/80" />
      <View className="h-1.5 w-1.5 rounded-full bg-primary-light/60" />
    </View>
  );
};
