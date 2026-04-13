import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ChatListScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View 
      className="flex-1 bg-[#050505]"
      style={{ paddingTop: insets.top }}
    >
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 border-b border-[#1a1a1a]">
        <TouchableOpacity 
          onPress={() => router.back()} 
          className="w-10 h-10 items-center justify-center -ml-2"
        >
          <Ionicons name="chevron-back" size={28} color="#FFF" />
        </TouchableOpacity>
        <Text className="text-white text-xl font-bold ml-2">Messages</Text>
      </View>

      {/* Empty State / Content */}
      <View className="flex-1 items-center justify-center px-6">
        <View className="w-20 h-20 rounded-full bg-[#111] items-center justify-center mb-4 border border-[#222]">
          <Ionicons name="chatbubbles-outline" size={32} color="#888" />
        </View>
        <Text className="text-white font-bold text-xl text-center mb-2">No messages yet</Text>
        <Text className="text-[#888] text-center text-sm leading-5">
          When you match with someone or start a conversation, your messages will appear here.
        </Text>
      </View>
    </View>
  );
}
