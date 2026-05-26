import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Colors, Radius, FontSize, FontWeight, Spacing } from '@/utils/theme';
import type { Participant } from '@/hooks/useLiveKitRoom';

interface ParticipantCardProps {
  participant: Participant;
}

interface MarqueeTextProps {
  text:  string;
  style?: any;
}

function MarqueeText({ text, style }: MarqueeTextProps) {
  const translateX   = useRef(new Animated.Value(0)).current;
  const [containerW, setContainerW] = useState(0);
  const [textW,      setTextW]      = useState(0);
  const animRef                     = useRef<Animated.CompositeAnimation | null>(null);

  const overflow = textW > containerW + 2 ? textW - containerW : 0;

  useEffect(() => {
    animRef.current?.stop();
    translateX.setValue(0);
    if (overflow === 0) return;

    const scrollMs = (overflow / 40) * 1000;
    animRef.current = Animated.loop(
      Animated.sequence([
        Animated.delay(1500),
        Animated.timing(translateX, { toValue: -overflow, duration: scrollMs, useNativeDriver: true }),
        Animated.delay(1000),
        Animated.timing(translateX, { toValue: 0, duration: 400, useNativeDriver: true }),
      ])
    );
    animRef.current.start();
    return () => { animRef.current?.stop(); };
  }, [overflow, translateX]);

  return (
    <View
      style={styles.marqueeContainer}
      onLayout={e => setContainerW(e.nativeEvent.layout.width)}
    >
      {/* Hidden text to measure natural single-line width */}
      <Text
        style={[style, { position: 'absolute', opacity: 0, flexShrink: 0 }]}
        numberOfLines={1}
        onLayout={e => setTextW(e.nativeEvent.layout.width)}
      >
        {text}
      </Text>
      <Animated.Text
        style={[style, textW ? { width: textW } : undefined, { transform: [{ translateX }] }]}
      >
        {text}
      </Animated.Text>
    </View>
  );
}

export function ParticipantCard({ participant }: ParticipantCardProps) {
  const { t } = useTranslation();
  const pulseAnim   = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  // Pulse while speaking
  useEffect(() => {
    if (participant.isSpeaking && !participant.isDisconnected) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.12, duration: 400, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1,    duration: 400, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.stopAnimation();
      Animated.timing(pulseAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    }
  }, [participant.isSpeaking, participant.isDisconnected, pulseAnim]);

  // Dim when disconnected
  useEffect(() => {
    Animated.timing(opacityAnim, {
      toValue:         participant.isDisconnected ? 0.45 : 1,
      duration:        300,
      useNativeDriver: true,
    }).start();
  }, [participant.isDisconnected, opacityAnim]);

  const initials = (participant.name ?? '?')
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const avatarColor = participant.isDisconnected
    ? Colors.bgElevated
    : participant.isSpeaking
      ? Colors.micActive
      : participant.isMuted
        ? Colors.micOff
        : Colors.bgElevated;

  const borderColor = participant.isDisconnected
    ? Colors.danger
    : participant.isSpeaking
      ? Colors.micActive
      : Colors.border;

  const displayName = participant.name + (participant.isLocal ? ` (${t('participant.you')})` : '');

  return (
    <Animated.View style={[styles.card, { opacity: opacityAnim }]}>
      <Animated.View
        style={[
          styles.avatar,
          { backgroundColor: avatarColor, borderColor },
          { transform: [{ scale: pulseAnim }] },
        ]}
      >
        <Text style={styles.initials}>{initials}</Text>

        {/* Disconnect badge */}
        {participant.isDisconnected && (
          <View style={styles.disconnectBadge}>
            <Text style={styles.disconnectIcon}>!</Text>
          </View>
        )}
      </Animated.View>

      <View style={styles.nameRow}>
        {participant.isHost && !participant.isDisconnected && (
          <Text style={styles.crownIcon}>👑</Text>
        )}
        <MarqueeText
          text={displayName}
          style={[styles.name, participant.isDisconnected && styles.nameDisconnected]}
        />
      </View>

      {participant.isDisconnected ? (
        <Text style={styles.disconnectLabel}>{t('participant.disconnected')}</Text>
      ) : (
        <View style={[
          styles.statusDot,
          { backgroundColor: participant.isMuted ? Colors.micOff : Colors.micActive },
        ]} />
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    gap:        Spacing.sm,
    width:      88,
  },
  avatar: {
    width:          72,
    height:         72,
    borderRadius:   Radius.full,
    borderWidth:    2.5,
    alignItems:     'center',
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           3,
    maxWidth:      80,
  },
  marqueeContainer: {
    flexShrink: 1,
    overflow:   'hidden',
  },
  crownIcon: {
    fontSize: 11,
  },
  initials: {
    fontSize:   FontSize.xl,
    fontWeight: FontWeight.bold,
    color:      Colors.textPrimary,
  },
  disconnectBadge: {
    position:         'absolute',
    bottom:           -2,
    right:            -2,
    width:            22,
    height:           22,
    borderRadius:     Radius.full,
    backgroundColor:  Colors.danger,
    borderWidth:      2,
    borderColor:      Colors.bg,
    alignItems:       'center',
    justifyContent:   'center',
  },
  disconnectIcon: {
    fontSize:   11,
    fontWeight: FontWeight.bold,
    color:      Colors.textPrimary,
  },
  name: {
    fontSize:  FontSize.xs,
    color:     Colors.textSecondary,
    textAlign: 'center',
  },
  nameDisconnected: {
    color: Colors.danger,
  },
  disconnectLabel: {
    fontSize:  FontSize.xs - 1,
    color:     Colors.danger,
    textAlign: 'center',
  },
  statusDot: {
    width:        8,
    height:       8,
    borderRadius: Radius.full,
  },
});
