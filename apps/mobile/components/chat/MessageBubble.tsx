import React, { useEffect } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { Colors } from "@/constants/colors";
import type { ChatMessage } from "@/types/chat.types";

export type MessageReplyPreview = {
  title: string;
  body: string;
};

export type MessageDeliveryStatus =
  | "sending"
  | "failed"
  | "sent"
  | "delivered"
  | "read";

export type GroupedReaction = {
  emoji: string;
  count: number;
  reactedByMe: boolean;
};

type MessageBubbleProps = {
  message: ChatMessage & {
    isPending?: boolean;
    sendStatus?: MessageDeliveryStatus;
  };
  isMine: boolean;
  avatarUrl?: string;
  /** Single emoji string for local-optimistic display (legacy / simple path) */
  reaction?: string;
  /** Grouped reactions from server (preferred when available) */
  groupedReactions?: GroupedReaction[];
  replyPreview?: MessageReplyPreview | null;
  showAvatar?: boolean;
  deliveryStatus?: MessageDeliveryStatus;
  isHighlighted?: boolean;
  onLongPress?: () => void;
  onSwipeReply?: () => void;
  onReplyPreviewPress?: () => void;
  onRetry?: () => void;
  /** Called when the user taps the reaction pill — passes the current emoji (or null if none) */
  onReactionPress?: (currentEmoji: string | null) => void;
};

const SWIPE_REPLY_DISTANCE = 58;
const SWIPE_MAX_TRANSLATE = 76;

const formatTime = (value?: string) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
};

const getDeliveryIcon = (status?: MessageDeliveryStatus) => {
  switch (status) {
    case "sending":
      return "time-outline";
    case "failed":
      return "alert-circle";
    case "read":
      return "checkmark-done";
    case "delivered":
      return "checkmark-done";
    default:
      return "checkmark";
  }
};

const getDeliveryLabel = (status?: MessageDeliveryStatus) => {
  switch (status) {
    case "sending":
      return "Sending";
    case "failed":
      return "Failed";
    case "read":
      return "Read";
    case "delivered":
      return "Delivered";
    default:
      return "Sent";
  }
};

// ─── Reaction Pill ────────────────────────────────────────────────────────────

type ReactionPillProps = {
  emoji: string;
  count?: number;
  reactedByMe?: boolean;
  onPress?: () => void;
};

const ReactionPill = ({
  emoji,
  count,
  reactedByMe = false,
  onPress,
}: ReactionPillProps) => {
  const scale = useSharedValue(0.4);
  const opacity = useSharedValue(0);

  useEffect(() => {
    scale.value = withSpring(1, { damping: 14, stiffness: 280, mass: 0.7 });
    opacity.value = withTiming(1, { duration: 160 });
  }, [opacity, scale]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={animStyle}>
      <Pressable
        onPress={onPress}
        disabled={!onPress}
        style={[
          styles.reactionPill,
          reactedByMe && styles.reactionPillMine,
        ]}
      >
        <Text style={styles.reactionEmoji}>{emoji}</Text>
        {count !== undefined && count > 1 ? (
          <Text
            style={[
              styles.reactionCount,
              reactedByMe && styles.reactionCountMine,
            ]}
          >
            {count}
          </Text>
        ) : null}
      </Pressable>
    </Animated.View>
  );
};

// ─── MessageBubble ─────────────────────────────────────────────────────────────

