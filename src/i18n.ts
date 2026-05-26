import i18n from 'i18next';
import { initReactI18next, NativeModules, Platform } from 'react-i18next';
import de from './locales/de.json';
import en from './locales/en.json';
import { storage } from './services/storage';

const resources = {
  de: { translation: de },
  en: { translation: en },
};

// Read system language from React Native without a native library
function getSystemLanguage(): string {
  const availableLanguages = Object.keys(resources);

  try {
    // Read system locale — works on Android + iOS without an extra library
    const locale: string =
      Platform.OS === 'android'
        ? NativeModules.I18nManager?.localeIdentifier ??
          NativeModules.SettingsManager?.settings?.AppleLocale ??
          'en'
        : NativeModules.SettingsManager?.settings?.AppleLocale ??
          NativeModules.SettingsManager?.settings?.AppleLanguages?.[0] ??
          'en';

    // e.g. "de_DE" or "de-DE" → "de"
    const lang = locale.split(/[-_]/)[0].toLowerCase();

    return availableLanguages.includes(lang) ? lang : 'en';
  } catch {
    return 'en';
  }
}

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng:         getSystemLanguage(),
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

// Apply persisted language override after init
storage.getLanguage().then(lang => {
  if (lang && lang !== i18n.language) {
    i18n.changeLanguage(lang);
  }
});

export default i18n;
