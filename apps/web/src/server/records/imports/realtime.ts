import {
  parseRecordImportProgressMessage,
  recordImportTopic,
  type RecordImportProgressEvent,
} from "~/contracts/records/imports";
import { IntegrationJobId } from "~/domain/ids";
import type { IntegrationJobsPort } from "~/server/integrations/types";
import { RECORDS_IMPORT_PROGRESS_CHANNEL } from "~/server/platform/jobs/registry";
import {
  createTopicRealtimeChannel,
  snapshotReconciler,
} from "~/server/realtime/topic-realtime-channel";
import { isErr } from "~/shared/result";

import { buildRecordImportProgressEvent } from "./progress-events";

export async function recordImportSnapshot(
  jobId: IntegrationJobId,
  jobs: Pick<IntegrationJobsPort, "findById">,
): Promise<string | null> {
  const job = await jobs.findById(jobId);

  return job ? JSON.stringify(buildRecordImportProgressEvent(job)) : null;
}

export function createRecordImportsRealtime(
  jobs: Pick<IntegrationJobsPort, "findById">,
) {
  return createTopicRealtimeChannel<RecordImportProgressEvent>({
    name: "records-imports",
    channel: RECORDS_IMPORT_PROGRESS_CHANNEL,
    parseEvent: parseRecordImportProgressMessage,
    topicForEvent: (event) => recordImportTopic.of(event.jobId),
    reconcile: snapshotReconciler(recordImportTopic, async (raw) => {
      const jobId = IntegrationJobId.parse(raw);

      if (isErr(jobId)) {
        return null;
      }

      return recordImportSnapshot(jobId.value, jobs);
    }),
  });
}
