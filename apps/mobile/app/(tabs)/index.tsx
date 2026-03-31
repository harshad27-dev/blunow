import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';
import { FontFamily, FontSize } from '@/constants/typography';

export default function FeedScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Feed — coming soon 🚀</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg, alignItems: 'center', justifyContent: 'center' },
  text: { fontFamily: FontFamily.medium, fontSize: FontSize.lg, color: Colors.textSecondary },
});
