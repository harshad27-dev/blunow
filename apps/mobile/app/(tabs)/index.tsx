import {
  View,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Header from "@/components/Header";
import FeedCard from "@/components/FeedCard";
import { Screen } from "@/components/common/Screen";
import { ScreenSpacing } from "@/constants/screen";
import { suggestedProfiles } from "@/data/matchProfiles";
import { useAuthStore } from "@/store/authStore";
import { useFeedQuery } from "@/hooks/queries";

type StoryItem = {
  id: string;
  name: string;
  imageUrl?: string | null;
  isLive?: boolean;
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
  const { data: feedData, isLoading, isFetching, refetch } = useFeedQuery();
  const { user } = useAuthStore();

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
      timeAgo: p.createdAt ? getTimeAgo(p.createdAt) : "just now",
    })) || [];

  const authorStories = posts.reduce<StoryItem[]>((items, post) => {
    if (items.some((item) => item.name === post.author.username)) return items;

    return [
      ...items,
      {
        id: `author-${post.id}`,
        name: post.author.username,
        imageUrl: post.author.avatarUrl || post.mediaUrls?.[0],
        isLive: items.length === 0,
      },
    ];
  }, []);

  const storyItems: StoryItem[] =
    authorStories.length > 0
      ? authorStories.slice(0, 8)
      : suggestedProfiles.map((profile, index) => ({
          id: profile.id,
          name: profile.name,
          imageUrl: profile.imageUrl,
          isLive: index === 0,
        }));

  const currentUserName =
    user?.profile?.username || user?.username || "Your story";
  const currentUserAvatar = user?.profile?.avatarUrl;

  const onRefresh = () => {
    refetch();
  };

  const renderHeader = () => (
    <View className="border-b border-[#111111] bg-[#050505] py-4">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="gap-4 px-4"
      >
        <TouchableOpacity className="w-[72px] items-center" activeOpacity={0.78}>
          <View className="h-[68px] w-[68px] items-center justify-center rounded-[24px] border border-[#2A2A2A] bg-[#111111]">
            {currentUserAvatar ? (
              <Image
                source={{ uri: currentUserAvatar }}
                className="h-[60px] w-[60px] rounded-[21px]"
              />
            ) : (
              <Ionicons name="person" size={24} color="#888888" />
            )}
            <View className="absolute -bottom-1 -right-1 h-7 w-7 items-center justify-center rounded-full border-2 border-[#050505] bg-white">
              <Ionicons name="add" size={18} color="#050505" />
            </View>
          </View>
          <Text className="mt-2 w-full text-center text-xs font-semibold text-white" numberOfLines={1}>
            {currentUserName}
          </Text>
        </TouchableOpacity>

        {storyItems.map((story) => (
          <TouchableOpacity
            key={story.id}
            className="w-[72px] items-center"
            activeOpacity={0.78}
          >
            <View className="h-[68px] w-[68px] items-center justify-center rounded-[24px] border-2 border-white bg-[#111111]">
              {story.imageUrl ? (
                <Image
                  source={{ uri: story.imageUrl }}
                  className="h-[60px] w-[60px] rounded-[21px]"
                />
              ) : (
                <Ionicons name="person" size={24} color="#888888" />
              )}
              {story.isLive ? (
                <View className="absolute -bottom-1 rounded-full bg-[#FF4F7B] px-2 py-0.5">
                  <Text className="text-[9px] font-extrabold uppercase text-white">
                    Live
                  </Text>
                </View>
              ) : null}
            </View>
            <Text className="mt-2 w-full text-center text-xs font-semibold text-white" numberOfLines={1}>
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
          <ActivityIndicator color="#FFF" size="large" />
        </View>
      ) : posts.length === 0 ? (
        <View className="flex-1">
          {renderHeader()}
          <View className="flex-1 justify-center items-center px-6">
            <Text className="text-white font-medium text-lg text-center">
              No posts to show.
            </Text>
            <Text className="text-[#888888] text-center mt-2">
              Create a post or follow more people to get started.
            </Text>
          </View>
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <FeedCard post={item} />}
          ListHeaderComponent={renderHeader}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isFetching}
              onRefresh={onRefresh}
              tintColor="#FFF"
            />
          }
          contentContainerStyle={{ paddingBottom: ScreenSpacing.bottomTab }}
        />
      )}
    </Screen>
  );
}
