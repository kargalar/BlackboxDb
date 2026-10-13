export type DebugEventLevel = 'info' | 'success' | 'warn' | 'error';

export type DebugEventPayload = {
  level: DebugEventLevel;
  scope: string;
  message: string;
  data?: unknown;
  timestamp?: string;
};

const EVENT_NAME = 'bb:debug';

export function emitDebugEvent(payload: DebugEventPayload) {
  if (typeof window === 'undefined') return;
  const detail: DebugEventPayload = {
    ...payload,
    timestamp: payload.timestamp ?? new Date().toISOString(),
  };
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail }));
}
