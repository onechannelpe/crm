import type { Kysely } from "kysely";

import type { Database } from "~/lib/db/types";
import type { FileAssetId } from "~/server/shared/ids";

import { rowToFileAsset } from "./mappers";
import type { InsertFileAssetInput } from "./types";

type DB = Kysely<Database>;

export function createAssetsRepo(db: DB) {
  return {
    async insert(input: InsertFileAssetInput) {
      const result = await db
        .insertInto("file_assets")
        .values({
          storage_key: input.storageKey,
          original_filename: input.originalFilename,
          safe_display_filename: input.safeDisplayFilename,
          detected_mime: input.detectedMime,
          extension: input.extension,
          size_bytes: input.sizeBytes,
          sha256_hex: input.sha256Hex,
          signature_kind: input.signatureKind,
          scan_status: input.scanStatus,
          scan_engine: null,
          scan_reference: null,
          created_at: input.now,
        })
        .returning("id")
        .executeTakeFirstOrThrow();
      return result.id;
    },

    async findById(id: FileAssetId) {
      const row = await db
        .selectFrom("file_assets")
        .selectAll()
        .where("id", "=", id)
        .executeTakeFirst();
      return row ? rowToFileAsset(row) : null;
    },
  };
}
