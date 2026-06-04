import React, { useState } from "react";
import { ActivityIndicator, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";

type ChatInputProps = {
  placeholder?: string;
  disabled?: boolean;
  onSend: (content: string) => void;
};

export const ChatInput = ({
  placeholder = "Message",
  disabled = false,
  onSend,
}: ChatInputProps) => {
  const [draft, setDraft] = useState("");
  const canSend = draft.trim().length > 0 && !disabled;

  const send = () => {
    const content = draft.trim();
    if (!content || disabled) return;
    setDraft("");
    onSend(content);
  };

  return (
    <View className="flex-row items-end border-t border-[#1A1A1A] bg-[#050505] px-4 pb-3 pt-3">
      <TouchableOpacity
        className="mr-2 h-11 w-11 items-center justify-center rounded-full border border-[#222] bg-[#111]"
        activeOpacity={0.84}
      >
        <Ionicons name="add" size={22} color={Colors.textPrimary} />
      </TouchableOpacity>

      <View className="mr-2 flex-1 rounded-3xl border border-[#222] bg-[#111] px-4 py-2.5">
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder={placeholder}
          placeholderTextColor="#666"
          multiline
          editable={!disabled}
          className="max-h-28 text-[15px] font-medium text-white"
          style={{ padding: 0 }}
        />
      </View>

      <TouchableOpacity
        className={`h-11 w-11 items-center justify-center rounded-full ${
          canSend ? "bg-white" : "bg-[#1A1A1A]"
        }`}
        onPress={send}
        activeOpacity={0.84}
        disabled={!canSend}
      >
        {disabled ? (
          <ActivityIndicator color={Colors.textSecondary} size="small" />
        ) : (
          <Ionicons
            name="send"
            size={18}
            color={canSend ? Colors.black : Colors.textSecondary}
          />
        )}
      </TouchableOpacity>
    </View>
  );
};
