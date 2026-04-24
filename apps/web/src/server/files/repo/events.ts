import type { Kysely } from "kysely";

import type { Database } from "~/lib/db/types";

import type { InsertEventInput } from "./types";

type DB = Kysely<Database>;

export function createEventsRepo(db: DB) {
  return {
    async insert(input: InsertEventInput) {
      await db
        .insertInto("artifact_events")
        .values({
          artifact_id: input.artifactId,
          event_type: input.eventType,
          actor_user_id: input.actorUserId,
          actor_role: input.actorRole,
          request_id: input.requestId,
          trace_id: input.traceId,
          ip_hash: input.ipHash,
          user_agent: input.userAgent,
          details_json: JSON.stringify(input.details),
          created_at: input.now,
        })
        .execute();
    },

    async list(artifactId: string) {
      const rows = await db
        .selectFrom("artifact_events")
        .selectAll()
        .where("artifact_id", "=", artifactId)
        .orderBy("created_at", "asc")
        .execute();

      return rows.map((row) => ({
        id: row.id,
        eventType: row.event_type,
        actorUserId: row.actor_user_id,
        actorRole: row.actor_role,
        // oxlint-disable-next-line no-unsafe-type-assertion
        details: JSON.parse(row.details_json) as Record<string, unknown>,
        createdAt: row.created_at,
      }));
    },
  };
}
