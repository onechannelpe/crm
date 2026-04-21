import {
  leadImportTopic,
  parseLeadImportProgressMessage,
} from "~/features/leads-imports/contracts";
import { JOB_CHANNELS } from "~/lib/job-queue/channels";
import { createRedisTopicBridge } from "~/server/realtime/core/bridge";
import { TopicHub } from "~/server/realtime/core/topic-hub";

const leadImportsTopicHub = new TopicHub();

const leadImportsBridge = createRedisTopicBridge({
  name: "leads-imports",
  channel: JOB_CHANNELS.LEADS_IMPORT_PROGRESS,
  hub: leadImportsTopicHub,
  parseEvent: parseLeadImportProgressMessage,
  topicForEvent: (event) => leadImportTopic(event.jobId),
  serializeEvent: (event) => JSON.stringify(event),
});

export async function ensureLeadImportsRealtimeBridge(): Promise<void> {
  await leadImportsBridge.start();
}

export function getLeadImportsTopicHub(): TopicHub {
  return leadImportsTopicHub;
}
