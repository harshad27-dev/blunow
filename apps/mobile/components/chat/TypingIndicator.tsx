import React from "react";
import { Text, View } from "react-native";

export const TypingIndicator = ({ visible }: { visible: boolean }) => {
  if (!visible) return null;

  return (
    <View className="self-start rounded-3xl rounded-bl-lg bg-[#111] px-4 py-3">
      <Text className="text-sm font-semibold text-[#888]">Typing...</Text>
    </View>
  );
};
