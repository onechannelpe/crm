import type {
  FileAssetId,
  GpvSnapshotId,
  GpvSnapshotJobId,
} from "~/domain/ids";
import type { DatabaseExecutor } from "~/server/platform/database/executor";

import { createGpvSnapshotJobRepo } from "./repo";

const MAX_IMPORT_ATTEMPTS = 3;

export interface AcceptGpvSnapshotInput {
  fileAssetId: FileAssetId;
  contentSha256: string;
  cutAt: Date;
  now: Date;
}

export type AcceptGpvSnapshotResult =
  | {
      kind: "accepted";
      snapshotId: GpvSnapshotId;
      jobId: GpvSnapshotJobId;
    }
  | {
      kind: "duplicate";
      snapshotId: GpvSnapshotId;
    };

export async function acceptGpvSnapshot(
  db: DatabaseExecutor,
  input: AcceptGpvSnapshotInput,
): Promise<AcceptGpvSnapshotResult> {
  return db.transaction().execute(async (tx) => {
    await tx
      .selectFrom("merchant_gpv_dataset")
      .select("id")
      .where("id", "=", "default")
      .forUpdate()
      .executeTakeFirstOrThrow();

    const duplicate = await tx
      .selectFrom("gpv_snapshots as snapshot")
      .innerJoin("file_assets as file", "file.id", "snapshot.file_asset_id")
      .select("snapshot.id")
      .where("file.sha256_hex", "=", input.contentSha256)
      .executeTakeFirst();

    if (duplicate) {
      return { kind: "duplicate", snapshotId: duplicate.id };
    }

    const latestRevision = await tx
      .selectFrom("gpv_snapshots")
      .select((eb) => eb.fn.max<number>("revision").as("revision"))
      .where("cut_at", "=", input.cutAt)
      .executeTakeFirst();
    const snapshot = await tx
      .insertInto("gpv_snapshots")
      .values({
        file_asset_id: input.fileAssetId,
        cut_at: input.cutAt,
        revision: (latestRevision?.revision ?? 0) + 1,
        uploaded_at: input.now,
      })
      .returning("id")
      .executeTakeFirstOrThrow();
    const jobId = await createGpvSnapshotJobRepo(tx).insert({
      snapshotId: snapshot.id,
      maxAttempts: MAX_IMPORT_ATTEMPTS,
      now: input.now,
    });

    return {
      kind: "accepted",
      snapshotId: snapshot.id,
      jobId,
    };
  });
}
