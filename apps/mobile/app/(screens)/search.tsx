import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Input } from '@/components/common/Input';
import { DiscoverUserCard } from '@/components/discover/DiscoverUserCard';
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

  const { data, isLoading } = useSearchQuery(debouncedQuery, 'users');
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
    <SafeAreaView className="flex-1 bg-[#050505]">
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        {/* Header */}
        <View className="flex-row items-center px-5 pt-2 pb-1">
          <TouchableOpacity 
            className="w-11 h-11 rounded-full bg-[#111] items-center justify-center mr-3 border border-[#222]" 
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#F5F5F5" />
          </TouchableOpacity>
          
          <View className="flex-1">
            <Input
              value={searchQuery}
              onChangeText={runSearch}
              placeholder="Search people or interests..."
              autoFocus
              icon={<Ionicons name="search" size={20} color="#FFFFFF" />}
              containerStyle={{ marginBottom: 0 }}
            />
          </View>
        </View>

        <View className="flex-1 px-5 mt-5">
          {searchQuery.length < 2 ? (
            <ScrollView showsVerticalScrollIndicator={false}>
              {recentSearches.length ? (
                <View className="mb-8">
                <View className="flex-row justify-between items-center mb-4">
                  <Text className="text-[#F5F5F3] font-bold text-lg">Recent</Text>
                  <TouchableOpacity onPress={() => setRecentSearches([])}>
                    <Text className="text-[#888888] font-medium text-sm">Clear all</Text>
                  </TouchableOpacity>
                </View>
                <View>
                  {recentSearches.map((item, index) => (
                    <TouchableOpacity 
                      key={index} 
                      className="flex-row items-center py-3 border-b border-[#222]"
                      onPress={() => setSearchQuery(item)}
                    >
                      <Ionicons name="time-outline" size={18} color="#444" />
                      <Text className="flex-1 text-[#888888] font-normal text-base ml-3">{item}</Text>
                      <TouchableOpacity className="p-1">
                        <Ionicons name="close" size={16} color="#444" />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  ))}
                </View>
                </View>
              ) : null}

              {/* Trending Topics */}
              {trendingTopics.length ? (
                <View className="mb-8">
                <Text className="text-[#F5F5F3] font-bold text-lg mb-4">Trending</Text>
                <View className="flex-row flex-wrap">
                  {trendingTopics.map((topic, index) => (
                    <TouchableOpacity 
                      key={index} 
                      className="bg-[#111] px-4 py-2.5 rounded-full mr-2.5 mb-2.5 border border-[#222]"
                      onPress={() => setSearchQuery(topic)}
                    >
                      <Text className="text-[#F5F5F3] font-medium text-sm">#{topic}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                </View>
              ) : null}
            </ScrollView>
          ) : (
            <View className="flex-1">
              {isLoading ? (
                <View className="flex-1 items-center justify-center pt-20">
                  <ActivityIndicator size="large" color="#FFFFFF" />
                  <Text className="text-[#888888] font-medium text-base mt-4 text-center">
                    {`Searching for "${searchQuery}"...`}
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={users}
                  keyExtractor={(item) => item.id}
                  showsVerticalScrollIndicator={false}
                  renderItem={({ item }) => (
                    <View className="mb-5 -mx-5 items-center">
                      <DiscoverUserCard 
                        user={item} 
                        onPress={() => router.push(`/(screens)/user/${item.id}`)}
                        onConnectPress={() => handleConnect(item)}
                        onMessagePress={() => router.push('/(screens)/chat' as any)}
                      />
                    </View>
                  )}
                  ListEmptyComponent={() => (
                    <View className="flex-1 items-center justify-center pt-20">
                      <Ionicons name="search-outline" size={48} color="#444" />
                      <Text className="text-[#444] font-medium text-base mt-4 text-center">
                        {`No results found for "${searchQuery}"`}
                      </Text>
                    </View>
                  )}
                  contentContainerStyle={{ paddingBottom: 40 }}
                />
              )}
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
