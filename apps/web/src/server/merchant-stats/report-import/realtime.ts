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
import { MerchantReportImportId } from "~/server/shared/ids";
import { isErr } from "~/server/shared/result";

import { buildMerchantReportProgressEvent } from "./progress";
import { createMerchantReportImportRepo } from "./repo";

export async function merchantReportSnapshot(
  importId: MerchantReportImportId,
): Promise<string | null> {
  const job = await createMerchantReportImportRepo(db).findById(importId);

  return job ? JSON.stringify(buildMerchantReportProgressEvent(job)) : null;
}

export const merchantReportsRealtime =
  createTopicRealtimeChannel<MerchantReportProgressEvent>({
    name: "merchant-reports",
    channel: MERCHANT_REPORT_PROGRESS_CHANNEL,
    parseEvent: parseMerchantReportProgressMessage,
    topicForEvent: (event) => merchantReportTopic.of(event.importId),
    reconcile: snapshotReconciler(merchantReportTopic, async (raw) => {
      const importId = MerchantReportImportId.parse(raw);

      if (isErr(importId)) {
        return null;
      }

      return merchantReportSnapshot(importId.value);
    }),
  });
