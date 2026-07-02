import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as Location from "expo-location";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
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
import Animated, {
  Easing,
  LinearTransition,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "@/constants/colors";
import { Config } from "@/constants/config";
import { Radius, Spacing } from "@/constants/spacing";
import { FontFamily, FontSize } from "@/constants/typography";
import { useUpdateProfileMutation } from "@/hooks/queries";
import { useAuthStore } from "@/store/authStore";
import { postService } from "@/services/post.service";
import { storage } from "@/utils/storage";
import { BirthDateCalendar } from "@/components/onboarding/BirthDateCalendar";
import { useColorScheme } from "nativewind";

const INTEREST_OPTIONS = [
  "Music",
  "Travel",
  "Fitness",
  "Movies",
  "Food",
  "Gaming",
  "Art",
  "Photography",
  "Tech",
  "Sports",
];
const LOOKING_FOR_OPTIONS = [
  { label: "Dating", relationship: "Open to dating", icon: "heart-outline" },
  { label: "Friends", relationship: "Open to friends", icon: "people-outline" },
  {
    label: "Relationship",
    relationship: "Long term",
    icon: "sparkles-outline",
  },
  {
    label: "Networking",
    relationship: "Networking",
    icon: "briefcase-outline",
  },
  {
    label: "Casual",
    relationship: "Still figuring it out",
    icon: "cafe-outline",
  },
] as const;
const GENDER_OPTIONS = [
  { label: "Male", value: "MALE" },
  { label: "Female", value: "FEMALE" },
  { label: "Non-binary", value: "NON_BINARY" },
  { label: "Other", value: "OTHER" },
] as const;
const STEP_THEMES = [
  {
    accent: "#5725C4",
    colors: ["#B98DFF", "#D0AEFF", "#FFFFFF"] as const,
    icon: "person-outline",
    title: "Tell us about you",
    description:
      "A few essentials so your profile feels real from the first hello.",
  },
  {
    accent: "#176B87",
    colors: ["#7BDFF2", "#B2F0EA", "#FFFFFF"] as const,
    icon: "images-outline",
    title: "Add your photos",
    description:
      "Upload one to three photos. The first one becomes your profile image.",
  },
  {
    accent: "#C62547",
    colors: ["#FF8FA8", "#FFB4C5", "#FFFFFF"] as const,
    icon: "chatbubble-ellipses-outline",
    title: "Write a short bio",
    description:
      "Keep it light, specific, and true to the way you actually talk.",
  },
  {
    accent: "#C74416",
    colors: ["#FF9B66", "#FFC19B", "#FFFFFF"] as const,
    icon: "heart-outline",
    title: "What are you looking for?",
    description: "Choose the intention that best matches your mood right now.",
  },
  {
    accent: "#0B7465",
    colors: ["#68D8C7", "#A7EEE2", "#FFFFFF"] as const,
    icon: "sparkles-outline",
    title: "Pick your interests",
    description:
      "Select a few easy conversation starters for better discovery.",
  },
  {
    accent: "#1839C2",
    colors: ["#84A0FF", "#B5C8FF", "#FFFFFF"] as const,
    icon: "shield-checkmark-outline",
    title: "Almost there",
    description:
      "Turn on helpful permissions for nearby profiles and timely updates.",
  },
] as const;

type LookingFor = (typeof LOOKING_FOR_OPTIONS)[number]["label"];
type Gender = (typeof GENDER_OPTIONS)[number]["value"];
type PermissionState = { location: boolean; notifications: boolean };
type ProfilePhoto = { uri: string; mimeType: string };
type StepIndex = 0 | 1 | 2 | 3 | 4 | 5;
type OnboardingProgress = {
  name: string;
  username: string;
  birthDate: string;
  gender: Gender;
  bio: string;
  currentStep: number;
  permissions: PermissionState;
  profilePhotos: ProfilePhoto[];
  selectedInterests: string[];
  selectedLookingFor: LookingFor;
};
const ONBOARDING_STEPS = STEP_THEMES.length;
const STEP_TRANSITION_DURATION = 480;
const STEP_EASING = Easing.bezier(0.22, 1, 0.36, 1);
const STEP_LAYOUT_TRANSITION = LinearTransition.duration(
  STEP_TRANSITION_DURATION,
).easing(STEP_EASING);
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colorScheme } = useColorScheme();
  const statusBarStyle = colorScheme === "dark" ? "light" : "dark";
  const { height } = useWindowDimensions();
  const updateProfileMutation = useUpdateProfileMutation();
  const refreshUser = useAuthStore((state) => state.refreshUser);
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<StepIndex>(0);
  const [previousStep, setPreviousStep] = useState<StepIndex>(0);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState<Gender>("OTHER");
  const [bio, setBio] = useState("");
  const [selectedLookingFor, setSelectedLookingFor] =
    useState<LookingFor>("Dating");
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [profilePhotos, setProfilePhotos] = useState<ProfilePhoto[]>([]);
  const [permissions, setPermissions] = useState<PermissionState>({
    location: false,
    notifications: false,
  });
  const [serverError, setServerError] = useState("");
  const [hasRestoredProgress, setHasRestoredProgress] = useState(false);
  const [showCompletionAnimation, setShowCompletionAnimation] = useState(false);
  const stepProgress = useSharedValue(1);
  const contentProgress = useSharedValue(1);
  const ambientProgress = useSharedValue(0);
  const animatedDirection = useSharedValue<1 | -1>(1);
  const completionProgress = useSharedValue(0);
  const completionPulse = useSharedValue(0);
  const activeTheme = STEP_THEMES[currentStep];
  const previousTheme = STEP_THEMES[previousStep];
  const headerHeight = Math.max(250, Math.min(330, height * 0.36));
  const scrollViewHeight = height * 0.6;
  const selectedIntent =
    LOOKING_FOR_OPTIONS.find((item) => item.label === selectedLookingFor) ??
    LOOKING_FOR_OPTIONS[0];

  useEffect(() => {
    ambientProgress.value = withRepeat(
      withTiming(1, {
        duration: 5200,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      true,
    );
  }, [ambientProgress]);

  useEffect(() => {
    const restoreProgress = async () => {
      const raw = await storage.get(Config.ONBOARDING_PROGRESS_KEY);
      if (!raw) {
        setHasRestoredProgress(true);
        return;
      }
      try {
        const progress = JSON.parse(raw) as Partial<OnboardingProgress>;
        if (progress.name !== undefined) setName(progress.name);
        if (progress.username !== undefined) setUsername(progress.username);
        if (progress.birthDate !== undefined) setBirthDate(progress.birthDate);
        if (progress.gender !== undefined) setGender(progress.gender);
        if (progress.bio !== undefined) setBio(progress.bio);
        if (progress.permissions) setPermissions(progress.permissions);
        if (Array.isArray(progress.profilePhotos))
          setProfilePhotos(progress.profilePhotos.slice(0, 3));
        if (Array.isArray(progress.selectedInterests))
          setSelectedInterests(progress.selectedInterests);
        if (
          progress.selectedLookingFor &&
          LOOKING_FOR_OPTIONS.some(
            (option) => option.label === progress.selectedLookingFor,
          )
        )
          setSelectedLookingFor(progress.selectedLookingFor);
        if (progress.currentStep) {
          const restoredStep = clampStep(progress.currentStep - 1);
          setCurrentStep(restoredStep);
          setPreviousStep(restoredStep);
        }
      } catch {
        await storage.delete(Config.ONBOARDING_PROGRESS_KEY);
      } finally {
        setHasRestoredProgress(true);
      }
    };
    restoreProgress();
  }, []);

  useEffect(() => {
    if (!hasRestoredProgress) return;
    const progress: OnboardingProgress = {
      name,
      username,
      birthDate,
      gender,
      bio,
      currentStep: currentStep + 1,
      permissions,
      profilePhotos,
      selectedInterests,
      selectedLookingFor,
    };
    storage.set(Config.ONBOARDING_PROGRESS_KEY, JSON.stringify(progress));
  }, [
    bio,
    birthDate,
    currentStep,
    gender,
    hasRestoredProgress,
    name,
    permissions,
    profilePhotos,
    selectedInterests,
    selectedLookingFor,
    username,
  ]);

  const animateToStep = useCallback(
    (nextStep: StepIndex) => {
      if (nextStep === currentStep) return;
      const direction = nextStep > currentStep ? 1 : -1;
      animatedDirection.value = direction;
      setPreviousStep(currentStep);
      setCurrentStep(nextStep);
      stepProgress.value = 0;
      contentProgress.value = 0;
      stepProgress.value = withTiming(1, {
        duration: STEP_TRANSITION_DURATION,
        easing: STEP_EASING,
      });
      contentProgress.value = withDelay(
        40,
        withTiming(1, { duration: 430, easing: STEP_EASING }),
      );
    },
    [animatedDirection, contentProgress, currentStep, stepProgress],
  );
  const pickProfilePhotos = useCallback(async () => {
    if (profilePhotos.length >= 3) {
      Alert.alert("Photo limit", "You can add up to three profile photos.");
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== "granted") {
      Alert.alert("Photo access needed", "Allow photo access to add profile images.");
      return;
    }

    const remainingSlots = 3 - profilePhotos.length;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: remainingSlots,
      quality: 0.82,
    });

    if (result.canceled) return;

    const nextPhotos = await Promise.all(
      result.assets.slice(0, remainingSlots).map(async (asset) => ({
        uri: await compressProfilePhoto(asset.uri),
        mimeType: asset.mimeType || "image/jpeg",
      })),
    );

    setProfilePhotos((current) => [...current, ...nextPhotos].slice(0, 3));
  }, [profilePhotos.length]);

  const removeProfilePhoto = useCallback((uri: string) => {
    setProfilePhotos((current) => current.filter((photo) => photo.uri !== uri));
  }, []);

  const makePrimaryPhoto = useCallback((uri: string) => {
    setProfilePhotos((current) => {
      const selected = current.find((photo) => photo.uri === uri);
      if (!selected) return current;
      return [selected, ...current.filter((photo) => photo.uri !== uri)];
    });
  }, []);
  const completeOnboarding = useCallback(
    async ({ useDefaults = false }: { useDefaults?: boolean } = {}) => {
      setServerError("");
      setIsLoading(true);
      try {
        const locationPayload = permissions.location
          ? await getLocationPayload()
          : {};
        const profileBasicsPayload = validateProfileBasics(name, username, birthDate)
          ? {}
          : {
              name: name.trim(),
              username: username.trim().toLowerCase(),
              birthDate: toBackendBirthDate(birthDate),
              gender,
            };
        const profilePhotoUrls = await uploadProfilePhotos(profilePhotos);
        const profileMediaPayload = profilePhotoUrls.length
          ? {
              avatarUrl: profilePhotoUrls[0],
              profilePhotoUrls,
            }
          : {};
        await updateProfileMutation.mutateAsync({
          ...profileBasicsPayload,
          bio: bio.trim(),
          interests: selectedInterests,
          lookingFor: [useDefaults ? "Friends" : selectedIntent.label],
          relationship: useDefaults
            ? "Open to friends"
            : selectedIntent.relationship,
          maxDistance: permissions.location ? 50 : 100,
          ...profileMediaPayload,
          ...locationPayload,
        });
        await refreshUser();
        await storage.delete(Config.ONBOARDING_PROGRESS_KEY);
        setShowCompletionAnimation(true);
        completionProgress.value = 0;
        completionPulse.value = 0;
        completionProgress.value = withTiming(1, {
          duration: 1050,
          easing: STEP_EASING,
        });
        completionPulse.value = withRepeat(
          withTiming(1, {
            duration: 680,
            easing: Easing.inOut(Easing.ease),
          }),
          2,
          true,
        );
        await wait(1800);
        router.replace("/(tabs)/discover");
      } catch (error: any) {
        setServerError(getOnboardingErrorMessage(error));
      } finally {
        setIsLoading(false);
      }
    },
    [
      bio,
      birthDate,
      completionProgress,
      completionPulse,
      gender,
      name,
      permissions.location,
      profilePhotos,
      refreshUser,
      router,
      selectedIntent.label,
      selectedIntent.relationship,
      selectedInterests,
      updateProfileMutation,
      username,
    ],
  );

  const handleNext = useCallback(async () => {
    setServerError("");
    const validationError = validateStep({
      birthDate,
      bio,
      currentStep,
      name,
      profilePhotos,
      selectedInterests,
      username,
    });
    if (validationError) {
      setServerError(validationError);
      return;
    }

    if (currentStep === 0) {
      setIsLoading(true);
      try {
        await updateProfileMutation.mutateAsync({
          name: name.trim(),
          username: username.trim().toLowerCase(),
          birthDate: toBackendBirthDate(birthDate),
          gender,
        });
        await refreshUser();
      } catch (error: any) {
        setServerError(getOnboardingErrorMessage(error));
        return;
      } finally {
        setIsLoading(false);
      }
    }

    if (currentStep < ONBOARDING_STEPS - 1) {
      animateToStep(clampStep(currentStep + 1));
      return;
    }
    await completeOnboarding();
  }, [
    animateToStep,
    birthDate,
    bio,
    completeOnboarding,
    currentStep,
    gender,
    name,
    profilePhotos,
    refreshUser,
    selectedInterests,
    updateProfileMutation,
    username,
  ]);

  const handleBack = useCallback(() => {
    if (currentStep === 0 || isLoading) return;
    setServerError("");
    animateToStep(clampStep(currentStep - 1));
  }, [animateToStep, currentStep, isLoading]);

  const screenAnimatedStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      stepProgress.value,
      [0, 1],
      [previousTheme.colors[1], activeTheme.colors[1]],
    ),
  }));
  const ambientBandOneStyle = useAnimatedStyle(() => ({
    opacity: 0.22 + ambientProgress.value * 0.14,
    transform: [
      { translateX: -54 + ambientProgress.value * 96 },
      { translateY: (1 - stepProgress.value) * -12 },
      { rotate: "-7deg" },
    ],
  }));
  const ambientBandTwoStyle = useAnimatedStyle(() => ({
    opacity: 0.2 + (1 - ambientProgress.value) * 0.12,
    transform: [
      { translateX: 46 - ambientProgress.value * 86 },
      { translateY: 10 + (1 - stepProgress.value) * 16 },
      { rotate: "8deg" },
    ],
  }));
  const progressFillAnimatedStyle = useAnimatedStyle(() => ({
    backgroundColor: activeTheme.accent,
    width: `${Math.min(
      100,
      ((currentStep + stepProgress.value) / ONBOARDING_STEPS) * 100,
    )}%`,
  }));
  const gradientAnimatedStyle = useAnimatedStyle(() => ({
    opacity: stepProgress.value,
  }));
  const contentAnimatedStyle = useAnimatedStyle(() => ({
    opacity: contentProgress.value,
    transform: [
      {
        translateY: (1 - contentProgress.value) * 16 * animatedDirection.value,
      },
      { scale: 0.996 + contentProgress.value * 0.004 },
    ],
  }));
  const stepRowAnimatedStyle = useAnimatedStyle(() => ({
    opacity: 1,
    transform: [
      { translateY: (1 - stepProgress.value) * 10 * animatedDirection.value },
      { scale: 0.996 + stepProgress.value * 0.004 },
    ],
  }));
  const topBarAnimatedStyle = useAnimatedStyle(() => ({
    opacity: stepProgress.value,
    transform: [
      { translateY: (stepProgress.value - 1) * 6 * animatedDirection.value },
    ],
  }));
  const bottomBarAnimatedStyle = useAnimatedStyle(() => ({
    opacity: contentProgress.value,
    transform: [{ translateY: (1 - contentProgress.value) * 16 }],
  }));
  const completionCardAnimatedStyle = useAnimatedStyle(() => ({
    opacity: completionProgress.value,
    transform: [
      { translateY: (1 - completionProgress.value) * 28 },
      { scale: 0.86 + completionProgress.value * 0.14 },
    ],
  }));
  const completionHaloAnimatedStyle = useAnimatedStyle(() => ({
    opacity: 0.18 + completionPulse.value * 0.2,
    transform: [{ scale: 0.86 + completionPulse.value * 0.28 }],
  }));
  const completionCheckAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${(1 - completionProgress.value) * -18}deg` },
      { scale: 0.5 + completionProgress.value * 0.5 },
    ],
  }));
  const completionFillAnimatedStyle = useAnimatedStyle(() => ({
    width: `${completionProgress.value * 100}%`,
  }));

  return (
    <Animated.View
      style={[
        styles.screen,
        { backgroundColor: activeTheme.colors[0] },
        screenAnimatedStyle,
      ]}
    >
      <StatusBar style={statusBarStyle} backgroundColor={activeTheme.colors[0]} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardView}
      >
        <View style={styles.backgroundWrap}>
          <LinearGradient
            colors={previousTheme.colors}
            locations={[0, 0.62, 1]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            className="absolute left-0 right-0 top-0"
            style={{ height: headerHeight }}
          />
          <Animated.View
            pointerEvents="none"
            className="absolute left-0 right-0 top-0"
            style={[{ height: headerHeight }, gradientAnimatedStyle]}
          >
            <LinearGradient
              colors={activeTheme.colors}
              locations={[0, 0.62, 1]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              className="h-full w-full"
            />
          </Animated.View>
          <Animated.View
            pointerEvents="none"
            style={[
              styles.ambientBand,
              styles.ambientBandOne,
              { backgroundColor: activeTheme.colors[1] },
              ambientBandOneStyle,
            ]}
          />
          <Animated.View
            pointerEvents="none"
            style={[
              styles.ambientBand,
              styles.ambientBandTwo,
              { backgroundColor: activeTheme.accent },
              ambientBandTwoStyle,
            ]}
          />

          <Animated.View
            style={[
              styles.topBar,
              { paddingTop: insets.top + Spacing.md },
              topBarAnimatedStyle,
            ]}
          >
            <View style={styles.topCopy}>
              <Text style={styles.topLabel}>Profile setup</Text>
              <Text style={styles.stepCount}>
                Step {currentStep + 1} of {ONBOARDING_STEPS}
              </Text>
              <View style={styles.progressTrack}>
                <Animated.View
                  style={[styles.progressFill, progressFillAnimatedStyle]}
                />
              </View>
            </View>
            {/* <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Skip onboarding"
              activeOpacity={0.78}
              disabled={isLoading}
              onPress={() => completeOnboarding({ useDefaults: true })}
              style={styles.skipButton}
            >
              {isLoading ? (
                <ActivityIndicator color={Colors.textSecondary} size="small" />
              ) : (
                <Ionicons name="close" size={21} color={Colors.textPrimary} />
              )}
            </TouchableOpacity> */}
          </Animated.View>

          <ScrollView
            contentContainerStyle={[
              styles.scrollContent,
              { paddingTop: headerHeight * 0.42, paddingBottom: 116 },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            style={[styles.scrollView, { height: scrollViewHeight }]}
          >
            <View style={styles.scrollSheet}>
              <View style={styles.sheetHandle} />
              <View style={styles.stepper}>
                {STEP_THEMES.map((step, index) => {
                  const stepIndex = index as StepIndex;
                  const state =
                    index < currentStep
                      ? "completed"
                      : index === currentStep
                        ? "active"
                        : "inactive";
                  return (
                    <StepperItem
                      key={step.title}
                      accent={step.accent}
                      contentStyle={
                        index === currentStep ? contentAnimatedStyle : undefined
                      }
                      description={step.description}
                      error={index === currentStep ? serverError : ""}
                      icon={step.icon}
                      isFirst={index === 0}
                      isLast={index === STEP_THEMES.length - 1}
                      onPress={() => {
                        if (!isLoading && index < currentStep) {
                          setServerError("");
                          animateToStep(stepIndex);
                        }
                      }}
                      rowStyle={
                        index === currentStep ? stepRowAnimatedStyle : undefined
                      }
                      showContent={index === currentStep}
                      state={state}
                      title={step.title}
                    >
                      {index === 0 ? (
                        <ProfileBasicsStep
                          accent={step.accent}
                          birthDate={birthDate}
                          gender={gender}
                          name={name}
                          onChangeBirthDate={setBirthDate}
                          onChangeGender={setGender}
                          onChangeName={setName}
                          onChangeUsername={(value) =>
                            setUsername(value.toLowerCase())
                          }
                          username={username}
                        />
                      ) : null}
                      {index === 1 ? (
                        <ProfilePhotosStep
                          accent={step.accent}
                          onAddPhotos={pickProfilePhotos}
                          onMakePrimary={makePrimaryPhoto}
                          onRemovePhoto={removeProfilePhoto}
                          photos={profilePhotos}
                        />
                      ) : null}
                      {index === 2 ? (
                        <BioStep
                          accent={step.accent}
                          bio={bio}
                          onChangeBio={setBio}
                        />
                      ) : null}
                      {index === 3 ? (
                        <LookingForStep
                          accent={step.accent}
                          onSelectLookingFor={setSelectedLookingFor}
                          selectedLookingFor={selectedLookingFor}
                        />
                      ) : null}
                      {index === 4 ? (
                        <InterestsStep
                          accent={step.accent}
                          onToggleInterest={(interest) =>
                            setSelectedInterests((values) =>
                              toggleValue(values, interest),
                            )
                          }
                          selectedInterests={selectedInterests}
                        />
                      ) : null}
                      {index === 5 ? (
                        <PermissionsStep
                          accent={step.accent}
                          onChangePermissions={setPermissions}
                          permissions={permissions}
                        />
                      ) : null}
                    </StepperItem>
                  );
                })}
              </View>
            </View>
          </ScrollView>

          <Animated.View style={[styles.bottomBar, bottomBarAnimatedStyle]}>
            {currentStep > 0 ? (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Go back"
                activeOpacity={0.82}
                disabled={isLoading}
                onPress={handleBack}
                style={styles.backButton}
              >
                <Ionicons
                  name="chevron-back"
                  size={20}
                  color={Colors.textPrimary}
                />
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              accessibilityRole="button"
              activeOpacity={0.86}
              disabled={isLoading}
              onPress={handleNext}
              style={[
                styles.primaryButton,
                { backgroundColor: activeTheme.accent },
                currentStep === 0 && styles.primaryButtonFull,
              ]}
            >
              {isLoading ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <>
                  <Text style={styles.primaryButtonText}>
                    {currentStep === ONBOARDING_STEPS - 1
                      ? "Complete Profile"
                      : "Continue"}
                  </Text>
                  <Ionicons
                    name="arrow-forward"
                    size={19}
                    color={Colors.white}
                  />
                </>
              )}
            </TouchableOpacity>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
      {showCompletionAnimation ? (
        <View style={styles.completionOverlay}>
          <LinearGradient
            colors={["#EEF2FF", "#DDE6FF", "#FFFFFF"]}
            locations={[0, 0.58, 1]}
            style={StyleSheet.absoluteFillObject}
          />
          <Animated.View
            pointerEvents="none"
            style={[styles.completionHalo, completionHaloAnimatedStyle]}
          />
          <Animated.View
            style={[styles.completionCard, completionCardAnimatedStyle]}
          >
            <Animated.View
              style={[
                styles.completionCheck,
                { backgroundColor: activeTheme.accent },
                completionCheckAnimatedStyle,
              ]}
            >
              <Ionicons name="checkmark" size={44} color={Colors.white} />
            </Animated.View>
            <Text style={styles.completionEyebrow}>PROFILE COMPLETE</Text>
            <Text style={styles.completionTitle}>Setting up your account</Text>
            <Text style={styles.completionDescription}>
              Saving your profile, preferences, and discovery settings.
            </Text>
            <View style={styles.completionProgressTrack}>
              <Animated.View
                style={[
                  styles.completionProgressFill,
                  { backgroundColor: activeTheme.accent },
                  completionFillAnimatedStyle,
                ]}
              />
            </View>
            <View style={styles.completionStatusRow}>
              <ActivityIndicator size="small" color={activeTheme.accent} />
              <Text style={styles.completionStatusText}>
                Preparing your matches…
              </Text>
            </View>
          </Animated.View>
        </View>
      ) : null}
    </Animated.View>
  );
}

function StepperItem({
  accent,
  children,
  contentStyle,
  description,
  error,
  icon,
  isFirst,
  isLast,
  onPress,
  rowStyle,
  showContent,
  state,
  title,
}: {
  accent: string;
  children: React.ReactNode;
  contentStyle?: object;
  description: string;
  error?: string;
  icon: keyof typeof Ionicons.glyphMap;
  isFirst: boolean;
  isLast: boolean;
  onPress: () => void;
  rowStyle?: object;
  showContent: boolean;
  state: "active" | "completed" | "inactive";
  title: string;
}) {
  const active = state === "active";
  const completed = state === "completed";
  const expanded = active || showContent;
  const highlighted = active || showContent;
  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      disabled={active}
      layout={STEP_LAYOUT_TRANSITION}
      onPress={onPress}
      style={[styles.stepItem, rowStyle]}
    >
      <View style={styles.stepRail}>
        <View
          style={[
            styles.railLine,
            styles.railLineTop,
            isFirst && styles.railLineHidden,
          ]}
        />
        <View
          style={[
            styles.stepIcon,
            highlighted && { backgroundColor: accent, borderColor: accent },
            completed &&
              !highlighted && {
                backgroundColor: Colors.textPrimary,
                borderColor: Colors.textPrimary,
              },
          ]}
        >
          <Ionicons
            name={completed && !highlighted ? "checkmark" : icon}
            size={highlighted ? 21 : 17}
            color={highlighted || completed ? Colors.white : Colors.textMuted}
          />
        </View>
        <View
          style={[
            styles.railLine,
            styles.railLineBottom,
            isLast && styles.railLineHidden,
            (completed || active) && {
              backgroundColor: active ? `${accent}66` : accent,
            },
          ]}
        />
      </View>
      <Animated.View
        layout={STEP_LAYOUT_TRANSITION}
        style={[styles.stepBody, expanded && styles.stepBodyActive]}
      >
        <View style={styles.stepHeader}>
          <Text
            style={[
              styles.stepTitle,
              expanded && styles.stepTitleActive,
              completed && !expanded && styles.stepTitleDone,
            ]}
          >
            {title}
          </Text>
        </View>
        {showContent ? (
          <Animated.View style={contentStyle}>
            <Text style={styles.stepDescription}>{description}</Text>
            <View
              style={[styles.activeContent, { borderColor: `${accent}24` }]}
            >
              {children}
            </View>
            {error ? (
              <View style={styles.errorBanner}>
                <Ionicons
                  name="alert-circle-outline"
                  size={17}
                  color={Colors.error}
                />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}
          </Animated.View>
        ) : null}
      </Animated.View>
    </AnimatedPressable>
  );
}
function ProfileBasicsStep({
  accent,
  birthDate,
  gender,
  name,
  onChangeBirthDate,
  onChangeGender,
  onChangeName,
  onChangeUsername,
  username,
}: {
  accent: string;
  birthDate: string;
  gender: Gender;
  name: string;
  onChangeBirthDate: (value: string) => void;
  onChangeGender: (value: Gender) => void;
  onChangeName: (value: string) => void;
  onChangeUsername: (value: string) => void;
  username: string;
}) {
  const usernameSuggestions = getUsernameSuggestions(name);

  return (
    <View style={styles.formStack}>
      <SoftInput
        autoCapitalize="words"
        autoCorrect={false}
        icon="person-outline"
        label="Name"
        maxLength={50}
        onChangeText={onChangeName}
        placeholder="Your name"
        value={name}
      />
      <SoftInput
        autoCapitalize="none"
        autoCorrect={false}
        icon="at-outline"
        label="Username"
        onChangeText={onChangeUsername}
        placeholder="yourname"
        value={username}
      />
      {usernameSuggestions.length ? (
        <View style={styles.usernameSuggestions}>
          <Text style={styles.suggestionLabel}>Suggested usernames</Text>
          <View style={styles.chipGroup}>
            {usernameSuggestions.map((suggestion) => (
              <Chip
                key={suggestion}
                accent={accent}
                active={username === suggestion}
                label={`@${suggestion}`}
                onPress={() => onChangeUsername(suggestion)}
              />
            ))}
          </View>
        </View>
      ) : null}
      <BirthDateCalendar
        accent={accent}
        onChangeDate={onChangeBirthDate}
        value={birthDate}
      />
      <View style={styles.chipGroup}>
        {GENDER_OPTIONS.map((option) => (
          <Chip
            key={option.value}
            active={gender === option.value}
            accent={accent}
            label={option.label}
            onPress={() => onChangeGender(option.value)}
          />
        ))}
      </View>
    </View>
  );
}

function ProfilePhotosStep({
  accent,
  onAddPhotos,
  onMakePrimary,
  onRemovePhoto,
  photos,
}: {
  accent: string;
  onAddPhotos: () => void;
  onMakePrimary: (uri: string) => void;
  onRemovePhoto: (uri: string) => void;
  photos: ProfilePhoto[];
}) {
  return (
    <View>
      <View style={styles.photoGrid}>
        {photos.map((photo, index) => (
          <Pressable
            key={photo.uri}
            accessibilityRole="button"
            accessibilityLabel={index === 0 ? "Primary profile photo" : "Make primary profile photo"}
            onPress={() => onMakePrimary(photo.uri)}
            style={[styles.photoTile, index === 0 && { borderColor: accent }]}
          >
            <Image source={{ uri: photo.uri }} style={styles.photoTileImage} />
            <LinearGradient
              colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.58)"]}
              style={styles.photoTileOverlay}
            />
            {index === 0 ? (
              <View style={[styles.primaryPhotoBadge, { backgroundColor: accent }]}> 
                <Ionicons name="person" size={13} color={Colors.white} />
                <Text style={styles.primaryPhotoText}>Profile</Text>
              </View>
            ) : null}
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Remove photo"
              activeOpacity={0.8}
              onPress={() => onRemovePhoto(photo.uri)}
              style={styles.removePhotoButton}
            >
              <Ionicons name="close" size={15} color={Colors.white} />
            </TouchableOpacity>
          </Pressable>
        ))}
        {photos.length < 3 ? (
          <TouchableOpacity
            accessibilityRole="button"
            activeOpacity={0.82}
            onPress={onAddPhotos}
            style={[styles.addPhotoTile, { borderColor: `${accent}55` }]}
          >
            <View style={[styles.addPhotoIcon, { backgroundColor: `${accent}18` }]}> 
              <Ionicons name="add" size={24} color={accent} />
            </View>
            <Text style={[styles.addPhotoText, { color: accent }]}>Add photo</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      <Text style={styles.helperText}>
        {photos.length}/3 selected. Tap a photo to make it your profile image.
      </Text>
    </View>
  );
}
function BioStep({
  accent,
  bio,
  onChangeBio,
}: {
  accent: string;
  bio: string;
  onChangeBio: (value: string) => void;
}) {
  return (
    <View>
      <View
        style={[
          styles.textAreaWrap,
          { borderColor: bio ? `${accent}44` : "rgba(28,28,28,0.08)" },
        ]}
      >
        <TextInput
          maxLength={180}
          multiline
          onChangeText={onChangeBio}
          placeholder="A warm line about what you love, where you wander, or the kind of conversations you enjoy."
          placeholderTextColor={Colors.textMuted}
          style={styles.textArea}
          textAlignVertical="top"
          value={bio}
        />
      </View>
      <Text style={styles.counterText}>{bio.length}/180</Text>
    </View>
  );
}

function LookingForStep({
  accent,
  onSelectLookingFor,
  selectedLookingFor,
}: {
  accent: string;
  onSelectLookingFor: (value: LookingFor) => void;
  selectedLookingFor: LookingFor;
}) {
  return (
    <View style={styles.chipGroup}>
      {LOOKING_FOR_OPTIONS.map((option) => (
        <Chip
          key={option.label}
          active={selectedLookingFor === option.label}
          accent={accent}
          icon={option.icon}
          label={option.label}
          onPress={() => onSelectLookingFor(option.label)}
        />
      ))}
    </View>
  );
}

function InterestsStep({
  accent,
  onToggleInterest,
  selectedInterests,
}: {
  accent: string;
  onToggleInterest: (interest: string) => void;
  selectedInterests: string[];
}) {
  return (
    <View>
      <View style={styles.chipGroup}>
        {INTEREST_OPTIONS.map((interest) => (
          <Chip
            key={interest}
            active={selectedInterests.includes(interest)}
            accent={accent}
            label={interest}
            onPress={() => onToggleInterest(interest)}
          />
        ))}
      </View>
      <Text style={styles.helperText}>
        Pick at least three. You can change these later.
      </Text>
    </View>
  );
}

function PermissionsStep({
  accent,
  onChangePermissions,
  permissions,
}: {
  accent: string;
  onChangePermissions: (permissions: PermissionState) => void;
  permissions: PermissionState;
}) {
  return (
    <View style={styles.formStack}>
      <PermissionRow
        accent={accent}
        description="Show distance and make nearby discovery feel relevant."
        icon="location-outline"
        onPress={() =>
          onChangePermissions({
            ...permissions,
            location: !permissions.location,
          })
        }
        title="Enable location"
        value={permissions.location}
      />
      <PermissionRow
        accent={accent}
        description="Get a gentle nudge for matches, messages, and profile activity."
        icon="notifications-outline"
        onPress={() =>
          onChangePermissions({
            ...permissions,
            notifications: !permissions.notifications,
          })
        }
        title="Enable notifications"
        value={permissions.notifications}
      />
    </View>
  );
}

function SoftInput({
  icon,
  label,
  ...inputProps
}: React.ComponentProps<typeof TextInput> & {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}) {
  return (
    <View style={styles.inputWrap}>
      <View style={styles.inputLabelRow}>
        <Ionicons name={icon} size={16} color={Colors.textSecondary} />
        <Text style={styles.inputLabel}>{label}</Text>
      </View>
      <TextInput
        placeholderTextColor={Colors.textMuted}
        style={styles.input}
        {...inputProps}
      />
    </View>
  );
}

function Chip({
  accent,
  active,
  icon,
  label,
  onPress,
}: {
  accent: string;
  active: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      activeOpacity={0.76}
      onPress={onPress}
      style={[
        styles.chip,
        active && {
          backgroundColor: accent,
          borderColor: accent,
          shadowColor: accent,
          shadowOpacity: 0.2,
        },
      ]}
    >
      {icon ? (
        <Ionicons
          name={icon}
          size={16}
          color={active ? Colors.white : Colors.textSecondary}
          style={styles.chipIcon}
        />
      ) : null}
      <Text style={[styles.chipText, active && styles.chipTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function PermissionRow({
  accent,
  description,
  icon,
  onPress,
  title,
  value,
}: {
  accent: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  title: string;
  value: boolean;
}) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={{ checked: value }}
      activeOpacity={0.8}
      onPress={onPress}
      style={[styles.permissionRow, value && { borderColor: `${accent}55` }]}
    >
      <View style={[styles.permissionIcon, { backgroundColor: `${accent}18` }]}>
        <Ionicons name={icon} size={21} color={accent} />
      </View>
      <View style={styles.permissionCopy}>
        <Text style={styles.permissionTitle}>{title}</Text>
        <Text style={styles.permissionDescription}>{description}</Text>
      </View>
      <View
        style={[
          styles.permissionCheck,
          value && { backgroundColor: accent, borderColor: accent },
        ]}
      >
        {value ? (
          <Ionicons name="checkmark" size={14} color={Colors.white} />
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: Colors.white, flex: 1 },
  keyboardView: { flex: 1 },
  backgroundWrap: { backgroundColor: Colors.white, flex: 1 },
  topBar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  ambientBand: {
    borderRadius: Radius.full,
    opacity: 0.18,
    position: "absolute",
  },
  ambientBandOne: {
    height: 180,
    right: -58,
    top: 76,
    width: 180,
  },
  ambientBandTwo: {
    height: 132,
    left: -42,
    top: 148,
    width: 132,
  },
  topCopy: {
    flex: 1,
    paddingRight: Spacing.md,
  },
  topLabel: {
    color: Colors.textPrimary,
    fontFamily: FontFamily.bold,
    fontSize: FontSize.base,
  },
  stepCount: {
    color: Colors.textSecondary,
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    marginTop: 3,
  },
  skipButton: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.76)",
    borderColor: "rgba(28,28,28,0.08)",
    borderRadius: Radius.full,
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  progressTrack: {
    backgroundColor: "rgba(28,28,28,0.12)",
    borderRadius: Radius.full,
    height: 5,
    marginTop: Spacing.sm,
    overflow: "hidden",
    width: "100%",
  },
  progressFill: {
    backgroundColor: Colors.textPrimary,
    borderRadius: Radius.full,
    height: "100%",
    width: "100%",
  },
  scrollContent: { flexGrow: 1, paddingHorizontal: Spacing.lg },
  scrollView: { alignSelf: "stretch" },
  scrollSheet: { alignSelf: "stretch" },
  sheetHandle: { display: "none" },
  stepper: { alignSelf: "stretch" },
  stepItem: { flexDirection: "row", minHeight: 62 },
  stepRail: { alignItems: "center", width: 38 },
  railLine: { backgroundColor: "rgba(28,28,28,0.1)", width: 2 },
  railLineTop: { height: 14 },
  railLineBottom: { flex: 1 },
  railLineHidden: { opacity: 0 },
  stepIcon: {
    alignItems: "center",
    backgroundColor: Colors.white,
    borderColor: "rgba(28,28,28,0.12)",
    borderRadius: Radius.full,
    borderWidth: 1,
    height: 34,
    justifyContent: "center",
    shadowColor: Colors.black,
    shadowOffset: { height: 6, width: 0 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    width: 34,
  },
  stepBody: {
    flex: 1,
    paddingBottom: Spacing.md,
    paddingLeft: Spacing.md,
    paddingTop: 0,
  },
  stepBodyActive: { paddingBottom: Spacing.md, paddingTop: 0 },
  stepHeader: {
    justifyContent: "center",
    minHeight: 62,
  },
  activePill: {
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: Radius.full,
    flexDirection: "row",
    marginBottom: Spacing.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  activePillDot: {
    borderRadius: Radius.full,
    height: 6,
    marginRight: 6,
    width: 6,
  },
  activePillText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xs,
    letterSpacing: 0.2,
    textTransform: "uppercase",
  },
  stepTitle: {
    color: Colors.textMuted,
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.base,
    lineHeight: 22,
    maxWidth: 300,
  },
  stepTitleActive: {
    color: Colors.textPrimary,
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xl,
    lineHeight: 28,
  },
  stepTitleDone: { color: Colors.textPrimary },
  stepDescription: {
    color: Colors.textSecondary,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.base,
    lineHeight: 23,
    marginTop: 0,
    maxWidth: 314,
  },
  activeContent: {
    backgroundColor: "rgba(255,255,255,0.72)",
    borderRadius: Radius.xl,
    borderWidth: 1,
    marginTop: Spacing.lg,
    padding: Spacing.md,
    shadowColor: Colors.black,
    shadowOffset: { height: 18, width: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 30,
  },
  photoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  photoTile: {
    aspectRatio: 0.78,
    backgroundColor: "rgba(255,255,255,0.9)",
    borderColor: "rgba(28,28,28,0.1)",
    borderRadius: Radius.lg,
    borderWidth: 2,
    flexBasis: "30%",
    flexGrow: 1,
    maxWidth: "31.5%",
    minHeight: 138,
    overflow: "hidden",
  },
  photoTileImage: {
    height: "100%",
    width: "100%",
  },
  photoTileOverlay: {
    bottom: 0,
    height: "56%",
    left: 0,
    position: "absolute",
    right: 0,
  },
  primaryPhotoBadge: {
    alignItems: "center",
    borderRadius: Radius.full,
    bottom: 8,
    flexDirection: "row",
    gap: 4,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    position: "absolute",
  },
  primaryPhotoText: {
    color: Colors.white,
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xs,
  },
  removePhotoButton: {
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.48)",
    borderRadius: Radius.full,
    height: 28,
    justifyContent: "center",
    position: "absolute",
    right: 8,
    top: 8,
    width: 28,
  },
  addPhotoTile: {
    alignItems: "center",
    aspectRatio: 0.78,
    backgroundColor: "rgba(255,255,255,0.74)",
    borderRadius: Radius.lg,
    borderStyle: "dashed",
    borderWidth: 1.5,
    flexBasis: "30%",
    flexGrow: 1,
    justifyContent: "center",
    maxWidth: "31.5%",
    minHeight: 138,
    padding: Spacing.sm,
  },
  addPhotoIcon: {
    alignItems: "center",
    borderRadius: Radius.full,
    height: 42,
    justifyContent: "center",
    marginBottom: 8,
    width: 42,
  },
  addPhotoText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xs,
    textAlign: "center",
  },
  formStack: { gap: Spacing.md },
  inputWrap: {
    backgroundColor: "rgba(255,255,255,0.92)",
    borderColor: "rgba(28,28,28,0.08)",
    borderRadius: Radius.lg,
    borderWidth: 1,
    minHeight: 70,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  inputLabelRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    marginBottom: 4,
  },
  inputLabel: {
    color: Colors.textSecondary,
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xs,
    textTransform: "uppercase",
  },
  input: {
    color: Colors.textPrimary,
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.md,
    minHeight: 34,
    padding: 0,
  },
  usernameSuggestions: {
    gap: Spacing.sm,
    marginTop: -Spacing.xs,
  },
  suggestionLabel: {
    color: Colors.textMuted,
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xs,
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  textAreaWrap: {
    backgroundColor: "rgba(255,255,255,0.94)",
    borderRadius: Radius.lg,
    borderWidth: 1,
    minHeight: 148,
    padding: Spacing.md,
  },
  textArea: {
    color: Colors.textPrimary,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.base,
    lineHeight: 23,
    minHeight: 116,
    padding: 0,
  },
  counterText: {
    color: Colors.textMuted,
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    marginTop: Spacing.sm,
    textAlign: "right",
  },
  chipGroup: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm },
  chip: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.9)",
    borderColor: "rgba(28,28,28,0.1)",
    borderRadius: Radius.full,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: Spacing.md,
    shadowColor: Colors.black,
    shadowOffset: { height: 8, width: 0 },
    shadowOpacity: 0.03,
    shadowRadius: 14,
  },
  chipIcon: { marginRight: 6 },
  chipText: {
    color: Colors.textSecondary,
    fontFamily: FontFamily.bold,
    fontSize: FontSize.sm,
  },
  chipTextActive: { color: Colors.white },
  helperText: {
    color: Colors.textMuted,
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    lineHeight: 18,
    marginTop: Spacing.md,
  },
  permissionRow: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.94)",
    borderColor: "rgba(28,28,28,0.08)",
    borderRadius: Radius.lg,
    borderWidth: 1,
    flexDirection: "row",
    minHeight: 82,
    padding: Spacing.md,
  },
  permissionIcon: {
    alignItems: "center",
    borderRadius: Radius.full,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  permissionCopy: { flex: 1, paddingHorizontal: Spacing.md },
  permissionTitle: {
    color: Colors.textPrimary,
    fontFamily: FontFamily.bold,
    fontSize: FontSize.base,
  },
  permissionDescription: {
    color: Colors.textSecondary,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    lineHeight: 19,
    marginTop: 3,
  },
  permissionCheck: {
    alignItems: "center",
    borderColor: "rgba(28,28,28,0.14)",
    borderRadius: Radius.full,
    borderWidth: 1,
    height: 26,
    justifyContent: "center",
    width: 26,
  },
  errorBanner: {
    alignItems: "center",
    backgroundColor: Colors.error + "12",
    borderColor: Colors.error + "44",
    borderRadius: Radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.md,
    padding: Spacing.sm,
  },
  errorText: {
    color: Colors.error,
    flex: 1,
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    lineHeight: 18,
  },
  bottomBar: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.92)",
    borderTopColor: "rgba(28,28,28,0.06)",
    borderTopWidth: 1,
    bottom: 0,
    flexDirection: "row",
    gap: Spacing.sm,
    left: 0,
    paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    position: "absolute",
    right: 0,
  },
  backButton: {
    alignItems: "center",
    backgroundColor: Colors.white,
    borderColor: "rgba(28,28,28,0.1)",
    borderRadius: Radius.full,
    borderWidth: 1,
    height: 54,
    justifyContent: "center",
    width: 54,
  },
  primaryButton: {
    alignItems: "center",
    borderRadius: Radius.full,
    flex: 1,
    flexDirection: "row",
    gap: Spacing.sm,
    justifyContent: "center",
    minHeight: 54,
    shadowColor: Colors.black,
    shadowOffset: { height: 12, width: 0 },
    shadowOpacity: 0.16,
    shadowRadius: 20,
  },
  primaryButtonFull: { marginLeft: 0 },
  primaryButtonText: {
    color: Colors.white,
    fontFamily: FontFamily.bold,
    fontSize: FontSize.base,
  },
  completionOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
    zIndex: 100,
  },
  completionHalo: {
    position: "absolute",
    width: 290,
    height: 290,
    borderRadius: 145,
    backgroundColor: "#84A0FF",
  },
  completionCard: {
    width: "100%",
    maxWidth: 360,
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
    paddingVertical: 34,
    borderRadius: Radius.xl,
    backgroundColor: "rgba(255,255,255,0.94)",
    borderWidth: 1,
    borderColor: "rgba(24,57,194,0.12)",
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 22 },
    shadowOpacity: 0.14,
    shadowRadius: 36,
    elevation: 12,
  },
  completionCheck: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
    shadowColor: "#1839C2",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.24,
    shadowRadius: 20,
    elevation: 8,
  },
  completionEyebrow: {
    color: "#1839C2",
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xs,
    letterSpacing: 1.5,
  },
  completionTitle: {
    color: Colors.textPrimary,
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xl,
    lineHeight: 30,
    marginTop: Spacing.sm,
    textAlign: "center",
  },
  completionDescription: {
    color: Colors.textSecondary,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    lineHeight: 20,
    marginTop: Spacing.sm,
    textAlign: "center",
  },
  completionProgressTrack: {
    width: "100%",
    height: 7,
    marginTop: Spacing.xl,
    overflow: "hidden",
    borderRadius: Radius.full,
    backgroundColor: "rgba(24,57,194,0.1)",
  },
  completionProgressFill: {
    height: "100%",
    borderRadius: Radius.full,
  },
  completionStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  completionStatusText: {
    color: Colors.textSecondary,
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
  },
});
const compressProfilePhoto = async (uri: string) => {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 1200 } }],
    { compress: 0.78, format: ImageManipulator.SaveFormat.JPEG },
  );
  return result.uri;
};

const uploadProfilePhotos = async (photos: ProfilePhoto[]) => {
  const urls: string[] = [];
  for (const photo of photos.slice(0, 3)) {
    const url = await postService.uploadMedia(photo.uri, photo.mimeType);
    if (url) urls.push(url);
  }
  return urls;
};

const getOnboardingErrorMessage = (error: any) => {
  const message =
    error?.response?.data?.message ??
    "Unable to save onboarding. Please try again.";
  return Array.isArray(message) ? message[0] : message;
};
async function getLocationPayload() {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (permission.status !== Location.PermissionStatus.GRANTED) return {};
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
  return { latitude, longitude, ...(location && { location }) };
}

const clampStep = (step: number): StepIndex =>
  Math.min(Math.max(step, 0), ONBOARDING_STEPS - 1) as StepIndex;
const toggleValue = (values: string[], value: string) =>
  values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];

const validateStep = ({
  birthDate,
  bio,
  currentStep,
  name,
  profilePhotos,
  selectedInterests,
  username,
}: {
  birthDate: string;
  bio: string;
  currentStep: StepIndex;
  name: string;
  profilePhotos: ProfilePhoto[];
  selectedInterests: string[];
  username: string;
}) => {
  if (currentStep === 0) return validateProfileBasics(name, username, birthDate);
  if (currentStep === 1 && profilePhotos.length < 1)
    return "Add at least one profile photo.";
  if (currentStep === 2 && bio.trim().length < 12)
    return "Write a bio with at least 12 characters.";
  if (currentStep === 4 && selectedInterests.length < 3)
    return "Pick at least three interests.";
  return "";
};

const validateProfileBasics = (
  name: string,
  username: string,
  birthDate: string,
) => {
  if (name.trim().length < 2) return "Enter your name.";
  const normalizedUsername = username.trim().toLowerCase();
  if (normalizedUsername.length < 3 || normalizedUsername.length > 20)
    return "Username must be between 3 and 20 characters.";
  if (!/^[a-z0-9]+([._]?[a-z0-9]+)*$/.test(normalizedUsername))
    return "Username can use lowercase letters, numbers, dots, and underscores.";
  const birthday = parseBirthDate(birthDate);
  if (!birthday) return "Enter a valid birth date.";
  const today = new Date();
  let age = today.getFullYear() - birthday.getUTCFullYear();
  const monthDiff = today.getMonth() - birthday.getUTCMonth();
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthday.getUTCDate())
  )
    age -= 1;
  if (age < 18) return "You must be at least 18 years old.";
  return "";
};

const getUsernameSuggestions = (name: string) => {
  const parts = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .match(/[a-z0-9]+/g);
  if (!parts?.length || name.trim().length < 2) return [];

  const first = parts[0];
  const last = parts.at(-1) ?? "";
  const joined = parts.join("");
  const seed = Array.from(joined).reduce(
    (total, character) => total + character.charCodeAt(0),
    0,
  );
  const suffix = String((seed % 90) + 10);
  const candidates = [
    joined,
    parts.join("."),
    parts.join("_"),
    `${first}${last.charAt(0)}${suffix}`,
  ];

  return Array.from(new Set(candidates))
    .map((candidate) =>
      candidate.length < 3 ? `${candidate}${suffix}` : candidate,
    )
    .filter((candidate) => candidate.length <= 20)
    .slice(0, 4);
};

const parseBirthDate = (birthDate: string) => {
  const trimmed = birthDate.trim();
  const usMatch = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(trimmed);
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  const year = usMatch
    ? Number(usMatch[3])
    : isoMatch
      ? Number(isoMatch[1])
      : 0;
  const month = usMatch
    ? Number(usMatch[1])
    : isoMatch
      ? Number(isoMatch[2])
      : 0;
  const day = usMatch ? Number(usMatch[2]) : isoMatch ? Number(isoMatch[3]) : 0;
  if (!year || !month || !day || month > 12 || day > 31) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  )
    return null;
  return date;
};

const toBackendBirthDate = (birthDate: string) =>
  (parseBirthDate(birthDate) ?? new Date()).toISOString();

const wait = (duration: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, duration));
