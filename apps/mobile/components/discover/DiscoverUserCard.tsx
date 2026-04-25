import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { FontFamily, FontSize } from '@/constants/typography';
import { Button } from '@/components/common/Button';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 40;

interface DiscoverUser {
  id: string;
  username: string;
  age: number;
  distance: string;
  avatarUrl: string;
  bio: string;
  interests: string[];
}

interface DiscoverUserCardProps {
  user: DiscoverUser;
  onPress?: () => void;
  onConnectPress?: () => void;
}

export const DiscoverUserCard: React.FC<DiscoverUserCardProps> = ({
  user,
  onPress,
  onConnectPress,
}) => {
  return (
    <TouchableOpacity 
      style={styles.container} 
      onPress={onPress}
      activeOpacity={0.9}
    >
      <Image source={{ uri: user.avatarUrl }} style={styles.image} />
      
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.8)', 'rgba(0,0,0,0.95)']}
        style={styles.gradient}
      />
      
      <View style={styles.content}>
        <View style={styles.topInfo}>
          <Text style={styles.name}>{user.username}, {user.age}</Text>
          <View style={styles.distanceBadge}>
            <Ionicons name="location-sharp" size={12} color={Colors.textPrimary} />
            <Text style={styles.distanceText}>{user.distance}</Text>
          </View>
        </View>
        
        <Text style={styles.bio} numberOfLines={2}>{user.bio}</Text>
        
        <View style={styles.interestsContainer}>
          {user.interests.slice(0, 3).map((interest, index) => (
            <View key={index} style={styles.interestTag}>
              <Text style={styles.interestText}>{interest}</Text>
            </View>
          ))}
          {user.interests.length > 3 && (
            <Text style={styles.moreText}>+{user.interests.length - 3} more</Text>
          )}
        </View>
        
        <Button 
          title="Connect" 
          onPress={onConnectPress || (() => {})} 
          variant="primary"
          size="sm"
          style={styles.connectButton}
          icon={<Ionicons name="heart" size={18} color={Colors.black} />}
        />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: CARD_WIDTH,
    height: CARD_WIDTH * 1.2,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: Colors.bgCard,
    marginBottom: 20,
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  image: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  content: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
  },
  topInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  name: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xl,
    color: Colors.white,
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  distanceText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    color: Colors.white,
    marginLeft: 4,
  },
  bio: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 16,
    lineHeight: 20,
  },
  interestsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    flexWrap: 'wrap',
  },
  interestTag: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  interestText: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
    color: Colors.white,
  },
  moreText: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
  },
  connectButton: {
    width: '100%',
  },
});
