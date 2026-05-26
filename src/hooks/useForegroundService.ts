import { useEffect, useRef, useState } from 'react';
import { Platform, PermissionsAndroid } from 'react-native';
import notifee, { AndroidImportance, AndroidVisibility, AuthorizationStatus } from 'react-native-notify-kit';
import { ConnectionState } from 'livekit-client';

const CHANNEL_ID  = 'motovoice_channel';
const NOTIFY_ID    = 'motovoice_foreground';

function buildBody(connectionState: ConnectionState, roomId: string): string {
  switch (connectionState) {
    case ConnectionState.Reconnecting:
      return 'Reconnecting…';
    case ConnectionState.SignalReconnecting:
      return 'Reconnecting…';
    case ConnectionState.Disconnected:
      return 'Connection interrupted';
    case ConnectionState.Connecting:
      return 'Connecting…';
    default:
      return roomId ? `Connected to ${roomId.slice(0, 8)}…` : 'MotoVoice Active';
  }
}

async function showNotification(body: string, asService: boolean) {
  await notifee.createChannel({
    id: CHANNEL_ID,
    name: 'Voice Channel',
    importance: AndroidImportance.DEFAULT,
    visibility: AndroidVisibility.PUBLIC,
  });
  await notifee.displayNotification({
    id: NOTIFY_ID,
    title: 'Voice channel',
    body,
    android: {
      channelId: CHANNEL_ID,
      asForegroundService: asService,
      importance: AndroidImportance.DEFAULT,
      visibility: AndroidVisibility.PUBLIC,
      smallIcon: 'icon_monochrome',
      ongoing: true,
      showChronometer: true,
      pressAction: { id: 'default' },
    },
    ios: {
      foregroundPresentationOptions: {
      badge: false,
      sound: false,
      banner: true,
      list: true,
    },
    attachments: [
      {
        // React Native asset.
        url: require('../../assets/icon_monochrome.png'),
      },
    ],
  },
  });
}

export function useForegroundService(roomId: string, connectionState: ConnectionState) {
  const startedRef = useRef(false);
  const connectionStateRef = useRef(connectionState);
  const roomIdRef = useRef(roomId);
  connectionStateRef.current = connectionState;
  roomIdRef.current = roomId;
  const [permissionDenied, setPermissionDenied] = useState(false);

  // Start foreground service once on mount, stop on unmount
  useEffect(() => {
    const start = async () => {
      if (Platform.OS === 'android') {
        const notify_permission = await notifee.requestPermission();
        const results = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        ]);
        const audioGranted = results[PermissionsAndroid.PERMISSIONS.RECORD_AUDIO] === PermissionsAndroid.RESULTS.GRANTED;
        if (!audioGranted || notify_permission.authorizationStatus === AuthorizationStatus.DENIED) {
          setPermissionDenied(true);
          return;
        }
      }
      startedRef.current = true;
      // Use refs to get the latest state — permission dialogs take time and
      // connectionState in the closure may be stale by the time we get here.
      await showNotification(buildBody(connectionStateRef.current, roomIdRef.current), true);
    };

    start().catch((e) => {
      console.warn('[ForegroundService] start failed:', e);
      setPermissionDenied(true);
    });

    return () => {
      const wasStarted = startedRef.current;
      startedRef.current = false;
      if (wasStarted) notifee.stopForegroundService().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update notification text whenever connection state or roomId changes
  useEffect(() => {
    if (!startedRef.current) return;

    showNotification(buildBody(connectionState, roomId), true).catch(() => {});
  }, [connectionState, roomId]);

  return { permissionDenied };
}
