import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import FeedCard, { type FeedPostAction } from "@/components/FeedCard";
import CommentsDrawer from "@/components/feed/CommentsDrawer";
import { postService } from "@/services/post.service";
import { userService } from "@/services/user.service";
import { moderationService } from "@/services/moderation.service";
import { useAuthStore } from "@/store/authStore";
import { showToast } from "@/utils/toast";

const getTimeAgo = (dateString?: string) => {
  if (!dateString) return "just now";

  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.max(
    0,
    Math.floor((now.getTime() - date.getTime()) / 1000),
  );

  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

const normalizePost = (post: any) => ({
  id: post?.postId || post?.id,
  authorId: post?.authorId || post?.author?.id,
  author: {
    username:
      post?.author?.profile?.username ||
      post?.author?.username ||
      post?.author?.profile?.user?.username ||
      "user",
    avatarUrl: post?.author?.profile?.avatarUrl || post?.author?.avatarUrl,
  },
  caption: post?.caption || "",
  mediaUrls: post?.mediaUrls || [],
  likesCount: post?.likesCount ?? post?._count?.likes ?? 0,
  commentsCount: post?.commentsCount ?? post?._count?.comments ?? 0,
  isLiked: Boolean(post?.isLiked),
  isSaved: Boolean(post?.isSaved),
  isAnonymous: Boolean(post?.isAnonymous),
  isOwnPost: Boolean(post?.isOwnPost),
  isFollowing: Boolean(post?.isFollowing),
  timeAgo: getTimeAgo(post?.createdAt),
});

export default function PostDetailScreen() {
  const { postId } = useLocalSearchParams<{ postId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const currentUserId = useAuthStore((state) => state.user?.id);
  const [commentDrawerOpen, setCommentDrawerOpen] = useState(false);

  const {
    data: postResponse,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["post", postId],
    queryFn: () => postService.getPost(postId),
    enabled: Boolean(postId),
  });

  const post = useMemo(
    () => (postResponse?.success ? normalizePost(postResponse.data) : null),
    [postResponse],
  );

  const refreshPostLists = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["post", postId] }),
      queryClient.invalidateQueries({ queryKey: ["feed"] }),
      queryClient.invalidateQueries({ queryKey: ["user-posts"] }),
      queryClient.invalidateQueries({ queryKey: ["saved-posts"] }),
    ]);
  };

  const handleLikePost = async (id: string, isLiked?: boolean) => {
    try {
      if (isLiked) {
        await postService.unlikePost(id);
      } else {
        await postService.likePost(id);
      }
      await refreshPostLists();
    } catch (error: any) {
      Alert.alert(
        "Like failed",
        error?.response?.data?.message || "Unable to update this post.",
      );
    }
  };

  const handleSavePost = async (id: string, isSaved?: boolean) => {
    try {
      if (isSaved) {
        await postService.unsavePost(id);
      } else {
        await postService.savePost(id);
      }
      await refreshPostLists();
    } catch (error: any) {
      Alert.alert(
        "Save failed",
        error?.response?.data?.message || "Unable to save this post.",
      );
    }
  };

  const handlePostCardAction = async (id: string, action: FeedPostAction) => {
    if (action !== "follow" && action !== "unfollow") return;
    if (!post?.authorId || post.isAnonymous || post.isOwnPost) return;

    const nextFollowing = action === "follow";
    const previousPost = queryClient.getQueryData(["post", postId]);

    queryClient.setQueryData(["post", postId], (current: any) =>
      current?.success
        ? {
            ...current,
            data: { ...current.data, isFollowing: nextFollowing },
          }
        : current,
    );

    try {
      if (nextFollowing) {
        await userService.followUser(post.authorId);
      } else {
        await userService.unfollowUser(post.authorId);
      }

      showToast(
        nextFollowing
          ? `Following ${post.author.username}`
          : `Unfollowed ${post.author.username}`,
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["post", postId] }),
        queryClient.invalidateQueries({ queryKey: ["feed"] }),
        queryClient.invalidateQueries({
          queryKey: ["user-profile", post.authorId],
        }),
        queryClient.invalidateQueries({
          queryKey: ["user-stats", post.authorId],
        }),
      ]);
    } catch (error: any) {
      queryClient.setQueryData(["post", postId], previousPost);
      showToast(
        error?.response?.data?.message || "Unable to update follow.",
        "Follow failed",
      );
    }
  };

  const deletePost = () => {
    Alert.alert("Delete post?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await postService.deletePost(postId);
          await refreshPostLists();
          router.back();
        },
      },
    ]);
  };

  const showPostActions = () => {
    if (!post) return;
    if (post.authorId === currentUserId) {
      Alert.alert("Post actions", undefined, [
        {
          text: "Edit post",
          onPress: () =>
            router.push({
              pathname: "/(screens)/edit-post",
              params: { postId },
            }),
        },
        { text: "Delete post", style: "destructive", onPress: deletePost },
        { text: "Cancel", style: "cancel" },
      ]);
      return;
    }

    Alert.alert("Post actions", undefined, [
      {
        text: "Report post",
        style: "destructive",
        onPress: async () => {
          await moderationService.report({
            contentId: post.id,
            contentType: "POST",
            reportedId: post.authorId,
            reason: "OTHER",
            description: "Reported from post details",
          });
          showToast(
            "Thank you for helping keep Datebl safe.",
            "Report received",
          );
        },
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-[#050505]" edges={["top"]}>
      <View className="flex-row items-center border-b border-[#151515] px-4 py-3">
        <TouchableOpacity
          className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-[#111111]"
          onPress={() => router.back()}
          activeOpacity={0.78}
        >
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-lg font-extrabold text-white">Post</Text>
          <Text className="text-xs font-semibold text-[#777777]">
            Details and reactions
          </Text>
        </View>
        {post ? (
          <TouchableOpacity
            className="h-10 w-10 items-center justify-center rounded-full bg-[#111111]"
            onPress={showPostActions}
          >
            <Ionicons name="ellipsis-horizontal" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        ) : null}
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#FFFFFF" size="large" />
        </View>
      ) : !post ? (
        <View className="flex-1 items-center justify-center px-6">
          <View className="h-20 w-20 items-center justify-center rounded-full border border-[#222222] bg-[#111111]">
            <Ionicons name="image-outline" size={34} color="#888888" />
          </View>
          <Text className="mt-5 text-center text-xl font-extrabold text-white">
            Post not found
          </Text>
          <Text className="mt-2 text-center text-sm leading-5 text-[#888888]">
            This post may have been deleted or is no longer available.
          </Text>
          <TouchableOpacity
            className="mt-6 h-12 items-center justify-center rounded-full bg-white px-6"
            onPress={() => router.back()}
            activeOpacity={0.82}
          >
            <Text className="text-sm font-extrabold text-black">Go back</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isFetching}
              onRefresh={refetch}
              tintColor="#FFFFFF"
            />
          }
          contentContainerClassName="py-4"
        >
          <FeedCard
            post={post}
            onLikePress={handleLikePost}
            onCommentPress={() => setCommentDrawerOpen(true)}
            onSavePress={handleSavePost}
            onMoreAction={handlePostCardAction}
          />
        </ScrollView>
      )}
      <CommentsDrawer
        visible={commentDrawerOpen}
        postId={postId || null}
        onClose={() => setCommentDrawerOpen(false)}
      />
    </SafeAreaView>
  );
}
