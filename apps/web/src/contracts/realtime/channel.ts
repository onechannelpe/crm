export const REALTIME_CHANNELS = {
  eventLogs: "event-logs",
  recordImport: "records-import",
  gpvSnapshot: "gpv-snapshot",
} as const;

export type RealtimeChannelName =
  (typeof REALTIME_CHANNELS)[keyof typeof REALTIME_CHANNELS];

export interface RealtimeMessage {
  // Present only for resumable streams.
  id?: string;
  data: string;
}

export function realtimeStreamUrl(
  channel: RealtimeChannelName,
  id: string,
): string {
  return `/api/realtime/${channel}/${encodeURIComponent(id)}/stream`;
}
