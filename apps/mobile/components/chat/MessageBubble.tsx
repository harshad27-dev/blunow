import React from "react";
import { Image, Text, View } from "react-native";
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
  const content =
    message.content ||
    (message.mediaUrl ? "Shared media" : message.isDeleted ? "Message deleted" : "");

  return (
    <View
      className={`flex-row items-end ${isMine ? "justify-end" : "justify-start"}`}
    >
      {!isMine && showAvatar ? (
        avatarUrl ? (
          <Image source={{ uri: avatarUrl }} className="mr-2 h-7 w-7 rounded-full" />
        ) : (
          <View className="mr-2 h-7 w-7 items-center justify-center rounded-full bg-[#181818]">
            <Ionicons name="person" size={14} color="#888" />
          </View>
        )
      ) : !isMine ? (
        <View className="mr-2 h-7 w-7" />
      ) : null}

      <View
        className={`max-w-[82%] rounded-3xl px-4 py-3 ${
          isMine ? "rounded-br-lg bg-white" : "rounded-bl-lg bg-[#111]"
        }`}
      >
        {message.mediaUrl ? (
          <Image
            source={{ uri: message.mediaUrl }}
            className="mb-2 h-48 w-48 rounded-2xl bg-[#222]"
            resizeMode="cover"
          />
        ) : null}

        {content ? (
          <Text
            className={`text-sm font-medium leading-5 ${
              isMine ? "text-black" : "text-white"
            }`}
          >
            {content}
          </Text>
        ) : null}

        <View className="mt-1 flex-row items-center justify-end">
          <Text
            className={`text-[10px] font-semibold ${
              isMine ? "text-black/45" : "text-white/35"
            }`}
          >
            {message.isPending ? "Sending..." : formatTime(message.createdAt)}
          </Text>
          {isMine && !message.isPending ? (
            <Ionicons
              name={message.readReceipts?.length ? "checkmark-done" : "checkmark"}
              size={13}
              color="rgba(0,0,0,0.45)"
              style={{ marginLeft: 4 }}
            />
          ) : null}
        </View>
      </View>
    </View>
  );
};
