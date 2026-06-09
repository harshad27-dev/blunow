import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
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
  const [coverUri, setCoverUri] = useState<string | null>(
    profile?.bannerUrl || null,
  );
  const [coverMimeType, setCoverMimeType] = useState<string | null>(null);
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
        bannerUrl: coverUri,
        bio,
        interests,
        location: profile?.location,
        lookingFor,
      }),
    [avatarUri, bio, coverUri, interests, lookingFor, profile?.location],
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

  const pickPhoto = async (type: "avatar" | "cover") => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: type === "avatar" ? [1, 1] : [16, 9],
      quality: 0.82,
    });

    if (result.canceled) return;

    const asset = result.assets[0];
    const compressedUri = await compressImage(asset.uri, type);
    if (type === "avatar") {
      setAvatarUri(compressedUri);
      setAvatarMimeType(asset.mimeType || "image/jpeg");
      return;
    }

    setCoverUri(compressedUri);
    setCoverMimeType(asset.mimeType || "image/jpeg");
  };

  const openPhotoActions = (type: "avatar" | "cover") => {
    const hasPhoto = type === "avatar" ? Boolean(avatarUri) : Boolean(coverUri);
    const label = type === "avatar" ? "avatar" : "banner";

    Alert.alert(`${formatOption(label)} photo`, undefined, [
      { text: hasPhoto ? "Change photo" : "Add photo", onPress: () => pickPhoto(type) },
      ...(hasPhoto
        ? [
            {
              text: "Remove photo",
              style: "destructive" as const,
              onPress: () => {
                if (type === "avatar") setAvatarUri(null);
                else setCoverUri(null);
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
      let finalAvatarUrl: string | null | undefined = avatarUri ? profile?.avatarUrl : null;
      let finalCoverUrl: string | null | undefined = coverUri ? profile?.bannerUrl : null;
      const uploadTasks = [
        avatarUri && avatarUri !== profile?.avatarUrl ? "avatar" : null,
        coverUri && coverUri !== profile?.bannerUrl ? "cover" : null,
      ].filter(Boolean);
      const progressStep = uploadTasks.length ? 100 / uploadTasks.length : 100;
      let completedUploads = 0;

      if (avatarUri && avatarUri !== profile?.avatarUrl) {
        finalAvatarUrl = await postService.uploadMedia(
          avatarUri,
          avatarMimeType || "image/jpeg",
          (progress) =>
            setUploadProgress(
              Math.round(completedUploads * progressStep + progress * (progressStep / 100)),
            ),
        );
        completedUploads += 1;
      }

      if (coverUri && coverUri !== profile?.bannerUrl) {
        finalCoverUrl = await postService.uploadMedia(
          coverUri,
          coverMimeType || "image/jpeg",
          (progress) =>
            setUploadProgress(
              Math.round(completedUploads * progressStep + progress * (progressStep / 100)),
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
        bannerUrl: finalCoverUrl ?? null,
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
    <SafeAreaView className="flex-1" style={styles.screen}>
      <StatusBar style="dark" backgroundColor={Colors.bg} />
      <LinearGradient
        colors={Colors.gradientBg}
        style={styles.fill}
      >
        <View className="flex-row items-center justify-between px-5 pb-5 pt-2">
          <TouchableOpacity
            className="h-11 w-11 items-center justify-center rounded-2xl border"
            style={styles.iconButton}
            onPress={() => router.back()}
            activeOpacity={0.78}
          >
            <Ionicons name="chevron-back" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>

          <View className="items-center">
            <Text className="text-[22px] font-extrabold" style={styles.titleText}>
              Edit profile
            </Text>
            <View className="mt-2 flex-row items-center rounded-full border p-1" style={styles.segment}>
              <View className="rounded-full px-3 py-1" style={styles.segmentActive}>
                <Text className="text-xs font-extrabold" style={styles.primaryButtonText}>
                  Edit
                </Text>
              </View>
              <Text className="px-3 text-xs font-semibold" style={styles.mutedText}>
                Preview
              </Text>
            </View>
          </View>

          <TouchableOpacity
            className="h-11 min-w-[68px] items-center justify-center rounded-2xl px-4"
            style={styles.primaryButton}
            onPress={saveProfile}
            disabled={isUploading || updateProfileMutation.isPending}
            activeOpacity={0.78}
          >
            {isUploading || updateProfileMutation.isPending ? (
              <ActivityIndicator size="small" color={Colors.textInverse} />
            ) : (
              <Text className="text-sm font-extrabold" style={styles.primaryButtonText}>
                Done
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerClassName="px-5 pb-10"
          showsVerticalScrollIndicator={false}
        >
          <View className="overflow-hidden rounded-[30px] border shadow-2xl" style={styles.card}>
            <TouchableOpacity
              className="relative h-[178px]"
              style={styles.coverTouchable}
              onPress={() => openPhotoActions("cover")}
              activeOpacity={0.88}
            >
              {coverUri ? (
                <Image source={{ uri: coverUri }} className="h-full w-full" />
              ) : (
                <LinearGradient
                  colors={Colors.gradientPrimary}
                  style={styles.coverPlaceholder}
                />
              )}
              <LinearGradient
                colors={[Colors.transparent, Colors.primary + "B8"]}
                style={StyleSheet.absoluteFillObject}
              />
              <View className="absolute bottom-4 right-4 h-11 w-11 items-center justify-center rounded-2xl border" style={styles.photoButton}>
                <Ionicons name={coverUri ? "ellipsis-horizontal" : "camera-outline"} size={18} color={Colors.textInverse} />
              </View>
            </TouchableOpacity>

            <View className="px-5 pb-6">
              <TouchableOpacity
                className="-mt-12 h-24 w-24 rounded-[28px] border-2 p-1"
                style={styles.avatarButton}
                onPress={() => openPhotoActions("avatar")}
                activeOpacity={0.88}
              >
                {avatarUri ? (
                  <Image
                    source={{ uri: avatarUri }}
                    className="h-full w-full rounded-[26px]"
                  />
                ) : (
                  <LinearGradient
                    colors={Colors.gradientCard}
                    style={styles.avatarPlaceholder}
                  >
                    <Ionicons name="person" size={42} color={Colors.textMuted} />
                  </LinearGradient>
                )}
                <View className="absolute -bottom-1 -right-1 h-8 w-8 items-center justify-center rounded-2xl shadow-lg" style={styles.addBadge}>
                  <Ionicons name={avatarUri ? "ellipsis-horizontal" : "add"} size={18} color={Colors.textInverse} />
                </View>
              </TouchableOpacity>

              <View style={styles.completionCard}>
                <View style={styles.completionRow}>
                  <Text style={styles.completionTitle}>{completion}% complete</Text>
                  <Text style={styles.completionHint}>{getCompletionHint(completion)}</Text>
                </View>
                <View style={styles.completionTrack}>
                  <View
                    style={[
                      styles.completionFill,
                      { width: `${completion}%` },
                    ]}
                  />
                </View>
                {isUploading ? (
                  <Text style={styles.uploadText}>
                    Uploading photos... {uploadProgress}%
                  </Text>
                ) : null}
              </View>

              <Text className="mt-4 text-xl font-extrabold" style={styles.titleText}>
                {username || "Your profile"}
              </Text>
              <Text className="mt-1 text-sm font-medium leading-5" style={styles.bodyText}>
                Tune your profile details and dating preferences.
              </Text>
              <View className="mt-4 flex-row flex-wrap gap-2">
                <InfoPill
                  icon="sparkles-outline"
                  label={`${interests.length} interests`}
                />
                <InfoPill icon="navigate-outline" label={`${maxDistance} km`} />
                <InfoPill
                  icon="heart-outline"
                  label={lookingFor[0] || "New friends"}
                />
              </View>
            </View>
          </View>

          <SectionTitle title="Profile" />
          <View className="overflow-hidden rounded-[26px] border shadow-xl" style={styles.card}>
            {profileItems.map((item, index) => (
              <SettingRow
                key={item.key}
                item={item}
                isLast={index === profileItems.length - 1}
                onPress={() => setActiveSheet(item.key)}
              />
            ))}
          </View>

          <SectionTitle title="Dating Preferences" />
          <View className="overflow-hidden rounded-[26px] border shadow-xl" style={styles.card}>
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
      </LinearGradient>

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

const SectionTitle = ({ title }: { title: string }) => (
  <Text className="mb-3 ml-1 mt-7 text-sm font-extrabold uppercase tracking-wider" style={styles.sectionTitle}>
    {title}
  </Text>
);

const InfoPill = ({
  icon,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}) => (
  <View className="flex-row items-center rounded-full border px-3 py-2" style={styles.infoPill}>
    <Ionicons name={icon} size={14} color={Colors.primaryLight} />
    <Text className="ml-1.5 text-xs font-bold" style={styles.titleText}>{label}</Text>
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
    className="min-h-[78px] flex-row items-center gap-4 px-4"
    style={!isLast && styles.rowBorder}
    onPress={onPress}
    activeOpacity={0.78}
  >
    <View className="h-11 w-11 items-center justify-center rounded-[17px] border" style={styles.rowIconBox}>
      <Ionicons name={item.icon} size={20} color={Colors.primary} />
    </View>
    <View className="flex-1">
      <Text className="text-[15px] font-bold" style={styles.titleText}>{item.title}</Text>
      <Text
        className="mt-1 text-sm font-medium"
        style={styles.bodyText}
        numberOfLines={1}
      >
        {item.value}
      </Text>
    </View>
    <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
  </TouchableOpacity>
);

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
}) => (
  <Modal
    visible={!!activeSheet}
    transparent
    animationType="slide"
    onRequestClose={onClose}
  >
    <Pressable className="flex-1" style={styles.drawerBackdrop} onPress={onClose} />
    <View className="absolute bottom-0 left-0 right-0 max-h-[74%] rounded-t-[32px] border pt-3 shadow-2xl" style={styles.drawer}>
      <View className="mb-3 h-1.5 w-12 self-center rounded-full" style={styles.drawerHandle} />
      <View className="flex-row items-center justify-between px-5 pb-3">
        <TouchableOpacity
          className="h-10 w-10 items-center justify-center rounded-2xl border"
          style={styles.iconButton}
          onPress={onClose}
        >
          <Ionicons name="close" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text className="flex-1 text-center text-lg font-extrabold" style={styles.titleText}>
          {getSheetTitle(activeSheet)}
        </Text>
        <TouchableOpacity
          className="h-10 min-w-[62px] items-center justify-center rounded-2xl px-4"
          style={styles.primaryButton}
          onPress={onClose}
        >
          <Text className="text-sm font-extrabold" style={styles.primaryButtonText}>Done</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerClassName="px-5 pb-9 pt-2"
        showsVerticalScrollIndicator={false}
      >
        {activeSheet === "username" ? (
          <ProfileInput
            value={values.username}
            onChangeText={setters.setUsername}
            placeholder="username"
            autoCapitalize="none"
          />
        ) : null}
        {activeSheet === "bio" ? (
          <ProfileInput
            value={values.bio}
            onChangeText={setters.setBio}
            placeholder="Write something about yourself"
            multiline
          />
        ) : null}
        {activeSheet === "gender" ? (
          <ListSelector
            options={GENDER_OPTIONS}
            selected={values.gender}
            onSelect={setters.setGender}
            formatLabel={formatOption}
          />
        ) : null}
        {activeSheet === "interestedIn" ? (
          <ChipGrid
            options={INTERESTED_IN_OPTIONS}
            selected={values.interestedIn}
            onToggle={(value) =>
              setters.setInterestedIn(toggleValue(values.interestedIn, value))
            }
          />
        ) : null}
        {activeSheet === "interests" ? (
          <ChipGrid
            options={INTEREST_OPTIONS}
            selected={values.interests}
            onToggle={(value) =>
              setters.setInterests(toggleValue(values.interests, value))
            }
          />
        ) : null}
        {activeSheet === "lookingFor" ? (
          <ListSelector
            options={LOOKING_FOR_OPTIONS}
            selected={values.lookingFor[0]}
            onSelect={(value) => setters.setLookingFor([value])}
          />
        ) : null}
        {activeSheet === "relationship" ? (
          <ListSelector
            options={RELATIONSHIP_OPTIONS}
            selected={values.relationship}
            onSelect={setters.setRelationship}
          />
        ) : null}
        {activeSheet === "minAge" ? (
          <ListSelector
            options={MIN_AGE_OPTIONS}
            selected={values.minAge}
            onSelect={setters.setMinAge}
          />
        ) : null}
        {activeSheet === "maxAge" ? (
          <ListSelector
            options={MAX_AGE_OPTIONS}
            selected={values.maxAge}
            onSelect={setters.setMaxAge}
          />
        ) : null}
        {activeSheet === "maxDistance" ? (
          <ListSelector
            options={DISTANCE_OPTIONS}
            selected={values.maxDistance}
            onSelect={setters.setMaxDistance}
            formatLabel={(value) => `${value} km`}
          />
        ) : null}
        {activeSheet === "zodiac" ? (
          <ChipGrid
            options={ZODIAC_OPTIONS}
            selected={[values.zodiac]}
            onToggle={setters.setZodiac}
          />
        ) : null}
      </ScrollView>
    </View>
  </Modal>
);

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
            <Ionicons name="checkmark-circle" size={21} color={Colors.primary} />
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

const compressImage = async (uri: string, type: "avatar" | "cover") => {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: type === "avatar" ? { width: 900 } : { width: 1600 } }],
    {
      compress: type === "avatar" ? 0.78 : 0.72,
      format: ImageManipulator.SaveFormat.JPEG,
    },
  );

  return result.uri;
};

const getProfileCompletion = ({
  avatarUrl,
  bannerUrl,
  bio,
  interests,
  location,
  lookingFor,
}: {
  avatarUrl?: string | null;
  bannerUrl?: string | null;
  bio?: string | null;
  interests?: string[];
  location?: string | null;
  lookingFor?: string[];
}) => {
  const checks = [
    avatarUrl,
    bannerUrl,
    bio?.trim(),
    interests?.length ? "interests" : null,
    location,
    lookingFor?.length ? "lookingFor" : null,
  ];

  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
};

const getCompletionHint = (completion: number) =>
  completion >= 100 ? "Looking sharp" : "Add avatar, bio, interests, location, looking for";

const styles = StyleSheet.create({
  screen: {
    backgroundColor: Colors.bg,
  },
  titleText: {
    color: Colors.textPrimary,
  },
  bodyText: {
    color: Colors.textSecondary,
  },
  mutedText: {
    color: Colors.textMuted,
  },
  sectionTitle: {
    color: Colors.primaryLight,
  },
  iconButton: {
    backgroundColor: Colors.bgCard,
    borderColor: Colors.border,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
  },
  primaryButtonText: {
    color: Colors.textInverse,
  },
  segment: {
    backgroundColor: Colors.bgCard,
    borderColor: Colors.border,
  },
  segmentActive: {
    backgroundColor: Colors.primary,
  },
  card: {
    backgroundColor: Colors.bgCard,
    borderColor: Colors.border,
  },
  coverTouchable: {
    backgroundColor: Colors.bgElevated,
  },
  photoButton: {
    backgroundColor: Colors.primary + "BF",
    borderColor: Colors.textInverse + "26",
  },
  avatarButton: {
    backgroundColor: Colors.bg,
    borderColor: Colors.bgCard,
  },
  avatarPlaceholder: {
    alignItems: "center",
    borderRadius: 24,
    height: "100%",
    justifyContent: "center",
    width: "100%",
  },
  coverPlaceholder: {
    height: "100%",
    width: "100%",
  },
  fill: {
    flex: 1,
  },
  addBadge: {
    backgroundColor: Colors.primary,
  },
  infoPill: {
    backgroundColor: Colors.bgElevated,
    borderColor: Colors.border,
  },
  completionCard: {
    backgroundColor: Colors.bgElevated,
    borderColor: Colors.border,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 16,
    padding: 14,
  },
  completionFill: {
    backgroundColor: Colors.primary,
    borderRadius: 999,
    height: "100%",
  },
  completionHint: {
    color: Colors.textSecondary,
    flex: 1,
    fontSize: 12,
    fontWeight: "700",
    textAlign: "right",
  },
  completionRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  completionTitle: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: "800",
  },
  completionTrack: {
    backgroundColor: Colors.bgCard,
    borderRadius: 999,
    height: 8,
    marginTop: 10,
    overflow: "hidden",
  },
  uploadText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 8,
  },
  rowBorder: {
    borderBottomColor: Colors.border,
    borderBottomWidth: 1,
  },
  rowIconBox: {
    backgroundColor: Colors.bgElevated,
    borderColor: Colors.border,
  },
  drawerBackdrop: {
    backgroundColor: Colors.primary + "CC",
  },
  drawer: {
    backgroundColor: Colors.bgCard,
    borderColor: Colors.border,
  },
  drawerHandle: {
    backgroundColor: Colors.border,
  },
  profileInput: {
    backgroundColor: Colors.bgInput,
    borderColor: Colors.border,
    color: Colors.textPrimary,
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
    shadowColor: Colors.primary,
    shadowOffset: { height: 8, width: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
  },
  chipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  chipText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: "700",
  },
  chipTextActive: {
    color: Colors.textPrimary,
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
  selectorList: {
    gap: 10,
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
