import type { Kysely } from "kysely";

import { isRole } from "~/lib/auth/access/rbac";
import type { Database, UsersTable } from "~/lib/db/types";

import type { NotificationAudienceType } from "./campaign";

export interface NotificationAudienceMember {
  id: number;
  email: string;
  role: UsersTable["role"];
}

export function createNotificationAudienceRepo(db: Kysely<Database>) {
  return {
    async findAudienceMembers(
      audienceType: NotificationAudienceType,
      audienceRef: string | null,
    ): Promise<NotificationAudienceMember[]> {
      const base = db
        .selectFrom("users")
        .select(["id", "email", "role"])
        .where("is_active", "=", 1)
        .where("onboarding_completed_at", "is not", null);

      if (audienceType === "global") {
        return base.execute();
      }

      if (audienceType === "role") {
        if (!audienceRef || !isRole(audienceRef)) {
          return [];
        }

        return base.where("role", "=", audienceRef).execute();
      }

      if (!audienceRef) {
        return [];
      }

      const userId = Number(audienceRef);
      if (!Number.isInteger(userId) || userId <= 0) {
        return [];
      }

      return base.where("id", "=", userId).execute();
    },
  };
}

export type NotificationAudienceRepo = ReturnType<
  typeof createNotificationAudienceRepo
>;
