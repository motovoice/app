import { useEffect } from 'react';
import { useAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { ConnectionState } from 'livekit-client';

const RECONNECTING_SOUND = require('../../assets/reconnecting.mp3');

const RECONNECTING_STATES = new Set<ConnectionState>([
  ConnectionState.Reconnecting,
  ConnectionState.SignalReconnecting,
]);

export function useReconnectSound(connectionState: ConnectionState) {
  const player = useAudioPlayer(RECONNECTING_SOUND);

  useEffect(() => {
    if (!RECONNECTING_STATES.has(connectionState)) {
      player.pause();
      return;
    }

    // Allow expo-audio to mix with LiveKit's VoIP audio session instead of
    // competing with it — without this the loop silently fails after the first play.
    setAudioModeAsync({
      interruptionMode: 'mixWithOthers',
      allowsRecording: true,   // keep LiveKit's mic alive
      playsInSilentMode: true,
    }).then(() => {
      player.loop = true;
      player.play();
    }).catch(() => {
      player.loop = true;
      player.play();
    });
  }, [connectionState, player]);
}
