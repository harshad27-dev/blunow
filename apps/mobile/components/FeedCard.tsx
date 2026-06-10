import { View, Text, Image, TouchableOpacity, Dimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";
import { LinearGradient } from "expo-linear-gradient";

const { width } = Dimensions.get("window");
const cardInset = 32;
const mediaHeight = Math.min(width - cardInset, 390);

const getStableImageNumber = (value: string, offset: number) => {
  const total = value
    .split("")
    .reduce((sum, char) => sum + char.charCodeAt(0), offset);
  return (total % 65) + 1;
};

interface FeedCardProps {
  post: {
    id: string;
    author: {
      username: string;
      avatarUrl?: string;
    };
    caption?: string;
    mediaUrls?: string[];
    likesCount: number;
    commentsCount: number;
    isLiked?: boolean;
    isSaved?: boolean;
    isAnonymous?: boolean;
    timeAgo: string;
  };
  onLikePress?: (postId: string, isLiked?: boolean) => void;
  onCommentPress?: (postId: string) => void;
  onSavePress?: (postId: string, isSaved?: boolean) => void;
}

export default function FeedCard({
  post,
  onLikePress,
  onCommentPress,
  onSavePress,
}: FeedCardProps) {
  const hasImage = Boolean(post.mediaUrls?.length);
  const displayName = post.isAnonymous ? "Anonymous" : post.author.username;
  const avatarUrl = post.isAnonymous
    ? null
    : post.author.avatarUrl ||
      `https://i.pravatar.cc/300?u=${post.author.username}`;
  const reactionAvatars = [
    `https://i.pravatar.cc/100?img=${getStableImageNumber(post.id, 12)}`,
    `https://i.pravatar.cc/100?img=${getStableImageNumber(post.id, 23)}`,
    `https://i.pravatar.cc/100?img=${getStableImageNumber(post.id, 34)}`,
  ];

  return (
    <View className="00 overflow-hidden">
      <View className="flex-row items-center justify-between px-4 py-4">
        <View className="min-w-0 flex-1 flex-row items-center">
          <View className="mr-3 h-12 w-12 overflow-hidden rounded-full border border-border bg-bg-elevated">
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} className="h-full w-full" />
            ) : (
              <View className="h-full w-full items-center justify-center bg-bg-elevated">
                <Ionicons
                  name="eye-off-outline"
                  size={22}
                  color={Colors.textMuted}
                />
              </View>
            )}
          </View>

          <View className="min-w-0 flex-1">
            <View className="flex-row items-center">
              <Text
                className="max-w-[82%] text-[15px] font-extrabold text-text-primary"
                numberOfLines={1}
              >
                {displayName}
              </Text>
              {post.isAnonymous ? (
                <View className="ml-2 rounded-full border border-border bg-bg-elevated px-2 py-0.5">
                  <Text className="text-[9px] font-extrabold uppercase text-text-muted">
                    Hidden
                  </Text>
                </View>
              ) : (
                <View className="ml-1.5 h-4 w-4 items-center justify-center rounded-full bg-primary-light">
                  <Ionicons name="checkmark" size={11} color={Colors.white} />
                </View>
              )}
            </View>

            <View className="mt-1 flex-row items-center">
              <Text
                className="text-xs font-medium text-text-secondary"
                numberOfLines={1}
              >
                {post.timeAgo}
              </Text>
              <View className="mx-2 h-1 w-1 rounded-full bg-text-muted" />
              <Ionicons
                name="location-outline"
                size={12}
                color={Colors.textSecondary}
              />
              <Text
                className="ml-1 text-xs font-medium text-text-secondary"
                numberOfLines={1}
              >
                Nearby
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          activeOpacity={0.75}
          className="ml-3 h-10 w-10 items-center justify-center rounded-full bg-bg-elevated"
        >
          <Ionicons
            name="ellipsis-horizontal"
            size={18}
            color={Colors.textPrimary}
          />
        </TouchableOpacity>
      </View>

      {hasImage ? (
        <View
          className="mx-3 overflow-hidden rounded-[24px] bg-bg-elevated"
          style={{ height: mediaHeight }}
        >
          <Image
            source={{ uri: post.mediaUrls![0] }}
            className="h-full w-full"
            resizeMode="cover"
          />
          <LinearGradient
            colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.68)"]}
            className="absolute bottom-0 left-0 right-0 h-32"
          />

          <View className="absolute bottom-3 left-3 right-3 flex-row items-end justify-between">
            <View className="max-w-[74%]">
              <Text className="text-[11px] font-extrabold uppercase tracking-wider text-white/70">
                Live moment
              </Text>
              <Text
                className="mt-1 text-lg font-extrabold text-white"
                numberOfLines={1}
              >
                {`${displayName}'s update`}
              </Text>
            </View>

            <View className="rounded-full bg-black/55 px-3 py-1.5">
              <Text className="text-xs font-extrabold text-white">
                1/{post.mediaUrls?.length || 1}
              </Text>
            </View>
          </View>
        </View>
      ) : (
        <View className="mx-3 rounded-[24px] border border-border bg-bg-elevated px-5 py-7">
          <Ionicons
            name="chatbubble-ellipses-outline"
            size={28}
            color={Colors.textSecondary}
          />
          <Text className="mt-4 text-xl font-extrabold leading-7 text-text-primary">
            {post.caption || "Shared a fresh moment from the city."}
          </Text>
        </View>
      )}

      <View className="px-5 pb-4 pt-4">
        {hasImage && (
          <Text className="text-base leading-6 text-text-secondary">
            <Text className="font-extrabold text-text-primary">
              {displayName}{" "}
            </Text>
            {post.caption || "Shared a fresh moment from the city."}
          </Text>
        )}

        <View className="mt-4 flex-row items-center justify-between">
          <View className="mr-3 min-w-0 flex-1 flex-row items-center">
            {reactionAvatars.map((avatar, index) => (
              <Image
                key={avatar}
                source={{ uri: avatar }}
                className="h-7 w-7 rounded-full border-2 border-bg-card bg-bg-elevated"
                style={{ marginLeft: index === 0 ? 0 : -8 }}
              />
            ))}
            <Text
              className="ml-2 flex-1 text-xs font-semibold text-text-secondary"
              numberOfLines={1}
            >
              {post.likesCount} likes
            </Text>
          </View>

          <View className="flex-row items-center rounded-full border border-border bg-bg-elevated px-3 py-2">
            <Ionicons
              name="eye-outline"
              size={14}
              color={Colors.textSecondary}
            />
            <Text className="ml-1.5 text-xs font-bold text-text-secondary">
              2.4k
            </Text>
          </View>
        </View>
      </View>


      <View className="flex-row items-center justify-between px-4 pb-4">
        <View className="flex-row items-center">
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => onLikePress?.(post.id, post.isLiked)}
            className={`mr-2 flex-row items-center rounded-full px-4 py-3 ${
              post.isLiked ? "border border-primary-light bg-primary-light" : "border border-border bg-bg-elevated"
            }`}
          >
            <Ionicons
              name={post.isLiked ? "heart" : "heart-outline"}
              size={18}
              color={post.isLiked ? Colors.textInverse : Colors.textSecondary}
            />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => onCommentPress?.(post.id)}
            className="flex-row items-center rounded-full border border-border bg-bg-elevated px-4 py-3"
          >
            <Ionicons
              name="chatbubble-outline"
              size={18}
              color={Colors.textSecondary}
            />
    
          </TouchableOpacity>
        </View>

        <View className="flex-row items-center">
          <TouchableOpacity
            activeOpacity={0.75}
            className="mr-2 h-11 w-11 items-center justify-center rounded-full border border-border bg-bg-elevated"
          >
            <Ionicons
              name="paper-plane-outline"
              size={18}
              color={Colors.textSecondary}
            />
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => onSavePress?.(post.id, post.isSaved)}
            className={`h-11 w-11 items-center justify-center rounded-full ${
              post.isSaved
                ? "border border-primary-light bg-primary-light"
                : "border border-border bg-bg-elevated"
            }`}
          >
            <Ionicons
              name={post.isSaved ? "bookmark" : "bookmark-outline"}
              size={18}
              color={post.isSaved ? Colors.textPrimary : Colors.textSecondary}
            />
          </TouchableOpacity>
        </View>

        
      </View>
            <View className="mx-4 mb-4 h-px bg-border" />

    </View>
  );
}
