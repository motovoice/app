import React from 'react';
import {
  View, Text, StyleSheet, Modal,
  ScrollView, TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Colors, FontSize, FontWeight, Radius, Spacing } from '@/utils/theme';
import LICENSES from '@/utils/licenses.generated.json';

interface LicensesModalProps {
  visible: boolean;
  onClose: () => void;
}

const LICENSE_COLOR: Record<string, string> = {
  'MIT':          Colors.success,
  'Apache-2.0':   Colors.primary,
  'BSD-3-Clause': Colors.warning,
};

export function LicensesModal({ visible, onClose }: LicensesModalProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={[s.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>

        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity style={s.backBtn} onPress={onClose}>
            <Text style={s.backBtnText}>‹  {t('generic.back')}</Text>
          </TouchableOpacity>
          <Text style={s.title}>{t('licenses.title')}</Text>
          <View style={s.backBtnPlaceholder} />
        </View>

        {/* List */}
        <ScrollView
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={s.subtitle}>{t('licenses.subtitle')}</Text>

          <View style={s.card}>
            {LICENSES.map((entry, index) => (
              <View key={entry.name}>
                {index > 0 && <View style={s.divider} />}
                <View style={s.row}>
                  <View style={s.rowInfo}>
                    <Text style={s.packageName}>{entry.name}</Text>
                    <Text style={s.copyright}>{entry.copyright}</Text>
                  </View>
                  <View style={[s.badge, { borderColor: LICENSE_COLOR[entry.license] ?? Colors.border }]}>
                    <Text style={[s.badgeText, { color: LICENSE_COLOR[entry.license] ?? Colors.textMuted }]}>
                      {entry.license}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>

      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  root: {
    flex:            1,
    backgroundColor: Colors.bg,
  },
  header: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical:   Spacing.md,
    borderBottomWidth: 1,
    borderColor:       Colors.border,
  },
  backBtn: {
    paddingVertical:   Spacing.xs,
    paddingHorizontal: Spacing.sm,
    minWidth:          80,
  },
  backBtnText: {
    fontSize:   FontSize.md,
    color:      Colors.primary,
    fontWeight: FontWeight.medium,
  },
  backBtnPlaceholder: {
    minWidth: 80,
  },
  title: {
    fontSize:   FontSize.md,
    fontWeight: FontWeight.bold,
    color:      Colors.textPrimary,
  },
  subtitle: {
    fontSize:     FontSize.xs,
    color:        Colors.textMuted,
    textAlign:    'center',
    marginBottom: Spacing.md,
  },
  listContent: {
    padding: Spacing.md,
  },
  card: {
    backgroundColor: Colors.bgElevated,
    borderRadius:    Radius.lg,
    borderWidth:     1,
    borderColor:     Colors.border,
    overflow:        'hidden',
  },
  row: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingVertical:   10,
    paddingHorizontal: Spacing.md,
    gap:               Spacing.sm,
  },
  rowInfo: {
    flex: 1,
  },
  packageName: {
    fontSize:   FontSize.sm,
    color:      Colors.textSecondary,
    fontWeight: FontWeight.medium,
  },
  copyright: {
    fontSize:  FontSize.xs,
    color:     Colors.textMuted,
    marginTop: 2,
  },
  badge: {
    borderWidth:       1,
    borderRadius:      Radius.sm,
    paddingVertical:   3,
    paddingHorizontal: 7,
  },
  badgeText: {
    fontSize:   FontSize.xs,
    fontWeight: FontWeight.medium,
  },
  divider: {
    height:           1,
    backgroundColor:  Colors.border,
    marginHorizontal: Spacing.md,
  },
});
