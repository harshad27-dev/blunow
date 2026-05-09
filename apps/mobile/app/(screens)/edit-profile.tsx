import React, { useState } from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import * as z from "zod";

import { Button } from "@/components/common/Button";
import { Input } from "@/components/common/Input";
import { Toast } from "@/components/common/Toast";
import { Colors } from "@/constants/colors";
import { FontFamily, FontSize } from "@/constants/typography";
import { useUpdateProfileMutation } from "@/hooks/queries";
import { postService } from "@/services/post.service";
import { useAuthStore } from "@/store/authStore";

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

const GENDER_OPTIONS = ["MALE", "FEMALE", "NON_BINARY", "OTHER"];
const SEXUALITY_OPTIONS = ["STRAIGHT", "GAY", "LESBIAN", "BI", "ASEXUAL"];
const INTERESTED_IN_OPTIONS = ["Men", "Women", "Non-binary", "Everyone"];
const LOOKING_FOR_OPTIONS = [
  "Serious Relationship",
  "Casual Dating",
  "Friendship",
  "Open to Anything",
];
const DRINKING_OPTIONS = ["Never", "Socially", "Often"];
const SMOKING_OPTIONS = ["Never", "Socially", "Often"];
const WORKOUT_OPTIONS = ["Never", "Sometimes", "Often"];
const PETS_OPTIONS = ["No pets", "Have pets", "Love pets"];
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

