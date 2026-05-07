import type { Kysely } from "kysely";

import type { Database } from "~/lib/db/types";
import { createLogger } from "~/lib/observability/logger";
import type { MessagingGateway } from "~/server/notifications/messaging-gateway";

const logger = createLogger("notifications-unified");

type AudienceKind = "user_ids" | "branch_roles" | "global_roles" | "team";
type Channel = "in_app" | "email" | "whatsapp";

export type DomainEvent = {
  id: string;
  aggregate_type: string;
  aggregate_id: string;
  event_type: string;
  payload_json: string;
  occurred_at: number;
};

type NotificationIntent = {
  intentId: string;
  sourceEventId: string;
  eventType: string;
  audienceKind: AudienceKind;
  audiencePayloadJson: string;
  channelSetJson: string;
  priority: "high" | "normal" | "low";
  title: string;
  bodyText: string;
  actionUrl: string | null;
};

export function resolveNotificationIntents(
  event: DomainEvent,
): NotificationIntent[] {
  const payload = safeParse(event.payload_json);
  const intents: NotificationIntent[] = [];
  const pushIntent = (
    index: number,
    input: Omit<NotificationIntent, "intentId" | "sourceEventId">,
  ) => {
    intents.push({
      intentId: `${event.id}:${index}`,
      sourceEventId: event.id,
      ...input,
    });
  };

  if (event.event_type === "lead.stage_changed") {
    const to = getString(payload, "to");
    const leadId = event.aggregate_id;
    const ruc = getString(payload, "ruc") ?? "";
    const executiveId = getNumber(payload, "executiveId");
    const branchId = getNumber(payload, "branchId");

    if (to === "NEEDS_EXECUTIVE_INPUT" && executiveId !== null) {
      pushIntent(0, {
        audienceKind: "user_ids",
        audiencePayloadJson: JSON.stringify({ user_ids: [executiveId] }),
        channelSetJson: JSON.stringify(["in_app"] satisfies Channel[]),
        eventType: "lead.needs_executive_input",
        priority: "high",
        title: "Accion requerida",
        bodyText: `El prospecto RUC ${ruc} requiere tu informacion comercial`,
        actionUrl: "/records",
      });
    }

    if (to === "READY_FOR_QUOTATION" && branchId !== null) {
      pushIntent(0, {
        audienceKind: "branch_roles",
        audiencePayloadJson: JSON.stringify({
          branch_id: branchId,
          branch_roles: ["back_office"],
        }),
        channelSetJson: JSON.stringify(["in_app"] satisfies Channel[]),
        eventType: "lead.ready_for_quotation",
        priority: "normal",
        title: "Prospecto listo para cotizacion",
        bodyText: `El prospecto RUC ${ruc} esta listo para cotizar`,
        actionUrl: `/records/${leadId}`,
      });
    }

    if (to === "READY_FOR_SALE" && executiveId !== null) {
      pushIntent(0, {
        audienceKind: "user_ids",
        audiencePayloadJson: JSON.stringify({ user_ids: [executiveId] }),
        channelSetJson: JSON.stringify(["in_app"] satisfies Channel[]),
        eventType: "lead.ready_for_sale",
        priority: "high",
        title: "Prospecto listo para venta",
        bodyText: `El prospecto RUC ${ruc} fue aprobado. Puedes registrar la venta.`,
        actionUrl: `/records/${leadId}`,
      });
    }
  }

  if (event.event_type === "security.privileged_login") {
    const audience = payload?.audience;
    const audienceUserIds =
      audience &&
      typeof audience === "object" &&
      Array.isArray((audience as Record<string, unknown>).user_ids)
        ? ((audience as Record<string, unknown>).user_ids as unknown[]).filter(
            (value): value is number => typeof value === "number",
          )
        : [];
    const userId = audienceUserIds[0] ?? null;
    if (userId !== null) {
      pushIntent(0, {
        audienceKind: "user_ids",
        audiencePayloadJson: JSON.stringify({ user_ids: [userId] }),
        channelSetJson: JSON.stringify([
          "in_app",
          "email",
          "whatsapp",
        ] satisfies Channel[]),
        eventType: "security.privileged_login",
        priority: "high",
        title: getString(payload, "title") ?? "Security alert",
        bodyText:
          getString(payload, "bodyText") ?? "Privileged login detected.",
        actionUrl: null,
      });
    }
  }

  if (event.event_type === "broadcast.general") {
    const audienceKind = getString(payload, "audienceKind");
    const audience = payload?.audience;
    const title = getString(payload, "title") ?? "Broadcast";
    const bodyText = getString(payload, "bodyText") ?? "";
    if (
      (audienceKind === "user_ids" ||
        audienceKind === "branch_roles" ||
        audienceKind === "global_roles" ||
        audienceKind === "team") &&
      audience &&
      typeof audience === "object"
    ) {
      pushIntent(0, {
        audienceKind,
        audiencePayloadJson: JSON.stringify(audience),
        channelSetJson: JSON.stringify([
          "in_app",
          "email",
          "whatsapp",
        ] satisfies Channel[]),
        eventType: "broadcast.general",
        priority: "normal",
        title,
        bodyText,
        actionUrl: null,
      });
    }
  }

  return intents;
}

