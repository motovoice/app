import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  Alert, TouchableOpacity, Modal, BackHandler, Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { ConnectionState } from 'livekit-client';
import { useKeepAwake } from 'expo-keep-awake';
import QRCode from 'react-native-qrcode-svg';
import { Colors, Spacing, FontSize, FontWeight, Radius } from '@/utils/theme';
import { useLiveKitRoom } from '@/hooks/useLiveKitRoom';
import { useForegroundService } from '@/hooks/useForegroundService';
import { useReconnectSound } from '@/hooks/useReconnectSound';
import { PTTButton } from '@/components/PTTButton';
import { ParticipantCard } from '@/components/ParticipantCard';
import { ConnectionBadge } from '@/components/ConnectionBadge';
import { api } from '@/services/api';
import { storage } from '@/services/storage';
import { useTranslation } from 'react-i18next';

export default function ChannelScreen() {
  const { t, i18n } = useTranslation();
  useKeepAwake();

  const { roomId, livekitToken, livekitUrl, isHost, qrPayload, hostIdentity, deleteSecret } = useLocalSearchParams<{
    roomId:       string;
    livekitToken: string;
    livekitUrl:   string;
    isHost:       string;
    qrPayload:    string;
    hostIdentity: string;
    deleteSecret:  string;
  }>();

  const [showQR, setShowQR]                         = useState(false);
  const [localDisplayName, setLocalDisplayName]     = useState<string>('');
  const [echoCancellation, setEchoCancellation]     = useState(true);
  const [noiseSuppression, setNoiseSuppression]     = useState(true);
  const [autoGainControl,  setAutoGainControl]      = useState(true);
  const [dataSaverMode,    setDataSaverMode]        = useState(false);

  useEffect(() => {
    storage.getDisplayName().then(n => { if (n) setLocalDisplayName(n); });
    storage.getAudioSettings().then(s => {
      setEchoCancellation(s.echoCancellation);
      setNoiseSuppression(s.noiseSuppression);
      setAutoGainControl(s.autoGainControl);
      setDataSaverMode(s.dataSaverMode);
    });
    if (roomId) {
      storage.setLastChannel({
        roomId,
        isHost:      isHost === '1',
        joinedAt:    new Date().toISOString(),
        deleteSecret: deleteSecret || undefined,
      });
    }
  }, []);

  const isHost_     = isHost === '1';

  const {
    connectionState,
    participants,
    isMuted,
    error,
    roomClosedByHost,
    stats,
    startSpeaking,
    stopSpeaking,
    disconnect,
  } = useLiveKitRoom({
    url:   livekitUrl,
    token: livekitToken,
    hostName: hostIdentity ?? '',
    isLocalHost: isHost_,
    echoCancellation,
    noiseSuppression,
    autoGainControl,
    dataSaverMode,
  });

  const { permissionDenied } = useForegroundService(roomId ?? '', connectionState);
  useReconnectSound(connectionState);

  useEffect(() => {
    if (!permissionDenied) return;
    Alert.alert(
      t('channel.permissionDeniedTitle'),
      t('channel.permissionDeniedMessage'),
      [{ text: 'OK', onPress: () => router.replace('/') }],
      { cancelable: false }
    );
  }, [permissionDenied]);

  const qrValue     = qrPayload ?? `motovoice://join?room=${roomId}`;

  const shareLink = async () => {
    const shareUrl = `${api.getBaseUrl()}/join/${roomId}`;
    await Share.share({
      message: t('create.sharingJoinChannel') + `\n${shareUrl}`,
      title:   t('create.sharingJoinChannelTitle'),
    });
  };

  const handleLeave = () => {
    if (isHost_) {
      Alert.alert(
        t('channel.leaveTitle'),
        t('channel.leaveConfirmHost'),
        [
          { text: t('generic.cancel'), style: 'cancel' },
          {
            text: t('channel.leaveOnly'),
            style: 'default',
            onPress: () => {
              disconnect();
              api.leaveRoom(roomId, localDisplayName).catch(() => {});
              router.replace('/');
            },
          },
          {
            text: t('channel.leaveEnd'),
            style: 'destructive',
            onPress: async () => {
              disconnect();
              api.deleteRoom(roomId, deleteSecret ?? '').catch(() => {});
              router.replace('/');
            },
          },
        ]
      );
    } else {
      Alert.alert(
        t('channel.leaveTitle'),
        t('channel.leaveConfirmGuest'),
        [
          { text: t('generic.cancel'), style: 'cancel' },
          {
            text: t('generic.leave'),
            style: 'destructive',
            onPress: () => {
              disconnect();
              api.leaveRoom(roomId, localDisplayName).catch(() => {});
              router.replace('/');
            },
          },
        ]
      );
    }
  };

  useEffect(() => {
    if (error) Alert.alert(t('channel.connectionError'), error);
  }, [error]);

  // Channel was closed by the host
  useEffect(() => {
    if (!roomClosedByHost || isHost_ ) return;
    Alert.alert(
      t('channel.closedTitle'),
      t('channel.closedMessage'),
      [{
        text: 'OK',
        onPress: () => router.replace('/'),
      }],
      { cancelable: false }
    );
  }, [roomClosedByHost, isHost_]);

  // Intercept hardware back button
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      handleLeave();
      return true; // Prevent default navigation
    });
    return () => sub.remove();
  }, [handleLeave]);

  const roomIdShort = roomId?.slice(0, 8) ?? '—';

  const isConnected = connectionState === ConnectionState.Connected;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>

        <View style={styles.topBar}>
          <View>
            <Text style={styles.channelLabel}>
              {isHost_ ? '👑 Channel' : '🎙 Channel'}
            </Text>
            <Text style={styles.channelId}>ID: {roomIdShort}...</Text>
          </View>
          <ConnectionBadge state={connectionState} stats={stats} />
          <View style={styles.topActions}>
