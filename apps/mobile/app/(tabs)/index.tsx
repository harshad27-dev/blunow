import {
  View,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  Modal,
  Alert,
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
import { useState } from "react";
import { Colors } from "@/constants/colors";

type StoryItem = {
  id: string;
  name: string;
  imageUrl?: string | null;
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

export default function FeedScreen() {
  const router = useRouter();
  const { data: feedData, isLoading, isFetching, refetch } = useFeedQuery();
  const {
    data: storiesData,
    isLoading: storiesLoading,
    refetch: refetchStories,
  } = useStoriesQuery();
  const { user } = useAuthStore();
  const [commentPostId, setCommentPostId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const [isCommenting, setIsCommenting] = useState(false);

  const posts: FeedPost[] =
    feedData?.map((p: any) => ({
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

  const storyItems: StoryItem[] = (storiesData || []).slice(0, 12);

  const currentUserName =
    user?.profile?.username || user?.username || "Your story";
  const currentUserAvatar = user?.profile?.avatarUrl;

  const openCreateStory = () => router.push("/(screens)/create-story");

  const openStory = (storyId: string) =>
    router.push({
      pathname: "/(screens)/story/[storyId]",
      params: { storyId },
    });

  const onRefresh = () => {
    refetch();
    refetchStories();
  };

  const handleLikePost = async (postId: string, isLiked?: boolean) => {
    if (isLiked) {
      await postService.unlikePost(postId);
    } else {
      await postService.likePost(postId);
    }
    refetch();
  };

  const handleSavePost = async (postId: string, isSaved?: boolean) => {
    if (isSaved) {
      await postService.unsavePost(postId);
    } else {
      await postService.savePost(postId);
    }
    refetch();
  };

  const handleSubmitComment = async () => {
    if (!commentPostId || !commentText.trim()) return;

    try {
      setIsCommenting(true);
      await postService.addComment(commentPostId, commentText.trim());
      setCommentText("");
      setCommentPostId(null);
      refetch();
    } catch (error: any) {
      Alert.alert(
        "Comment failed",
        error?.response?.data?.message || "Unable to add your comment.",
      );
    } finally {
      setIsCommenting(false);
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
          onPress={openCreateStory}
        >
          <View className="h-[68px] w-[68px] items-center justify-center rounded-[24px] border border-border bg-bg-card">
            {currentUserAvatar ? (
              <Image
                source={{ uri: currentUserAvatar }}
                className="h-[60px] w-[60px] rounded-[21px]"
              />
            ) : (
              <Ionicons name="person" size={24} color={Colors.textMuted} />
            )}
            <View className="absolute -bottom-1 -right-1 h-7 w-7 items-center justify-center rounded-full border-2 border-bg bg-primary">
              <Ionicons name="add" size={18} color={Colors.white} />
            </View>
          </View>
          <Text
            className="mt-2 w-full text-center text-xs font-semibold text-text-primary"
            numberOfLines={1}
          >
            {currentUserName}
          </Text>
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
                <View className="h-[68px] w-[68px] items-center justify-center rounded-[24px] border-2 border-primary-light bg-bg-card">
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
                  <View className="absolute -bottom-1 rounded-full bg-primary px-2 py-0.5">
                    <Text className="text-[9px] font-extrabold uppercase text-white">
                      New
                    </Text>
                  </View>
                </View>
                <Text
                  className="mt-2 w-full text-center text-xs font-semibold text-text-primary"
                  numberOfLines={1}
                >
                  {story.name}
                </Text>
              </TouchableOpacity>
            ))}
      </ScrollView>
    </View>
  );

  return (
    <Screen edges={["left", "right"]}>
      <Header />
      {isLoading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      ) : posts.length === 0 ? (
        <View className="flex-1">
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
              onCommentPress={setCommentPostId}
              onSavePress={handleSavePost}
            />
          )}
          ListHeaderComponent={renderHeader}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isFetching}
              onRefresh={onRefresh}
              tintColor={Colors.primary}
            />
          }
          contentContainerStyle={{ paddingBottom: ScreenSpacing.bottomTab }}
        />
      )}
      <Modal
        visible={!!commentPostId}
        transparent
        animationType="fade"
        onRequestClose={() => setCommentPostId(null)}
      >
        <View className="flex-1 justify-end bg-black/40 px-4 pb-6">
          <View className="rounded-[24px] border border-border bg-bg-card p-4">
            <View className="mb-3 flex-row items-center justify-between">
              <Text className="text-base font-extrabold text-text-primary">
                Add comment
              </Text>
              <TouchableOpacity
                className="h-9 w-9 items-center justify-center rounded-full bg-bg-elevated"
                onPress={() => setCommentPostId(null)}
                disabled={isCommenting}
              >
                <Ionicons name="close" size={18} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <TextInput
              className="min-h-[96px] rounded-[18px] border border-border bg-bg-input px-4 py-3 text-base text-text-primary"
              placeholder="Write your comment..."
              placeholderTextColor={Colors.textMuted}
              multiline
              value={commentText}
              onChangeText={setCommentText}
              editable={!isCommenting}
              textAlignVertical="top"
            />
            <TouchableOpacity
              className={`mt-3 h-12 items-center justify-center rounded-full ${
                commentText.trim() ? "bg-primary" : "bg-bg-elevated"
              }`}
              onPress={handleSubmitComment}
              disabled={!commentText.trim() || isCommenting}
            >
              {isCommenting ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text
                  className={`font-extrabold ${
                    commentText.trim() ? "text-white" : "text-text-muted"
                  }`}
                >
                  Post comment
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}
