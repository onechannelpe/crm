export const REALTIME_CHANNELS = {
  eventLogs: "event-logs",
  recordImport: "records-import",
  gpvSnapshot: "gpv-snapshot",
} as const;

export type RealtimeChannelName =
  (typeof REALTIME_CHANNELS)[keyof typeof REALTIME_CHANNELS];

// `id` is present only for resumable streams. It is both the SSE event id and
// the reconnect cursor.
export interface RealtimeMessage {
  data: string;
  id?: string;
}

// Client reconnects resume from the last cursor.
export function realtimeStreamUrl(
  channel: RealtimeChannelName,
  id: string,
  cursor: string | null,
): string {
  const base = `/api/realtime/${channel}/${encodeURIComponent(id)}/stream`;

  return cursor === null
    ? base
    : `${base}?cursor=${encodeURIComponent(cursor)}`;
}
