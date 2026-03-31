import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';
import { FontFamily, FontSize } from '@/constants/typography';
export default function PlaceholderScreen() {
  return (
    <View style={styles.c}><Text style={styles.t}>Coming soon 🚀</Text></View>
  );
}
const styles = StyleSheet.create({
  c: { flex: 1, backgroundColor: Colors.bg, alignItems: 'center', justifyContent: 'center' },
  t: { fontFamily: FontFamily.medium, fontSize: FontSize.lg, color: Colors.textSecondary },
});
