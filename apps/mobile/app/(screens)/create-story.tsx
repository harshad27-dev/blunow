import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { useCreateStoryMutation } from "@/hooks/queries";

export default function CreateStoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const createStoryMutation = useCreateStoryMutation();
  const isLoading = createStoryMutation.isPending;

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [caption, setCaption] = useState("");

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission needed",
        "We need access to your gallery to add a story.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [9, 16],
      quality: 0.85,
    });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission needed",
        "We need access to your camera to create a story.",
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [9, 16],
      quality: 0.85,
    });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  const publishStory = () => {
    if (!imageUri) {
      Alert.alert("Add media", "Choose a photo or take one to post a story.");
      return;
    }

    createStoryMutation.mutate(
      {
        imageUri,
        caption,
      },
      {
        onSuccess: () => router.back(),
        onError: (error: any) => {
          Alert.alert(
            "Story failed",
            error?.response?.data?.message ||
              "Something went wrong while posting your story.",
          );
        },
      },
    );
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-[#050505]"
      style={{ paddingTop: insets.top }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View className="flex-row items-center justify-between px-5 py-4">
        <TouchableOpacity
          className="h-10 w-10 items-center justify-center rounded-full border border-[#222222] bg-[#111111]"
          onPress={() => router.back()}
          disabled={isLoading}
          activeOpacity={0.78}
        >
          <Ionicons name="close" size={23} color="#FFFFFF" />
        </TouchableOpacity>

        <Text className="text-lg font-extrabold text-white">Create Story</Text>

        <TouchableOpacity
          className={`h-10 rounded-full px-5 items-center justify-center ${
            imageUri && !isLoading ? "bg-white" : "bg-[#151515]"
          }`}
          onPress={publishStory}
          disabled={!imageUri || isLoading}
          activeOpacity={0.82}
        >
          {isLoading ? (
            <ActivityIndicator color="#000000" />
          ) : (
            <Text
              className={`text-sm font-extrabold ${
                imageUri ? "text-black" : "text-[#666666]"
              }`}
            >
              Share
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <View className="flex-1 px-4 pb-4">
        <View className="flex-1 overflow-hidden rounded-[32px] border border-[#242424] bg-[#0F0F0F]">
          {imageUri ? (
            <>
              <Image
                source={{ uri: imageUri }}
                className="absolute inset-0 h-full w-full"
                resizeMode="cover"
              />
              <View className="absolute inset-x-0 bottom-0 bg-black/60 px-4 pb-4 pt-5">
                <TextInput
                  className="max-h-28 rounded-[20px] border border-white/10 bg-black/55 px-4 py-3 text-base font-semibold text-white"
                  placeholder="Add a caption..."
                  placeholderTextColor="#A0A0A0"
                  multiline
                  value={caption}
                  onChangeText={setCaption}
                  editable={!isLoading}
                  selectionColor="#FFFFFF"
                />
              </View>
              <TouchableOpacity
                className="absolute right-4 top-4 h-10 w-10 items-center justify-center rounded-full bg-black/60"
                onPress={() => setImageUri(null)}
                disabled={isLoading}
                activeOpacity={0.78}
              >
                <Ionicons name="trash-outline" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </>
          ) : (
            <View className="flex-1 items-center justify-center px-8">
              <View className="h-20 w-20 items-center justify-center rounded-[28px] border border-[#2A2A2A] bg-[#151515]">
                <Ionicons name="images-outline" size={34} color="#FFFFFF" />
              </View>
              <Text className="mt-5 text-center text-xl font-extrabold text-white">
                Add a moment
              </Text>
              <Text className="mt-2 text-center text-sm leading-5 text-[#888888]">
                Stories stay active for 24 hours and appear at the top of the feed.
              </Text>
            </View>
          )}
        </View>
      </View>

      <View
        className="mx-4 mb-4 flex-row items-center gap-3 rounded-[28px] border border-[#222222] bg-[#0F0F0F] p-2"
        style={{ paddingBottom: Math.max(insets.bottom - 8, 8) }}
      >
        <TouchableOpacity
          className="h-12 flex-1 flex-row items-center justify-center rounded-full bg-white"
          onPress={pickImage}
          disabled={isLoading}
          activeOpacity={0.82}
        >
          <Ionicons name="image-outline" size={20} color="#050505" />
          <Text className="ml-2 text-sm font-extrabold text-[#050505]">
            Gallery
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="h-12 flex-1 flex-row items-center justify-center rounded-full bg-[#1A1A1A]"
          onPress={takePhoto}
          disabled={isLoading}
          activeOpacity={0.82}
        >
          <Ionicons name="camera-outline" size={20} color="#FFFFFF" />
          <Text className="ml-2 text-sm font-extrabold text-white">
            Camera
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
