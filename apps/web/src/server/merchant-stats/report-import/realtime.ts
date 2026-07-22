import {
  merchantReportTopic,
  parseMerchantReportProgressMessage,
  type MerchantReportProgressEvent,
} from "~/features/dashboards/imports/contracts";
import { db } from "~/lib/db/db";
import { MERCHANT_REPORT_PROGRESS_CHANNEL } from "~/lib/job-queue/registry";
import {
  createTopicRealtimeChannel,
  snapshotReconciler,
} from "~/server/realtime/topic-realtime-channel";

import {
  buildMerchantReportProgressEvent,
  findMerchantReportImport,
} from "./progress";

export const merchantReportsRealtime =
  createTopicRealtimeChannel<MerchantReportProgressEvent>({
    name: "merchant-reports",
    channel: MERCHANT_REPORT_PROGRESS_CHANNEL,
    parseEvent: parseMerchantReportProgressMessage,
    topicForEvent: (event) => merchantReportTopic.of(event.importId),
    reconcile: snapshotReconciler(merchantReportTopic, async (importId) => {
      const job = await findMerchantReportImport(db, importId);

      return job ? JSON.stringify(buildMerchantReportProgressEvent(job)) : null;
    }),
  });
