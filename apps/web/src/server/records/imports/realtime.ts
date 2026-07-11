import {
  parseRecordImportTopic,
  recordImportTopic,
  parseRecordImportProgressMessage,
  type RecordImportProgressEvent,
} from "~/features/records-imports/contracts";
import { RECORDS_IMPORT_PROGRESS_CHANNEL } from "~/lib/job-queue/registry";
import { getServerRuntime } from "~/server/platform/container";
import type { TopicHub } from "~/server/realtime/topic-hub";
import { createTopicRealtimeChannel } from "~/server/realtime/topic-realtime-channel";

import {
  buildRecordImportProgressEvent,
  findRecordImportJob,
} from "./progress-events";

async function reconcileRecordImportsProgress(hub: TopicHub): Promise<void> {
  const { integration } = getServerRuntime().integrations;

  await Promise.all(
    hub.topics().map(async (topic) => {
      const jobId = parseRecordImportTopic(topic);
      if (jobId === null) return;

      const job = await findRecordImportJob(integration.jobs, jobId);
      if (!job) return;

      hub.broadcast(
        topic,
        JSON.stringify(buildRecordImportProgressEvent({ job })),
      );
    }),
  );
}

export const recordImportsRealtime =
  createTopicRealtimeChannel<RecordImportProgressEvent>({
    name: "records-imports",
    channel: RECORDS_IMPORT_PROGRESS_CHANNEL,
    parseEvent: parseRecordImportProgressMessage,
    topicForEvent: (event) => recordImportTopic(event.jobId),
    reconcile: reconcileRecordImportsProgress,
  });
