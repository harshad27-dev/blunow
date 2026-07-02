import React, { useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { Toast } from "@/components/common/Toast";
import { Colors } from "@/constants/colors";
import { useUpdateProfileMutation } from "@/hooks/queries";
import { postService } from "@/services/post.service";
import { useAuthStore } from "@/store/authStore";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

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
const MIN_AGE_OPTIONS = ["18", "21", "24", "27", "30", "35"];
const MAX_AGE_OPTIONS = ["25", "30", "35", "40", "50", "60"];
const DISTANCE_OPTIONS = ["10", "25", "50", "100", "250", "500"];

type SheetField =
  | "username"
  | "bio"
  | "gender"
  | "interestedIn"
  | "interests"
  | "lookingFor"
  | "relationship"
  | "minAge"
  | "maxAge"
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
  const [toast, setToast] = useState<{
    visible: boolean;
    message: string;
    type: "success" | "error" | "info";
  }>({ visible: false, message: "", type: "info" });

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
        key: "minAge",
        title: "Minimum Age",
        value: minAge,
        icon: "remove-circle-outline",
      },
      {
        key: "maxAge",
        title: "Maximum Age",
        value: maxAge,
        icon: "add-circle-outline",
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
    const hasPhoto = Boolean(avatarUri);
    Alert.alert("Avatar photo", undefined, [
      {
        text: hasPhoto ? "Change photo" : "Add photo",
        onPress: pickPhoto,
      },
      ...(hasPhoto
        ? [
            {
              text: "Remove photo",
              style: "destructive" as const,
              onPress: () => {
                setAvatarUri(null);
              },
            },
          ]
        : []),
      { text: "Cancel", style: "cancel" },
    ]);
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

      setToast({
        visible: true,
        message: "Profile updated successfully",
        type: "success",
      });
    } catch (error: unknown) {
      setToast({
        visible: true,
        message:
          error instanceof Error ? error.message : "Failed to update profile",
        type: "error",
      });
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
      <StatusBar style="dark" backgroundColor={Colors.bg} />
      {/* Header Banner */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerIcon}
          onPress={() => router.back()}
          activeOpacity={0.78}
        >
          <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <Text style={styles.headerTitle}>Edit profile</Text>
        </View>
        <View style={styles.headerProgressPill}>
          <Text style={styles.headerProgressText}>{completion}%</Text>
        </View>
      </View>
      <ScrollView
        className="flex-1"
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile photo */}
        <LinearGradient colors={Colors.gradientCard} style={styles.mediaPanel}>
          <View style={styles.heroEyebrow}>
            <Ionicons name="sparkles" size={14} color={Colors.textSecondary} />
            <Text style={styles.heroEyebrowText}>YOUR FIRST IMPRESSION</Text>
          </View>
          <View style={styles.profileStrip}>
            {/* Double Border Avatar ring */}
            <TouchableOpacity
              style={styles.avatarButton}
              onPress={openPhotoActions}
              activeOpacity={0.88}
            >
              <View style={styles.avatarInnerBorder}>
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
              <View style={styles.avatarEditBadge}>
                <Ionicons name="camera" size={15} color={Colors.textInverse} />
              </View>
            </TouchableOpacity>

            <View style={styles.profileCopy}>
              <Text style={styles.profileName} numberOfLines={1}>
                {username || "Your profile"}
              </Text>
              <Text style={styles.profileMeta} numberOfLines={2}>
                {bio ||
                  "Add a short bio so people know what kind of connection you are here for."}
              </Text>
            </View>
          </View>
        </LinearGradient>
        `r`n`r`n {/* Profile Completion Indicator */}
        <CompletionPanel
          completion={completion}
          isUploading={isUploading}
          uploadProgress={uploadProgress}
        />
        {/* Form fields sections */}
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
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[
            styles.saveButton,
            (isUploading || updateProfileMutation.isPending) &&
              styles.saveButtonDisabled,
          ]}
          onPress={saveProfile}
          disabled={isUploading || updateProfileMutation.isPending}
          activeOpacity={0.84}
          accessibilityRole="button"
          accessibilityLabel="Save profile changes"
        >
          {isUploading || updateProfileMutation.isPending ? (
            <ActivityIndicator size="small" color={Colors.textInverse} />
          ) : (
            <Text style={styles.saveButtonText}>Save changes</Text>
          )}
        </TouchableOpacity>
      </View>
      `r`n {/* Premium Custom Animated Bottom Sheet */}
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
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={() => setToast({ ...toast, visible: false })}
      />
    </SafeAreaView>
  );
}

