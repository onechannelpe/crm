import type { Kysely } from "kysely";

import type { Database } from "../../../src/lib/db/types";
import {
  createLeadId,
  type LeadId,
} from "../../../src/server/pipeline/domain/lead-record";

type InsertTestLeadInput = {
  db: Kysely<Database>;
  executiveId?: number;
  ruc?: string;
  razonSocial?: string | null;
  stage?: Database["pipeline_leads"]["stage"];
  createdBy?: number;
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
  executiveId = 1,
  ruc = "20100000001",
  razonSocial = null,
  stage = "PENDING_EXTERNAL_REVIEW",
  createdBy = 1,
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
