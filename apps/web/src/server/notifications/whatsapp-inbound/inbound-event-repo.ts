import type { Kysely } from "kysely";

import type { Database } from "~/lib/db/types";
import { createJobStore, type JobStore } from "~/lib/job-queue/job-store";

export type WhatsAppInboundEventJob = {
  id: string;
  attempt_count: number;
  max_attempts: number;
  conversation_id: string;
  sender_address: string;
  body: string | null;
};

export function createWhatsAppInboundEventRepo(
  db: Kysely<Database>,
): JobStore<string, WhatsAppInboundEventJob> {
  const base = createJobStore<WhatsAppInboundEventJob, string>(
    db,
    "whatsapp_inbound_events",
    [
      "id",
      "attempt_count",
      "max_attempts",
      "conversation_id",
      "sender_address",
      "body",
    ],
  );

  return {
    ...base,
    async claim(workerId, now, limit, leaseMs) {
      const leaseUntil = new Date(now.getTime() + leaseMs);
      return db
        .with("claimed", (qb) =>
          qb
            .selectFrom("whatsapp_inbound_events")
            .select("id")
            .where("queue_state", "=", "pending")
            .where("available_at", "<=", now)
            .where((eb) =>
              eb.not(
                eb.exists(
                  eb
                    .selectFrom("whatsapp_inbound_events as earlier")
                    .select("earlier.id")
                    .whereRef(
                      "earlier.conversation_id",
                      "=",
                      "whatsapp_inbound_events.conversation_id",
                    )
                    .where("earlier.queue_state", "in", [
                      "pending",
                      "processing",
                    ])
                    .whereRef(
                      "earlier.sequence",
                      "<",
                      "whatsapp_inbound_events.sequence",
                    ),
                ),
              ),
            )
            .orderBy("sequence", "asc")
            .limit(limit)
            .forUpdate()
            .skipLocked(),
        )
        .updateTable("whatsapp_inbound_events")
        .from("claimed")
        .set((eb) => ({
          queue_state: "processing",
          lease_owner: workerId,
          lease_until: leaseUntil,
          attempt_count: eb("attempt_count", "+", 1),
          error: null,
        }))
        .whereRef("whatsapp_inbound_events.id", "=", "claimed.id")
        .returning([
          "whatsapp_inbound_events.id",
          "attempt_count",
          "max_attempts",
          "conversation_id",
          "sender_address",
          "body",
        ])
        .execute();
    },
  };
}
