import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { FontFamily, FontSize } from '@/constants/typography';

interface DiscoverSearchProps {
  onPress: () => void;
}

export const DiscoverSearch: React.FC<DiscoverSearchProps> = ({
  onPress,
}) => {
  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.inputContainer} 
        onPress={onPress}
        activeOpacity={0.8}
      >
        <View style={styles.inputWrapper}>
          <Ionicons name="search" size={20} color={Colors.textMuted} style={styles.icon} />
          <Text style={styles.placeholder}>Search by name or interests...</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: Colors.bg,
  },
  inputContainer: {
    width: '100%',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgInput,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 16,
    height: 56,
  },
  icon: {
    marginRight: 12,
  },
  placeholder: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.base,
    color: Colors.textMuted,
  },
});
