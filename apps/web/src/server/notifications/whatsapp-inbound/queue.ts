import type { Kysely } from "kysely";

import { notify } from "~/server/platform/database/notify";
import type { Database } from "~/server/platform/database/types";
import { createJobQueue } from "~/server/platform/jobs/job-queue";
import { JOB_TABLE_CHANNELS } from "~/server/platform/jobs/registry";
import type { QueueRunner } from "~/server/platform/jobs/types";

import { createWhatsAppInboundEventRepo } from "./inbound-event-repo";
import { processInboundWhatsAppEvent } from "./process-event";

const LEASE_MS = 30_000;

export function createWhatsAppInboundQueue(
  db: Kysely<Database>,
  workerId: string,
  now: () => Date,
): QueueRunner {
  return createJobQueue({
    name: "whatsapp-inbound-events",
    leaseMs: LEASE_MS,
    maxConcurrency: 8,
    workerId,
    now,
    store: createWhatsAppInboundEventRepo(db),
    handle: async (event) => {
      const { outcome, enqueuedReply } = await processInboundWhatsAppEvent(
        db,
        event,
        now(),
      );

      if (enqueuedReply) {
        notify(db, JOB_TABLE_CHANNELS.outbound_whatsapp_messages);
      }

      return {
        kind: "done",
        patch: {
          outcome,
        },
      };
    },
  });
}
