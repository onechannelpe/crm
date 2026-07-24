import {
  gpvSnapshotTopic,
  parseGpvSnapshotProgressMessage,
  type GpvSnapshotProgressEvent,
} from "~/contracts/merchant-stats/imports";
import { db } from "~/lib/db/db";
import { GPV_SNAPSHOT_PROGRESS_CHANNEL } from "~/lib/job-queue/registry";
import {
  createTopicRealtimeChannel,
  snapshotReconciler,
} from "~/server/realtime/topic-realtime-channel";
import { GpvSnapshotJobId } from "~/server/shared/ids";
import { isErr } from "~/server/shared/result";

import { buildGpvSnapshotProgressEvent } from "./progress";
import { createGpvSnapshotJobRepo } from "./repo";

export async function gpvSnapshotJobSnapshot(
  jobId: GpvSnapshotJobId,
): Promise<string | null> {
  const job = await createGpvSnapshotJobRepo(db).findById(jobId);

  return job ? JSON.stringify(buildGpvSnapshotProgressEvent(job)) : null;
}

export const gpvSnapshotsRealtime =
  createTopicRealtimeChannel<GpvSnapshotProgressEvent>({
    name: "gpv-snapshots",
    channel: GPV_SNAPSHOT_PROGRESS_CHANNEL,
    parseEvent: parseGpvSnapshotProgressMessage,
    topicForEvent: (event) => gpvSnapshotTopic.of(event.jobId),
    reconcile: snapshotReconciler(gpvSnapshotTopic, async (raw) => {
      const jobId = GpvSnapshotJobId.parse(raw);

      if (isErr(jobId)) {
        return null;
      }

      return gpvSnapshotJobSnapshot(jobId.value);
    }),
  });
