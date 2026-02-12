import { db } from "~/infrastructure/db/client";
import { localStorage } from "~/infrastructure/storage/local";
import { config } from "~/shared/config";
import type { Result } from "~/domain/shared/result";
import { Ok, Err } from "~/domain/shared/result";

export async function uploadDocument(
  chargeNoteId: number,
  file: File,
): Promise<Result<void, Error>> {
  if (file.size > config.uploads.maxFileSizeMB * 1024 * 1024) {
    return Err(new Error("File too large"));
  }

  if (!config.uploads.allowedTypes.includes(file.type)) {
    return Err(new Error("File type not allowed"));
  }

  const stored = await localStorage.save(file, `sales/${chargeNoteId}`);

  await db
    .insertInto("document_attachments")
    .values({
      charge_note_id: chargeNoteId,
      filename: stored.filename,
      filepath: stored.filepath,
      mimetype: stored.mimetype,
      size: stored.size,
      version: 1,
      created_at: Date.now(),
    })
    .execute();

  return Ok(undefined);
}
