import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  type ViewStyle,
} from 'react-native';
import { Colors, Radius, FontSize, FontWeight } from '@/utils/theme';

interface ButtonProps {
  label:     string;
  onPress:   () => void;
  variant?:  'primary' | 'secondary' | 'danger' | 'ghost';
  size?:     'md' | 'lg';
  loading?:  boolean;
  disabled?: boolean;
  style?:    ViewStyle;
  fullWidth?: boolean;
}

export function Button({
  label,
  onPress,
  variant  = 'primary',
  size     = 'lg',
  loading  = false,
  disabled = false,
  style,
  fullWidth = true,
}: ButtonProps) {
  const bg = {
    primary:   Colors.primary,
    secondary: Colors.bgElevated,
    danger:    Colors.danger,
    ghost:     'transparent',
  }[variant];

  const textColor = variant === 'ghost' ? Colors.textSecondary : Colors.textPrimary;
  const height = size === 'lg' ? 64 : 52;  // Large for gloved hands

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.75}
      style={[
        styles.base,
        { backgroundColor: bg, height },
        fullWidth && { width: '100%' },
        (disabled || loading) && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={Colors.textPrimary} />
      ) : (
        <Text style={[styles.label, { color: textColor }]}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius:   Radius.lg,
    alignItems:     'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  label: {
    fontSize:   FontSize.md,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.5,
  },
  disabled: {
    opacity: 0.4,
  },
});
