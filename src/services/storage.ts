import * as SecureStore from 'expo-secure-store';

const DISPLAY_NAME_KEY    = 'motovoice_display_name';
const AUDIO_SETTINGS_KEY  = 'motovoice_audio_settings';
const LANGUAGE_KEY        = 'motovoice_language';
const SERVER_URL_KEY      = 'motovoice_server_url';
const LAST_CHANNEL_KEY    = 'motovoice_last_channel';

export interface LastChannel {
  roomId:      string;
  isHost:      boolean;
  joinedAt:    string; // ISO date string
  deleteSecret?: string;
}

export interface AudioSettings {
  echoCancellation: boolean;
  noiseSuppression: boolean;
  autoGainControl:  boolean;
  dataSaverMode:    boolean;
}

export const DEFAULT_AUDIO_SETTINGS: AudioSettings = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl:  true,
  dataSaverMode:    false,
};

export const storage = {
  getDisplayName: async (): Promise<string | null> => {
    return SecureStore.getItemAsync(DISPLAY_NAME_KEY);
  },

  setDisplayName: async (name: string): Promise<void> => {
    await SecureStore.setItemAsync(DISPLAY_NAME_KEY, name.trim());
  },

  getAudioSettings: async (): Promise<AudioSettings> => {
    const raw = await SecureStore.getItemAsync(AUDIO_SETTINGS_KEY);
    if (!raw) return DEFAULT_AUDIO_SETTINGS;
    try {
      return { ...DEFAULT_AUDIO_SETTINGS, ...JSON.parse(raw) };
    } catch {
      return DEFAULT_AUDIO_SETTINGS;
    }
  },

  setAudioSettings: async (settings: AudioSettings): Promise<void> => {
    await SecureStore.setItemAsync(AUDIO_SETTINGS_KEY, JSON.stringify(settings));
  },

  getLanguage: async (): Promise<string | null> => {
    return SecureStore.getItemAsync(LANGUAGE_KEY);
  },

  setLanguage: async (lang: string): Promise<void> => {
    await SecureStore.setItemAsync(LANGUAGE_KEY, lang);
  },

  getServerUrl: async (): Promise<string | null> => {
    return SecureStore.getItemAsync(SERVER_URL_KEY);
  },

  getLastChannel: async (): Promise<LastChannel | null> => {
    const raw = await SecureStore.getItemAsync(LAST_CHANNEL_KEY);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  },

  setLastChannel: async (channel: LastChannel): Promise<void> => {
    await SecureStore.setItemAsync(LAST_CHANNEL_KEY, JSON.stringify(channel));
  },

  clearLastChannel: async (): Promise<void> => {
    await SecureStore.deleteItemAsync(LAST_CHANNEL_KEY);
  },

  setServerUrl: async (url: string | null): Promise<void> => {
    if (url) {
      await SecureStore.setItemAsync(SERVER_URL_KEY, url.trim().replace(/\/$/, ''));
    } else {
      await SecureStore.deleteItemAsync(SERVER_URL_KEY);
    }
  },
};
