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
  return (
    <SafeAreaView edges={edges} style={[ScreenStyles.root, style]}>
      <StatusBar barStyle="light-content" />
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
  return (
    <SafeAreaView edges={edges} style={[ScreenStyles.root, style]}>
      <StatusBar barStyle="light-content" />
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
