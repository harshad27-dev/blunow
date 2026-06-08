import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { ChatMessage } from "@/types/chat.types";

type MessageBubbleProps = {
  message: ChatMessage & { isPending?: boolean };
  isMine: boolean;
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
  showAvatar = false,
}: MessageBubbleProps) => {
  const avatarUrl = message.sender?.profile?.avatarUrl;
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
            className="mr-2 mt-1 h-8 w-8 rounded-full bg-[#E4DDD7]"
          />
        ) : (
          <View className="mr-2 mt-1 h-8 w-8 items-center justify-center rounded-full bg-[#B19F91]">
            <Ionicons name="person" size={15} color="#FFFFFF" />
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
              className="mb-2 h-48 w-48 rounded-[22px] bg-[#E4DDD7]"
              resizeMode="cover"
            />
          ) : null}

          {content ? (
            <Text
              className={`text-[13px] font-normal leading-5 ${
                isMine ? "text-white" : "text-[#1C1C1C]"
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
                  isMine ? "text-white/80" : "text-[#9D8F85]"
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
                  color="rgba(255,255,255,0.8)"
                  style={{ marginLeft: 4 }}
                />
              ) : null}
            </View>
          ) : null}
        </View>

        {!isMine && message.readReceipts?.length ? (
          <View
            className="-mt-0.5 ml-4 h-7 w-9 items-center justify-center rounded-full border border-[#E4DDD7] bg-white"
            style={styles.reactionPill}
          >
            <Ionicons name="heart" size={15} color="#B19F91" />
          </View>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  incomingBubble: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E4DDD7",
    borderWidth: 1,
    shadowColor: "#1C1C1C",
    shadowOffset: { height: 8, width: 0 },
    shadowOpacity: 0.07,
    shadowRadius: 18,
    elevation: 2,
  },
  outgoingBubble: {
    backgroundColor: "#B19F91",
    shadowColor: "#6F6259",
    shadowOffset: { height: 6, width: 0 },
    shadowOpacity: 0.16,
    shadowRadius: 14,
    elevation: 3,
  },
  reactionPill: {
    shadowColor: "#1C1C1C",
    shadowOffset: { height: 5, width: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 2,
  },
});
