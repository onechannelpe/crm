import { sql } from "kysely";

import type { GpvSnapshotId } from "~/domain/ids";
import type { DatabaseExecutor } from "~/server/platform/database/executor";

// Culqi's own export already carries enough to identify a merchant (RUC,
// legal name, address). A RUC with real GPV activity but no CRM record is
// not a data-quality exception to review one at a time (that stopped
// scaling once real data brought hundreds of RUCs CRM never registered) -
// it is the CRM lagging reality, so activation closes the gap directly.
// Ownership stays a human decision: this only creates the organization
// shell, never an owner assignment, so it keeps surfacing in the "no_owner"
// quality queue until someone assigns an executive.
export async function provisionOrganizationsFromSnapshot(
  tx: DatabaseExecutor,
  input: { snapshotId: GpvSnapshotId; createdAt: Date },
): Promise<void> {
  const candidates = tx
    .selectFrom("gpv_snapshot_placements as placement")
    .where("placement.snapshot_id", "=", input.snapshotId)
    .groupBy("placement.ruc")
    .select((eb) => [
      "placement.ruc",
      eb.fn.max("placement.legal_name").as("legal_name"),
      sql<string | null>`max(${eb.ref("placement.raw")} ->> 'direccion')`.as(
        "address",
      ),
      sql<string | null>`max(${eb.ref("placement.raw")} ->> 'distrito')`.as(
        "district",
      ),
      sql<string | null>`max(${eb.ref("placement.raw")} ->> 'provincia')`.as(
        "province",
      ),
      sql<string | null>`max(${eb.ref("placement.raw")} ->> 'departamento')`.as(
        "department",
      ),
      sql<string | null>`max(${eb.ref("placement.raw")} ->> 'phone')`.as(
        "phone",
      ),
      sql<string | null>`max(${eb.ref("placement.raw")} ->> 'email')`.as(
        "email",
      ),
    ])
    .as("candidate");

  await tx
    .insertInto("organizations")
    .columns([
      "ruc",
      "legal_name",
      "address",
      "district",
      "province",
      "department",
      "phone",
      "email",
      "created_at",
    ])
    .expression((qb) =>
      qb
        .selectFrom(candidates)
        .select((selection) => [
          "candidate.ruc",
          "candidate.legal_name",
          "candidate.address",
          "candidate.district",
          "candidate.province",
          "candidate.department",
          "candidate.phone",
          "candidate.email",
          selection.val(input.createdAt).as("created_at"),
        ]),
    )
    .onConflict((oc) => oc.column("ruc").doNothing())
    .execute();
}
