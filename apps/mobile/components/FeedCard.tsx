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

export type FeedPostAction =
  | "edit"
  | "delete"
  | "comments"
  | "report"
  | "hide"
  | "block"
  | "copy"
  | "share";

type FeedActionItem = {
  id: FeedPostAction;
  label: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  destructive?: boolean;
};

/**
 * Feed-safe aspect ratio limits
 *
 * 4 / 5  = portrait post
 * 1 / 1  = square post
 *
 * This keeps the feed clean.
 * The full-screen viewer still uses resizeMode="contain",
 * so users can see the complete image there.
 */
const MIN_MEDIA_RATIO = 4 / 5;
const MAX_MEDIA_RATIO = 1 / 1;

const normalizeAspectRatio = (ratio: number) => {
  if (!Number.isFinite(ratio) || ratio <= 0) return 4 / 5;

  return Math.min(Math.max(ratio, MIN_MEDIA_RATIO), MAX_MEDIA_RATIO);
};

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
    isOwnPost?: boolean;
    timeAgo: string;
  };
  onLikePress?: (postId: string, isLiked?: boolean) => void;
  onCommentPress?: (postId: string) => void;
  onSavePress?: (postId: string, isSaved?: boolean) => void;
  onMoreAction?: (postId: string, action: FeedPostAction) => void;
}

