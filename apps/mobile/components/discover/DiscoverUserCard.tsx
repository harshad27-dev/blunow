import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { Radius, Spacing } from '@/constants/spacing';
import { FontFamily, FontSize } from '@/constants/typography';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 40;

interface DiscoverUser {
  id: string;
  username: string;
  age: number;
  distance: string;
  avatarUrl?: string | null;
  bio: string;
  interests: string[];
  isActive?: boolean;
  isVerified?: boolean;
  matchScore?: number;
  isConnected?: boolean;
}

interface DiscoverUserCardProps {
  user: DiscoverUser;
  onPress?: () => void;
  onConnectPress?: () => void;
  onDismissPress?: () => void;
  onMessagePress?: () => void;
}

export const DiscoverUserCard: React.FC<DiscoverUserCardProps> = ({
  user,
  onPress,
  onConnectPress,
  onDismissPress,
  onMessagePress,
}) => {
  const displayName = user.username.replace(/[_]+/g, ' ');
  const shownInterests = user.interests.slice(0, 3);
  const hasAvatar = Boolean(user.avatarUrl);
  const actionLabel = user.isConnected ? 'Connected' : 'Connect';
  const actionIcon = user.isConnected ? 'checkmark' : 'heart';

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.92}
    >
      <View style={styles.avatarFrame}>
        {hasAvatar ? (
          <Image source={{ uri: user.avatarUrl! }} style={styles.image} />
        ) : (
          <View style={styles.avatarFallback}>
            <Text style={styles.avatarInitial}>{displayName.charAt(0).toUpperCase()}</Text>
          </View>
        )}
        <LinearGradient
          colors={[Colors.transparent, Colors.overlayDark]}
          style={styles.avatarGradient}
        />
        {user.isActive ? (
          <View style={styles.activeBadge}>
            <View style={styles.onlineDot} />
            <Text style={styles.activeText}>Active</Text>
          </View>
        ) : null}
        {typeof user.matchScore === 'number' ? (
          <View style={styles.matchBadge}>
            <Ionicons name="sparkles" size={11} color={Colors.textPrimary} />
            <Text style={styles.matchText}>{user.matchScore}%</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.content}>
        <View style={styles.headerRow}>
          <View style={styles.titleBlock}>
            <View style={styles.nameRow}>
              <Text style={styles.name} numberOfLines={1}>
                {displayName}, {user.age || '--'}
              </Text>
              {user.isVerified ? (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark" size={11} color={Colors.textInverse} />
                </View>
              ) : null}
            </View>

            <View style={styles.metaRow}>
              <Ionicons name="location-outline" size={14} color={Colors.textSecondary} />
              <Text style={styles.distanceText} numberOfLines={1}>
                {user.distance}
              </Text>
            </View>
          </View>

          {onDismissPress ? (
            <TouchableOpacity
              style={styles.iconAction}
              activeOpacity={0.82}
              onPress={(event) => {
                event.stopPropagation();
                onDismissPress();
              }}
            >
              <Ionicons name="close" size={18} color={Colors.textSecondary} />
            </TouchableOpacity>
          ) : null}
        </View>

        <Text style={styles.bio} numberOfLines={2}>
          {user.bio || 'Looking for people with a similar vibe nearby.'}
        </Text>

        <View style={styles.interestsContainer}>
          {shownInterests.map((interest) => (
            <View key={interest} style={styles.interestTag}>
              <Text style={styles.interestText}>{interest}</Text>
            </View>
          ))}
          {user.interests.length > 3 && (
            <View style={styles.moreTag}>
              <Text style={styles.moreText}>+{user.interests.length - 3}</Text>
            </View>
          )}
        </View>

        <View style={styles.actions}>
          {onMessagePress ? (
            <TouchableOpacity
              style={styles.messageButton}
              activeOpacity={0.86}
              onPress={(event) => {
                event.stopPropagation();
                onMessagePress();
              }}
            >
              <Ionicons name="chatbubble-ellipses-outline" size={18} color={Colors.textPrimary} />
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            style={[styles.connectButton, user.isConnected && styles.connectedButton]}
            activeOpacity={0.88}
            onPress={(event) => {
              event.stopPropagation();
              onConnectPress?.();
            }}
          >
            <Ionicons name={actionIcon} size={18} color={Colors.textInverse} />
            <Text style={styles.connectText}>{actionLabel}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'stretch',
    backgroundColor: Colors.bgCard,
    borderColor: Colors.border,
    borderRadius: Radius.xl,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: Spacing.md,
    marginHorizontal: Spacing.md + 4,
    minHeight: 170,
    overflow: 'hidden',
    padding: Spacing.sm,
    width: CARD_WIDTH,
  },
  avatarFrame: {
    backgroundColor: Colors.bgElevated,
    borderRadius: Radius.lg,
    height: 154,
    overflow: 'hidden',
    width: 116,
  },
  image: {
    height: '100%',
    width: '100%',
  },
  avatarFallback: {
    alignItems: 'center',
    backgroundColor: Colors.bgElevated,
    height: '100%',
    justifyContent: 'center',
    width: '100%',
  },
  avatarInitial: {
    color: Colors.textPrimary,
    fontFamily: FontFamily.bold,
    fontSize: FontSize['2xl'],
    textTransform: 'uppercase',
  },
  avatarGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  onlineDot: {
    backgroundColor: Colors.success,
    borderRadius: 4,
    height: 8,
    marginRight: 7,
    width: 8,
  },
  activeBadge: {
    alignItems: 'center',
    backgroundColor: Colors.bgInput,
    borderColor: Colors.border,
    borderRadius: Radius.full,
    borderWidth: 1,
    bottom: Spacing.sm,
    flexDirection: 'row',
    left: Spacing.sm,
    paddingHorizontal: Spacing.sm + 1,
    paddingVertical: Spacing.xs + 1,
    position: 'absolute',
  },
  activeText: {
    color: Colors.success,
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.xs,
  },
  matchBadge: {
    alignItems: 'center',
    backgroundColor: Colors.bgInput,
    borderColor: Colors.border,
    borderRadius: Radius.full,
    borderWidth: 1,
    flexDirection: 'row',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs + 1,
    position: 'absolute',
    right: Spacing.sm,
    top: Spacing.sm,
  },
  matchText: {
    color: Colors.textPrimary,
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xs,
    marginLeft: 4,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingBottom: Spacing.xs,
    paddingLeft: Spacing.md,
    paddingTop: Spacing.xs,
  },
  headerRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
  },
  titleBlock: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  nameRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  name: {
    color: Colors.textPrimary,
    flex: 1,
    fontFamily: FontFamily.bold,
    fontSize: FontSize.lg,
    letterSpacing: 0,
    textTransform: 'capitalize',
  },
  verifiedBadge: {
    alignItems: 'center',
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    height: 20,
    justifyContent: 'center',
    marginLeft: Spacing.xs + 2,
    width: 20,
  },
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: Spacing.xs + 2,
  },
  distanceText: {
    color: Colors.textSecondary,
    flex: 1,
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    marginLeft: Spacing.xs + 1,
  },
  iconAction: {
    alignItems: 'center',
    backgroundColor: Colors.bgElevated,
    borderColor: Colors.border,
    borderRadius: Radius.full,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  bio: {
    color: Colors.textSecondary,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    lineHeight: 20,
    marginTop: Spacing.sm,
  },
  interestsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs + 2,
    marginTop: Spacing.sm + 2,
  },
  interestTag: {
    backgroundColor: Colors.bgElevated,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs + 1,
  },
  interestText: {
    color: Colors.textPrimary,
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.xs,
  },
  moreTag: {
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs + 1,
  },
  moreText: {
    color: Colors.textPrimary,
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.xs,
  },
  actions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  messageButton: {
    alignItems: 'center',
    backgroundColor: Colors.bgElevated,
    borderColor: Colors.border,
    borderRadius: Radius.full,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    width: 44,
  },
  connectButton: {
    alignItems: 'center',
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    flex: 1,
    flexDirection: 'row',
    height: 40,
    justifyContent: 'center',
  },
  connectedButton: {
    backgroundColor: Colors.success,
  },
  connectText: {
    color: Colors.textInverse,
    fontFamily: FontFamily.bold,
    fontSize: FontSize.base,
    marginLeft: 8,
  },
});
