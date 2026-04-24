import type { Kysely } from "kysely";

import type { Database } from "~/lib/db/types";

import type { InsertDownloadTokenInput } from "./types";

type DB = Kysely<Database>;

export function createTokensRepo(db: DB) {
  return {
    async insert(input: InsertDownloadTokenInput) {
      await db
        .insertInto("artifact_download_tokens")
        .values({
          artifact_id: input.artifactId,
          file_asset_id: input.fileAssetId,
          token_hash: input.tokenHash,
          requested_by_user_id: input.requestedByUserId,
          expires_at: input.expiresAt,
          used_at: null,
          created_at: input.now,
        })
        .execute();
    },

    async findByHash(tokenHash: string) {
      const row = await db
        .selectFrom("artifact_download_tokens")
        .select([
          "id",
          "artifact_id",
          "file_asset_id",
          "requested_by_user_id",
          "expires_at",
          "used_at",
        ])
        .where("token_hash", "=", tokenHash)
        .executeTakeFirst();

      if (!row) return null;

      return {
        id: row.id,
        artifactId: row.artifact_id,
        fileAssetId: row.file_asset_id,
        requestedByUserId: row.requested_by_user_id,
        expiresAt: row.expires_at,
        usedAt: row.used_at,
      };
    },

    async markUsed(tokenHash: string, usedAt: number) {
      const result = await db
        .updateTable("artifact_download_tokens")
        .set({ used_at: usedAt })
        .where("token_hash", "=", tokenHash)
        .where("used_at", "is", null)
        .executeTakeFirst();

      return Number(result.numUpdatedRows) > 0;
    },
  };
}
