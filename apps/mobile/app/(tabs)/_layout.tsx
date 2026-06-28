import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { TabBarStyles } from '@/constants/screen';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

function tabIcon(focused: boolean, active: IoniconName, inactive: IoniconName) {
  function TabBarIcon({ color, size }: { color: string; size: number }) {
    return <Ionicons name={focused ? active : inactive} size={size} color={color} />;
  }

  return TabBarIcon;
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView edges={['left', 'right']} style={styles.safeArea}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: [
            TabBarStyles.style,
            {
              height: TabBarStyles.style.height + insets.bottom,
              paddingBottom: TabBarStyles.style.paddingBottom + insets.bottom,
            },
          ],
          tabBarActiveTintColor: Colors.primaryLight,
          tabBarInactiveTintColor: Colors.textMuted,
          tabBarLabelStyle: TabBarStyles.labelStyle,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Feed',
            tabBarIcon: ({ color, size, focused }) =>
              tabIcon(focused, 'home', 'home-outline')({ color, size }),
          }}
        />
        <Tabs.Screen
          name="discover"
          options={{
            title: 'Discover',
            tabBarIcon: ({ color, size, focused }) =>
              tabIcon(focused, 'compass', 'compass-outline')({ color, size }),
          }}
        />
        <Tabs.Screen
          name="matches"
          options={{
            title: 'Matches',
            tabBarStyle: { display: 'none' },
            tabBarIcon: ({ color, size, focused }) =>
              tabIcon(focused, 'heart', 'heart-outline')({ color, size }),
          }}
        />
        <Tabs.Screen
          name="chat"
          options={{
            title: 'Chat',
            tabBarIcon: ({ color, size, focused }) =>
              tabIcon(focused, 'chatbubbles', 'chatbubbles-outline')({ color, size }),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color, size, focused }) =>
              tabIcon(focused, 'person', 'person-outline')({ color, size }),
          }}
        />
      </Tabs>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
});
