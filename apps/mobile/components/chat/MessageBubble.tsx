import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";
import type { ChatMessage } from "@/types/chat.types";

export type MessageReplyPreview = {
  title: string;
  body: string;
};

type MessageBubbleProps = {
  message: ChatMessage & { isPending?: boolean };
  isMine: boolean;
  avatarUrl?: string;
  reaction?: string;
  replyPreview?: MessageReplyPreview | null;
  showAvatar?: boolean;
  onLongPress?: () => void;
};

const formatTime = (value?: string) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
};

export const MessageBubble = ({
  message,
  isMine,
  avatarUrl: fallbackAvatarUrl,
  reaction,
  replyPreview,
  showAvatar = false,
  onLongPress,
}: MessageBubbleProps) => {
  const avatarUrl = message.sender?.profile?.avatarUrl || fallbackAvatarUrl;
  const timeLabel = message.isPending
    ? "Sending..."
    : formatTime(message.createdAt);
  const content =
    message.content ||
    (message.mediaUrl
      ? "Shared media"
      : message.isDeleted
        ? "Message deleted"
        : "");

  return (
    <View className={`flex-row ${isMine ? "justify-end" : "justify-start"}`}>
      {!isMine && showAvatar ? (
        avatarUrl ? (
          <Image
            source={{ uri: avatarUrl }}
            className="mr-2 mt-1 h-7 w-7 rounded-full bg-bg-elevated"
          />
        ) : (
          <View className="mr-2 mt-1 h-7 w-7 items-center justify-center rounded-full bg-primary-light">
            <Ionicons name="person" size={14} color={Colors.textInverse} />
          </View>
        )
      ) : !isMine ? (
        <View className="mr-2 h-7 w-7" />
      ) : null}

      <View className={`max-w-[78%] ${isMine ? "items-end" : "items-start"}`}>
        <Pressable
          onLongPress={onLongPress}
          delayLongPress={260}
          disabled={!onLongPress}
          className={`rounded-[22px] px-3.5 py-2.5 ${
            isMine ? "rounded-br-md" : "rounded-bl-md"
          }`}
          style={isMine ? styles.outgoingBubble : styles.incomingBubble}
        >
          {replyPreview ? (
            <View
              className={`mb-2.5 flex-row items-center rounded-[16px] px-3 py-2 ${
                isMine ? "bg-white/15" : "bg-bg-elevated"
              }`}
              style={
                isMine
                  ? styles.outgoingReplyPreview
                  : styles.incomingReplyPreview
              }
            >
              <View
                className={`mr-2 h-8 w-1 rounded-full ${
                  isMine ? "bg-white/80" : "bg-primary-light"
                }`}
              />
              <View className="min-w-0 flex-1">
                <Text
                  className={`text-[11px] font-extrabold ${
                    isMine ? "text-inverse" : "text-primary"
                  }`}
                  numberOfLines={1}
                >
                  {replyPreview.title}
                </Text>
                <Text
                  className={`mt-0.5 text-[12px] font-semibold leading-4 ${
                    isMine ? "text-inverse/80" : "text-text-secondary"
                  }`}
                  numberOfLines={2}
                >
                  {replyPreview.body}
                </Text>
              </View>
            </View>
          ) : null}

          {message.mediaUrl ? (
            <Image
              source={{ uri: message.mediaUrl }}
              className="mb-2 h-44 w-44 rounded-[18px] bg-bg-elevated"
              resizeMode="cover"
            />
          ) : null}

          {content ? (
            <Text
              className={`text-[14px] font-normal leading-5 ${
                isMine ? "text-inverse" : "text-text-primary"
              }`}
            >
              {content}
            </Text>
          ) : null}

          {timeLabel ? (
            <View
              className={`mt-1 flex-row items-center ${
                isMine ? "justify-end" : "justify-start"
              }`}
            >
              <Text
                className={`text-[10px] font-semibold ${
                  isMine ? "text-inverse/70" : "text-text-muted"
                }`}
              >
                {timeLabel}
              </Text>
              {isMine && !message.isPending ? (
                <Ionicons
                  name={
                    message.readReceipts?.length
                      ? "checkmark-done"
                      : "checkmark"
                  }
                  size={12}
                  color={Colors.textInverse}
                  style={{ marginLeft: 4, opacity: 0.72 }}
                />
              ) : null}
            </View>
          ) : null}
        </Pressable>

        {reaction ? (
          <View
            className="-mt-0.5 ml-4 h-7 w-9 items-center justify-center rounded-full border border-border bg-bg-card"
            style={styles.reactionPill}
          >
            <Text className="text-[15px]">{reaction}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  incomingBubble: {
    backgroundColor: Colors.bgCard,
    borderColor: Colors.border,
    borderWidth: 1,
    shadowColor: Colors.black,
    shadowOffset: { height: 5, width: 0 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  outgoingBubble: {
    backgroundColor: Colors.primary,
    shadowColor: Colors.black,
    shadowOffset: { height: 5, width: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  incomingReplyPreview: {
    borderColor: Colors.border,
    borderWidth: 1,
  },
  outgoingReplyPreview: {
    borderColor: "rgba(255,255,255,0.18)",
    borderWidth: 1,
  },
  reactionPill: {
    shadowColor: Colors.black,
    shadowOffset: { height: 5, width: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 2,
  },
});
