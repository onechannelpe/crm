import type { Kysely } from "kysely";

import type { Database } from "../../../src/lib/db/types";
import {
  createLeadId,
  type LeadId,
} from "../../../src/server/pipeline/domain/lead-record";
import { asUserId, type UserId } from "../../../src/server/shared/ids";

type InsertTestLeadInput = {
  db: Kysely<Database>;
  executiveId?: UserId;
  ruc?: string;
  razonSocial?: string | null;
  stage?: Database["pipeline_leads"]["stage"];
  createdBy?: UserId;
  createdAt?: number;
};

/**
 * Inserts a pipeline lead row directly into the DB for testing.
 *
 * This is the ONLY place in tests that calls createLeadId() — all test
 * code that needs a LeadId should obtain it from this helper's return value.
 */
export async function insertTestLead({
  db,
  executiveId = asUserId("00000000-0000-0000-0000-000000000001"),
  ruc = "20100000001",
  razonSocial = null,
  stage = "PENDING_EXTERNAL_REVIEW",
  createdBy = asUserId("00000000-0000-0000-0000-000000000001"),
  createdAt = 10,
}: InsertTestLeadInput): Promise<LeadId> {
  const id = createLeadId();
  await db
    .insertInto("pipeline_leads")
    .values({
      id,
      ruc,
      razon_social: razonSocial,
      address: null,
      district: null,
      department: null,
      executive_id: executiveId,
      stage,
      status: null,
      prioridad: null,
      created_by: createdBy,
      updated_by: null,
      created_at: createdAt,
      updated_at: createdAt,
    })
    .execute();
  return id;
}
