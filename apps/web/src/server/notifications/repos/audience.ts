import type { Kysely } from "kysely";

import { isRole } from "~/lib/auth/access/rbac";
import type { Database } from "~/lib/db/types";
import type { UserId, LeadId, BranchId } from "~/server/shared/ids";

import type { NotificationAudienceType } from "./campaign";

export interface NotificationAudienceMember {
  id: UserId;
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

    return base.where("id", "=", audienceRef as UserId);
  }

  return {
    async findAudienceMembersPage(
      audienceType: NotificationAudienceType,
      audienceRef: string | null,
      afterUserId: UserId,
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
