import { getGpvSnapshotProgress } from "~/actions/merchant-gpv/imports";
import {
  parseGpvSnapshotProgressMessage,
  type GpvSnapshotProgressEvent,
} from "~/contracts/merchant-stats/imports";
import {
  subscribeState,
  type StateSubscription,
} from "~/lib/realtime/subscribe-state";

function isTerminal(event: GpvSnapshotProgressEvent): boolean {
  return event.queueState === "done" || event.queueState === "failed";
}

export function subscribeToGpvSnapshotImport(
  jobId: string,
  onProgress: () => void,
): StateSubscription {
  return subscribeState({
    streamUrl: `/api/dashboards/imports/${jobId}/stream`,
    parse: parseGpvSnapshotProgressMessage,
    fetchLatest: () => getGpvSnapshotProgress(jobId),
    onEvent: onProgress,
    until: isTerminal,
  });
}
