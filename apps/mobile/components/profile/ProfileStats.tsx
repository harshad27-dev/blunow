import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';
import { FontFamily, FontSize } from '@/constants/typography';

interface ProfileStatsProps {
  postsCount: number;
  followersCount: number;
  followingCount: number;
}

export const ProfileStats: React.FC<ProfileStatsProps> = ({
  postsCount,
  followersCount,
  followingCount,
}) => {
  return (
    <View style={styles.container}>
      <StatItem label="Posts" count={postsCount} />
      <View style={styles.divider} />
      <StatItem label="Followers" count={followersCount} />
      <View style={styles.divider} />
      <StatItem label="Following" count={followingCount} />
    </View>
  );
};

const StatItem = ({ label, count }: { label: string; count: number }) => (
  <View style={styles.statBox}>
    <Text style={styles.countText}>{count}</Text>
    <Text style={styles.labelOffline}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 20,
    backgroundColor: Colors.bgCard,
    borderRadius: 16,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: 10,
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  countText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.lg,
    color: Colors.textPrimary,
  },
  labelOffline: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    marginTop: 4,
    letterSpacing: 1,
  },
  divider: {
    width: 1,
    height: '60%',
    backgroundColor: Colors.border,
  },
});
