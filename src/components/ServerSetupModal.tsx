import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Modal, TextInput,
  TouchableOpacity, KeyboardAvoidingView, Platform, Image, ActivityIndicator, Linking,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Colors, FontSize, FontWeight, Radius, Spacing } from '@/utils/theme';
import { storage } from '@/services/storage';
import { api } from '@/services/api';

interface ServerSetupModalProps {
  visible:  boolean;
  onSaved:  () => void;
}

export function ServerSetupModal({ visible, onSaved }: ServerSetupModalProps) {
  const { t } = useTranslation();
  const [host,    setHost]    = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const trimmedHost = host.trim().replace(/\/$/, '');
  const canSave     = trimmedHost.length > 0 && !loading;
  const fullUrl     = `https://${trimmedHost}`;

  const handleSave = async () => {
    if (!canSave) return;
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch(`${fullUrl}/health`, { headers: { Accept: 'application/json' } });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.status !== 'ok') throw new Error();
      await storage.setServerUrl(fullUrl);
      api.setBaseUrl(fullUrl);
      onSaved();
    } catch {
      setError(t('setup.errorUnreachable'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent statusBarTranslucent>
      <KeyboardAvoidingView
        style={s.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={s.card}>
          <Image source={require('../../assets/icon.png')} style={s.logo} />
          <Text style={s.title}>{t('setup.title')}</Text>
          <Text style={s.subtitle}>{t('setup.subtitle')}</Text>
          <TouchableOpacity onPress={() => Linking.openURL('https://github.com/motovoice/server')}>
            <Text style={s.link}>{t('setup.serverGuide')}</Text>
          </TouchableOpacity>

          <View style={s.field}>
            <Text style={s.label}>{t('setup.urlLabel')}</Text>
            <View style={s.inputRow}>
              <View style={s.schemePill}>
                <Text style={s.schemeText}>https://</Text>
              </View>
              <View style={s.separator} />
              <TextInput
                style={s.input}
                value={host}
                onChangeText={setHost}
                placeholder={t('setup.placeholder')}
                placeholderTextColor={Colors.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                onSubmitEditing={handleSave}
                returnKeyType="done"
              />
            </View>
          </View>

          {error && <Text style={s.errorText}>{error}</Text>}

          <TouchableOpacity
            style={[s.btn, !canSave && s.btnDisabled]}
            onPress={handleSave}
            disabled={!canSave}
          >
            {loading
              ? <ActivityIndicator color={Colors.bg} />
              : <Text style={[s.btnText, !canSave && s.btnTextDisabled]}>{t('setup.save')}</Text>
            }
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex:            1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    alignItems:      'center',
    justifyContent:  'center',
    padding:         Spacing.lg,
  },
  card: {
    backgroundColor: Colors.bgCard,
    borderRadius:    Radius.xl,
    padding:         Spacing.xl,
    width:           '100%',
    maxWidth:        400,
    alignItems:      'center',
    gap:             Spacing.md,
    borderWidth:     1,
    borderColor:     Colors.border,
  },
  logo:  { width: 80, height: 80, borderRadius: 18 },
  title: {
    fontSize:   FontSize.xl,
    fontWeight: FontWeight.bold,
    color:      Colors.textPrimary,
    textAlign:  'center',
  },
  subtitle: {
    fontSize:   FontSize.sm,
    color:      Colors.textSecondary,
    textAlign:  'center',
    lineHeight: 20,
  },
  field: {
    width: '100%',
    gap:   Spacing.xs,
  },
  label: {
    fontSize: FontSize.xs,
    color:    Colors.textMuted,
  },
  inputRow: {
    flexDirection:   'row',
    alignItems:      'center',
    backgroundColor: Colors.bgElevated,
    borderRadius:    Radius.md,
    borderWidth:     1,
    borderColor:     Colors.border,
    overflow:        'hidden',
  },
  schemePill: {
    paddingVertical:   12,
    paddingHorizontal: Spacing.md,
    backgroundColor:   Colors.bg,
  },
  schemeText: {
    fontSize:   FontSize.sm,
    color:      Colors.primary,
    fontWeight: FontWeight.bold,
  },
  separator: {
    width:           1,
    alignSelf:       'stretch',
    backgroundColor: Colors.border,
  },
  input: {
    flex:              1,
    paddingVertical:   12,
    paddingHorizontal: Spacing.md,
    fontSize:          FontSize.sm,
    color:             Colors.textPrimary,
  },
  btn: {
    backgroundColor: Colors.primary,
    borderRadius:    Radius.lg,
    paddingVertical: 14,
    width:           '100%',
    alignItems:      'center',
    marginTop:       Spacing.xs,
  },
  btnDisabled: {
    backgroundColor: Colors.bgElevated,
    borderWidth:     1,
    borderColor:     Colors.border,
  },
  btnText: {
    fontSize:   FontSize.md,
    fontWeight: FontWeight.bold,
    color:      Colors.bg,
  },
  btnTextDisabled: {
    color: Colors.textMuted,
  },
  errorText: {
    fontSize:  FontSize.xs,
    color:     Colors.danger,
    textAlign: 'center',
  },
  link: {
    fontSize:          FontSize.xs,
    color:             Colors.primary,
    textDecorationLine: 'underline',
    textAlign:         'center',
    marginTop:         -Spacing.xs,
  },
});
