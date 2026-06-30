import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { FontFamily, FontSize } from '@/constants/typography';

interface ProfileHeaderProps {
  username: string;
  bio?: string | null;
  avatarUrl?: string | null;
  isOwnProfile?: boolean;
  onEditPress?: () => void;
  onSettingsPress?: () => void;
  onBackPress?: () => void;
  onConnectPress?: () => void;
  onMessagePress?: () => void;
  onMorePress?: () => void;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  username,
  bio,
  avatarUrl,
  isOwnProfile = true,
  onEditPress,
  onSettingsPress,
  onBackPress,
  onConnectPress,
  onMessagePress,
  onMorePress,
}) => {
  return (
    <View style={styles.container}>
      {/* Profile controls */}
      <View style={styles.bannerContainer}>
        {/* Back Button */}
        {onBackPress && (
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={onBackPress}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
        )}

        {/* Settings Toggle (Only for own profile) */}
        {isOwnProfile && (
          <TouchableOpacity 
            style={styles.settingsButton} 
            onPress={onSettingsPress}
            activeOpacity={0.7}
          >
            <Ionicons name="settings-outline" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
        )}
        {!isOwnProfile && onMorePress ? (
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={onMorePress}
            activeOpacity={0.7}
          >
            <Ionicons name="ellipsis-horizontal" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Avatar & Info */}
      <View style={styles.profileInfoContainer}>
        <View style={styles.avatarWrapper}>
          <View style={styles.avatarBorder}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.placeholderAvatar]}>
                <Ionicons name="person" size={40} color={Colors.textMuted} />
              </View>
            )}
          </View>
        </View>

        <View style={styles.detailsContainer}>
          <Text style={styles.username}>@{username}</Text>
          {bio && <Text style={styles.bio}>{bio}</Text>}
          
          {isOwnProfile ? (
            <TouchableOpacity 
              style={styles.editButton} 
              onPress={onEditPress}
              activeOpacity={0.8}
            >
              <Text style={styles.editButtonText}>Edit Profile</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.actionRow}>
              <TouchableOpacity 
                style={[styles.actionButton, styles.primaryButton]} 
                onPress={onConnectPress}
                activeOpacity={0.8}
              >
                <Ionicons name="heart" size={18} color={Colors.black} />
                <Text style={styles.primaryButtonText}>Connect</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.actionButton, styles.secondaryButton]} 
                onPress={onMessagePress}
                activeOpacity={0.8}
              >
                <Ionicons name="chatbubble-outline" size={18} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.bg,
  },
  bannerContainer: {
    height: 112,
    width: '100%',
    position: 'relative',
    backgroundColor: Colors.bgElevated,
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  settingsButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  profileInfoContainer: {
    paddingHorizontal: 20,
    marginTop: -50,
    alignItems: 'center',
  },
  avatarWrapper: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 20,
  },
  avatarBorder: {
    padding: 4,
    backgroundColor: Colors.bg,
    borderRadius: 60,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.bgElevated,
  },
  placeholderAvatar: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.bgCard,
  },
  detailsContainer: {
    alignItems: 'center',
    marginTop: 12,
    width: '100%',
  },
  username: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xl,
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  bio: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.base,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  editButton: {
    marginTop: 16,
    paddingHorizontal: 32,
    paddingVertical: 10,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.bgCard,
  },
  editButtonText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    gap: 12,
  },
  actionButton: {
    height: 48,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    borderWidth: 1,
  },
  primaryButton: {
    backgroundColor: Colors.white,
    borderColor: Colors.white,
    flex: 1,
    maxWidth: 200,
  },
  primaryButtonText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.sm,
    color: Colors.black,
    marginLeft: 8,
  },
  secondaryButton: {
    backgroundColor: Colors.bgCard,
    borderColor: Colors.border,
    width: 48,
    paddingHorizontal: 0,
  },
});
