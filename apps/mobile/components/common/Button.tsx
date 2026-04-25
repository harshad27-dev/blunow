import React from 'react';
import { 
  TouchableOpacity, 
  Text, 
  StyleSheet, 
  ActivityIndicator, 
  ViewStyle, 
  TextStyle,
  View
} from 'react-native';
import { Colors } from '@/constants/colors';
import { FontFamily, FontSize } from '@/constants/typography';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  style,
  textStyle,
  icon,
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'secondary':
        return { backgroundColor: Colors.bgElevated };
      case 'outline':
        return { backgroundColor: 'transparent', borderWidth: 1, borderColor: Colors.border };
      case 'ghost':
        return { backgroundColor: 'transparent' };
      case 'danger':
        return { backgroundColor: Colors.error + '20', borderWidth: 1, borderColor: Colors.error };
      case 'primary':
      default:
        return { backgroundColor: Colors.white };
    }
  };

  const getTextStyle = () => {
    switch (variant) {
      case 'primary':
        return { color: Colors.black };
      case 'danger':
        return { color: Colors.error };
      case 'outline':
      case 'ghost':
      case 'secondary':
      default:
        return { color: Colors.textPrimary };
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8 };
      case 'lg':
        return { paddingVertical: 16, paddingHorizontal: 24, borderRadius: 14 };
      case 'md':
      default:
        return { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12 };
    }
  };

  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.7}
      style={[
        styles.base,
        getVariantStyles(),
        getSizeStyles(),
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator 
          size="small" 
          color={variant === 'primary' ? Colors.black : Colors.white} 
        />
      ) : (
        <View style={styles.content}>
          {icon && <View style={styles.iconContainer}>{icon}</View>}
          <Text style={[
            styles.text, 
            getTextStyle(), 
            { fontSize: size === 'sm' ? FontSize.sm : FontSize.base },
            textStyle
          ]}>
            {title}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    marginRight: 8,
  },
  text: {
    fontFamily: FontFamily.semiBold,
  },
  disabled: {
    opacity: 0.5,
  },
});
