import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Colors } from '@/utils/theme';
import { api } from '@/services/api';
import { storage } from '@/services/storage';

// Apply saved server URL on startup (falls back to env default if not set)
storage.getServerUrl().then(url => { if (url) api.setBaseUrl(url); });

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown:     false,
          contentStyle:    { backgroundColor: Colors.bg },
          animation:       'slide_from_right',
        }}
      />
    </>
  );
}
