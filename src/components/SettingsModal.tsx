import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableWithoutFeedback,
  Switch, TouchableOpacity, ScrollView, TextInput,
  Keyboard, ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Colors, FontSize, FontWeight, Radius, Spacing } from '@/utils/theme';
import { storage, DEFAULT_AUDIO_SETTINGS, type AudioSettings } from '@/services/storage';
import { api } from '@/services/api';
import { DebugLogModal } from '@/components/DebugLogModal';
import Constants from 'expo-constants';

interface SettingsModalProps {
  visible:         boolean;
  onClose:         () => void;
  onOpenLicenses:  () => void;
}

export function SettingsModal({ visible, onClose, onOpenLicenses }: SettingsModalProps) {
  const { t, i18n } = useTranslation();

  const [audio, setAudio]             = useState<AudioSettings>(DEFAULT_AUDIO_SETTINGS);
  const [serverUrl, setServerUrl]     = useState('');
  const [kbHeight, setKbHeight]       = useState(0);
  const [urlChecking, setUrlChecking] = useState(false);
  const [urlError, setUrlError]         = useState<string | null>(null);
  const [showDebugLog, setShowDebugLog] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', (e) => {
      setKbHeight(e.endCoordinates.height);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    });
    const hide = Keyboard.addListener('keyboardDidHide', () => setKbHeight(0));
    return () => { show.remove(); hide.remove(); };
  }, []);

  useEffect(() => {
    if (!visible) return;
    storage.getAudioSettings().then(setAudio);
    storage.getServerUrl().then(url => {
      const full = url ?? api.getBaseUrl();
      setServerUrl(full.replace(/^https?:\/\//, ''));
    });
  }, [visible]);

  const handleServerUrlBlur = async () => {
    const host    = serverUrl.trim().replace(/\/$/, '');
    const fullUrl = `https://${host}`;
    if (!host) {
      const stored = await storage.getServerUrl();
      setServerUrl(stored?.replace(/^https?:\/\//, '') ?? '');
      return;
    }
    const prev = await storage.getServerUrl();
    if (fullUrl === prev) return;
    setUrlChecking(true);
    setUrlError(null);
    try {
      const res  = await fetch(`${fullUrl}/health`, { headers: { Accept: 'application/json' } });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.status !== 'ok') throw new Error();
      await storage.setServerUrl(fullUrl);
      api.setBaseUrl(fullUrl);
    } catch {
      setUrlError(t('setup.errorUnreachable'));
      const stored = await storage.getServerUrl();
      setServerUrl(stored?.replace(/^https?:\/\//, '') ?? '');
    } finally {
      setUrlChecking(false);
    }
  };

  const setLanguage = async (lang: string) => {
    await storage.setLanguage(lang);
    i18n.changeLanguage(lang);
  };

  const toggleAudio = async (key: keyof AudioSettings) => {
    const next = { ...audio, [key]: !audio[key] };
    setAudio(next);
    await storage.setAudioSettings(next);
  };

  return (
    <>
    <Modal
      visible={visible && !showDebugLog}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={s.overlay}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={StyleSheet.absoluteFillObject} />
        </TouchableWithoutFeedback>
        <View style={s.sheet}>

          <View style={s.handle} />
          <Text style={s.title}>{t('settings.title')}</Text>

          <ScrollView
            ref={scrollRef}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: kbHeight }}
          >

            {/* Language */}
            <Text style={s.sectionHeader}>{t('settings.sectionLanguage')}</Text>
            <View style={s.card}>
              <View style={s.langRow}>
                <TouchableOpacity
                  style={[s.langPill, i18n.language === 'de' && s.langPillActive]}
                  onPress={() => setLanguage('de')}
                >
                  <Text style={[s.langPillText, i18n.language === 'de' && s.langPillTextActive]}>
                    🇩🇪  Deutsch
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.langPill, i18n.language === 'en' && s.langPillActive]}
                  onPress={() => setLanguage('en')}
                >
                  <Text style={[s.langPillText, i18n.language === 'en' && s.langPillTextActive]}>
                    🇬🇧  English
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Audio */}
            <Text style={s.sectionHeader}>{t('settings.sectionAudio')}</Text>
            <View style={s.card}>
              <SettingRow
                label={t('settings.echoCancellation')}
                value={audio.echoCancellation}
                onToggle={() => toggleAudio('echoCancellation')}
              />
              <View style={s.divider} />
              <SettingRow
                label={t('settings.noiseSuppression')}
                value={audio.noiseSuppression}
                onToggle={() => toggleAudio('noiseSuppression')}
              />
              <View style={s.divider} />
              <SettingRow
                label={t('settings.gainControl')}
                value={audio.autoGainControl}
                onToggle={() => toggleAudio('autoGainControl')}
              />
              <View style={s.divider} />
              <SettingRow
                label={t('settings.dataSaverMode')}
                sublabel={t('settings.dataSaverModeHint')}
                value={audio.dataSaverMode}
                onToggle={() => toggleAudio('dataSaverMode')}
              />
            </View>

            {/* Server */}
            <Text style={s.sectionHeader}>{t('settings.sectionServer')}</Text>
            <View style={s.card}>
              <View style={s.urlRow}>
                <View style={s.urlLabelRow}>
                  <Text style={s.settingLabel}>{t('settings.serverUrl')}</Text>
                  {urlChecking && <ActivityIndicator size="small" color={Colors.primary} />}
                </View>
                <View style={[s.urlInputRow, urlError ? s.urlInputRowError : null]}>
                  <View style={s.urlSchemePill}>
                    <Text style={s.urlSchemeText}>https://</Text>
                  </View>
                  <View style={s.urlSeparator} />
                  <TextInput
                    style={s.urlInput}
                    value={serverUrl}
                    onChangeText={text => { setServerUrl(text); setUrlError(null); }}
                    onBlur={handleServerUrlBlur}
                    onFocus={() => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 150)}
                    placeholder={t('settings.serverUrlPlaceholder')}
                    placeholderTextColor={Colors.textMuted}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="url"
                  />
                </View>
                {urlError && <Text style={s.urlErrorText}>{urlError}</Text>}
              </View>
            </View>

            {/* Debug */}
            <Text style={s.sectionHeader}>{t('settings.sectionDebug')}</Text>
            <View style={s.card}>
              <TouchableOpacity style={s.settingRow} onPress={() => setShowDebugLog(true)}>
                <Text style={s.settingLabel}>{t('settings.debugLog')}</Text>
                <Text style={s.chevron}>›</Text>
              </TouchableOpacity>
            </View>

            {/* About */}
            <Text style={s.sectionHeader}>{t('settings.sectionAbout')}</Text>
            <View style={s.card}>
              <TouchableOpacity style={s.settingRow} onPress={onOpenLicenses}>
                <Text style={s.settingLabel}>{t('settings.openSourceLicenses')}</Text>
                <Text style={s.chevron}>›</Text>
              </TouchableOpacity>
            </View>
            <Text style={s.versionText}>
              {t('settings.version', { version: Constants.expoConfig?.version ?? '–' })}
            </Text>

          </ScrollView>

          <TouchableOpacity style={s.closeBtn} onPress={onClose}>
            <Text style={s.closeBtnText}>{t('generic.close')}</Text>
          </TouchableOpacity>

        </View>
      </View>
    </Modal>

    <DebugLogModal visible={showDebugLog} onClose={() => setShowDebugLog(false)} />
    </>
  );
}

