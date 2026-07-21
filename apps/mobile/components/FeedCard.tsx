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
  Share,
  ScrollView,
  TextInput,
  ActivityIndicator,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";
import * as Haptics from "expo-haptics";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import {
  useChatConversationsQuery,
  useSharePostMutation,
} from "@/hooks/useChat";
import { useAuthStore } from "@/store/authStore";
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  Easing,
} from "react-native-reanimated";

const { width } = Dimensions.get("window");
const mediaWidth = width;

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

const MIN_MEDIA_RATIO = 4 / 5;   // 0.8 (tallest portrait)
const MAX_MEDIA_RATIO = 16 / 9;  // 1.77 (widest landscape)

const normalizeAspectRatio = (ratio: number) => {
  if (!Number.isFinite(ratio) || ratio <= 0) return 4 / 5;
  return Math.min(Math.max(ratio, MIN_MEDIA_RATIO), MAX_MEDIA_RATIO);
};

interface ZoomableImageProps {
  uri: string;
  width: number;
  aspectRatio: number;
  onLoad?: (event: any) => void;
}

function ZoomableImage({ uri, width, aspectRatio, onLoad }: ZoomableImageProps) {
  const scale = useSharedValue(1);
  const focalX = useSharedValue(0);
  const focalY = useSharedValue(0);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  const pinchGesture = Gesture.Pinch()
    .onStart((event) => {
      focalX.value = event.focalX;
      focalY.value = event.focalY;
    })
    .onUpdate((event) => {
      scale.value = Math.max(1, event.scale);
      translateX.value = (width / 2 - focalX.value) * (scale.value - 1);
      translateY.value = ((width / aspectRatio) / 2 - focalY.value) * (scale.value - 1);
    })
    .onEnd(() => {
      scale.value = withSpring(1);
      translateX.value = withSpring(0);
      translateY.value = withSpring(0);
    });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: scale.value },
      ],
      zIndex: scale.value > 1 ? 9999 : 1,
    };
  });

  return (
    <GestureDetector gesture={pinchGesture}>
      <Reanimated.Image
        source={{ uri }}
        style={[
          { width, aspectRatio },
          animatedStyle,
        ]}
        resizeMode="cover"
        onLoad={onLoad}
      />
    </GestureDetector>
  );
}

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
  const [actionSheetVisible, setActionSheetVisible] = useState(false);
  const [shareSheetVisible, setShareSheetVisible] = useState(false);
  const [selectedShareChatIds, setSelectedShareChatIds] = useState<string[]>([]);
  const [shareSearch, setShareSearch] = useState("");
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);

  const [mediaAspectRatios, setMediaAspectRatios] = useState<
    Record<string, number>
  >({});

  const lastTap = useRef(0);

  const heartScale = useRef(new Animated.Value(0)).current;
  const heartOpacity = useRef(new Animated.Value(0)).current;
  const actionSheetProgress = useRef(new Animated.Value(0)).current;
  const shareSheetProgress = useRef(new Animated.Value(0)).current;

  const currentUserId = useAuthStore((state) => state.user?.id);
  const {
    data: shareConversations = [],
    isLoading: shareConversationsLoading,
    isError: shareConversationsError,
    refetch: refetchShareConversations,
  } = useChatConversationsQuery(shareSheetVisible);
  const sharePostMutation = useSharePostMutation();

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

  const shareRecipients = shareConversations
    .filter((conversation) => conversation.status === "ACTIVE")
    .map((conversation) => {
      const participant =
        conversation.user1Id === currentUserId
          ? conversation.user2
          : conversation.user1;
      const name =
        participant?.profile?.username || participant?.username || "Datebl user";

      return {
        chatId: conversation.id,
        userId: participant?.id,
        name,
        avatarUrl: participant?.profile?.avatarUrl || null,
      };
    });

  const normalizedShareSearch = shareSearch.trim().toLowerCase();
  const visibleShareRecipients = normalizedShareSearch
    ? shareRecipients.filter((recipient) =>
        recipient.name.toLowerCase().includes(normalizedShareSearch),
      )
    : shareRecipients;
  const selectedShareRecipients = shareRecipients.filter((recipient) =>
    selectedShareChatIds.includes(recipient.chatId),
  );

  const activeMediaUrl = post.mediaUrls?.[activeMediaIndex];
  const postUrl = `https://datebl.app/posts/${post.id}`;
  const shareTitle = `${displayName} on Datebl`;
  const shareMessage = `${displayName} shared a post on Datebl.` + "\n" + postUrl;

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
      playDoubleTapHeart();

      if (!post.isLiked) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        onLikePress?.(post.id, post.isLiked);
      }
    }
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
    outputRange: [380, 0],
  });

  const shareSheetOpacity = shareSheetProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.62],
  });

  const shareSheetTranslateY = shareSheetProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [420, 0],
  });

  const handleOpenPostActions = () => {
    setActionSheetVisible(true);
    actionSheetProgress.setValue(0);
    Animated.timing(actionSheetProgress, {
      toValue: 1,
      duration: 250,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  const handleClosePostActions = () => {
    Animated.timing(actionSheetProgress, {
      toValue: 0,
      duration: 180,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setActionSheetVisible(false);
      }
    });
  };

  const handleOpenShareSheet = () => {
    setSelectedShareChatIds([]);
    setShareSearch("");
    setShareFeedback(null);
    setShareSheetVisible(true);
    shareSheetProgress.setValue(0);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    Animated.timing(shareSheetProgress, {
      toValue: 1,
      duration: 250,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  const handleCloseShareSheet = () => {
    Animated.timing(shareSheetProgress, {
      toValue: 0,
      duration: 180,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setShareSheetVisible(false);
      }
    });
  };

  const handleNativeShare = async () => {
    try {
      await Share.share({
        title: shareTitle,
        message: shareMessage,
        url: postUrl,
      });
    } catch {
      // The native share dialog can fail or be dismissed without app-side recovery.
    }
  };

  const handleRecipientPress = (chatId: string) => {
    Haptics.selectionAsync().catch(() => {});
    setShareFeedback(null);
    setSelectedShareChatIds((currentIds) => {
      if (currentIds.includes(chatId)) {
        return currentIds.filter((currentId) => currentId !== chatId);
      }
      return currentIds.length >= 10 ? currentIds : [...currentIds, chatId];
    });
  };

  const handleSendToRecipients = async () => {
    if (selectedShareChatIds.length === 0) {
      handleNativeShare();
      return;
    }

    setShareFeedback(null);
    try {
      const result = await sharePostMutation.mutateAsync({
        postId: post.id,
        chatIds: selectedShareChatIds,
      });

      if (result.sharedCount > 0) {
        Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        ).catch(() => {});
        onMoreAction?.(post.id, "share");
      }

      if (result.failedCount === 0) {
        setShareFeedback(
          result.sharedCount === 1
            ? "Post sent"
            : `Post sent to ${result.sharedCount} chats`,
        );
        setTimeout(handleCloseShareSheet, 650);
        return;
      }

      const failedChatIds = result.results
        .filter((item) => !item.success)
        .map((item) => item.chatId);
      setSelectedShareChatIds(failedChatIds);
      setShareFeedback(
        result.sharedCount > 0
          ? `Sent to ${result.sharedCount}; ${result.failedCount} failed`
          : "Could not send this post. Try again.",
      );
    } catch (error) {
      setShareFeedback(
        error instanceof Error ? error.message : "Unable to share post",
      );
    }
  };

  const handlePostActionPress = (action: FeedPostAction) => {
    if (action === "share") {
      onMoreAction?.(post.id, action);
      handleClosePostActions();
      setTimeout(handleOpenShareSheet, 210);
      return;
    }

    onMoreAction?.(post.id, action);
    handleClosePostActions();
  };

  return (
    <View>
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
          className="bg-bg-elevated"
          style={{
            width: mediaWidth,
            aspectRatio: mediaAspectRatio,
            zIndex: 1, // base zIndex
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
                  <ZoomableImage
                    uri={mediaUrl}
                    width={mediaWidth}
                    aspectRatio={currentRatio}
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
            onPress={handleOpenShareSheet}
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
            style={{ transform: [{ translateY: actionSheetTranslateY }] }}
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

      <Modal
        visible={shareSheetVisible}
        transparent
        animationType="none"
        onRequestClose={handleCloseShareSheet}
      >
        <View className="flex-1 justify-end">
          <Animated.View
            pointerEvents="none"
            className="absolute inset-0 bg-black"
            style={{ opacity: shareSheetOpacity }}
          />

          <Pressable
            className="absolute inset-0"
            onPress={handleCloseShareSheet}
          />

          <Animated.View
            className="rounded-t-[32px] border border-border bg-bg-card px-4 pb-8 pt-3"
            style={{ transform: [{ translateY: shareSheetTranslateY }] }}
          >
            <View className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-border" />

            <View className="mb-5 flex-row items-center">
              <View className="mr-3 h-14 w-14 overflow-hidden rounded-[18px] border border-border bg-bg-elevated">
                {activeMediaUrl ? (
                  <Image
                    source={{ uri: activeMediaUrl }}
                    className="h-full w-full"
                    resizeMode="cover"
                  />
                ) : (
                  <View className="h-full w-full items-center justify-center">
                    <Ionicons
                      name="chatbubble-ellipses-outline"
                      size={22}
                      color={Colors.textSecondary}
                    />
                  </View>
                )}
              </View>

              <View className="min-w-0 flex-1">
                <Text
                  className="text-base font-extrabold text-text-primary"
                  numberOfLines={1}
                >
                  Share post
                </Text>
                <Text
                  className="mt-0.5 text-xs font-medium text-text-secondary"
                  numberOfLines={1}
                >
                  {shareTitle}
                </Text>
              </View>

              <TouchableOpacity
                activeOpacity={0.76}
                onPress={handleCloseShareSheet}
                className="h-10 w-10 items-center justify-center rounded-full bg-bg-elevated"
              >
                <Ionicons name="close" size={20} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <View className="mb-4 h-12 flex-row items-center rounded-2xl border border-border bg-bg-input px-3.5">
              <Ionicons name="search" size={18} color={Colors.textMuted} />
              <TextInput
                value={shareSearch}
                onChangeText={setShareSearch}
                placeholder="Search chats"
                placeholderTextColor={Colors.textMuted}
                className="ml-2 min-w-0 flex-1 text-sm font-semibold text-text-primary"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="search"
              />
              {shareSearch.length > 0 ? (
                <TouchableOpacity
                  onPress={() => setShareSearch("")}
                  className="h-8 w-8 items-center justify-center rounded-full"
                >
                  <Ionicons
                    name="close-circle"
                    size={18}
                    color={Colors.textMuted}
                  />
                </TouchableOpacity>
              ) : null}
            </View>

            <View className="mb-3 flex-row items-center justify-between">
              <Text className="text-sm font-extrabold text-text-primary">
                {normalizedShareSearch ? "Search results" : "Recent chats"}
              </Text>
              {selectedShareChatIds.length > 0 ? (
                <Text className="text-xs font-bold text-primary">
                  {selectedShareChatIds.length} selected
                </Text>
              ) : null}
            </View>

            {shareConversationsLoading ? (
              <View className="mb-5 h-[86px] items-center justify-center">
                <ActivityIndicator size="small" color={Colors.primary} />
              </View>
            ) : shareConversationsError ? (
              <TouchableOpacity
                activeOpacity={0.78}
                onPress={() => refetchShareConversations()}
                className="mb-5 h-[86px] items-center justify-center rounded-2xl border border-border bg-bg-elevated px-4"
              >
                <Ionicons
                  name="refresh-outline"
                  size={20}
                  color={Colors.textSecondary}
                />
                <Text className="mt-1 text-xs font-bold text-text-secondary">
                  Could not load chats. Tap to retry.
                </Text>
              </TouchableOpacity>
            ) : visibleShareRecipients.length === 0 ? (
              <View className="mb-5 h-[86px] items-center justify-center rounded-2xl border border-border bg-bg-elevated px-4">
                <Text className="text-sm font-bold text-text-primary">
                  {normalizedShareSearch ? "No chats found" : "No active chats yet"}
                </Text>
                <Text className="mt-1 text-center text-xs font-medium text-text-secondary">
                  {normalizedShareSearch
                    ? "Try a different name"
                    : "Start a conversation to share posts here"}
                </Text>
              </View>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="-mx-4 mb-5"
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}
              >
                {visibleShareRecipients.map((recipient) => {
                  const isSelected = selectedShareChatIds.includes(
                    recipient.chatId,
                  );

                  return (
                    <TouchableOpacity
                      key={recipient.chatId}
                      activeOpacity={0.8}
                      onPress={() => handleRecipientPress(recipient.chatId)}
                      className="w-[68px] items-center"
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: isSelected }}
                      accessibilityLabel={`Share with ${recipient.name}`}
                    >
                      <View
                        className={`h-[58px] w-[58px] items-center justify-center rounded-full border-2 p-0.5 ${
                          isSelected ? "border-primary" : "border-border"
                        }`}
                      >
                        {recipient.avatarUrl ? (
                          <Image
                            source={{ uri: recipient.avatarUrl }}
                            className="h-full w-full rounded-full bg-bg-elevated"
                            resizeMode="cover"
                          />
                        ) : (
                          <View className="h-full w-full items-center justify-center rounded-full bg-bg-elevated">
                            <Ionicons
                              name="person"
                              size={21}
                              color={Colors.textSecondary}
                            />
                          </View>
                        )}

                        {isSelected ? (
                          <View className="absolute -bottom-0.5 -right-0.5 h-5 w-5 items-center justify-center rounded-full border-2 border-bg-card bg-primary">
                            <Ionicons
                              name="checkmark"
                              size={11}
                              color={Colors.textInverse}
                            />
                          </View>
                        ) : null}
                      </View>

                      <Text
                        className={`mt-2 w-full text-center text-xs ${
                          isSelected
                            ? "font-extrabold text-text-primary"
                            : "font-semibold text-text-secondary"
                        }`}
                        numberOfLines={1}
                      >
                        {recipient.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            {shareFeedback ? (
              <View className="mb-4 flex-row items-center rounded-xl bg-bg-elevated px-3 py-2.5">
                <Ionicons
                  name={
                    shareFeedback.startsWith("Post sent")
                      ? "checkmark-circle"
                      : "alert-circle-outline"
                  }
                  size={17}
                  color={
                    shareFeedback.startsWith("Post sent")
                      ? Colors.success
                      : Colors.error
                  }
                />
                <Text className="ml-2 min-w-0 flex-1 text-xs font-bold text-text-secondary">
                  {shareFeedback}
                </Text>
              </View>
            ) : null}
            <TouchableOpacity
              activeOpacity={0.82}
              onPress={handleSendToRecipients}
              disabled={sharePostMutation.isPending}
              className={`h-12 flex-row items-center justify-center rounded-full px-5 ${
                sharePostMutation.isPending ? "bg-bg-elevated" : "bg-primary"
              }`}
            >
              {sharePostMutation.isPending ? (
                <ActivityIndicator size="small" color={Colors.textSecondary} />
              ) : (
                <Ionicons
                  name={
                    selectedShareChatIds.length > 0
                      ? "paper-plane"
                      : "share-social-outline"
                  }
                  size={18}
                  color={Colors.textInverse}
                />
              )}
              <Text
                className={`ml-2 text-sm font-extrabold ${
                  sharePostMutation.isPending
                    ? "text-text-secondary"
                    : "text-text-inverse"
                }`}
              >
                {sharePostMutation.isPending
                  ? "Sending..."
                  : selectedShareChatIds.length === 1
                    ? `Send to ${selectedShareRecipients[0]?.name}`
                    : selectedShareChatIds.length > 1
                      ? `Send to ${selectedShareChatIds.length} chats`
                      : "Share another way"}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}
