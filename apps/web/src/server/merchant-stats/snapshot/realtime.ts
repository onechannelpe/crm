import {
  gpvSnapshotTopic,
  parseGpvSnapshotProgressMessage,
  type GpvSnapshotProgressEvent,
} from "~/contracts/merchant-stats/imports";
import { GpvSnapshotJobId } from "~/domain/ids";
import { db } from "~/server/platform/database/db";
import { GPV_SNAPSHOT_PROGRESS_CHANNEL } from "~/server/platform/jobs/registry";
import {
  createTopicRealtimeChannel,
  snapshotReconciler,
} from "~/server/realtime/topic-realtime-channel";
import { isErr } from "~/shared/result";

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
