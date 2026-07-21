import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  PanResponder,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useColorScheme } from "nativewind";

import { Colors } from "@/constants/colors";
import { FontFamily, FontSize } from "@/constants/typography";
import { useUpdateProfileMutation } from "@/hooks/queries";
import { postService } from "@/services/post.service";
import { useAuthStore } from "@/store/authStore";
import { showToast } from "@/utils/toast";

const GENDER_OPTIONS = ["MALE", "FEMALE", "NON_BINARY", "OTHER"];
const INTERESTED_IN_OPTIONS = ["Men", "Women", "Non-binary", "Everyone"];
const INTEREST_OPTIONS = [
  "Music",
  "Travel",
  "Fitness",
  "Gaming",
  "Food",
  "Movies",
  "Books",
  "Coding",
  "Fashion",
  "Nature",
  "Photography",
  "Coffee",
];
const LOOKING_FOR_OPTIONS = [
  "New friends",
  "Serious Relationship",
  "Casual Dating",
  "Open to Anything",
];
const RELATIONSHIP_OPTIONS = [
  "Open to dating",
  "Open to friends",
  "Long term",
  "Still figuring it out",
];
const ZODIAC_OPTIONS = [
  "Aries",
  "Taurus",
  "Gemini",
  "Cancer",
  "Leo",
  "Virgo",
  "Libra",
  "Scorpio",
  "Sagittarius",
  "Capricorn",
  "Aquarius",
  "Pisces",
];
const AGE_RANGE_MIN = 18;
const AGE_RANGE_MAX = 60;
const AGE_MIN_GAP = 1;
const DISTANCE_OPTIONS = ["10", "25", "50", "100", "250", "500"];

type SheetField =
  | "username"
  | "bio"
  | "gender"
  | "interestedIn"
  | "interests"
  | "lookingFor"
  | "relationship"
  | "ageRange"
  | "maxDistance"
  | "zodiac";

type SettingItem = {
  key: SheetField;
  title: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const formatOption = (value: string) =>
  value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const toggleValue = (values: string[], value: string) =>
  values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];

