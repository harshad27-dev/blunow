import React from "react";
import { Image, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { MatchRecommendation } from "@/types/match.types";

type SwipeCardProps = {
  profile: MatchRecommendation;
  onPress?: () => void;
  onPass?: () => void;
  onLike?: () => void;
  onChat?: () => void;
};

const fallbackProfileImage =
  "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=1200&q=90";

export const SwipeCard = ({
  profile,
  onPress,
  onPass,
  onLike,
  onChat,
}: SwipeCardProps) => (
  <TouchableOpacity
    className="overflow-hidden rounded-[28px] border border-[#222] bg-[#111]"
    onPress={onPress}
    activeOpacity={0.9}
  >
    <Image
      source={{ uri: profile.imageUrl || fallbackProfileImage }}
      className="h-[420px] w-full"
      resizeMode="cover"
    />
    <View className="absolute inset-x-0 bottom-0 bg-black/80 p-5">
      <View className="flex-row items-center justify-between">
        <Text className="flex-1 text-2xl font-extrabold text-white" numberOfLines={1}>
          {profile.name}, {profile.age}
        </Text>
        <View className="ml-3 flex-row items-center rounded-full bg-white px-3 py-2">
          <Ionicons name="sparkles" size={14} color="#050505" />
          <Text className="ml-1 text-xs font-extrabold text-[#050505]">
            {profile.matchScore}%
          </Text>
        </View>
      </View>
      <Text className="mt-2 text-sm font-semibold text-white/70" numberOfLines={1}>
        {profile.city} - {profile.distance}
      </Text>
      <Text className="mt-3 text-sm leading-5 text-white/80" numberOfLines={2}>
        {profile.quote}
      </Text>
      <View className="mt-4 flex-row items-center gap-3">
        <TouchableOpacity
          className="h-12 w-12 items-center justify-center rounded-full bg-white/10"
          onPress={onPass}
          activeOpacity={0.84}
        >
          <Ionicons name="close" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <TouchableOpacity
          className="h-12 flex-1 flex-row items-center justify-center rounded-full bg-white"
          onPress={onLike}
          activeOpacity={0.84}
        >
          <Ionicons name="heart" size={20} color="#050505" />
          <Text className="ml-2 text-base font-extrabold text-[#050505]">
            Connect
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="h-12 w-12 items-center justify-center rounded-full bg-white/10"
          onPress={onChat}
          activeOpacity={0.84}
        >
          <Ionicons name="chatbubble-ellipses" size={21} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  </TouchableOpacity>
);
