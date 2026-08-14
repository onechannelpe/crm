import type { TestDbContext } from "@tests/support/runtime/db";
import { TEST_FIXTURES } from "@tests/support/runtime/db";
import { randomUUIDv7 } from "bun";

import type { RecordCandidate } from "~/contracts/engine/record-api.generated";
import type { SearchResult } from "~/contracts/search/engine-results.generated";
import type { SearchIntent } from "~/contracts/search/vocabulary";
import { external, type DomainError } from "~/domain/errors";
import { BranchId, UserId } from "~/domain/ids";
import type {
  EngineClient,
  RecordCandidatesRequest,
} from "~/server/integrations/engine/client";
import { Err, Ok, type Result } from "~/shared/result";

import { BENCH_NOW } from "../_shared/constants";

// This bench exercises lead requests, not ingest. Failing loudly beats a stub
// that reports success and silently ingests nothing.
const NO_INGEST = {
  registerIngestUpload: () => Promise.resolve(Err(ingestUnsupported())),
  uploadIngestBlob: () => Promise.resolve(Err(ingestUnsupported())),
  getIngestJob: () => Promise.resolve(Err(ingestUnsupported())),
  listIngestSources: () => Promise.resolve(Err(ingestUnsupported())),
};

function ingestUnsupported(): DomainError {
  return external("ingest is not available in the leads bench harness", {
    code: "engine_ingest_unsupported",
  });
}

const BRANCH_ID = BranchId.trust(TEST_FIXTURES.branches.lima.id);
const ACTOR_USER_ID = UserId.trust(TEST_FIXTURES.users.backOne.id);

export interface LeadsBench {
  branchId: BranchId;
  engine: EngineClient;
  seedUnit: () => Promise<UserId>;
}

function ruc(index: number): string {
  return `2099${String(index).padStart(8, "0")}`;
}

export function createLeadsBench(ctx: TestDbContext): LeadsBench {
  const unitIndexByUser = new Map<UserId, number>();
  let seq = 0;

  const engine: EngineClient = {
    async search(
      _intent: SearchIntent,
      query: string,
    ): Promise<Result<SearchResult[], DomainError>> {
      return Ok([
        {
          kind: "document",
          doc: {
            doc_type: "DNI",
            doc_number: `bench-${query}`,
            name: `Bench Contact ${query}`,
            ruc: null,
            birth_date: null,
            birth_place: null,
            sex: null,
            marital_status: null,
            location_text: null,
            ubigeo_code: null,
            mother_name: null,
            father_name: null,
            email: null,
          },
          org: {
            ruc: query,
            name: `Bench Org ${query}`,
            trade_name: null,
            company_type: null,
            status: null,
            condition: null,
            fiscal_address: null,
            registration_date: null,
            activity_start_date: null,
            line_of_business: null,
            economic_activity: null,
            ubigeo_code: null,
            department: null,
            province: null,
            district: null,
          },
          role: null,
          phones: {
            primary: "911111111",
            secondary: null,
            siblings: null,
          },
        },
      ]);
    },
    async requestCandidates(
      input: RecordCandidatesRequest,
    ): Promise<Result<RecordCandidate[], DomainError>> {
      const index = unitIndexByUser.get(input.userId) ?? 0;
      return Ok([
        {
          ruc: ruc(index),
          organization_name: `Bench Org ${index}`,
          dni: `7000${String(index).padStart(4, "0")}`,
          person_name: `Bench Person ${index}`,
          phone_primary: `99033${String(index).padStart(4, "0")}`,
        },
      ]);
    },

    ...NO_INGEST,
  };

  async function seedUnit(): Promise<UserId> {
    const index = seq;
    seq += 1;
    const userId = UserId.trust(randomUUIDv7());

    await ctx.db
      .insertInto("users")
      .values({
        id: userId,
        branch_id: BRANCH_ID,
        team_id: null,
        username: `bench.leads.${index}`,
        email: `bench-leads-${index}@test.local`,
        password_hash: "hash",
        names: `Bench Leads ${index}`,
        first_surname: "User",
        second_surname: "Bench",
        onboarding_completed_at: BENCH_NOW,
        role: "executive",
        executive_category: "elite",
        is_active: true,
        created_at: BENCH_NOW,
      })
      .execute();

    await ctx.repos.organization.upsertOrganization({
      ruc: ruc(index),
      legalName: `Bench Org ${index}`,
      upsertedAt: BENCH_NOW,
    });

    await ctx.repos.leadCapacityGrants.insert({
      user_id: userId,
      amount: 5,
      reason: "bench_seed",
      actor_user_id: ACTOR_USER_ID,
      created_at: BENCH_NOW,
    });

    unitIndexByUser.set(userId, index);
    return userId;
  }

  return { branchId: BRANCH_ID, engine, seedUnit };
}
