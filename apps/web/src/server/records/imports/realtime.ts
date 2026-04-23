import {
  recordImportTopic,
  parseRecordImportProgressMessage,
} from "~/features/records-imports/contracts";
import { JOB_CHANNELS } from "~/lib/job-queue/channels";
import { createRedisTopicBridge } from "~/server/realtime/core/bridge";
import { TopicHub } from "~/server/realtime/core/topic-hub";

const recordImportsTopicHub = new TopicHub();

const recordImportsBridge = createRedisTopicBridge({
  name: "records-imports",
  channel: JOB_CHANNELS.RECORDS_IMPORT_PROGRESS,
  hub: recordImportsTopicHub,
  parseEvent: parseRecordImportProgressMessage,
  topicForEvent: (event) => recordImportTopic(event.jobId),
  serializeEvent: (event) => JSON.stringify(event),
});

export async function ensureRecordImportsRealtimeBridge(): Promise<void> {
  await recordImportsBridge.start();
}

export function getRecordImportsTopicHub(): TopicHub {
  return recordImportsTopicHub;
}