function safeParse(value: string): Record<string, unknown> | null {
  try {
    const parsed: unknown = JSON.parse(value);
    if (parsed && typeof parsed === "object") {
      return parsed as Record<string, unknown>;
    }
    return null;
  } catch {
    return null;
  }
}

function safeParseUnknown(value: string): unknown {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

function getString(
  obj: Record<string, unknown> | null,
  key: string,
): string | null {
  const value = obj?.[key];
  return typeof value === "string" ? value : null;
}

function getNumber(
  obj: Record<string, unknown> | null,
  key: string,
): number | null {
  const value = obj?.[key];
  return typeof value === "number" && Number.isInteger(value) ? value : null;
}

export async function projectDomainEvent(
  db: Kysely<Database>,
  event: DomainEvent,
): Promise<void> {
  await db
    .insertInto("domain_events")
    .values(event)
    .onConflict((oc) => oc.column("id").doNothing())
    .execute();

  const intents = resolveNotificationIntents(event);
  if (intents.length < 1) {
    return;
  }

  await db
    .insertInto("notification_intents_outbox")
    .values(
      intents.map((intent) => ({
        intent_id: intent.intentId,
        source_event_id: intent.sourceEventId,
        event_type: intent.eventType,
        aggregate_id: event.aggregate_id,
        audience_kind: intent.audienceKind,
        audience_payload_json: intent.audiencePayloadJson,
        channel_set_json: intent.channelSetJson,
        title: intent.title,
        body_text: intent.bodyText,
        action_url: intent.actionUrl,
        priority: intent.priority,
        status: "pending",
        attempt_count: 0,
        max_attempts: 5,
        available_at: event.occurred_at,
        lease_owner: null,
        lease_until: null,
        error_message: null,
        created_at: event.occurred_at,
        processed_at: null,
      })),
    )
    .onConflict((oc) => oc.column("intent_id").doNothing())
    .execute();

  logger.info("intent_enqueued", {
    source_event_id: event.id,
    intent_count: intents.length,
    aggregate_id: event.aggregate_id,
  });
}

export async function projectLeadStageChangedEvent(
  db: Kysely<Database>,
  input: {
    id: string;
    leadId: string;
    toStage: string;
    ruc: string;
    executiveId: number;
    branchId: number | null;
    occurredAt: number;
  },
): Promise<void> {
  await projectDomainEvent(db, {
    id: input.id,
    aggregate_type: "lead",
    aggregate_id: input.leadId,
    event_type: "lead.stage_changed",
    payload_json: JSON.stringify({
      to: input.toStage,
      ruc: input.ruc,
      executiveId: input.executiveId,
      branchId: input.branchId,
    }),
    occurred_at: input.occurredAt,
  });
}

export function createNotificationIntentProcessor(
  db: Kysely<Database>,
  messaging: MessagingGateway,
) {
  return async function runOnce(workerId: string, limit = 50): Promise<void> {
    const now = Date.now();
    const leaseUntil = now + 30_000;
    const candidates = await db
      .selectFrom("notification_intents_outbox")
      .select("intent_id")
      .where("status", "=", "pending")
      .where("available_at", "<=", now)
      .where((eb) =>
        eb.or([eb("lease_until", "is", null), eb("lease_until", "<", now)]),
      )
      .orderBy("created_at", "asc")
      .limit(limit)
      .execute();

    if (candidates.length < 1) return;
    const ids = candidates.map((c) => c.intent_id);

    await db
      .updateTable("notification_intents_outbox")
      .set((eb) => ({
        status: "processing",
        lease_owner: workerId,
        lease_until: leaseUntil,
        attempt_count: eb("attempt_count", "+", 1),
      }))
      .where("intent_id", "in", ids)
      .where("status", "=", "pending")
      .execute();

    const intents = await db
      .selectFrom("notification_intents_outbox")
      .selectAll()
      .where("intent_id", "in", ids)
      .where("status", "=", "processing")
      .where("lease_owner", "=", workerId)
      .execute();

    for (const intent of intents) {
      try {
        const recipients = await resolveRecipients(
          db,
          intent.audience_kind,
          intent.audience_payload_json,
        );
        logger.info("recipient_resolved", {
          source_event_id: intent.source_event_id,
          intent_id: intent.intent_id,
          audience_kind: intent.audience_kind,
          recipient_count: recipients.length,
          aggregate_id: intent.aggregate_id,
        });
        const channels = parseChannels(intent.channel_set_json);

        if (channels.includes("in_app")) {
          await db
            .insertInto("app_notifications")
            .values(
              recipients.map((userId) => ({
                user_id: userId,
                intent_id: intent.intent_id,
                source_event_id: intent.source_event_id,
                event_type: intent.event_type,
                priority: intent.priority,
                title: intent.title,
                body_text: intent.body_text,
                action_url: intent.action_url,
                metadata_json: null,
                created_at: now,
                read_at: null,
              })),
            )
            .onConflict((oc) =>
              oc.columns(["user_id", "intent_id"]).doNothing(),
            )
            .execute();
        }

        for (const channel of channels) {
          if (channel === "in_app") continue;
          for (const userId of recipients) {
            const address = await resolveChannelAddress(db, userId, channel);
            if (!address) continue;
            await db
              .insertInto("notification_recipients")
              .values({
                intent_id: intent.intent_id,
                user_id: userId,
                channel,
                address,
                status: "pending",
                status_reason: null,
                created_at: now,
                sent_at: null,
                failed_at: null,
              })
              .onConflict((oc) =>
                oc.columns(["intent_id", "channel", "address"]).doNothing(),
              )
              .execute();

            const receipt =
              channel === "email"
                ? await messaging.sendCampaignEmail({
                    to: address,
                    params: {
                      title: intent.title,
                      bodyText: intent.body_text,
                      platformName: "CRM",
                    },
                  })
                : await messaging.sendWhatsAppText({
                    to: address,
                    body: intent.body_text,
                  });

            await db
              .insertInto("notification_deliveries")
              .values({
                intent_id: intent.intent_id,
                recipient_channel: channel,
                recipient_address: address,
                provider: receipt.ok
                  ? receipt.value.provider
                  : channel === "email"
                    ? "resend"
                    : "whatsapp_cloud",
                provider_message_id: receipt.ok
                  ? (receipt.value.providerMessageId ?? null)
                  : null,
                status: receipt.ok ? "sent" : "failed",
                error_code: receipt.ok ? null : receipt.error.code,
                error_message: receipt.ok ? null : receipt.error.message,
                latency_ms: null,
                created_at: now,
              })
              .execute();

            logger.info(receipt.ok ? "delivery_sent" : "delivery_failed", {
              source_event_id: intent.source_event_id,
              intent_id: intent.intent_id,
              channel,
              audience_kind: intent.audience_kind,
              aggregate_id: intent.aggregate_id,
            });
          }
        }

        await db
          .updateTable("notification_intents_outbox")
          .set({
            status: "completed",
            processed_at: now,
            lease_owner: null,
            lease_until: null,
            error_message: null,
          })
          .where("intent_id", "=", intent.intent_id)
          .execute();
      } catch (error) {
        await db
          .updateTable("notification_intents_outbox")
          .set({
            status: "failed",
            processed_at: Date.now(),
            lease_owner: null,
            lease_until: null,
            error_message: String(error),
          })
          .where("intent_id", "=", intent.intent_id)
          .execute();
      }
    }
  };
}

function parseChannels(payload: string): Channel[] {
  const parsed = safeParseUnknown(payload);
  if (!Array.isArray(parsed)) return ["in_app"];
  const channels = parsed.filter(
    (value): value is Channel =>
      value === "in_app" || value === "email" || value === "whatsapp",
  );
  return channels.length > 0 ? channels : ["in_app"];
}

async function resolveRecipients(
  db: Kysely<Database>,
  audienceKind: string,
  audiencePayloadJson: string,
): Promise<number[]> {
  const payload = safeParse(audiencePayloadJson);
  if (!payload) return [];

  if (audienceKind === "user_ids") {
    const userIds = Array.isArray(payload.user_ids)
      ? payload.user_ids.filter((v): v is number => typeof v === "number")
      : [];
    return userIds;
  }

  if (audienceKind === "branch_roles") {
    const branchId =
      typeof payload.branch_id === "number" ? payload.branch_id : null;
    const roles = Array.isArray(payload.branch_roles)
      ? payload.branch_roles.filter((v): v is string => typeof v === "string")
      : [];
    if (branchId === null || roles.length < 1) return [];
    const rows = await db
      .selectFrom("users")
      .select("id")
      .where("branch_id", "=", branchId)
      .where("role", "in", roles as Array<"back_office">)
      .where("is_active", "=", 1)
      .execute();
    return rows.map((r) => r.id);
  }

  if (audienceKind === "global_roles") {
    const roles = Array.isArray(payload.global_roles)
      ? payload.global_roles.filter((v): v is string => typeof v === "string")
      : [];
    if (roles.length < 1) return [];
    const rows = await db
      .selectFrom("users")
      .select("id")
      .where("role", "in", roles as Array<"admin">)
      .where("is_active", "=", 1)
      .execute();
    return rows.map((r) => r.id);
  }

  if (audienceKind === "team") {
    const teamId = typeof payload.team_id === "number" ? payload.team_id : null;
    if (teamId === null) return [];
    const rows = await db
      .selectFrom("users")
      .select("id")
      .where("team_id", "=", teamId)
      .where("is_active", "=", 1)
      .execute();
    return rows.map((r) => r.id);
  }

  return [];
}

async function resolveChannelAddress(
  db: Kysely<Database>,
  userId: number,
  channel: "email" | "whatsapp",
): Promise<string | null> {
  const row = await db
    .selectFrom("user_channel_addresses")
    .select("address")
    .where("user_id", "=", userId)
    .where("channel", "=", channel)
    .where("is_verified", "=", 1)
    .executeTakeFirst();
  return row?.address ?? null;
}
