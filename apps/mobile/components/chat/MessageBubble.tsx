import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";
import type { ChatMessage } from "@/types/chat.types";

type MessageBubbleProps = {
  message: ChatMessage & { isPending?: boolean };
  isMine: boolean;
  avatarUrl?: string;
  reaction?: "heart";
  showAvatar?: boolean;
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
  showAvatar = false,
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
    <View
      className={`flex-row ${isMine ? "justify-end" : "justify-start"}`}
    >
      {!isMine && showAvatar ? (
        avatarUrl ? (
          <Image
            source={{ uri: avatarUrl }}
            className="mr-2 mt-1 h-8 w-8 rounded-full bg-bg-elevated"
          />
        ) : (
          <View className="mr-2 mt-1 h-8 w-8 items-center justify-center rounded-full bg-primary-light">
            <Ionicons name="person" size={15} color={Colors.white} />
          </View>
        )
      ) : !isMine ? (
        <View className="mr-2 h-8 w-8" />
      ) : null}

      <View className={`max-w-[75%] ${isMine ? "items-end" : "items-start"}`}>
        <View
          className="rounded-[28px] px-[14px] py-[10px]"
          style={isMine ? styles.outgoingBubble : styles.incomingBubble}
        >
          {message.mediaUrl ? (
            <Image
              source={{ uri: message.mediaUrl }}
              className="mb-2 h-48 w-48 rounded-[22px] bg-bg-elevated"
              resizeMode="cover"
            />
          ) : null}

          {content ? (
            <Text
              className={`text-[13px] font-normal leading-5 ${
                isMine ? "text-white" : "text-text-primary"
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
                  isMine ? "text-white/80" : "text-text-muted"
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
                  color={Colors.whiteAlpha80}
                  style={{ marginLeft: 4 }}
                />
              ) : null}
            </View>
          ) : null}
        </View>

        {!isMine && message.readReceipts?.length ? (
          <View
            className="-mt-0.5 ml-4 h-7 w-9 items-center justify-center rounded-full border border-border bg-bg-card"
            style={styles.reactionPill}
          >
            <Ionicons name="heart" size={15} color={Colors.primaryLight} />
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
    shadowOffset: { height: 8, width: 0 },
    shadowOpacity: 0.07,
    shadowRadius: 18,
    elevation: 2,
  },
  outgoingBubble: {
    backgroundColor: Colors.primaryLight,
    shadowColor: Colors.secondary,
    shadowOffset: { height: 6, width: 0 },
    shadowOpacity: 0.16,
    shadowRadius: 14,
    elevation: 3,
  },
  reactionPill: {
    shadowColor: Colors.black,
    shadowOffset: { height: 5, width: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 2,
  },
});
