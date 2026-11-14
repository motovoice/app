import { useCallback } from 'react';
import { useAudioPlayer, type AudioPlayer } from 'expo-audio';

const JOIN_SOUND  = require('../../assets/participant_join.mp3');
const LEAVE_SOUND = require('../../assets/participant_leave.mp3');

function replay(player: AudioPlayer) {
  player.seekTo(0);
  player.play();
}

export function useParticipantSounds() {
  // keepAudioSessionActive: reuse LiveKit's audio session (see useReconnectSound).
  const joinPlayer  = useAudioPlayer(JOIN_SOUND, { keepAudioSessionActive: true });
  const leavePlayer = useAudioPlayer(LEAVE_SOUND, { keepAudioSessionActive: true });

  const playJoinSound  = useCallback(() => replay(joinPlayer), [joinPlayer]);
  const playLeaveSound = useCallback(() => replay(leavePlayer), [leavePlayer]);

  return { playJoinSound, playLeaveSound };
}