const schema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  age: z.string().optional(),
  city: z.string().optional(),
  bio: z.string().max(500, "Bio must be less than 500 characters").optional(),
  bioPrompt1: z
    .string()
    .max(160, "Prompt must be less than 160 characters")
    .optional(),
  bioPrompt2: z
    .string()
    .max(160, "Prompt must be less than 160 characters")
    .optional(),
  minAge: z.string().optional(),
  maxAge: z.string().optional(),
  maxDistance: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

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
  const [gender, setGender] = useState(profile?.gender || "OTHER");
  const [sexuality, setSexuality] = useState(user?.sexuality || "STRAIGHT");
  const [interestedIn, setInterestedIn] = useState<string[]>(
    profile?.interestedIn || [],
  );
  const [interests, setInterests] = useState<string[]>(
    profile?.interests || [],
  );
  const [lookingFor, setLookingFor] = useState<string[]>(
    profile?.lookingFor || [],
  );
  const [drinking, setDrinking] = useState(profile?.drinking || "");
  const [smoking, setSmoking] = useState(profile?.smoking || "");
  const [workout, setWorkout] = useState(profile?.workout || "");
  const [pets, setPets] = useState(profile?.pets || "");
  const [zodiac, setZodiac] = useState(profile?.zodiac || "");
  const [isUploading, setIsUploading] = useState(false);
  const [toast, setToast] = useState<{
    visible: boolean;
    message: string;
    type: "success" | "error" | "info";
  }>({
    visible: false,
    message: "",
    type: "info",
  });

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      username: profile?.username || user?.username || "",
      age: profile?.birthDate
        ? String(calculateAge(profile.birthDate) || "")
        : "",
      city: profile?.location || "",
      bio: profile?.bio || "",
      bioPrompt1: profile?.bioPrompt1 || "",
      bioPrompt2: profile?.bioPrompt2 || "",
      minAge: profile?.minAge ? String(profile.minAge) : "18",
      maxAge: profile?.maxAge ? String(profile.maxAge) : "35",
      maxDistance: profile?.maxDistance ? String(profile.maxDistance) : "50",
    },
  });

  const pickPhoto = async (type: "avatar" | "cover") => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: type === "avatar" ? [1, 1] : [16, 9],
      quality: 0.82,
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      if (type === "avatar") {
        setAvatarUri(asset.uri);
        setAvatarMimeType(asset.mimeType || "image/jpeg");
      } else {
        setCoverUri(asset.uri);
        setCoverMimeType(asset.mimeType || "image/jpeg");
      }
    }
  };

  const onSubmit = async (data: FormData) => {
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
        username: data.username.trim().toLowerCase(),
        age: toNumber(data.age),
        location: data.city?.trim() ?? "",
        gender,
        sexuality,
        interestedIn,
        bio: data.bio?.trim() ?? "",
        bioPrompt1: data.bioPrompt1?.trim() ?? "",
        bioPrompt2: data.bioPrompt2?.trim() ?? "",
        interests,
        lookingFor,
        minAge: toNumber(data.minAge),
        maxAge: toNumber(data.maxAge),
        maxDistance: toNumber(data.maxDistance),
        drinking: drinking || undefined,
        smoking: smoking || undefined,
        workout: workout || undefined,
        pets: pets || undefined,
        zodiac: zodiac || undefined,
        avatarUrl: finalAvatarUrl || undefined,
        bannerUrl: finalCoverUrl || undefined,
      });

      setIsUploading(false);
      setToast({
        visible: true,
        message: "Profile updated successfully",
        type: "success",
      });

      setTimeout(() => {
        router.back();
      }, 1200);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to update profile";

      setToast({
        visible: true,
        message,
        type: "error",
      });
      setIsUploading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.iconButton}
          activeOpacity={0.85}
        >
          <Ionicons name="chevron-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <TouchableOpacity
          onPress={handleSubmit(onSubmit)}
          style={styles.headerSaveButton}
          activeOpacity={0.85}
          disabled={updateProfileMutation.isPending || isUploading}
        >
          <Text style={styles.headerSaveText}>Save</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Section title="Photos">
          <TouchableOpacity
            style={styles.coverPicker}
            onPress={() => pickPhoto("cover")}
            activeOpacity={0.86}
          >
            {coverUri ? (
              <Image source={{ uri: coverUri }} style={styles.coverImage} />
            ) : (
              <View style={styles.coverPlaceholder}>
                <Ionicons
                  name="image-outline"
                  size={28}
                  color={Colors.textMuted}
                />
              </View>
            )}
            <View style={styles.coverOverlay}>
              <Ionicons
                name="camera-outline"
                size={18}
                color={Colors.textPrimary}
              />
              <Text style={styles.coverText}>Cover Photo</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.avatarRow}>
            <TouchableOpacity
              onPress={() => pickPhoto("avatar")}
              activeOpacity={0.85}
              style={styles.avatarButton}
            >
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatar} />
              ) : (
                <View style={styles.placeholderAvatar}>
                  <Ionicons name="person" size={50} color={Colors.textMuted} />
                </View>
              )}
              <View style={styles.editIconContainer}>
                <Ionicons
                  name="camera-outline"
                  size={20}
                  color={Colors.black}
                />
              </View>
            </TouchableOpacity>
            <View style={styles.photoCopy}>
              <Text style={styles.photoTitle}>Profile Photo</Text>
              <Text style={styles.photoSubtitle}>
                Tap to choose your main profile image.
              </Text>
            </View>
          </View>
        </Section>

        <Section title="Basic Info">
          <Controller
            control={control}
            name="username"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Username"
                placeholder="Username"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                error={errors.username?.message}
                autoCapitalize="none"
              />
            )}
          />
          <View style={styles.inputRow}>
            <Controller
              control={control}
              name="age"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Age"
                  placeholder="24"
                  keyboardType="number-pad"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  containerStyle={styles.halfInput}
                />
              )}
            />
            <Controller
              control={control}
              name="city"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="City"
                  placeholder="Mumbai"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  containerStyle={styles.halfInput}
                />
              )}
            />
          </View>
          <ChipGroup
            label="Gender"
            options={GENDER_OPTIONS}
            selected={gender}
            onSelect={setGender}
          />
          <ChipGroup
            label="Sexuality"
            options={SEXUALITY_OPTIONS}
            selected={sexuality}
            onSelect={setSexuality}
          />
          <ChipGroup
            label="Interested In"
            options={INTERESTED_IN_OPTIONS}
            selected={interestedIn}
            onSelect={(value) =>
              setInterestedIn(toggleValue(interestedIn, value))
            }
          />
        </Section>

        <Section title="About Me">
          <Controller
            control={control}
            name="bio"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Bio"
                placeholder="Write something about yourself..."
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                error={errors.bio?.message}
                multiline
                numberOfLines={4}
                containerStyle={styles.bioInput}
              />
            )}
          />
          <Controller
            control={control}
            name="bioPrompt1"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Bio Prompt 1"
                placeholder="My ideal date is..."
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                error={errors.bioPrompt1?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="bioPrompt2"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Bio Prompt 2"
                placeholder="I vibe with people who..."
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                error={errors.bioPrompt2?.message}
              />
            )}
          />
        </Section>

        <Section title="Interests">
          <ChipGroup
            options={INTEREST_OPTIONS}
            selected={interests}
            onSelect={(value) => setInterests(toggleValue(interests, value))}
          />
        </Section>

        <Section title="Dating Preferences">
          <ChipGroup
            label="Looking For"
            options={LOOKING_FOR_OPTIONS}
            selected={lookingFor}
            onSelect={(value) => setLookingFor(toggleValue(lookingFor, value))}
          />
          <Controller
            control={control}
            name="maxDistance"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Distance Preference"
                placeholder="50"
                keyboardType="number-pad"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
              />
            )}
          />
          <View style={styles.inputRow}>
            <Controller
              control={control}
              name="minAge"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Min Age"
                  placeholder="18"
                  keyboardType="number-pad"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  containerStyle={styles.halfInput}
                />
              )}
            />
            <Controller
              control={control}
              name="maxAge"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Max Age"
                  placeholder="35"
                  keyboardType="number-pad"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  containerStyle={styles.halfInput}
                />
              )}
            />
          </View>
        </Section>

        <Section title="Lifestyle">
          <ChipGroup
            label="Drinking"
            options={DRINKING_OPTIONS}
            selected={drinking}
            onSelect={setDrinking}
          />
          <ChipGroup
            label="Smoking"
            options={SMOKING_OPTIONS}
            selected={smoking}
            onSelect={setSmoking}
          />
          <ChipGroup
            label="Workout"
            options={WORKOUT_OPTIONS}
            selected={workout}
            onSelect={setWorkout}
          />
          <ChipGroup
            label="Pets"
            options={PETS_OPTIONS}
            selected={pets}
            onSelect={setPets}
          />
          <ChipGroup
            label="Zodiac"
            options={ZODIAC_OPTIONS}
            selected={zodiac}
            onSelect={setZodiac}
          />
        </Section>

        <Button
          title="Save Changes"
          onPress={handleSubmit(onSubmit)}
          loading={updateProfileMutation.isPending || isUploading}
          size="lg"
          style={styles.saveButton}
        />
      </ScrollView>

      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={() => setToast({ ...toast, visible: false })}
      />
    </SafeAreaView>
  );
}

