import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Easing,
  FadeInUp,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
  runOnJS,
} from "react-native-reanimated";

import { storyService } from "@/services/story.service";
import { moderationService } from "@/services/moderation.service";
import { useAuthStore } from "@/store/authStore";
import { showToast } from "@/utils/toast";
import { Colors } from "@/constants/colors";
import { FontFamily } from "@/constants/typography";

const { width } = Dimensions.get("window");
const QUICK_REPLIES = ["🔥", "❤️", "😂", "😮", "😢"];

const FILTERS: Record<string, string> = {
  noir: "rgba(0,0,0,0.38)",
  golden: "rgba(255, 128, 0, 0.16)",
  cyber: "rgba(186, 85, 211, 0.14)",
  chroma: "rgba(0, 255, 128, 0.1)",
};

const mockViewers = [
  { username: "emma_watson", avatar: "https://i.pravatar.cc/100?img=43", time: "2h ago" },
  { username: "chris_evans", avatar: "https://i.pravatar.cc/100?img=33", time: "3h ago" },
  { username: "lisa_m", avatar: "https://i.pravatar.cc/100?img=47", time: "5h ago" },
  { username: "alex_g", avatar: "https://i.pravatar.cc/100?img=12", time: "7h ago" },
  { username: "sophia_r", avatar: "https://i.pravatar.cc/100?img=25", time: "12h ago" },
];

const getTimeLeft = (expiresAt?: string) => {
  if (!expiresAt) return "Story";

  const remainingMs = new Date(expiresAt).getTime() - Date.now();
  if (remainingMs <= 0) return "Expired";

  const hours = Math.floor(remainingMs / (1000 * 60 * 60));
  if (hours > 0) return `${hours}h left`;

  const minutes = Math.max(1, Math.floor(remainingMs / (1000 * 60)));
  return `${minutes}m left`;
};

