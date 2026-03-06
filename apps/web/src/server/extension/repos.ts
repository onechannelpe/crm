import { sql, type Kysely } from "kysely";

import type { Database } from "~/lib/db/schema";
import type {
  ExtensionExecutivePresenceStatus,
  ExtensionSyncHealth,
} from "~/server/extension/contracts";

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
          refreshed_at: values.issued_at,
        })
        .executeTakeFirstOrThrow();
    },

    findActiveInstallationSession(
      auth_session_id: string,
      installation_id: string,
      now: number,
    ) {
      return db
        .selectFrom("extension_installation_sessions")
        .selectAll()
        .where("auth_session_id", "=", auth_session_id)
        .where("installation_id", "=", installation_id)
        .where("revoked_at", "is", null)
        .where("expires_at", ">", now)
        .executeTakeFirst();
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
      expires_at: number;
    }) {
      return db
        .updateTable("extension_installation_sessions")
        .set({
          refresh_token_hash: values.refresh_token_hash,
          refreshed_at: values.refreshed_at,
          expires_at: values.expires_at,
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

    revokeInstallationSessionsByAuthSession(
      auth_session_id: string,
      revoked_at: number,
    ) {
      return db
        .updateTable("extension_installation_sessions")
        .set({ revoked_at })
        .where("auth_session_id", "=", auth_session_id)
        .where("revoked_at", "is", null)
        .executeTakeFirst();
    },

    revokeInstallationSessionsByUser(user_id: number, revoked_at: number) {
      return db
        .updateTable("extension_installation_sessions")
        .set({ revoked_at })
        .where("user_id", "=", user_id)
        .where("revoked_at", "is", null)
        .executeTakeFirst();
    },

    revokeOtherInstallationSessionsByUser(
      user_id: number,
      keep_jti: string,
      revoked_at: number,
    ) {
      return db
        .updateTable("extension_installation_sessions")
        .set({ revoked_at })
        .where("user_id", "=", user_id)
        .where("jti", "!=", keep_jti)
        .where("revoked_at", "is", null)
        .executeTakeFirst();
    },

    async insertRuntimeEventIfAbsent(values: {
      id: string;
      sequence: number;
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
      const result = await db
        .insertInto("extension_runtime_events")
        .values(values)
        .onConflict((oc) => oc.column("id").doNothing())
        .executeTakeFirst();
      return Number(result.numInsertedOrUpdatedRows ?? 0) > 0;
    },

    upsertExecutivePresence(values: {
      user_id: number;
      branch_id: number;
      assignment_id: number | null;
      contact_id: number | null;
      call_session_id: string | null;
      presence_status: ExtensionExecutivePresenceStatus;
      presence_updated_at: number;
      source_event_id: string | null;
      source_event_sequence: number;
    }) {
      return sql`
        INSERT INTO extension_executive_statuses (
          user_id,
          branch_id,
          assignment_id,
          contact_id,
          call_session_id,
          presence_status,
          presence_updated_at,
          sync_health,
          sync_updated_at,
          source_event_id,
          source_event_sequence
        )
        VALUES (
          ${values.user_id},
          ${values.branch_id},
          ${values.assignment_id},
          ${values.contact_id},
          ${values.call_session_id},
          ${values.presence_status},
          ${values.presence_updated_at},
          ${"stale"},
          ${null},
          ${values.source_event_id},
          ${values.source_event_sequence}
        )
        ON CONFLICT (user_id) DO UPDATE SET
          branch_id = excluded.branch_id,
          assignment_id = excluded.assignment_id,
          contact_id = excluded.contact_id,
          call_session_id = excluded.call_session_id,
          presence_status = excluded.presence_status,
          presence_updated_at = excluded.presence_updated_at,
          source_event_id = excluded.source_event_id,
          source_event_sequence = excluded.source_event_sequence
        WHERE
          extension_executive_statuses.presence_updated_at IS NULL
          OR extension_executive_statuses.presence_updated_at < excluded.presence_updated_at
          OR (
            extension_executive_statuses.presence_updated_at = excluded.presence_updated_at
            AND COALESCE(extension_executive_statuses.source_event_sequence, -1) < excluded.source_event_sequence
          )
      `.execute(db);
    },

    upsertExecutiveSyncHealth(values: {
      user_id: number;
      branch_id: number;
      sync_health: ExtensionSyncHealth;
      sync_updated_at: number;
    }) {
      return db
        .insertInto("extension_executive_statuses")
        .values({
          user_id: values.user_id,
          branch_id: values.branch_id,
          assignment_id: null,
          contact_id: null,
          call_session_id: null,
          presence_status: null,
          presence_updated_at: null,
          sync_health: values.sync_health,
          sync_updated_at: values.sync_updated_at,
          source_event_id: null,
        })
        .onConflict((oc) =>
          oc.column("user_id").doUpdateSet({
            branch_id: values.branch_id,
            sync_health: values.sync_health,
            sync_updated_at: values.sync_updated_at,
          }),
        )
        .executeTakeFirstOrThrow();
    },

    updateExecutiveSyncHealthByUser(values: {
      user_id: number;
      sync_health: ExtensionSyncHealth;
      sync_updated_at: number;
    }) {
      return db
        .updateTable("extension_executive_statuses")
        .set({
          sync_health: values.sync_health,
          sync_updated_at: values.sync_updated_at,
        })
        .where("user_id", "=", values.user_id)
        .executeTakeFirst();
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
          "extension_executive_statuses.presence_status as presenceStatus",
          "extension_executive_statuses.sync_health as syncHealth",
          "extension_executive_statuses.assignment_id as assignmentId",
          "extension_executive_statuses.contact_id as contactId",
          "extension_executive_statuses.call_session_id as callSessionId",
          "extension_executive_statuses.presence_updated_at as presenceUpdatedAt",
          "extension_executive_statuses.sync_updated_at as syncUpdatedAt",
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
          "extension_executive_statuses.presence_status as presenceStatus",
          "extension_executive_statuses.sync_health as syncHealth",
          "extension_executive_statuses.assignment_id as assignmentId",
          "extension_executive_statuses.contact_id as contactId",
          "extension_executive_statuses.call_session_id as callSessionId",
          "extension_executive_statuses.presence_updated_at as presenceUpdatedAt",
          "extension_executive_statuses.sync_updated_at as syncUpdatedAt",
        ])
        .where("users.is_active", "=", 1)
        .where("users.role", "=", "executive")
        .where("extension_executive_statuses.branch_id", "=", branchId)
        .orderBy("users.names", "asc")
        .execute();
    },
  };
}
