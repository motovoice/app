import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Room,
  RoomEvent,
  ConnectionState,
  AudioPresets,
  type RemoteParticipant,
} from 'livekit-client';
import { AudioSession } from '@livekit/react-native';

export interface Participant {
  identity: string;
  name: string;
  isSpeaking: boolean;
  isMuted: boolean;
  isLocal: boolean;
  isDisconnected: boolean;
  isHost: boolean;
}

export interface ConnectionStats {
  latencyMs: number | null;
  packetLoss: number | null;
  jitterMs: number | null;
  bitrateKbps: number | null;
  audioBitrateKbps: number | null;
  transport: string | null;
  updatedAt: Date | null;
}

interface UseLiveKitRoomOptions {
  url: string;
  token: string;
  hostName?: string;
  echoCancellation?: boolean;
  noiseSuppression?: boolean;
  autoGainControl?: boolean;
  dataSaverMode?: boolean;
}

export function useLiveKitRoom({
  url, token, hostName = '',
  echoCancellation = true,
  noiseSuppression = true,
  autoGainControl = true,
  dataSaverMode = false,
}: UseLiveKitRoomOptions) {
  const roomRef = useRef<Room | null>(null);
  const hostNameRef = useRef<string>(hostName);
  const audioRef = useRef({ echoCancellation, noiseSuppression, autoGainControl, dataSaverMode });
  audioRef.current = { echoCancellation, noiseSuppression, autoGainControl, dataSaverMode };
  hostNameRef.current = hostName;

  const ghostsRef = useRef<Map<string, { participant: Participant; timer: ReturnType<typeof setTimeout> }>>(new Map());

  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.Disconnected);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isMuted, setIsMuted] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [roomClosedByHost, setRoomClosedByHost] = useState(false);
  const [stats, setStats] = useState<ConnectionStats>({
    latencyMs: null, packetLoss: null, jitterMs: null,
    bitrateKbps: null, audioBitrateKbps: null, transport: null, updatedAt: null,
  });
  const prevOutboundRef = useRef<{ bytesSent: number; timestamp: number } | null>(null);

  const refreshParticipants = useCallback((room: Room) => {
    try {
      const all: Participant[] = [];
      const activeIdentities = new Set<string>();
      const local = room.localParticipant;

      if (local) {
        const localIsHost = !!hostNameRef.current &&
          (local.name === hostNameRef.current || local.identity === hostNameRef.current);
        all.push({
          identity: local.identity ?? '', name: local.name || local.identity || 'Du',
          isSpeaking: local.isSpeaking ?? false, isMuted: (local as any).isMuted ?? true,
          isLocal: true, isDisconnected: false, isHost: localIsHost,
        });
        if (local.identity) activeIdentities.add(local.identity);
      }

      const remotes = room.remoteParticipants;
      if (remotes) {
        (remotes instanceof Map ? Array.from(remotes.values()) : Object.values(remotes as any))
          .forEach((p: any) => {
            if (!p?.identity) return;
            const remoteIsHost = !!hostNameRef.current &&
              (p.name === hostNameRef.current || p.identity === hostNameRef.current);
            all.push({
              identity: p.identity, name: p.name || p.identity,
              isSpeaking: p.isSpeaking ?? false, isMuted: p.isMuted ?? true,
              isLocal: false, isDisconnected: false, isHost: remoteIsHost,
            });
            activeIdentities.add(p.identity);
            if (ghostsRef.current.has(p.identity)) {
              clearTimeout(ghostsRef.current.get(p.identity)!.timer);
              ghostsRef.current.delete(p.identity);
            }
          });
      }

      ghostsRef.current.forEach((ghost, identity) => {
        if (!activeIdentities.has(identity)) all.push(ghost.participant);
      });

      setParticipants(all);
    } catch (e) {
      console.warn('refreshParticipants error:', e);
    }
  }, []);

  const updateStats = useCallback(async (room: Room) => {
    try {
      const engine = (room as any).engine;
      if (!engine) return;
      const pcTransport = engine.pcManager?.publisher ?? engine.pcManager?.subscriber;
      if (!pcTransport) return;
      let reports: RTCStatsReport | null = null;
      try { reports = await pcTransport.getStats(); } catch {
        const pc = pcTransport._pc ?? pcTransport.pc;
        if (!pc?.getStats) return;
        reports = await pc.getStats();
      }
      if (!reports) return;

      let latency: number | null = null, loss: number | null = null,
        jitter: number | null = null, bitrate: number | null = null,
        audioBitrate: number | null = null, transport: string | null = null;

      const now = Date.now();
      reports.forEach((r: any) => {
        if (r.type === 'candidate-pair' && (r.state === 'succeeded' || r.nominated)) {
          if (r.currentRoundTripTime != null) latency = Math.round(r.currentRoundTripTime * 1000);
          if (r.availableOutgoingBitrate != null) bitrate = Math.round(r.availableOutgoingBitrate / 1000);
        }
        if (r.type === 'inbound-rtp' && r.kind === 'audio') {
          if (r.jitter != null) jitter = Math.round(r.jitter * 1000);
          if (r.packetsLost != null && r.packetsReceived != null) {
            const total = r.packetsReceived + r.packetsLost;
            loss = total > 0 ? Math.round((r.packetsLost / total) * 1000) / 10 : 0;
          }
        }
        if (r.type === 'outbound-rtp' && r.kind === 'audio' && r.bytesSent != null) {
          const prev = prevOutboundRef.current;
          if (prev) {
            const dtMs = now - prev.timestamp;
            const dBytes = r.bytesSent - prev.bytesSent;
            if (dtMs > 0 && dBytes >= 0) {
              audioBitrate = Math.round((dBytes * 8) / (dtMs / 1000) / 1000);
            }
          }
          prevOutboundRef.current = { bytesSent: r.bytesSent, timestamp: now };
        }
        if (r.type === 'local-candidate' && r.protocol) transport = (r.protocol as string).toUpperCase();
      });
      setStats({ latencyMs: latency, packetLoss: loss, jitterMs: jitter, bitrateKbps: bitrate, audioBitrateKbps: audioBitrate, transport, updatedAt: new Date() });
    } catch { /* Stats unavailable */ }
  }, []);

  useEffect(() => {
    if (!url || !token) return;

    const room = new Room({
      adaptiveStream: true,
      dynacast: true,
      audioCaptureDefaults: {
        echoCancellation: audioRef.current.echoCancellation,
        noiseSuppression: audioRef.current.noiseSuppression,
        autoGainControl: audioRef.current.autoGainControl,
      },
      publishDefaults: {
        audioPreset: audioRef.current.dataSaverMode
          ? AudioPresets.telephone   // 12 kbit/s
          : AudioPresets.speech,     // 24 kbit/s
      },
    });

    roomRef.current = room;

    room.on(RoomEvent.ConnectionStateChanged, (state: ConnectionState) => setConnectionState(state));
    room.on(RoomEvent.ParticipantConnected, () => refreshParticipants(room));
    room.on(RoomEvent.ParticipantDisconnected, (p: RemoteParticipant) => {
      const ghostIsHost = !!hostNameRef.current &&
        (p.name === hostNameRef.current || p.identity === hostNameRef.current);
      const ghost: Participant = {
        identity: p.identity, name: p.name ?? p.identity,
        isSpeaking: false, isMuted: true, isLocal: false, isDisconnected: true, isHost: ghostIsHost,
      };
      if (ghostsRef.current.has(p.identity)) clearTimeout(ghostsRef.current.get(p.identity)!.timer);
      const timer = setTimeout(() => {
        ghostsRef.current.delete(p.identity);
        setParticipants(prev => prev.filter(x => x.identity !== p.identity));
      }, 30_000);
      ghostsRef.current.set(p.identity, { participant: ghost, timer });
      refreshParticipants(room);
    });
    room.on(RoomEvent.ActiveSpeakersChanged, () => refreshParticipants(room));
    room.on(RoomEvent.TrackMuted, () => refreshParticipants(room));
    room.on(RoomEvent.TrackUnmuted, () => refreshParticipants(room));
    room.on(RoomEvent.Disconnected, (reason?: any) => {
      setConnectionState(ConnectionState.Disconnected);
      setParticipants([]);
      if (reason === 5 || reason?.value === 5 || reason === 'ROOM_DELETED') {
        setRoomClosedByHost(true);
      }
    });

    const configureAudio = async () => {
      await AudioSession.startAudioSession();
    };

    const connect = async () => {
      try {
        setError(null);
        await configureAudio();
        await room.connect(url, token);
        await room.localParticipant.setMicrophoneEnabled(false);
        setIsMuted(true);
        refreshParticipants(room);
      } catch (e: any) {
        setError(e?.message ?? 'Connection failed');
        setConnectionState(ConnectionState.Disconnected);
      }
    };

    connect();

    const statsInterval = setInterval(() => { if (roomRef.current) updateStats(roomRef.current); }, 3000);

    return () => {
      clearInterval(statsInterval);
      ghostsRef.current.forEach(({ timer }) => clearTimeout(timer));
      ghostsRef.current.clear();
      room.disconnect();
      roomRef.current = null;
      AudioSession.stopAudioSession().catch(() => {});
    };
  }, [url, token, refreshParticipants, updateStats]);

  const startSpeaking = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;
    await room.localParticipant.setMicrophoneEnabled(true);
    setIsMuted(false);
  }, []);

  const stopSpeaking = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;
    await room.localParticipant.setMicrophoneEnabled(false);
    setIsMuted(true);
  }, []);

  const disconnect = useCallback(() => {
    roomRef.current?.disconnect();
  }, []);

  return {
    connectionState, participants, isMuted, error,
    roomClosedByHost, stats,
    startSpeaking, stopSpeaking, disconnect,
  };
}
