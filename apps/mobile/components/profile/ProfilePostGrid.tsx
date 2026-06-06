import React from 'react';
import { View, Text, StyleSheet, Dimensions, Image, TouchableOpacity, FlatList } from 'react-native';
import { Colors } from '@/constants/colors';
import { FontFamily, FontSize } from '@/constants/typography';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const COLUMN_COUNT = 3;
const ITEM_WIDTH = width / COLUMN_COUNT;

interface Post {
  id: string;
  thumbnailUrl: string;
}

interface ProfilePostGridProps {
  posts: Post[];
  onPostPress?: (postId: string) => void;
}

export const ProfilePostGrid: React.FC<ProfilePostGridProps> = ({ posts, onPostPress }) => {
  if (posts.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconContainer}>
          <Ionicons name="images-outline" size={48} color={Colors.textMuted} />
        </View>
        <Text style={styles.emptyTitle}>No posts yet</Text>
        <Text style={styles.emptySubtitle}>
          {"When you share photos, they'll appear here."}
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={posts}
      keyExtractor={(item) => item.id}
      numColumns={COLUMN_COUNT}
      scrollEnabled={false} // Managed by parent ScrollView
      renderItem={({ item }) => (
        <TouchableOpacity 
          style={styles.itemContainer} 
          onPress={() => onPostPress?.(item.id)}
          activeOpacity={0.9}
        >
          <Image source={{ uri: item.thumbnailUrl }} style={styles.image} />
        </TouchableOpacity>
      )}
    />
  );
};

const styles = StyleSheet.create({
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.lg,
    color: Colors.textPrimary,
  },
  emptySubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  itemContainer: {
    width: ITEM_WIDTH,
    height: ITEM_WIDTH,
    padding: 1,
  },
  image: {
    flex: 1,
    backgroundColor: Colors.bgElevated,
  },
});
