import { eventLogsChannel } from "~/server/event-logs/realtime";
import { gpvSnapshotChannel } from "~/server/merchant-stats/snapshot/realtime";
import { recordImportChannel } from "~/server/records/imports/realtime";

import type { RealtimeChannel } from "./channel";

export const realtimeChannels: readonly RealtimeChannel[] = [
  eventLogsChannel,
  gpvSnapshotChannel,
  recordImportChannel,
];

export function findRealtimeChannel(name: string): RealtimeChannel | null {
  return realtimeChannels.find((channel) => channel.name === name) ?? null;
}
