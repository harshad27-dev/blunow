import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import * as Location from "expo-location";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";
import { Config } from "@/constants/config";
import { FontFamily } from "@/constants/typography";
import { useUpdateProfileMutation } from "@/hooks/queries";
import { useAuthStore } from "@/store/authStore";
import { storage } from "@/utils/storage";

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
  {
    label: "New friends",
    relationship: "Open to friends",
    icon: "people",
  },
  {
    label: "Serious Relationship",
    relationship: "Long term",
    icon: "heart",
  },
  {
    label: "Casual Dating",
    relationship: "Still figuring it out",
    icon: "sparkles",
  },
  {
    label: "Open to Anything",
    relationship: "Open to dating",
    icon: "compass",
  },
] as const;
const GENDER_OPTIONS = [
  { label: "Male", value: "MALE" },
  { label: "Female", value: "FEMALE" },
  { label: "Non-binary", value: "NON_BINARY" },
  { label: "Other", value: "OTHER" },
] as const;

type LookingFor = (typeof LOOKING_FOR_OPTIONS)[number]["label"];
type Gender = (typeof GENDER_OPTIONS)[number]["value"];
type OnboardingProgress = {
  username: string;
  birthDate: string;
  gender: Gender;
  bio: string;
  currentStep: number;
  permissions: { location: boolean; notifications: boolean };
  selectedInterests: string[];
  selectedLookingFor: LookingFor;
};
const REGISTRATION_STEPS = 2;
const ONBOARDING_STEPS = 5;
const TOTAL_FLOW_STEPS = REGISTRATION_STEPS + ONBOARDING_STEPS;

