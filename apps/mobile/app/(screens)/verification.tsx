import { useState } from "react";
import {
  Alert,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  InfoParagraph,
  SettingsScreen,
  SettingsSection,
} from "@/components/settings/SettingsUi";
import { Colors } from "@/constants/colors";
import { Radius, Spacing } from "@/constants/spacing";
import { FontFamily, FontSize } from "@/constants/typography";
import { postService } from "@/services/post.service";
import {
  userService,
  type VerificationRecord,
} from "@/services/user.service";

export default function VerificationScreen() {
  const queryClient = useQueryClient();
  const [idPhoto, setIdPhoto] = useState<string>();
  const [selfie, setSelfie] = useState<string>();
  const { data, isLoading } = useQuery({
    queryKey: ["verification"],
    queryFn: async () => {
      const response = await userService.getVerification();
      return (response?.data || null) as VerificationRecord | null;
    },
  });
  const submit = useMutation({
    mutationFn: async () => {
      if (!idPhoto || !selfie) throw new Error("Add both verification photos.");
      const [idPhotoUrl, selfieUrl] = await Promise.all([
        postService.uploadMedia(idPhoto),
        postService.uploadMedia(selfie),
      ]);
      if (!idPhotoUrl || !selfieUrl) throw new Error("Photo upload failed.");
      return userService.submitVerification(idPhotoUrl, selfieUrl);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["verification"] });
      Alert.alert("Submitted", "Your verification is now under review.");
      setIdPhoto(undefined);
      setSelfie(undefined);
    },
    onError: (error: Error) => {
      Alert.alert("Unable to submit", error.message);
    },
  });

  const choosePhoto = async (setter: (uri: string) => void) => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission needed", "Allow photo access to continue.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.9,
    });
    const uri = result.assets?.[0]?.uri;
    if (!result.canceled && uri) setter(uri);
  };

  const statusText = data?.status
    ? data.status.charAt(0) + data.status.slice(1).toLowerCase()
    : "Not submitted";

  return (
    <SettingsScreen title="Profile verification" loading={isLoading}>
      <InfoParagraph title="Show people you are real">
        Submit a clear photo of your ID and a current selfie. Verification media
        is used only to review your identity.
      </InfoParagraph>
      <View style={styles.status}>
        <Ionicons
          name={data?.status === "VERIFIED" ? "checkmark-circle" : "time-outline"}
          size={22}
          color={data?.status === "VERIFIED" ? Colors.success : Colors.warning}
        />
        <Text style={styles.statusText}>Status: {statusText}</Text>
      </View>
      {data?.rejectionReason ? (
        <Text style={styles.rejection}>{data.rejectionReason}</Text>
      ) : null}
      {data?.status !== "VERIFIED" ? (
        <>
          <SettingsSection title="Verification photos">
            <PhotoPicker
              title="Government ID"
              subtitle="Use a clear, readable image"
              uri={idPhoto}
              onPress={() => choosePhoto(setIdPhoto)}
            />
            <PhotoPicker
              title="Current selfie"
              subtitle="Face the camera in good lighting"
              uri={selfie}
              onPress={() => choosePhoto(setSelfie)}
            />
          </SettingsSection>
          <TouchableOpacity
            style={[
              styles.submit,
              (!idPhoto || !selfie || submit.isPending) && styles.disabled,
            ]}
            disabled={!idPhoto || !selfie || submit.isPending}
            onPress={() => submit.mutate()}
          >
            <Text style={styles.submitText}>
              {submit.isPending ? "Uploading..." : "Submit for review"}
            </Text>
          </TouchableOpacity>
        </>
      ) : null}
    </SettingsScreen>
  );
}

const PhotoPicker = ({
  title,
  subtitle,
  uri,
  onPress,
}: {
  title: string;
  subtitle: string;
  uri?: string;
  onPress: () => void;
}) => (
  <TouchableOpacity style={styles.photoRow} onPress={onPress}>
    {uri ? (
      <Image source={{ uri }} style={styles.preview} />
    ) : (
      <View style={styles.previewPlaceholder}>
        <Ionicons name="camera-outline" size={23} color={Colors.textSecondary} />
      </View>
    )}
    <View style={styles.copy}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
    <Ionicons name="add-circle-outline" size={22} color={Colors.textSecondary} />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  copy: { flex: 1, paddingHorizontal: Spacing.md },
  disabled: { opacity: 0.45 },
  photoRow: {
    alignItems: "center",
    borderBottomColor: Colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    minHeight: 84,
    padding: Spacing.md,
  },
  preview: { borderRadius: Radius.md, height: 52, width: 52 },
  previewPlaceholder: {
    alignItems: "center",
    backgroundColor: Colors.bgElevated,
    borderRadius: Radius.md,
    height: 52,
    justifyContent: "center",
    width: 52,
  },
  rejection: {
    color: Colors.error,
    fontFamily: FontFamily.medium,
    marginBottom: Spacing.md,
  },
  status: {
    alignItems: "center",
    backgroundColor: Colors.bgCard,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    borderWidth: 1,
    flexDirection: "row",
    marginBottom: Spacing.lg,
    padding: Spacing.md,
  },
  statusText: {
    color: Colors.textPrimary,
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.base,
    marginLeft: Spacing.sm,
  },
  submit: {
    alignItems: "center",
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    justifyContent: "center",
    minHeight: 52,
  },
  submitText: {
    color: Colors.textInverse,
    fontFamily: FontFamily.bold,
    fontSize: FontSize.base,
  },
  subtitle: {
    color: Colors.textSecondary,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    marginTop: 3,
  },
  title: {
    color: Colors.textPrimary,
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.base,
  },
});
