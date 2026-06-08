import React, { useState } from "react";
import {
  ActivityIndicator,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

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
    <View className="flex-row items-end border-t border-white/10 bg-[#1B110A]/90 px-5 pb-5 pt-3">
      <TouchableOpacity
        className="mr-3 h-12 w-12 items-center justify-center rounded-full bg-[#281D15]"
        activeOpacity={0.84}
      >
        <Ionicons name="add" size={23} color="#FFB77F" />
      </TouchableOpacity>

      <View className="mr-3 min-h-12 flex-1 justify-center rounded-full bg-[#33281F] px-5 py-3">
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder={placeholder}
          placeholderTextColor="#A58C7B"
          multiline
          editable={!disabled}
          className="max-h-28 text-[15px] font-medium text-[#F3DFD1]"
          style={{ padding: 0 }}
        />
      </View>

      <TouchableOpacity
        className={`h-12 w-12 items-center justify-center rounded-full ${
          canSend ? "bg-[#FF8A00]" : "bg-[#3F3229]"
        }`}
        onPress={send}
        activeOpacity={0.84}
        disabled={!canSend}
      >
        {disabled ? (
          <ActivityIndicator color="#DDC1AE" size="small" />
        ) : (
          <Ionicons
            name="arrow-up"
            size={21}
            color={canSend ? "#2F1500" : "#A58C7B"}
          />
        )}
      </TouchableOpacity>
    </View>
  );
};
