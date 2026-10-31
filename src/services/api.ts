// ─── MotoVoice API Service ────────────────────────────────────

import Constants from 'expo-constants';

export const DEFAULT_API_BASE = '';

export const MIN_SERVER_VERSION: string =
  Constants.expoConfig?.extra?.minServerVersion;

let _apiBase = DEFAULT_API_BASE;
let _authPassword: string | null = null;
let _deviceId: string | null = null;

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
  status:         string;
  version?:       string;
  authRequired?:  boolean;
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

export interface InviteInfo {
  roomId: string;
  server: string | null;
}

/** Builds the motovoice:// deep-link payload (QR code + join link), embedding the
 *  room's server (default: the configured one) so recipients on a different server can still join. */
export function buildInviteUri(roomId: string, server: string = _apiBase): string {
  return `motovoice://join?room=${roomId}&server=${encodeURIComponent(server)}`;
}

/** Parses a scanned/opened motovoice:// invite URI. Returns null if it's not a valid invite. */
export function parseInviteUri(data: string): InviteInfo | null {
  try {
    const url = new URL(data);
    if (url.protocol !== 'motovoice:') return null;
    const roomId = url.searchParams.get('room');
    if (!roomId) return null;
    const server = url.searchParams.get('server');
    return { roomId, server: server ? server.trim().replace(/\/$/, '') : null };
  } catch {
    return null;
  }
}

export interface RoomStatus {
  id:                string;
  created_at:        string;
  expires_at:        string;
  participant_count: number;
  is_active:         boolean;
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(
  path: string,
  options?: RequestInit,
  server?: string
): Promise<T | null> {
  // `server` is a room's server from an invite. It applies to this request only, and the
  // configured server's password must never be sent to a different one.
  const base = server || _apiBase;
  const headers: Record<string, string> = {};
  if (options?.body) headers['Content-Type'] = 'application/json';
  if (_authPassword && base === _apiBase) headers['X-Server-Password'] = _authPassword;
  if (_deviceId) headers['X-Device-Id'] = _deviceId;
  if (options?.headers) Object.assign(headers, options.headers);

  const method = options?.method ?? 'GET';
  const { headers: _h, ...rest } = (options ?? {}) as any;

  const { debugLog } = await import('@/services/debugLog');

  try {
    const res = await fetch(`${base}${path}`, { ...rest, headers });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const err = body?.error ?? res.status;
      debugLog.log("warn", `${method} ${path} → ${err}`);
      throw new ApiError(res.status, err);
    }

    debugLog.log("info", `${method} ${path} → ${res.status}`);
    if (res.status === 204 || res.headers.get('content-length') === '0') return null;
    return res.json();
  } catch (e: any) {
    if (!(e instanceof ApiError)) {
      debugLog.log("error", `${method} ${path} → ${e.message ?? 'network error'}`);
    }
    throw e;
  }
}

export const api = {
  getBaseUrl: () => _apiBase,
  setBaseUrl: (url: string) => { _apiBase = url.trim().replace(/\/$/, '') || DEFAULT_API_BASE; },

  getAuthPassword: () => _authPassword,
  setAuthPassword: (password: string | null) => { _authPassword = password || null; },

  setDeviceId: (id: string) => { _deviceId = id; },

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
  joinRoom: (roomId: string, displayName: string, server?: string) =>
    request<JoinRoomResponse>(`/api/rooms/${roomId}/join`, {
      method: 'POST',
      body: JSON.stringify({ displayName }),
    }, server),

  /** leave a room */
  leaveRoom: (roomId: string, displayName: string, server?: string) =>
    request<null>(`/api/rooms/${roomId}/leave`, {
      method: 'POST',
      body: JSON.stringify({ displayName }),
    }, server),

  /** Fetch room status */
  getRoomStatus: (roomId: string, server?: string) =>
    request<RoomStatus>(`/api/rooms/${roomId}`, undefined, server),

  /** Manually close the room (host only) */
  deleteRoom: (roomId: string, deleteSecret: string, server?: string) =>
    request<void>(`/api/rooms/${roomId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${deleteSecret}` },
    }, server),
};