export default function OnboardingScreen() {
  const router = useRouter();
  const updateProfileMutation = useUpdateProfileMutation();
  const user = useAuthStore((state) => state.user);
  const refreshUser = useAuthStore((state) => state.refreshUser);
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [username, setUsername] = useState(user?.profile?.username || user?.username || "");
  const [birthDate, setBirthDate] = useState(formatBirthDate(user?.profile?.birthDate));
  const [gender, setGender] = useState<Gender>((user?.profile?.gender as Gender) || "OTHER");
  const [bio, setBio] = useState("");
  const [selectedLookingFor, setSelectedLookingFor] = useState<LookingFor>(
    "Serious Relationship",
  );
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [permissions, setPermissions] = useState({
    location: false,
    notifications: false,
  });
  const [serverError, setServerError] = useState("");
  const [hasRestoredProgress, setHasRestoredProgress] = useState(false);

  const totalSteps = ONBOARDING_STEPS;
  const displayStep = REGISTRATION_STEPS + currentStep;
  const selectedIntent =
    LOOKING_FOR_OPTIONS.find((item) => item.label === selectedLookingFor) ??
    LOOKING_FOR_OPTIONS[1];

  useEffect(() => {
    const restoreProgress = async () => {
      const raw = await storage.get(Config.ONBOARDING_PROGRESS_KEY);
      if (!raw) {
        setHasRestoredProgress(true);
        return;
      }

      try {
        const progress = JSON.parse(raw) as Partial<OnboardingProgress>;
        if (progress.username !== undefined) setUsername(progress.username);
        if (progress.birthDate !== undefined) setBirthDate(progress.birthDate);
        if (progress.gender !== undefined) setGender(progress.gender);
        if (progress.bio !== undefined) setBio(progress.bio);
        if (progress.currentStep) {
          setCurrentStep(Math.min(Math.max(progress.currentStep, 1), totalSteps));
        }
        if (progress.permissions) setPermissions(progress.permissions);
        if (Array.isArray(progress.selectedInterests)) {
          setSelectedInterests(progress.selectedInterests);
        }
        if (
          progress.selectedLookingFor &&
          LOOKING_FOR_OPTIONS.some(
            (option) => option.label === progress.selectedLookingFor,
          )
        ) {
          setSelectedLookingFor(progress.selectedLookingFor);
        }
      } catch {
        await storage.delete(Config.ONBOARDING_PROGRESS_KEY);
      } finally {
        setHasRestoredProgress(true);
      }
    };

    restoreProgress();
  }, [totalSteps]);

  useEffect(() => {
    if (!hasRestoredProgress) return;

    const progress: OnboardingProgress = {
      username,
      birthDate,
      gender,
      bio,
      currentStep,
      permissions,
      selectedInterests,
      selectedLookingFor,
    };

    storage.set(Config.ONBOARDING_PROGRESS_KEY, JSON.stringify(progress));
  }, [
    username,
    birthDate,
    gender,
    bio,
    currentStep,
    hasRestoredProgress,
    username,
    birthDate,
    gender,
    permissions,
    selectedInterests,
    selectedLookingFor,
  ]);

  const completeOnboarding = async ({
    useDefaults = false,
  }: {
    useDefaults?: boolean;
  } = {}) => {
    setServerError("");
    setIsLoading(true);

    try {
      const locationPayload = permissions.location
        ? await getLocationPayload()
        : {};
      const profileBasicsPayload = validateProfileBasics(username, birthDate)
        ? {}
        : {
            username: username.trim().toLowerCase(),
            birthDate: toBackendBirthDate(birthDate),
            gender,
          };

      await updateProfileMutation.mutateAsync({
        ...profileBasicsPayload,
        bio: bio.trim(),
        interests: selectedInterests,
        lookingFor: [useDefaults ? "New friends" : selectedIntent.label],
        relationship: useDefaults
          ? "Open to friends"
          : selectedIntent.relationship,
        maxDistance: permissions.location ? 50 : 100,
        ...locationPayload,
      });
      await refreshUser();
      await storage.delete(Config.ONBOARDING_PROGRESS_KEY);
      router.replace("/(tabs)/discover");
    } catch (error: any) {
      const message =
        error?.response?.data?.message ??
        "Unable to save onboarding. Please try again.";
      setServerError(Array.isArray(message) ? message[0] : message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNext = async () => {
    setServerError("");

    if (currentStep === 1) {
      const profileError = validateProfileBasics(username, birthDate);
      if (profileError) {
        setServerError(profileError);
        return;
      }
    }

    if (currentStep < totalSteps) {
      setCurrentStep((step) => step + 1);
      return;
    }

    await completeOnboarding();
  };

  const handleSkip = async () => {
    await completeOnboarding({ useDefaults: true });
  };

  return (
    <SafeAreaView className="flex-1" style={styles.screen} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View className="flex-1 px-6 pt-6 pb-6">
          <View className="mb-6 flex-row items-center justify-between">
            <Text className="text-sm font-bold" style={styles.mutedText}>
              Finish profile
            </Text>
            <Text className="text-sm font-bold" style={styles.mutedText}>
              {displayStep} of {TOTAL_FLOW_STEPS}
            </Text>
          </View>

          <View className="mb-8 flex-row items-center gap-2">
            {Array.from({ length: TOTAL_FLOW_STEPS }).map((_, index) => (
              <View
                key={index}
                className="h-1 flex-1 rounded-full"
                style={index < displayStep ? styles.progressActive : styles.progressInactive}
              />
            ))}
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ flexGrow: 1, paddingBottom: 12 }}
          >
            {currentStep === 1 && (
              <ProfileBasicsStep
                username={username}
                birthDate={birthDate}
                gender={gender}
                error={serverError}
                onChangeUsername={setUsername}
                onChangeBirthDate={setBirthDate}
                onChangeGender={setGender}
              />
            )}
            {currentStep === 2 && <BioStep bio={bio} onChangeBio={setBio} />}
            {currentStep === 3 && (
              <LookingForStep
                selectedLookingFor={selectedLookingFor}
                onSelectLookingFor={setSelectedLookingFor}
              />
            )}
            {currentStep === 4 && (
              <InterestsStep
                selectedInterests={selectedInterests}
                onToggleInterest={(interest) =>
                  setSelectedInterests((values) =>
                    toggleValue(values, interest),
                  )
                }
              />
            )}
            {currentStep === 5 && (
              <PermissionsStep
                permissions={permissions}
                onChangePermissions={setPermissions}
                error={serverError}
              />
            )}
          </ScrollView>

          <View className="mt-8 gap-3">
            <TouchableOpacity
              className="h-14 flex-row items-center justify-center rounded-full"
              style={styles.primaryButton}
              onPress={handleNext}
              disabled={isLoading}
              activeOpacity={0.84}
            >
              {isLoading ? (
                <ActivityIndicator color={Colors.textInverse} />
              ) : (
                <>
                  <Text className="text-base font-bold" style={styles.primaryButtonText}>
                    {currentStep === totalSteps ? "Get Started" : "Next"}
                  </Text>
                  {currentStep < totalSteps ? (
                    <Ionicons
                      name="arrow-forward"
                      size={18}
                      color={Colors.textInverse}
                      style={{ marginLeft: 8 }}
                    />
                  ) : null}
                </>
              )}
            </TouchableOpacity>

            {currentStep > 1 ? (
              <TouchableOpacity
                className="h-14 flex-row items-center justify-center rounded-full border"
                style={styles.secondaryButton}
                onPress={() => setCurrentStep((step) => step - 1)}
                disabled={isLoading}
                activeOpacity={0.84}
              >
                <Text className="text-base font-bold" style={styles.titleText}>Back</Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              onPress={handleSkip}
              disabled={isLoading}
              activeOpacity={0.6}
            >
              <Text className="text-center text-sm font-semibold" style={styles.mutedText}>
                Skip for now
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function ProfileBasicsStep({
  username,
  birthDate,
  gender,
  error,
  onChangeUsername,
  onChangeBirthDate,
  onChangeGender,
}: {
  username: string;
  birthDate: string;
  gender: Gender;
  error?: string;
  onChangeUsername: (value: string) => void;
  onChangeBirthDate: (value: string) => void;
  onChangeGender: (value: Gender) => void;
}) {
  return (
    <View className="flex-1 justify-center">
      <StepHeader
        icon="person-circle"
        title="Tell us about you"
        description="Choose the name and basic details people will see on your profile."
      />

      <View className="mt-8 gap-3">
        <View className="rounded-2xl border-2 px-4 py-3" style={styles.fieldBox}>
          <Text className="mb-2 text-xs font-bold uppercase" style={styles.mutedText}>
            Username
          </Text>
          <TextInput
            value={username}
            onChangeText={(value) => onChangeUsername(value.toLowerCase())}
            placeholder="username"
            placeholderTextColor={Colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            className="text-base"
            style={styles.inputText}
          />
        </View>

        <View className="rounded-2xl border-2 px-4 py-3" style={styles.fieldBox}>
          <Text className="mb-2 text-xs font-bold uppercase" style={styles.mutedText}>
            Birth date
          </Text>
          <TextInput
            value={birthDate}
            onChangeText={onChangeBirthDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={Colors.textMuted}
            keyboardType="numbers-and-punctuation"
            className="text-base"
            style={styles.inputText}
          />
        </View>

        <View className="mt-2 flex-row flex-wrap gap-3">
          {GENDER_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.value}
              className="min-h-11 justify-center rounded-2xl border px-4"
              style={gender === option.value ? styles.chipActive : styles.chip}
              onPress={() => onChangeGender(option.value)}
              activeOpacity={0.76}
            >
              <Text
                className="text-sm font-bold"
                style={
                  gender === option.value
                    ? styles.primaryButtonText
                    : styles.bodyText
                }
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {error ? (
        <View className="mt-4 rounded-2xl border p-4" style={styles.errorBox}>
          <Text className="text-sm font-semibold" style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
    </View>
  );
}
function BioStep({
  bio,
  onChangeBio,
}: {
  bio: string;
  onChangeBio: (value: string) => void;
}) {
  return (
    <View className="flex-1 justify-center">
      <StepHeader
        icon="chatbubble-ellipses"
        title="Write a short bio"
        description="A few honest lines help people understand your vibe before they match."
      />

      <View className="mt-8 rounded-2xl border-2 px-4 py-4" style={styles.fieldBox}>
        <TextInput
          value={bio}
          onChangeText={onChangeBio}
          placeholder="I love slow coffee, weekend walks, and conversations that actually go somewhere."
          placeholderTextColor={Colors.textMuted}
          multiline
          maxLength={180}
          textAlignVertical="top"
          className="min-h-[150px] text-base leading-6"
          style={styles.inputText}
        />
      </View>

      <Text className="mt-3 text-right text-xs font-semibold" style={styles.mutedText}>
        {bio.length}/180
      </Text>
    </View>
  );
}

function LookingForStep({
  selectedLookingFor,
  onSelectLookingFor,
}: {
  selectedLookingFor: LookingFor;
  onSelectLookingFor: (value: LookingFor) => void;
}) {
  return (
    <View className="flex-1 justify-center">
      <StepHeader
        icon="heart"
        title="What are you looking for?"
        description="This helps us match you with people who share your intentions."
      />

      <View className="mt-8 gap-3">
        {LOOKING_FOR_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option.label}
            className="flex-row items-center rounded-2xl border-2 px-4 py-4"
            style={
              selectedLookingFor === option.label
                ? styles.optionSelected
                : styles.option
            }
            onPress={() => onSelectLookingFor(option.label)}
            activeOpacity={0.76}
          >
            <Ionicons
              name={option.icon}
              size={24}
              color={Colors.textPrimary}
              style={{ marginRight: 12 }}
            />
            <Text className="flex-1 text-base font-semibold" style={styles.titleText}>
              {option.label}
            </Text>
            {selectedLookingFor === option.label ? (
              <Ionicons name="checkmark-circle" size={24} color={Colors.primary} />
            ) : null}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function InterestsStep({
  selectedInterests,
  onToggleInterest,
}: {
  selectedInterests: string[];
  onToggleInterest: (interest: string) => void;
}) {
  return (
    <View className="flex-1 justify-center">
      <StepHeader
        icon="sparkles"
        title="Pick your interests"
        description="Choose a few topics that make it easier to start a real conversation."
      />

      <View className="mt-8 flex-row flex-wrap gap-3">
        {INTEREST_OPTIONS.map((interest) => {
          const active = selectedInterests.includes(interest);

          return (
            <TouchableOpacity
              key={interest}
              className="min-h-11 justify-center rounded-2xl border px-4"
              style={active ? styles.chipActive : styles.chip}
              onPress={() => onToggleInterest(interest)}
              activeOpacity={0.76}
            >
              <Text
                className="text-sm font-bold"
                style={active ? styles.primaryButtonText : styles.bodyText}
              >
                {interest}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function PermissionsStep({
  permissions,
  onChangePermissions,
  error,
}: {
  permissions: { location: boolean; notifications: boolean };
  onChangePermissions: (permissions: {
    location: boolean;
    notifications: boolean;
  }) => void;
  error?: string;
}) {
  return (
    <View className="flex-1 justify-center">
      <StepHeader
        icon="shield-checkmark"
        title="Almost there!"
        description="These permissions help us improve your experience."
      />

      <View className="mt-8 gap-3">
        <PermissionToggle
          icon="location"
          title="Location"
          description="Show distance and nearby people"
          value={permissions.location}
          onChange={(value) =>
            onChangePermissions({ ...permissions, location: value })
          }
        />
        <PermissionToggle
          icon="notifications"
          title="Notifications"
          description="Get notified about new matches and messages"
          value={permissions.notifications}
          onChange={(value) =>
            onChangePermissions({ ...permissions, notifications: value })
          }
        />
      </View>

      {error ? (
        <View className="mt-4 rounded-2xl border p-4" style={styles.errorBox}>
          <Text className="text-sm font-semibold" style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <View className="mt-8 flex-row items-start gap-3 rounded-2xl border p-4" style={styles.infoBox}>
        <Ionicons
          name="information-circle"
          size={20}
          color={Colors.primaryLight}
          style={{ marginTop: 2 }}
        />
        <Text className="flex-1 text-xs leading-5" style={styles.bodyText}>
          You can update your bio, interests, and preferences anytime in
          settings.
        </Text>
      </View>
    </View>
  );
}

function StepHeader({
  icon,
  title,
  description,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
}) {
  return (
    <View>
      <View className="mb-8 h-20 w-20 items-center justify-center rounded-full border" style={styles.heroIcon}>
        <Ionicons name={icon} size={40} color={Colors.textInverse} />
      </View>

      <Text
        className="text-[42px] font-bold leading-[52px]"
        style={[styles.displayTitle, { fontFamily: FontFamily.darleston }]}
      >
        {title}
      </Text>

      <Text className="mt-4 text-base leading-6" style={styles.bodyText}>
        {description}
      </Text>
    </View>
  );
}

function PermissionToggle({
  icon,
  title,
  description,
  value,
  onChange,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <TouchableOpacity
      className="flex-row items-center rounded-2xl border-2 px-4 py-4"
      style={value ? styles.optionSelected : styles.option}
      onPress={() => onChange(!value)}
      activeOpacity={0.7}
    >
      <Ionicons
        name={icon}
        size={24}
        color={Colors.textPrimary}
        style={{ marginRight: 12 }}
      />
      <View className="flex-1">
        <Text className="font-semibold" style={styles.titleText}>{title}</Text>
        <Text className="mt-1 text-xs leading-4" style={styles.bodyText}>
          {description}
        </Text>
      </View>
      <View
        className="h-6 w-11 rounded-full border-2"
        style={value ? styles.toggleOn : styles.toggleOff}
      >
        {value ? (
          <View className="absolute right-0.5 top-0.5 h-5 w-5 rounded-full" style={styles.toggleKnob} />
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: Colors.bg,
  },
  progressActive: {
    backgroundColor: Colors.primary,
  },
  progressInactive: {
    backgroundColor: Colors.border,
  },
  titleText: {
    color: Colors.textPrimary,
  },
  displayTitle: {
    color: Colors.textPrimary,
  },
  bodyText: {
    color: Colors.textSecondary,
  },
  mutedText: {
    color: Colors.textMuted,
  },
  heroIcon: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
  },
  primaryButtonText: {
    color: Colors.textInverse,
  },
  secondaryButton: {
    backgroundColor: Colors.bgCard,
    borderColor: Colors.border,
  },
  fieldBox: {
    backgroundColor: Colors.bgInput,
    borderColor: Colors.border,
  },
  inputText: {
    color: Colors.textPrimary,
  },
  option: {
    backgroundColor: Colors.bgCard,
    borderColor: Colors.border,
  },
  optionSelected: {
    backgroundColor: Colors.bgElevated,
    borderColor: Colors.primary,
  },
  chip: {
    backgroundColor: Colors.bgCard,
    borderColor: Colors.border,
  },
  chipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  errorBox: {
    backgroundColor: Colors.error + "12",
    borderColor: Colors.error,
  },
  errorText: {
    color: Colors.error,
  },
  infoBox: {
    backgroundColor: Colors.bgCard,
    borderColor: Colors.border,
  },
  toggleOn: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  toggleOff: {
    backgroundColor: Colors.bgElevated,
    borderColor: Colors.border,
  },
  toggleKnob: {
    backgroundColor: Colors.textInverse,
  },
});

async function getLocationPayload() {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (permission.status !== Location.PermissionStatus.GRANTED) {
    return {};
  }

  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });
  const { latitude, longitude } = position.coords;
  const [place] = await Location.reverseGeocodeAsync({ latitude, longitude });
  const location = [
    place?.city || place?.district || place?.region,
    place?.country,
  ]
    .filter(Boolean)
    .join(", ");

  return {
    latitude,
    longitude,
    ...(location && { location }),
  };
}

const toggleValue = (values: string[], value: string) =>
  values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];

const validateProfileBasics = (username: string, birthDate: string) => {
  const normalizedUsername = username.trim().toLowerCase();

  if (!/^[a-z0-9]+([._]?[a-z0-9]+)*$/.test(normalizedUsername)) {
    return "Username can use lowercase letters, numbers, dots, and underscores.";
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate.trim())) {
    return "Enter birth date as YYYY-MM-DD.";
  }

  const birthday = new Date(`${birthDate.trim()}T00:00:00.000Z`);
  if (Number.isNaN(birthday.getTime())) {
    return "Enter a valid birth date.";
  }

  const today = new Date();
  let age = today.getFullYear() - birthday.getUTCFullYear();
  const monthDiff = today.getMonth() - birthday.getUTCMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthday.getUTCDate())) {
    age -= 1;
  }

  if (age < 18) {
    return "You must be at least 18 years old.";
  }

  return "";
};

const toBackendBirthDate = (birthDate: string) =>
  new Date(`${birthDate.trim()}T00:00:00.000Z`).toISOString();

const formatBirthDate = (birthDate?: string | null) => {
  if (!birthDate) return "";
  const date = new Date(birthDate);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};








