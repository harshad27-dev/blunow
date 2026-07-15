import { useEffect, useState } from "react";
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";

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
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [newImageUris, setNewImageUris] = useState<string[]>([]);

  const { data, isLoading } = useQuery({
    queryKey: ["post", postId],
    queryFn: () => postService.getPost(postId),
    enabled: Boolean(postId),
  });

  useEffect(() => {
    if (data?.data?.caption !== undefined) setCaption(data.data.caption || "");
    if (data?.data?.mediaUrls) setMediaUrls(data.data.mediaUrls || []);
  }, [data]);

  const handlePickNewImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "We need access to your gallery to add photos.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: 5 - (mediaUrls.length + newImageUris.length),
      quality: 0.8,
    });

    if (!result.canceled && result.assets) {
      const selected = result.assets.map((asset) => asset.uri);
      setNewImageUris((prev) => [...prev, ...selected].slice(0, 5 - mediaUrls.length));
    }
  };

  const save = useMutation({
    mutationFn: async () => {
      // Upload new images first
      const newlyUploadedUrls: string[] = [];
      for (const uri of newImageUris) {
        const uploadedUrl = await postService.uploadMedia(uri);
        if (uploadedUrl) {
          newlyUploadedUrls.push(uploadedUrl);
        }
      }

      const finalUrls = [...mediaUrls, ...newlyUploadedUrls];
      const finalTypes = finalUrls.map(() => "IMAGE");

      return postService.updatePost(postId, {
        caption: caption.trim() || undefined,
        mediaUrls: finalUrls,
        mediaTypes: finalTypes as any,
      });
    },
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

      <Text style={[styles.label, { marginTop: Spacing.md }]}>Photos</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mediaContainer}>
        {/* Existing photos */}
        {mediaUrls.map((url) => (
          <View key={url} style={styles.mediaWrap}>
            <Image source={{ uri: url }} style={styles.mediaThumb} />
            <TouchableOpacity
              style={styles.deleteBadge}
              onPress={() => setMediaUrls((prev) => prev.filter((item) => item !== url))}
            >
              <Ionicons name="close" size={14} color="#FFF" />
            </TouchableOpacity>
          </View>
        ))}

        {/* New local photos */}
        {newImageUris.map((uri) => (
          <View key={uri} style={styles.mediaWrap}>
            <Image source={{ uri }} style={styles.mediaThumb} />
            <TouchableOpacity
              style={styles.deleteBadge}
              onPress={() => setNewImageUris((prev) => prev.filter((item) => item !== uri))}
            >
              <Ionicons name="close" size={14} color="#FFF" />
            </TouchableOpacity>
          </View>
        ))}

        {/* Add photo card */}
        {mediaUrls.length + newImageUris.length < 5 && (
          <TouchableOpacity style={styles.addCard} onPress={handlePickNewImage}>
            <Ionicons name="add" size={24} color={Colors.textMuted} />
            <Text style={styles.addCardText}>Add</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

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
    minHeight: 120,
    padding: Spacing.md,
    textAlignVertical: "top",
  },
  label: {
    color: Colors.textPrimary,
    fontFamily: FontFamily.bold,
    fontSize: FontSize.base,
    marginBottom: Spacing.sm,
  },
  mediaContainer: {
    flexDirection: "row",
    marginVertical: Spacing.xs,
  },
  mediaWrap: {
    width: 80,
    height: 80,
    borderRadius: Radius.md,
    overflow: "hidden",
    marginRight: Spacing.sm,
    position: "relative",
    borderColor: Colors.border,
    borderWidth: 1,
  },
  mediaThumb: {
    width: "100%",
    height: "100%",
  },
  deleteBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  addCard: {
    width: 80,
    height: 80,
    borderRadius: Radius.md,
    borderColor: Colors.border,
    borderWidth: 1,
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.bgCard,
  },
  addCardText: {
    color: Colors.textMuted,
    fontFamily: FontFamily.medium,
    fontSize: 10,
    marginTop: 2,
  },
  save: {
    alignItems: "center",
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    justifyContent: "center",
    marginTop: Spacing.xl,
    minHeight: 52,
  },
  saveText: {
    color: Colors.textInverse,
    fontFamily: FontFamily.bold,
    fontSize: FontSize.base,
  },
});
