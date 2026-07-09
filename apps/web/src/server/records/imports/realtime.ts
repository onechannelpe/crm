import {
  recordImportTopic,
  parseRecordImportTopic,
  parseRecordImportProgressMessage,
} from "~/features/records-imports/contracts";
import { RECORDS_IMPORT_PROGRESS_CHANNEL } from "~/lib/job-queue/registry";
import { getServerRuntime } from "~/server/platform/container";
import { createPgTopicBridge } from "~/server/realtime/core/bridge";
import { TopicHub } from "~/server/realtime/core/topic-hub";
import {
  buildRecordImportProgressEvent,
  findRecordImportJob,
} from "~/server/records/imports/progress-events";

const recordImportsTopicHub = new TopicHub();

// NOTIFY only reaches this bridge's connection while it's live: any progress
// event sent during a reconnect gap is gone for good. Since every peer that
// stays subscribed through such a gap otherwise never learns the job moved
// on, re-fetch each subscribed job's current row and rebroadcast it once the
// connection comes back, mirroring the poll floor the job queues rely on.
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

const recordImportsBridge = createPgTopicBridge({
  name: "records-imports",
  channel: RECORDS_IMPORT_PROGRESS_CHANNEL,
  hub: recordImportsTopicHub,
  parseEvent: parseRecordImportProgressMessage,
  topicForEvent: (event) => recordImportTopic(event.jobId),
  serializeEvent: (event) => JSON.stringify(event),
  reconcile: reconcileRecordImportsProgress,
});

export async function ensureRecordImportsRealtimeBridge(): Promise<void> {
  await recordImportsBridge.start();
}

export function getRecordImportsTopicHub(): TopicHub {
  return recordImportsTopicHub;
}
