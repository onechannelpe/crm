import {
  recordImportTopic,
  parseRecordImportProgressMessage,
} from "~/features/records-imports/contracts";
import { RECORDS_IMPORT_PROGRESS_CHANNEL } from "~/lib/job-queue/registry";
import { createPgTopicBridge } from "~/server/realtime/core/bridge";
import { TopicHub } from "~/server/realtime/core/topic-hub";

const recordImportsTopicHub = new TopicHub();

const recordImportsBridge = createPgTopicBridge({
  name: "records-imports",
  channel: RECORDS_IMPORT_PROGRESS_CHANNEL,
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
