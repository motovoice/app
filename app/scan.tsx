import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Vibration } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Camera, CameraView } from 'expo-camera';
import { router } from 'expo-router';
import { Colors, Spacing, FontSize, FontWeight, Radius } from '@/utils/theme';
import { api } from '@/services/api';
import { storage } from '@/services/storage';
import { useTranslation } from 'react-i18next';

export default function ScanScreen() {
  const { t, i18n } = useTranslation();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned]             = useState(false);
  const [error, setError]                 = useState<string | null>(null);
  const [joining, setJoining]             = useState(false);

  useEffect(() => {
    Camera.requestCameraPermissionsAsync().then(({ status }) => {
      setHasPermission(status === 'granted');
    });
  }, []);

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (scanned || joining) return;
    setScanned(true);
    Vibration.vibrate(80);

    // QR-Payload parsen: motovoice://join?room=<id>
    try {
      const url    = new URL(data);
      const roomId = url.searchParams.get('room');

      if (!roomId || url.protocol !== 'motovoice:') {
        setError(t('scan.invalidQrCode'));
        setScanned(false);
        return;
      }

      setJoining(true);
      const displayName = await storage.getDisplayName();
      const result = await api.joinRoom(roomId, displayName ?? 'Gast');

      router.replace({
        pathname: '/channel',
        params: {
          roomId:       result.roomId,
          livekitToken: result.livekitToken,
          livekitUrl:   result.livekitUrl,
          isHost:       '0',
          hostIdentity: result.hostIdentity ?? '',
        },
      });
    } catch (e: any) {
      setError(e?.message ?? t('scan.channelNotFound'));
      setScanned(false);
      setJoining(false);
    }
  };

  if (hasPermission === null) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.infoText}>{t('scan.cameraPermissionRequesting')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!hasPermission) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.errorIcon}>📷</Text>
          <Text style={styles.errorText}>
            {t('scan.cameraPermissionMissing')}
          </Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backLabel}>{t('generic.back')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.fullscreen}>
      {/* Camera */}
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
      />

      {/* Overlay */}
      <SafeAreaView style={styles.overlay}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.topBackBtn}>
            <Text style={styles.topBackLabel}>← {t('generic.back')}</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{t('home.scanQrCode')}</Text>
        </View>

        {/* Scan frame */}
        <View style={styles.scanArea}>
          <View style={styles.scanFrame}>
            {/* Corners */}
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
          </View>

          {joining && (
            <View style={styles.joiningBadge}>
              <Text style={styles.joiningText}>{t('scan.joining')}</Text>
            </View>
          )}
        </View>

        {/* Error message */}
        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{error}</Text>
            <TouchableOpacity onPress={() => setError(null)}>
              <Text style={styles.errorDismiss}>✕</Text>
            </TouchableOpacity>
          </View>
        )}

        <Text style={styles.hint}>
          {t('scan.scanHint')}
        </Text>
      </SafeAreaView>
    </View>
  );
}

const FRAME_SIZE = 240;
const CORNER     = 28;
const THICKNESS  = 4;

const styles = StyleSheet.create({
  safe:       { flex: 1, backgroundColor: Colors.bg },
  fullscreen: { flex: 1 },
  center:     { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.lg, padding: Spacing.lg },

  overlay: {
    flex:            1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems:      'center',
    paddingHorizontal: Spacing.lg,
    gap:             Spacing.xl,
  },

  topBar: {
    width:     '100%',
    gap:       Spacing.xs,
    marginTop: Spacing.md,
  },
  topBackBtn:  { alignSelf: 'flex-start' },
  topBackLabel:{ fontSize: FontSize.md, color: Colors.primary },
  title: {
    fontSize:   FontSize.xl,
    fontWeight: FontWeight.bold,
    color:      Colors.textPrimary,
  },

  scanArea: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
  },
  scanFrame: {
    width:           FRAME_SIZE,
    height:          FRAME_SIZE,
    alignItems:      'center',
    justifyContent:  'center',
  },
  corner: {
    position:  'absolute',
    width:     CORNER,
    height:    CORNER,
    borderColor: Colors.primary,
  },
  cornerTL: { top: 0, left: 0,  borderTopWidth: THICKNESS, borderLeftWidth:  THICKNESS, borderTopLeftRadius:     Radius.sm },
  cornerTR: { top: 0, right: 0, borderTopWidth: THICKNESS, borderRightWidth: THICKNESS, borderTopRightRadius:    Radius.sm },
  cornerBL: { bottom: 0, left: 0,  borderBottomWidth: THICKNESS, borderLeftWidth:  THICKNESS, borderBottomLeftRadius:  Radius.sm },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: THICKNESS, borderRightWidth: THICKNESS, borderBottomRightRadius: Radius.sm },

  joiningBadge: {
    marginTop:       Spacing.lg,
    backgroundColor: Colors.primaryGlow,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius:    Radius.full,
    borderWidth:     1,
    borderColor:     Colors.primary,
  },
  joiningText: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: FontWeight.bold },

  errorBanner: {
    flexDirection:   'row',
    alignItems:      'center',
    backgroundColor: Colors.dangerGlow,
    borderRadius:    Radius.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    gap:             Spacing.md,
    borderWidth:     1,
    borderColor:     Colors.danger,
    width:           '100%',
  },
  errorBannerText: { flex: 1, fontSize: FontSize.sm, color: Colors.danger },
  errorDismiss:    { fontSize: FontSize.md, color: Colors.danger },

  hint: {
    fontSize:  FontSize.sm,
    color:     Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },

  infoText:  { fontSize: FontSize.md, color: Colors.textSecondary },
  errorIcon: { fontSize: 48 },
  errorText: { fontSize: FontSize.md, color: Colors.danger, textAlign: 'center' },
  backBtn:   { marginTop: Spacing.md },
  backLabel: { fontSize: FontSize.md, color: Colors.primary },
});
