import type { Kysely } from "kysely";

import type { Database } from "~/lib/db/types";
import type { Phone } from "~/lib/phone/pe-mobile";
import { parsePhone } from "~/lib/phone/pe-mobile";
import { categoriesControllableOn } from "~/server/notifications/categories";
import { openSession } from "~/server/notifications/whatsapp-session";
import type { DatabaseExecutor } from "~/server/shared/db-executor";

import { classifyInboundMessage } from "./classify-message";
import type { WhatsAppInboundEventJob } from "./inbound-event-repo";

const VERIFY_REPLY_BODY = [
  "Listo, este número queda verificado para recibir notificaciones de la plataforma.",
  "Te avisaremos por WhatsApp cuando un cliente acepte una tarifa o quede listo para afiliación.",
].join("\n");

const OPT_OUT_REPLY_BODY = [
  "Listo, no recibirás más notificaciones por WhatsApp.",
  "Puedes volver a activarlas cuando quieras desde Configuración > Notificaciones.",
].join("\n");

export type InboundEventOutcome =
  | "verified"
  | "already-verified"
  | "opted-out"
  | "session-opened"
  | "unverified-activity"
  | "unknown-sender"
  | "invalid-sender";

export type InboundEventResult = {
  outcome: InboundEventOutcome;
  enqueuedReply: boolean;
};

async function enqueueReply(
  db: DatabaseExecutor,
  eventId: string,
  kind: "verification" | "opt-out",
  recipient: Phone,
  body: string,
  now: Date,
): Promise<void> {
  await db
    .insertInto("outbound_whatsapp_messages")
    .values({
      id: `kapso-inbound:${eventId}:${kind}`,
      recipient_address: recipient,
      body_text: body,
      queue_state: "pending",
      attempt_count: 0,
      max_attempts: 5,
      claimable_at: now,
      lease_owner: null,
      provider: null,
      provider_message_id: null,
      error_code: null,
      error_message: null,
      created_at: now,
      completed_at: null,
    })
    .onConflict((oc) => oc.column("id").doNothing())
    .execute();
}

export async function processInboundWhatsAppEvent(
  db: Kysely<Database>,
  event: WhatsAppInboundEventJob,
  now: Date,
): Promise<InboundEventResult> {
  const sender = parsePhone(event.sender_address);

  if (!sender) {
    return { outcome: "invalid-sender", enqueuedReply: false };
  }

  return db.transaction().execute(async (trx) => {
    const claim = await trx
      .selectFrom("user_channel_addresses")
      .select(["user_id", "address", "is_verified"])
      .where("channel", "=", "whatsapp")
      .where("address", "=", sender)
      .executeTakeFirst();

    if (!claim) {
      return { outcome: "unknown-sender", enqueuedReply: false };
    }

    const command = classifyInboundMessage(event.body);

    if (command === "opt-out") {
      const categories = categoriesControllableOn("whatsapp");

      const inserted =
        categories.length > 0
          ? await trx
              .insertInto("notification_opt_outs")
              .values(
                categories.map((category) => ({
                  user_id: claim.user_id,
                  category,
                  channel: "whatsapp" as const,
                  created_at: now,
                })),
              )
              .onConflict((oc) =>
                oc.columns(["user_id", "category", "channel"]).doNothing(),
              )
              .returning("id")
              .execute()
          : [];

      const changed = inserted.length > 0;

      if (changed) {
        await enqueueReply(
          trx,
          event.id,
          "opt-out",
          sender,
          OPT_OUT_REPLY_BODY,
          now,
        );
      }

      return { outcome: "opted-out", enqueuedReply: changed };
    }

    if (command === "verify" && !claim.is_verified) {
      const won = await trx
        .updateTable("user_channel_addresses")
        .set({
          is_verified: true,
          verified_at: now,
          updated_at: now,
        })
        .where("user_id", "=", claim.user_id)
        .where("channel", "=", "whatsapp")
        .where("address", "=", claim.address)
        .where("is_verified", "=", false)
        .returning("user_id")
        .executeTakeFirst();

      await openSession(trx, claim.user_id, event.provider_timestamp);

      if (won) {
        await enqueueReply(
          trx,
          event.id,
          "verification",
          sender,
          VERIFY_REPLY_BODY,
          now,
        );

        return { outcome: "verified", enqueuedReply: true };
      }

      return { outcome: "already-verified", enqueuedReply: false };
    }

    if (!claim.is_verified) {
      return { outcome: "unverified-activity", enqueuedReply: false };
    }

    await openSession(trx, claim.user_id, event.provider_timestamp);

    return {
      outcome: command === "verify" ? "already-verified" : "session-opened",
      enqueuedReply: false,
    };
  });
}
