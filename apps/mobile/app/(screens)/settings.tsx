import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';

import { Colors } from '@/constants/colors';
import { FontFamily, FontSize } from '@/constants/typography';
import { useAuthStore } from '@/store/authStore';

interface SettingItem {
  id: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  color?: string;
  subtitle?: string;
}

export default function SettingsScreen() {
  const router = useRouter();
  const { logout } = useAuthStore();
  const queryClient = useQueryClient();

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: async () => {
            await logout();
            queryClient.clear();
            router.replace('/');
          }
        }
      ]
    );
  };

  const handleLogoutAllDevices = () => {
    Alert.alert(
      'Sign out all devices',
      'This will invalidate your saved sessions everywhere.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await logout({ allDevices: true });
            queryClient.clear();
            router.replace('/');
          },
        },
      ],
    );
  };

  const sections: { title: string; items: SettingItem[] }[] = [
    {
      title: 'Account',
      items: [
        {
          id: '1',
          title: 'Personal Information',
          icon: 'person-outline',
          onPress: () => router.push('/(screens)/edit-profile'),
        },
        {
          id: '2',
          title: 'Privacy & Security',
          subtitle: 'Session and account protection',
          icon: 'shield-checkmark-outline',
          onPress: () =>
            Alert.alert(
              'Privacy & Security',
              'Your account uses email OTP sign-in and refresh-token sessions. Use “Sign out all devices” below to revoke every active session.',
            ),
        },
        {
          id: '3',
          title: 'Notifications',
          icon: 'notifications-outline',
          onPress: () => router.push('/(screens)/notifications'),
        },
      ]
    },
    {
      title: 'Support & About',
      items: [
        {
          id: '4',
          title: 'Help Center',
          icon: 'help-circle-outline',
          onPress: () =>
            Alert.alert('Help Center', 'Support content will be available here soon.'),
        },
        {
          id: '5',
          title: 'Community Guidelines',
          icon: 'book-outline',
          onPress: () =>
            Alert.alert(
              'Community Guidelines',
              'Be respectful, stay authentic, and report anything unsafe.',
            ),
        },
        {
          id: '6',
          title: 'About Datebl',
          icon: 'information-circle-outline',
          onPress: () =>
            Alert.alert('About Datebl', 'Datebl Version 1.0.0'),
        },
      ]
    },
    {
      title: 'Actions',
      items: [
        { 
          id: '7', 
          title: 'Sign Out', 
          icon: 'log-out-outline', 
          onPress: handleLogout,
          color: Colors.error
        },
        {
          id: '8',
          title: 'Sign Out All Devices',
          subtitle: 'Revoke all refresh tokens',
          icon: 'log-out',
          onPress: handleLogoutAllDevices,
          color: Colors.error,
        },
      ]
    }
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.container}>
        {sections.map((section, idx) => (
          <View key={idx} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.itemsContainer}>
              {section.items.map((item) => (
                <TouchableOpacity 
                  key={item.id} 
                  style={styles.item}
                  onPress={item.onPress}
                  activeOpacity={0.7}
                >
                  <View style={styles.itemLeft}>
                    <View style={[styles.iconBox, { backgroundColor: item.color ? item.color + '15' : Colors.bgInput }]}>
                      <Ionicons name={item.icon} size={22} color={item.color || Colors.textPrimary} />
                    </View>
                    <View>
                      <Text style={[styles.itemText, item.color ? { color: item.color } : {}]}>
                        {item.title}
                      </Text>
                      {item.subtitle ? (
                        <Text style={styles.itemSubtitle}>{item.subtitle}</Text>
                      ) : null}
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}
        
        <View style={styles.footer}>
          <Text style={styles.versionText}>Datebl Version 1.0.0 (Build 42)</Text>
          <Text style={styles.copyrightText}>© 2026 Datebl Team. All rights reserved.</Text>
        </View>
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
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginHorizontal: 24,
    marginBottom: 12,
  },
  itemsContainer: {
    backgroundColor: Colors.bgCard,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.border,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border + '10',
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  itemText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.base,
    color: Colors.textPrimary,
  },
  itemSubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 3,
  },
  footer: {
    marginTop: 40,
    marginBottom: 40,
    alignItems: 'center',
  },
  versionText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  copyrightText: {
    fontFamily: FontFamily.regular,
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 4,
  }
});

