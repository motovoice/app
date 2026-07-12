// ─── MotoVoice API Service ────────────────────────────────────

import Constants from 'expo-constants';

export const DEFAULT_API_BASE = '';

export const MIN_SERVER_VERSION: string =
  Constants.expoConfig?.extra?.minServerVersion;

let _apiBase = DEFAULT_API_BASE;

export interface CreateRoomResponse {
  roomId:        string;
  livekitToken:  string;
  livekitUrl:    string;
  expiresAt:     string;
  qrPayload:     string;
  deleteSecret:  string;
  hostIdentity?: string;
}

export interface JoinRoomResponse {
  roomId:        string;
  livekitToken:  string;
  livekitUrl:    string;
  hostIdentity?: string;
}

export interface HealthResponse {
  status:   string;
  version?: string;
}

export type CompatResult =
  | { compatible: true;  serverVersion: string }
  | { compatible: false; serverVersion: string; minVersion: string };

function semverCompare(a: string, b: string): number {
  const parse = (v: string) => v.split('.').map(n => parseInt(n, 10) || 0);
  const [a1, a2, a3] = parse(a);
  const [b1, b2, b3] = parse(b);
  return a1 !== b1 ? a1 - b1 : a2 !== b2 ? a2 - b2 : a3 - b3;
}

export function checkCompatibility(health: HealthResponse): CompatResult {
  const sv = health.version;
  if (!sv) return { compatible: true, serverVersion: '?' };
  if (semverCompare(sv, MIN_SERVER_VERSION) < 0) {
    return { compatible: false, serverVersion: sv, minVersion: MIN_SERVER_VERSION };
  }
  return { compatible: true, serverVersion: sv };
}

export interface RoomStatus {
  id:                string;
  created_at:        string;
  expires_at:        string;
  participant_count: number;
  is_active:         boolean;
}

async function request<T>(
  path: string,
  options?: RequestInit
): Promise<T | null> {
  const headers: Record<string, string> = {};
  if (options?.body) headers['Content-Type'] = 'application/json';
  if (options?.headers) Object.assign(headers, options.headers);

  const method = options?.method ?? 'GET';
  const { headers: _h, ...rest } = (options ?? {}) as any;

  const { debugLog } = await import('@/services/debugLog');

  try {
    const res = await fetch(`${_apiBase}${path}`, { ...rest, headers });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const err = body?.error ?? res.status;
      debugLog.log("warn", `${method} ${path} → ${err}`);
      throw new Error(err);
    }

    debugLog.log("info", `${method} ${path} → ${res.status}`);
    if (res.status === 204 || res.headers.get('content-length') === '0') return null;
    return res.json();
  } catch (e: any) {
    if (!e.message?.startsWith('API')) {
      debugLog.log("error", `${method} ${path} → ${e.message ?? 'network error'}`);
    }
    throw e;
  }
}

export const api = {
  getBaseUrl: () => _apiBase,
  setBaseUrl: (url: string) => { _apiBase = url.trim().replace(/\/$/, '') || DEFAULT_API_BASE; },

  checkHealth: async (baseUrl?: string): Promise<HealthResponse> => {
    const url = (baseUrl ?? _apiBase).replace(/\/$/, '');
    const res  = await fetch(`${url}/health`, { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error('unreachable');
    const json = await res.json().catch(() => ({}));
    if (json?.status !== 'ok') throw new Error('unreachable');
    return json as HealthResponse;
  },

  /** Create a new voice channel */
  createRoom: (displayName: string) =>
    request<CreateRoomResponse>('/api/rooms', {
      method: 'POST',
      body: JSON.stringify({ displayName }),
    }),

  /** Join a room via scanned QR code */
  joinRoom: (roomId: string, displayName: string) =>
    request<JoinRoomResponse>(`/api/rooms/${roomId}/join`, {
      method: 'POST',
      body: JSON.stringify({ displayName }),
    }),

  /** leave a room */
  leaveRoom: (roomId: string, displayName: string) =>
    request<null>(`/api/rooms/${roomId}/leave`, {
      method: 'POST',
      body: JSON.stringify({ displayName }),
    }),

  /** Fetch room status */
  getRoomStatus: (roomId: string) =>
    request<RoomStatus>(`/api/rooms/${roomId}`),

  /** Manually close the room (host only) */
  deleteRoom: (roomId: string, deleteSecret: string) =>
    request<void>(`/api/rooms/${roomId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${deleteSecret}` },
    }),
};
