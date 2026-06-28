import {
  View,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import Header from "@/components/Header";
import FeedCard from "@/components/FeedCard";
import { Screen } from "@/components/common/Screen";
import { ScreenSpacing } from "@/constants/screen";
import { postService } from "@/services/post.service";
import { useAuthStore } from "@/store/authStore";
import { useFeedQuery, useStoriesQuery } from "@/hooks/queries";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Colors } from "@/constants/colors";
import CommentsDrawer from "@/components/feed/CommentsDrawer";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type StoryItem = {
  id: string;
  authorId?: string;
  name: string;
  imageUrl?: string | null;
  mediaUrl?: string | null;
  expiresAt?: string;
  isViewed?: boolean;
};

type FeedPost = {
  id: string;
  author: {
    username: string;
    avatarUrl?: string;
  };
  caption?: string;
  mediaUrls: string[];
  likesCount: number;
  commentsCount: number;
  isLiked: boolean;
  isSaved: boolean;
  isAnonymous: boolean;
  timeAgo: string;
};

const getTimeAgo = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

const getTimeLeft = (expiresAt?: string) => {
  if (!expiresAt) return "";

  const remainingMs = new Date(expiresAt).getTime() - Date.now();
  if (remainingMs <= 0) return "Expired";

  const hours = Math.floor(remainingMs / (1000 * 60 * 60));
  if (hours > 0) return `${hours}h left`;

  const minutes = Math.max(1, Math.floor(remainingMs / (1000 * 60)));
  return `${minutes}m left`;
};

