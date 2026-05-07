import type { Kysely } from "kysely";

import type { Database } from "~/lib/db/types";
import { projectDomainEvent } from "~/server/notifications/unified";

export interface PublishCampaignInput {
  eventType: string;
  audienceKind: "user_ids" | "branch_roles" | "global_roles" | "team";
  audience: Record<string, unknown>;
  title: string;
  bodyText: string;
  createdByUserId: number | null;
}

export interface NotificationCampaignService {
  publishCampaign(input: PublishCampaignInput): Promise<string>;
}

export function createAppNotificationService(
  db: Kysely<Database>,
): NotificationCampaignService {
  return {
    async publishCampaign(input: PublishCampaignInput): Promise<string> {
      const now = Date.now();
      const eventId = `broadcast:${input.eventType}:${now}:${input.createdByUserId ?? 0}`;
      await projectDomainEvent(db, {
        id: eventId,
        aggregate_type: "system",
        aggregate_id: String(input.createdByUserId ?? 0),
        event_type: input.eventType,
        payload_json: JSON.stringify({
          audienceKind: input.audienceKind,
          audience: input.audience,
          title: input.title,
          bodyText: input.bodyText,
        }),
        occurred_at: now,
      });
      return eventId;
    },
  };
}
