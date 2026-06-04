import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { useCreatePostMutation } from "@/hooks/queries";

export default function CreatePostScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [caption, setCaption] = useState("");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isPublic, setIsPublic] = useState(true);
  const [isAnonymous, setIsAnonymous] = useState(false);

  const createPostMutation = useCreatePostMutation();
  const isLoading = createPostMutation.isPending;

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission needed",
        "We need access to your gallery to add photos.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission needed",
        "We need access to your camera to take photos.",
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handlePost = () => {
    // If we only have text, that's fine too for a quick post (if backend allows it, assuming so since caption is optional in the interface but we should enforce at least one)
    if (!imageUri && !caption.trim()) {
      Alert.alert("Required", "Please add some text or an image to post.");
      return;
    }

    createPostMutation.mutate(
      {
        caption: caption.trim() || undefined,
        imageUri,
        isPublic,
        isAnonymous,
      },
      {
        onSuccess: () => {
          router.back();
        },
        onError: (error: any) => {
          console.error("Post creation failed:", error);
          Alert.alert(
            "Upload Failed",
            error?.response?.data?.message ||
              "Something went wrong while posting.",
          );
        },
      },
    );
  };

  const isPostDisabled = (!imageUri && !caption.trim()) || isLoading;

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-[#050505]"
      style={{ paddingTop: insets.top }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 py-4">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full bg-[#111] border border-[#222] items-center justify-center active:bg-[#222]"
          disabled={isLoading}
        >
          <Ionicons name="close" size={24} color="#FFF" />
        </TouchableOpacity>

        <Text className="text-white font-extrabold text-lg tracking-wide">
          Create Post
        </Text>

        <TouchableOpacity
          onPress={handlePost}
          className={`h-10 px-5 rounded-full items-center justify-center border ${
            isPostDisabled ? "bg-[#111] border-[#222]" : "bg-white border-white"
          }`}
          disabled={isPostDisabled}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#000" />
          ) : (
            <Text
              className={`font-bold text-sm tracking-wide ${isPostDisabled ? "text-[#666]" : "text-black"}`}
            >
              Publish
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
        {/* Caption Input */}
        <View className="px-5">
          <TextInput
            className="text-white font-medium text-xl py-6 min-h-[140px]"
            style={{ textAlignVertical: "top" }}
            placeholder="Share what's on your mind..."
            placeholderTextColor="#444"
            multiline
            autoFocus
            value={caption}
            onChangeText={setCaption}
            editable={!isLoading}
            selectionColor="#FFF"
          />
        </View>

        {/* Cinematic Image Preview */}
        {imageUri ? (
          <View className="px-4 pb-8">
            <View className="relative rounded-[32px] overflow-hidden border border-[#222] shadow-2xl bg-[#0a0a0a]">
              <Image
                source={{ uri: imageUri }}
                className="w-full h-[400px]"
                resizeMode="cover"
              />
              {/* Floating Close Button */}
              <TouchableOpacity
                className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/60 items-center justify-center border border-white/20"
                onPress={() => setImageUri(null)}
                disabled={isLoading}
                activeOpacity={0.7}
              >
                <Ionicons name="trash-outline" size={20} color="#FFF" />
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        <View className="px-5 pb-6">
          <TouchableOpacity
            className={`flex-row items-center rounded-[22px] border px-4 py-4 ${
              isAnonymous
                ? "border-white bg-white"
                : "border-[#242424] bg-[#0f0f0f]"
            }`}
            onPress={() => setIsAnonymous((value) => !value)}
            disabled={isLoading}
            activeOpacity={0.82}
          >
            <View
              className={`mr-3 h-10 w-10 items-center justify-center rounded-full ${
                isAnonymous ? "bg-black" : "bg-[#1a1a1a]"
              }`}
            >
              <Ionicons
                name={isAnonymous ? "eye-off" : "eye-off-outline"}
                size={20}
                color={isAnonymous ? "#FFF" : "#A0A0A0"}
              />
            </View>
            <View className="flex-1">
              <Text
                className={`text-base font-extrabold ${
                  isAnonymous ? "text-black" : "text-white"
                }`}
              >
                Post anonymously
              </Text>
              <Text
                className={`mt-1 text-xs font-medium ${
                  isAnonymous ? "text-black/60" : "text-[#888]"
                }`}
              >
                Your name and avatar will be hidden in the feed.
              </Text>
            </View>
            <Ionicons
              name={isAnonymous ? "checkmark-circle" : "ellipse-outline"}
              size={22}
              color={isAnonymous ? "#000" : "#666"}
            />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Floating Toolbar Dock */}
      <View
        className="mx-4 mb-4 rounded-[28px] bg-[#0f0f0f] border border-[#222] flex-row items-center justify-between p-2 mt-auto"
        style={{ paddingBottom: Math.max(insets.bottom - 8, 8) }} // Adjust for safe areas nicely
      >
        <View className="flex-row items-center gap-1">
          <TouchableOpacity
            className="w-12 h-12 rounded-full bg-[#1a1a1a] items-center justify-center active:opacity-60"
            onPress={handlePickImage}
            disabled={isLoading}
          >
            <Ionicons name="image-outline" size={24} color="#FFF" />
          </TouchableOpacity>
          <TouchableOpacity
            className="w-12 h-12 rounded-full bg-[#1a1a1a] items-center justify-center active:opacity-60"
            onPress={handleTakePhoto}
            disabled={isLoading}
          >
            <Ionicons name="camera-outline" size={24} color="#FFF" />
          </TouchableOpacity>
          <TouchableOpacity
            className="w-12 h-12 rounded-full bg-[#1a1a1a] items-center justify-center active:opacity-60"
            onPress={() =>
              Alert.alert("Location", "Location tagging coming soon!")
            }
          >
            <Ionicons name="location-outline" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>

        {/* Privacy Pill */}
        <TouchableOpacity
          className="flex-row items-center bg-[#1a1a1a] border border-[#333] px-4 h-12 rounded-full gap-2 active:opacity-60 mr-1"
          onPress={() => setIsPublic(!isPublic)}
          disabled={isLoading}
        >
          <Ionicons
            name={isPublic ? "earth" : "people"}
            size={18}
            color={isPublic ? "#4A90E2" : "#FFF"}
          />
          <Text className="text-white font-semibold text-sm">
            {isPublic ? "Public" : "Friends"}
          </Text>
          <Ionicons name="chevron-down" size={14} color="#888" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
