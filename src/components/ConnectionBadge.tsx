import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal,
  ScrollView, Pressable, useWindowDimensions,
} from 'react-native';
import { ConnectionState } from 'livekit-client';
import { useTranslation } from 'react-i18next';
import { Colors, FontSize, Radius, Spacing, FontWeight } from '@/utils/theme';
import type { ConnectionStats } from '@/hooks/useLiveKitRoom';

interface ConnectionBadgeProps {
  state: ConnectionState;
  stats?: ConnectionStats;
}

function qualityColor(value: number | null, good: number, warn: number): string {
  if (value === null) return Colors.textMuted;
  if (value <= good) return Colors.success;
  if (value <= warn) return Colors.warning;
  return Colors.danger;
}

interface StatRowProps {
  label:     string;
  value:     number | string | null;
  unit?:     string;
  color:     string;
  hint?:     string;
}

function StatRow({ label, value, unit = '', color, hint }: StatRowProps) {
  const display = value !== null ? `${value}${unit ? ' ' + unit : ''}` : '—';
  return (
    <View style={s.statRow}>
      <View style={{ flex: 1 }}>
        <Text style={s.statLabel}>{label}</Text>
        {hint ? <Text style={s.statHint}>{hint}</Text> : null}
      </View>
      <View style={[s.statPill, { borderColor: color }]}>
        <Text style={[s.statValue, { color }]}>{display}</Text>
      </View>
    </View>
  );
}

export function ConnectionBadge({ state, stats }: ConnectionBadgeProps) {
  const { t, i18n } = useTranslation();
  const { height } = useWindowDimensions();
  const [visible, setVisible] = useState(false);

  const STATE_LABEL: Record<ConnectionState, string> = {
    [ConnectionState.Disconnected]:        t('connectionBadge.stateDisconnected'),
    [ConnectionState.Connecting]:          t('connectionBadge.stateConnecting'),
    [ConnectionState.Connected]:           t('connectionBadge.stateConnected'),
    [ConnectionState.Reconnecting]:        t('connectionBadge.stateReconnecting'),
    [ConnectionState.SignalReconnecting]:  t('connectionBadge.stateReconnecting'),
  };

  const color = STATE_COLOR[state];
  const label = STATE_LABEL[state];

  const latencyColor = qualityColor(stats?.latencyMs  ?? null, 80,   200);
  const lossColor    = qualityColor(stats?.packetLoss ?? null,  1,     5);
  const jitterColor  = qualityColor(stats?.jitterMs   ?? null, 20,    50);

  const updatedStr = stats?.updatedAt
    ? stats.updatedAt.toLocaleTimeString(i18n.language, {
        hour: '2-digit', minute: '2-digit', second: '2-digit',
      })
    : null;

  return (
    <>
      {/* Badge — always tappable */}
      <TouchableOpacity
        onPress={() => setVisible(true)}
        activeOpacity={0.7}
        style={[s.badge, { borderColor: color }]}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <View style={[s.dot, { backgroundColor: color }]} />
        <Text style={[s.badgeLabel, { color }]}>{label}</Text>
        <Text style={[s.chevron, { color }]}>›</Text>
      </TouchableOpacity>

      {/* Stats modal */}
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={() => setVisible(false)}
      >
        {/* Dim backdrop — tap to close, absolutely positioned so it doesn't wrap the sheet */}
        <Pressable style={s.overlay} onPress={() => setVisible(false)} />

        {/* Sheet — no Pressable parent so ScrollView receives gestures freely */}
        <View style={s.sheet}>

            <View style={s.handle} />
            <Text style={s.title}>{t('connectionBadge.title')}</Text>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: height * 0.55 }}>

              {/* Connection quality */}
              <Text style={s.sectionHeader}>{t('connectionBadge.sectionQuality')}</Text>
              <View style={s.card}>
                <StatRow
                  label={t('connectionBadge.labelLatency')}
                  value={stats?.latencyMs ?? null}
                  unit="ms"
                  color={latencyColor}
                  hint={t('connectionBadge.hintLatency')}
                />
                <View style={s.divider} />
                <StatRow
                  label={t('connectionBadge.labelPacketLoss')}
                  value={stats?.packetLoss ?? null}
                  unit="%"
                  color={lossColor}
                  hint={t('connectionBadge.hintPacketLoss')}
                />
                <View style={s.divider} />
                <StatRow
                  label={t('connectionBadge.labelJitter')}
                  value={stats?.jitterMs ?? null}
                  unit="ms"
                  color={jitterColor}
                  hint={t('connectionBadge.hintJitter')}
                />
                <View style={s.divider} />
                <StatRow
                  label={t('connectionBadge.labelBandwidth')}
                  value={stats?.bitrateKbps ?? null}
                  unit="kbps"
                  color={Colors.textSecondary}
                />
                <View style={s.divider} />
                <StatRow
                  label={t('connectionBadge.labelAudioBitrate')}
                  value={stats?.audioBitrateKbps ?? null}
                  unit="kbps"
                  color={Colors.textSecondary}
                />
              </View>

              {/* Connection details */}
              <Text style={s.sectionHeader}>{t('connectionBadge.sectionDetails')}</Text>
              <View style={s.card}>
                <StatRow
                  label={t('connectionBadge.labelProtocol')}
                  value={stats?.transport ?? null}
                  color={Colors.textSecondary}
                />
                <View style={s.divider} />
                <View style={s.statRow}>
                  <Text style={s.statLabel}>{t('connectionBadge.labelStatus')}</Text>
                  <View style={[s.statPill, { borderColor: color, backgroundColor: color + '22' }]}>
                    <Text style={[s.statValue, { color }]}>{label}</Text>
                  </View>
                </View>
                {updatedStr ? (
                  <>
                    <View style={s.divider} />
                    <StatRow
                      label={t('connectionBadge.labelUpdated')}
                      value={updatedStr}
                      color={Colors.textMuted}
                    />
                  </>
                ) : null}
              </View>

              {/* Notice when no stats available */}
              {!stats?.updatedAt && (
                <Text style={s.noStats}>
                  {t('connectionBadge.noStats')}
                </Text>
              )}

            </ScrollView>

            <TouchableOpacity
              style={s.closeBtn}
              onPress={() => setVisible(false)}
            >
              <Text style={s.closeBtnText}>{t('generic.close')}</Text>
            </TouchableOpacity>

        </View>
      </Modal>
    </>
  );
}

