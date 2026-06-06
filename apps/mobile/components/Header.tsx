import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useChatConversationsQuery } from '@/hooks/useChat';

export default function Header() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data: conversations = [] } = useChatConversationsQuery();

  const unreadChats = conversations.reduce(
    (total, conversation) => total + (conversation.unreadCount ?? 0),
    0,
  );

  return (
    <View 
      className="flex-row items-center justify-between px-5 pb-3 bg-[#050505] border-b border-[#1a1a1a]" 
      style={{ paddingTop: insets.top + 8 }}
    >
      {/* Left side: Logo */}
      <View className="flex-row items-center">
        <Text className="text-white text-2xl font-extrabold tracking-widest lowercase">
          blunow
        </Text>
      </View>

      {/* Right side: Actions */}
      <View className="flex-row items-center gap-3">
        {/* Create Post */}
        <TouchableOpacity 
          className="w-10 h-10 rounded-full bg-[#111] border border-[#222] items-center justify-center active:bg-[#222]" 
          activeOpacity={0.7}
          onPress={() => router.push('/(screens)/create-post')}
        >
          <Ionicons name="add" size={24} color="#FFF" />
        </TouchableOpacity>
        
        {/* Notifications */}
        <TouchableOpacity 
          className="w-10 h-10 rounded-full bg-[#111] border border-[#222] items-center justify-center active:bg-[#222] relative" 
          activeOpacity={0.7}
          onPress={() => router.push('/(screens)/notifications')}
        >
          <Ionicons name="notifications-outline" size={20} color="#FFF" />
        </TouchableOpacity>

        {/* Chat / Inbox */}
        <TouchableOpacity 
          className="w-10 h-10 rounded-full bg-[#111] border border-[#222] items-center justify-center active:bg-[#222] relative" 
          activeOpacity={0.7}
          onPress={() => router.push('/(screens)/chat' as any)}
        >
          <Ionicons name="chatbubble-ellipses-outline" size={20} color="#FFF" />
          
          {/* Dynamic Unread Badge */}
          {unreadChats > 0 && (
            <View className="absolute -top-1 -right-1 bg-blue-600 w-5 h-5 rounded-full items-center justify-center border-2 border-[#050505]">
              <Text className="text-white text-[10px] font-extrabold">
                {unreadChats > 9 ? '9+' : unreadChats}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