// â”€â”€â”€ Sub-components â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const SectionTitle = ({ title }: { title: string }) => (
  <Text style={styles.sectionTitle}>{title}</Text>
);

const CompletionPanel = ({
  completion,
  isUploading,
  uploadProgress,
}: {
  completion: number;
  isUploading: boolean;
  uploadProgress: number;
}) => (
  <View style={styles.completionCard}>
    <View style={styles.completionIcon}>
      <Ionicons name="sparkles" size={24} color={Colors.primaryLight} />
    </View>
    <View style={styles.completionCopy}>
      <View style={styles.completionRow}>
        <Text style={styles.completionTitle}>{completion}% completed</Text>
        <Text style={styles.completionHint} numberOfLines={1}>
          {getCompletionHint(completion)}
        </Text>
      </View>
      <View style={styles.completionTrack}>
        <View style={[styles.completionFill, { width: `${completion}%` }]} />
      </View>
      {isUploading ? (
        <Text style={styles.uploadText}>
          Uploading photos... {uploadProgress}%
        </Text>
      ) : null}
    </View>
  </View>
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
    style={[styles.settingRow, !isLast && styles.rowBorder]}
    onPress={onPress}
    activeOpacity={0.78}
  >
    <View style={styles.rowIconBox}>
      <Ionicons name={item.icon} size={18} color={Colors.textSecondary} />
    </View>
    <View style={styles.rowCopy}>
      <Text style={styles.rowTitle}>{item.title}</Text>
      <Text style={styles.rowValue} numberOfLines={1}>
        {item.value}
      </Text>
    </View>
    <View style={styles.rowChevron}>
      <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
    </View>
  </TouchableOpacity>
);

// â”€â”€â”€ Premium Custom Animated Edit Sheet Drawer â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(
    new Animated.Value(SCREEN_HEIGHT * 0.76),
  ).current;

  // Sync animation triggers with activeSheet state changes
  React.useEffect(() => {
    if (activeSheet) {
      setMounted(true);
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 260,
          useNativeDriver: true,
        }),
        Animated.spring(sheetTranslateY, {
          toValue: 0,
          tension: 65,
          friction: 10,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(sheetTranslateY, {
          toValue: SCREEN_HEIGHT * 0.76,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setMounted(false);
      });
    }
  }, [activeSheet, backdropOpacity, sheetTranslateY]);

  if (!mounted) return null;

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(sheetTranslateY, {
        toValue: SCREEN_HEIGHT * 0.76,
        duration: 220,
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
          <Pressable style={styles.drawerBackdrop} onPress={handleDismiss} />
        </Animated.View>

        {/* Animated content sheet drawer */}
        <Animated.View
          style={[
            styles.drawer,
            { transform: [{ translateY: sheetTranslateY }] },
          ]}
        >
          <View style={styles.drawerHandle} />

          <View style={styles.drawerHeader}>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={handleDismiss}
              activeOpacity={0.82}
            >
              <Ionicons name="close" size={20} color={Colors.textPrimary} />
            </TouchableOpacity>

            <Text style={styles.drawerTitleText}>
              {getSheetTitle(activeSheet)}
            </Text>

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
            {activeSheet === "minAge" && (
              <ListSelector
                options={MIN_AGE_OPTIONS}
                selected={values.minAge}
                onSelect={setters.setMinAge}
              />
            )}
            {activeSheet === "maxAge" && (
              <ListSelector
                options={MAX_AGE_OPTIONS}
                selected={values.maxAge}
                onSelect={setters.setMaxAge}
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
      `r`n{" "}
    </Modal>
  );
};

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
    className={`rounded-[22px] border px-5 py-4 text-base font-semibold ${
      multiline ? "min-h-[140px]" : "h-[58px]"
    }`}
    style={styles.profileInput}
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
          style={[styles.chipButton, active && styles.chipButtonActive]}
          onPress={() => onToggle(option)}
          activeOpacity={0.78}
        >
          <Text style={[styles.chipText, active && styles.chipTextActive]}>
            {option}
          </Text>
        </TouchableOpacity>
      );
    })}
  </View>
);

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
          style={[styles.selectorButton, active && styles.selectorButtonActive]}
          onPress={() => onSelect(option)}
          activeOpacity={0.78}
        >
          <Text
            style={[styles.selectorText, active && styles.selectorTextActive]}
          >
            {formatLabel(option)}
          </Text>
          {active ? (
            <Ionicons
              name="checkmark-circle"
              size={21}
              color={Colors.primary}
            />
          ) : null}
        </TouchableOpacity>
      );
    })}
  </View>
);

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
    case "minAge":
      return "Minimum Age";
    case "maxAge":
      return "Maximum Age";
    case "maxDistance":
      return "Max Distance";
    case "zodiac":
      return "Zodiac";
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
    ? "Looking sharp"
    : "Add avatar, bio, interests, location, looking for";

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

