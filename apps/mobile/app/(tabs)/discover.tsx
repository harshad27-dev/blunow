import React, { useState } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  Text, 
  FlatList, 
  TouchableOpacity 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { FontFamily, FontSize } from '@/constants/typography';
import { DiscoverSearch } from '@/components/discover/DiscoverSearch';
import { DiscoverUserCard } from '@/components/discover/DiscoverUserCard';
import { useRouter } from 'expo-router';

const CATEGORIES = [
  'All', 'Nearby', 'Interests', 'Music', 'Gaming', 'Art', 'Travel', 'Coding'
];

// Rich Mock Data
const MOCK_USERS = [
  {
    id: '1',
    username: 'alexa_design',
    age: 24,
    distance: '2.5 km away',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=1000&auto=format&fit=crop',
    bio: 'Product Designer at Blunow. I love minimalist architecture and clean code. Let\'s grab coffee!',
    interests: ['Design', 'UI/UX', 'Traveling'],
  },
  {
    id: '2',
    username: 'marcus_dev',
    age: 27,
    distance: '5.1 km away',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=1000&auto=format&fit=crop',
    bio: 'Fullstack developer by day, gamer by night. Exploring the city one cafe at a time.',
    interests: ['Coding', 'Gaming', 'Coffee'],
  },
  {
    id: '3',
    username: 'sarah_art',
    age: 22,
    distance: '1.2 km away',
    avatarUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=1000&auto=format&fit=crop',
    bio: 'Digital artist focusing on surrealism. Looking for someone to attend gallery openings with.',
    interests: ['Art', 'Museums', 'Painting'],
  },
];


export default function DiscoverScreen() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState('All');

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.title}>Discovery</Text>
      </View>
      
      <DiscoverSearch 
        onPress={() => router.push('/search')}
      />

      <ScrollView 
        style={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Categories */}
        <View style={styles.categoriesContainer}>
          <FlatList
            data={CATEGORIES}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesList}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.categoryChip,
                  selectedCategory === item && styles.categoryChipActive
                ]}
                onPress={() => setSelectedCategory(item)}
              >
                <Text style={[
                  styles.categoryText,
                  selectedCategory === item && styles.categoryTextActive
                ]}>
                  {item}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>

        {/* User Cards Section */}
        <View style={styles.content}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Suggestions for you</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>See all</Text>
            </TouchableOpacity>
          </View>

          {MOCK_USERS.map((user) => (
            <DiscoverUserCard 
              key={user.id} 
              user={user} 
              onPress={() => router.push(`/(screens)/user/${user.id}`)}
              onConnectPress={() => console.log(`Connect with ${user.username}`)}
            />
          ))}
        </View>
        
        {/* Bottom Spacing for Tab Bar */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 5,
  },
  title: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize['3xl'],
    color: Colors.textPrimary,
    letterSpacing: -1,
  },
  container: {
    flex: 1,
  },
  categoriesContainer: {
    marginTop: 10,
    marginBottom: 20,
  },
  categoriesList: {
    paddingHorizontal: 20,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Colors.bgInput,
    marginRight: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  categoryChipActive: {
    backgroundColor: Colors.white,
    borderColor: Colors.white,
  },
  categoryText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  categoryTextActive: {
    color: Colors.black,
  },
  content: {
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.lg,
    color: Colors.textPrimary,
  },
  seeAllText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
});
