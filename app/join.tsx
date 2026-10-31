import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/utils/theme';
import { api, ApiError, checkCompatibility } from '@/services/api';
import { storage } from '@/services/storage';

export default function JoinScreen() {
  const { t } = useTranslation();
  const { room: roomId, server: serverParam } = useLocalSearchParams<{ room: string; server?: string }>();
  const server = serverParam?.trim().replace(/\/$/, '');

  useEffect(() => {
    if (!roomId) {
      router.replace('/');
      return;
    }

    const join = async () => {
      const displayName = await storage.getDisplayName();
      if (!displayName) {
        router.replace('/');
        return;
      }

      try {
        if (!server && !(await storage.getServerUrl())) {
          Alert.alert(t('generic.error'), t('scan.noServer'));
          router.replace('/');
          return;
        }

        // Invite points to a different server: use it for this channel only, settings stay untouched.
        if (server && server !== api.getBaseUrl()) {
          const health = await api.checkHealth(server);
          const compat = checkCompatibility(health);
          if (!compat.compatible) {
            Alert.alert(t('generic.error'), t('setup.errorServerOutdated', { min: compat.minVersion, server: compat.serverVersion }));
            router.replace('/');
            return;
          }
        }

        const result = await api.joinRoom(roomId, displayName, server);
        if (!result) throw new Error('no result');
        router.replace({
          pathname: '/channel',
          params: {
            roomId:       result.roomId,
            server:       server ?? '',
            livekitToken: result.livekitToken,
            livekitUrl:   result.livekitUrl,
            isHost:       '0',
            hostIdentity: result.hostIdentity ?? '',
          },
        });
      } catch (e: any) {
        if (e instanceof ApiError && e.status === 401) {
          Alert.alert(t('generic.error'), t('setup.wrongPassword'));
        }
        router.replace('/');
      }
    };

    join();
  }, [roomId]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={Colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex:            1,
    backgroundColor: Colors.bg,
    alignItems:      'center',
    justifyContent:  'center',
  },
});
