import { useEffect } from 'react';
import { useAudioPlayer } from 'expo-audio';
import { ConnectionState } from 'livekit-client';

const RECONNECTING_SOUND = require('../../assets/reconnecting.mp3');

const RECONNECTING_STATES = new Set<ConnectionState>([
  ConnectionState.Reconnecting,
  ConnectionState.SignalReconnecting,
]);

export function useReconnectSound(connectionState: ConnectionState) {
  // keepAudioSessionActive: don't let expo-audio activate/deactivate its own
  // AVAudioSession around playback — instead reuse whatever session LiveKit
  // already holds.
  const player = useAudioPlayer(RECONNECTING_SOUND, { keepAudioSessionActive: true });

  useEffect(() => {
    if (RECONNECTING_STATES.has(connectionState)) {
      player.loop = true;
      player.play();
    } else {
      player.pause();
    }
  }, [connectionState, player]);
}
