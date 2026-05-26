import React, { useRef } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { Colors, FontSize, FontWeight, Radius } from '@/utils/theme';

interface PTTButtonProps {
  onPress:   () => void;
  isActive:  boolean;
  disabled?: boolean;
}

export function PTTButton({ onPress, isActive, disabled }: PTTButtonProps) {
  const { t } = useTranslation();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 0.93, useNativeDriver: true, speed: 50 }),
      Animated.spring(scaleAnim, { toValue: 1,    useNativeDriver: true, speed: 30 }),
    ]).start();
    onPress();
  };

  const bgColor = isActive
    ? Colors.micActive
    : disabled
      ? Colors.micOff
      : Colors.primary;

  return (
    <View style={styles.wrapper}>
      {/* Glow ring */}
      {isActive && (
        <View style={[styles.glowRing, { borderColor: Colors.micActive }]} />
      )}

      <TouchableOpacity onPress={handlePress} disabled={disabled} activeOpacity={1}>
        <Animated.View
          style={[
            styles.button,
            { backgroundColor: bgColor, shadowColor: bgColor },
            { transform: [{ scale: scaleAnim }] },
            disabled && styles.disabled,
          ]}
        >
          {/* Simple microphone icon built from Views */}
          <View style={styles.micIcon}>
            <View style={[styles.micBody,  { borderColor: Colors.textPrimary }]} />
            <View style={[styles.micStand, { borderColor: Colors.textPrimary }]} />
            <View style={[styles.micBase,  { backgroundColor: Colors.textPrimary }]} />
          </View>
        </Animated.View>
      </TouchableOpacity>

      <Text style={styles.hint}>
        {isActive ? t('ptt.speaking') : t('ptt.tapToTalk')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    gap: 16,
  },
  glowRing: {
    position:     'absolute',
    width:        196,
    height:       196,
    borderRadius: Radius.full,
    borderWidth:  3,
    opacity:      0.5,
    top:          -14,
  },
  button: {
    width:          168,
    height:         168,
    borderRadius:   Radius.full,
    alignItems:     'center',
    justifyContent: 'center',
    elevation:      12,
    shadowOffset:   { width: 0, height: 6 },
    shadowOpacity:  0.5,
    shadowRadius:   16,
  },
  disabled: {
    opacity: 0.4,
  },
  // Simple microphone icon built from Views
  micIcon: {
    alignItems: 'center',
    gap: 3,
  },
  micBody: {
    width:            28,
    height:           44,
    borderRadius:     14,
    borderWidth:      3,
    backgroundColor:  'transparent',
  },
  micStand: {
    width:                   36,
    height:                  18,
    borderBottomLeftRadius:  18,
    borderBottomRightRadius: 18,
    borderLeftWidth:         3,
    borderRightWidth:        3,
    borderBottomWidth:       3,
    borderTopWidth:          0,
    backgroundColor:         'transparent',
    marginTop:               -6,
  },
  micBase: {
    width:        3,
    height:       10,
    borderRadius: 2,
    marginTop:    -2,
  },
  hint: {
    fontSize:  FontSize.sm,
    color:     Colors.textSecondary,
    marginTop: 4,
  },
});
