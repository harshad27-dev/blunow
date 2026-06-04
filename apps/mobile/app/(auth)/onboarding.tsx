import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { FontFamily, FontSize } from '@/constants/typography';
import { Spacing, Radius } from '@/constants/spacing';

export default function OnboardingScreen() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  const totalSteps = 3;

  const handleNext = async () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    } else {
      // Complete onboarding and navigate to main app
      setIsLoading(true);
      try {
        // TODO: Save onboarding data to backend
        router.replace('/(tabs)/discover');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleSkip = () => {
    router.replace('/(tabs)/discover');
  };

  return (
    <SafeAreaView className="flex-1 bg-[#050505]" edges={['top', 'bottom']}>
      <View className="flex-1 px-6 pt-6 pb-6">
        {/* Progress Bar */}
        <View className="mb-8 flex-row items-center gap-2">
          {Array.from({ length: totalSteps }).map((_, index) => (
            <View
              key={index}
              className={`h-1 flex-1 rounded-full ${
                index < currentStep ? 'bg-white' : 'bg-white/20'
              }`}
            />
          ))}
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1 }}
        >
          {currentStep === 1 && (
            <OnboardingStep1 />
          )}
          {currentStep === 2 && (
            <OnboardingStep2 />
          )}
          {currentStep === 3 && (
            <OnboardingStep3 />
          )}
        </ScrollView>

        {/* Action Buttons */}
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
                  {currentStep === totalSteps ? 'Get Started' : 'Next'}
                </Text>
                {currentStep < totalSteps && (
                  <Ionicons
                    name="arrow-forward"
                    size={18}
                    color={Colors.black}
                    style={{ marginLeft: 8 }}
                  />
                )}
              </>
            )}
          </TouchableOpacity>

          {currentStep > 1 && (
            <TouchableOpacity
              className="h-14 flex-row items-center justify-center rounded-full border border-white/10 bg-black/30"
              onPress={() => setCurrentStep(currentStep - 1)}
              activeOpacity={0.84}
            >
              <Text className="text-base font-bold text-white">Back</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={handleSkip}
            activeOpacity={0.6}
          >
            <Text className="text-center text-sm font-semibold text-white/60">
              Skip for now
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

// Step 1: Welcome
function OnboardingStep1() {
  return (
    <View className="flex-1 justify-center">
      <View className="mb-8 h-20 w-20 items-center justify-center rounded-full border border-white/10 bg-white/5">
        <Ionicons name="heart" size={40} color="white" />
      </View>

      <Text
        className="text-[42px] font-bold leading-[52px] text-white"
        style={{ fontFamily: FontFamily.darleston }}
      >
        Welcome to Blunow
      </Text>

      <Text className="mt-4 text-base leading-6 text-white/70">
        Let's set up your profile to find meaningful connections based on real values and intent.
      </Text>

      <View className="mt-8 gap-4">
        <OnboardingFeature
          icon="sparkles"
          title="Personality First"
          description="We show who you really are before photos"
        />
        <OnboardingFeature
          icon="shield-checkmark"
          title="Verified & Safe"
          description="Connect with real people in a respectful space"
        />
        <OnboardingFeature
          icon="people"
          title="Intentional Matching"
          description="Find people looking for the same thing"
        />
      </View>
    </View>
  );
}

// Step 2: Relationship Intent
function OnboardingStep2() {
  const [selectedIntent, setSelectedIntent] = useState<string | null>(null);

  const intents = [
    { id: 'serious', label: 'Serious Relationship', icon: 'heart' },
    { id: 'casual', label: 'Casual but Respectful', icon: 'sparkles' },
    { id: 'marriage', label: 'Marriage-Minded', icon: 'ring' },
    { id: 'friendship', label: 'Friendship First', icon: 'people' },
  ];

  return (
    <View className="flex-1 justify-center">
      <Text
        className="mb-2 text-4xl font-bold text-white"
        style={{ fontFamily: FontFamily.darleston }}
      >
        What are you looking for?
      </Text>

      <Text className="mb-8 text-base leading-6 text-white/70">
        This helps us match you with people who share your intentions.
      </Text>

      <View className="gap-3">
        {intents.map((intent) => (
          <TouchableOpacity
            key={intent.id}
            className={`flex-row items-center rounded-2xl border-2 px-4 py-4 ${
              selectedIntent === intent.id
                ? 'border-white bg-white/10'
                : 'border-white/10 bg-black/30'
            }`}
            onPress={() => setSelectedIntent(intent.id)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={intent.icon as any}
              size={24}
              color="white"
              style={{ marginRight: 12 }}
            />
            <Text className="flex-1 text-base font-semibold text-white">
              {intent.label}
            </Text>
            {selectedIntent === intent.id && (
              <Ionicons name="checkmark-circle" size={24} color="white" />
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

// Step 3: Permissions & Completion
function OnboardingStep3() {
  const [permissions, setPermissions] = useState({
    location: false,
    notifications: false,
  });

  return (
    <View className="flex-1 justify-center">
      <Text
        className="mb-2 text-4xl font-bold text-white"
        style={{ fontFamily: FontFamily.darleston }}
      >
        Almost there!
      </Text>

      <Text className="mb-8 text-base leading-6 text-white/70">
        These permissions help us improve your experience.
      </Text>

      <View className="gap-3">
        <PermissionToggle
          icon="location"
          title="Location"
          description="Show distance and nearby people"
          value={permissions.location}
          onChange={(value) =>
            setPermissions({ ...permissions, location: value })
          }
        />
        <PermissionToggle
          icon="notifications"
          title="Notifications"
          description="Get notified about new matches and messages"
          value={permissions.notifications}
          onChange={(value) =>
            setPermissions({ ...permissions, notifications: value })
          }
        />
      </View>

      <View className="mt-8 flex-row items-start gap-3 rounded-2xl border border-white/10 bg-black/30 p-4">
        <Ionicons name="information-circle" size={20} color="#38BDF8" style={{ marginTop: 2 }} />
        <Text className="flex-1 text-xs leading-5 text-white/70">
          You can update these permissions anytime in your settings.
        </Text>
      </View>
    </View>
  );
}

// UI Components
function OnboardingFeature({
  icon,
  title,
  description,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
}) {
  return (
    <View className="flex-row items-start">
      <View className="mr-3 mt-1 h-6 w-6 items-center justify-center rounded-full bg-white/10">
        <Ionicons name={icon} size={14} color="white" />
      </View>
      <View className="flex-1">
        <Text className="font-bold text-white">{title}</Text>
        <Text className="mt-1 text-sm leading-4 text-white/70">
          {description}
        </Text>
      </View>
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
        value
          ? 'border-white bg-white/10'
          : 'border-white/10 bg-black/30'
      }`}
      onPress={() => onChange(!value)}
      activeOpacity={0.7}
    >
      <Ionicons
        name={icon as any}
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
          value
            ? 'border-white bg-white'
            : 'border-white/20 bg-white/10'
        }`}
      >
        {value && (
          <View className="absolute right-0.5 top-0.5 h-5 w-5 rounded-full bg-[#050505]" />
        )}
      </View>
    </TouchableOpacity>
  );
}
