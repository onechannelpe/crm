import type { Kysely } from "kysely";

import type { Database } from "~/lib/db/schema";
import type { ExtensionExecutiveStatus } from "~/server/extension/contracts";

export function createExtensionRuntimeRepo(db: Kysely<Database>) {
  return {
    insertConsumedHandoffJti(values: {
      jti: string;
      user_id: number;
      assignment_id: number;
      consumed_at: number;
      expires_at: number;
    }) {
      return db
        .insertInto("extension_handoff_jtis")
        .values(values)
        .executeTakeFirstOrThrow();
    },

    hasConsumedHandoffJti(jti: string) {
      return db
        .selectFrom("extension_handoff_jtis")
        .select("jti")
        .where("jti", "=", jti)
        .executeTakeFirst();
    },

    createSyncToken(values: {
      user_id: number;
      branch_id: number;
      auth_session_id: string;
      token_hash: string;
      issued_at: number;
      expires_at: number;
    }) {
      return db
        .insertInto("extension_sync_tokens")
        .values({
          ...values,
          revoked_at: null,
        })
        .executeTakeFirstOrThrow();
    },

    findValidSyncToken(token_hash: string, now: number) {
      return db
        .selectFrom("extension_sync_tokens")
        .selectAll()
        .where("token_hash", "=", token_hash)
        .where("revoked_at", "is", null)
        .where("expires_at", ">", now)
        .executeTakeFirst();
    },

    insertRuntimeEvent(values: {
      id: string;
      user_id: number;
      branch_id: number;
      assignment_id: number | null;
      contact_id: number | null;
      call_session_id: string | null;
      type: Database["extension_runtime_events"]["type"];
      payload_json: string;
      created_at: number;
      received_at: number;
    }) {
      return db
        .insertInto("extension_runtime_events")
        .values(values)
        .executeTakeFirstOrThrow();
    },

    hasRuntimeEvent(id: string) {
      return db
        .selectFrom("extension_runtime_events")
        .select("id")
        .where("id", "=", id)
        .executeTakeFirst();
    },

    upsertExecutiveStatus(values: {
      user_id: number;
      branch_id: number;
      assignment_id: number | null;
      contact_id: number | null;
      call_session_id: string | null;
      status: ExtensionExecutiveStatus;
      updated_at: number;
      source_event_id: string | null;
    }) {
      return db
        .insertInto("extension_executive_statuses")
        .values(values)
        .onConflict((oc) =>
          oc.column("user_id").doUpdateSet({
            branch_id: values.branch_id,
            assignment_id: values.assignment_id,
            contact_id: values.contact_id,
            call_session_id: values.call_session_id,
            status: values.status,
            updated_at: values.updated_at,
            source_event_id: values.source_event_id,
          }),
        )
        .executeTakeFirstOrThrow();
    },

    findCurrentStatusByUser(userId: number) {
      return db
        .selectFrom("extension_executive_statuses")
        .selectAll()
        .where("user_id", "=", userId)
        .executeTakeFirst();
    },

    listTeamStatusesBySupervisor(supervisorUserId: number) {
      return db
        .selectFrom("extension_executive_statuses")
        .innerJoin("users", "users.id", "extension_executive_statuses.user_id")
        .leftJoin("teams", "teams.id", "users.team_id")
        .select([
          "users.id as userId",
          "users.names",
          "users.first_surname as firstSurname",
          "users.team_id as teamId",
          "teams.name as teamName",
          "extension_executive_statuses.status",
          "extension_executive_statuses.assignment_id as assignmentId",
          "extension_executive_statuses.contact_id as contactId",
          "extension_executive_statuses.call_session_id as callSessionId",
          "extension_executive_statuses.updated_at as updatedAt",
        ])
        .where("users.is_active", "=", 1)
        .where("users.role", "=", "executive")
        .where("teams.supervisor_id", "=", supervisorUserId)
        .orderBy("users.names", "asc")
        .execute();
    },

    listBranchStatuses(branchId: number) {
      return db
        .selectFrom("extension_executive_statuses")
        .innerJoin("users", "users.id", "extension_executive_statuses.user_id")
        .leftJoin("teams", "teams.id", "users.team_id")
        .select([
          "users.id as userId",
          "users.names",
          "users.first_surname as firstSurname",
          "users.team_id as teamId",
          "teams.name as teamName",
          "extension_executive_statuses.status",
          "extension_executive_statuses.assignment_id as assignmentId",
          "extension_executive_statuses.contact_id as contactId",
          "extension_executive_statuses.call_session_id as callSessionId",
          "extension_executive_statuses.updated_at as updatedAt",
        ])
        .where("users.is_active", "=", 1)
        .where("users.role", "=", "executive")
        .where("extension_executive_statuses.branch_id", "=", branchId)
        .orderBy("users.names", "asc")
        .execute();
    },
  };
}