export default function EditProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colorScheme } = useColorScheme();
  const { refreshUser, user } = useAuthStore();
  const profile = user?.profile;
  const updateProfileMutation = useUpdateProfileMutation();

  const [avatarUri, setAvatarUri] = useState<string | null>(
    profile?.avatarUrl || null,
  );
  const [avatarMimeType, setAvatarMimeType] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [activeSheet, setActiveSheet] = useState<SheetField | null>(null);
  const [isPhotoActionsVisible, setIsPhotoActionsVisible] = useState(false);

  const [username, setUsername] = useState(
    profile?.username || user?.username || "",
  );
  const [bio, setBio] = useState(profile?.bio || "");
  const [gender, setGender] = useState(profile?.gender || "OTHER");
  const [interestedIn, setInterestedIn] = useState<string[]>(
    profile?.interestedIn || [],
  );
  const [interests, setInterests] = useState<string[]>(
    profile?.interests || [],
  );
  const [lookingFor, setLookingFor] = useState<string[]>(
    profile?.lookingFor?.length ? profile.lookingFor : ["New friends"],
  );
  const [relationship, setRelationship] = useState(
    profile?.relationship || "Open to dating",
  );
  const [minAge, setMinAge] = useState(String(profile?.minAge || 18));
  const [maxAge, setMaxAge] = useState(String(profile?.maxAge || 35));
  const [maxDistance, setMaxDistance] = useState(
    String(profile?.maxDistance || 50),
  );
  const [zodiac, setZodiac] = useState(profile?.zodiac || "Cancer");
  const isSaving = isUploading || updateProfileMutation.isPending;

  const completion = useMemo(
    () =>
      getProfileCompletion({
        avatarUrl: avatarUri,
        bio,
        interests,
        location: profile?.location,
        lookingFor,
      }),
    [avatarUri, bio, interests, lookingFor, profile?.location],
  );

  const profileItems: SettingItem[] = useMemo(
    () => [
      {
        key: "username",
        title: "Username",
        value: username || "Add username",
        icon: "person-outline",
      },
      {
        key: "bio",
        title: "Bio",
        value: bio || "Add bio",
        icon: "chatbubble-ellipses-outline",
      },
      {
        key: "gender",
        title: "Gender",
        value: formatOption(gender),
        icon: "body-outline",
      },
      {
        key: "interestedIn",
        title: "Interested In",
        value: interestedIn.length ? interestedIn.join(", ") : "Add preference",
        icon: "people-outline",
      },
      {
        key: "interests",
        title: "Interests",
        value: interests.length ? interests.join(", ") : "Add interests",
        icon: "sparkles-outline",
      },
    ],
    [bio, gender, interestedIn, interests, username],
  );

  const datingItems: SettingItem[] = useMemo(
    () => [
      {
        key: "lookingFor",
        title: "Looking for",
        value: lookingFor[0] || "New friends",
        icon: "heart-outline",
      },
      {
        key: "relationship",
        title: "Relationship",
        value: relationship || "Open to...",
        icon: "heart-circle-outline",
      },
      {
        key: "zodiac",
        title: "Zodiac",
        value: zodiac,
        icon: "moon-outline",
      },
      {
        key: "ageRange",
        title: "Age range",
        value: `${minAge} - ${maxAge}`,
        icon: "options-outline",
      },
      {
        key: "maxDistance",
        title: "Max Distance",
        value: `${maxDistance} km`,
        icon: "navigate-outline",
      },
    ],
    [lookingFor, maxAge, maxDistance, minAge, relationship, zodiac],
  );

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.82,
    });

    if (result.canceled) return;

    const asset = result.assets[0];
    const compressedUri = await compressImage(asset.uri);
    setAvatarUri(compressedUri);
    setAvatarMimeType(asset.mimeType || "image/jpeg");
  };

  const openPhotoActions = () => {
    setIsPhotoActionsVisible(true);
  };

  const handlePickPhoto = async () => {
    await pickPhoto();
  };

  const handleRemovePhoto = () => {
    setAvatarUri(null);
    setAvatarMimeType(null);
  };

  const saveProfile = async () => {
    try {
      setIsUploading(true);
      setUploadProgress(0);
      let finalAvatarUrl: string | null | undefined = avatarUri
        ? profile?.avatarUrl
        : null;
      const uploadTasks = [
        avatarUri && avatarUri !== profile?.avatarUrl ? "avatar" : null,
      ].filter(Boolean);
      const progressStep = uploadTasks.length ? 100 / uploadTasks.length : 100;
      let completedUploads = 0;

      if (avatarUri && avatarUri !== profile?.avatarUrl) {
        finalAvatarUrl = await postService.uploadMedia(
          avatarUri,
          avatarMimeType || "image/jpeg",
          (progress) =>
            setUploadProgress(
              Math.round(
                completedUploads * progressStep +
                  progress * (progressStep / 100),
              ),
            ),
        );
        completedUploads += 1;
      }

      await updateProfileMutation.mutateAsync({
        username: username.trim().toLowerCase(),
        bio: bio.trim(),
        gender,
        interestedIn,
        interests,
        lookingFor,
        relationship,
        minAge: Number(minAge),
        maxAge: Number(maxAge),
        maxDistance: Number(maxDistance),
        zodiac,
        avatarUrl: finalAvatarUrl ?? null,
      });
      await refreshUser();
      showToast("Profile updated successfully", "Profile saved");
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to update profile";
      showToast(message, "Profile not saved");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <SafeAreaView
      className="flex-1"
      style={styles.screen}
      edges={["top", "left", "right"]}
    >
      <StatusBar
        style={colorScheme === "dark" ? "light" : "dark"}
        backgroundColor={Colors.bg}
      />

      {/* ── Simplified header ── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerBackBtn}
          onPress={() => router.back()}
          activeOpacity={0.78}
        >
          <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit profile</Text>
        <TouchableOpacity
          style={[styles.headerSaveBtn, isSaving && styles.saveBtnDisabled]}
          onPress={saveProfile}
          disabled={isSaving}
          activeOpacity={0.82}
          accessibilityRole="button"
          accessibilityLabel="Save profile changes"
        >
          {isSaving ? (
            <ActivityIndicator size="small" color={Colors.textInverse} />
          ) : (
            <Ionicons name="checkmark" size={20} color={Colors.textInverse} />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom + 104, 132) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Centered hero card ── */}
        <LinearGradient colors={Colors.gradientCard} style={styles.heroCard}>
          <View style={styles.heroEyebrow}>
            <Ionicons name="sparkles" size={13} color={Colors.textSecondary} />
            <Text style={styles.heroEyebrowText}>YOUR FIRST IMPRESSION</Text>
          </View>

          {/* Centered avatar with gradient ring */}
          <TouchableOpacity
            style={styles.avatarContainer}
            onPress={openPhotoActions}
            activeOpacity={0.88}
          >
            <LinearGradient
              colors={Colors.gradientPrimary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.avatarRing}
            >
              <View style={styles.avatarInner}>
                {avatarUri ? (
                  <Image
                    source={{ uri: avatarUri }}
                    style={styles.avatarImage}
                    resizeMode="cover"
                  />
                ) : (
                  <LinearGradient
                    colors={Colors.gradientCard}
                    style={styles.avatarPlaceholder}
                  >
                    <Text style={styles.initialsText}>
                      {getInitials(username || user?.username)}
                    </Text>
                  </LinearGradient>
                )}
              </View>
            </LinearGradient>
            <View style={styles.avatarBadge}>
              <Ionicons name="camera" size={14} color={Colors.textInverse} />
            </View>
          </TouchableOpacity>

          <Text style={styles.heroName} numberOfLines={1}>
            {username || "Your profile"}
          </Text>
          <Text style={styles.heroBio} numberOfLines={2}>
            {bio ||
              "Add a short bio so people know what kind of connection you're here for."}
          </Text>

          {/* Integrated completion bar */}
          <View style={styles.heroCompletion}>
            <View style={styles.heroCompletionRow}>
              <View style={styles.heroCompletionLabelWrap}>
                <Ionicons
                  name="sparkles"
                  size={12}
                  color={Colors.primaryLight}
                />
                <Text style={styles.heroCompletionLabel}>
                  {completion}% complete
                </Text>
              </View>
              <Text style={styles.heroCompletionHint} numberOfLines={1}>
                {getCompletionHint(completion)}
              </Text>
            </View>
            <View style={styles.heroCompletionTrack}>
              <LinearGradient
                colors={Colors.gradientPrimary}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[
                  styles.heroCompletionFill,
                  { width: `${Math.max(completion, 4)}%` },
                ]}
              />
            </View>
            {isUploading ? (
              <Text style={styles.heroUploadText}>
                Uploading… {uploadProgress}%
              </Text>
            ) : null}
          </View>
        </LinearGradient>

        {/* ── Profile details section ── */}
        <SectionTitle title="Profile details" />
        <View style={styles.sectionCard}>
          {profileItems.map((item, index) => (
            <SettingRow
              key={item.key}
              item={item}
              isLast={index === profileItems.length - 1}
              onPress={() => setActiveSheet(item.key)}
            />
          ))}
        </View>

        {/* ── Dating preferences section ── */}
        <SectionTitle title="Dating preferences" />
        <View style={styles.sectionCard}>
          {datingItems.map((item, index) => (
            <SettingRow
              key={item.key}
              item={item}
              isLast={index === datingItems.length - 1}
              onPress={() => setActiveSheet(item.key)}
            />
          ))}
        </View>
      </ScrollView>

      {/* ── Sticky save bar ── */}
      <View
        style={[
          styles.bottomBar,
          { paddingBottom: Math.max(insets.bottom, 12) },
        ]}
      >
        <TouchableOpacity
          style={[styles.saveButton, isSaving && styles.saveBtnDisabled]}
          onPress={saveProfile}
          disabled={isSaving}
          activeOpacity={0.84}
          accessibilityRole="button"
          accessibilityLabel="Save profile changes"
        >
          <LinearGradient
            colors={Colors.gradientPrimary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.saveButtonGradient}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color={Colors.textInverse} />
            ) : (
              <>
                <Ionicons
                  name="checkmark-circle"
                  size={19}
                  color={Colors.textInverse}
                />
                <Text style={styles.saveButtonText}>Save changes</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <AvatarPhotoSheet
        visible={isPhotoActionsVisible}
        hasPhoto={Boolean(avatarUri)}
        onAddOrChange={handlePickPhoto}
        onRemove={handleRemovePhoto}
        onClose={() => setIsPhotoActionsVisible(false)}
      />

      <EditDrawer
        activeSheet={activeSheet}
        onClose={() => setActiveSheet(null)}
        values={{
          username,
          bio,
          gender,
          interestedIn,
          interests,
          lookingFor,
          relationship,
          minAge,
          maxAge,
          maxDistance,
          zodiac,
        }}
        setters={{
          setUsername,
          setBio,
          setGender,
          setInterestedIn,
          setInterests,
          setLookingFor,
          setRelationship,
          setMinAge,
          setMaxAge,
          setMaxDistance,
          setZodiac,
        }}
      />
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────
//  Sub-components
// ─────────────────────────────────────────────

const SectionTitle = ({ title }: { title: string }) => (
  <Text style={styles.sectionTitle}>{title}</Text>
);

const SettingRow = ({
  item,
  isLast,
  onPress,
}: {
  item: SettingItem;
  isLast: boolean;
  onPress: () => void;
}) => (
  <TouchableOpacity
    style={styles.settingRow}
    onPress={onPress}
    activeOpacity={0.72}
    accessibilityRole="button"
    accessibilityLabel={`Edit ${item.title}`}
  >
    <View style={styles.rowIconBox}>
      <Ionicons name={item.icon} size={19} color={Colors.primary} />
    </View>
    <View style={[styles.rowContent, !isLast && styles.rowDivider]}>
      <View style={styles.rowCopy}>
        <Text style={styles.rowTitle}>{item.title}</Text>
        <Text style={styles.rowValue} numberOfLines={1}>
          {item.value}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
    </View>
  </TouchableOpacity>
);

// ─────────────────────────────────────────────
//  Avatar Photo Sheet
// ─────────────────────────────────────────────

const AvatarPhotoSheet = ({
  visible,
  hasPhoto,
  onAddOrChange,
  onRemove,
  onClose,
}: {
  visible: boolean;
  hasPhoto: boolean;
  onAddOrChange: () => void;
  onRemove: () => void;
  onClose: () => void;
}) => {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const closedY = height * 0.46;
  const [mounted, setMounted] = useState(visible);
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(closedY)).current;
  const sheetScale = sheetTranslateY.interpolate({
    inputRange: [0, closedY],
    outputRange: [1, 0.97],
    extrapolate: "clamp",
  });

  React.useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 240,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(sheetTranslateY, {
          toValue: 0,
          damping: 22,
          stiffness: 200,
          mass: 0.85,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (mounted) {
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 200,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(sheetTranslateY, {
          toValue: closedY,
          duration: 220,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(() => setMounted(false));
    }
  }, [backdropOpacity, closedY, mounted, sheetTranslateY, visible]);

  const dismissWith = (afterClose?: () => void) => {
    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 200,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(sheetTranslateY, {
        toValue: closedY,
        duration: 220,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(() => {
      setMounted(false);
      onClose();
      afterClose?.();
    });
  };

  if (!mounted) return null;

  return (
    <Modal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      accessibilityViewIsModal
      onRequestClose={() => dismissWith()}
    >
      <View style={styles.sheetBackdrop}>
        <Animated.View
          style={[StyleSheet.absoluteFillObject, { opacity: backdropOpacity }]}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close photo options"
            style={styles.sheetDimLayer}
            onPress={() => dismissWith()}
          >
            <LinearGradient
              colors={["rgba(0,0,0,0.08)", "rgba(0,0,0,0.72)"]}
              style={StyleSheet.absoluteFill}
            />
          </Pressable>
        </Animated.View>
        <Animated.View
          style={[
            styles.photoSheet,
            { paddingBottom: Math.max(insets.bottom + 16, 28) },
            {
              transform: [
                { translateY: sheetTranslateY },
                { scale: sheetScale },
              ],
            },
          ]}
        >
          <View style={styles.sheetHandle} />

          {/* Header with icon + copy */}
          <View style={styles.photoSheetHeader}>
            <View style={styles.photoSheetIconWrap}>
              <Ionicons
                name="camera-outline"
                size={22}
                color={Colors.primary}
              />
            </View>
            <View style={styles.photoSheetCopy}>
              <Text style={styles.photoSheetTitle}>Avatar photo</Text>
              <Text style={styles.photoSheetSubtitle}>
                Choose the first impression people see on your profile.
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.photoSheetAction}
            activeOpacity={0.82}
            accessibilityRole="button"
            onPress={() => dismissWith(onAddOrChange)}
          >
            <View style={styles.photoSheetActionIcon}>
              <Ionicons
                name="image-outline"
                size={18}
                color={Colors.textPrimary}
              />
            </View>
            <Text style={styles.photoSheetActionText}>
              {hasPhoto ? "Change photo" : "Add photo"}
            </Text>
            <Ionicons
              name="chevron-forward"
              size={16}
              color={Colors.textMuted}
            />
          </TouchableOpacity>

          {hasPhoto ? (
            <TouchableOpacity
              style={[styles.photoSheetAction, styles.photoSheetDangerAction]}
              activeOpacity={0.82}
              accessibilityRole="button"
              onPress={() => dismissWith(onRemove)}
            >
              <View
                style={[
                  styles.photoSheetActionIcon,
                  styles.photoSheetDangerIcon,
                ]}
              >
                <Ionicons name="trash-outline" size={18} color={Colors.error} />
              </View>
              <Text
                style={[
                  styles.photoSheetActionText,
                  styles.photoSheetDangerText,
                ]}
              >
                Remove photo
              </Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            style={styles.photoSheetCancel}
            activeOpacity={0.82}
            accessibilityRole="button"
            onPress={() => dismissWith()}
          >
            <Text style={styles.photoSheetCancelText}>Cancel</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
};

// ─────────────────────────────────────────────
//  Animated edit-field drawer
// ─────────────────────────────────────────────

const EditDrawer = ({
  activeSheet,
  onClose,
  values,
  setters,
}: {
  activeSheet: SheetField | null;
  onClose: () => void;
  values: {
    username: string;
    bio: string;
    gender: string;
    interestedIn: string[];
    interests: string[];
    lookingFor: string[];
    relationship: string;
    minAge: string;
    maxAge: string;
    maxDistance: string;
    zodiac: string;
  };
  setters: {
    setUsername: (value: string) => void;
    setBio: (value: string) => void;
    setGender: (value: string) => void;
    setInterestedIn: (value: string[]) => void;
    setInterests: (value: string[]) => void;
    setLookingFor: (value: string[]) => void;
    setRelationship: (value: string) => void;
    setMinAge: (value: string) => void;
    setMaxAge: (value: string) => void;
    setMaxDistance: (value: string) => void;
    setZodiac: (value: string) => void;
  };
}) => {
  const [mounted, setMounted] = useState(false);
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const closedY = height * 0.82;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(closedY)).current;
  const sheetScale = sheetTranslateY.interpolate({
    inputRange: [0, closedY],
    outputRange: [1, 0.965],
    extrapolate: "clamp",
  });

  // Sync animation triggers with activeSheet state changes
  React.useEffect(() => {
    if (activeSheet) {
      setMounted(true);
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 240,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(sheetTranslateY, {
          toValue: 0,
          damping: 22,
          stiffness: 200,
          mass: 0.85,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 200,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(sheetTranslateY, {
          toValue: closedY,
          duration: 200,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(() => {
        setMounted(false);
      });
    }
  }, [activeSheet, backdropOpacity, closedY, sheetTranslateY]);

  if (!mounted) return null;

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 200,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(sheetTranslateY, {
        toValue: closedY,
        duration: 200,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(() => {
      setMounted(false);
      onClose();
    });
  };

  return (
    <Modal
      visible
      transparent
      animationType="none"
      onRequestClose={handleDismiss}
    >
      <KeyboardAvoidingView
        style={StyleSheet.absoluteFillObject}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Animated backdrop */}
        <Animated.View
          style={[StyleSheet.absoluteFillObject, { opacity: backdropOpacity }]}
        >
          <Pressable style={styles.drawerBackdrop} onPress={handleDismiss}>
            <LinearGradient
              colors={["rgba(0,0,0,0.08)", "rgba(0,0,0,0.72)"]}
              style={StyleSheet.absoluteFill}
            />
          </Pressable>
        </Animated.View>

        {/* Animated content drawer */}
        <Animated.View
          style={[
            styles.drawer,
            {
              maxHeight: height * 0.84,
              paddingBottom: Math.max(insets.bottom, 8),
              transform: [
                { translateY: sheetTranslateY },
                { scale: sheetScale },
              ],
            },
          ]}
        >
          <View style={styles.sheetHandle} />

          <View style={styles.drawerHeader}>
            <TouchableOpacity
              style={styles.drawerCloseBtn}
              onPress={handleDismiss}
              activeOpacity={0.82}
            >
              <Ionicons name="close" size={20} color={Colors.textPrimary} />
            </TouchableOpacity>

            <View style={styles.drawerTitleWrap}>
              <Text style={styles.drawerTitleText}>
                {getSheetTitle(activeSheet)}
              </Text>
              <Text style={styles.drawerSubtitle}>
                {getSheetSubtitle(activeSheet)}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.doneButton}
              onPress={handleDismiss}
              activeOpacity={0.84}
            >
              <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={styles.drawerScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {activeSheet === "username" && (
              <ProfileInput
                value={values.username}
                onChangeText={setters.setUsername}
                placeholder="username"
                autoCapitalize="none"
              />
            )}
            {activeSheet === "bio" && (
              <ProfileInput
                value={values.bio}
                onChangeText={setters.setBio}
                placeholder="Write something about yourself"
                multiline
              />
            )}
            {activeSheet === "gender" && (
              <ListSelector
                options={GENDER_OPTIONS}
                selected={values.gender}
                onSelect={setters.setGender}
                formatLabel={formatOption}
              />
            )}
            {activeSheet === "interestedIn" && (
              <ChipGrid
                options={INTERESTED_IN_OPTIONS}
                selected={values.interestedIn}
                onToggle={(val) =>
                  setters.setInterestedIn(toggleValue(values.interestedIn, val))
                }
              />
            )}
            {activeSheet === "interests" && (
              <ChipGrid
                options={INTEREST_OPTIONS}
                selected={values.interests}
                onToggle={(val) =>
                  setters.setInterests(toggleValue(values.interests, val))
                }
              />
            )}
            {activeSheet === "lookingFor" && (
              <ListSelector
                options={LOOKING_FOR_OPTIONS}
                selected={values.lookingFor[0]}
                onSelect={(val) => setters.setLookingFor([val])}
              />
            )}
            {activeSheet === "relationship" && (
              <ListSelector
                options={RELATIONSHIP_OPTIONS}
                selected={values.relationship}
                onSelect={setters.setRelationship}
              />
            )}
            {activeSheet === "ageRange" && (
              <AgeRangeSlider
                minAge={values.minAge}
                maxAge={values.maxAge}
                onMinAgeChange={setters.setMinAge}
                onMaxAgeChange={setters.setMaxAge}
              />
            )}
            {activeSheet === "maxDistance" && (
              <ListSelector
                options={DISTANCE_OPTIONS}
                selected={values.maxDistance}
                onSelect={setters.setMaxDistance}
                formatLabel={(val) => `${val} km`}
              />
            )}
            {activeSheet === "zodiac" && (
              <ChipGrid
                options={ZODIAC_OPTIONS}
                selected={[values.zodiac]}
                onToggle={setters.setZodiac}
              />
            )}
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

// ─────────────────────────────────────────────
//  Form widgets
// ─────────────────────────────────────────────

const ProfileInput = ({
  value,
  onChangeText,
  placeholder,
  multiline,
  autoCapitalize,
}: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  multiline?: boolean;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
}) => (
  <TextInput
    value={value}
    onChangeText={onChangeText}
    placeholder={placeholder}
    placeholderTextColor={Colors.textMuted}
    multiline={multiline}
    autoCapitalize={autoCapitalize}
    style={[styles.profileInput, multiline && styles.profileInputMultiline]}
    textAlignVertical={multiline ? "top" : "center"}
  />
);

const ChipGrid = ({
  options,
  selected,
  onToggle,
}: {
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
}) => (
  <View style={styles.chipGrid}>
    {options.map((option) => {
      const active = selected.includes(option);
      return (
        <TouchableOpacity
          key={option}
          style={[styles.chip, active && styles.chipActive]}
          onPress={() => onToggle(option)}
          activeOpacity={0.78}
        >
          {active && (
            <Ionicons
              name="checkmark-circle"
              size={15}
              color={Colors.textInverse}
              style={styles.chipCheckIcon}
            />
          )}
          <Text style={[styles.chipText, active && styles.chipTextActive]}>
            {option}
          </Text>
        </TouchableOpacity>
      );
    })}
  </View>
);

const clampAge = (value: number) =>
  Math.min(AGE_RANGE_MAX, Math.max(AGE_RANGE_MIN, value));

const ageToPosition = (age: number, width: number) =>
  ((clampAge(age) - AGE_RANGE_MIN) / (AGE_RANGE_MAX - AGE_RANGE_MIN)) * width;

const positionToAge = (position: number, width: number) => {
  if (!width) return AGE_RANGE_MIN;
  const ratio = Math.min(1, Math.max(0, position / width));
  return Math.round(AGE_RANGE_MIN + ratio * (AGE_RANGE_MAX - AGE_RANGE_MIN));
};

const AgeRangeSlider = ({
  minAge,
  maxAge,
  onMinAgeChange,
  onMaxAgeChange,
}: {
  minAge: string;
  maxAge: string;
  onMinAgeChange: (value: string) => void;
  onMaxAgeChange: (value: string) => void;
}) => {
  const [trackWidth, setTrackWidth] = useState(0);
  const currentMinAge = clampAge(Number(minAge) || AGE_RANGE_MIN);
  const currentMaxAge = clampAge(Number(maxAge) || AGE_RANGE_MAX);
  const minStartAge = useRef(currentMinAge);
  const maxStartAge = useRef(currentMaxAge);

  const updateMinAge = useCallback(
    (value: number) => {
      onMinAgeChange(
        String(Math.min(clampAge(value), currentMaxAge - AGE_MIN_GAP)),
      );
    },
    [currentMaxAge, onMinAgeChange],
  );

  const updateMaxAge = useCallback(
    (value: number) => {
      onMaxAgeChange(
        String(Math.max(clampAge(value), currentMinAge + AGE_MIN_GAP)),
      );
    },
    [currentMinAge, onMaxAgeChange],
  );

  const minPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          minStartAge.current = currentMinAge;
        },
        onPanResponderMove: (_event, gesture) => {
          if (!trackWidth) return;
          const startX = ageToPosition(minStartAge.current, trackWidth);
          updateMinAge(positionToAge(startX + gesture.dx, trackWidth));
        },
      }),
    [currentMinAge, trackWidth, updateMinAge],
  );

  const maxPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          maxStartAge.current = currentMaxAge;
        },
        onPanResponderMove: (_event, gesture) => {
          if (!trackWidth) return;
          const startX = ageToPosition(maxStartAge.current, trackWidth);
          updateMaxAge(positionToAge(startX + gesture.dx, trackWidth));
        },
      }),
    [currentMaxAge, trackWidth, updateMaxAge],
  );

  const minPosition = ageToPosition(currentMinAge, trackWidth);
  const maxPosition = ageToPosition(currentMaxAge, trackWidth);

  return (
    <View style={styles.ageRangeCard}>
      <View style={styles.ageRangeHeader}>
        <View style={styles.ageRangeValuePill}>
          <Text style={styles.ageRangeLabel}>Min</Text>
          <Text style={styles.ageRangeValue}>{currentMinAge}</Text>
        </View>
        <View style={styles.ageRangeCenterCopy}>
          <Text style={styles.ageRangeTitle}>
            {currentMinAge} - {currentMaxAge}
          </Text>
          <Text style={styles.ageRangeSubtitle}>Preferred match ages</Text>
        </View>
        <View style={styles.ageRangeValuePill}>
          <Text style={styles.ageRangeLabel}>Max</Text>
          <Text style={styles.ageRangeValue}>{currentMaxAge}</Text>
        </View>
      </View>

      <View
        style={styles.ageRangeTrackWrap}
        onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}
      >
        <View style={styles.ageRangeTrack} />
        {trackWidth > 0 ? (
          <>
            <LinearGradient
              colors={Colors.gradientPrimary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[
                styles.ageRangeFill,
                {
                  left: minPosition,
                  width: Math.max(maxPosition - minPosition, 0),
                },
              ]}
            />
            <Animated.View
              style={[styles.ageRangeThumb, { left: minPosition - 16 }]}
              {...minPanResponder.panHandlers}
            >
              <Ionicons
                name="chevron-back"
                size={14}
                color={Colors.textInverse}
              />
            </Animated.View>
            <Animated.View
              style={[styles.ageRangeThumb, { left: maxPosition - 16 }]}
              {...maxPanResponder.panHandlers}
            >
              <Ionicons
                name="chevron-forward"
                size={14}
                color={Colors.textInverse}
              />
            </Animated.View>
          </>
        ) : null}
      </View>

      <View style={styles.ageRangeBoundsRow}>
        <Text style={styles.ageRangeBoundText}>{AGE_RANGE_MIN}</Text>
        <Text style={styles.ageRangeBoundText}>{AGE_RANGE_MAX}+</Text>
      </View>
    </View>
  );
};

const ListSelector = ({
  options,
  selected,
  onSelect,
  formatLabel = (value) => value,
}: {
  options: string[];
  selected: string;
  onSelect: (value: string) => void;
  formatLabel?: (value: string) => string;
}) => (
  <View style={styles.selectorList}>
    {options.map((option) => {
      const active = selected === option;
      return (
        <TouchableOpacity
          key={option}
          style={[styles.selectorRow, active && styles.selectorRowActive]}
          onPress={() => onSelect(option)}
          activeOpacity={0.78}
        >
          <Text
            style={[styles.selectorText, active && styles.selectorTextActive]}
          >
            {formatLabel(option)}
          </Text>
          <View style={[styles.radioOuter, active && styles.radioOuterActive]}>
            {active && <View style={styles.radioInner} />}
          </View>
        </TouchableOpacity>
      );
    })}
  </View>
);

// ─────────────────────────────────────────────
//  Helpers (unchanged business logic)
// ─────────────────────────────────────────────

const getSheetTitle = (field: SheetField | null) => {
  switch (field) {
    case "username":
      return "Username";
    case "bio":
      return "Bio";
    case "gender":
      return "Gender";
    case "interestedIn":
      return "Interested In";
    case "interests":
      return "Interests";
    case "lookingFor":
      return "Looking for";
    case "relationship":
      return "Relationship";
    case "ageRange":
      return "Age range";
    case "maxDistance":
      return "Max Distance";
    case "zodiac":
      return "Zodiac";
    default:
      return "";
  }
};

const getSheetSubtitle = (field: SheetField | null) => {
  switch (field) {
    case "username":
      return "Choose a unique name others will see";
    case "bio":
      return "Tell people a bit about yourself";
    case "gender":
      return "How do you identify?";
    case "interestedIn":
      return "Who are you looking to meet?";
    case "interests":
      return "Pick what you're into";
    case "lookingFor":
      return "What brings you here?";
    case "relationship":
      return "What's your vibe?";
    case "ageRange":
      return "Drag the ends to set your preferred match ages";
    case "maxDistance":
      return "How far are you willing to go?";
    case "zodiac":
      return "What's your sign?";
    default:
      return "";
  }
};

const compressImage = async (
  uri: string,
  type: "avatar" | "other" = "avatar",
) => {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 900 } }],
    {
      compress: type === "avatar" ? 0.78 : 0.72,
      format: ImageManipulator.SaveFormat.JPEG,
    },
  );

  return result.uri;
};