const Section = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {children}
  </View>
);

const ChipGroup = ({
  label,
  options,
  selected,
  onSelect,
}: {
  label?: string;
  options: string[];
  selected: string | string[];
  onSelect: (value: string) => void;
}) => (
  <View style={styles.chipGroup}>
    {label ? <Text style={styles.chipLabel}>{label}</Text> : null}
    <View style={styles.chipWrap}>
      {options.map((option) => {
        const active = Array.isArray(selected)
          ? selected.includes(option)
          : selected === option;
        return (
          <TouchableOpacity
            key={option}
            style={[styles.chip, active && styles.chipActive]}
            onPress={() => onSelect(option)}
            activeOpacity={0.82}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>
              {formatOption(option)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  </View>
);

const toggleValue = (values: string[], value: string) =>
  values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];

const toNumber = (value?: string) => {
  if (!value?.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const calculateAge = (birthDate?: string | null) => {
  if (!birthDate) return null;
  const birthday = new Date(birthDate);
  if (Number.isNaN(birthday.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birthday.getFullYear();
  const monthDiff = today.getMonth() - birthday.getMonth();
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthday.getDate())
  ) {
    age -= 1;
  }
  return age;
};

const formatOption = (value: string) =>
  value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#05070B",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 14,
    paddingTop: 8,
  },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    backgroundColor: "#0B0E14",
    borderWidth: 1,
    borderColor: "#252A35",
  },
  headerTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xl,
    color: Colors.textPrimary,
  },
  headerSaveButton: {
    minWidth: 64,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: Colors.white,
  },
  headerSaveText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.sm,
    color: Colors.black,
  },
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 36,
  },
  section: {
    marginBottom: 18,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "#252A35",
    backgroundColor: "#0B0E14",
    padding: 18,
  },
  sectionTitle: {
    marginBottom: 16,
    fontFamily: FontFamily.bold,
    fontSize: FontSize.lg,
    color: Colors.textPrimary,
  },
  coverPicker: {
    height: 150,
    overflow: "hidden",
    borderRadius: 24,
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "#252A35",
  },
  coverImage: {
    width: "100%",
    height: "100%",
  },
  coverPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  coverOverlay: {
    position: "absolute",
    bottom: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.68)",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  coverText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xs,
    color: Colors.textPrimary,
  },
  avatarRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 18,
  },
  avatarButton: {
    position: "relative",
    width: 106,
    height: 106,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    backgroundColor: "#05070B",
    padding: 4,
  },
  avatar: {
    width: "100%",
    height: "100%",
    borderRadius: 28,
    backgroundColor: Colors.bgElevated,
  },
  placeholderAvatar: {
    width: "100%",
    height: "100%",
    borderRadius: 28,
    backgroundColor: "#15151D",
    alignItems: "center",
    justifyContent: "center",
  },
  editIconContainer: {
    position: "absolute",
    bottom: -4,
    right: -4,
    width: 38,
    height: 38,
    borderRadius: 15,
    backgroundColor: Colors.white,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
    borderColor: "#0B0E14",
  },
  photoCopy: {
    flex: 1,
    paddingLeft: 16,
  },
  photoTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.base,
    color: Colors.textPrimary,
  },
  photoSubtitle: {
    marginTop: 4,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    lineHeight: 19,
    color: "#A6ACB8",
  },
  inputRow: {
    flexDirection: "row",
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  bioInput: {
    minHeight: 124,
  },
  chipGroup: {
    marginBottom: 16,
  },
  chipLabel: {
    marginBottom: 10,
    marginLeft: 4,
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  chip: {
    minHeight: 40,
    justifyContent: "center",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#2D3340",
    backgroundColor: "#10131A",
    paddingHorizontal: 14,
  },
  chipActive: {
    borderColor: Colors.white,
    backgroundColor: Colors.white,
  },
  chipText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
    color: "#A6ACB8",
  },
  chipTextActive: {
    color: Colors.black,
  },
  saveButton: {
    marginTop: 4,
    borderRadius: 18,
  },
});