export default function StoryDetailScreen() {
  const { storyId } = useLocalSearchParams<{ storyId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const currentUserId = useAuthStore((state) => state.user?.id);
  const [replyText, setReplyText] = useState("");
  const [isReplyFocused, setIsReplyFocused] = useState(false);
  const composerProgress = useSharedValue(0);
  const sendPulse = useSharedValue(0);

  // Swipe-to-dismiss animated values
  const translateY = useSharedValue(0);
  const screenOpacity = useSharedValue(1);

  // Story auto-advance timer value
  const progressVal = useSharedValue(0);

  // Viewers list state
  const [viewersVisible, setViewersVisible] = useState(false);

  const {
    data: storyResponse,
    isLoading,
  } = useQuery({
    queryKey: ["story", storyId],
    queryFn: () => storyService.getStory(storyId),
    enabled: Boolean(storyId),
  });

  const story = storyResponse?.success ? storyResponse.data : null;
  const authorName =
    story?.author?.profile?.username || story?.author?.username || "Story";
  const authorAvatar = story?.author?.profile?.avatarUrl;
  const viewsCount = story?._count?.views || story?.viewsCount || 0;
  const canReply = Boolean(story && story.authorId !== currentUserId);
  const trimmedReply = replyText.trim();

  // Retrieve cached user groups for global tap navigation
  const stories = queryClient.getQueryData<any[]>(["stories"]) || [];

  // Query all stories for the SPECIFIC author of this story
  const { data: userStoriesData } = useQuery({
    queryKey: ["user-stories", story?.authorId],
    queryFn: async () => {
      if (!story?.authorId) return [];
      const res = await storyService.getUserStories(story.authorId);
      return res?.success && Array.isArray(res.data) ? res.data : [];
    },
    enabled: Boolean(story?.authorId),
  });

  const userStories = userStoriesData || [];

  const currentSegmentIdx = useMemo(() => {
    if (!userStories.length || !storyId) return 0;
    const idx = userStories.findIndex((s: any) => s.id === storyId);
    return idx === -1 ? 0 : idx;
  }, [userStories, storyId]);

  // Serialized Caption parsing
  const { captionText, filterId, pollData } = useMemo(() => {
    let captionText = story?.caption || "";
    let filterId = null;
    let pollData = null;

    try {
      if (story?.caption && story.caption.startsWith("{")) {
        const json = JSON.parse(story.caption);
        captionText = json.caption || "";
        filterId = json.filter || null;
        pollData = json.sticker?.type === "poll" ? json.sticker : null;
      }
    } catch {
      // fallback
    }
    return { captionText, filterId, pollData };
  }, [story]);

  // Interactive Poll Voting States
  const [votedOption, setVotedOption] = useState<"yes" | "no" | null>(null);
  const [pollYesCount, setPollYesCount] = useState(0);
  const [pollNoCount, setPollNoCount] = useState(0);

  useEffect(() => {
    if (pollData) {
      const hash = storyId ? storyId.split("").reduce((sum, c) => sum + c.charCodeAt(0), 0) : 10;
      const seedYes = (hash % 12) + 5;
      const seedNo = (hash % 8) + 2;
      setPollYesCount(seedYes);
      setPollNoCount(seedNo);
      setVotedOption(null);
    }
  }, [storyId, pollData]);

  const totalVotes = pollYesCount + pollNoCount;
  const yesPercent = totalVotes > 0 ? Math.round((pollYesCount / totalVotes) * 100) : 50;
  const noPercent = totalVotes > 0 ? Math.round((pollNoCount / totalVotes) * 100) : 50;

  const handleStoryNavigation = (direction: "prev" | "next") => {
    if (direction === "next") {
      if (currentSegmentIdx < userStories.length - 1) {
        // Go to next segment of the SAME user
        router.replace({
          pathname: "/(screens)/story/[storyId]",
          params: { storyId: userStories[currentSegmentIdx + 1].id },
        });
      } else {
        // Move to the NEXT user group in feed
        const nextUserIdx = stories.findIndex((s: any) => s.authorId === story?.authorId) + 1;
        if (nextUserIdx < stories.length) {
          router.replace({
            pathname: "/(screens)/story/[storyId]",
            params: { storyId: stories[nextUserIdx].mediaUrl ? stories[nextUserIdx].id : stories[nextUserIdx].id },
          });
        } else {
          router.back();
        }
      }
    } else {
      if (currentSegmentIdx > 0) {
        // Go to previous segment of the SAME user
        router.replace({
          pathname: "/(screens)/story/[storyId]",
          params: { storyId: userStories[currentSegmentIdx - 1].id },
        });
      } else {
        // Move to PREVIOUS user group in feed
        const prevUserIdx = stories.findIndex((s: any) => s.authorId === story?.authorId) - 1;
        if (prevUserIdx >= 0) {
          router.replace({
            pathname: "/(screens)/story/[storyId]",
            params: { storyId: stories[prevUserIdx].id },
          });
        }
      }
    }
  };

  const startStoryTimer = (startFrom = 0) => {
    progressVal.value = startFrom;
    const remainingDuration = (1 - startFrom) * 7000; // 7 seconds per story
    progressVal.value = withTiming(
      1,
      { duration: remainingDuration, easing: Easing.linear },
      (finished) => {
        if (finished) {
          runOnJS(handleStoryNavigation)("next");
        }
      }
    );
  };

  // Re-start or pause timer depending on inputs
  useEffect(() => {
    if (!story || isLoading) return;

    if (isReplyFocused || viewersVisible) {
      // Pause timer
      progressVal.value = progressVal.value;
    } else {
      // Start/Resume timer
      startStoryTimer(progressVal.value === 1 ? 0 : progressVal.value);
    }

    return () => {
      progressVal.value = 0;
    };
  }, [storyId, story, isLoading, isReplyFocused, viewersVisible]);

  const replyMutation = useMutation({
    mutationFn: async (content: string) => storyService.replyToStory(storyId, content),
    onSuccess: () => {
      setReplyText("");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
        () => undefined,
      );
      sendPulse.value = withSequence(
        withTiming(1, { duration: 120, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 260, easing: Easing.out(Easing.quad) }),
      );
      queryClient.invalidateQueries({ queryKey: ["chat-conversations"] });
      showToast("Your reply was sent to chat.", "Reply sent");
    },
    onError: (error: any) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(
        () => undefined,
      );
      showToast(
        error?.response?.data?.message || "Unable to reply to this story.",
        "Reply failed",
      );
    },
  });

  useEffect(() => {
    composerProgress.value = withSpring(isReplyFocused ? 1 : 0, {
      damping: 18,
      stiffness: 220,
    });
  }, [composerProgress, isReplyFocused]);

  React.useEffect(() => {
    if (!storyId || !story) return;

    storyService
      .recordView(storyId)
      .then(() => {
        queryClient.setQueryData(["stories"], (current: any[] | undefined) => {
          if (!current) return current;
          return current.map((item) =>
            item.id === storyId ? { ...item, isViewed: true } : item,
          );
        });
      })
      .catch(() => {
        // Viewing should never block the story UI.
      });
  }, [queryClient, storyId, story]);

  const composerStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: interpolate(composerProgress.value, [0, 1], [0, -8]),
      },
      {
        scale: interpolate(composerProgress.value, [0, 1], [1, 1.018]),
      },
    ],
  }));

  const sendStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scale: interpolate(sendPulse.value, [0, 1], [1, 1.16]),
      },
    ],
  }));

  const sendReply = (content = trimmedReply) => {
    const nextContent = content.trim();
    if (!nextContent || replyMutation.isPending || !canReply) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(
      () => undefined,
    );
    replyMutation.mutate(nextContent);
  };

  const showStoryActions = () => {
    if (!story) return;
    if (story.authorId === currentUserId) {
      Alert.alert("Story actions", undefined, [
        {
          text: "Delete story",
          style: "destructive",
          onPress: async () => {
            await storyService.deleteStory(storyId);
            queryClient.invalidateQueries({ queryKey: ["stories"] });
            queryClient.invalidateQueries({ queryKey: ["user-stories"] });
            router.back();
          },
        },
        { text: "Cancel", style: "cancel" },
      ]);
      return;
    }
    Alert.alert("Story actions", undefined, [
      {
        text: "Report story",
        style: "destructive",
        onPress: async () => {
          await moderationService.report({
            contentId: story.id,
            contentType: "STORY",
            reportedId: story.authorId,
            reason: "OTHER",
            description: "Reported from story details",
          });
          showToast("Thank you for helping keep Datebl safe.", "Report received");
        },
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  // Swipe-to-dismiss gesture logic
  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      if (event.translationY > 0) {
        translateY.value = event.translationY;
        screenOpacity.value = Math.max(0.3, 1 - event.translationY / 500);
      }
    })
    .onEnd((event) => {
      if (event.translationY > 150 || event.velocityY > 500) {
        translateY.value = withTiming(800, { duration: 220 }, () => {
          runOnJS(router.back)();
        });
      } else {
        translateY.value = withSpring(0, { damping: 15 });
        screenOpacity.value = withSpring(1);
      }
    });

  const animatedScreenStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: screenOpacity.value,
  }));

  // Reanimated style for the progress segment
  const activeProgressStyle = useAnimatedStyle(() => ({
    width: `${progressVal.value * 100}%`,
  }));

  return (
    <SafeAreaView className="flex-1 bg-[#050505]" edges={["top"]}>
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.gestureContainer, animatedScreenStyle]}>
          <KeyboardAvoidingView
            className="flex-1"
            behavior={Platform.OS === "ios" ? "padding" : "height"}
          >
            {isLoading ? (
              <View className="flex-1 items-center justify-center">
                <ActivityIndicator color="#FFFFFF" size="large" />
              </View>
            ) : !story ? (
              <View className="flex-1 items-center justify-center px-6">
                <View className="h-20 w-20 items-center justify-center rounded-full border border-[#222222] bg-[#111111]">
                  <Ionicons name="play-circle-outline" size={38} color="#888888" />
                </View>
                <Text className="mt-5 text-center text-xl font-extrabold text-white">
                  Story not found
                </Text>
                <Text className="mt-2 text-center text-sm leading-5 text-[#888888]">
                  This story may have expired or is no longer available.
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
              <View className="relative flex-1 bg-[#090909]">
                {story.mediaUrl ? (
                  <Image
                    source={{ uri: story.mediaUrl }}
                    className="absolute inset-0 h-full w-full"
                    resizeMode="cover"
                  />
                ) : (
                  <View className="absolute inset-0 items-center justify-center bg-[#111111]">
                    <Ionicons name="image-outline" size={48} color="#777777" />
                  </View>
                )}

                <LinearGradient
                  colors={[
                    "rgba(0,0,0,0.78)",
                    "rgba(0,0,0,0.08)",
                    "rgba(0,0,0,0.92)",
                  ]}
                  locations={[0, 0.44, 1]}
                  className="absolute inset-0"
                />

                {/* Filter Overlays */}
                {filterId && FILTERS[filterId] && (
                  <View
                    style={[StyleSheet.absoluteFillObject, { backgroundColor: FILTERS[filterId] }]}
                    pointerEvents="none"
                  />
                )}

                {/* Story navigation tap zones */}
                <Pressable
                  onPress={() => handleStoryNavigation("prev")}
                  style={styles.leftTapZone}
                />
                <Pressable
                  onPress={() => handleStoryNavigation("next")}
                  style={styles.rightTapZone}
                />

                {/* Interactive Poll Sticker */}
                {pollData && (
                  <View style={styles.pollSticker}>
                    <Text style={styles.pollQuestion}>{pollData.question}</Text>
                    {votedOption ? (
                      <View style={styles.pollResultsRow}>
                        <View style={styles.pollResultBarContainer}>
                          <View style={[styles.pollResultFill, { width: `${yesPercent}%`, backgroundColor: "rgba(255, 64, 129, 0.5)" }]} />
                          <Text style={styles.pollResultText}>YES {yesPercent}%</Text>
                        </View>
                        <View style={styles.pollResultBarContainer}>
                          <View style={[styles.pollResultFill, { width: `${noPercent}%`, backgroundColor: "rgba(255, 255, 255, 0.25)" }]} />
                          <Text style={styles.pollResultText}>NO {noPercent}%</Text>
                        </View>
                      </View>
                    ) : (
                      <View style={styles.pollOptionsRow}>
                        <TouchableOpacity
                          style={styles.pollOptionBtn}
                          onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
                            setPollYesCount((prev) => prev + 1);
                            setVotedOption("yes");
                          }}
                        >
                          <Text style={styles.pollOptionText}>YES</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.pollOptionBtn}
                          onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
                            setPollNoCount((prev) => prev + 1);
                            setVotedOption("no");
                          }}
                        >
                          <Text style={styles.pollOptionText}>NO</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                )}

                {/* Multi-segment story progress indicators */}
                <View className="px-4 pt-3 z-20">
                  <View style={styles.progressContainer}>
                    {userStories.length > 0
                      ? userStories.map((s: any, idx: number) => {
                          const isBefore = idx < currentSegmentIdx;
                          const isActive = idx === currentSegmentIdx;
                          return (
                            <View key={s.id} style={styles.progressBarBg}>
                              {isBefore ? (
                                <View style={[styles.progressBarFill, { width: "100%" }]} />
                              ) : isActive ? (
                                <Animated.View style={[styles.progressBarFill, activeProgressStyle]} />
                              ) : null}
                            </View>
                          );
                        })
                      : (
                        <View style={styles.progressBarBg}>
                          <Animated.View style={[styles.progressBarFill, activeProgressStyle]} />
                        </View>
                      )}
                  </View>

                  <View className="mt-4 flex-row items-center">
                    <TouchableOpacity
                      className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-black/45"
                      onPress={() => router.back()}
                      activeOpacity={0.78}
                    >
                      <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
                    </TouchableOpacity>

                    <View className="mr-3 h-11 w-11 overflow-hidden rounded-full border border-white/20 bg-[#1A1A1A]">
                      {authorAvatar ? (
                        <Image
                          source={{ uri: authorAvatar }}
                          className="h-full w-full"
                        />
                      ) : (
                        <View className="h-full w-full items-center justify-center">
                          <Ionicons name="person" size={22} color="#AAAAAA" />
                        </View>
                      )}
                    </View>

                    <View className="min-w-0 flex-1">
                      <Text
                        className="text-base font-extrabold text-white"
                        numberOfLines={1}
                      >
                        {authorName}
                      </Text>
                      <Text className="mt-0.5 text-xs font-semibold text-white/70">
                        {getTimeLeft(story.expiresAt)}
                      </Text>
                    </View>

                    <View className="flex-row items-center rounded-full bg-black/45 px-3 py-2">
                      <Ionicons name="eye-outline" size={15} color="#FFFFFF" />
                      <Text className="ml-1.5 text-xs font-extrabold text-white">
                        {viewsCount}
                      </Text>
                    </View>
                    <TouchableOpacity
                      className="ml-2 h-10 w-10 items-center justify-center rounded-full bg-black/45"
                      onPress={showStoryActions}
                    >
                      <Ionicons
                        name="ellipsis-horizontal"
                        size={21}
                        color="#FFFFFF"
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                <View className="mt-auto px-5 pb-5 z-20">
                  {captionText ? (
                    <Animated.Text
                      entering={FadeInUp.duration(360).easing(Easing.out(Easing.cubic))}
                      className="mb-4 text-xl font-extrabold leading-7 text-white"
                    >
                      {captionText}
                    </Animated.Text>
                  ) : null}

                  {canReply ? (
                    <Animated.View
                      entering={FadeInUp.delay(120).duration(420)}
                      style={[styles.replyComposer, composerStyle]}
                    >
                      <View className="mb-3 flex-row items-center justify-between px-1">
                        {QUICK_REPLIES.map((reaction) => (
                          <Pressable
                            key={reaction}
                            className="h-10 w-10 items-center justify-center rounded-full bg-white/15"
                            onPress={() => sendReply(reaction)}
                            disabled={replyMutation.isPending}
                          >
                            <Text className="text-[20px]">{reaction}</Text>
                          </Pressable>
                        ))}
                      </View>

                      <View className="flex-row items-center rounded-[28px] border border-white/15 bg-black/55 px-3 py-2">
                        <View className="mr-2 h-9 w-9 items-center justify-center rounded-full bg-white/12">
                          <Ionicons name="chatbubble-ellipses-outline" size={18} color="#FFFFFF" />
                        </View>
                        <TextInput
                          value={replyText}
                          onChangeText={setReplyText}
                          onFocus={() => setIsReplyFocused(true)}
                          onBlur={() => setIsReplyFocused(false)}
                          placeholder="Reply to story..."
                          placeholderTextColor="rgba(255,255,255,0.58)"
                          className="max-h-20 min-h-10 flex-1 text-[15px] font-semibold text-white"
                          multiline
                          editable={!replyMutation.isPending}
                          style={{ padding: 0, textAlignVertical: "center" }}
                        />
                        <Animated.View style={sendStyle}>
                          <Pressable
                            className={`ml-2 h-10 w-10 items-center justify-center rounded-full ${
                              trimmedReply ? "bg-white" : "bg-white/15"
                            }`}
                            onPress={() => sendReply()}
                            disabled={!trimmedReply || replyMutation.isPending}
                          >
                            {replyMutation.isPending ? (
                              <ActivityIndicator color="#111111" size="small" />
                            ) : (
                              <Ionicons
                                name="arrow-up"
                                size={18}
                                color={trimmedReply ? "#111111" : "#FFFFFF"}
                              />
                            )}
                          </Pressable>
                        </Animated.View>
                      </View>
                    </Animated.View>
                  ) : (
                    <View style={{ gap: 12 }}>
                      {story.authorId === currentUserId && (
                        <TouchableOpacity
                          style={styles.viewersTrigger}
                          onPress={() => setViewersVisible(true)}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="chevron-up" size={16} color="#FFF" />
                          <Text style={styles.viewersTriggerText}>Viewers ({viewsCount})</Text>
                        </TouchableOpacity>
                      )}
                      
                      <View className="flex-row items-center rounded-full border border-white/10 bg-black/45 px-4 py-3">
                        <Ionicons name="sparkles-outline" size={18} color="#FFFFFF" />
                        <Text className="ml-2 flex-1 text-sm font-bold text-white/85">
                          Story viewed
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              </View>
            )}
          </KeyboardAvoidingView>
        </Animated.View>
      </GestureDetector>

      {/* Viewers Bottom Sheet Modal */}
      <Modal
        visible={viewersVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setViewersVisible(false)}
      >
        <View style={styles.viewersBg}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setViewersVisible(false)} />
          <View style={styles.viewersCard}>
            <View style={styles.viewersHeader}>
              <View style={styles.viewersHeaderHandle} />
              <Text style={styles.viewersTitle}>Activity</Text>
              <Text style={styles.viewersSubtitle}>{viewsCount} views</Text>
            </View>

            <ScrollView style={styles.viewersList} showsVerticalScrollIndicator={false}>
              {mockViewers.slice(0, viewsCount || 3).map((viewer) => (
                <View key={viewer.username} style={styles.viewerRow}>
                  <Image source={{ uri: viewer.avatar }} style={styles.viewerAvatar} />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.viewerName}>{viewer.username}</Text>
                    <Text style={styles.viewerTime}>{viewer.time}</Text>
                  </View>
                  <TouchableOpacity style={styles.viewerFollowBtn} activeOpacity={0.78}>
                    <Text style={styles.viewerFollowText}>Follow Back</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  gestureContainer: {
    flex: 1,
  },
  replyComposer: {
    borderRadius: 30,
    shadowColor: "#000000",
    shadowOffset: { height: 16, width: 0 },
    shadowOpacity: 0.28,
    shadowRadius: 28,
    elevation: 10,
  },
  leftTapZone: {
    position: "absolute",
    left: 0,
    top: 100,
    bottom: 120,
    width: width * 0.2,
    zIndex: 10,
  },
  rightTapZone: {
    position: "absolute",
    right: 0,
    top: 100,
    bottom: 120,
    width: width * 0.2,
    zIndex: 10,
  },
  progressContainer: {
    flexDirection: "row",
    gap: 6,
    width: "100%",
    height: 2,
  },
  progressBarBg: {
    flex: 1,
    height: "100%",
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    borderRadius: 1,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#FFF",
  },
  pollSticker: {
    position: "absolute",
    alignSelf: "center",
    top: "35%",
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    borderRadius: 20,
    padding: 16,
    width: "75%",
    alignItems: "center",
    borderColor: "rgba(255, 255, 255, 0.15)",
    borderWidth: 1,
    zIndex: 30,
  },
  pollQuestion: {
    color: "#FFF",
    fontFamily: FontFamily.bold,
    fontSize: 16,
    textAlign: "center",
    marginBottom: 12,
  },
  pollOptionsRow: {
    flexDirection: "row",
    width: "100%",
    gap: 12,
  },
  pollOptionBtn: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.18)",
    borderColor: "rgba(255, 255, 255, 0.3)",
    borderWidth: 1,
    borderRadius: 14,
    height: 42,
    justifyContent: "center",
    alignItems: "center",
  },
  pollOptionText: {
    color: "#FFF",
    fontFamily: FontFamily.bold,
    fontSize: 14,
  },
  pollResultsRow: {
    width: "100%",
    gap: 10,
  },
  pollResultBarContainer: {
    width: "100%",
    height: 40,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    borderRadius: 12,
    overflow: "hidden",
    justifyContent: "center",
    position: "relative",
  },
  pollResultFill: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
  },
  pollResultText: {
    color: "#FFF",
    fontFamily: FontFamily.bold,
    fontSize: 13,
    marginLeft: 14,
    zIndex: 10,
  },
  viewersTrigger: {
    flexDirection: "row",
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    borderColor: "rgba(255, 255, 255, 0.15)",
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 6,
  },
  viewersTriggerText: {
    color: "#FFF",
    fontFamily: FontFamily.bold,
    fontSize: 12,
  },
  viewersBg: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.52)",
    justifyContent: "flex-end",
  },
  viewersCard: {
    backgroundColor: "#161616",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    height: "55%",
    paddingHorizontal: 20,
    paddingTop: 12,
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1,
    borderBottomWidth: 0,
  },
  viewersHeader: {
    alignItems: "center",
    marginBottom: 16,
  },
  viewersHeaderHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.18)",
    marginBottom: 10,
  },
  viewersTitle: {
    color: "#FFF",
    fontFamily: FontFamily.bold,
    fontSize: 16,
  },
  viewersSubtitle: {
    color: "#888",
    fontFamily: FontFamily.bold,
    fontSize: 11,
    marginTop: 2,
  },
  viewersList: {
    flex: 1,
  },
  viewerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  viewerAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#333",
  },
  viewerName: {
    color: "#FFF",
    fontFamily: FontFamily.bold,
    fontSize: 13,
  },
  viewerTime: {
    color: "#888",
    fontFamily: FontFamily.bold,
    fontSize: 11,
    marginTop: 2,
  },
  viewerFollowBtn: {
    backgroundColor: Colors.primaryLight,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  viewerFollowText: {
    color: "#FFF",
    fontFamily: FontFamily.bold,
    fontSize: 11,
  },
});
