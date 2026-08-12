import type { Kysely } from "kysely";

import type { Database } from "~/server/platform/database/types";
import {
  createJobStore,
  type JobStore,
} from "~/server/platform/jobs/job-store";

export type WhatsAppInboundEventJob = {
  id: string;
  attempt_count: number;
  max_attempts: number;
  sender_address: string;
  body: string | null;
  provider_timestamp: Date;
};

export function createWhatsAppInboundEventRepo(
  db: Kysely<Database>,
): JobStore<string, WhatsAppInboundEventJob> {
  return createJobStore<WhatsAppInboundEventJob, string>(
    db,
    "whatsapp_inbound_events",
    [
      "id",
      "attempt_count",
      "max_attempts",
      "sender_address",
      "body",
      "provider_timestamp",
    ],
  );
}
