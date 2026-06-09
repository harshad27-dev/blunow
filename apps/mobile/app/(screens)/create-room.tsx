import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { Colors } from "@/constants/colors";
import { Radius, Spacing } from "@/constants/spacing";
import { FontFamily, FontSize } from "@/constants/typography";

export default function CreateRoomScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => router.back()}
          activeOpacity={0.82}
        >
          <Ionicons name="chevron-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Create room</Text>
        <View style={styles.iconButtonSpacer} />
      </View>

      <View style={styles.content}>
        <View style={styles.iconWrap}>
          <Ionicons name="chatbubbles-outline" size={34} color={Colors.textInverse} />
        </View>
        <Text style={styles.heading}>Room creation is coming soon</Text>
        <Text style={styles.body}>
          Start from Rooms for now. This route is ready for the full creation flow.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  body: {
    color: Colors.textSecondary,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.base,
    lineHeight: 22,
    marginTop: Spacing.sm,
    maxWidth: 300,
    textAlign: "center",
  },
  content: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: Spacing.lg,
  },
  header: {
    alignItems: "center",
    borderBottomColor: Colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  heading: {
    color: Colors.textPrimary,
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xl,
    marginTop: Spacing.md,
    textAlign: "center",
  },
  iconButton: {
    alignItems: "center",
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  iconButtonSpacer: {
    height: 44,
    width: 44,
  },
  iconWrap: {
    alignItems: "center",
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    height: 76,
    justifyContent: "center",
    width: 76,
  },
  screen: {
    backgroundColor: Colors.bg,
    flex: 1,
  },
  title: {
    color: Colors.textPrimary,
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.lg,
  },
});
