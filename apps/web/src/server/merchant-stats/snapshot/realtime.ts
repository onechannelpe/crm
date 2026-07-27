import {
  gpvSnapshotTopic,
  parseGpvSnapshotProgressMessage,
  type GpvSnapshotProgressEvent,
} from "~/contracts/merchant-stats/imports";
import { GpvSnapshotJobId } from "~/domain/ids";
import { GPV_SNAPSHOT_PROGRESS_CHANNEL } from "~/server/platform/jobs/registry";
import {
  createTopicRealtimeChannel,
  snapshotReconciler,
} from "~/server/realtime/topic-realtime-channel";
import { isErr } from "~/shared/result";

import { buildGpvSnapshotProgressEvent } from "./progress";
import { type createGpvSnapshotJobRepo } from "./repo";

type GpvSnapshotJobReader = Pick<
  ReturnType<typeof createGpvSnapshotJobRepo>,
  "findById"
>;

export async function gpvSnapshotJobSnapshot(
  jobs: GpvSnapshotJobReader,
  jobId: GpvSnapshotJobId,
): Promise<string | null> {
  const job = await jobs.findById(jobId);

  return job ? JSON.stringify(buildGpvSnapshotProgressEvent(job)) : null;
}

export function createGpvSnapshotsRealtime(jobs: GpvSnapshotJobReader) {
  return createTopicRealtimeChannel<GpvSnapshotProgressEvent>({
    name: "gpv-snapshots",
    channel: GPV_SNAPSHOT_PROGRESS_CHANNEL,
    parseEvent: parseGpvSnapshotProgressMessage,
    topicForEvent: (event) => gpvSnapshotTopic.of(event.jobId),
    reconcile: snapshotReconciler(gpvSnapshotTopic, async (raw) => {
      const jobId = GpvSnapshotJobId.parse(raw);

      if (isErr(jobId)) {
        return null;
      }

      return gpvSnapshotJobSnapshot(jobs, jobId.value);
    }),
  });
}
