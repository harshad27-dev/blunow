import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { Toast } from "@/components/common/Toast";
import { useUpdateProfileMutation } from "@/hooks/queries";
import { postService } from "@/services/post.service";
import { useAuthStore } from "@/store/authStore";

const PINK = "#FF2D6F";

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
  const { user } = useAuthStore();
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
    if (type === "avatar") {
      setAvatarUri(asset.uri);
      setAvatarMimeType(asset.mimeType || "image/jpeg");
      return;
    }

    setCoverUri(asset.uri);
    setCoverMimeType(asset.mimeType || "image/jpeg");
  };

  const saveProfile = async () => {
    try {
      setIsUploading(true);
      let finalAvatarUrl = profile?.avatarUrl;
      let finalCoverUrl = profile?.bannerUrl;

      if (avatarUri && avatarUri !== profile?.avatarUrl) {
        finalAvatarUrl = await postService.uploadMedia(
          avatarUri,
          avatarMimeType || "image/jpeg",
        );
      }

      if (coverUri && coverUri !== profile?.bannerUrl) {
        finalCoverUrl = await postService.uploadMedia(
          coverUri,
          coverMimeType || "image/jpeg",
        );
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
        avatarUrl: finalAvatarUrl || undefined,
        bannerUrl: finalCoverUrl || undefined,
      });

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
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-black">
      <StatusBar style="light" backgroundColor="#000000" />
      <View className="flex-1 bg-black">
        <View className="flex-row items-center justify-between px-5 pb-4 pt-2">
          <TouchableOpacity
            className="h-11 w-11 items-center justify-center rounded-full border border-[#FF2D6F]/25 bg-[#FF2D6F]/10"
            onPress={() => router.back()}
            activeOpacity={0.78}
          >
            <Ionicons name="chevron-back" size={25} color={PINK} />
          </TouchableOpacity>

          <View className="items-center">
            <Text className="text-2xl font-extrabold text-white">
              Edit profile
            </Text>
            <View className="mt-2 flex-row items-center">
              <Text className="text-sm font-bold text-[#FF2D6F]">Edit</Text>
              <View className="mx-4 h-4 w-px bg-white/15" />
              <Text className="text-sm font-semibold text-[#555B66]">
                Preview
              </Text>
            </View>
          </View>

          <TouchableOpacity
            className="h-10 min-w-[64px] items-center justify-center rounded-full border border-[#FF2D6F]/35 bg-[#FF2D6F]/15 px-4"
            onPress={saveProfile}
            disabled={isUploading || updateProfileMutation.isPending}
            activeOpacity={0.78}
          >
            {isUploading || updateProfileMutation.isPending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text className="text-sm font-extrabold text-[#FF2D6F]">
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
          <View className="mt-2 overflow-hidden rounded-[32px] border border-white/10 bg-[#0F1115] shadow-2xl">
            <TouchableOpacity
              className="relative h-[168px] bg-[#151821]"
              onPress={() => pickPhoto("cover")}
              activeOpacity={0.88}
            >
              {coverUri ? (
                <Image source={{ uri: coverUri }} className="h-full w-full" />
              ) : (
                <View className="h-full w-full bg-[#151821]" />
              )}
              <View className="absolute inset-0 bg-black/25" />
              <View className="absolute bottom-4 right-4 h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-black/60">
                <Ionicons name="camera-outline" size={17} color="#FFFFFF" />
              </View>
            </TouchableOpacity>

            <View className="px-5 pb-5">
              <TouchableOpacity
                className="-mt-12 h-24 w-24 rounded-[30px] border border-white/15 bg-black p-1"
                onPress={() => pickPhoto("avatar")}
                activeOpacity={0.88}
              >
                {avatarUri ? (
                  <Image
                    source={{ uri: avatarUri }}
                    className="h-full w-full rounded-[26px]"
                  />
                ) : (
                  <View className="h-full w-full items-center justify-center rounded-[26px] bg-[#151821]">
                    <Ionicons name="person" size={42} color="#555B66" />
                  </View>
                )}
                <View className="absolute -bottom-1 -right-1 h-8 w-8 items-center justify-center rounded-full bg-[#FF2D6F] shadow-lg">
                  <Ionicons name="add" size={18} color="#FFFFFF" />
                </View>
              </TouchableOpacity>

              <Text className="mt-4 text-xl font-extrabold text-white">
                {username || "Your profile"}
              </Text>
              <Text className="mt-1 text-sm font-medium leading-5 text-[#8F96A3]">
                Only saved profile fields are shown here.
              </Text>
            </View>
          </View>

          <SectionTitle title="Profile" />
          <View className="overflow-hidden rounded-[28px] border border-white/10 bg-[#0F1115] shadow-xl">
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
          <View className="overflow-hidden rounded-[28px] border border-white/10 bg-[#0F1115] shadow-xl">
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
      </View>

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
  <Text className="mb-3 ml-1 mt-7 text-lg font-extrabold text-white">
    {title}
  </Text>
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
    className={`min-h-[78px] flex-row items-center gap-4 px-4 active:bg-white/[0.03] ${
      isLast ? "" : "border-b border-white/[0.07]"
    }`}
    onPress={onPress}
    activeOpacity={0.78}
  >
    <View className="h-11 w-11 items-center justify-center rounded-[18px] border border-[#FF2D6F]/20 bg-[#FF2D6F]/15">
      <Ionicons name={item.icon} size={20} color={PINK} />
    </View>
    <View className="flex-1">
      <Text className="text-[15px] font-bold text-white">{item.title}</Text>
      <Text
        className="mt-1 text-sm font-medium text-[#8F96A3]"
        numberOfLines={1}
      >
        {item.value}
      </Text>
    </View>
    <Ionicons name="chevron-forward" size={20} color="#555B66" />
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
    <Pressable className="flex-1 bg-black/75" onPress={onClose} />
    <View className="absolute bottom-0 left-0 right-0 max-h-[72%] rounded-t-[34px] border border-white/15 bg-[#0F1115] pt-3 shadow-2xl">
      <View className="mb-3 h-1.5 w-12 self-center rounded-full bg-[#343945]" />
      <View className="flex-row items-center justify-between px-5 pb-3">
        <TouchableOpacity
          className="h-10 w-10 items-center justify-center rounded-full bg-[#151821]"
          onPress={onClose}
        >
          <Ionicons name="close" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text className="flex-1 text-center text-lg font-extrabold text-white">
          {getSheetTitle(activeSheet)}
        </Text>
        <TouchableOpacity
          className="h-9 min-w-[58px] items-center justify-center rounded-full bg-[#FF2D6F]/15 px-4"
          onPress={onClose}
        >
          <Text className="text-sm font-extrabold text-[#FF2D6F]">Done</Text>
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
    placeholderTextColor="#555B66"
    multiline={multiline}
    autoCapitalize={autoCapitalize}
    className={`rounded-[24px] border border-white/10 bg-[#151821] px-5 py-4 text-base font-semibold text-white ${
      multiline ? "min-h-[140px]" : "h-[58px]"
    }`}
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
  <View className="flex-row flex-wrap gap-2.5">
    {options.map((option) => {
      const active = selected.includes(option);
      return (
        <TouchableOpacity
          key={option}
          className={`min-h-11 justify-center rounded-full border px-4 ${
            active
              ? "border-[#FF2D6F] bg-[#FF2D6F]/15 shadow-lg"
              : "border-white/15 bg-white/[0.03]"
          }`}
          onPress={() => onToggle(option)}
          activeOpacity={0.78}
        >
          <Text
            className={`text-sm font-bold ${
              active ? "text-white" : "text-[#8F96A3]"
            }`}
          >
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
  <View className="gap-2.5">
    {options.map((option) => {
      const active = selected === option;
      return (
        <TouchableOpacity
          key={option}
          className={`min-h-[58px] flex-row items-center justify-between rounded-[22px] border px-4 ${
            active
              ? "border-[#FF2D6F] bg-[#FF2D6F]/15"
              : "border-white/10 bg-white/[0.03]"
          }`}
          onPress={() => onSelect(option)}
          activeOpacity={0.78}
        >
          <Text
            className={`text-[15px] font-bold ${
              active ? "text-white" : "text-[#8F96A3]"
            }`}
          >
            {formatLabel(option)}
          </Text>
          {active ? (
            <Ionicons name="checkmark-circle" size={21} color={PINK} />
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
