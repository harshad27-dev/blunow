import React from 'react';
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { getThemeColors } from '@/constants/colors';
import { Radius, Spacing } from '@/constants/spacing';
import { FontFamily, FontSize } from '@/constants/typography';
import { useColorScheme } from 'nativewind';

interface DiscoverUser {
  id: string;
  username: string;
  name?: string | null;
  followersCount?: number | null;
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

const formatFollowers = (count?: number | null) => {
  if (typeof count !== 'number') return null;
  if (count >= 1000000) return `${(count / 1000000).toFixed(count >= 10000000 ? 0 : 1)}M followers`;
  if (count >= 1000) return `${(count / 1000).toFixed(count >= 10000 ? 0 : 1)}K followers`;
  return `${count} ${count === 1 ? 'follower' : 'followers'}`;
};

export const DiscoverUserCard: React.FC<DiscoverUserCardProps> = ({
  user,
  onPress,
}) => {
  const { width } = useWindowDimensions();
  const { colorScheme } = useColorScheme();
  const theme = getThemeColors(colorScheme === 'light' ? 'light' : 'dark');
  const username = user.username.replace(/[_]+/g, ' ');
  const name = user.name?.trim();
  const followers = formatFollowers(user.followersCount);
  const subtitle = [
    name && name.toLowerCase() !== username.toLowerCase() ? name : null,
    followers,
  ]
    .filter(Boolean)
    .join(' - ');
  const hasAvatar = Boolean(user.avatarUrl);

  return (
    <TouchableOpacity
      accessibilityLabel={`Open ${username}'s profile`}
      accessibilityRole="button"
      activeOpacity={0.72}
      onPress={onPress}
      style={[styles.container, { width: Math.min(width - 40, 520) }]}
    >
      <View style={styles.avatarFrame}>
        {hasAvatar ? (
          <Image source={{ uri: user.avatarUrl! }} style={styles.avatarImage} />
        ) : (
          <Text style={[styles.avatarInitial, { color: theme.textPrimary }]}>
            {username.charAt(0).toUpperCase()}
          </Text>
        )}
      </View>

      <View style={styles.copy}>
        <Text numberOfLines={1} style={[styles.username, { color: theme.textPrimary }]}>
          {username}
        </Text>
        {subtitle ? (
          <Text numberOfLines={1} style={[styles.subtitle, { color: theme.textSecondary }]}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    borderRadius: Radius.lg,
    flexDirection: 'row',
    marginBottom: 2,
    minHeight: 60,
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xs,
  },
  avatarFrame: {
    alignItems: 'center',
    borderRadius: Radius.full,
    height: 42,
    justifyContent: 'center',
    marginRight: Spacing.sm + 2,
    overflow: 'hidden',
    width: 42,
  },
  avatarImage: {
    height: '100%',
    width: '100%',
  },
  avatarInitial: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.base,
    textTransform: 'uppercase',
  },
  copy: {
    flex: 1,
    justifyContent: 'center',
    minWidth: 0,
  },
  username: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
    letterSpacing: 0,
    textTransform: 'capitalize',
  },
  subtitle: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    lineHeight: 16,
    marginTop: 1,
  },
});