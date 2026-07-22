import {
  parseRecordImportProgressMessage,
  recordImportTopic,
  type RecordImportProgressEvent,
} from "~/features/records-imports/contracts";
import { RECORDS_IMPORT_PROGRESS_CHANNEL } from "~/lib/job-queue/registry";
import { getServerRuntime } from "~/server/platform/container";
import {
  createTopicRealtimeChannel,
  snapshotReconciler,
} from "~/server/realtime/topic-realtime-channel";
import { IntegrationJobId } from "~/server/shared/ids";
import { isErr } from "~/server/shared/result";

import { buildRecordImportProgressEvent } from "./progress-events";

export async function recordImportSnapshot(
  jobId: IntegrationJobId,
): Promise<string | null> {
  const { integration } = getServerRuntime().integrations;
  const job = await integration.jobs.findById(jobId);

  return job ? JSON.stringify(buildRecordImportProgressEvent(job)) : null;
}

export const recordImportsRealtime =
  createTopicRealtimeChannel<RecordImportProgressEvent>({
    name: "records-imports",
    channel: RECORDS_IMPORT_PROGRESS_CHANNEL,
    parseEvent: parseRecordImportProgressMessage,
    topicForEvent: (event) => recordImportTopic.of(event.jobId),
    reconcile: snapshotReconciler(recordImportTopic, async (raw) => {
      const jobId = IntegrationJobId.parse(raw);

      if (isErr(jobId)) {
        return null;
      }

      return recordImportSnapshot(jobId.value);
    }),
  });
