import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
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
    (message.mediaUrl
      ? "Shared media"
      : message.isDeleted
        ? "Message deleted"
        : "");

  return (
    <View
      className={`flex-row items-end ${isMine ? "justify-end" : "justify-start"}`}
    >
      {!isMine && showAvatar ? (
        avatarUrl ? (
          <Image
            source={{ uri: avatarUrl }}
            className="mr-2 h-7 w-7 rounded-full"
          />
        ) : (
          <View className="mr-2 h-7 w-7 items-center justify-center rounded-full bg-[#181818]">
            <Ionicons name="person" size={14} color="#888" />
          </View>
        )
      ) : !isMine ? (
        <View className="mr-2 h-7 w-7" />
      ) : null}

      <View className="max-w-[82%]">
        <View
          className={`overflow-hidden rounded-[26px] ${
            isMine ? "rounded-br-lg" : "rounded-bl-lg"
          }`}
          style={isMine ? styles.userBubbleShadow : styles.glassBubble}
        >
          {isMine ? (
            <LinearGradient
              colors={["#FF8A00", "#FFB3B2"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFillObject}
            />
          ) : null}

          <View className="px-4 py-3">
            {message.mediaUrl ? (
              <Image
                source={{ uri: message.mediaUrl }}
                className="mb-2 h-48 w-48 rounded-2xl bg-[#3F3229]"
                resizeMode="cover"
              />
            ) : null}

            {content ? (
              <Text
                className={`text-sm font-medium leading-5 ${
                  isMine ? "text-[#2F1500]" : "text-[#F3DFD1]"
                }`}
              >
                {content}
              </Text>
            ) : null}

            <View className="mt-1 flex-row items-center justify-end">
              <Text
                className={`text-[10px] font-semibold ${
                  isMine ? "text-[#2F1500]/55" : "text-[#DDC1AE]/60"
                }`}
              >
                {message.isPending
                  ? "Sending..."
                  : formatTime(message.createdAt)}
              </Text>
              {isMine && !message.isPending ? (
                <Ionicons
                  name={
                    message.readReceipts?.length
                      ? "checkmark-done"
                      : "checkmark"
                  }
                  size={13}
                  color="rgba(47,21,0,0.55)"
                  style={{ marginLeft: 4 }}
                />
              ) : null}
            </View>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  glassBubble: {
    backgroundColor: "rgba(40,29,21,0.72)",
    borderColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
  },
  userBubbleShadow: {
    shadowColor: "#FF8A00",
    shadowOffset: { height: 4, width: 0 },
    shadowOpacity: 0.22,
    shadowRadius: 15,
  },
});
