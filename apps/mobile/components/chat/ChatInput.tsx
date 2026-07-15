import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";

export type ChatInputHandle = {
  focus: () => void;
  blur: () => void;
  setDraft: (value: string) => void;
};

type ReplyPreview = {
  title: string;
  body: string;
  onClear: () => void;
};

type ChatInputProps = {
  placeholder?: string;
  disabled?: boolean;
  onSend: (content: string) => void;
  onPickImage?: () => void;
  onTypingChange?: (isTyping: boolean) => void;
  onVoicePress?: () => void;
  replyPreview?: ReplyPreview | null;
};

export const ChatInput = forwardRef<ChatInputHandle, ChatInputProps>(
  (
    {
      placeholder = "Message",
      disabled = false,
      onSend,
      onPickImage,
      onTypingChange,
      onVoicePress,
      replyPreview,
    },
    ref,
  ) => {
    const [draft, setDraft] = useState("");
    const inputRef = useRef<TextInput>(null);
    const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const canSend = draft.trim().length > 0 && !disabled;

    useImperativeHandle(ref, () => ({
      focus: () => inputRef.current?.focus(),
      blur: () => inputRef.current?.blur(),
      setDraft: (value: string) => {
        setDraft(value);
        onTypingChange?.(value.trim().length > 0);
        requestAnimationFrame(() => inputRef.current?.focus());
      },
    }));

    useEffect(() => {
      return () => {
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        onTypingChange?.(false);
      };
    }, [onTypingChange]);

    const updateDraft = (value: string) => {
      setDraft(value);

      if (!onTypingChange || disabled) return;
      onTypingChange(value.trim().length > 0);

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        onTypingChange(false);
      }, 1200);
    };

    const send = () => {
      const content = draft.trim();
      if (!content || disabled) return;
      setDraft("");
      onTypingChange?.(false);
      onSend(content);
    };

    const addEmoji = () => {
      updateDraft(`${draft}\uD83D\uDE42`);
      requestAnimationFrame(() => inputRef.current?.focus());
    };

    const handleVoicePress = () => {
      if (onVoicePress) {
        onVoicePress();
        return;
      }
      Alert.alert("Voice messages", "Voice messages are not available yet.");
    };

    return (
      <View className="bg-bg px-5 pb-5 pt-3" style={styles.shell}>
        <View
          className="overflow-hidden rounded-[28px] border border-border bg-bg-card"
          style={styles.container}
        >
          {replyPreview ? (
            <View className="px-3.5 pb-1.5 pt-3">
              <View className="flex-row items-center rounded-[20px] bg-bg-elevated px-3 py-2.5">
                <View className="mr-2.5 h-9 w-1 rounded-full bg-primary-light" />
                <View className="min-w-0 flex-1">
                  <Text
                    className="text-xs font-extrabold text-primary"
                    numberOfLines={1}
                  >
                    {replyPreview.title}
                  </Text>
                  <Text
                    className="mt-0.5 text-[12px] font-semibold leading-4 text-text-secondary"
                    numberOfLines={1}
                  >
                    {replyPreview.body}
                  </Text>
                </View>
                <TouchableOpacity
                  className="ml-2 h-8 w-8 items-center justify-center rounded-full bg-bg-card"
                  onPress={replyPreview.onClear}
                  activeOpacity={0.82}
                  accessibilityRole="button"
                  accessibilityLabel="Cancel reply"
                >
                  <Ionicons
                    name="close"
                    size={16}
                    color={Colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>
            </View>
          ) : null}

          <View className="min-h-14 flex-row items-center px-4 py-2">
            <TouchableOpacity
              className="h-9 w-9 items-center justify-center rounded-full bg-primary-light"
              onPress={onPickImage}
              disabled={disabled || !onPickImage}
              activeOpacity={0.84}
            >
              <Ionicons name="add" size={22} color={Colors.white} />
            </TouchableOpacity>

            <TextInput
              ref={inputRef}
              value={draft}
              onChangeText={updateDraft}
              placeholder={placeholder}
              placeholderTextColor={Colors.textMuted}
              underlineColorAndroid="transparent"
              cursorColor={Colors.primaryLight}
              selectionColor={Colors.primaryLight}
              multiline
              editable={!disabled}
              className="mx-3 max-h-20 min-h-10 flex-1 text-[16px] text-text-primary"
              style={styles.input}
            />

            <TouchableOpacity
              className="h-10 w-10 items-center justify-center rounded-full"
              onPress={addEmoji}
              disabled={disabled}
              activeOpacity={0.84}
            >
              <Ionicons
                name="happy-outline"
                size={22}
                color={Colors.textSecondary}
              />
            </TouchableOpacity>

            <TouchableOpacity
              className="h-10 w-10 items-center justify-center rounded-full"
              onPress={canSend ? send : handleVoicePress}
              activeOpacity={0.84}
              disabled={disabled && !canSend}
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
      </View>
    );
  },
);

ChatInput.displayName = "ChatInput";

const styles = StyleSheet.create({
  shell: {
    backgroundColor: Colors.bg,
  },
  input: {
    backgroundColor: Colors.transparent,
    padding: 0,
    textAlignVertical: "center",
  },
  container: {
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.07,
    shadowRadius: 24,
    elevation: 5,
  },
});
