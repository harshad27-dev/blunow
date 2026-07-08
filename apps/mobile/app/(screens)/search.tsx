import React, { useState, useEffect } from 'react';
import { 
  ActivityIndicator,
  FlatList,
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
} from '@/hooks/queries';
import { showToast } from '@/utils/toast';

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

  const { data, isLoading } = useSearchQuery(debouncedQuery, 'users');

  const users = data?.users?.map((user: any) => ({
    id: user.id,
    username: user.username,
    name:
      user.name ||
      user.profile?.name ||
      [user.firstName, user.lastName].filter(Boolean).join(' ') ||
      '',
    avatarUrl: user.avatarUrl || user.profile?.avatarUrl,
    bio: user.bio || '',
    age: calculateAge(user.birthDate),
    distance: user.location || 'Nearby',
    followersCount:
      user.followersCount ??
      user.followerCount ??
      user.followers ??
      user.stats?.followers ??
      user._count?.followers,
    interests: user.interests || [],
    isActive: Boolean(user.isActive || user.online),
    isVerified: Boolean(user.isVerified || user.verified),
    matchScore: user.matchScore,
    isConnected: Boolean(user.isConnected),
  })) || [];
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

          showToast('They will see your connection request.', 'Request sent');
        },
        onError: (error: any) => {
          showToast(
            error?.response?.data?.message || 'Unable to send request.',
            'Request failed',
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
              placeholder="Search profiles..."
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
                  ListHeaderComponent={users.length ? (
                    <Text style={styles.sectionTitle}>People</Text>
                  ) : null}
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
                  ListEmptyComponent={() => (
                    <View style={styles.stateWrap}>
                      <View style={styles.emptyIcon}>
                        <Ionicons name="search-outline" size={34} color={Colors.textMuted} />
                      </View>
                      <Text style={styles.stateTitle}>No profiles</Text>
                      <Text style={styles.stateText}>
                        {`No profiles found for "${searchQuery}"`}
                      </Text>
                    </View>
                  )}
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
  results: {
    flex: 1,
  },
  resultsContent: {
    paddingBottom: Spacing.xl,
  },
  resultCardWrap: {
    alignItems: 'center',
    marginBottom: 2,
    // marginHorizontal: -(Spacing.md + 4),
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
