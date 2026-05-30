import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View, Text, StyleSheet, ActivityIndicator,
  Share, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';
import { Colors, Spacing, FontSize, FontWeight, Radius } from '@/utils/theme';
import { Button } from '@/components/Button';
import { api, type CreateRoomResponse } from '@/services/api';
import { storage } from '@/services/storage';

export default function CreateScreen() {
  const { t, i18n } = useTranslation();
  const [room, setRoom]       = useState<CreateRoomResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    const create = async () => {
      const name = await storage.getDisplayName();
      try {
        const data = await api.createRoom(name ?? 'Host');
        setRoom(data);
      } catch (e: any) {
        setError(e?.message ?? t('create.channelCreateError'));
      } finally {
        setLoading(false);
      }
    };
    create();
  }, []);

  const joinAsHost = () => {
    if (!room) return;
    router.replace({
      pathname: '/channel',
      params: {
        roomId:       room.roomId,
        livekitToken: room.livekitToken,
        livekitUrl:   room.livekitUrl,
        qrPayload:    room.qrPayload,
        isHost:       '1',
        deleteSecret: room.deleteSecret,
      },
    });
  };

  const shareRoom = async () => {
    if (!room) return;
    const shareUrl = `${api.getBaseUrl()}/join/${room.roomId}`;
    await Share.share({
      message: t('create.sharingJoinChannel') + `\n${shareUrl}`,
      title:   t('create.sharingJoinChannelTitle'),
    });
  };

  const expiresIn = (expiresAt: string) => {
    const ms   = new Date(expiresAt).getTime() - Date.now();
    const hrs  = Math.floor(ms / 3600000);
    const mins = Math.floor((ms % 3600000) / 60000);
    return `${hrs}h ${mins}m`;
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backLabel}>← {t('generic.back')}</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{t('create.createChannel')}</Text>
        </View>

        {/* Content */}
        {loading && (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>{t('create.creatingChannel')}</Text>
          </View>
        )}

        {error && (
          <View style={styles.center}>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={styles.errorText}>{error}</Text>
            <Button label={t('create.createChannelRetry')} onPress={() => router.replace('/create')} />
          </View>
        )}

        {room && !loading && (
          <View style={styles.content}>
            <Text style={styles.subtitle}>
              {t('create.shareQrCode')}
            </Text>

            {/* QR code */}
            <View style={styles.qrWrapper}>
              <QRCode
                value={room.qrPayload}
                size={220}
                backgroundColor={Colors.bgCard}
                color={Colors.textPrimary}
                quietZone={16}
              />
            </View>

            {/* Room info */}
            <View style={styles.infoRow}>
              <View style={styles.infoPill}>
                <Text style={styles.infoLabel}>Channel-ID</Text>
                <Text style={styles.infoValue}>{room.roomId.slice(0, 8)}...</Text>
              </View>
              <View style={styles.infoPill}>
                <Text style={styles.infoLabel}>{t('create.validity')}</Text>
                <Text style={styles.infoValue}>{expiresIn(room.expiresAt)}</Text>
              </View>
            </View>

            {/* Actions */}
            <View style={styles.actions}>
              <Button label={t('create.joinChannel')} onPress={joinAsHost} variant="primary" />
              <Button label={t('create.shareLink')} onPress={shareRoom} variant="secondary" />
            </View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:      { flex: 1, backgroundColor: Colors.bg },
  container: { flex: 1, padding: Spacing.lg, gap: Spacing.lg },

  header: {
    gap: Spacing.sm,
  },
  backBtn:   { alignSelf: 'flex-start' },
  backLabel: { fontSize: FontSize.md, color: Colors.primary },
  title: {
    fontSize:   FontSize.xxl,
    fontWeight: FontWeight.black,
    color:      Colors.textPrimary,
  },

  center: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.lg,
  },
  loadingText: { fontSize: FontSize.md, color: Colors.textSecondary },
  errorIcon:   { fontSize: 48 },
  errorText:   { fontSize: FontSize.md, color: Colors.danger, textAlign: 'center' },

  content: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.xl,
    justifyContent: 'center',
  },
  subtitle: {
    fontSize:  FontSize.sm,
    color:     Colors.textSecondary,
    textAlign: 'center',
  },

  qrWrapper: {
    backgroundColor: Colors.bgCard,
    borderRadius:    Radius.xl,
    padding:         Spacing.md,
    borderWidth:     1,
    borderColor:     Colors.border,
    elevation:       4,
    shadowColor:     '#000',
    shadowOpacity:   0.3,
    shadowRadius:    12,
    shadowOffset:    { width: 0, height: 4 },
  },

  infoRow: {
    flexDirection: 'row',
    gap:           Spacing.md,
  },
  infoPill: {
    flex:            1,
    backgroundColor: Colors.bgCard,
    borderRadius:    Radius.md,
    padding:         Spacing.md,
    alignItems:      'center',
    borderWidth:     1,
    borderColor:     Colors.border,
  },
  infoLabel: { fontSize: FontSize.xs, color: Colors.textMuted, marginBottom: 4 },
  infoValue: { fontSize: FontSize.sm, color: Colors.textPrimary, fontWeight: FontWeight.bold },

  actions: { width: '100%', gap: Spacing.md },
});