import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import * as MediaLibrary from "expo-media-library";
import { useColorScheme } from "nativewind";
import { useCreateStoryMutation } from "@/hooks/queries";
import { getThemeColors } from "@/constants/colors";
import type { ThemeColors } from "@/constants/colors";
import { FontFamily, FontSize } from "@/constants/typography";
import { Radius, Spacing } from "@/constants/spacing";

const GRID_COLUMNS = 3;
const GRID_GAP = 3;
const GALLERY_PAGE_SIZE = 48;

type GridItem =
  | { type: "camera"; id: "camera" }
  | { type: "picker"; id: "picker" }
  | { type: "asset"; id: string; asset: MediaLibrary.Asset };

export default function CreateStoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { colorScheme } = useColorScheme();
  const colors = getThemeColors(colorScheme === "light" ? "light" : "dark");
  const styles = useMemo(() => createStyles(colors), [colors]);
  const createStoryMutation = useCreateStoryMutation();
  const isLoading = createStoryMutation.isPending;

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [galleryAssets, setGalleryAssets] = useState<MediaLibrary.Asset[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [galleryError, setGalleryError] = useState<string | null>(null);

  const tileSize = useMemo(() => {
    const horizontalPadding = Spacing.md * 2;
    const totalGaps = GRID_GAP * (GRID_COLUMNS - 1);
    return Math.floor((width - horizontalPadding - totalGaps) / GRID_COLUMNS);
  }, [width]);

  const gridItems = useMemo<GridItem[]>(
    () => [
      { type: "camera", id: "camera" },
      { type: "picker", id: "picker" },
      ...galleryAssets.map((asset) => ({
        type: "asset" as const,
        id: asset.id,
        asset,
      })),
    ],
    [galleryAssets],
  );

  const loadGallery = useCallback(async () => {
    setGalleryError(null);

    try {
      const permission = await MediaLibrary.requestPermissionsAsync(false, ["photo"]);
      if (!permission.granted) {
        setGalleryAssets([]);
        setGalleryError("Allow photo access to show recent photos here.");
        return;
      }

      const result = await MediaLibrary.getAssetsAsync({
        first: GALLERY_PAGE_SIZE,
        mediaType: MediaLibrary.MediaType.photo,
        sortBy: [MediaLibrary.SortBy.creationTime],
      });
      setGalleryAssets(result.assets);
    } catch {
      setGalleryAssets([]);
      setGalleryError(
        "Recent photo grid needs a development build. Use the photo tile in Expo Go.",
      );
    } finally {
      setGalleryLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGallery();
  }, [loadGallery]);

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
      loadGallery();
    }
  };

  const selectGalleryAsset = async (asset: MediaLibrary.Asset) => {
    if (isLoading) return;

    try {
      const assetInfo = await MediaLibrary.getAssetInfoAsync(asset);
      setImageUri(assetInfo.localUri || assetInfo.uri || asset.uri);
    } catch {
      setImageUri(asset.uri);
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

  const renderGridItem = ({ item }: { item: GridItem }) => {
    if (item.type === "camera") {
      return (
        <TouchableOpacity
          style={[styles.cameraTile, { height: tileSize, width: tileSize }]}
          onPress={takePhoto}
          disabled={isLoading}
          activeOpacity={0.82}
        >
          <Ionicons name="camera" size={34} color={colors.textInverse} />
        </TouchableOpacity>
      );
    }

    if (item.type === "picker") {
      return (
        <TouchableOpacity
          style={[styles.pickerTile, { height: tileSize, width: tileSize }]}
          onPress={pickImage}
          disabled={isLoading}
          activeOpacity={0.82}
        >
          <Ionicons name="images" size={32} color={colors.textPrimary} />
          <Text style={styles.pickerTileText}>Photos</Text>
        </TouchableOpacity>
      );
    }

    return (
      <TouchableOpacity
        style={[styles.mediaTile, { height: tileSize, width: tileSize }]}
        onPress={() => selectGalleryAsset(item.asset)}
        disabled={isLoading}
        activeOpacity={0.86}
      >
        <Image source={{ uri: item.asset.uri }} style={styles.mediaThumb} />
      </TouchableOpacity>
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
          <Ionicons name="close" size={23} color={colors.textPrimary} />
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
            <ActivityIndicator color={colors.textInverse} />
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

      {imageUri ? (
        <>
          <View style={styles.previewWrap}>
            <View style={styles.previewCard}>
              <Image
                source={{ uri: imageUri }}
                style={styles.previewImage}
                resizeMode="cover"
              />
              <View style={styles.captionOverlay}>
                <TextInput
                  style={styles.captionInput}
                  placeholder="Add a caption..."
                  placeholderTextColor={colors.onImageMuted}
                  multiline
                  value={caption}
                  onChangeText={setCaption}
                  editable={!isLoading}
                  selectionColor={colors.textInverse}
                />
              </View>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => setImageUri(null)}
                disabled={isLoading}
                activeOpacity={0.78}
              >
                <Ionicons name="trash-outline" size={20} color={colors.textInverse} />
              </TouchableOpacity>
            </View>
          </View>

          <View
            style={[
              styles.toolbar,
              { paddingBottom: Math.max(insets.bottom - 8, 8) },
            ]}
          >
            <TouchableOpacity
              style={styles.primaryToolButton}
              onPress={pickImage}
              disabled={isLoading}
              activeOpacity={0.82}
            >
              <Ionicons name="image-outline" size={20} color={colors.textInverse} />
              <Text style={styles.primaryToolText}>Gallery</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryToolButton}
              onPress={takePhoto}
              disabled={isLoading}
              activeOpacity={0.82}
            >
              <Ionicons name="camera-outline" size={20} color={colors.textPrimary} />
              <Text style={styles.secondaryToolText}>Camera</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <View style={styles.galleryWrap}>
          {galleryLoading && gridItems.length <= 2 ? (
            <View style={styles.galleryState}>
              <ActivityIndicator color={colors.primary} size="large" />
            </View>
          ) : (
            <FlatList
              data={gridItems}
              keyExtractor={(item) => item.id}
              renderItem={renderGridItem}
              numColumns={GRID_COLUMNS}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={[
                styles.galleryContent,
                { paddingBottom: Math.max(insets.bottom, Spacing.md) },
              ]}
              columnWrapperStyle={styles.galleryRow}
              ListFooterComponent={
                galleryError ? (
                  <View style={styles.galleryHint}>
                    <Text style={styles.galleryStateText}>{galleryError}</Text>
                    <TouchableOpacity
                      style={styles.permissionButton}
                      onPress={loadGallery}
                      activeOpacity={0.82}
                    >
                      <Text style={styles.permissionButtonText}>Try again</Text>
                    </TouchableOpacity>
                  </View>
                ) : null
              }
            />
          )}
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  screen: {
    backgroundColor: colors.bg,
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
    backgroundColor: colors.bgCard,
    borderColor: colors.border,
    borderRadius: Radius.full,
    borderWidth: 1,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  headerTitle: {
    color: colors.textPrimary,
    fontFamily: FontFamily.bold,
    fontSize: FontSize.lg,
  },
  shareButton: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: Radius.full,
    height: 42,
    justifyContent: "center",
    minWidth: 82,
    paddingHorizontal: Spacing.md,
  },
  shareButtonDisabled: {
    backgroundColor: colors.bgElevated,
    borderColor: colors.border,
    borderWidth: 1,
  },
  shareButtonText: {
    color: colors.textInverse,
    fontFamily: FontFamily.bold,
    fontSize: FontSize.sm,
  },
  shareButtonTextDisabled: {
    color: colors.textMuted,
  },
  galleryWrap: {
    flex: 1,
    paddingHorizontal: Spacing.md,
  },
  galleryContent: {
    gap: GRID_GAP,
  },
  galleryRow: {
    gap: GRID_GAP,
  },
  cameraTile: {
    alignItems: "center",
    backgroundColor: colors.primaryDark,
    justifyContent: "center",
  },
  pickerTile: {
    alignItems: "center",
    backgroundColor: colors.bgCard,
    borderColor: colors.border,
    borderWidth: 1,
    justifyContent: "center",
  },
  pickerTileText: {
    color: colors.textPrimary,
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xs,
    marginTop: Spacing.xs,
  },
  mediaTile: {
    backgroundColor: colors.black,
    overflow: "hidden",
  },
  mediaThumb: {
    height: "100%",
    width: "100%",
  },
  galleryHint: {
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
  },
  galleryState: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
  },
  galleryStateText: {
    color: colors.textSecondary,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    lineHeight: 20,
    marginTop: Spacing.md,
    textAlign: "center",
  },
  permissionButton: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: Radius.full,
    height: 44,
    justifyContent: "center",
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  permissionButtonText: {
    color: colors.textInverse,
    fontFamily: FontFamily.bold,
    fontSize: FontSize.sm,
  },
  previewWrap: {
    flex: 1,
    paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  previewCard: {
    backgroundColor: colors.bgCard,
    borderColor: colors.border,
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
    backgroundColor: colors.overlayDark,
    bottom: 0,
    left: 0,
    paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md + 4,
    position: "absolute",
    right: 0,
  },
  captionInput: {
    backgroundColor: colors.overlayDarkStrong,
    borderColor: colors.overlayLightSoft,
    borderRadius: 20,
    borderWidth: 1,
    color: colors.textInverse,
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.base,
    maxHeight: 112,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 4,
  },
  deleteButton: {
    alignItems: "center",
    backgroundColor: colors.overlayDark,
    borderColor: colors.overlayLightSoft,
    borderRadius: Radius.full,
    borderWidth: 1,
    height: 42,
    justifyContent: "center",
    position: "absolute",
    right: Spacing.md,
    top: Spacing.md,
    width: 42,
  },
  toolbar: {
    alignItems: "center",
    backgroundColor: colors.bgCard,
    borderColor: colors.border,
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
    backgroundColor: colors.primary,
    borderRadius: Radius.full,
    flex: 1,
    flexDirection: "row",
    height: 50,
    justifyContent: "center",
  },
  primaryToolText: {
    color: colors.textInverse,
    fontFamily: FontFamily.bold,
    fontSize: FontSize.sm,
    marginLeft: Spacing.sm,
  },
  secondaryToolButton: {
    alignItems: "center",
    backgroundColor: colors.bgElevated,
    borderColor: colors.border,
    borderRadius: Radius.full,
    borderWidth: 1,
    flex: 1,
    flexDirection: "row",
    height: 50,
    justifyContent: "center",
  },
  secondaryToolText: {
    color: colors.textPrimary,
    fontFamily: FontFamily.bold,
    fontSize: FontSize.sm,
    marginLeft: Spacing.sm,
  },
});