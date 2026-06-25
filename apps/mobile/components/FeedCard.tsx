import { useRef, useState } from "react";
import {
  Animated,
  View,
  Text,
  Image,
  TouchableOpacity,
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";

const { width } = Dimensions.get("window");
const mediaWidth = width - 24;

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
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [mediaAspectRatios, setMediaAspectRatios] = useState<
    Record<string, number>
  >({});
  const lastTap = useRef(0);
  const tapTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heartScale = useRef(new Animated.Value(0)).current;
  const heartOpacity = useRef(new Animated.Value(0)).current;
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
  const activeMediaUrl = post.mediaUrls?.[activeMediaIndex];
  const activeAspectRatio = activeMediaUrl
    ? mediaAspectRatios[activeMediaUrl]
    : undefined;
  const mediaAspectRatio = activeAspectRatio || 4 / 5;

  const handleMediaScrollEnd = (
    event: NativeSyntheticEvent<NativeScrollEvent>,
  ) => {
    const nextIndex = Math.round(
      event.nativeEvent.contentOffset.x / mediaWidth,
    );
    setActiveMediaIndex(nextIndex);
  };

  const handleMediaPress = () => {
    const now = Date.now();
    const isDoubleTap = now - lastTap.current < 280;
    lastTap.current = now;

    if (isDoubleTap) {
      if (tapTimeout.current) {
        clearTimeout(tapTimeout.current);
        tapTimeout.current = null;
      }
      Animated.parallel([
        Animated.sequence([
          Animated.spring(heartScale, {
            toValue: 1,
            friction: 4,
            tension: 110,
            useNativeDriver: true,
          }),
          Animated.timing(heartScale, {
            toValue: 0.82,
            duration: 120,
            useNativeDriver: true,
          }),
          Animated.timing(heartScale, {
            toValue: 1.08,
            duration: 120,
            useNativeDriver: true,
          }),
          Animated.timing(heartScale, {
            toValue: 0,
            duration: 220,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(heartOpacity, {
            toValue: 1,
            duration: 80,
            useNativeDriver: true,
          }),
          Animated.delay(520),
          Animated.timing(heartOpacity, {
            toValue: 0,
            duration: 180,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
      if (!post.isLiked) {
        onLikePress?.(post.id, post.isLiked);
      }
      return;
    }

    tapTimeout.current = setTimeout(() => {
      setViewerOpen(true);
      tapTimeout.current = null;
    }, 220);
  };

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
          style={{ aspectRatio: mediaAspectRatio }}
        >
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={handleMediaScrollEnd}
          >
            {post.mediaUrls!.map((mediaUrl) => (
              <Pressable
                key={mediaUrl}
                onPress={handleMediaPress}
                style={{ aspectRatio: mediaAspectRatio, width: mediaWidth }}
              >
                <Image
                  source={{ uri: mediaUrl }}
                  className="h-full w-full"
                  resizeMode="cover"
                  onLoad={(event) => {
                    const source = event.nativeEvent.source;
                    if (!source?.width || !source?.height) return;

                    setMediaAspectRatios((current) => ({
                      ...current,
                      [mediaUrl]: source.width / source.height,
                    }));
                  }}
                />
              </Pressable>
            ))}
          </ScrollView>

          {post.mediaUrls!.length > 1 ? (
            <View className="absolute right-3 top-3">
            <View className="rounded-full bg-black/55 px-3 py-1.5">
              <Text className="text-xs font-extrabold text-white">
                {activeMediaIndex + 1}/{post.mediaUrls?.length || 1}
              </Text>
            </View>
          </View>
          ) : null}

          {post.mediaUrls!.length > 1 ? (
            <View className="absolute top-3 left-0 right-0 flex-row justify-center">
              {post.mediaUrls!.map((mediaUrl, index) => (
                <View
                  key={`dot-${mediaUrl}`}
                  className={`mx-1 h-1.5 rounded-full ${
                    index === activeMediaIndex ? "w-5 bg-white" : "w-1.5 bg-white/45"
                  }`}
                />
              ))}
            </View>
          ) : null}

          <Animated.View
            pointerEvents="none"
            className="absolute inset-0 items-center justify-center"
            style={{
              opacity: heartOpacity,
              transform: [{ scale: heartScale }],
            }}
          >
            <View className="h-24 w-24 items-center justify-center">
              <Ionicons name="heart" size={82} color={Colors.white} />
            </View>
          </Animated.View>
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
            <Text className="ml-1.5 text-xs font-bold text-text-secondary">
              {post.commentsCount}
            </Text>
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

      <Modal
        visible={viewerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setViewerOpen(false)}
      >
        <View className="flex-1 bg-black">
          <View className="absolute left-0 right-0 top-0 z-10 flex-row items-center justify-between px-4 pt-12">
            <TouchableOpacity
              className="h-11 w-11 items-center justify-center rounded-full bg-white/15"
              onPress={() => setViewerOpen(false)}
              activeOpacity={0.78}
            >
              <Ionicons name="close" size={22} color={Colors.white} />
            </TouchableOpacity>
            <View className="rounded-full bg-white/15 px-3 py-2">
              <Text className="text-xs font-extrabold text-white">
                {activeMediaIndex + 1}/{post.mediaUrls?.length || 1}
              </Text>
            </View>
          </View>

          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={handleMediaScrollEnd}
            contentOffset={{ x: activeMediaIndex * width, y: 0 }}
          >
            {(post.mediaUrls || []).map((mediaUrl) => (
              <View
                key={`viewer-${mediaUrl}`}
                className="items-center justify-center"
                style={{ width }}
              >
                <Image
                  source={{ uri: mediaUrl }}
                  className="h-full w-full"
                  resizeMode="contain"
                />
              </View>
            ))}
          </ScrollView>
        </View>
      </Modal>

    </View>
  );
}