const STATE_COLOR: Record<ConnectionState, string> = {
  [ConnectionState.Disconnected]:        Colors.danger,
  [ConnectionState.Connecting]:          Colors.warning,
  [ConnectionState.Connected]:           Colors.success,
  [ConnectionState.Reconnecting]:        Colors.warning,
  [ConnectionState.SignalReconnecting]:  Colors.warning,
};

const s = StyleSheet.create({
  badge: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               Spacing.xs,
    paddingVertical:   6,
    paddingHorizontal: 12,
    borderRadius:      Radius.full,
    borderWidth:       1,
  },
  dot: {
    width:        7,
    height:       7,
    borderRadius: Radius.full,
  },
  badgeLabel: {
    fontSize: FontSize.xs,
  },
  chevron: {
    fontSize:   13,
    marginLeft: -2,
  },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    position:             'absolute',
    bottom:               0,
    left:                 0,
    right:                0,
    backgroundColor:      Colors.bgCard,
    borderTopLeftRadius:  24,
    borderTopRightRadius: 24,
    padding:              Spacing.lg,
    paddingBottom:        Spacing.xxl,
    gap:                  Spacing.md,
    borderTopWidth:       1,
    borderColor:          Colors.border,
    maxHeight:            '80%',
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
  sectionHeader: {
    fontSize:    FontSize.xs,
    color:       Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.xs,
    marginLeft:   2,
  },
  card: {
    backgroundColor: Colors.bgElevated,
    borderRadius:    Radius.lg,
    borderWidth:     1,
    borderColor:     Colors.border,
    marginBottom:    Spacing.md,
    overflow:        'hidden',
  },
  statRow: {
    flexDirection:    'row',
    alignItems:       'center',
    justifyContent:   'space-between',
    paddingVertical:  12,
    paddingHorizontal: Spacing.md,
    gap:              Spacing.sm,
  },
  statLabel: {
    fontSize:   FontSize.sm,
    color:      Colors.textSecondary,
    fontWeight: FontWeight.medium,
  },
  statHint: {
    fontSize: FontSize.xs,
    color:    Colors.textMuted,
    marginTop: 2,
  },
  statPill: {
    paddingVertical:   4,
    paddingHorizontal: 10,
    borderRadius:      Radius.full,
    borderWidth:       1,
  },
  statValue: {
    fontSize:   FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  divider: {
    height:           1,
    backgroundColor:  Colors.border,
    marginHorizontal: Spacing.md,
  },
  noStats: {
    fontSize:  FontSize.sm,
    color:     Colors.textMuted,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  closeBtn: {
    backgroundColor: Colors.bgElevated,
    borderRadius:    Radius.lg,
    paddingVertical: 14,
    alignItems:      'center',
    borderWidth:     1,
    borderColor:     Colors.border,
    marginTop:       Spacing.sm,
  },
  closeBtnText: {
    fontSize:   FontSize.md,
    fontWeight: FontWeight.bold,
    color:      Colors.textPrimary,
  },
});
