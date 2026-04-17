import type { Kysely } from "kysely";

import { isRole } from "~/lib/auth/access/rbac";
import type { Database } from "~/lib/db/types";

import type { NotificationAudienceType } from "./campaign";

export interface NotificationAudienceMember {
  id: number;
}

export function createNotificationAudienceRepo(db: Kysely<Database>) {
  function applyAudienceScope(
    audienceType: NotificationAudienceType,
    audienceRef: string | null,
  ) {
    const base = db
      .selectFrom("users")
      .select(["id"])
      .where("is_active", "=", 1)
      .where("onboarding_completed_at", "is not", null);

    if (audienceType === "global") {
      return base;
    }

    if (audienceType === "role") {
      if (!audienceRef || !isRole(audienceRef)) {
        return null;
      }

      return base.where("role", "=", audienceRef);
    }

    if (!audienceRef) {
      return null;
    }

    const userId = Number(audienceRef);
    if (!Number.isInteger(userId) || userId <= 0) {
      return null;
    }

    return base.where("id", "=", userId);
  }

  return {
    async findAudienceMembersPage(
      audienceType: NotificationAudienceType,
      audienceRef: string | null,
      afterUserId: number,
      limit: number,
    ): Promise<NotificationAudienceMember[]> {
      const scopedQuery = applyAudienceScope(audienceType, audienceRef);
      if (!scopedQuery) {
        return [];
      }

      return scopedQuery
        .where("id", ">", afterUserId)
        .orderBy("id", "asc")
        .limit(limit)
        .execute();
    },
  };
}

export type NotificationAudienceRepo = ReturnType<
  typeof createNotificationAudienceRepo
>;
