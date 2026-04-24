import { randomUUIDv7 } from "bun";
import type { Kysely } from "kysely";

import type { Database } from "~/lib/db/types";

import type { ArtifactStatus, ArtifactType, BindingRole } from "../types";
import { rowToArtifact, rowToFileAsset } from "./mappers";
import type { InsertArtifactInput } from "./types";

type DB = Kysely<Database>;

export function createArtifactsRepo(db: DB) {
  return {
    async insert(input: InsertArtifactInput) {
      const id = randomUUIDv7();
      await db
        .insertInto("workflow_artifacts")
        .values({
          id,
          artifact_type: input.artifactType,
          direction: input.direction,
          execution_mode: input.executionMode,
          status: input.status,
          requested_by_user_id: input.requestedByUserId,
          scope_branch_id: input.scopeBranchId,
          scope_team_id: input.scopeTeamId,
          policy_snapshot_json: input.policySnapshotJson,
          workflow_context_json: input.workflowContextJson,
          error_code: null,
          error_message: null,
          expires_at: input.expiresAt,
          created_at: input.now,
          updated_at: input.now,
        })
        .executeTakeFirstOrThrow();
      return id;
    },

    async updateStatus(
      id: string,
      status: ArtifactStatus,
      now: number,
      error?: { code: string; message: string },
    ) {
      await db
        .updateTable("workflow_artifacts")
        .set({
          status,
          updated_at: now,
          error_code: error?.code ?? null,
          error_message: error?.message ?? null,
        })
        .where("id", "=", id)
        .execute();
    },

    async findById(id: string) {
      const row = await db
        .selectFrom("workflow_artifacts")
        .selectAll()
        .where("id", "=", id)
        .executeTakeFirst();
      return row ? rowToArtifact(row) : null;
    },

    async list(filters: {
      artifactType?: ArtifactType;
      scopeBranchId?: number;
      limit: number;
      offset?: number;
    }) {
      let query = db
        .selectFrom("workflow_artifacts")
        .selectAll()
        .orderBy("created_at", "desc")
        .limit(filters.limit)
        .offset(filters.offset ?? 0);

      if (filters.artifactType) {
        query = query.where("artifact_type", "=", filters.artifactType);
      }
      if (filters.scopeBranchId !== undefined) {
        query = query.where("scope_branch_id", "=", filters.scopeBranchId);
      }

      const rows = await query.execute();
      return rows.map(rowToArtifact);
    },

    async findFileAssetForArtifact(artifactId: string, role: BindingRole) {
      const row = await db
        .selectFrom("artifact_file_bindings")
        .innerJoin(
          "file_assets",
          "file_assets.id",
          "artifact_file_bindings.file_asset_id",
        )
        .select([
          "file_assets.id",
          "file_assets.storage_key",
          "file_assets.original_filename",
          "file_assets.safe_display_filename",
          "file_assets.detected_mime",
          "file_assets.extension",
          "file_assets.size_bytes",
          "file_assets.sha256_hex",
          "file_assets.signature_kind",
          "file_assets.scan_status",
          "file_assets.scan_engine",
          "file_assets.scan_reference",
          "file_assets.created_at",
        ])
        .where("artifact_file_bindings.artifact_id", "=", artifactId)
        .where("artifact_file_bindings.binding_role", "=", role)
        .orderBy("artifact_file_bindings.version_no", "desc")
        .executeTakeFirst();
      return row ? rowToFileAsset(row) : null;
    },

    async insertFileBinding(input: {
      artifactId: string;
      fileAssetId: number;
      bindingRole: BindingRole;
      versionNo: number;
      now: number;
    }) {
      await db
        .insertInto("artifact_file_bindings")
        .values({
          artifact_id: input.artifactId,
          file_asset_id: input.fileAssetId,
          binding_role: input.bindingRole,
          version_no: input.versionNo,
          created_at: input.now,
        })
        .execute();
    },
  };
}
