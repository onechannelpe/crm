import type { Kysely } from "kysely";

import type { Database } from "~/server/platform/database/types";
import { createJobQueue } from "~/server/platform/jobs/job-queue";
import type { QueueRunner } from "~/server/platform/jobs/types";

import { createWhatsAppInboundEventRepo } from "./inbound-event-repo";
import { processInboundWhatsAppEvent } from "./process-event";

const LEASE_MS = 30_000;

export function createWhatsAppInboundQueue(
  db: Kysely<Database>,
  workerId: string,
): QueueRunner {
  return createJobQueue({
    name: "whatsapp-inbound-events",
    leaseMs: LEASE_MS,
    maxConcurrency: 8,
    workerId,
    store: createWhatsAppInboundEventRepo(db),
    handle: async (event, context) => {
      const { outcome } = await processInboundWhatsAppEvent(
        db,
        event,
        context.operationAt,
      );

      return {
        kind: "done",
        patch: {
          outcome,
        },
      };
    },
  });
}
