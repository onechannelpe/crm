import type { Kysely } from "kysely";

import type { Database } from "~/lib/db/schema";
import type { ExtensionExecutiveStatus } from "~/server/extension/contracts";

export function createExtensionRuntimeRepo(db: Kysely<Database>) {
  return {
    createHandoff(values: {
      jti: string;
      user_id: number;
      branch_id: number;
      auth_session_id: string;
      assignment_id: number;
      origin: string;
      issued_at: number;
      expires_at: number;
    }) {
      return db
        .insertInto("extension_handoffs")
        .values(values)
        .executeTakeFirstOrThrow();
    },

    findHandoffByJti(jti: string) {
      return db
        .selectFrom("extension_handoffs")
        .selectAll()
        .where("jti", "=", jti)
        .executeTakeFirst();
    },

    consumeHandoff(values: {
      jti: string;
      installation_id: string;
      installation_session_jti: string;
      consumed_at: number;
    }) {
      return db
        .updateTable("extension_handoffs")
        .set({
          installation_id: values.installation_id,
          installation_session_jti: values.installation_session_jti,
          consumed_at: values.consumed_at,
        })
        .where("jti", "=", values.jti)
        .where("consumed_at", "is", null)
        .executeTakeFirst();
    },

    createInstallationSession(values: {
      jti: string;
      user_id: number;
      branch_id: number;
      auth_session_id: string;
      installation_id: string;
      refresh_token_hash: string;
      issued_at: number;
      expires_at: number;
    }) {
      return db
        .insertInto("extension_installation_sessions")
        .values({
          ...values,
          revoked_at: null,
          last_seen_at: null,
          refreshed_at: null,
        })
        .executeTakeFirstOrThrow();
    },

    findValidInstallationSession(jti: string, now: number) {
      return db
        .selectFrom("extension_installation_sessions")
        .selectAll()
        .where("jti", "=", jti)
        .where("revoked_at", "is", null)
        .where("expires_at", ">", now)
        .executeTakeFirst();
    },

    findRefreshableInstallationSession(
      refresh_token_hash: string,
      installation_id: string,
      now: number,
    ) {
      return db
        .selectFrom("extension_installation_sessions")
        .selectAll()
        .where("refresh_token_hash", "=", refresh_token_hash)
        .where("installation_id", "=", installation_id)
        .where("revoked_at", "is", null)
        .where("expires_at", ">", now)
        .executeTakeFirst();
    },

    touchInstallationSession(jti: string, last_seen_at: number) {
      return db
        .updateTable("extension_installation_sessions")
        .set({ last_seen_at })
        .where("jti", "=", jti)
        .executeTakeFirst();
    },

    rotateInstallationSessionRefreshToken(values: {
      jti: string;
      refresh_token_hash: string;
      refreshed_at: number;
    }) {
      return db
        .updateTable("extension_installation_sessions")
        .set({
          refresh_token_hash: values.refresh_token_hash,
          refreshed_at: values.refreshed_at,
        })
        .where("jti", "=", values.jti)
        .executeTakeFirst();
    },

    revokeInstallationSession(jti: string, revoked_at: number) {
      return db
        .updateTable("extension_installation_sessions")
        .set({ revoked_at })
        .where("jti", "=", jti)
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
