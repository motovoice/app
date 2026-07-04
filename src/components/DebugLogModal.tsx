import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableWithoutFeedback,
  TouchableOpacity, ScrollView, Platform, Share,
} from 'react-native';
import * as Sharing from 'expo-sharing';
import { useTranslation } from 'react-i18next';
import { Colors, FontSize, FontWeight, Radius, Spacing } from '@/utils/theme';
import { debugLog } from '@/services/debugLog';

interface DebugLogModalProps {
  visible: boolean;
  onClose: () => void;
}

function colorForLine(line: string): string {
  if (/\[error\]/i.test(line)) return Colors.danger;
  if (/\[warn\]/i.test(line)) return Colors.warning;
  if (/\[debug\]/i.test(line)) return Colors.textMuted;
  return Colors.textSecondary;
}

export function DebugLogModal({ visible, onClose }: DebugLogModalProps) {
  const { t } = useTranslation();
  const [content, setContent] = useState('');
  const lines = content.split('\n').filter(Boolean);

  useEffect(() => {
    if (!visible) return;
    debugLog.read().then(setContent);
  }, [visible]);

  const handleExport = async () => {
    // expo-sharing's iOS read-permission check has a known regression that rejects
    // the app's own document directory files (expo/expo#39861) — use the native
    // Share sheet directly there instead. Android is unaffected.
    if (Platform.OS === 'ios') {
      await Share.share({ url: debugLog.filePath });
      return;
    }
    if (!(await Sharing.isAvailableAsync())) return;
    await Sharing.shareAsync(debugLog.filePath);
  };

  const handleClear = async () => {
    await debugLog.clear();
    setContent('');
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={s.overlay}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={StyleSheet.absoluteFill} />
        </TouchableWithoutFeedback>
        <View style={s.sheet}>
          <View style={s.handle} />
          <Text style={s.title}>{t('settings.debugLogTitle')}</Text>

          <ScrollView style={s.logBox} contentContainerStyle={s.logContent} nestedScrollEnabled>
            <ScrollView horizontal nestedScrollEnabled showsHorizontalScrollIndicator>
              <View>
                {lines.length === 0 ? (
                  <Text style={s.logText}>{t('settings.debugLogEmpty')}</Text>
                ) : (
                  lines.map((line, i) => (
                    <Text key={i} style={[s.logText, { color: colorForLine(line) }]}>
                      {line}
                    </Text>
                  ))
                )}
              </View>
            </ScrollView>
          </ScrollView>

          <View style={s.actionsRow}>
            <TouchableOpacity style={s.actionBtn} onPress={handleExport}>
              <Text style={s.actionBtnText}>{t('settings.debugLogExport')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.actionBtn, s.actionBtnDanger]} onPress={handleClear}>
              <Text style={[s.actionBtnText, s.actionBtnDangerText]}>{t('settings.debugLogClear')}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={s.closeBtn} onPress={onClose}>
            <Text style={s.closeBtnText}>{t('generic.close')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex:            1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent:  'flex-end',
  },
  sheet: {
    backgroundColor:      Colors.bgCard,
    borderTopLeftRadius:  24,
    borderTopRightRadius: 24,
    padding:              Spacing.lg,
    paddingBottom:        Spacing.xxl,
    gap:                  Spacing.md,
    borderTopWidth:       1,
    borderColor:          Colors.border,
    height:               '80%',
  },
  handle: {
    width:           40,
    height:          4,
    backgroundColor: Colors.border,
    borderRadius:    2,
    alignSelf:       'center',
    marginBottom:    Spacing.xs,
  },
  title: {
    fontSize:     FontSize.lg,
    fontWeight:   FontWeight.bold,
    color:        Colors.textPrimary,
    textAlign:    'center',
    marginBottom: Spacing.sm,
  },
  logBox: {
    flex:            1,
    backgroundColor: Colors.bgElevated,
    borderRadius:    Radius.lg,
    borderWidth:     1,
    borderColor:     Colors.border,
  },
  logContent: {
    padding: Spacing.sm,
  },
  logText: {
    fontSize:   FontSize.xs,
    color:      Colors.textSecondary,
    fontFamily: 'monospace',
  },
  actionsRow: {
    flexDirection: 'row',
    gap:           Spacing.sm,
  },
  actionBtn: {
    flex:              1,
    paddingVertical:   12,
    backgroundColor:   Colors.primaryGlow,
    borderRadius:      Radius.lg,
    borderWidth:       1,
    borderColor:       Colors.primary,
    alignItems:        'center',
  },
  actionBtnText: {
    fontSize:   FontSize.sm,
    color:      Colors.primary,
    fontWeight: FontWeight.bold,
  },
  actionBtnDanger: {
    backgroundColor: Colors.dangerGlow,
    borderColor:     Colors.danger,
  },
  actionBtnDangerText: {
    color: Colors.danger,
  },
  closeBtn: {
    backgroundColor: Colors.bgElevated,
    borderRadius:    Radius.lg,
    paddingVertical: 14,
    alignItems:      'center',
    borderWidth:     1,
    borderColor:     Colors.border,
  },
  closeBtnText: {
    fontSize:   FontSize.md,
    fontWeight: FontWeight.bold,
    color:      Colors.textPrimary,
  },
});