<TouchableOpacity onPress={() => setShowQR(true)} style={styles.qrBtn}>
              <Text style={styles.qrBtnLabel}>QR</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleLeave} style={styles.leaveBtn}>
              <Text style={styles.leaveLabel}>{t('generic.leave')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t('channel.participants')} · {participants.length}
          </Text>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.participantGrid}
          >
            {participants.map(p => (
              <ParticipantCard key={p.identity} participant={p} />
            ))}
          </ScrollView>
        </View>

        <View style={styles.pttArea}>
          <PTTButton
            onPress={isMuted ? startSpeaking : stopSpeaking}
            isActive={!isMuted}
            disabled={!isConnected}
          />
        </View>

        {connectionState === ConnectionState.Reconnecting && (
          <View style={styles.reconnectBanner}>
            <Text style={styles.reconnectText}>
              ⚡ {t('channel.reconnecting')}
            </Text>
          </View>
        )}

      </View>

      <Modal
        visible={showQR}
        transparent
        animationType="fade"
        onRequestClose={() => setShowQR(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowQR(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('home.joinChannel')}</Text>
            <Text style={styles.modalSubtitle}>
              {t('create.shareQrCode')}
            </Text>
            <View style={styles.qrContainer}>
              <QRCode
                value={qrValue}
                size={220}
                backgroundColor={Colors.bgCard}
                color={Colors.textPrimary}
                quietZone={16}
              />
            </View>
            <Text style={styles.modalRoomId}>{roomId}</Text>
            <TouchableOpacity style={styles.shareBtn} onPress={shareLink}>
              <Text style={styles.shareBtnLabel}>{t('create.shareLink')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setShowQR(false)}
            >
              <Text style={styles.closeBtnLabel}>{t('generic.close')}</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:      { flex: 1, backgroundColor: Colors.bg },
  container: { flex: 1, padding: Spacing.lg, gap: Spacing.lg },

  topBar: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    flexWrap:       'wrap',
    gap:            Spacing.sm,
  },
  channelLabel: {
    fontSize:   FontSize.md,
    fontWeight: FontWeight.bold,
    color:      Colors.textPrimary,
  },
  channelId: {
    fontSize:  FontSize.xs,
    color:     Colors.textMuted,
    marginTop: 2,
  },
  topActions: {
    flexDirection: 'row',
    gap:           Spacing.sm,
    alignItems:    'center',
  },
  qrBtn: {
    paddingVertical:   8,
    paddingHorizontal: 14,
    backgroundColor:   Colors.bgElevated,
    borderRadius:      Radius.md,
    borderWidth:       1,
    borderColor:       Colors.border,
  },
  qrBtnLabel: {
    fontSize:   FontSize.sm,
    color:      Colors.textPrimary,
    fontWeight: FontWeight.bold,
  },
  leaveBtn: {
    paddingVertical:   8,
    paddingHorizontal: 16,
    backgroundColor:   Colors.dangerGlow,
    borderRadius:      Radius.md,
    borderWidth:       1,
    borderColor:       Colors.danger,
  },
  leaveLabel: {
    fontSize:   FontSize.sm,
    color:      Colors.danger,
    fontWeight: FontWeight.bold,
  },

  section:      { flex: 1, gap: Spacing.md },
  sectionTitle: { fontSize: FontSize.sm, color: Colors.textSecondary },
  participantGrid: {
    flexDirection:  'row',
    flexWrap:       'wrap',
    gap:            Spacing.lg,
    paddingVertical: Spacing.sm,
  },

  pttArea: {
    alignItems:      'center',
    justifyContent:  'center',
    paddingVertical: Spacing.xl,
  },

  reconnectBanner: {
    backgroundColor:   'rgba(245, 158, 11, 0.15)',
    borderRadius:      Radius.md,
    paddingVertical:   Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderWidth:       1,
    borderColor:       Colors.warning,
    alignItems:        'center',
  },
  reconnectText: {
    fontSize: FontSize.sm,
    color:    Colors.warning,
  },
  modalOverlay: {
    flex:            1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems:      'center',
    justifyContent:  'center',
    padding:         Spacing.lg,
  },
  modalCard: {
    backgroundColor: Colors.bgCard,
    borderRadius:    Radius.xl,
    padding:         Spacing.xl,
    alignItems:      'center',
    gap:             Spacing.md,
    width:           '100%',
    maxWidth:        360,
    borderWidth:     1,
    borderColor:     Colors.border,
  },
  modalTitle: {
    fontSize:   FontSize.xl,
    fontWeight: FontWeight.bold,
    color:      Colors.textPrimary,
  },
  modalSubtitle: {
    fontSize:  FontSize.sm,
    color:     Colors.textSecondary,
    textAlign: 'center',
  },
  qrContainer: {
    backgroundColor: Colors.bgCard,
    borderRadius:    Radius.lg,
    padding:         Spacing.md,
    borderWidth:     1,
    borderColor:     Colors.border,
    marginVertical:  Spacing.sm,
  },
  modalRoomId: {
    fontSize:  FontSize.xs,
    color:     Colors.textMuted,
    textAlign: 'center',
  },
  shareBtn: {
    paddingVertical:   14,
    paddingHorizontal: Spacing.xxl,
    backgroundColor:   Colors.primaryGlow,
    borderRadius:      Radius.lg,
    borderWidth:       1,
    borderColor:       Colors.primary,
    width:             '100%',
    alignItems:        'center',
  },
  shareBtnLabel: {
    fontSize:   FontSize.md,
    color:      Colors.primary,
    fontWeight: FontWeight.bold,
  },
  closeBtn: {
    paddingVertical:   14,
    paddingHorizontal: Spacing.xxl,
    backgroundColor:   Colors.bgElevated,
    borderRadius:      Radius.lg,
    borderWidth:       1,
    borderColor:       Colors.border,
    width:             '100%',
    alignItems:        'center',
  },
  closeBtnLabel: {
    fontSize:   FontSize.md,
    color:      Colors.textPrimary,
    fontWeight: FontWeight.bold,
  },
});
