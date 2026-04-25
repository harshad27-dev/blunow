import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { FontFamily, FontSize } from '@/constants/typography';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { ProfileStats } from '@/components/profile/ProfileStats';
import { ProfilePostGrid } from '@/components/profile/ProfilePostGrid';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'expo-router';
import { useUserStatsQuery, useUserPostsQuery } from '@/hooks/queries';
import { useQueryClient } from '@tanstack/react-query';

export default function ProfileScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, logout } = useAuthStore();
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'posts' | 'saved'>('posts');

  const { data: stats, isLoading: statsLoading } = useUserStatsQuery(user?.id);
  const { data: posts, isLoading: postsLoading } = useUserPostsQuery(user?.id);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['user-stats', user?.id] }),
      queryClient.invalidateQueries({ queryKey: ['user-posts', user?.id] }),
      queryClient.invalidateQueries({ queryKey: ['me'] }),
    ]);
    setRefreshing(false);
  }, [user?.id, queryClient]);

  const handleEditProfile = () => {
    router.push('/(screens)/edit-profile');
  };

  const handleSettings = () => {
    router.push('/(screens)/settings');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView 
        style={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            tintColor={Colors.primary}
          />
        }
      >
        <ProfileHeader 
          username={user?.username || 'user'}
          bio={user?.profile?.bio || 'No bio yet. Tap edit to add one! ✨'}
          avatarUrl={user?.profile?.avatarUrl}
          onEditPress={handleEditProfile}
          onSettingsPress={handleSettings}
        />

        {statsLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={Colors.primary} size="small" />
          </View>
        ) : (
          <ProfileStats 
            postsCount={stats?.postsCount || 0}
            followersCount={stats?.followers || 0}
            followingCount={stats?.following || 0}
          />
        )}

        {/* Tab Switcher */}
        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'posts' && styles.activeTab]} 
            onPress={() => setActiveTab('posts')}
          >
            <Text style={[styles.tabText, activeTab === 'posts' && styles.activeTabText]}>Posts</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'saved' && styles.activeTab]} 
            onPress={() => setActiveTab('saved')}
          >
            <Text style={[styles.tabText, activeTab === 'saved' && styles.activeTabText]}>Saved</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.contentContainer}>
          {postsLoading ? (
            <View style={styles.loadingContainerLarge}>
              <ActivityIndicator color={Colors.primary} size="large" />
            </View>
          ) : activeTab === 'posts' ? (
            <ProfilePostGrid posts={posts || []} />
          ) : (
            <View style={styles.placeholderBox}>
              <Text style={styles.placeholderText}>Saved posts will appear here.</Text>
            </View>
          )}
        </View>

        {/* Padding for bottom */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  container: {
    flex: 1,
  },
  tabContainer: {
    flexDirection: 'row',
    marginTop: 24,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingHorizontal: 20,
  },
  tab: {
    paddingVertical: 12,
    marginRight: 24,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: Colors.primary,
  },
  tabText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.base,
    color: Colors.textSecondary,
  },
  activeTabText: {
    color: Colors.textPrimary,
  },
  contentContainer: {
    flex: 1,
  },
  placeholderBox: {
    padding: 60,
    alignItems: 'center',
  },
  placeholderText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  loadingContainer: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainerLarge: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
