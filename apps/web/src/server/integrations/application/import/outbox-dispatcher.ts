import { db } from "~/lib/db/db";
import { createLogger } from "~/lib/observability/logger";

import {
  claimOutboxEvents,
  completeOutboxEvent,
  failOutboxEvent,
} from "./outbox-repo";
import type { OutboxEvent } from "./types";

const logger = createLogger("integration-outbox-dispatcher");

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}

export async function dispatchIntegrationOutboxOnce(workerId: string) {
  const events = await claimOutboxEvents({
    workerId,
    limit: 200,
    leaseMs: 30_000,
  });
  if (events.length < 1) return;

  for (const event of events) {
    try {
      const parsed = JSON.parse(event.payload_json) as OutboxEvent;
      if (parsed.topic === "lead.needs_executive_input") {
        await db
          .insertInto("app_notifications")
          .values({
            user_id: parsed.executiveId,
            event_type: "lead.needs_executive_input",
            priority: "high",
            title: "Accion requerida",
            body_text: `El prospecto RUC ${parsed.ruc} requiere tu informacion comercial`,
            action_url: `/leads/${parsed.leadId}/complete`,
            dedupe_key: `lead_nei_${parsed.leadId}`,
            metadata_json: null,
            created_at: Date.now(),
            read_at: null,
          })
          .onConflict((oc) => oc.columns(["user_id", "dedupe_key"]).doNothing())
          .execute();
      } else {
        const audience = await db
          .selectFrom("users")
          .select("id")
          .where("branch_id", "=", parsed.branchId)
          .where("role", "=", "back_office")
          .where("is_active", "=", 1)
          .execute();
        if (audience.length > 0) {
          await db
            .insertInto("app_notifications")
            .values(
              audience.map((user) => ({
                user_id: user.id,
                event_type: "lead.ready_for_quotation",
                priority: "normal",
                title: "Prospecto listo para cotizacion",
                body_text: `El prospecto RUC ${parsed.ruc} esta listo para cotizar`,
                action_url: `/quotations/${parsed.leadId}`,
                dedupe_key: `lead_rfq_${parsed.leadId}`,
                metadata_json: null,
                created_at: Date.now(),
                read_at: null,
              })),
            )
            .onConflict((oc) =>
              oc.columns(["user_id", "dedupe_key"]).doNothing(),
            )
            .execute();
        }
      }

      await completeOutboxEvent(event.id);
    } catch (error: unknown) {
      await failOutboxEvent({
        id: event.id,
        attemptCount: event.attempt_count,
        errorMessage: errorMessage(error),
      });
      logger.error("outbox_event_failed", {
        eventId: event.id,
        error: errorMessage(error),
      });
    }
  }
}