export const MessageBubble = ({
  message,
  isMine,
  avatarUrl: fallbackAvatarUrl,
  reaction,
  groupedReactions,
  replyPreview,
  showAvatar = false,
  deliveryStatus,
  isHighlighted = false,
  onLongPress,
  onSwipeReply,
  onReplyPreviewPress,
  onRetry,
  onReactionPress,
}: MessageBubbleProps) => {
  const router = useRouter();
  const translateX = useSharedValue(0);
  const avatarUrl = message.sender?.profile?.avatarUrl || fallbackAvatarUrl;
  const status = deliveryStatus || message.sendStatus;
  const timeLabel = formatTime(message.createdAt);
  const hasStoryPreview = Boolean(
    message.storyPreviewMediaUrl || message.storyPreviewCaption || message.storyId,
  );
  const hasPostPreview =
    !message.isDeleted && message.type === "POST" && Boolean(message.postId);
  const storyLabel =
    message.storyAuthorId && message.storyAuthorId === message.senderId
      ? "Replied to their story"
      : isMine
        ? "You replied to their story"
        : "Replied to your story";
  const content =
    message.content ||
    (message.mediaUrl
      ? "Shared media"
      : message.isDeleted
        ? "Message deleted"
        : "");

  // Resolve what reactions to display: grouped (server) > single emoji (local)
  const displayReactions: GroupedReaction[] = (() => {
    if (groupedReactions && groupedReactions.length > 0) return groupedReactions;
    if (reaction) return [{ emoji: reaction, count: 1, reactedByMe: isMine }];
    return [];
  })();

  const panGesture = Gesture.Pan()
    .enabled(Boolean(onSwipeReply))
    .activeOffsetX([-12, 12])
    .failOffsetY([-12, 12])
    .onUpdate((event) => {
      translateX.value = Math.max(
        -SWIPE_MAX_TRANSLATE,
        Math.min(SWIPE_MAX_TRANSLATE, event.translationX),
      );
    })
    .onEnd(() => {
      const shouldReply = Math.abs(translateX.value) >= SWIPE_REPLY_DISTANCE;
      translateX.value = withSpring(0, { damping: 18, stiffness: 230 });

      if (shouldReply && onSwipeReply) {
        runOnJS(onSwipeReply)();
      }
    })
    .onFinalize(() => {
      translateX.value = withSpring(0, { damping: 18, stiffness: 230 });
    });

  const bubbleAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const leftReplyIconStyle = useAnimatedStyle(() => {
    const progress = Math.max(0, translateX.value) / SWIPE_REPLY_DISTANCE;

    return {
      opacity: interpolate(
        progress,
        [0, 0.45, 1],
        [0, 0.75, 1],
        Extrapolation.CLAMP,
      ),
      transform: [
        {
          scale: interpolate(progress, [0, 1], [0.75, 1], Extrapolation.CLAMP),
        },
        {
          translateX: interpolate(
            progress,
            [0, 1],
            [-10, 0],
            Extrapolation.CLAMP,
          ),
        },
      ],
    };
  });

  const rightReplyIconStyle = useAnimatedStyle(() => {
    const progress = Math.max(0, -translateX.value) / SWIPE_REPLY_DISTANCE;

    return {
      opacity: interpolate(
        progress,
        [0, 0.45, 1],
        [0, 0.75, 1],
        Extrapolation.CLAMP,
      ),
      transform: [
        {
          scale: interpolate(progress, [0, 1], [0.75, 1], Extrapolation.CLAMP),
        },
        {
          translateX: interpolate(
            progress,
            [0, 1],
            [10, 0],
            Extrapolation.CLAMP,
          ),
        },
      ],
    };
  });

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View>
        <Animated.View
          pointerEvents="none"
          className="absolute left-11 top-1/2 h-9 w-9 items-center justify-center rounded-full bg-primary-light"
          style={[styles.replyIcon, styles.leftReplyIcon, leftReplyIconStyle]}
        >
          <Ionicons
            name="return-up-back"
            size={17}
            color={Colors.textInverse}
          />
        </Animated.View>

        <Animated.View
          pointerEvents="none"
          className="absolute right-3 top-1/2 h-9 w-9 items-center justify-center rounded-full bg-primary-light"
          style={[styles.replyIcon, rightReplyIconStyle]}
        >
          <Ionicons
            name="return-up-forward"
            size={17}
            color={Colors.textInverse}
          />
        </Animated.View>

        <Animated.View
          className={`flex-row ${isMine ? "justify-end" : "justify-start"}`}
          style={bubbleAnimatedStyle}
        >
          {!isMine && showAvatar ? (
            avatarUrl ? (
              <Image
                source={{ uri: avatarUrl }}
                className="mr-2 mt-1 h-7 w-7 rounded-full bg-bg-elevated"
              />
            ) : (
              <View className="mr-2 mt-1 h-7 w-7 items-center justify-center rounded-full bg-primary-light">
                <Ionicons name="person" size={14} color={Colors.textInverse} />
              </View>
            )
          ) : !isMine ? (
            <View className="mr-2 h-7 w-7" />
          ) : null}

          <View
            className={`max-w-[78%] ${isMine ? "items-end" : "items-start"}`}
          >
            <Pressable
              onLongPress={onLongPress}
              delayLongPress={260}
              disabled={!onLongPress}
              className={`rounded-[22px] px-3.5 py-2.5 ${
                isMine ? "rounded-br-md" : "rounded-bl-md"
              }`}
              style={[
                isMine ? styles.outgoingBubble : styles.incomingBubble,
                isHighlighted ? styles.highlightedBubble : null,
                status === "failed" ? styles.failedBubble : null,
              ]}
            >
              {replyPreview ? (
                <Pressable
                  className={`mb-2.5 flex-row items-center rounded-[16px] px-3 py-2 ${
                    isMine ? "bg-white/15" : "bg-bg-elevated"
                  }`}
                  style={
                    isMine
                      ? styles.outgoingReplyPreview
                      : styles.incomingReplyPreview
                  }
                  onPress={onReplyPreviewPress}
                  disabled={!onReplyPreviewPress}
                >
                  <View
                    className={`mr-2 h-8 w-1 rounded-full ${
                      isMine ? "bg-white/80" : "bg-primary-light"
                    }`}
                  />
                  <View className="min-w-0 flex-1">
                    <Text
                      className={`text-[11px] font-extrabold ${
                        isMine ? "text-inverse" : "text-primary"
                      }`}
                      numberOfLines={1}
                    >
                      {replyPreview.title}
                    </Text>
                    <Text
                      className={`mt-0.5 text-[12px] font-semibold leading-4 ${
                        isMine ? "text-inverse/80" : "text-text-secondary"
                      }`}
                      numberOfLines={2}
                    >
                      {replyPreview.body}
                    </Text>
                  </View>
                </Pressable>
              ) : null}

              {hasStoryPreview ? (
                <View
                  className={`mb-2 overflow-hidden rounded-[18px] border ${
                    isMine ? "border-white/20 bg-white/12" : "border-border bg-bg-elevated"
                  }`}
                >
                  <View className="flex-row items-center px-3 py-2">
                    <View
                      className={`mr-2 h-7 w-7 items-center justify-center rounded-full ${
                        isMine ? "bg-white/18" : "bg-primary-light"
                      }`}
                    >
                      <Ionicons
                        name="play-circle-outline"
                        size={15}
                        color={isMine ? Colors.textInverse : Colors.textInverse}
                      />
                    </View>
                    <Text
                      className={`flex-1 text-[12px] font-extrabold ${
                        isMine ? "text-inverse" : "text-text-primary"
                      }`}
                      numberOfLines={1}
                    >
                      {storyLabel}
                    </Text>
                  </View>
                  {message.storyPreviewMediaUrl ? (
                    <Image
                      source={{ uri: message.storyPreviewMediaUrl }}
                      className="h-28 w-44 bg-bg-elevated"
                      resizeMode="cover"
                    />
                  ) : null}
                  {message.storyPreviewCaption ? (
                    <Text
                      className={`px-3 py-2 text-[12px] font-semibold leading-4 ${
                        isMine ? "text-inverse/82" : "text-text-secondary"
                      }`}
                      numberOfLines={2}
                    >
                      {message.storyPreviewCaption}
                    </Text>
                  ) : null}
                </View>
              ) : null}

              {hasPostPreview ? (
                <Pressable
                  className={`mb-2 w-56 overflow-hidden rounded-[18px] border ${
                    isMine
                      ? "border-white/20 bg-white/12"
                      : "border-border bg-bg-elevated"
                  }`}
                  onPress={() =>
                    router.push({
                      pathname: "/(screens)/post/[postId]",
                      params: { postId: message.postId as string },
                    })
                  }
                >
                  {message.postPreviewMediaUrl ? (
                    <Image
                      source={{ uri: message.postPreviewMediaUrl }}
                      className="h-32 w-full bg-bg-elevated"
                      resizeMode="cover"
                    />
                  ) : (
                    <View className="h-24 w-full items-center justify-center bg-bg-elevated">
                      <Ionicons
                        name="newspaper-outline"
                        size={26}
                        color={Colors.textSecondary}
                      />
                    </View>
                  )}
                  <View className="px-3 py-2.5">
                    <View className="flex-row items-center">
                      <Ionicons
                        name="paper-plane-outline"
                        size={13}
                        color={isMine ? Colors.textInverse : Colors.textSecondary}
                      />
                      <Text
                        className={`ml-1.5 flex-1 text-[11px] font-extrabold ${
                          isMine ? "text-inverse/80" : "text-text-secondary"
                        }`}
                        numberOfLines={1}
                      >
                        {message.postAuthorName || "Shared post"}
                      </Text>
                    </View>
                    {message.postPreviewCaption ? (
                      <Text
                        className={`mt-1.5 text-[13px] font-semibold leading-5 ${
                          isMine ? "text-inverse" : "text-text-primary"
                        }`}
                        numberOfLines={2}
                      >
                        {message.postPreviewCaption}
                      </Text>
                    ) : null}
                    <Text
                      className={`mt-2 text-[11px] font-extrabold ${
                        isMine ? "text-inverse/75" : "text-primary"
                      }`}
                    >
                      View post
                    </Text>
                  </View>
                </Pressable>
              ) : null}
              {message.mediaUrl ? (
                <Image
                  source={{ uri: message.mediaUrl }}
                  className="mb-2 h-44 w-44 rounded-[18px] bg-bg-elevated"
                  resizeMode="cover"
                />
              ) : null}

              {content ? (
                <Text
                  className={`text-[14px] font-normal leading-5 ${
                    isMine ? "text-inverse" : "text-text-primary"
                  }`}
                >
                  {content}
                </Text>
              ) : null}

              <View
                className={`mt-1 flex-row items-center ${
                  isMine ? "justify-end" : "justify-start"
                }`}
              >
                {timeLabel ? (
                  <Text
                    className={`text-[10px] font-semibold ${
                      isMine ? "text-inverse/70" : "text-text-muted"
                    }`}
                  >
                    {timeLabel}
                  </Text>
                ) : null}
                {isMine ? (
                  <>
                    <Ionicons
                      name={getDeliveryIcon(status)}
                      size={12}
                      color={
                        status === "failed" ? Colors.error : Colors.textInverse
                      }
                      style={{
                        marginLeft: 4,
                        opacity: status === "failed" ? 1 : 0.72,
                      }}
                    />
                    <Text
                      className="ml-1 text-[10px] font-extrabold"
                      style={{
                        color:
                          status === "failed"
                            ? Colors.error
                            : Colors.textInverse,
                        opacity: status === "failed" ? 1 : 0.66,
                      }}
                    >
                      {getDeliveryLabel(status)}
                    </Text>
                  </>
                ) : null}
              </View>
            </Pressable>

            {status === "failed" && onRetry ? (
              <Pressable
                className="mt-1.5 flex-row items-center rounded-full border border-border bg-bg-card px-3 py-1.5"
                style={styles.retryPill}
                onPress={onRetry}
              >
                <Ionicons name="refresh" size={13} color={Colors.error} />
                <Text className="ml-1.5 text-[11px] font-extrabold text-error">
                  Retry
                </Text>
              </Pressable>
            ) : null}

            {/* ── Reaction Pills ─────────────────────────────────────────── */}
            {displayReactions.length > 0 ? (
              <View
                className={`-mt-0.5 flex-row flex-wrap gap-1 ${
                  isMine ? "justify-end pr-1" : "justify-start pl-4"
                }`}
              >
                {displayReactions.slice(0, 4).map((r) => (
                  <ReactionPill
                    key={r.emoji}
                    emoji={r.emoji}
                    count={r.count}
                    reactedByMe={r.reactedByMe}
                    onPress={
                      onReactionPress
                        ? () => onReactionPress(r.reactedByMe ? r.emoji : null)
                        : undefined
                    }
                  />
                ))}
                {displayReactions.length > 4 ? (
                  <Pressable
                    style={styles.reactionPill}
                    onPress={
                      onReactionPress ? () => onReactionPress(null) : undefined
                    }
                    disabled={!onReactionPress}
                  >
                    <Text style={styles.reactionCount}>
                      +{displayReactions.length - 4}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}
          </View>
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  incomingBubble: {
    backgroundColor: Colors.bgCard,
    borderColor: Colors.border,
    borderWidth: 1,
    shadowColor: Colors.black,
    shadowOffset: { height: 5, width: 0 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  outgoingBubble: {
    backgroundColor: Colors.primary,
    shadowColor: Colors.black,
    shadowOffset: { height: 5, width: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  highlightedBubble: {
    borderColor: Colors.primaryLight,
    borderWidth: 2,
  },
  failedBubble: {
    borderColor: Colors.error,
    borderWidth: 1,
  },
  incomingReplyPreview: {
    borderColor: Colors.border,
    borderWidth: 1,
  },
  outgoingReplyPreview: {
    borderColor: "rgba(255,255,255,0.18)",
    borderWidth: 1,
  },
  replyIcon: {
    marginTop: -18,
    shadowColor: Colors.black,
    shadowOffset: { height: 5, width: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 3,
  },
  leftReplyIcon: {
    marginLeft: -18,
  },
  retryPill: {
    shadowColor: Colors.black,
    shadowOffset: { height: 4, width: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  // ── Reaction pill styles ──────────────────────────────────────────────────
  reactionPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: Colors.black,
    shadowOffset: { height: 3, width: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  reactionPillMine: {
    // borderColor: Colors.primaryLight,
    // backgroundColor: `${Colors.primaryLight}18`,
  },
  reactionEmoji: {
    fontSize: 15,
    lineHeight: 19,
  },
  reactionCount: {
    marginLeft: 3,
    fontSize: 11,
    fontWeight: "800",
    color: Colors.textSecondary,
  },
  reactionCountMine: {
    color: Colors.primary,
  },
});
