import { View, Text, Image, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');
const cardInset = 32;
const mediaHeight = Math.min(width - cardInset, 390);

const getStableImageNumber = (value: string, offset: number) => {
  const total = value.split('').reduce((sum, char) => sum + char.charCodeAt(0), offset);
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
    timeAgo: string;
  };
}

export default function FeedCard({ post }: FeedCardProps) {
  const hasImage = Boolean(post.mediaUrls?.length);
  const avatarUrl = post.author.avatarUrl || `https://i.pravatar.cc/300?u=${post.author.username}`;
  const reactionAvatars = [
    `https://i.pravatar.cc/100?img=${getStableImageNumber(post.id, 12)}`,
    `https://i.pravatar.cc/100?img=${getStableImageNumber(post.id, 23)}`,
    `https://i.pravatar.cc/100?img=${getStableImageNumber(post.id, 34)}`,
  ];

  return (
    <View className="mx-4 mb-6 overflow-hidden rounded-[28px] bg-[#0F0F0F]">
      <View className="flex-row items-center justify-between px-4 py-4">
        <View className="min-w-0 flex-1 flex-row items-center">
          <View className="mr-3 h-12 w-12 overflow-hidden rounded-full border border-[#2A2A2A] bg-[#1A1A1A]">
            <Image source={{ uri: avatarUrl }} className="h-full w-full" />
          </View>

          <View className="min-w-0 flex-1">
            <View className="flex-row items-center">
              <Text className="max-w-[82%] text-[15px] font-extrabold text-white" numberOfLines={1}>
                {post.author.username}
              </Text>
              <View className="ml-1.5 h-4 w-4 items-center justify-center rounded-full bg-white">
                <Ionicons name="checkmark" size={11} color={Colors.black} />
              </View>
            </View>

            <View className="mt-1 flex-row items-center">
              <Text className="text-xs font-medium text-[#8A8A8A]" numberOfLines={1}>
                {post.timeAgo}
              </Text>
              <View className="mx-2 h-1 w-1 rounded-full bg-[#555555]" />
              <Ionicons name="location-outline" size={12} color={Colors.textSecondary} />
              <Text className="ml-1 text-xs font-medium text-[#8A8A8A]" numberOfLines={1}>
                Nearby
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          activeOpacity={0.75}
          className="ml-3 h-10 w-10 items-center justify-center rounded-full bg-[#1A1A1A]"
        >
          <Ionicons name="ellipsis-horizontal" size={18} color={Colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {hasImage ? (
        <View className="mx-3 overflow-hidden rounded-[24px] bg-[#1A1A1A]" style={{ height: mediaHeight }}>
          <Image source={{ uri: post.mediaUrls![0] }} className="h-full w-full" resizeMode="cover" />
          <LinearGradient
            colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.68)']}
            className="absolute bottom-0 left-0 right-0 h-32"
          />

          <View className="absolute bottom-3 left-3 right-3 flex-row items-end justify-between">
            <View className="max-w-[74%]">
              <Text className="text-[11px] font-extrabold uppercase tracking-wider text-white/70">
                Live moment
              </Text>
              <Text className="mt-1 text-lg font-extrabold text-white" numberOfLines={1}>
                {`${post.author.username}'s update`}
              </Text>
            </View>

            <View className="rounded-full bg-black/55 px-3 py-1.5">
              <Text className="text-xs font-extrabold text-white">
                1/{post.mediaUrls?.length || 1}
              </Text>
            </View>
          </View>
        </View>
      ) : (
        <View className="mx-3 rounded-[24px] border border-[#242424] bg-[#151515] px-5 py-7">
          <Ionicons name="chatbubble-ellipses-outline" size={28} color={Colors.textSecondary} />
          <Text className="mt-4 text-xl font-extrabold leading-7 text-white">
            {post.caption || 'Shared a fresh moment from the city.'}
          </Text>
        </View>
      )}

      <View className="px-5 pb-4 pt-4">
        {hasImage && (
          <Text className="text-[15px] leading-6 text-[#E8E8E8]">
            <Text className="font-extrabold text-white">{post.author.username} </Text>
            {post.caption || 'Shared a fresh moment from the city.'}
          </Text>
        )}

        <View className="mt-4 flex-row items-center justify-between">
          <View className="mr-3 min-w-0 flex-1 flex-row items-center">
            {reactionAvatars.map((avatar, index) => (
              <Image
                key={avatar}
                source={{ uri: avatar }}
                className="h-7 w-7 rounded-full border-2 border-[#0F0F0F] bg-[#1A1A1A]"
                style={{ marginLeft: index === 0 ? 0 : -8 }}
              />
            ))}
            <Text className="ml-2 flex-1 text-xs font-semibold text-[#8A8A8A]" numberOfLines={1}>
              {post.likesCount} likes
            </Text>
          </View>

          <View className="flex-row items-center rounded-full border border-[#242424] bg-[#151515] px-3 py-2">
            <Ionicons name="eye-outline" size={14} color={Colors.textSecondary} />
            <Text className="ml-1.5 text-xs font-bold text-[#A0A0A0]">2.4k</Text>
          </View>
        </View>
      </View>

      <View className="mx-4 mb-4 h-px bg-[#242424]" />

      <View className="flex-row items-center justify-between px-4 pb-4">
        <View className="flex-row items-center">
          <TouchableOpacity
            activeOpacity={0.75}
            className={`mr-2 flex-row items-center rounded-full px-4 py-3 ${
              post.isLiked ? 'bg-white' : 'bg-[#1A1A1A]'
            }`}
          >
            <Ionicons
              name={post.isLiked ? 'heart' : 'heart-outline'}
              size={18}
              color={post.isLiked ? Colors.black : Colors.textPrimary}
            />
            <Text
              className={`ml-2 text-sm font-extrabold ${
                post.isLiked ? 'text-black' : 'text-white'
              }`}
            >
              {post.likesCount}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity activeOpacity={0.75} className="flex-row items-center rounded-full bg-[#1A1A1A] px-4 py-3">
            <Ionicons name="chatbubble-outline" size={18} color={Colors.textPrimary} />
            <Text className="ml-2 text-sm font-extrabold text-white">{post.commentsCount}</Text>
          </TouchableOpacity>
        </View>

        <View className="flex-row items-center">
          <TouchableOpacity activeOpacity={0.75} className="mr-2 h-11 w-11 items-center justify-center rounded-full bg-[#1A1A1A]">
            <Ionicons name="paper-plane-outline" size={18} color={Colors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.75} className="h-11 w-11 items-center justify-center rounded-full bg-[#1A1A1A]">
            <Ionicons
              name={post.isSaved ? 'bookmark' : 'bookmark-outline'}
              size={18}
              color={Colors.textPrimary}
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
