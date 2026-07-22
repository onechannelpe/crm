import {
  merchantReportTopic,
  parseMerchantReportProgressMessage,
  parseMerchantReportTopic,
  type MerchantReportProgressEvent,
} from "~/features/dashboards/imports/contracts";
import { db } from "~/lib/db/db";
import { MERCHANT_REPORT_PROGRESS_CHANNEL } from "~/lib/job-queue/registry";
import type { TopicHub } from "~/server/realtime/topic-hub";
import { createTopicRealtimeChannel } from "~/server/realtime/topic-realtime-channel";

import {
  buildMerchantReportProgressEvent,
  findMerchantReportImport,
} from "./progress";

async function reconcileMerchantReportProgress(hub: TopicHub): Promise<void> {
  await Promise.all(
    hub.topics().map(async (topic) => {
      const importId = parseMerchantReportTopic(topic);

      if (importId === null) return;

      const job = await findMerchantReportImport(db, importId);

      if (!job) return;

      hub.broadcast(
        topic,
        JSON.stringify(buildMerchantReportProgressEvent(job)),
      );
    }),
  );
}

export const merchantReportsRealtime =
  createTopicRealtimeChannel<MerchantReportProgressEvent>({
    name: "merchant-reports",
    channel: MERCHANT_REPORT_PROGRESS_CHANNEL,
    parseEvent: parseMerchantReportProgressMessage,
    topicForEvent: (event) => merchantReportTopic(event.importId),
    reconcile: reconcileMerchantReportProgress,
  });