function SettingRow({
  label, sublabel, value, onToggle,
}: { label: string; sublabel?: string; value: boolean; onToggle: () => void }) {
  return (
    <View style={s.settingRow}>
      <View style={s.settingLabelCol}>
        <Text style={s.settingLabel}>{label}</Text>
        {sublabel ? <Text style={s.settingSublabel}>{sublabel}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: Colors.micOff, true: Colors.micActive }}
        thumbColor={Colors.textPrimary}
      />
    </View>
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
    fontSize:      FontSize.xs,
    color:         Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom:  Spacing.xs,
    marginLeft:    2,
  },
  card: {
    backgroundColor: Colors.bgElevated,
    borderRadius:    Radius.lg,
    borderWidth:     1,
    borderColor:     Colors.border,
    marginBottom:    Spacing.md,
    overflow:        'hidden',
  },
  langRow: {
    flexDirection:   'row',
    gap:             Spacing.sm,
    padding:         Spacing.md,
  },
  langPill: {
    flex:              1,
    paddingVertical:   10,
    alignItems:        'center',
    borderRadius:      Radius.md,
    borderWidth:       1,
    borderColor:       Colors.border,
    backgroundColor:   Colors.bg,
  },
  langPillActive: {
    borderColor:     Colors.primary,
    backgroundColor: Colors.primaryGlow,
  },
  langPillText: {
    fontSize:   FontSize.sm,
    color:      Colors.textSecondary,
    fontWeight: FontWeight.medium,
  },
  langPillTextActive: {
    color:      Colors.primary,
    fontWeight: FontWeight.bold,
  },
  settingRow: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingVertical:   12,
    paddingHorizontal: Spacing.md,
  },
  settingLabelCol: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  settingLabel: {
    fontSize:   FontSize.sm,
    color:      Colors.textSecondary,
    fontWeight: FontWeight.medium,
  },
  settingSublabel: {
    fontSize:  FontSize.xs,
    color:     Colors.textMuted,
    marginTop: 2,
  },
  divider: {
    height:           1,
    backgroundColor:  Colors.border,
    marginHorizontal: Spacing.md,
  },
  urlRow: {
    paddingVertical:   Spacing.sm,
    paddingHorizontal: Spacing.md,
    gap:               Spacing.xs,
  },
  urlLabelRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           Spacing.sm,
  },
  urlInputRow: {
    flexDirection:   'row',
    alignItems:      'center',
    backgroundColor: Colors.bg,
    borderRadius:    Radius.md,
    borderWidth:     1,
    borderColor:     Colors.border,
    overflow:        'hidden',
  },
  urlInputRowError: {
    borderColor: Colors.danger,
  },
  urlSchemePill: {
    paddingVertical:   8,
    paddingHorizontal: Spacing.sm,
    backgroundColor:   Colors.bg,
  },
  urlSchemeText: {
    fontSize:   FontSize.sm,
    color:      Colors.primary,
    fontWeight: FontWeight.bold,
  },
  urlSeparator: {
    width:           1,
    alignSelf:       'stretch',
    backgroundColor: Colors.border,
  },
  urlErrorText: {
    fontSize: FontSize.xs,
    color:    Colors.danger,
  },
  urlInput: {
    flex:              1,
    fontSize:          FontSize.sm,
    color:             Colors.textPrimary,
    paddingVertical:   8,
    paddingHorizontal: 10,
  },
  urlDefault: {
    fontSize:  FontSize.xs,
    color:     Colors.textMuted,
    flex:      1,
    textAlign: 'right',
    marginLeft: Spacing.sm,
  },
  versionText: {
    fontSize:  FontSize.xs,
    color:     Colors.textMuted,
    textAlign: 'center',
    marginTop: -Spacing.xs,
  },
  chevron: {
    fontSize:   FontSize.lg,
    color:      Colors.textMuted,
    lineHeight: FontSize.lg,
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
