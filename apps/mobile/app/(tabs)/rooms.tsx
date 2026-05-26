import { Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';
import { FontFamily, FontSize } from '@/constants/typography';
import { Screen } from '@/components/common/Screen';

export default function PlaceholderScreen() {
  return (
    <Screen padded>
      <Text style={styles.text}>Coming soon</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  text: {
    flex: 1,
    color: Colors.textSecondary,
    fontFamily: FontFamily.medium,
    fontSize: FontSize.lg,
    textAlign: 'center',
    textAlignVertical: 'center',
  },
});
