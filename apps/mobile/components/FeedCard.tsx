import { View, Text, Image, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

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
    timeAgo: string;
  };
}

export default function FeedCard({ post }: FeedCardProps) {
  const hasImage = post.mediaUrls && post.mediaUrls.length > 0;

  return (
    <View className="mb-8 mx-4 rounded-3xl bg-[#0a0a0a] border border-[#1f1f1f] shadow-2xl overflow-hidden">
      
      {/* Header: Author & Time */}
      <View className="flex-row items-center justify-between px-4 py-4">
        <View className="flex-row items-center">
          <View className="rounded-full border-2 border-[#333] p-0.5 mr-3">
             <Image 
               source={{ uri: post.author.avatarUrl || 'https://i.pravatar.cc/300?u=' + post.author.username }} 
               className="w-10 h-10 rounded-full bg-[#111]" 
             />
          </View>
          <View className="justify-center">
            <Text className="text-white font-bold text-sm tracking-wide mb-0.5">{post.author.username}</Text>
            <Text className="text-[#666] font-medium text-[11px] uppercase tracking-wider">{post.timeAgo}</Text>
          </View>
        </View>
        
        <TouchableOpacity className="w-8 h-8 rounded-full bg-[#1a1a1a] items-center justify-center active:bg-[#333]">
          <Ionicons name="ellipsis-horizontal" size={16} color="#AAA" />
        </TouchableOpacity>
      </View>

      {/* Caption Content (Moved above image for text-first flow, or keep below? Usually short text over image, long text below. Let's keep it below but styled beautifully) */}
      
      {/* Media (Image) */}
      {hasImage && (
        <View className="w-full relative" style={{ height: width }}>
          <Image 
            source={{ uri: post.mediaUrls![0] }} 
            className="w-full h-full"
            resizeMode="cover"
          />
          {/* Subtle gradient overlay at bottom of image for blending */}
          <LinearGradient
            colors={['transparent', 'rgba(10,10,10,0.8)']}
            className="absolute bottom-0 left-0 right-0 h-24"
          />
        </View>
      )}

      {/* Caption Content */}
      {post.caption ? (
        <View className={`px-5 ${hasImage ? '-mt-6 z-10 relative' : 'pb-2'} mb-3`}>
          <Text className="text-[#EAEAEA] text-[15px] leading-6 tracking-wide">
            {!hasImage && <Text className="font-extrabold text-white mr-2">{post.author.username} </Text>}
            {post.caption}
          </Text>
        </View>
      ) : null}

      {/* Actions (Like, Comment, Share, Bookmark) */}
      <View className="flex-row items-center justify-between px-5 py-4 border-t border-[#1a1a1a]">
        <View className="flex-row items-center gap-4">
          <TouchableOpacity className="flex-row items-center gap-2 active:opacity-50">
            <View className="w-9 h-9 rounded-full bg-[#1a1a1a] items-center justify-center">
               <Ionicons name="heart-outline" size={20} color="#FFF" />
            </View>
            {post.likesCount > 0 && <Text className="text-white font-semibold text-sm">{post.likesCount}</Text>}
          </TouchableOpacity>
          
          <TouchableOpacity className="flex-row items-center gap-2 active:opacity-50">
            <View className="w-9 h-9 rounded-full bg-[#1a1a1a] items-center justify-center">
               <Ionicons name="chatbubble-outline" size={18} color="#FFF" />
            </View>
            {post.commentsCount > 0 && <Text className="text-white font-semibold text-sm">{post.commentsCount}</Text>}
          </TouchableOpacity>

          <TouchableOpacity className="w-9 h-9 rounded-full bg-[#1a1a1a] items-center justify-center active:opacity-50">
            <Ionicons name="paper-plane-outline" size={18} color="#FFF" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity className="w-9 h-9 rounded-full bg-[#1a1a1a] items-center justify-center active:opacity-50 border border-[#333]">
          <Ionicons name="bookmark-outline" size={18} color="#FFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
}
