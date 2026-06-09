import React, { useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
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
    <View className="bg-bg px-5 pb-5 pt-3">
      <View
        className="h-14 flex-row items-center rounded-[28px] border border-border bg-bg-card px-4"
        style={styles.container}
      >
        <TouchableOpacity
          className="h-9 w-9 items-center justify-center rounded-full bg-primary-light"
          activeOpacity={0.84}
        >
          <Ionicons name="add" size={22} color={Colors.white} />
        </TouchableOpacity>

        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Type a message..."
          placeholderTextColor={Colors.textMuted}
          multiline
          editable={!disabled}
          className="mx-3 max-h-11 flex-1 text-[16px] text-text-primary"
          style={{ padding: 0 }}
        />

        <TouchableOpacity
          className="h-10 w-10 items-center justify-center rounded-full"
          activeOpacity={0.84}
        >
          <Ionicons name="happy-outline" size={22} color={Colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          className="h-10 w-10 items-center justify-center rounded-full"
          onPress={send}
          activeOpacity={0.84}
          disabled={!canSend}
        >
          {disabled ? (
            <ActivityIndicator color={Colors.primaryLight} size="small" />
          ) : (
            <Ionicons
              name={canSend ? "arrow-up-circle" : "mic-outline"}
              size={canSend ? 25 : 22}
              color={canSend ? Colors.primaryLight : Colors.textSecondary}
            />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.07,
    shadowRadius: 24,
    elevation: 5,
  },
});
