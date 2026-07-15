import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import * as MediaLibrary from "expo-media-library";
import { useColorScheme } from "nativewind";
import { useCreatePostMutation, useCreateStoryMutation } from "@/hooks/queries";
import { getThemeColors, Colors } from "@/constants/colors";
import type { ThemeColors } from "@/constants/colors";
import { FontFamily, FontSize } from "@/constants/typography";
import { Radius, Spacing } from "@/constants/spacing";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from "react-native-reanimated";

const GRID_COLUMNS = 3;
const GRID_GAP = 3;
const GALLERY_PAGE_SIZE = 48;

const { width } = Dimensions.get("window");

type GridItem =
  | { type: "camera"; id: "camera" }
  | { type: "picker"; id: "picker" }
  | { type: "asset"; id: string; asset: MediaLibrary.Asset };

export default function CreateScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const searchParams = useLocalSearchParams<{ type?: "post" | "story" }>();
  const { colorScheme } = useColorScheme();
  const themeColors = getThemeColors(colorScheme === "light" ? "light" : "dark");
  const styles = useMemo(() => createStyles(themeColors), [themeColors]);

  const createPostMutation = useCreatePostMutation();
  const createStoryMutation = useCreateStoryMutation();
  const isLoading = createPostMutation.isPending || createStoryMutation.isPending;

  // Selection states
  const [step, setStep] = useState<"select" | "compose">("select");
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);
  const [resolvedUris, setResolvedUris] = useState<Record<string, string>>({});
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [publishTarget, setPublishTarget] = useState<"post" | "story">(
    searchParams.type === "story" ? "story" : "post"
  );
  const [multipleMode, setMultipleMode] = useState(false);
  
  // Custom states
  const [isPublic, setIsPublic] = useState(true);
  const [isAnonymous, setIsAnonymous] = useState(false);
  
  // Location states
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const [locationSearch, setLocationSearch] = useState("");

  // Story Poll states
  const [pollSticker, setPollSticker] = useState<{ question: string } | null>(null);
  const [pollModalVisible, setPollModalVisible] = useState(false);
  const [pollQuestionInput, setPollQuestionInput] = useState("");

  // Swipe Filter states
  const FILTERS = [
    { id: "normal", name: "Original", overlayColor: "transparent" },
    { id: "noir", name: "Noir (B&W)", overlayColor: "rgba(0,0,0,0.38)" },
    { id: "golden", name: "Golden Hour", overlayColor: "rgba(255, 128, 0, 0.16)" },
    { id: "cyber", name: "Cyberpunk", overlayColor: "rgba(186, 85, 211, 0.14)" },
    { id: "chroma", name: "Vibrant Chroma", overlayColor: "rgba(0, 255, 128, 0.1)" },
  ];
  const [activeFilterIdx, setActiveFilterIdx] = useState(0);
  const [filterToast, setFilterToast] = useState<string | null>(null);
  const filterToastOpacity = useSharedValue(0);

  const POPULAR_LOCATIONS = [
    "New York, NY",
    "Los Angeles, CA",
    "San Francisco, CA",
    "London, UK",
    "Tokyo, Japan",
    "Mumbai, India",
    "Paris, France",
  ];

  const locationSuggestions = useMemo(() => {
    const search = locationSearch.trim().toLowerCase();
    if (!search) return POPULAR_LOCATIONS;
    const filtered = POPULAR_LOCATIONS.filter((loc) =>
      loc.toLowerCase().includes(search)
    );
    if (!filtered.some((loc) => loc.toLowerCase() === search)) {
      return [...filtered, `Add custom: "${locationSearch.trim()}"`];
    }
    return filtered;
  }, [locationSearch]);

  const filterToastAnimatedStyle = useAnimatedStyle(() => ({
    opacity: filterToastOpacity.value,
  }));

  const showFilterToast = (name: string) => {
    setFilterToast(name);
    filterToastOpacity.value = 1;
    filterToastOpacity.value = withTiming(0, { duration: 1000 });
  };

  const cycleFilter = (direction: "prev" | "next") => {
    let nextIdx = activeFilterIdx;
    if (direction === "next") {
      nextIdx = (activeFilterIdx + 1) % FILTERS.length;
    } else {
      nextIdx = (activeFilterIdx - 1 + FILTERS.length) % FILTERS.length;
    }
    setActiveFilterIdx(nextIdx);
    showFilterToast(FILTERS[nextIdx].name);
  };

  const filterSwipeGesture = Gesture.Pan()
    .activeOffsetX([-20, 20])
    .onEnd((event) => {
      if (publishTarget !== "story") return;
      if (event.translationX > 50) {
        runOnJS(cycleFilter)("prev");
      } else if (event.translationX < -50) {
        runOnJS(cycleFilter)("next");
      }
    });

  // Gallery states
  const [galleryAssets, setGalleryAssets] = useState<MediaLibrary.Asset[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(true);
  const [galleryError, setGalleryError] = useState<string | null>(null);

  const tileSize = useMemo(() => {
    const horizontalPadding = Spacing.md * 2;
    const totalGaps = GRID_GAP * (GRID_COLUMNS - 1);
    return Math.floor((width - horizontalPadding - totalGaps) / GRID_COLUMNS);
  }, []);

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
    setGalleryLoading(true);

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
      setGalleryError("Recent photo grid requires gallery permissions.");
    } finally {
      setGalleryLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGallery();
  }, [loadGallery]);

  const handlePickImage = async () => {
    if (selectedAssets.length >= 5) {
      Alert.alert("Limit Reached", "You can only select up to 5 images.");
      return;
    }
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
      allowsMultipleSelection: true,
      selectionLimit: 5 - selectedAssets.length,
      quality: 0.8,
    });

    if (!result.canceled && result.assets) {
      const selected = result.assets.map((asset) => asset.uri);
      if (selected.length > 1) {
        setMultipleMode(true);
        setSelectedAssets((prev) => [...prev, ...selected].slice(0, 5));
        setResolvedUris((prev) => {
          const next = { ...prev };
          selected.forEach((uri) => {
            next[uri] = uri;
          });
          return next;
        });
        setStep("compose");
      } else if (selected.length === 1) {
        if (!multipleMode) {
          setSelectedAssets([selected[0]]);
          setResolvedUris({ [selected[0]]: selected[0] });
          setStep("compose");
        } else {
          setSelectedAssets((prev) => [...prev, selected[0]].slice(0, 5));
          setResolvedUris((prev) => ({ ...prev, [selected[0]]: selected[0] }));
        }
      }
    }
  };

  const handleTakePhoto = async () => {
    if (selectedAssets.length >= 5) {
      Alert.alert("Limit Reached", "You can only add up to 5 images.");
      return;
    }
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission needed",
        "We need access to your camera to take photos.",
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: !multipleMode,
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.[0]) {
      const photoUri = result.assets[0].uri;
      if (!multipleMode) {
        setSelectedAssets([photoUri]);
        setResolvedUris({ [photoUri]: photoUri });
        setStep("compose");
      } else {
        setSelectedAssets((prev) => [...prev, photoUri]);
        setResolvedUris((prev) => ({ ...prev, [photoUri]: photoUri }));
      }
    }
  };

  const handleToggleAsset = async (asset: MediaLibrary.Asset) => {
    const uri = asset.uri;
    const isSelected = selectedAssets.includes(uri);

    if (!multipleMode) {
      setSelectedAssets([uri]);
      setStep("compose");
      try {
        const assetInfo = await MediaLibrary.getAssetInfoAsync(asset);
        const resolved = assetInfo.localUri || assetInfo.uri || asset.uri;
        setResolvedUris({ [uri]: resolved });
      } catch {
        setResolvedUris({ [uri]: uri });
      }
    } else {
      if (isSelected) {
        setSelectedAssets((prev) => prev.filter((u) => u !== uri));
      } else {
        if (selectedAssets.length >= 5) {
          Alert.alert("Limit Reached", "You can select up to 5 images.");
          return;
        }
        setSelectedAssets((prev) => [...prev, uri]);
        try {
          const assetInfo = await MediaLibrary.getAssetInfoAsync(asset);
          const resolved = assetInfo.localUri || assetInfo.uri || asset.uri;
          setResolvedUris((prev) => ({ ...prev, [uri]: resolved }));
        } catch {
          setResolvedUris((prev) => ({ ...prev, [uri]: uri }));
        }
      }
    }
  };

  const showStoryOption = selectedAssets.length <= 1 && selectedAssets.length > 0;

  // Auto-correct publish target if selectedAssets violates constraints
  useEffect(() => {
    if (!showStoryOption && publishTarget === "story") {
      setPublishTarget("post");
    }
  }, [selectedAssets, showStoryOption, publishTarget]);

  const handleNext = () => {
    if (selectedAssets.length > 0) {
      setStep("compose");
    }
  };

  const handleCancel = () => {
    const hasContent = selectedAssets.length > 0 || caption.trim().length > 0;
    if (hasContent) {
      Alert.alert(
        "Discard post?",
        "You will lose your selected photos and caption.",
        [
          { text: "Keep editing", style: "cancel" },
          {
            text: "Discard",
            style: "destructive",
            onPress: () => router.back(),
          },
        ]
      );
    } else {
      router.back();
    }
  };

  const handleTextOnly = () => {
    setSelectedAssets([]);
    setResolvedUris({});
    setPublishTarget("post");
    setStep("compose");
  };

  const handlePublish = () => {
    const uploadUris = selectedAssets.map((uri) => resolvedUris[uri] || uri);

    if (uploadUris.length === 0 && !caption.trim()) {
      Alert.alert("Required", "Please add some text or an image to post.");
      return;
    }

    if (publishTarget === "story") {
      if (uploadUris.length === 0) {
        Alert.alert("Story Error", "Stories require exactly 1 photo.");
        return;
      }

      const storyMetadata = JSON.stringify({
        caption: caption.trim() || undefined,
        filter: FILTERS[activeFilterIdx].id !== "normal" ? FILTERS[activeFilterIdx].id : undefined,
        sticker: pollSticker
          ? {
              type: "poll",
              question: pollSticker.question,
              yesVotes: [],
              noVotes: [],
            }
          : undefined,
      });

      setUploadStatus("Uploading story...");
      createStoryMutation.mutate(
        {
          imageUri: uploadUris[0],
          caption: storyMetadata,
        },
        {
          onSuccess: () => router.back(),
          onError: (error: any) => {
            console.error("Story creation failed:", error);
            Alert.alert(
              "Publish Failed",
              error?.response?.data?.message || "Something went wrong posting your story.",
            );
          },
        }
      );
    } else {
      const finalCaption = caption.trim() + (selectedLocation ? `\n\n📍 ${selectedLocation}` : "");
      setUploadStatus(
        uploadUris.length > 0
          ? `Uploading photo 1 of ${uploadUris.length}...`
          : "Creating post..."
      );
      createPostMutation.mutate(
        {
          caption: finalCaption || undefined,
          imageUris: uploadUris,
          isPublic,
          isAnonymous,
          onProgress: (index, total) => {
            setUploadStatus(`Uploading photo ${index} of ${total}...`);
          },
        },
        {
          onSuccess: () => router.back(),
          onError: (error: any) => {
            console.error("Post creation failed:", error);
            Alert.alert(
              "Publish Failed",
              error?.response?.data?.message || "Something went wrong posting your feed post.",
            );
          },
        }
      );
    }
  };

  const renderGridItem = ({ item }: { item: GridItem }) => {
    if (item.type === "camera") {
      return (
        <TouchableOpacity
          style={[styles.cameraTile, { height: tileSize, width: tileSize }]}
          onPress={handleTakePhoto}
          disabled={isLoading}
          activeOpacity={0.82}
        >
          <Ionicons name="camera" size={32} color="#FFF" />
          <Text style={styles.tileLabel}>Camera</Text>
        </TouchableOpacity>
      );
    }

    if (item.type === "picker") {
      return (
        <TouchableOpacity
          style={[styles.pickerTile, { height: tileSize, width: tileSize }]}
          onPress={handlePickImage}
          disabled={isLoading}
          activeOpacity={0.82}
        >
          <Ionicons name="images" size={30} color={themeColors.textPrimary} />
          <Text style={styles.pickerTileText}>Files</Text>
        </TouchableOpacity>
      );
    }

    const selectIndex = selectedAssets.indexOf(item.asset.uri);
    const isSelected = selectIndex !== -1;

    return (
      <TouchableOpacity
        style={[styles.mediaTile, { height: tileSize, width: tileSize }]}
        onPress={() => handleToggleAsset(item.asset)}
        disabled={isLoading}
        activeOpacity={0.86}
      >
        <Image source={{ uri: item.asset.uri }} style={styles.mediaThumb} />
        {isSelected ? (
          <View style={styles.gridSelectBadge}>
            <Text style={styles.gridSelectBadgeText}>{selectIndex + 1}</Text>
          </View>
        ) : multipleMode ? (
          <View style={styles.gridUnselectBadge} />
        ) : null}
      </TouchableOpacity>
    );
  };

  if (step === "select") {
    return (
      <KeyboardAvoidingView
        style={[styles.screen, { paddingTop: insets.top }]}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={handleCancel}
            disabled={isLoading}
            activeOpacity={0.78}
          >
            <Ionicons name="close" size={23} color={themeColors.textPrimary} />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Select Media</Text>

          <View style={{ flexDirection: "row", gap: Spacing.sm }}>
            <TouchableOpacity
              style={styles.textOnlyButton}
              onPress={handleTextOnly}
              activeOpacity={0.78}
            >
              <Text style={styles.textOnlyButtonText}>Text-only</Text>
            </TouchableOpacity>

            {multipleMode && (
              <TouchableOpacity
                style={[
                  styles.shareButton,
                  selectedAssets.length === 0 && styles.shareButtonDisabled,
                ]}
                onPress={handleNext}
                disabled={selectedAssets.length === 0}
                activeOpacity={0.82}
              >
                <Text
                  style={[
                    styles.shareButtonText,
                    selectedAssets.length === 0 && styles.shareButtonTextDisabled,
                  ]}
                >
                  Next
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Dynamic selector subheader */}
        <View style={styles.subheader}>
          <Text style={styles.subheaderTitle}>Recent Photos</Text>
          <TouchableOpacity
            onPress={() => {
              setMultipleMode(!multipleMode);
              if (multipleMode && selectedAssets.length > 1) {
                setSelectedAssets([selectedAssets[0]]);
              }
            }}
            style={[
              styles.multipleToggle,
              multipleMode && styles.multipleToggleActive,
            ]}
            activeOpacity={0.8}
          >
            <Ionicons
              name="layers-outline"
              size={16}
              color={multipleMode ? "#000" : "#FFF"}
            />
            <Text
              style={[
                styles.multipleToggleText,
                multipleMode && { color: "#000" },
              ]}
            >
              Select Multiple
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.galleryWrap}>
          {galleryLoading && gridItems.length <= 2 ? (
            <View style={styles.galleryState}>
              <ActivityIndicator color={themeColors.primary} size="large" />
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
      </KeyboardAvoidingView>
    );
  }

  // Compose / Editor Step
  return (
    <KeyboardAvoidingView
      style={[styles.screen, { paddingTop: insets.top }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => setStep("select")}
          disabled={isLoading}
          activeOpacity={0.78}
        >
          <Ionicons name="arrow-back" size={23} color={themeColors.textPrimary} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>New Post</Text>

        <View style={{ flexDirection: "row", alignItems: "center" }}>
          {publishTarget === "story" && (
            <TouchableOpacity
              style={[styles.iconButton, { marginRight: Spacing.sm }]}
              onPress={() => {
                setPollQuestionInput("Agree?");
                setPollModalVisible(true);
              }}
              activeOpacity={0.78}
            >
              <Ionicons name="stats-chart" size={20} color={themeColors.textPrimary} />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.shareButton}
            onPress={handlePublish}
            disabled={isLoading}
            activeOpacity={0.82}
          >
            {isLoading ? (
              <ActivityIndicator color={themeColors.textInverse} size="small" />
            ) : (
              <Text style={styles.shareButtonText}>Publish</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.composeContainer}
      >
        {/* Cinematic Card Preview */}
        <GestureDetector gesture={filterSwipeGesture}>
          <View style={styles.previewWrap}>
            <View style={styles.previewCard}>
              {selectedAssets.length > 0 ? (
                <ScrollView
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  style={StyleSheet.absoluteFill}
                  scrollEnabled={publishTarget !== "story"}
                >
                  {selectedAssets.map((uri, index) => (
                    <View
                      key={uri}
                      style={{ width: width - Spacing.md * 2, height: "100%" }}
                    >
                      <Image
                        source={{ uri: resolvedUris[uri] || uri }}
                        style={styles.previewImage}
                        resizeMode="cover"
                      />
                      {publishTarget === "story" && FILTERS[activeFilterIdx].id !== "normal" && (
                        <View
                          style={[
                            StyleSheet.absoluteFillObject,
                            { backgroundColor: FILTERS[activeFilterIdx].overlayColor },
                          ]}
                        />
                      )}
                      {selectedAssets.length > 1 && (
                        <View style={styles.photosCountBadge}>
                          <Text style={styles.photosCountBadgeText}>
                            {index + 1} / {selectedAssets.length}
                          </Text>
                        </View>
                      )}
                    </View>
                  ))}
                </ScrollView>
              ) : (
                <View style={styles.gradientTextCard}>
                  <Ionicons
                    name="chatbubble-ellipses-outline"
                    size={42}
                    color={themeColors.textMuted}
                  />
                  <Text style={styles.gradientTextCardHint}>
                    Text Post (Feed Only)
                  </Text>
                </View>
              )}

              {/* Story Poll Sticker Overlay */}
              {publishTarget === "story" && pollSticker && (
                <View style={styles.pollStickerOverlay}>
                  <Text style={styles.pollStickerQuestion}>{pollSticker.question}</Text>
                  <View style={styles.pollStickerOptions}>
                    <View style={styles.pollStickerBtn}>
                      <Text style={styles.pollStickerBtnText}>YES</Text>
                    </View>
                    <View style={styles.pollStickerBtn}>
                      <Text style={styles.pollStickerBtnText}>NO</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.pollStickerDeleteBtn}
                    onPress={() => setPollSticker(null)}
                  >
                    <Ionicons name="close-circle" size={22} color="#FFF" />
                  </TouchableOpacity>
                </View>
              )}

              {/* Swipe center filter toast overlay */}
              {publishTarget === "story" && filterToast && (
                <Animated.View
                  style={[styles.filterToastContainer, filterToastAnimatedStyle]}
                >
                  <View style={styles.filterToastCard}>
                    <Text style={styles.filterToastText}>{filterToast}</Text>
                  </View>
                </Animated.View>
              )}

              {/* Overlaid Caption Box */}
              <View style={styles.captionOverlay}>
                <TextInput
                  style={styles.captionInput}
                  placeholder={
                    publishTarget === "story"
                      ? "Add story caption..."
                      : "Share what's on your mind..."
                  }
                  placeholderTextColor={themeColors.onImageMuted || "rgba(255,255,255,0.6)"}
                  multiline
                  value={caption}
                  onChangeText={setCaption}
                  editable={!isLoading}
                  selectionColor={themeColors.textInverse}
                />
              </View>
            </View>
          </View>
        </GestureDetector>

        {/* Options & Settings Panel */}
        <View style={styles.panel}>
          {/* Target Toggle */}
          <Text style={styles.sectionLabel}>Publish to</Text>
          <View style={styles.targetRow}>
            <TouchableOpacity
              onPress={() => setPublishTarget("post")}
              style={[
                styles.targetButton,
                publishTarget === "post" && styles.targetButtonActive,
              ]}
              activeOpacity={0.78}
            >
              <Ionicons
                name="grid-outline"
                size={18}
                color={publishTarget === "post" ? themeColors.textInverse : themeColors.textPrimary}
              />
              <Text
                style={[
                  styles.targetButtonText,
                  publishTarget === "post" && styles.targetButtonTextActive,
                ]}
              >
                Feed Post
              </Text>
            </TouchableOpacity>

            {showStoryOption && (
              <TouchableOpacity
                onPress={() => setPublishTarget("story")}
                style={[
                  styles.targetButton,
                  publishTarget === "story" && styles.targetButtonActive,
                ]}
                activeOpacity={0.78}
              >
                <Ionicons
                  name="flash-outline"
                  size={18}
                  color={publishTarget === "story" ? themeColors.textInverse : themeColors.textPrimary}
                />
                <Text
                  style={[
                    styles.targetButtonText,
                    publishTarget === "story" && styles.targetButtonTextActive,
                  ]}
                >
                  Story
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Feed Post Configuration */}
          {publishTarget === "post" && (
            <View style={styles.postOptionsContainer}>
              {/* Privacy Control */}
              <TouchableOpacity
                style={styles.optionRow}
                onPress={() => setIsPublic((v) => !v)}
                activeOpacity={0.8}
              >
                <View style={styles.optionIconContainer}>
                  <Ionicons
                    name={isPublic ? "earth-outline" : "lock-closed-outline"}
                    size={20}
                    color={themeColors.textPrimary}
                  />
                </View>
                <View className="flex-1 ml-3">
                  <Text style={styles.optionTitle}>Visibility</Text>
                  <Text style={styles.optionSubtitle}>
                    {isPublic ? "Visible to everyone" : "Visible to friends only"}
                  </Text>
                </View>
                <View style={styles.optionValuePill}>
                  <Text style={styles.optionValueText}>
                    {isPublic ? "Public" : "Friends"}
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Anonymity Control */}
              <TouchableOpacity
                style={styles.optionRow}
                onPress={() => setIsAnonymous((v) => !v)}
                activeOpacity={0.8}
              >
                <View style={styles.optionIconContainer}>
                  <Ionicons
                    name={isAnonymous ? "eye-off" : "eye-off-outline"}
                    size={20}
                    color={isAnonymous ? Colors.primaryLight : themeColors.textPrimary}
                  />
                </View>
                <View className="flex-1 ml-3">
                  <Text style={styles.optionTitle}>Post anonymously</Text>
                  <Text style={styles.optionSubtitle}>
                    Hide your profile credentials on the feed.
                  </Text>
                </View>
                <Ionicons
                  name={isAnonymous ? "checkmark-circle" : "ellipse-outline"}
                  size={20}
                  color={isAnonymous ? Colors.primaryLight : themeColors.textMuted}
                />
              </TouchableOpacity>

              {/* Location Tagging Control */}
              <TouchableOpacity
                style={styles.optionRow}
                onPress={() => setLocationModalVisible(true)}
                activeOpacity={0.8}
              >
                <View style={styles.optionIconContainer}>
                  <Ionicons
                    name="location-outline"
                    size={20}
                    color={selectedLocation ? Colors.primaryLight : themeColors.textPrimary}
                  />
                </View>
                <View className="flex-1 ml-3">
                  <Text style={styles.optionTitle}>Location</Text>
                  <Text style={styles.optionSubtitle}>
                    {selectedLocation ? selectedLocation : "Tag a place in your post"}
                  </Text>
                </View>
                {selectedLocation ? (
                  <TouchableOpacity
                    onPress={(e) => {
                      e.stopPropagation();
                      setSelectedLocation(null);
                    }}
                    style={{ padding: 4 }}
                  >
                    <Ionicons
                      name="close-circle"
                      size={20}
                      color={themeColors.textMuted}
                    />
                  </TouchableOpacity>
                ) : (
                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={themeColors.textMuted}
                  />
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Progress upload overlay */}
      {isLoading && (
        <View style={styles.uploadOverlay}>
          <View style={styles.uploadProgressCard}>
            <ActivityIndicator color="#FFF" size="large" />
            <Text style={styles.uploadProgressText}>
              {uploadStatus || "Uploading..."}
            </Text>
          </View>
        </View>
      )}

      {/* Location Modal */}
      <Modal
        visible={locationModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setLocationModalVisible(false)}
      >
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Tag Location</Text>
              <TouchableOpacity
                onPress={() => {
                  setLocationModalVisible(false);
                  setLocationSearch("");
                }}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={20} color={themeColors.textPrimary} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.modalSearchInput}
              placeholder="Search or add custom place..."
              placeholderTextColor={themeColors.textMuted}
              value={locationSearch}
              onChangeText={setLocationSearch}
              autoFocus
            />

            <ScrollView style={styles.modalList} keyboardShouldPersistTaps="handled">
              {locationSuggestions.map((item) => {
                const isCustom = item.startsWith("Add custom:");
                const displayName = isCustom
                  ? item.substring(13).replace(/"/g, "")
                  : item;
                return (
                  <TouchableOpacity
                    key={item}
                    style={styles.modalListItem}
                    onPress={() => {
                      setSelectedLocation(displayName);
                      setLocationModalVisible(false);
                      setLocationSearch("");
                    }}
                  >
                    <Ionicons
                      name="location-outline"
                      size={18}
                      color={themeColors.textSecondary}
                      style={{ marginRight: 12 }}
                    />
                    <Text style={styles.modalListItemText}>{displayName}</Text>
                    {isCustom && (
                      <Text style={styles.modalCustomLabel}>New Place</Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Poll Creation Modal */}
      <Modal
        visible={pollModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPollModalVisible(false)}
      >
        <View style={styles.pollModalBg}>
          <View style={styles.pollModalCard}>
            <Text style={styles.pollModalTitle}>Create Poll</Text>
            <TextInput
              style={styles.pollModalInput}
              placeholder="Ask a question..."
              placeholderTextColor={themeColors.textMuted}
              value={pollQuestionInput}
              onChangeText={setPollQuestionInput}
              autoFocus
              maxLength={64}
            />
            <View style={styles.pollModalActions}>
              <TouchableOpacity
                style={styles.pollModalCancelBtn}
                onPress={() => setPollModalVisible(false)}
              >
                <Text style={styles.pollModalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.pollModalSaveBtn}
                onPress={() => {
                  setPollSticker({ question: pollQuestionInput.trim() || "Agree?" });
                  setPollModalVisible(false);
                }}
              >
                <Text style={styles.pollModalSaveText}>Add Poll</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: {
      backgroundColor: colors.bg,
      flex: 1,
    },
    header: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
      paddingHorizontal: Spacing.md,
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
    textOnlyButton: {
      alignItems: "center",
      backgroundColor: colors.bgCard,
      borderColor: colors.border,
      borderRadius: Radius.full,
      borderWidth: 1,
      height: 42,
      justifyContent: "center",
      paddingHorizontal: Spacing.md,
    },
    textOnlyButtonText: {
      color: colors.textPrimary,
      fontFamily: FontFamily.semiBold,
      fontSize: FontSize.sm,
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
      opacity: 0.5,
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
    tileLabel: {
      color: "#FFF",
      fontFamily: FontFamily.bold,
      fontSize: 11,
      marginTop: 4,
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
      position: "relative",
    },
    mediaThumb: {
      height: "100%",
      width: "100%",
    },
    gridSelectBadge: {
      alignItems: "center",
      backgroundColor: colors.primaryLight,
      borderColor: "#FFF",
      borderRadius: 11,
      borderWidth: 1,
      height: 22,
      justifyContent: "center",
      position: "absolute",
      right: 8,
      top: 8,
      width: 22,
    },
    gridSelectBadgeText: {
      color: "#FFF",
      fontFamily: FontFamily.bold,
      fontSize: 11,
    },
    gridUnselectBadge: {
      backgroundColor: "rgba(0,0,0,0.25)",
      borderColor: "rgba(255,255,255,0.72)",
      borderRadius: 10,
      borderWidth: 1.5,
      height: 20,
      position: "absolute",
      right: 8,
      top: 8,
      width: 20,
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
    composeContainer: {
      paddingBottom: Spacing.xl,
    },
    previewWrap: {
      aspectRatio: 9 / 12,
      paddingHorizontal: Spacing.md,
      width: "100%",
    },
    previewCard: {
      backgroundColor: colors.bgCard,
      borderColor: colors.border,
      borderRadius: 28,
      borderWidth: 1,
      flex: 1,
      overflow: "hidden",
      position: "relative",
    },
    previewImage: {
      ...StyleSheet.absoluteFillObject,
      height: "100%",
      width: "100%",
    },
    photosCountBadge: {
      backgroundColor: "rgba(0,0,0,0.65)",
      borderRadius: 12,
      paddingHorizontal: 10,
      paddingVertical: 5,
      position: "absolute",
      right: 16,
      top: 16,
      zIndex: 15,
    },
    photosCountBadgeText: {
      color: "#FFF",
      fontFamily: FontFamily.bold,
      fontSize: 11,
    },
    gradientTextCard: {
      alignItems: "center",
      backgroundColor: colors.bgElevated,
      flex: 1,
      justifyContent: "center",
      padding: Spacing.xl,
    },
    gradientTextCardHint: {
      color: colors.textMuted,
      fontFamily: FontFamily.bold,
      fontSize: FontSize.sm,
      marginTop: Spacing.md,
    },
    captionOverlay: {
      backgroundColor: "rgba(10, 10, 10, 0.45)",
      bottom: 0,
      left: 0,
      padding: Spacing.md,
      position: "absolute",
      right: 0,
      zIndex: 10, // Sits above scrollable images
    },
    captionInput: {
      backgroundColor: "rgba(15, 14, 13, 0.68)",
      borderColor: "rgba(255,255,255,0.12)",
      borderRadius: 18,
      borderWidth: 1,
      color: "#FFF",
      fontFamily: FontFamily.medium,
      fontSize: 15,
      maxHeight: 100,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm + 2,
    },
    panel: {
      marginTop: 24,
      paddingHorizontal: Spacing.md,
    },
    sectionLabel: {
      color: colors.textSecondary,
      fontFamily: FontFamily.bold,
      fontSize: 12,
      textTransform: "uppercase",
      marginBottom: 10,
    },
    targetRow: {
      flexDirection: "row",
      gap: Spacing.sm + 4,
      marginBottom: 20,
    },
    targetButton: {
      alignItems: "center",
      backgroundColor: colors.bgCard,
      borderColor: colors.border,
      borderRadius: 16,
      borderWidth: 1,
      flex: 1,
      flexDirection: "row",
      height: 50,
      justifyContent: "center",
    },
    targetButtonActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    targetButtonText: {
      color: colors.textPrimary,
      fontFamily: FontFamily.bold,
      fontSize: FontSize.sm,
      marginLeft: Spacing.sm,
    },
    targetButtonTextActive: {
      color: colors.textInverse,
    },
    postOptionsContainer: {
      gap: Spacing.sm + 2,
    },
    optionRow: {
      alignItems: "center",
      backgroundColor: colors.bgCard,
      borderColor: colors.border,
      borderRadius: 20,
      borderWidth: 1,
      flexDirection: "row",
      padding: Spacing.md,
    },
    optionIconContainer: {
      alignItems: "center",
      backgroundColor: colors.bgElevated,
      borderRadius: Radius.full,
      height: 42,
      justifyContent: "center",
      width: 42,
    },
    optionTitle: {
      color: colors.textPrimary,
      fontFamily: FontFamily.bold,
      fontSize: FontSize.base,
    },
    optionSubtitle: {
      color: colors.textSecondary,
      fontFamily: FontFamily.regular,
      fontSize: 12,
      marginTop: 2,
    },
    optionValuePill: {
      backgroundColor: colors.bgElevated,
      borderRadius: 12,
      paddingHorizontal: Spacing.sm + 2,
      paddingVertical: Spacing.xs,
    },
    optionValueText: {
      color: colors.textPrimary,
      fontFamily: FontFamily.bold,
      fontSize: 11,
    },
    subheader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm + 2,
    },
    subheaderTitle: {
      color: colors.textPrimary,
      fontFamily: FontFamily.bold,
      fontSize: 16,
    },
    multipleToggle: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.bgElevated,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 20,
      paddingHorizontal: 12,
      paddingVertical: 6,
      gap: 6,
    },
    multipleToggleActive: {
      backgroundColor: "#FFF",
      borderColor: "#FFF",
    },
    multipleToggleText: {
      color: "#FFF",
      fontFamily: FontFamily.bold,
      fontSize: 11,
    },
    uploadOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0, 0, 0, 0.72)",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 9999,
    },
    uploadProgressCard: {
      backgroundColor: colors.bgCard,
      borderRadius: 24,
      padding: 24,
      alignItems: "center",
      borderColor: colors.border,
      borderWidth: 1,
      minWidth: 220,
    },
    uploadProgressText: {
      color: colors.textPrimary,
      fontFamily: FontFamily.bold,
      fontSize: 14,
      marginTop: 16,
      textAlign: "center",
    },
    pollStickerOverlay: {
      position: "absolute",
      alignSelf: "center",
      top: "40%",
      backgroundColor: "rgba(0, 0, 0, 0.75)",
      borderRadius: 20,
      padding: 16,
      width: "80%",
      alignItems: "center",
      borderColor: "rgba(255, 255, 255, 0.15)",
      borderWidth: 1,
      zIndex: 30,
    },
    pollStickerQuestion: {
      color: "#FFF",
      fontFamily: FontFamily.bold,
      fontSize: 16,
      textAlign: "center",
      marginBottom: 12,
    },
    pollStickerOptions: {
      flexDirection: "row",
      width: "100%",
      gap: 12,
    },
    pollStickerBtn: {
      flex: 1,
      backgroundColor: "rgba(255, 255, 255, 0.18)",
      borderColor: "rgba(255, 255, 255, 0.3)",
      borderWidth: 1,
      borderRadius: 14,
      height: 40,
      justifyContent: "center",
      alignItems: "center",
    },
    pollStickerBtnText: {
      color: "#FFF",
      fontFamily: FontFamily.bold,
      fontSize: 14,
    },
    pollStickerDeleteBtn: {
      position: "absolute",
      top: -8,
      right: -8,
      zIndex: 35,
    },
    pollModalBg: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.65)",
      justifyContent: "center",
      alignItems: "center",
    },
    pollModalCard: {
      backgroundColor: colors.bgCard,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 24,
      padding: 24,
      width: "85%",
      alignItems: "center",
    },
    pollModalTitle: {
      color: colors.textPrimary,
      fontFamily: FontFamily.bold,
      fontSize: 18,
      marginBottom: 16,
    },
    pollModalInput: {
      width: "100%",
      backgroundColor: colors.bgElevated,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 16,
      color: colors.textPrimary,
      fontFamily: FontFamily.medium,
      fontSize: 16,
      padding: 14,
      textAlign: "center",
      marginBottom: 20,
    },
    pollModalActions: {
      flexDirection: "row",
      gap: 12,
      width: "100%",
    },
    pollModalCancelBtn: {
      flex: 1,
      height: 46,
      borderRadius: 23,
      justifyContent: "center",
      alignItems: "center",
      borderColor: colors.border,
      borderWidth: 1,
    },
    pollModalCancelText: {
      color: colors.textSecondary,
      fontFamily: FontFamily.bold,
      fontSize: 14,
    },
    pollModalSaveBtn: {
      flex: 1,
      height: 46,
      borderRadius: 23,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: colors.primary,
    },
    pollModalSaveText: {
      color: colors.textInverse,
      fontFamily: FontFamily.bold,
      fontSize: 14,
    },
    modalBg: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.6)",
      justifyContent: "flex-end",
    },
    modalCard: {
      backgroundColor: colors.bgCard,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      borderColor: colors.border,
      borderWidth: 1,
      height: "70%",
      padding: Spacing.md,
    },
    modalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: Spacing.md,
    },
    modalTitle: {
      color: colors.textPrimary,
      fontFamily: FontFamily.bold,
      fontSize: 18,
    },
    modalCloseBtn: {
      backgroundColor: colors.bgElevated,
      borderRadius: 16,
      padding: 6,
    },
    modalSearchInput: {
      backgroundColor: colors.bgElevated,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 16,
      color: colors.textPrimary,
      fontFamily: FontFamily.medium,
      fontSize: 15,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      marginBottom: Spacing.md,
    },
    modalList: {
      flex: 1,
    },
    modalListItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    modalListItemText: {
      color: colors.textPrimary,
      fontFamily: FontFamily.semiBold,
      fontSize: 15,
      flex: 1,
    },
    modalCustomLabel: {
      color: Colors.primaryLight,
      fontFamily: FontFamily.bold,
      fontSize: 10,
      textTransform: "uppercase",
      backgroundColor: "rgba(255, 64, 129, 0.1)",
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
    },
    filterToastContainer: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: "center",
      alignItems: "center",
      pointerEvents: "none",
      zIndex: 40,
    },
    filterToastCard: {
      backgroundColor: "rgba(0, 0, 0, 0.72)",
      borderRadius: 16,
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    filterToastText: {
      color: "#FFF",
      fontFamily: FontFamily.bold,
      fontSize: 14,
      textAlign: "center",
    },
  });