export default function FeedCard({
  post,
  onLikePress,
  onCommentPress,
  onSavePress,
  onMoreAction,
}: FeedCardProps) {
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [actionSheetVisible, setActionSheetVisible] = useState(false);

  const [mediaAspectRatios, setMediaAspectRatios] = useState<
    Record<string, number>
  >({});

  const lastTap = useRef(0);
  const tapTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const heartScale = useRef(new Animated.Value(0)).current;
  const heartOpacity = useRef(new Animated.Value(0)).current;
  const actionSheetProgress = useRef(new Animated.Value(0)).current;

  const hasImage = Boolean(post.mediaUrls?.length);

  const displayName = post.isAnonymous ? "Anonymous" : post.author.username;
  const isOwnPost = Boolean(post.isOwnPost);

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

  const mediaAspectRatio = activeAspectRatio
    ? normalizeAspectRatio(activeAspectRatio)
    : 4 / 5;

  const handleMediaScrollEnd = (
    event: NativeSyntheticEvent<NativeScrollEvent>,
  ) => {
    const nextIndex = Math.round(
      event.nativeEvent.contentOffset.x / mediaWidth,
    );

    setActiveMediaIndex(nextIndex);
  };

  const handleViewerScrollEnd = (
    event: NativeSyntheticEvent<NativeScrollEvent>,
  ) => {
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / width);

    setActiveMediaIndex(nextIndex);
  };

  const playDoubleTapHeart = () => {
    heartScale.setValue(0);
    heartOpacity.setValue(0);

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

      playDoubleTapHeart();

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

  const actionItems: FeedActionItem[] = isOwnPost
    ? [
        {
          id: "edit",
          label: "Edit post",
          description: "Update caption or media",
          icon: "create-outline",
        },
        {
          id: "comments",
          label: "Turn off comments",
          description: "Pause new replies on this post",
          icon: "chatbubble-ellipses-outline",
        },
        {
          id: "copy",
          label: "Copy link",
          description: "Share a direct post link",
          icon: "link-outline",
        },
        {
          id: "share",
          label: "Share",
          description: "Send this post outside the app",
          icon: "paper-plane-outline",
        },
        {
          id: "delete",
          label: "Delete post",
          description: "Remove it from your feed",
          icon: "trash-outline",
          destructive: true,
        },
      ]
    : [
        {
          id: "report",
          label: "Report post",
          description: "Flag unsafe or unwanted content",
          icon: "flag-outline",
          destructive: true,
        },
        {
          id: "hide",
          label: "Hide post",
          description: "See fewer posts like this",
          icon: "eye-off-outline",
        },
        {
          id: "block",
          label: "Block user",
          description: "Stop seeing each other",
          icon: "ban-outline",
          destructive: true,
        },
        {
          id: "copy",
          label: "Copy link",
          description: "Share a direct post link",
          icon: "link-outline",
        },
        {
          id: "share",
          label: "Share",
          description: "Send this post outside the app",
          icon: "paper-plane-outline",
        },
      ];

  const actionSheetOpacity = actionSheetProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.62],
  });

  const actionSheetTranslateY = actionSheetProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [360, 0],
  });

  const handleOpenPostActions = () => {
    setActionSheetVisible(true);
    actionSheetProgress.setValue(0);

    requestAnimationFrame(() => {
      Animated.spring(actionSheetProgress, {
        toValue: 1,
        damping: 22,
        mass: 0.9,
        stiffness: 220,
        useNativeDriver: true,
      }).start();
    });
  };

  const handleClosePostActions = () => {
    Animated.timing(actionSheetProgress, {
      toValue: 0,
      duration: 180,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setActionSheetVisible(false);
      }
    });
  };

  const handlePostActionPress = (action: FeedPostAction) => {
    onMoreAction?.(post.id, action);
    handleClosePostActions();
  };

  return (
    <View className="overflow-hidden">
      <View className="flex-row items-center justify-between px-4 py-4">
        <View className="min-w-0 flex-1 flex-row items-center">
          <View className="mr-3 h-12 w-12 overflow-hidden rounded-full border border-border bg-bg-elevated">
            {avatarUrl ? (
              <Image
                source={{ uri: avatarUrl }}
                className="h-full w-full"
                resizeMode="cover"
              />
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
          onPress={handleOpenPostActions}
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
          style={{
            width: mediaWidth,
            aspectRatio: mediaAspectRatio,
          }}
        >
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={handleMediaScrollEnd}
          >
            {post.mediaUrls!.map((mediaUrl) => {
              const currentRatio = mediaAspectRatios[mediaUrl]
                ? normalizeAspectRatio(mediaAspectRatios[mediaUrl])
                : mediaAspectRatio;

              return (
                <Pressable
                  key={mediaUrl}
                  onPress={handleMediaPress}
                  style={{
                    width: mediaWidth,
                    aspectRatio: currentRatio,
                  }}
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
              );
            })}
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
            <View className="absolute left-0 right-0 top-3 flex-row justify-center">
              {post.mediaUrls!.map((mediaUrl, index) => (
                <View
                  key={`dot-${mediaUrl}`}
                  className={`mx-1 h-1.5 rounded-full ${
                    index === activeMediaIndex
                      ? "w-5 bg-white"
                      : "w-1.5 bg-white/45"
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
        {hasImage ? (
          <Text className="text-base leading-6 text-text-secondary">
            <Text className="font-extrabold text-text-primary">
              {displayName}{" "}
            </Text>
            {post.caption || "Shared a fresh moment from the city."}
          </Text>
        ) : null}

        <View className="mt-4 flex-row items-center justify-between">
          <View className="mr-3 min-w-0 flex-1 flex-row items-center">
            {reactionAvatars.map((avatar, index) => (
              <Image
                key={avatar}
                source={{ uri: avatar }}
                className="h-7 w-7 rounded-full border-2 border-bg-card bg-bg-elevated"
                style={{
                  marginLeft: index === 0 ? 0 : -8,
                }}
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
              post.isLiked
                ? "border border-primary-light bg-primary-light"
                : "border border-border bg-bg-elevated"
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
            onMomentumScrollEnd={handleViewerScrollEnd}
            contentOffset={{
              x: activeMediaIndex * width,
              y: 0,
            }}
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

      <Modal
        visible={actionSheetVisible}
        transparent
        animationType="none"
        onRequestClose={handleClosePostActions}
      >
        <View className="flex-1 justify-end">
          <Animated.View
            pointerEvents="none"
            className="absolute inset-0 bg-black"
            style={{ opacity: actionSheetOpacity }}
          />

          <Pressable
            className="absolute inset-0"
            onPress={handleClosePostActions}
          />

          <Animated.View
            className="rounded-t-[32px] border border-border bg-bg-card px-4 pb-8 pt-3"
            style={{
              transform: [{ translateY: actionSheetTranslateY }],
            }}
          >
            <View className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-border" />

            <View className="mb-3 flex-row items-center">
              <View className="mr-3 h-12 w-12 overflow-hidden rounded-full border border-border bg-bg-elevated">
                {avatarUrl ? (
                  <Image
                    source={{ uri: avatarUrl }}
                    className="h-full w-full"
                    resizeMode="cover"
                  />
                ) : (
                  <View className="h-full w-full items-center justify-center bg-bg-elevated">
                    <Ionicons
                      name="eye-off-outline"
                      size={20}
                      color={Colors.textMuted}
                    />
                  </View>
                )}
              </View>

              <View className="min-w-0 flex-1">
                <Text
                  className="text-base font-extrabold text-text-primary"
                  numberOfLines={1}
                >
                  {isOwnPost ? "Post options" : displayName}
                </Text>
                <Text
                  className="mt-0.5 text-xs font-medium text-text-secondary"
                  numberOfLines={1}
                >
                  {isOwnPost ? "Manage this post" : "Choose what to do with this post"}
                </Text>
              </View>

              <TouchableOpacity
                activeOpacity={0.76}
                onPress={handleClosePostActions}
                className="h-10 w-10 items-center justify-center rounded-full bg-bg-elevated"
              >
                <Ionicons name="close" size={20} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <View className="overflow-hidden rounded-[24px] border border-border bg-bg-elevated">
              {actionItems.map((item, index) => (
                <TouchableOpacity
                  key={item.id}
                  activeOpacity={0.78}
                  onPress={() => handlePostActionPress(item.id)}
                  className={`flex-row items-center px-4 py-3.5 ${
                    index === actionItems.length - 1 ? "" : "border-b border-border"
                  }`}
                >
                  <View
                    className={`mr-3 h-10 w-10 items-center justify-center rounded-full ${
                      item.destructive ? "bg-error/10" : "bg-bg-card"
                    }`}
                  >
                    <Ionicons
                      name={item.icon}
                      size={19}
                      color={item.destructive ? Colors.error : Colors.textPrimary}
                    />
                  </View>

                  <View className="min-w-0 flex-1">
                    <Text
                      className={`text-[15px] font-extrabold ${
                        item.destructive ? "text-error" : "text-text-primary"
                      }`}
                    >
                      {item.label}
                    </Text>
                    <Text
                      className="mt-0.5 text-xs font-medium text-text-secondary"
                      numberOfLines={1}
                    >
                      {item.description}
                    </Text>
                  </View>

                  <Ionicons
                    name="chevron-forward"
                    size={17}
                    color={Colors.textMuted}
                  />
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}
