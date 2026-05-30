import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View, Text, StyleSheet, TextInput,
  KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity,
  ActivityIndicator, Animated, PanResponder, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Colors, Spacing, FontSize, FontWeight, Radius } from '@/utils/theme';
import { Button } from '@/components/Button';
import { SettingsModal } from '@/components/SettingsModal';
import { LicensesModal } from '@/components/LicensesModal';
import { ServerSetupModal } from '@/components/ServerSetupModal';
import { storage, type LastChannel } from '@/services/storage';
import { api } from '@/services/api';

export default function HomeScreen() {
  const { t } = useTranslation();
  const [displayName, setDisplayName]   = useState('');
  const [nameReady, setNameReady]       = useState(false);
  const [editing, setEditing]           = useState(false);
  const [showSettings, setShowSettings]       = useState(false);
  const [showLicenses, setShowLicenses]       = useState(false);
  const [showServerSetup, setShowServerSetup] = useState(false);
  const [lastChannel, setLastChannel]   = useState<LastChannel | null>(null);
  const [rejoining, setRejoining]       = useState(false);
  const [rejoinError, setRejoinError]   = useState(false);

  useEffect(() => {
    storage.getDisplayName().then(name => {
      if (name) {
        setDisplayName(name);
        setNameReady(true);
      }
    });
    storage.getServerUrl().then(url => {
      if (url) {
        api.setBaseUrl(url);
      } else {
        setShowServerSetup(true);
      }
    });
  }, []);

  // Reload last channel whenever this screen comes into focus
  useFocusEffect(useCallback(() => {
    storage.getLastChannel().then(setLastChannel);
    setRejoinError(false);
  }, []));

  // Swipe-to-dismiss animation
  const swipeX = useRef(new Animated.Value(0)).current;

  useEffect(() => { swipeX.setValue(0); }, [lastChannel]);

  const clearCard = async () => {
    await storage.clearLastChannel();
    setLastChannel(null);
    setRejoinError(false);
  };

  const panResponder = useRef(
    PanResponder.create({
      // Only capture clearly horizontal right-swipes, leave taps to children
      onMoveShouldSetPanResponder: (_, g) =>
        g.dx > 8 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
      onPanResponderMove: (_, g) => {
        if (g.dx > 0) swipeX.setValue(g.dx);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dx > 100 || g.vx > 0.6) {
          Animated.timing(swipeX, {
            toValue: 500,
            duration: 180,
            useNativeDriver: true,
          }).start(clearCard);
        } else {
          Animated.spring(swipeX, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 8,
          }).start();
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(swipeX, { toValue: 0, useNativeDriver: true }).start();
      },
    })
  ).current;

  const formatAgo = (isoDate: string): string => {
    const diff = Date.now() - new Date(isoDate).getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 1)  return t('home.agoJustNow');
    if (mins < 60) return t('home.agoMinutes', { n: mins });
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)  return t('home.agoHours', { n: hrs });
    return t('home.agoDays', { n: Math.floor(hrs / 24) });
  };

  const handleRejoin = async () => {
    if (!lastChannel || rejoining) return;
    setRejoining(true);
    setRejoinError(false);
    try {
      const status = await api.getRoomStatus(lastChannel.roomId);
      if (!status?.is_active) throw new Error('inactive');
      const name = await storage.getDisplayName();
      const result = await api.joinRoom(lastChannel.roomId, name ?? 'Gast');
      if (!result) throw new Error('no result');
      router.push({
        pathname: '/channel',
        params: {
          roomId:       result.roomId,
          livekitToken: result.livekitToken,
          livekitUrl:   result.livekitUrl,
          isHost:       lastChannel.isHost ? '1' : '0',
          hostIdentity: result.hostIdentity ?? '',
          deleteSecret: lastChannel.deleteSecret ?? '',
        },
      });
    } catch {
      setRejoinError(true);
      // Auto-clear the error after 3 s
      setTimeout(() => setRejoinError(false), 3000);
    } finally {
      setRejoining(false);
    }
  };

  const saveName = async () => {
    const trimmed = displayName.trim();
    if (!trimmed) return;
    await storage.setDisplayName(trimmed);
    setNameReady(true);
    setEditing(false);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {/* Settings button */}
          <TouchableOpacity
            onPress={() => setShowSettings(true)}
            style={styles.settingsBtn}
          >
            <Text style={styles.settingsBtnIcon}>⚙️</Text>
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.header}>
            <Image source={require('../assets/icon.png')} style={styles.logo} />
            <Text style={styles.appName}>{t('home.title')}</Text>
            <Text style={styles.tagline}>{t('home.subtitle')}</Text>
          </View>

          {/* Name input card */}
          <View style={styles.nameCard}>
            <Text style={styles.label}>{t('home.yourName')}</Text>

            {nameReady && !editing ? (
              <View style={styles.nameDisplay}>
                <Text style={styles.nameBig}>{displayName}</Text>
                <Text
                  style={styles.editLink}
                  onPress={() => setEditing(true)}
                >
                  {t('home.editName')}
                </Text>
              </View>
            ) : (
              <View style={styles.nameInputRow}>
                <TextInput
                  style={styles.input}
                  value={displayName}
                  onChangeText={setDisplayName}
                  placeholder={t('home.namePlaceholder')}
                  placeholderTextColor={Colors.textMuted}
                  autoFocus={editing}
                  maxLength={20}
                  returnKeyType="done"
                  onSubmitEditing={saveName}
                />
                <Button
                  label="OK"
                  onPress={saveName}
                  disabled={!displayName.trim()}
                  fullWidth={false}
                  size="md"
                  style={{ paddingHorizontal: 24 }}
                />
              </View>
            )}
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <Button
              label={t('home.createChannel')}
              onPress={() => router.push('/create')}
              variant="primary"
              disabled={!nameReady}
            />

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>{t('home.or')}</Text>
              <View style={styles.dividerLine} />
            </View>

            <Button
              label={t('home.scanQrCode')}
              onPress={() => router.push('/scan')}
              variant="secondary"
              disabled={!nameReady}
            />
          </View>

          {!nameReady && (
            <Text style={styles.hint}>
              {t('home.enterName')}
            </Text>
          )}

          {/* Last channel history */}
          {nameReady && lastChannel && (
            <Animated.View
              style={{ transform: [{ translateX: swipeX }] }}
              {...panResponder.panHandlers}
            >
              <TouchableOpacity
                style={[styles.recentCard, rejoinError && styles.recentCardError]}
                onPress={handleRejoin}
                disabled={rejoining}
                activeOpacity={0.7}
              >
                <View style={styles.recentLeft}>
                  <Text style={styles.recentLabel}>{t('home.recentChannel')}</Text>
                  <Text style={styles.recentRoomId}>
                    {lastChannel.roomId.slice(0, 8)}…
                  </Text>
                  <Text style={styles.recentMeta}>
                    {lastChannel.isHost ? t('home.recentHost') : t('home.recentGuest')}
                    {'  ·  '}
                    {formatAgo(lastChannel.joinedAt)}
                  </Text>
                  {rejoinError && (
                    <Text style={styles.recentError}>{t('home.recentGone')}</Text>
                  )}
                </View>
                <View style={styles.recentRight}>
                  {rejoining
                    ? <ActivityIndicator color={Colors.primary} size="small" />
                    : <Text style={styles.rejoinBtn}>{t('home.rejoin')}</Text>
                  }
                </View>
              </TouchableOpacity>
            </Animated.View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
      <SettingsModal
        visible={showSettings}
        onClose={() => setShowSettings(false)}
        onOpenLicenses={() => { setShowSettings(false); setShowLicenses(true); }}
      />
      <LicensesModal visible={showLicenses} onClose={() => setShowLicenses(false)} />
      <ServerSetupModal visible={showServerSetup} onSaved={() => setShowServerSetup(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: Colors.bg },
  scroll: { flexGrow: 1, padding: Spacing.lg, gap: Spacing.xl, justifyContent: 'center' },

  settingsBtn: {
    alignSelf:         'flex-end',
    paddingVertical:   6,
    paddingHorizontal: 10,
    backgroundColor:   Colors.bgElevated,
    borderRadius:      Radius.full,
    borderWidth:       1,
    borderColor:       Colors.border,
    marginBottom:      Spacing.sm,
  },
  settingsBtnIcon: {
    fontSize: 18,
  },

  header: { alignItems: 'center', gap: Spacing.sm },
  logo:   { width: 80, height: 80, borderRadius: 18 },
  appName: {
    fontSize:   FontSize.xxl,
    fontWeight: FontWeight.black,
    color:      Colors.textPrimary,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: FontSize.sm,
    color:    Colors.textSecondary,
    textAlign: 'center',
  },

  nameCard: {
    backgroundColor: Colors.bgCard,
    borderRadius:    Radius.lg,
    padding:         Spacing.lg,
    gap:             Spacing.md,
    borderWidth:     1,
    borderColor:     Colors.border,
  },
  label: {
    fontSize: FontSize.sm,
    color:    Colors.textSecondary,
  },
  nameDisplay: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
  },
  nameBig: {
    fontSize:   FontSize.xl,
    fontWeight: FontWeight.bold,
    color:      Colors.textPrimary,
  },
  editLink: {
    fontSize: FontSize.sm,
    color:    Colors.primary,
  },
  nameInputRow: {
    flexDirection: 'row',
    gap:           Spacing.sm,
    alignItems:    'center',
  },
  input: {
    flex:            1,
    backgroundColor: Colors.bgInput,
    borderRadius:    Radius.md,
    paddingVertical: 14,
    paddingHorizontal: Spacing.md,
    fontSize:        FontSize.md,
    color:           Colors.textPrimary,
    borderWidth:     1,
    borderColor:     Colors.border,
  },

  actions: { gap: Spacing.md },
  divider: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           Spacing.md,
    marginVertical: Spacing.xs,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerText: { fontSize: FontSize.sm, color: Colors.textMuted },

  hint: {
    textAlign: 'center',
    fontSize:  FontSize.sm,
    color:     Colors.textMuted,
    marginTop: -Spacing.sm,
  },

  recentCard: {
    flexDirection:   'row',
    alignItems:      'center',
    backgroundColor: Colors.bgCard,
    borderRadius:    Radius.lg,
    borderWidth:     1,
    borderColor:     Colors.border,
    padding:         Spacing.md,
    gap:             Spacing.md,
  },
  recentCardError: {
    borderColor: Colors.danger,
  },
  recentLeft: {
    flex: 1,
    gap:  2,
  },
  recentLabel: {
    fontSize:      FontSize.xs,
    color:         Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom:  2,
  },
  recentRoomId: {
    fontSize:   FontSize.md,
    fontWeight: FontWeight.bold,
    color:      Colors.textPrimary,
    fontFamily: Platform.OS === 'android' ? 'monospace' : 'Menlo',
  },
  recentMeta: {
    fontSize: FontSize.xs,
    color:    Colors.textMuted,
    marginTop: 2,
  },
  recentError: {
    fontSize:  FontSize.xs,
    color:     Colors.danger,
    marginTop: 4,
  },
  recentRight: {
    alignItems:     'center',
    justifyContent: 'center',
    minWidth:       80,
  },
  rejoinBtn: {
    fontSize:          FontSize.sm,
    fontWeight:        FontWeight.bold,
    color:             Colors.primary,
    backgroundColor:   Colors.primaryGlow,
    paddingVertical:   8,
    paddingHorizontal: 14,
    borderRadius:      Radius.md,
    borderWidth:       1,
    borderColor:       Colors.primary,
    overflow:          'hidden',
  },
});
