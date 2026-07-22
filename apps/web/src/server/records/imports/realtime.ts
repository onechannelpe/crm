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

import {
  buildRecordImportProgressEvent,
  findRecordImportJob,
} from "./progress-events";

export const recordImportsRealtime =
  createTopicRealtimeChannel<RecordImportProgressEvent>({
    name: "records-imports",
    channel: RECORDS_IMPORT_PROGRESS_CHANNEL,
    parseEvent: parseRecordImportProgressMessage,
    topicForEvent: (event) => recordImportTopic.of(event.jobId),
    reconcile: snapshotReconciler(recordImportTopic, async (jobId) => {
      const { integration } = getServerRuntime().integrations;
      const job = await findRecordImportJob(integration.jobs, jobId);

      return job ? JSON.stringify(buildRecordImportProgressEvent(job)) : null;
    }),
  });