// â”€â”€â”€ Styles â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const styles = StyleSheet.create({
  headerProgressPill: {
    alignItems: "center",
    backgroundColor: Colors.bgElevated,
    borderRadius: 999,
    height: 36,
    justifyContent: "center",
    minWidth: 58,
    paddingHorizontal: 12,
  },
  headerProgressText: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: "900",
  },
  heroEyebrow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 7,
    paddingHorizontal: 22,
    paddingTop: 20,
  },
  heroEyebrowText: {
    color: Colors.textSecondary,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.3,
  },
  bottomBar: {
    backgroundColor: Colors.bgCard,
    borderTopColor: Colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 20,
    paddingBottom: 12,
    paddingTop: 12,
  },
  screen: {
    backgroundColor: Colors.bg,
  },
  header: {
    alignItems: "center",
    backgroundColor: Colors.bg,
    borderBottomColor: Colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 12,
    paddingBottom: 12,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  headerIcon: {
    alignItems: "center",
    backgroundColor: Colors.bgCard,
    borderColor: Colors.border,
    borderRadius: 16,
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  headerCopy: {
    flex: 1,
  },
  headerTitle: {
    color: Colors.textPrimary,
    fontSize: 20,
    fontWeight: "800",
  },
  headerSubtitle: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
  saveButton: {
    alignItems: "center",
    backgroundColor: Colors.primary,
    borderRadius: 16,
    flexDirection: "row",
    gap: 6,
    height: 44,
    justifyContent: "center",
    flex: 1,
    paddingHorizontal: 20,
  },
  saveButtonDisabled: {
    opacity: 0.72,
  },
  saveButtonText: {
    color: Colors.textInverse,
    fontSize: 14,
    fontWeight: "900",
  },
  content: {
    paddingBottom: 32,
  },
  mediaPanel: {
    backgroundColor: Colors.bgCard,
    borderColor: Colors.border,
    borderRadius: 28,
    borderWidth: 1,
    marginHorizontal: 16,
    marginTop: 8,
    overflow: "hidden",
  },
  profileStrip: {
    alignItems: "flex-start",
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingBottom: 24,
    paddingTop: 14,
  },
  avatarButton: {
    backgroundColor: Colors.bg,
    borderColor: Colors.primaryLight,
    borderRadius: 30,
    borderWidth: 2,
    height: 104,
    marginTop: 0,
    padding: 3,
    width: 104,
    position: "relative",
    zIndex: 10,
  },
  avatarInnerBorder: {
    flex: 1,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: Colors.bg,
    overflow: "hidden",
  },
  avatarImage: {
    height: "100%",
    width: "100%",
  },
  avatarPlaceholder: {
    alignItems: "center",
    height: "100%",
    justifyContent: "center",
    width: "100%",
  },
  initialsText: {
    color: Colors.textPrimary,
    fontSize: 30,
    fontWeight: "900",
  },
  avatarEditBadge: {
    alignItems: "center",
    backgroundColor: Colors.primary,
    borderColor: Colors.bg,
    borderRadius: 15,
    borderWidth: 2,
    bottom: -2,
    right: -2,
    height: 30,
    width: 30,
    justifyContent: "center",
    position: "absolute",
    zIndex: 11,
  },
  profileCopy: {
    flex: 1,
    paddingBottom: 14,
    paddingLeft: 14,
    paddingTop: 12,
  },
  profileName: {
    color: Colors.textPrimary,
    fontSize: 24,
    fontWeight: "900",
  },
  profileMeta: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
    marginTop: 4,
  },
  quickStats: {
    flexDirection: "row",
    gap: 10,
    marginHorizontal: 20,
    marginTop: 14,
  },
  quickStatCard: {
    backgroundColor: Colors.bgCard,
    borderColor: Colors.border,
    borderRadius: 22,
    borderWidth: 1,
    flex: 1,
    minHeight: 106,
    padding: 12,
  },
  quickStatIcon: {
    alignItems: "center",
    backgroundColor: Colors.bgElevated,
    borderRadius: 14,
    height: 34,
    justifyContent: "center",
    marginBottom: 10,
    width: 34,
  },
  quickStatValue: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: "900",
  },
  quickStatLabel: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: "700",
    marginTop: 2,
    textTransform: "uppercase",
  },
  completionCard: {
    alignItems: "center",
    backgroundColor: Colors.bgCard,
    borderColor: Colors.border,
    borderRadius: 24,
    borderWidth: 1,
    flexDirection: "row",
    marginHorizontal: 20,
    marginTop: 14,
    padding: 16,
  },
  completionIcon: {
    alignItems: "center",
    backgroundColor: Colors.bgElevated,
    borderRadius: 18,
    height: 48,
    justifyContent: "center",
    marginRight: 14,
    width: 48,
  },
  completionCopy: {
    flex: 1,
  },
  completionRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  completionTitle: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: "800",
  },
  completionHint: {
    color: Colors.textSecondary,
    flex: 1,
    fontSize: 12,
    fontWeight: "700",
    textAlign: "right",
  },
  completionTrack: {
    backgroundColor: Colors.bgElevated,
    borderRadius: 999,
    height: 8,
    marginTop: 10,
    overflow: "hidden",
  },
  completionFill: {
    backgroundColor: Colors.primaryLight,
    borderRadius: 999,
    height: "100%",
  },
  uploadText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 8,
  },
  sectionTitle: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1,
    marginBottom: 10,
    marginHorizontal: 22,
    marginTop: 26,
    textTransform: "uppercase",
  },
  sectionCard: {
    backgroundColor: Colors.bgCard,
    borderColor: Colors.border,
    borderRadius: 24,
    borderWidth: 1,
    marginHorizontal: 20,
    overflow: "hidden",
  },
  settingRow: {
    alignItems: "center",
    flexDirection: "row",
    minHeight: 74,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  rowBorder: {
    borderBottomColor: Colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowIconBox: {
    alignItems: "center",
    backgroundColor: Colors.bgElevated,
    borderRadius: 16,
    height: 42,
    justifyContent: "center",
    marginRight: 14,
    width: 42,
  },
  rowCopy: {
    flex: 1,
    paddingRight: 12,
  },
  rowTitle: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: "800",
  },
  rowValue: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: "600",
    marginTop: 3,
  },
  rowChevron: {
    alignItems: "center",
    backgroundColor: Colors.bgElevated,
    borderRadius: 13,
    height: 30,
    justifyContent: "center",
    width: 30,
  },
  // Animated Sheet drawer styles
  drawerBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.56)",
  },
  drawer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: "76%",
    backgroundColor: Colors.bgCard,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.1,
    shadowRadius: 18,
    elevation: 20,
    paddingTop: 8,
  },
  drawerHandle: {
    alignSelf: "center",
    width: 40,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: Colors.border,
    marginBottom: 16,
  },
  drawerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.bgElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  drawerTitleText: {
    flex: 1,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "800",
    color: Colors.textPrimary,
  },
  doneButton: {
    minWidth: 62,
    height: 40,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  doneButtonText: {
    fontSize: 13,
    fontWeight: "800",
    color: Colors.textInverse,
  },
  drawerScrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 4,
  },
  profileInput: {
    backgroundColor: Colors.bgInput,
    borderColor: Colors.border,
    color: Colors.textPrimary,
  },
  chipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  chipButton: {
    backgroundColor: Colors.bgCard,
    borderColor: Colors.border,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 16,
  },
  chipButtonActive: {
    backgroundColor: Colors.bgElevated,
    borderColor: Colors.primary,
  },
  chipText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: "700",
  },
  chipTextActive: {
    color: Colors.textPrimary,
  },
  selectorList: {
    gap: 10,
  },
  selectorButton: {
    alignItems: "center",
    backgroundColor: Colors.bgCard,
    borderColor: Colors.border,
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 58,
    paddingHorizontal: 16,
  },
  selectorButtonActive: {
    backgroundColor: Colors.bgElevated,
    borderColor: Colors.primary,
  },
  selectorText: {
    color: Colors.textSecondary,
    fontSize: 15,
    fontWeight: "700",
  },
  selectorTextActive: {
    color: Colors.textPrimary,
  },
});
