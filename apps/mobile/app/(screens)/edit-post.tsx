import { useEffect, useState } from "react";
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { SettingsScreen } from "@/components/settings/SettingsUi";
import { Colors } from "@/constants/colors";
import { Radius, Spacing } from "@/constants/spacing";
import { FontFamily, FontSize } from "@/constants/typography";
import { postService } from "@/services/post.service";

export default function EditPostScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { postId } = useLocalSearchParams<{ postId: string }>();
  const [caption, setCaption] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["post", postId],
    queryFn: () => postService.getPost(postId),
    enabled: Boolean(postId),
  });
  useEffect(() => {
    if (data?.data?.caption !== undefined) setCaption(data.data.caption || "");
  }, [data]);
  const save = useMutation({
    mutationFn: () => postService.updatePost(postId, { caption: caption.trim() }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["post", postId] }),
        queryClient.invalidateQueries({ queryKey: ["feed"] }),
        queryClient.invalidateQueries({ queryKey: ["user-posts"] }),
      ]);
      router.back();
    },
    onError: (error: any) => {
      Alert.alert(
        "Unable to save",
        error?.response?.data?.message || "Please try again.",
      );
    },
  });

  return (
    <SettingsScreen title="Edit post" loading={isLoading}>
      <Text style={styles.label}>Caption</Text>
      <TextInput
        style={styles.input}
        value={caption}
        onChangeText={setCaption}
        multiline
        maxLength={2000}
        placeholder="Write a caption"
        placeholderTextColor={Colors.textMuted}
      />
      <Text style={styles.count}>{caption.length}/2000</Text>
      <TouchableOpacity
        style={[styles.save, save.isPending && styles.disabled]}
        disabled={save.isPending}
        onPress={() => save.mutate()}
      >
        <Text style={styles.saveText}>
          {save.isPending ? "Saving..." : "Save changes"}
        </Text>
      </TouchableOpacity>
    </SettingsScreen>
  );
}

const styles = StyleSheet.create({
  count: {
    color: Colors.textMuted,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    marginTop: Spacing.xs,
    textAlign: "right",
  },
  disabled: { opacity: 0.5 },
  input: {
    backgroundColor: Colors.bgCard,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    borderWidth: 1,
    color: Colors.textPrimary,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.base,
    minHeight: 180,
    padding: Spacing.md,
    textAlignVertical: "top",
  },
  label: {
    color: Colors.textPrimary,
    fontFamily: FontFamily.bold,
    fontSize: FontSize.base,
    marginBottom: Spacing.sm,
  },
  save: {
    alignItems: "center",
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    justifyContent: "center",
    marginTop: Spacing.lg,
    minHeight: 52,
  },
  saveText: {
    color: Colors.textInverse,
    fontFamily: FontFamily.bold,
    fontSize: FontSize.base,
  },
});
