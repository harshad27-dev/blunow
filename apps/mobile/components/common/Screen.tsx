import React from "react";
import {
  ScrollView,
  StatusBar,
  StyleProp,
  View,
  ViewStyle,
} from "react-native";
import {
  Edge,
  SafeAreaView,
} from "react-native-safe-area-context";
import { ScreenStyles } from "@/constants/screen";
import { useColorScheme } from "nativewind";

type ScreenProps = {
  children: React.ReactNode;
  edges?: Edge[];
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
};

type ScreenScrollProps = ScreenProps & {
  contentContainerStyle?: StyleProp<ViewStyle>;
  showsVerticalScrollIndicator?: boolean;
};

export function Screen({
  children,
  edges = ["top", "left", "right"],
  padded = false,
  style,
}: ScreenProps) {
  const { colorScheme } = useColorScheme();

  return (
    <SafeAreaView edges={edges} style={[ScreenStyles.root, style]}>
      <StatusBar barStyle={colorScheme === "dark" ? "light-content" : "dark-content"} />
      <View style={[ScreenStyles.fill, padded && ScreenStyles.padded]}>
        {children}
      </View>
    </SafeAreaView>
  );
}

export function ScreenScroll({
  children,
  edges = ["top", "left", "right"],
  padded = false,
  style,
  contentContainerStyle,
  showsVerticalScrollIndicator = false,
}: ScreenScrollProps) {
  const { colorScheme } = useColorScheme();

  return (
    <SafeAreaView edges={edges} style={[ScreenStyles.root, style]}>
      <StatusBar barStyle={colorScheme === "dark" ? "light-content" : "dark-content"} />
      <ScrollView
        style={ScreenStyles.fill}
        contentContainerStyle={[
          padded && ScreenStyles.padded,
          ScreenStyles.scrollContent,
          contentContainerStyle,
        ]}
        showsVerticalScrollIndicator={showsVerticalScrollIndicator}
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}
