import type { Kysely } from "kysely";

import { notify } from "~/lib/db/notify";
import type { Database } from "~/lib/db/types";
import { createJobQueue } from "~/lib/job-queue/job-queue";
import { JOB_TABLE_CHANNELS } from "~/lib/job-queue/registry";
import type { QueueRunner } from "~/lib/job-queue/types";

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
