import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import { Colors } from '@/constants/colors';
import { FontFamily, FontSize } from '@/constants/typography';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';
import { Toast } from '@/components/common/Toast';
import { useAuthStore } from '@/store/authStore';
import { useUpdateProfileMutation } from '@/hooks/queries';
import { postService } from '@/services/post.service';
import { userService } from '@/services/user.service';

const schema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  bio: z.string().max(160, 'Bio must be less than 160 characters').optional(),
});

type FormData = z.infer<typeof schema>;

export default function EditProfileScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const updateProfileMutation = useUpdateProfileMutation();
  const [avatarUri, setAvatarUri] = useState<string | null>(user?.profile?.avatarUrl || null);
  const [avatarMimeType, setAvatarMimeType] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [toast, setToast] = useState<{
    visible: boolean;
    message: string;
    type: 'success' | 'error' | 'info';
  }>({
    visible: false,
    message: '',
    type: 'info',
  });

  const { control, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      username: user?.username || '',
      bio: user?.profile?.bio || '',
    },
  });

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      setAvatarUri(asset.uri);
      setAvatarMimeType(asset.mimeType || 'image/jpeg');
    }
  };

  const onSubmit = async (data: FormData) => {
    try {
      let finalAvatarUrl = user?.profile?.avatarUrl;

      if (avatarUri && avatarUri !== user?.profile?.avatarUrl) {
        setIsUploading(true);
        const uploadedUrl = await postService.uploadMedia(avatarUri, avatarMimeType || 'image/jpeg');
        if (uploadedUrl) {
          finalAvatarUrl = uploadedUrl;
        }
        setIsUploading(false);
      }

      await updateProfileMutation.mutateAsync({
        ...data,
        avatarUrl: finalAvatarUrl,
      });

      setToast({
        visible: true,
        message: 'Profile updated successfully',
        type: 'success',
      });
      
      // Delay back navigation to allow toast to be seen
      setTimeout(() => {
        router.back();
      }, 1500);
    } catch (error: any) {
      setToast({
        visible: true,
        message: error.message || 'Failed to update profile',
        type: 'error',
      });
      setIsUploading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.avatarSection}>
          <TouchableOpacity onPress={pickImage} activeOpacity={0.8}>
            <View style={styles.avatarWrapper}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatar} />
              ) : (
                <View style={styles.placeholderAvatar}>
                  <Ionicons name="person" size={50} color={Colors.textMuted} />
                </View>
              )}
              <View style={styles.editIconContainer}>
                <Ionicons name="camera" size={20} color={Colors.black} />
              </View>
            </View>
          </TouchableOpacity>
          <Text style={styles.changePhotoText}>Change Profile Photo</Text>
        </View>

        <View style={styles.formSection}>
          <Controller
            control={control}
            name="username"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Username"
                placeholder="Username"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                error={errors.username?.message}
                autoCapitalize="none"
              />
            )}
          />

          <Controller
            control={control}
            name="bio"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Bio"
                placeholder="Write something about yourself..."
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                error={errors.bio?.message}
                multiline
                numberOfLines={4}
                containerStyle={styles.bioInput}
              />
            )}
          />
        </View>

        <Button
          title="Save Changes"
          onPress={handleSubmit(onSubmit)}
          loading={updateProfileMutation.isPending || isUploading}
          style={styles.saveButton}
        />
      </ScrollView>

      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={() => setToast({ ...toast, visible: false })}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.lg,
    color: Colors.textPrimary,
  },
  container: {
    flex: 1,
  },
  content: {
    padding: 24,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.bgElevated,
  },
  placeholderAvatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  editIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: Colors.bg,
  },
  changePhotoText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 12,
  },
  formSection: {
    width: '100%',
  },
  bioInput: {
    height: 120,
    textAlignVertical: 'top',
  },
  saveButton: {
    marginTop: 24,
  },
});
