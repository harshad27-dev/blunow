import { View, Text, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useChatConversationsQuery } from '@/hooks/useChat';
import { Colors } from '@/constants/colors';
import { useColorScheme } from 'nativewind';
import { StatusBar } from 'expo-status-bar';

const HEADER_SHADOW = {
  shadowColor: Colors.black,
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.06,
  shadowRadius: 16,
  elevation: 2,
};

const ACTION_BUTTON_CLASS =
  'relative h-11 w-11 items-center justify-center rounded-full border border-border bg-bg-card active:bg-bg-elevated';

export default function Header() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const logoSource = colorScheme === 'dark'
    ? require('@/assets/images/logo.png')
    : require('@/assets/images/logoBlack.png');
  const { data: conversations = [] } = useChatConversationsQuery();

  const unreadChats = conversations.reduce(
    (total, conversation) => total + (conversation.unreadCount ?? 0),
    0,
  );

  return (
    <SafeAreaView edges={['top']} className="border-b border-border bg-bg">
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <View className="flex-row items-center justify-between px-5 pb-3 pt-2">
        <View className="flex-row items-center">
          <Image
            source={logoSource}
            className="h-10 w-32"
            resizeMode="contain"
          />
        </View>

        <View className="flex-row items-center gap-3">
          <TouchableOpacity 
            className={ACTION_BUTTON_CLASS}
            activeOpacity={0.78}
            onPress={() => router.push('/(screens)/create-post')}
            style={HEADER_SHADOW}
          >
            <Ionicons name="add" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            className={ACTION_BUTTON_CLASS}
            activeOpacity={0.78}
            onPress={() => router.push('/(screens)/notifications')}
            style={HEADER_SHADOW}
          >
            <Ionicons
              name="notifications-outline"
              size={20}
              color={Colors.textPrimary}
            />
          </TouchableOpacity>

          <TouchableOpacity 
            className={ACTION_BUTTON_CLASS}
            activeOpacity={0.78}
            onPress={() => router.push('/(tabs)/chat')}
            style={HEADER_SHADOW}
          >
            <Ionicons
              name="chatbubble-ellipses-outline"
              size={20}
              color={Colors.textPrimary}
            />
            
            {unreadChats > 0 && (
              <View className="absolute -right-1 -top-1 h-5 min-w-5 items-center justify-center rounded-full border-2 border-bg bg-primary-light px-1">
                <Text className="text-[10px] font-extrabold text-white">
                  {unreadChats > 9 ? '9+' : unreadChats}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