const getProfileCompletion = ({
  avatarUrl,
  bio,
  interests,
  location,
  lookingFor,
}: {
  avatarUrl?: string | null;
  bio?: string | null;
  interests?: string[];
  location?: string | null;
  lookingFor?: string[];
}) => {
  const checks = [
    avatarUrl,
    bio?.trim(),
    interests?.length ? "interests" : null,
    location,
    lookingFor?.length ? "lookingFor" : null,
  ];

  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
};

const getCompletionHint = (completion: number) =>
  completion >= 100
    ? "Looking sharp ✨"
    : "Add avatar, bio, interests, location";

const getInitials = (value?: string | null) => {
  const fallback = "ME";
  if (!value?.trim()) return fallback;

  const initials = value
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  return initials || fallback;
};

// ─────────────────────────────────────────────
//  Styles
// ─────────────────────────────────────────────

const styles = StyleSheet.create({
  /* ── Screen & header ── */
  screen: {
    backgroundColor: Colors.bg,
  },
  header: {
    alignItems: "center",
    backgroundColor: Colors.bg,
    borderBottomColor: Colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: 12,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  headerBackBtn: {
    alignItems: "center",
    backgroundColor: Colors.bgCard,
    borderColor: Colors.border,
    borderRadius: 25,
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  headerTitle: {
    color: Colors.textPrimary,
    fontFamily: FontFamily.bold,
    fontSize: FontSize.lg,
  },
  headerSaveBtn: {
    alignItems: "center",
    backgroundColor: Colors.primary,
    borderRadius: 26,
    height: 44,
    justifyContent: "center",
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 12,
    width: 44,
    elevation: 6,
  },
  saveBtnDisabled: {
    opacity: 0.72,
  },

  /* ── Scroll ── */
  scrollContent: {
    paddingTop: 4,
  },

  /* ── Hero card ── */
  heroCard: {
    alignItems: "center",
    backgroundColor: Colors.bgCard,
    borderColor: Colors.border,
    borderRadius: 28,
    borderWidth: 1,
    marginHorizontal: 16,
    marginTop: 10,
    overflow: "hidden",
    paddingBottom: 24,
  },
  heroEyebrow: {
    alignItems: "center",
    alignSelf: "center",
    flexDirection: "row",
    gap: 6,
    paddingTop: 22,
  },
  heroEyebrowText: {
    color: Colors.textSecondary,
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 1.4,
  },
  avatarContainer: {
    marginTop: 20,
    position: "relative",
  },
  avatarRing: {
    alignItems: "center",
    borderRadius: 999,
    height: 124,
    justifyContent: "center",
    padding: 3,
    width: 124,
  },
  avatarInner: {
    backgroundColor: Colors.bg,
    borderRadius: 999,
    height: "100%",
    overflow: "hidden",
    padding: 3,
    width: "100%",
  },
  avatarImage: {
    borderRadius: 999,
    height: "100%",
    width: "100%",
  },
  avatarPlaceholder: {
    alignItems: "center",
    borderRadius: 999,
    height: "100%",
    justifyContent: "center",
    width: "100%",
  },
  initialsText: {
    color: Colors.textPrimary,
    fontFamily: FontFamily.bold,
    fontSize: 32,
  },
  avatarBadge: {
    alignItems: "center",
    backgroundColor: Colors.primary,
    borderColor: Colors.bg,
    borderRadius: 16,
    borderWidth: 2.5,
    bottom: 2,
    height: 32,
    justifyContent: "center",
    position: "absolute",
    right: 2,
    width: 32,
    zIndex: 1,
  },
  heroName: {
    color: Colors.textPrimary,
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xl,
    marginTop: 14,
    textAlign: "center",
  },
  heroBio: {
    color: Colors.textSecondary,
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    lineHeight: 19,
    marginTop: 4,
    paddingHorizontal: 32,
    textAlign: "center",
  },

  /* ── Integrated completion bar ── */
  heroCompletion: {
    marginTop: 20,
    paddingHorizontal: 24,
    width: "100%",
  },
  heroCompletionRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  heroCompletionLabelWrap: {
    alignItems: "center",
    flexDirection: "row",
    gap: 5,
  },
  heroCompletionLabel: {
    color: Colors.textPrimary,
    fontFamily: FontFamily.bold,
    fontSize: FontSize.sm,
  },
  heroCompletionHint: {
    color: Colors.textMuted,
    flex: 1,
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    textAlign: "right",
  },
  heroCompletionTrack: {
    backgroundColor: Colors.bgElevated,
    borderRadius: 999,
    height: 6,
    overflow: "hidden",
    width: "100%",
  },
  heroCompletionFill: {
    borderRadius: 999,
    height: "100%",
  },
  heroUploadText: {
    color: Colors.textSecondary,
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    marginTop: 6,
  },

  /* ── Section title ── */
  sectionTitle: {
    color: Colors.textSecondary,
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xs,
    letterSpacing: 1,
    marginBottom: 10,
    marginHorizontal: 22,
    marginTop: 28,
    textTransform: "uppercase",
  },

  /* ── Section card ── */
  sectionCard: {
    backgroundColor: Colors.bgCard,
    borderColor: Colors.border,
    borderRadius: 24,
    borderWidth: 1,
    marginHorizontal: 16,
    overflow: "hidden",
  },

  /* ── Setting row (inset-divider layout) ── */
  settingRow: {
    alignItems: "center",
    flexDirection: "row",
    paddingLeft: 14,
    paddingVertical: 4,
  },
  rowIconBox: {
    alignItems: "center",
    backgroundColor: Colors.bgElevated,
    borderRadius: 18,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  rowContent: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    minHeight: 72,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  rowDivider: {
    borderBottomColor: Colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowCopy: {
    flex: 1,
    paddingRight: 8,
  },
  rowTitle: {
    color: Colors.textPrimary,
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.base,
  },
  rowValue: {
    color: Colors.textSecondary,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    marginTop: 2,
  },

  /* ── Bottom bar ── */
  bottomBar: {
    backgroundColor: `${Colors.bgCard}F2`,
    borderTopColor: Colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    elevation: 18,
    paddingBottom: 12,
    paddingHorizontal: 20,
    paddingTop: 12,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.1,
    shadowRadius: 18,
  },
  saveButton: {
    borderRadius: 22,
    elevation: 10,
    flex: 1,
    height: 54,
    overflow: "hidden",
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
  },
  saveButtonGradient: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  saveButtonText: {
    color: Colors.textInverse,
    fontFamily: FontFamily.bold,
    fontSize: FontSize.sm,
  },

  /* ── Shared sheet primitives ── */
  sheetBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheetDimLayer: {
    backgroundColor: "rgba(0,0,0,0.62)",
    flex: 1,
  },
  sheetHandle: {
    alignSelf: "center",
    backgroundColor: Colors.primaryLight,
    borderRadius: 3,
    height: 5,
    marginBottom: 16,
    opacity: 0.35,
    width: 48,
  },

  /* ── Photo sheet ── */
  photoSheet: {
    backgroundColor: Colors.bgCard,
    borderColor: Colors.border,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  photoSheetHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    marginBottom: 18,
  },
  photoSheetIconWrap: {
    alignItems: "center",
    backgroundColor: Colors.bgElevated,
    borderRadius: 18,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  photoSheetCopy: {
    flex: 1,
  },
  photoSheetTitle: {
    color: Colors.textPrimary,
    fontFamily: FontFamily.bold,
    fontSize: FontSize.md,
  },
  photoSheetSubtitle: {
    color: Colors.textSecondary,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    lineHeight: 18,
    marginTop: 2,
  },
  photoSheetAction: {
    alignItems: "center",
    backgroundColor: Colors.bgElevated,
    borderColor: Colors.border,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    marginBottom: 0,
    minHeight: 58,
    paddingHorizontal: 14,
  },
  photoSheetActionIcon: {
    alignItems: "center",
    backgroundColor: Colors.bgCard,
    borderRadius: 14,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  photoSheetDangerAction: {
    backgroundColor: `${Colors.error}0D`,
    borderColor: `${Colors.error}2E`,
    marginTop: 10,
  },
  photoSheetDangerIcon: {
    backgroundColor: `${Colors.error}14`,
  },
  photoSheetActionText: {
    color: Colors.textPrimary,
    flex: 1,
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.base,
  },
  photoSheetDangerText: {
    color: Colors.error,
  },
  photoSheetCancel: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
    marginTop: 8,
  },
  photoSheetCancelText: {
    color: Colors.textSecondary,
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.base,
  },

  /* ── Edit drawer ── */
  drawerBackdrop: {
    backgroundColor: "rgba(0,0,0,0.56)",
    flex: 1,
  },
  drawer: {
    backgroundColor: Colors.bgCard,
    borderColor: Colors.border,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderWidth: 1,
    bottom: 0,
    elevation: 20,
    left: 0,
    maxHeight: "76%",
    paddingTop: 10,
    position: "absolute",
    right: 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.1,
    shadowRadius: 18,
  },
  drawerHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  drawerCloseBtn: {
    alignItems: "center",
    backgroundColor: Colors.bgElevated,
    borderColor: Colors.border,
    borderRadius: 14,
    borderWidth: 1,
    height: 40,
    justifyContent: "center",
    marginTop: 2,
    width: 40,
  },
  drawerTitleWrap: {
    flex: 1,
    paddingTop: 2,
  },
  drawerTitleText: {
    color: Colors.textPrimary,
    fontFamily: FontFamily.bold,
    fontSize: FontSize.md,
  },
  drawerSubtitle: {
    color: Colors.textMuted,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  doneButton: {
    alignItems: "center",
    backgroundColor: Colors.primary,
    borderRadius: 14,
    height: 40,
    justifyContent: "center",
    marginTop: 2,
    minWidth: 64,
    paddingHorizontal: 16,
  },
  doneButtonText: {
    color: Colors.textInverse,
    fontFamily: FontFamily.bold,
    fontSize: FontSize.sm,
  },
  drawerScrollContent: {
    paddingBottom: 40,
    paddingHorizontal: 20,
    paddingTop: 4,
  },

  /* ── Profile input ── */
  profileInput: {
    backgroundColor: Colors.bgInput,
    borderColor: Colors.border,
    borderRadius: 22,
    borderWidth: 1,
    color: Colors.textPrimary,
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.base,
    height: 58,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  profileInputMultiline: {
    height: undefined,
    minHeight: 140,
    textAlignVertical: "top",
  },

  /* ── Chip grid (pill-shaped) ── */
  chipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  chip: {
    alignItems: "center",
    backgroundColor: Colors.bgCard,
    borderColor: Colors.border,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "center",
    minHeight: 46,
    paddingHorizontal: 20,
  },
  chipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipCheckIcon: {
    marginRight: 6,
  },
  chipText: {
    color: Colors.textSecondary,
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
  },
  chipTextActive: {
    color: Colors.textInverse,
  },

  /* ── List selector (radio-dot) ── */
  /* Age range dragger */
  ageRangeCard: {
    backgroundColor: Colors.bgCard,
    borderColor: Colors.border,
    borderRadius: 24,
    borderWidth: 1,
    padding: 18,
  },
  ageRangeHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    marginBottom: 28,
  },
  ageRangeValuePill: {
    alignItems: "center",
    backgroundColor: Colors.bgElevated,
    borderColor: Colors.border,
    borderRadius: 18,
    borderWidth: 1,
    minWidth: 68,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  ageRangeLabel: {
    color: Colors.textMuted,
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.xs,
    textTransform: "uppercase",
  },
  ageRangeValue: {
    color: Colors.textPrimary,
    fontFamily: FontFamily.bold,
    fontSize: FontSize.lg,
    marginTop: 1,
  },
  ageRangeCenterCopy: {
    alignItems: "center",
    flex: 1,
  },
  ageRangeTitle: {
    color: Colors.textPrimary,
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xl,
  },
  ageRangeSubtitle: {
    color: Colors.textSecondary,
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    marginTop: 2,
    textAlign: "center",
  },
  ageRangeTrackWrap: {
    height: 44,
    justifyContent: "center",
    marginHorizontal: 12,
  },
  ageRangeTrack: {
    backgroundColor: Colors.bgElevated,
    borderRadius: 999,
    height: 8,
    width: "100%",
  },
  ageRangeFill: {
    borderRadius: 999,
    height: 8,
    position: "absolute",
  },
  ageRangeThumb: {
    alignItems: "center",
    backgroundColor: Colors.primary,
    borderColor: Colors.bgCard,
    borderRadius: 16,
    borderWidth: 3,
    elevation: 8,
    height: 32,
    justifyContent: "center",
    position: "absolute",
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    width: 32,
  },
  ageRangeBoundsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: 12,
    marginTop: 2,
  },
  ageRangeBoundText: {
    color: Colors.textMuted,
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.xs,
  },

  selectorList: {
    gap: 10,
  },
  selectorRow: {
    alignItems: "center",
    backgroundColor: Colors.bgCard,
    borderColor: Colors.border,
    borderLeftWidth: 3,
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 58,
    paddingHorizontal: 18,
  },
  selectorRowActive: {
    backgroundColor: Colors.bgElevated,
    borderColor: Colors.primary,
    borderLeftColor: Colors.primary,
    borderLeftWidth: 3,
  },
  selectorText: {
    color: Colors.textSecondary,
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.base,
  },
  selectorTextActive: {
    color: Colors.textPrimary,
    fontFamily: FontFamily.bold,
  },
  radioOuter: {
    alignItems: "center",
    borderColor: Colors.border,
    borderRadius: 11,
    borderWidth: 2,
    height: 22,
    justifyContent: "center",
    width: 22,
  },
  radioOuterActive: {
    borderColor: Colors.primary,
  },
  radioInner: {
    backgroundColor: Colors.primary,
    borderRadius: 6,
    height: 12,
    width: 12,
  },
});
