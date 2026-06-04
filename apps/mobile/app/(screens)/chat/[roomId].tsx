import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Colors } from "@/constants/colors";
import { chatService } from "@/services/chat.service";
import { useAuthStore } from "@/store/authStore";

type LocalMessage = {
  id: string;
  content: string;
  createdAt: string;
  isMine: boolean;
  isPending?: boolean;
};

const getParam = (value?: string | string[]) => {
  if (Array.isArray(value)) return value[0];
  return value;
};

export default function ChatRoomScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    roomId: string;
    userId?: string;
    name?: string;
    avatarUrl?: string;
  }>();

  const roomId = getParam(params.roomId) || "chat";
  const name = getParam(params.name) || "Chat";
  const avatarUrl = getParam(params.avatarUrl);
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState("");
  const [pendingMessages, setPendingMessages] = useState<LocalMessage[]>([]);

  const {
    data: serverMessages = [],
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["chat-messages", roomId],
    queryFn: async () => {
      const response = await chatService.getMessages(roomId);
      if (!response?.success || !Array.isArray(response.data)) return [];

      return response.data
        .map((message: any) => ({
          id: message.id,
          content: message.content || "",
          createdAt: message.createdAt,
          isMine: message.senderId === user?.id,
        }))
        .reverse() as LocalMessage[];
    },
    enabled: Boolean(roomId),
  });

  const messages = useMemo(
    () => [...serverMessages, ...pendingMessages],
    [pendingMessages, serverMessages],
  );

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) =>
      chatService.sendMessage(roomId, { content, type: "TEXT" }),
    onSuccess: () => {
      setPendingMessages([]);
      queryClient.invalidateQueries({ queryKey: ["chat-messages", roomId] });
      queryClient.invalidateQueries({ queryKey: ["chat-conversations"] });
    },
    onError: (error: any) => {
      setPendingMessages([]);
      Alert.alert(
        "Message failed",
        error?.response?.data?.message || "Unable to send your message.",
      );
    },
  });

  const subtitle = useMemo(() => {
    if (messages.length === 0) return "Start the conversation";
    return `${messages.length} message${messages.length === 1 ? "" : "s"}`;
  }, [messages.length]);

  const sendMessage = () => {
    const content = draft.trim();
    if (!content || sendMessageMutation.isPending) return;

    setPendingMessages((current) => [
      ...current,
      {
        id: `${roomId}-${Date.now()}`,
        content,
        createdAt: new Date().toISOString(),
        isMine: true,
        isPending: true,
      },
    ]);
    setDraft("");
    sendMessageMutation.mutate(content);
  };

  return (
    <SafeAreaView
      className="flex-1 bg-[#050505]"
      edges={["top", "left", "right"]}
    >
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 4 : 0}
      >
        <View className="flex-row items-center border-b border-[#1A1A1A] px-4 py-3">
          <TouchableOpacity
            className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-[#111]"
            onPress={() => router.back()}
            activeOpacity={0.82}
          >
            <Ionicons name="chevron-back" size={25} color={Colors.white} />
          </TouchableOpacity>

          {avatarUrl ? (
            <Image
              source={{ uri: avatarUrl }}
              className="h-11 w-11 rounded-full"
            />
          ) : (
            <View className="h-11 w-11 items-center justify-center rounded-full bg-[#111]">
              <Ionicons name="person" size={20} color="#888" />
            </View>
          )}

          <View className="ml-3 flex-1">
            <Text className="text-base font-bold text-white" numberOfLines={1}>
              {name}
            </Text>
            <Text
              className="mt-0.5 text-xs font-semibold text-[#888]"
              numberOfLines={1}
            >
              {subtitle}
            </Text>
          </View>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: messages.length ? "flex-end" : "center",
            padding: 18,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isFetching}
              onRefresh={refetch}
              tintColor="#FFFFFF"
            />
          }
        >
          {isLoading ? (
            <View className="items-center justify-center">
              <ActivityIndicator color="#FFFFFF" size="large" />
              <Text className="mt-3 text-sm font-semibold text-[#888]">
                Loading messages
              </Text>
            </View>
          ) : messages.length === 0 ? (
            <View className="items-center px-4">
              {avatarUrl ? (
                <Image
                  source={{ uri: avatarUrl }}
                  className="h-24 w-24 rounded-full"
                />
              ) : (
                <View className="h-24 w-24 items-center justify-center rounded-full bg-[#111]">
                  <Ionicons
                    name="chatbubble-ellipses-outline"
                    size={34}
                    color="#888"
                  />
                </View>
              )}
              <Text className="mt-5 text-center text-xl font-bold text-white">
                Chat with {name}
              </Text>
              <Text className="mt-2 text-center text-sm leading-5 text-[#888]">
                Send a message to start talking from Matches.
              </Text>
            </View>
          ) : (
            <View className="gap-2.5">
              {messages.map((message) => (
                <View
                  key={message.id}
                  className={`max-w-[82%] rounded-3xl px-4 py-3 ${
                    message.isMine
                      ? "self-end bg-white"
                      : "self-start bg-[#111]"
                  }`}
                >
                  <Text
                    className={`text-sm font-medium leading-5 ${
                      message.isMine ? "text-black" : "text-white"
                    }`}
                  >
                    {message.content}
                  </Text>
                  {message.isPending ? (
                    <Text className="mt-1 text-[10px] font-semibold text-black/45">
                      Sending...
                    </Text>
                  ) : null}
                </View>
              ))}
            </View>
          )}
        </ScrollView>

        <View
          className="flex-row items-end border-t border-[#1A1A1A] bg-[#050505] px-4 pb-3 pt-3"
          style={{ paddingBottom: Math.max(insets.bottom, 12) }}
        >
          <View className="mr-2 flex-1 rounded-3xl border border-[#222] bg-[#111] px-4 py-2.5">
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder={`Message ${name.split(" ")[0] || "them"}`}
              placeholderTextColor="#666"
              multiline
              className="max-h-28 text-[15px] font-medium text-white"
              style={{ padding: 0 }}
            />
          </View>

          <TouchableOpacity
            className={`h-11 w-11 items-center justify-center rounded-full ${
              draft.trim() ? "bg-white" : "bg-[#1A1A1A]"
            }`}
            onPress={sendMessage}
            activeOpacity={0.84}
            disabled={sendMessageMutation.isPending}
          >
            <Ionicons
              name="send"
              size={18}
              color={draft.trim() ? Colors.black : Colors.textSecondary}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
