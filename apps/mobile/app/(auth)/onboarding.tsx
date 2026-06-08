import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import * as Location from "expo-location";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";
import { FontFamily } from "@/constants/typography";
import { useUpdateProfileMutation } from "@/hooks/queries";
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

type LookingFor = (typeof LOOKING_FOR_OPTIONS)[number]["label"];

export default function OnboardingScreen() {
  const router = useRouter();
  const updateProfileMutation = useUpdateProfileMutation();
  const refreshUser = useAuthStore((state) => state.refreshUser);
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
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

  const totalSteps = 4;
  const selectedIntent =
    LOOKING_FOR_OPTIONS.find((item) => item.label === selectedLookingFor) ??
    LOOKING_FOR_OPTIONS[1];

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

      await updateProfileMutation.mutateAsync({
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
    <SafeAreaView className="flex-1 bg-[#050505]" edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View className="flex-1 px-6 pt-6 pb-6">
          <View className="mb-6 flex-row items-center justify-between">
            <Text className="text-sm font-bold text-white/60">
              Finish profile
            </Text>
            <Text className="text-sm font-bold text-white/60">
              {currentStep} of {totalSteps}
            </Text>
          </View>

          <View className="mb-8 flex-row items-center gap-2">
            {Array.from({ length: totalSteps }).map((_, index) => (
              <View
                key={index}
                className={`h-1 flex-1 rounded-full ${
                  index < currentStep ? "bg-white" : "bg-white/20"
                }`}
              />
            ))}
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ flexGrow: 1, paddingBottom: 12 }}
          >
            {currentStep === 1 && <BioStep bio={bio} onChangeBio={setBio} />}
            {currentStep === 2 && (
              <LookingForStep
                selectedLookingFor={selectedLookingFor}
                onSelectLookingFor={setSelectedLookingFor}
              />
            )}
            {currentStep === 3 && (
              <InterestsStep
                selectedInterests={selectedInterests}
                onToggleInterest={(interest) =>
                  setSelectedInterests((values) =>
                    toggleValue(values, interest),
                  )
                }
              />
            )}
            {currentStep === 4 && (
              <PermissionsStep
                permissions={permissions}
                onChangePermissions={setPermissions}
                error={serverError}
              />
            )}
          </ScrollView>

          <View className="mt-8 gap-3">
            <TouchableOpacity
              className="h-14 flex-row items-center justify-center rounded-full bg-white"
              onPress={handleNext}
              disabled={isLoading}
              activeOpacity={0.84}
            >
              {isLoading ? (
                <ActivityIndicator color={Colors.black} />
              ) : (
                <>
                  <Text className="text-base font-bold text-black">
                    {currentStep === totalSteps ? "Get Started" : "Next"}
                  </Text>
                  {currentStep < totalSteps ? (
                    <Ionicons
                      name="arrow-forward"
                      size={18}
                      color={Colors.black}
                      style={{ marginLeft: 8 }}
                    />
                  ) : null}
                </>
              )}
            </TouchableOpacity>

            {currentStep > 1 ? (
              <TouchableOpacity
                className="h-14 flex-row items-center justify-center rounded-full border border-white/10 bg-black/30"
                onPress={() => setCurrentStep((step) => step - 1)}
                disabled={isLoading}
                activeOpacity={0.84}
              >
                <Text className="text-base font-bold text-white">Back</Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              onPress={handleSkip}
              disabled={isLoading}
              activeOpacity={0.6}
            >
              <Text className="text-center text-sm font-semibold text-white/60">
                Skip for now
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
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

      <View className="mt-8 rounded-2xl border-2 border-white/10 bg-black/30 px-4 py-4">
        <TextInput
          value={bio}
          onChangeText={onChangeBio}
          placeholder="I love slow coffee, weekend walks, and conversations that actually go somewhere."
          placeholderTextColor="rgba(255,255,255,0.35)"
          multiline
          maxLength={180}
          textAlignVertical="top"
          className="min-h-[150px] text-base leading-6 text-white"
        />
      </View>

      <Text className="mt-3 text-right text-xs font-semibold text-white/40">
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
            className={`flex-row items-center rounded-2xl border-2 px-4 py-4 ${
              selectedLookingFor === option.label
                ? "border-white bg-white/10"
                : "border-white/10 bg-black/30"
            }`}
            onPress={() => onSelectLookingFor(option.label)}
            activeOpacity={0.76}
          >
            <Ionicons
              name={option.icon}
              size={24}
              color="white"
              style={{ marginRight: 12 }}
            />
            <Text className="flex-1 text-base font-semibold text-white">
              {option.label}
            </Text>
            {selectedLookingFor === option.label ? (
              <Ionicons name="checkmark-circle" size={24} color="white" />
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
              className={`min-h-11 justify-center rounded-2xl border px-4 ${
                active ? "border-white bg-white" : "border-white/10 bg-black/30"
              }`}
              onPress={() => onToggleInterest(interest)}
              activeOpacity={0.76}
            >
              <Text
                className={`text-sm font-bold ${
                  active ? "text-black" : "text-white/70"
                }`}
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
        <View className="mt-4 rounded-2xl border border-red-500/50 bg-red-500/10 p-4">
          <Text className="text-sm font-semibold text-red-200">{error}</Text>
        </View>
      ) : null}

      <View className="mt-8 flex-row items-start gap-3 rounded-2xl border border-white/10 bg-black/30 p-4">
        <Ionicons
          name="information-circle"
          size={20}
          color="#38BDF8"
          style={{ marginTop: 2 }}
        />
        <Text className="flex-1 text-xs leading-5 text-white/70">
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
      <View className="mb-8 h-20 w-20 items-center justify-center rounded-full border border-white/10 bg-white/5">
        <Ionicons name={icon} size={40} color="white" />
      </View>

      <Text
        className="text-[42px] font-bold leading-[52px] text-white"
        style={{ fontFamily: FontFamily.darleston }}
      >
        {title}
      </Text>

      <Text className="mt-4 text-base leading-6 text-white/70">
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
      className={`flex-row items-center rounded-2xl border-2 px-4 py-4 ${
        value ? "border-white bg-white/10" : "border-white/10 bg-black/30"
      }`}
      onPress={() => onChange(!value)}
      activeOpacity={0.7}
    >
      <Ionicons
        name={icon}
        size={24}
        color="white"
        style={{ marginRight: 12 }}
      />
      <View className="flex-1">
        <Text className="font-semibold text-white">{title}</Text>
        <Text className="mt-1 text-xs leading-4 text-white/70">
          {description}
        </Text>
      </View>
      <View
        className={`h-6 w-11 rounded-full border-2 ${
          value ? "border-white bg-white" : "border-white/20 bg-white/10"
        }`}
      >
        {value ? (
          <View className="absolute right-0.5 top-0.5 h-5 w-5 rounded-full bg-[#050505]" />
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

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
