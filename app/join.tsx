import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Colors } from '@/utils/theme';
import { api } from '@/services/api';
import { storage } from '@/services/storage';

export default function JoinScreen() {
  const { room: roomId } = useLocalSearchParams<{ room: string }>();

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
        const result = await api.joinRoom(roomId, displayName);
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
      } catch {
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
