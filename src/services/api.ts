// ─── MotoVoice API Service ────────────────────────────────────

export const DEFAULT_API_BASE = '';

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
