import React, { useState, useEffect } from 'react';
import { 
  Alert,
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View, 
  Text, 
  TouchableOpacity, 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Input } from '@/components/common/Input';
import { DiscoverUserCard } from '@/components/discover/DiscoverUserCard';
import { Colors } from '@/constants/colors';
import { FontFamily, FontSize } from '@/constants/typography';
import { Radius, Spacing } from '@/constants/spacing';
import {
  useSearchQuery,
  useSendMatchRequestMutation,
  useTrendingHashtagsQuery,
} from '@/hooks/queries';

const calculateAge = (birthDateString: string) => {
  if (!birthDateString) return 0;
  const birthDate = new Date(birthDateString);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

export default function SearchScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const sendMatchRequest = useSendMatchRequestMutation();

  // Manual debounce for the API call to prevent too many requests
  useEffect(() => {
    const timer = setTimeout(() => {
      const trimmed = searchQuery.trim();
      setDebouncedQuery(trimmed);
      if (trimmed.length >= 2) {
        setRecentSearches((current) => [
          trimmed,
          ...current.filter((item) => item.toLowerCase() !== trimmed.toLowerCase()),
        ].slice(0, 5));
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data, isLoading } = useSearchQuery(debouncedQuery, 'all');
  const { data: trendingHashtags = [] } = useTrendingHashtagsQuery();
  const trendingTopics = trendingHashtags.map((item) =>
    item.hashtag.replace(/^#/, ''),
  );

  const users = data?.users?.map((user: any) => ({
    id: user.id,
    username: user.username,
    avatarUrl: user.avatarUrl || user.profile?.avatarUrl,
    bio: user.bio || '',
    age: calculateAge(user.birthDate),
    distance: user.location || 'Nearby',
    interests: user.interests || [],
    isActive: Boolean(user.isActive || user.online),
    isVerified: Boolean(user.isVerified || user.verified),
    matchScore: user.matchScore,
    isConnected: Boolean(user.isConnected),
  })) || [];
  const posts = (data?.posts || []) as {
    id: string;
    caption?: string | null;
    mediaUrls?: string[];
  }[];
  const rooms = (data?.rooms || []) as {
    id: string;
    name: string;
    description?: string | null;
  }[];

  const handleConnect = (user: (typeof users)[number]) => {
    sendMatchRequest.mutate(
      {
        receiverId: user.id,
        message: 'I found you through search and would like to connect.',
      },
      {
        onSuccess: (response: any) => {
          const chatId = response?.data?.chat?.id;
          if (chatId) {
            router.push({
              pathname: '/(screens)/chat/[roomId]',
              params: {
                roomId: chatId,
                userId: user.id,
                name: user.username,
                avatarUrl: user.avatarUrl || '',
              },
            });
            return;
          }

          Alert.alert('Request sent', 'They will see your connection request.');
        },
        onError: (error: any) => {
          Alert.alert(
            'Request failed',
            error?.response?.data?.message || 'Unable to send request.',
          );
        },
      },
    );
  };

  const runSearch = (value: string) => {
    setSearchQuery(value);
  };

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboard}
      >
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.82}
          >
            <Ionicons name="arrow-back" size={23} color={Colors.textPrimary} />
          </TouchableOpacity>
          
          <View style={styles.searchBox}>
            <Input
              value={searchQuery}
              onChangeText={runSearch}
              placeholder="Search people or interests..."
              autoFocus
              icon={<Ionicons name="search" size={20} color={Colors.textSecondary} />}
              containerStyle={{ marginBottom: 0 }}
            />
          </View>
        </View>

        <View style={styles.content}>
          {searchQuery.length < 2 ? (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.suggestionsContent}
            >
              {recentSearches.length ? (
                <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Recent</Text>
                  <TouchableOpacity onPress={() => setRecentSearches([])} activeOpacity={0.8}>
                    <Text style={styles.clearText}>Clear all</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.recentList}>
                  {recentSearches.map((item, index) => (
                    <TouchableOpacity 
                      key={index} 
                      style={[
                        styles.recentItem,
                        index === recentSearches.length - 1 && styles.recentItemLast,
                      ]}
                      onPress={() => setSearchQuery(item)}
                      activeOpacity={0.82}
                    >
                      <View style={styles.recentIcon}>
                        <Ionicons name="time-outline" size={17} color={Colors.textSecondary} />
                      </View>
                      <Text style={styles.recentText}>{item}</Text>
                      <TouchableOpacity
                        style={styles.removeRecentButton}
                        onPress={() =>
                          setRecentSearches((current) =>
                            current.filter((_, itemIndex) => itemIndex !== index),
                          )
                        }
                        activeOpacity={0.8}
                      >
                        <Ionicons name="close" size={16} color={Colors.textMuted} />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  ))}
                </View>
                </View>
              ) : null}

              {trendingTopics.length ? (
                <View style={styles.section}>
                <Text style={styles.sectionTitle}>Trending</Text>
                <View style={styles.topicRow}>
                  {trendingTopics.map((topic, index) => (
                    <TouchableOpacity 
                      key={index} 
                      style={styles.topicChip}
                      onPress={() => setSearchQuery(topic)}
                      activeOpacity={0.82}
                    >
                      <Ionicons name="trending-up" size={14} color={Colors.textSecondary} />
                      <Text style={styles.topicText}>#{topic}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                </View>
              ) : null}
            </ScrollView>
          ) : (
            <View style={styles.results}>
              {isLoading ? (
                <View style={styles.stateWrap}>
                  <ActivityIndicator size="large" color={Colors.primary} />
                  <Text style={styles.stateText}>
                    {`Searching for "${searchQuery}"...`}
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={users}
                  keyExtractor={(item) => item.id}
                  showsVerticalScrollIndicator={false}
                  ListHeaderComponent={
                    <>
                      {posts.length ? (
                        <View style={styles.resultSection}>
                          <Text style={styles.resultSectionTitle}>Posts</Text>
                          {posts.map((post) => (
                            <TouchableOpacity
                              key={post.id}
                              style={styles.compactResult}
                              onPress={() =>
                                router.push({
                                  pathname: "/(screens)/post/[postId]",
                                  params: { postId: post.id },
                                })
                              }
                            >
                              {post.mediaUrls?.[0] ? (
                                <Image source={{ uri: post.mediaUrls[0] }} style={styles.resultImage} />
                              ) : (
                                <View style={styles.resultImagePlaceholder}>
                                  <Ionicons name="image-outline" size={22} color={Colors.textMuted} />
                                </View>
                              )}
                              <View style={styles.compactCopy}>
                                <Text style={styles.compactTitle} numberOfLines={1}>
                                  {post.caption || "Post"}
                                </Text>
                                <Text style={styles.compactSubtitle}>View post</Text>
                              </View>
                              <Ionicons name="chevron-forward" size={19} color={Colors.textMuted} />
                            </TouchableOpacity>
                          ))}
                        </View>
                      ) : null}
                      {rooms.length ? (
                        <View style={styles.resultSection}>
                          <Text style={styles.resultSectionTitle}>Rooms</Text>
                          {rooms.map((room) => (
                            <TouchableOpacity
                              key={room.id}
                              style={styles.compactResult}
                              onPress={() =>
                                router.push({
                                  pathname: "/(screens)/room/[roomId]",
                                  params: { roomId: room.id },
                                })
                              }
                            >
                              <View style={styles.resultImagePlaceholder}>
                                <Ionicons name="people-outline" size={22} color={Colors.textSecondary} />
                              </View>
                              <View style={styles.compactCopy}>
                                <Text style={styles.compactTitle}>{room.name}</Text>
                                <Text style={styles.compactSubtitle} numberOfLines={1}>
                                  {room.description || "Open room"}
                                </Text>
                              </View>
                              <Ionicons name="chevron-forward" size={19} color={Colors.textMuted} />
                            </TouchableOpacity>
                          ))}
                        </View>
                      ) : null}
                      {users.length ? (
                        <Text style={styles.resultSectionTitle}>People</Text>
                      ) : null}
                    </>
                  }
                  renderItem={({ item }) => (
                    <View style={styles.resultCardWrap}>
                      <DiscoverUserCard 
                        user={item} 
                        onPress={() => router.push(`/(screens)/user/${item.id}`)}
                        onConnectPress={() => handleConnect(item)}
                        onMessagePress={() => router.push('/(tabs)/chat')}
                      />
                    </View>
                  )}
                  ListEmptyComponent={() =>
                    posts.length || rooms.length ? null : (
                    <View style={styles.stateWrap}>
                      <View style={styles.emptyIcon}>
                        <Ionicons name="search-outline" size={34} color={Colors.textMuted} />
                      </View>
                      <Text style={styles.stateTitle}>No results</Text>
                      <Text style={styles.stateText}>
                        {`No results found for "${searchQuery}"`}
                      </Text>
                    </View>
                    )
                  }
                  contentContainerStyle={styles.resultsContent}
                />
              )}
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: Colors.bg,
    flex: 1,
  },
  keyboard: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    paddingBottom: Spacing.xs,
    paddingHorizontal: Spacing.md + 4,
    paddingTop: Spacing.sm,
  },
  backButton: {
    alignItems: 'center',
    backgroundColor: Colors.bgCard,
    borderColor: Colors.border,
    borderRadius: Radius.full,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    marginRight: Spacing.sm + 4,
    width: 44,
  },
  searchBox: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.md + 4,
    paddingTop: Spacing.md,
  },
  suggestionsContent: {
    paddingBottom: Spacing.xl,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    color: Colors.textPrimary,
    fontFamily: FontFamily.bold,
    fontSize: FontSize.lg,
    marginBottom: Spacing.md,
  },
  clearText: {
    color: Colors.textSecondary,
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
  },
  recentList: {
    backgroundColor: Colors.bgCard,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  recentItem: {
    alignItems: 'center',
    borderBottomColor: Colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    minHeight: 54,
    paddingHorizontal: Spacing.md,
  },
  recentItemLast: {
    borderBottomWidth: 0,
  },
  recentIcon: {
    alignItems: 'center',
    backgroundColor: Colors.bgElevated,
    borderRadius: Radius.full,
    height: 32,
    justifyContent: 'center',
    marginRight: Spacing.sm + 4,
    width: 32,
  },
  recentText: {
    color: Colors.textPrimary,
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.base,
  },
  removeRecentButton: {
    alignItems: 'center',
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  topicRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  topicChip: {
    alignItems: 'center',
    backgroundColor: Colors.bgCard,
    borderColor: Colors.border,
    borderRadius: Radius.full,
    borderWidth: 1,
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
  },
  topicText: {
    color: Colors.textPrimary,
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
    marginLeft: Spacing.xs,
  },
  results: {
    flex: 1,
  },
  resultsContent: {
    paddingBottom: Spacing.xl,
  },
  resultCardWrap: {
    alignItems: 'center',
    marginBottom: Spacing.md + 4,
    marginHorizontal: -(Spacing.md + 4),
  },
  resultSection: {
    marginBottom: Spacing.lg,
  },
  resultSectionTitle: {
    color: Colors.textPrimary,
    fontFamily: FontFamily.bold,
    fontSize: FontSize.lg,
    marginBottom: Spacing.md,
  },
  compactResult: {
    alignItems: "center",
    backgroundColor: Colors.bgCard,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    borderWidth: 1,
    flexDirection: "row",
    marginBottom: Spacing.sm,
    padding: Spacing.sm,
  },
  compactCopy: {
    flex: 1,
    paddingHorizontal: Spacing.md,
  },
  compactTitle: {
    color: Colors.textPrimary,
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.base,
  },
  compactSubtitle: {
    color: Colors.textSecondary,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    marginTop: 3,
  },
  resultImage: {
    borderRadius: Radius.md,
    height: 54,
    width: 54,
  },
  resultImagePlaceholder: {
    alignItems: "center",
    backgroundColor: Colors.bgElevated,
    borderRadius: Radius.md,
    height: 54,
    justifyContent: "center",
    width: 54,
  },
  stateWrap: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: 80,
  },
  emptyIcon: {
    alignItems: 'center',
    backgroundColor: Colors.bgCard,
    borderColor: Colors.border,
    borderRadius: Radius.full,
    borderWidth: 1,
    height: 76,
    justifyContent: 'center',
    marginBottom: Spacing.md,
    width: 76,
  },
  stateTitle: {
    color: Colors.textPrimary,
    fontFamily: FontFamily.bold,
    fontSize: FontSize.lg,
    marginBottom: Spacing.xs,
  },
  stateText: {
    color: Colors.textSecondary,
    fontFamily: FontFamily.medium,
    fontSize: FontSize.base,
    lineHeight: 22,
    marginTop: Spacing.md,
    textAlign: 'center',
  },
});
