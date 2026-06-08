import React, { useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
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
    <View className="bg-[#F8F4F0] px-5 pb-5 pt-3">
      <View
        className="h-14 flex-row items-center rounded-[28px] border border-[#E4DDD7] bg-white px-4"
        style={styles.container}
      >
        <TouchableOpacity
          className="h-9 w-9 items-center justify-center rounded-full bg-[#B19F91]"
          activeOpacity={0.84}
        >
          <Ionicons name="add" size={22} color="#FFFFFF" />
        </TouchableOpacity>

        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Type a message..."
          placeholderTextColor="#9D8F85"
          multiline
          editable={!disabled}
          className="mx-3 max-h-11 flex-1 text-[16px] text-[#1C1C1C]"
          style={{ padding: 0 }}
        />

        <TouchableOpacity
          className="h-10 w-10 items-center justify-center rounded-full"
          activeOpacity={0.84}
        >
          <Ionicons name="happy-outline" size={22} color="#48494B" />
        </TouchableOpacity>

        <TouchableOpacity
          className="h-10 w-10 items-center justify-center rounded-full"
          onPress={send}
          activeOpacity={0.84}
          disabled={!canSend}
        >
          {disabled ? (
            <ActivityIndicator color="#B19F91" size="small" />
          ) : (
            <Ionicons
              name={canSend ? "arrow-up-circle" : "mic-outline"}
              size={canSend ? 25 : 22}
              color={canSend ? "#B19F91" : "#48494B"}
            />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    shadowColor: "#1C1C1C",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.07,
    shadowRadius: 24,
    elevation: 5,
  },
});
