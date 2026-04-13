import { useState } from 'react';
import { View, FlatList, RefreshControl, ActivityIndicator, Text, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Header from '@/components/Header';
import FeedCard from '@/components/FeedCard';
import { useFeedQuery, useCreatePostMutation } from '@/hooks/queries';

const getTimeAgo = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

export default function FeedScreen() {
  const { data: feedData, isLoading, isFetching, refetch } = useFeedQuery();
  const createPostMutation = useCreatePostMutation();
  const [quickCaption, setQuickCaption] = useState('');

  const posts = feedData?.map((p: any) => ({
    id: p.postId,
    author: {
      username: p.author.username || 'user',
      avatarUrl: p.author.avatarUrl
    },
    caption: p.caption,
    mediaUrls: p.mediaUrls || [],
    likesCount: 0, // Mock until stats are added to query
    commentsCount: 0, // Mock until stats are added to query
    timeAgo: p.createdAt ? getTimeAgo(p.createdAt) : 'just now'
  })) || [];

  const onRefresh = () => {
    refetch();
  };

  const handleQuickPost = () => {
    if (!quickCaption.trim() || createPostMutation.isPending) return;
    createPostMutation.mutate(
      { caption: quickCaption.trim() },
      { onSuccess: () => setQuickCaption('') }
    );
  };

  const renderHeader = () => (
    <View className="bg-[#0F0F0F] mx-4 mt-4 mb-6 p-4 rounded-2xl border border-[#222]">
      <View className="flex-row items-center mb-3">
        <View className="w-10 h-10 rounded-full bg-[#222] items-center justify-center mr-3 overflow-hidden">
          <Ionicons name="person" size={20} color="#888" />
        </View>
        <TextInput
          className="flex-1 text-white font-medium text-base"
          placeholder="What's your vibe today?"
          placeholderTextColor="#666"
          value={quickCaption}
          onChangeText={setQuickCaption}
          multiline
          maxLength={280}
        />
      </View>
      <View className="flex-row items-center justify-between pt-2 border-t border-[#222]">
        <View className="flex-row gap-4">
          <TouchableOpacity activeOpacity={0.7}>
            <Ionicons name="image-outline" size={22} color="#888" />
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.7}>
            <Ionicons name="location-outline" size={22} color="#888" />
          </TouchableOpacity>
        </View>
        <TouchableOpacity 
          className={`px-4 py-1.5 rounded-full ${quickCaption.trim() ? 'bg-white' : 'bg-[#333]'}`}
          disabled={!quickCaption.trim() || createPostMutation.isPending}
          onPress={handleQuickPost}
        >
          {createPostMutation.isPending ? (
            <ActivityIndicator size="small" color="#000" />
          ) : (
            <Text className={`font-bold text-sm ${quickCaption.trim() ? 'text-black' : 'text-[#666]'}`}>
              Post
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View className="flex-1 bg-[#050505]">
      <Header />
      {isLoading ? (
         <View className="flex-1 justify-center items-center">
           <ActivityIndicator color="#FFF" size="large" />
         </View>
      ) : posts.length === 0 ? (
         <View className="flex-1 justify-center items-center px-6">
           <Text className="text-white font-medium text-lg text-center">No posts to show.</Text>
           <Text className="text-[#888888] text-center mt-2">Create a post or follow more people to get started.</Text>
         </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <FeedCard post={item} />}
          ListHeaderComponent={renderHeader}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isFetching} onRefresh={onRefresh} tintColor="#FFF" />}
          contentContainerStyle={{ paddingBottom: 100 }} // Leave room for bottom tab bar
        />
      )}
    </View>
  );
}
