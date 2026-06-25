import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { Colors } from "@/constants/colors";
import { postService } from "@/services/post.service";

type CommentItem = {
  id: string;
  postId: string;
  parentId?: string | null;
  content: string;
  createdAt: string;
  author?: {
    username?: string;
    profile?: {
      username?: string;
      avatarUrl?: string;
    };
  };
  isOwn?: boolean;
  isLiked?: boolean;
  likesCount?: number;
  replies?: CommentItem[];
};

type CommentsDrawerProps = {
  visible: boolean;
  postId: string | null;
  onClose: () => void;
};

const { height } = Dimensions.get("window");
const DRAWER_HEIGHT = Math.round(height * 0.58);

const getTimeAgo = (dateString?: string) => {
  if (!dateString) return "now";

  const seconds = Math.max(
    0,
    Math.floor((Date.now() - new Date(dateString).getTime()) / 1000),
  );
  if (seconds < 60) return "now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
};

const getAuthorName = (comment: CommentItem) =>
  comment.author?.profile?.username || comment.author?.username || "user";

const getAvatarUrl = (comment: CommentItem) =>
  comment.author?.profile?.avatarUrl ||
  `https://i.pravatar.cc/160?u=${getAuthorName(comment)}`;

export default function CommentsDrawer({
  visible,
  postId,
  onClose,
}: CommentsDrawerProps) {
  const queryClient = useQueryClient();
  const translateY = useSharedValue(DRAWER_HEIGHT);
  const backdropOpacity = useSharedValue(0);
  const [mounted, setMounted] = useState(visible);
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<CommentItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const queryKey = useMemo(() => ["comments", postId], [postId]);

  const {
    data: commentsResponse,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey,
    queryFn: () => postService.getComments(postId as string),
    enabled: Boolean(postId && visible),
  });

  const comments: CommentItem[] = commentsResponse?.success
    ? commentsResponse.data || []
    : [];

  const finishClose = useCallback(() => {
    setMounted(false);
    setText("");
    setReplyTo(null);
  }, []);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value * 0.42,
  }));

  const drawerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  useEffect(() => {
    if (visible) {
      setMounted(true);
      translateY.value = DRAWER_HEIGHT;
      backdropOpacity.value = 0;
      backdropOpacity.value = withTiming(1, { duration: 180 });
      translateY.value = withTiming(0, {
        duration: 280,
        easing: Easing.out(Easing.cubic),
      });
      return;
    }

    backdropOpacity.value = withTiming(0, { duration: 160 });
    translateY.value = withTiming(
      DRAWER_HEIGHT,
      {
        duration: 210,
        easing: Easing.in(Easing.cubic),
      },
      (finished) => {
        if (finished) runOnJS(finishClose)();
      },
    );
  }, [backdropOpacity, finishClose, translateY, visible]);

  const updateFeedCommentCount = (delta: number) => {
    queryClient.setQueryData(["feed"], (current: any) => {
      if (!current) return current;

      const updatePost = (post: any) =>
        post.postId === postId || post.id === postId
          ? {
              ...post,
              commentsCount: Math.max(0, (post.commentsCount || 0) + delta),
            }
          : post;

      if (Array.isArray(current)) return current.map(updatePost);

      return {
        ...current,
        pages: current.pages.map((page: any) => ({
          ...page,
          feed: page.feed.map(updatePost),
        })),
      };
    });
  };

  const updateCommentLike = (commentId: string, isLiked?: boolean) => {
    queryClient.setQueryData(queryKey, (current: any) => {
      if (!current?.success) return current;

      const updateOne = (comment: CommentItem): CommentItem =>
        comment.id === commentId
          ? {
              ...comment,
              isLiked: !isLiked,
              likesCount: Math.max(
                0,
                (comment.likesCount || 0) + (isLiked ? -1 : 1),
              ),
            }
          : {
              ...comment,
              replies: comment.replies?.map(updateOne) || [],
            };

      return { ...current, data: current.data.map(updateOne) };
    });
  };

  const handleSubmit = async () => {
    if (!postId || !text.trim()) return;

    try {
      setIsSubmitting(true);
      await postService.addComment(postId, text.trim(), replyTo?.id);
      setText("");
      setReplyTo(null);
      updateFeedCommentCount(1);
      await queryClient.invalidateQueries({ queryKey });
      await queryClient.invalidateQueries({ queryKey: ["post", postId] });
    } catch (error: any) {
      Alert.alert(
        "Comment failed",
        error?.response?.data?.message || "Unable to post your comment.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (comment: CommentItem) => {
    if (!postId) return;

    Alert.alert("Delete comment?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await postService.deleteComment(postId, comment.id);
            updateFeedCommentCount(-1 - (comment.replies?.length || 0));
            await queryClient.invalidateQueries({ queryKey });
            await queryClient.invalidateQueries({ queryKey: ["post", postId] });
          } catch (error: any) {
            Alert.alert(
              "Delete failed",
              error?.response?.data?.message || "Unable to delete comment.",
            );
          }
        },
      },
    ]);
  };

  const handleLike = async (comment: CommentItem) => {
    if (!postId) return;

    const previous = queryClient.getQueryData(queryKey);
    updateCommentLike(comment.id, comment.isLiked);

    try {
      if (comment.isLiked) {
        await postService.unlikeComment(postId, comment.id);
      } else {
        await postService.likeComment(postId, comment.id);
      }
    } catch (error: any) {
      queryClient.setQueryData(queryKey, previous);
      Alert.alert(
        "Like failed",
        error?.response?.data?.message || "Unable to update this comment.",
      );
    }
  };

  const renderComment = (comment: CommentItem, isReply = false) => (
    <View className={isReply ? "ml-10 mt-3" : "px-4 py-3"}>
      <View className="flex-row">
        <Image
          source={{ uri: getAvatarUrl(comment) }}
          className="h-9 w-9 rounded-full bg-bg-elevated"
        />
        <View className="ml-3 min-w-0 flex-1">
          <View className="rounded-[18px] bg-bg-elevated px-4 py-3">
            <View className="flex-row items-center">
              <Text
                className="flex-1 text-sm font-extrabold text-text-primary"
                numberOfLines={1}
              >
                {getAuthorName(comment)}
              </Text>
              <Text className="ml-2 text-xs font-semibold text-text-muted">
                {getTimeAgo(comment.createdAt)}
              </Text>
            </View>
            <Text className="mt-1.5 text-[15px] leading-5 text-text-secondary">
              {comment.content}
            </Text>
          </View>

          <View className="mt-2 flex-row items-center">
            <TouchableOpacity
              className="mr-4 flex-row items-center"
              onPress={() => handleLike(comment)}
              activeOpacity={0.75}
            >
              <Ionicons
                name={comment.isLiked ? "heart" : "heart-outline"}
                size={16}
                color={comment.isLiked ? Colors.primary : Colors.textMuted}
              />
              <Text className="ml-1 text-xs font-bold text-text-muted">
                {comment.likesCount || 0}
              </Text>
            </TouchableOpacity>

            {!isReply ? (
              <TouchableOpacity
                className="mr-4"
                onPress={() => setReplyTo(comment)}
                activeOpacity={0.75}
              >
                <Text className="text-xs font-extrabold text-text-muted">
                  Reply
                </Text>
              </TouchableOpacity>
            ) : null}

            {comment.isOwn ? (
              <TouchableOpacity onPress={() => handleDelete(comment)}>
                <Text className="text-xs font-extrabold text-red-400">
                  Delete
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {!isReply
            ? comment.replies?.map((reply) => (
                <React.Fragment key={reply.id}>
                  {renderComment(reply, true)}
                </React.Fragment>
              ))
            : null}
        </View>
      </View>
    </View>
  );

  if (!mounted) return null;

  return (
    <View className="absolute inset-0 z-50 justify-end">
      <Animated.View
        className="absolute inset-0 bg-black"
        style={backdropStyle}
      >
        <Pressable className="h-full w-full" onPress={onClose} />
      </Animated.View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Animated.View
          className="overflow-hidden rounded-t-[28px] border border-border bg-bg"
          style={[{ height: DRAWER_HEIGHT }, drawerStyle]}
        >
          <View className="items-center pb-2 pt-3">
            <View className="h-1.5 w-11 rounded-full bg-border" />
          </View>

          <View className="flex-row items-center border-b border-border px-4 pb-3">
            <View className="flex-1">
              <Text className="text-lg font-extrabold text-text-primary">
                Comments
              </Text>
              <Text className="text-xs font-semibold text-text-muted">
                {comments.length ? `${comments.length} conversations` : "Join in"}
              </Text>
            </View>
            <TouchableOpacity
              className="h-10 w-10 items-center justify-center rounded-full bg-bg-elevated"
              onPress={onClose}
              activeOpacity={0.78}
            >
              <Ionicons name="close" size={18} color={Colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {isLoading ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator color={Colors.primary} size="large" />
            </View>
          ) : (
            <FlatList
              data={comments}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => renderComment(item)}
              refreshControl={
                <RefreshControl
                  refreshing={isFetching}
                  onRefresh={refetch}
                  tintColor={Colors.primary}
                />
              }
              ListEmptyComponent={
                <View className="items-center justify-center px-6 py-12">
                  <View className="h-14 w-14 items-center justify-center rounded-full bg-bg-elevated">
                    <Ionicons
                      name="chatbubble-ellipses-outline"
                      size={26}
                      color={Colors.textMuted}
                    />
                  </View>
                  <Text className="mt-4 text-center text-base font-extrabold text-text-primary">
                    No comments yet
                  </Text>
                  <Text className="mt-1 text-center text-sm text-text-secondary">
                    Start the conversation with something thoughtful.
                  </Text>
                </View>
              }
              contentContainerStyle={{
                paddingBottom: 12,
                flexGrow: comments.length ? undefined : 1,
              }}
            />
          )}

          <View className="border-t border-border bg-bg px-4 pb-4 pt-3">
            {replyTo ? (
              <View className="mb-2 flex-row items-center rounded-full bg-bg-elevated px-3 py-2">
                <Ionicons
                  name="return-down-forward-outline"
                  size={15}
                  color={Colors.textMuted}
                />
                <Text
                  className="ml-2 flex-1 text-xs font-bold text-text-secondary"
                  numberOfLines={1}
                >
                  Replying to {getAuthorName(replyTo)}
                </Text>
                <TouchableOpacity onPress={() => setReplyTo(null)}>
                  <Ionicons name="close" size={16} color={Colors.textMuted} />
                </TouchableOpacity>
              </View>
            ) : null}

            <View className="flex-row items-end">
              <TextInput
                className="max-h-24 min-h-11 flex-1 rounded-[18px] border border-border bg-bg-input px-4 py-2.5 text-base text-text-primary"
                placeholder={replyTo ? "Write a reply..." : "Add a comment..."}
                placeholderTextColor={Colors.textMuted}
                multiline
                value={text}
                onChangeText={setText}
                editable={!isSubmitting}
              />
              <TouchableOpacity
                className={`ml-2 h-11 w-11 items-center justify-center rounded-full ${
                  text.trim() ? "bg-primary" : "bg-bg-elevated"
                }`}
                onPress={handleSubmit}
                disabled={!text.trim() || isSubmitting}
                activeOpacity={0.8}
              >
                {isSubmitting ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <Ionicons
                    name="send"
                    size={17}
                    color={text.trim() ? Colors.white : Colors.textMuted}
                  />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}
