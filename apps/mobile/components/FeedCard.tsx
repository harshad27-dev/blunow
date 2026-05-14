import { View, Text, Image, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');
const cardInset = 32;
const mediaHeight = Math.min(width - cardInset, 420);

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
    timeAgo: string;
  };
}

export default function FeedCard({ post }: FeedCardProps) {
  const hasImage = post.mediaUrls && post.mediaUrls.length > 0;
  const reactionAvatars = [
    `https://i.pravatar.cc/100?img=${getStableImageNumber(post.id, 12)}`,
    `https://i.pravatar.cc/100?img=${getStableImageNumber(post.id, 23)}`,
    `https://i.pravatar.cc/100?img=${getStableImageNumber(post.id, 34)}`,
  ];

  return (
    <View className="mx-4 mb-7 overflow-hidden rounded-[30px] border border-[#262A33] bg-[#080A0F] shadow-2xl">
      <LinearGradient
        colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0)', 'rgba(255,255,255,0.04)']}
        className="absolute inset-0"
      />

      <View className="flex-row items-center justify-between px-4 pb-3 pt-4">
        <View className="flex-1 flex-row items-center">
          <View className="mr-3 rounded-[19px] border border-white/15 bg-[#11151F] p-1">
            <Image
              source={{ uri: post.author.avatarUrl || `https://i.pravatar.cc/300?u=${post.author.username}` }}
              className="h-11 w-11 rounded-[15px] bg-[#151922]"
            />
            <View className="absolute -bottom-1 -right-1 h-5 w-5 items-center justify-center rounded-full border-2 border-[#080A0F] bg-[#22C55E]">
              <View className="h-2 w-2 rounded-full bg-white" />
            </View>
          </View>
          <View className="flex-1 justify-center">
            <View className="flex-row items-center gap-1.5">
              <Text className="text-[15px] font-extrabold text-white" numberOfLines={1}>
                {post.author.username}
              </Text>
              <View className="h-5 w-5 items-center justify-center rounded-full bg-[#3B82F6]">
                <Ionicons name="checkmark" size={13} color={Colors.white} />
              </View>
            </View>
            <View className="mt-1 flex-row items-center gap-1.5">
              <Ionicons name="location-outline" size={12} color="#8D95A5" />
              <Text className="text-[11px] font-semibold uppercase tracking-wider text-[#8D95A5]">
                Downtown loop
              </Text>
              <View className="h-1 w-1 rounded-full bg-[#555B66]" />
              <Text className="text-[11px] font-semibold uppercase tracking-wider text-[#8D95A5]">
                {post.timeAgo}
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity className="h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 active:bg-white/10">
          <Ionicons name="ellipsis-horizontal" size={17} color="#D7DBE2" />
        </TouchableOpacity>
      </View>

      {hasImage && (
        <View className="relative mx-3 overflow-hidden rounded-[26px] bg-[#11151F]" style={{ height: mediaHeight }}>
          <Image
            source={{ uri: post.mediaUrls![0] }}
            className="h-full w-full"
            resizeMode="cover"
          />
          <LinearGradient
            colors={['rgba(0,0,0,0.08)', 'transparent', 'rgba(0,0,0,0.86)']}
            locations={[0, 0.48, 1]}
            className="absolute inset-0"
          />
          <View className="absolute left-4 top-4 flex-row items-center gap-2 rounded-full bg-black/55 px-3 py-2">
            <Ionicons name="sparkles-outline" size={14} color="#FFFFFF" />
            <Text className="text-xs font-bold uppercase tracking-wider text-white">Featured</Text>
          </View>
          <View className="absolute right-4 top-4 rounded-full bg-black/55 px-3 py-2">
            <Text className="text-xs font-bold text-white">1/{post.mediaUrls?.length || 1}</Text>
          </View>
          <View className="absolute bottom-4 left-4 right-4">
            <View className="mb-3 flex-row flex-wrap gap-2">
              <View className="flex-row items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5">
                <Ionicons name="flame-outline" size={13} color="#FFB86B" />
                <Text className="text-xs font-bold text-white">Trending nearby</Text>
              </View>
              <View className="flex-row items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5">
                <Ionicons name="radio-outline" size={13} color="#A7F3D0" />
                <Text className="text-xs font-bold text-white">Live vibe</Text>
              </View>
            </View>
          </View>
        </View>
      )}

      <View className="px-5 pb-4 pt-4">
        <View className="mb-3 flex-row items-center justify-between">
          <View className="mr-3 flex-1 flex-row items-center">
            {reactionAvatars.map((avatar, index) => (
              <Image
                key={avatar}
                source={{ uri: avatar }}
                className="h-7 w-7 rounded-full border-2 border-[#080A0F] bg-[#171B24]"
                style={{ marginLeft: index === 0 ? 0 : -9 }}
              />
            ))}
            <Text className="ml-2 flex-1 text-xs font-semibold text-[#A8AFBD]" numberOfLines={1}>
              Ava, Noor and 12 others liked this
            </Text>
          </View>
          <View className="flex-row items-center gap-1 rounded-full bg-[#121722] px-2.5 py-1.5">
            <Ionicons name="eye-outline" size={13} color="#A8AFBD" />
            <Text className="text-xs font-bold text-[#A8AFBD]">2.4k</Text>
          </View>
        </View>

        {post.caption ? (
          <Text className="text-[15px] leading-6 text-[#E6E9EF]">
            <Text className="font-extrabold text-white">{post.author.username} </Text>
            {post.caption}
          </Text>
        ) : (
          <Text className="text-[15px] leading-6 text-[#E6E9EF]">
            <Text className="font-extrabold text-white">{post.author.username} </Text>
            Shared a fresh moment from the city.
          </Text>
        )}

        <View className="mt-4 flex-row gap-2">
          <View className="rounded-full border border-white/10 bg-white/5 px-3 py-2">
            <Text className="text-xs font-bold text-[#DDE2EA]">#weekend</Text>
          </View>
          <View className="rounded-full border border-white/10 bg-white/5 px-3 py-2">
            <Text className="text-xs font-bold text-[#DDE2EA]">#blunow</Text>
          </View>
          <View className="rounded-full border border-white/10 bg-white/5 px-3 py-2">
            <Text className="text-xs font-bold text-[#DDE2EA]">#nearby</Text>
          </View>
        </View>
      </View>

      <View className="mx-4 mb-4 flex-row items-center justify-between rounded-[22px] border border-white/10 bg-[#0D111A] p-2">
        <View className="flex-row items-center gap-2">
          <TouchableOpacity className="flex-row items-center gap-2 rounded-2xl bg-white px-3 py-2.5 active:opacity-80">
            <Ionicons name="heart" size={18} color="#05070B" />
            <Text className="text-sm font-extrabold text-[#05070B]">{post.likesCount || 128}</Text>
          </TouchableOpacity>

          <TouchableOpacity className="flex-row items-center gap-2 rounded-2xl bg-white/5 px-3 py-2.5 active:bg-white/10">
            <Ionicons name="chatbubble-outline" size={18} color="#FFFFFF" />
            <Text className="text-sm font-bold text-white">{post.commentsCount || 24}</Text>
          </TouchableOpacity>
        </View>

        <View className="flex-row items-center gap-2">
          <TouchableOpacity className="h-11 w-11 items-center justify-center rounded-2xl bg-white/5 active:bg-white/10">
            <Ionicons name="paper-plane-outline" size={18} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity className="h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 active:bg-white/10">
            <Ionicons name="bookmark-outline" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