export default function FeedScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const [commentPostId, setCommentPostId] = useState<string | null>(null);
  const scrollY = useSharedValue(0);
  const {
    data: feedData,
    isLoading,
    isFetching,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useFeedQuery();
  const {
    data: storiesData,
    isLoading: storiesLoading,
    refetch: refetchStories,
  } = useStoriesQuery();
  const { user } = useAuthStore();

  const posts: FeedPost[] =
    feedData?.pages.flatMap((page: any) => page.feed).map((p: any) => ({
      id: p.postId,
      author: {
        username: p.author?.username || "user",
        avatarUrl: p.author?.avatarUrl || undefined,
      },
      caption: p.caption,
      mediaUrls: p.mediaUrls || [],
      likesCount: p.likesCount || 0,
      commentsCount: p.commentsCount || 0,
      isLiked: Boolean(p.isLiked),
      isSaved: Boolean(p.isSaved),
      isAnonymous: Boolean(p.isAnonymous),
      timeAgo: p.createdAt ? getTimeAgo(p.createdAt) : "just now",
    })) || [];

  const currentUserStory = (storiesData || []).find(
    (story: StoryItem) => story.authorId === user?.id,
  );
  const storyItems: StoryItem[] = (storiesData || [])
    .filter((story: StoryItem) => story.authorId !== user?.id)
    .slice(0, 12);

  const currentUserName =
    user?.profile?.username || user?.username || "Your story";
  const currentUserAvatar = currentUserStory?.mediaUrl || user?.profile?.avatarUrl;

  const openCreateStory = () => router.push("/(screens)/create-story");
  const openCurrentUserStory = () => {
    if (currentUserStory?.id) {
      openStory(currentUserStory.id);
      return;
    }

    openCreateStory();
  };

  const openStory = (storyId: string) =>
    router.push({
      pathname: "/(screens)/story/[storyId]",
      params: { storyId },
    });

  const openComments = (postId: string) => setCommentPostId(postId);

  const onRefresh = () => {
    refetch();
    refetchStories();
  };

  const updateFeedPost = (
    postId: string,
    updater: (post: any) => any,
  ) => {
    queryClient.setQueryData(["feed"], (current: any) => {
      if (!current) return current;

      if (Array.isArray(current)) {
        return current.map((post) =>
          post.postId === postId || post.id === postId ? updater(post) : post,
        );
      }

      return {
        ...current,
        pages: current.pages.map((page: any) => ({
          ...page,
          feed: page.feed.map((post: any) =>
            post.postId === postId || post.id === postId
              ? updater(post)
              : post,
          ),
        })),
      };
    });
  };

  const handleLikePost = async (postId: string, isLiked?: boolean) => {
    const previousFeed = queryClient.getQueryData(["feed"]);

    updateFeedPost(postId, (post) => ({
      ...post,
      isLiked: !isLiked,
      likesCount: Math.max(0, (post.likesCount || 0) + (isLiked ? -1 : 1)),
    }));

    try {
      if (isLiked) {
        await postService.unlikePost(postId);
      } else {
        await postService.likePost(postId);
      }
    } catch (error: any) {
      queryClient.setQueryData(["feed"], previousFeed);
      Alert.alert(
        "Like failed",
        error?.response?.data?.message || "Unable to update this post.",
      );
    }
  };

  const handleSavePost = async (postId: string, isSaved?: boolean) => {
    const previousFeed = queryClient.getQueryData(["feed"]);

    updateFeedPost(postId, (post) => ({
      ...post,
      isSaved: !isSaved,
    }));

    try {
      if (isSaved) {
        await postService.unsavePost(postId);
      } else {
        await postService.savePost(postId);
      }
      queryClient.invalidateQueries({ queryKey: ["saved-posts"] });
    } catch (error: any) {
      queryClient.setQueryData(["feed"], previousFeed);
      Alert.alert(
        "Save failed",
        error?.response?.data?.message || "Unable to update saved posts.",
      );
    }
  };

  const renderHeader = () => (
    <View className="border-b border-border bg-bg py-4">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="gap-4 px-4"
      >
        <TouchableOpacity
          className="w-[72px] items-center"
          activeOpacity={0.78}
          onPress={openCurrentUserStory}
        >
          <View
            className={`h-[68px] w-[68px] items-center justify-center rounded-[24px] bg-bg-card ${
              currentUserStory ? "border-2 border-primary-light" : "border border-border"
            }`}
          >
            {currentUserAvatar ? (
              <Image
                source={{ uri: currentUserAvatar }}
                className="h-[60px] w-[60px] rounded-[21px]"
              />
            ) : (
              <Ionicons name="person" size={24} color={Colors.textMuted} />
            )}
            {currentUserStory ? (
              <>
                <View className="absolute -bottom-1 rounded-full bg-primary px-2 py-0.5">
                  <Text className="text-[9px] font-extrabold uppercase text-white">
                    Yours
                  </Text>
                </View>
                <TouchableOpacity
                  className="absolute -right-1 -top-1 h-7 w-7 items-center justify-center rounded-full border-2 border-bg bg-primary"
                  activeOpacity={0.82}
                  onPress={(event) => {
                    event.stopPropagation();
                    openCreateStory();
                  }}
                >
                  <Ionicons name="add" size={18} color={Colors.white} />
                </TouchableOpacity>
              </>
            ) : (
              <View className="absolute -bottom-1 -right-1 h-7 w-7 items-center justify-center rounded-full border-2 border-bg bg-primary">
                <Ionicons name="add" size={18} color={Colors.white} />
              </View>
            )}
          </View>
          <Text
            className="mt-2 w-full text-center text-xs font-semibold text-text-primary"
            numberOfLines={1}
          >
            {currentUserName}
          </Text>
          {currentUserStory?.expiresAt ? (
            <Text
              className="mt-0.5 w-full text-center text-[10px] font-bold text-text-muted"
              numberOfLines={1}
            >
              {getTimeLeft(currentUserStory.expiresAt)}
            </Text>
          ) : null}
        </TouchableOpacity>

        {storiesLoading
          ? Array.from({ length: 4 }).map((_, index) => (
              <View
                key={`story-loading-${index}`}
                className="w-[72px] items-center"
              >
                <View className="h-[68px] w-[68px] rounded-[24px] border border-border bg-bg-elevated" />
                <View className="mt-3 h-3 w-12 rounded-full bg-border" />
              </View>
            ))
          : storyItems.map((story) => (
              <TouchableOpacity
                key={story.id}
                className="w-[72px] items-center"
                activeOpacity={0.78}
                onPress={() => openStory(story.id)}
              >
                <View
                  className={`h-[68px] w-[68px] items-center justify-center rounded-[24px] bg-bg-card ${
                    story.isViewed
                      ? "border border-border"
                      : "border-2 border-primary-light"
                  }`}
                >
                  <View className="h-[62px] w-[62px] items-center justify-center overflow-hidden rounded-[22px] border border-bg bg-bg-elevated">
                    {story.imageUrl ? (
                      <Image
                        source={{ uri: story.imageUrl }}
                        className="h-full w-full"
                      />
                    ) : (
                      <Ionicons name="person" size={24} color={Colors.textMuted} />
                    )}
                  </View>
                  <View
                    className={`absolute -bottom-1 rounded-full px-2 py-0.5 ${
                      story.isViewed ? "bg-bg-elevated" : "bg-primary"
                    }`}
                  >
                    <Text className="text-[9px] font-extrabold uppercase text-white">
                      {story.isViewed ? "Seen" : "New"}
                    </Text>
                  </View>
                </View>
                <Text
                  className="mt-2 w-full text-center text-xs font-semibold text-text-primary"
                  numberOfLines={1}
                >
                  {story.name}
                </Text>
                {story.expiresAt ? (
                  <Text
                    className="mt-0.5 w-full text-center text-[10px] font-bold text-text-muted"
                    numberOfLines={1}
                  >
                    {getTimeLeft(story.expiresAt)}
                  </Text>
                ) : null}
              </TouchableOpacity>
            ))}
      </ScrollView>
    </View>
  );

  const handleEndReached = () => {
    if (!hasNextPage || isFetchingNextPage) return;
    fetchNextPage();
  };

  const renderFooter = () =>
    isFetchingNextPage ? (
      <View className="items-center py-5">
        <ActivityIndicator color={Colors.primary} />
      </View>
    ) : null;

  const headerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: interpolate(
          scrollY.value,
          [0, 90],
          [0, -96],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollY.value = event.nativeEvent.contentOffset.y;
  };

  return (
    <Screen edges={["left", "right"]}>
      <View
        pointerEvents="none"
        className="absolute left-0 right-0 top-0 z-30 bg-bg"
        style={{ height: insets.top }}
      />
      <Animated.View
        className="absolute left-0 right-0 top-0 z-20"
        style={headerAnimatedStyle}
      >
        <Header />
      </Animated.View>
      {isLoading ? (
        <View className="flex-1 justify-center items-center pt-24">
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      ) : posts.length === 0 ? (
        <View className="flex-1 pt-24">
          {renderHeader()}
          <View className="flex-1 justify-center items-center px-6">
            <Text className="text-text-primary font-medium text-lg text-center">
              No posts to show.
            </Text>
            <Text className="text-text-secondary text-center mt-2">
              Create a post or follow more people to get started.
            </Text>
          </View>
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <FeedCard
              post={item}
              onLikePress={handleLikePost}
              onCommentPress={openComments}
              onSavePress={handleSavePost}
            />
          )}
          ListHeaderComponent={renderHeader}
          ListFooterComponent={renderFooter}
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.7}
          refreshControl={
            <RefreshControl
              refreshing={isFetching}
              onRefresh={onRefresh}
              tintColor={Colors.primary}
            />
          }
          contentContainerStyle={{
            paddingBottom: ScreenSpacing.bottomTab,
            paddingTop: 96,
          }}
        />
      )}
      <CommentsDrawer
        visible={Boolean(commentPostId)}
        postId={commentPostId}
        onClose={() => setCommentPostId(null)}
      />
    </Screen>
  );
}
