import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
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
import { Colors } from "@/constants/colors";
import { FontFamily, FontSize } from "@/constants/typography";
import { Radius, Spacing } from "@/constants/spacing";

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
      style={[styles.screen, { paddingTop: insets.top }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => router.back()}
          disabled={isLoading}
          activeOpacity={0.78}
        >
          <Ionicons name="close" size={23} color={Colors.textPrimary} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Create Story</Text>

        <TouchableOpacity
          style={[
            styles.shareButton,
            (!imageUri || isLoading) && styles.shareButtonDisabled,
          ]}
          onPress={publishStory}
          disabled={!imageUri || isLoading}
          activeOpacity={0.82}
        >
          {isLoading ? (
            <ActivityIndicator color={Colors.textInverse} />
          ) : (
            <Text
              style={[
                styles.shareButtonText,
                !imageUri && styles.shareButtonTextDisabled,
              ]}
            >
              Share
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.previewWrap}>
        <View style={styles.previewCard}>
          {imageUri ? (
            <>
              <Image
                source={{ uri: imageUri }}
                style={styles.previewImage}
                resizeMode="cover"
              />
              <View style={styles.captionOverlay}>
                <TextInput
                  style={styles.captionInput}
                  placeholder="Add a caption..."
                  placeholderTextColor={Colors.onImageMuted}
                  multiline
                  value={caption}
                  onChangeText={setCaption}
                  editable={!isLoading}
                  selectionColor={Colors.textInverse}
                />
              </View>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => setImageUri(null)}
                disabled={isLoading}
                activeOpacity={0.78}
              >
                <Ionicons name="trash-outline" size={20} color={Colors.textInverse} />
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.emptyPreview}>
              <View style={styles.emptyIcon}>
                <Ionicons name="images-outline" size={34} color={Colors.textPrimary} />
              </View>
              <Text style={styles.emptyTitle}>Add a moment</Text>
              <Text style={styles.emptySubtitle}>
                Stories stay active for 24 hours and appear at the top of the feed.
              </Text>
            </View>
          )}
        </View>
      </View>

      <View
        style={[styles.toolbar, { paddingBottom: Math.max(insets.bottom - 8, 8) }]}
      >
        <TouchableOpacity
          style={styles.primaryToolButton}
          onPress={pickImage}
          disabled={isLoading}
          activeOpacity={0.82}
        >
          <Ionicons name="image-outline" size={20} color={Colors.textInverse} />
          <Text style={styles.primaryToolText}>
            Gallery
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryToolButton}
          onPress={takePhoto}
          disabled={isLoading}
          activeOpacity={0.82}
        >
          <Ionicons name="camera-outline" size={20} color={Colors.textPrimary} />
          <Text style={styles.secondaryToolText}>
            Camera
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: Colors.bg,
    flex: 1,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md + 4,
    paddingVertical: Spacing.md,
  },
  iconButton: {
    alignItems: "center",
    backgroundColor: Colors.bgCard,
    borderColor: Colors.border,
    borderRadius: Radius.full,
    borderWidth: 1,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  headerTitle: {
    color: Colors.textPrimary,
    fontFamily: FontFamily.bold,
    fontSize: FontSize.lg,
  },
  shareButton: {
    alignItems: "center",
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    height: 42,
    justifyContent: "center",
    minWidth: 82,
    paddingHorizontal: Spacing.md,
  },
  shareButtonDisabled: {
    backgroundColor: Colors.bgElevated,
    borderColor: Colors.border,
    borderWidth: 1,
  },
  shareButtonText: {
    color: Colors.textInverse,
    fontFamily: FontFamily.bold,
    fontSize: FontSize.sm,
  },
  shareButtonTextDisabled: {
    color: Colors.textMuted,
  },
  previewWrap: {
    flex: 1,
    paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  previewCard: {
    backgroundColor: Colors.bgCard,
    borderColor: Colors.border,
    borderRadius: 32,
    borderWidth: 1,
    flex: 1,
    overflow: "hidden",
  },
  previewImage: {
    ...StyleSheet.absoluteFillObject,
    height: "100%",
    width: "100%",
  },
  captionOverlay: {
    backgroundColor: Colors.overlayDark,
    bottom: 0,
    left: 0,
    paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md + 4,
    position: "absolute",
    right: 0,
  },
  captionInput: {
    backgroundColor: Colors.overlayDarkStrong,
    borderColor: Colors.overlayLightSoft,
    borderRadius: 20,
    borderWidth: 1,
    color: Colors.textInverse,
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.base,
    maxHeight: 112,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 4,
  },
  deleteButton: {
    alignItems: "center",
    backgroundColor: Colors.overlayDark,
    borderColor: Colors.overlayLightSoft,
    borderRadius: Radius.full,
    borderWidth: 1,
    height: 42,
    justifyContent: "center",
    position: "absolute",
    right: Spacing.md,
    top: Spacing.md,
    width: 42,
  },
  emptyPreview: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
  },
  emptyIcon: {
    alignItems: "center",
    backgroundColor: Colors.bgElevated,
    borderColor: Colors.border,
    borderRadius: 28,
    borderWidth: 1,
    height: 82,
    justifyContent: "center",
    width: 82,
  },
  emptyTitle: {
    color: Colors.textPrimary,
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xl,
    marginTop: Spacing.lg,
    textAlign: "center",
  },
  emptySubtitle: {
    color: Colors.textSecondary,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    lineHeight: 20,
    marginTop: Spacing.sm,
    textAlign: "center",
  },
  toolbar: {
    alignItems: "center",
    backgroundColor: Colors.bgCard,
    borderColor: Colors.border,
    borderRadius: 28,
    borderWidth: 1,
    flexDirection: "row",
    gap: Spacing.sm + 4,
    marginBottom: Spacing.md,
    marginHorizontal: Spacing.md,
    padding: Spacing.sm,
  },
  primaryToolButton: {
    alignItems: "center",
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    flex: 1,
    flexDirection: "row",
    height: 50,
    justifyContent: "center",
  },
  primaryToolText: {
    color: Colors.textInverse,
    fontFamily: FontFamily.bold,
    fontSize: FontSize.sm,
    marginLeft: Spacing.sm,
  },
  secondaryToolButton: {
    alignItems: "center",
    backgroundColor: Colors.bgElevated,
    borderColor: Colors.border,
    borderRadius: Radius.full,
    borderWidth: 1,
    flex: 1,
    flexDirection: "row",
    height: 50,
    justifyContent: "center",
  },
  secondaryToolText: {
    color: Colors.textPrimary,
    fontFamily: FontFamily.bold,
    fontSize: FontSize.sm,
    marginLeft: Spacing.sm,
  },
});
