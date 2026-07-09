import type { TestDbContext } from "@tests/support/runtime/db";
import { TEST_FIXTURES } from "@tests/support/runtime/db";
import { randomUUIDv7 } from "bun";

import type { SearchIntent } from "~/contracts/search/vocabulary";
import type { DomainError } from "~/server/shared/domain-error";
import type {
  EngineClient,
  RecordCandidatesRequest,
} from "~/server/shared/engine/client";
import type {
  RecordCandidate,
  SearchResult,
} from "~/server/shared/engine/types";
import {
  asBranchId,
  asUserId,
  type BranchId,
  type UserId,
} from "~/server/shared/ids";
import { Ok, type Result } from "~/server/shared/result";

import { BENCH_NOW } from "../_shared/constants";

export const USER_POOL_SIZE = 80;
const BRANCH_ID = asBranchId(TEST_FIXTURES.branches.lima.id);
const ACTOR_USER_ID = asUserId(TEST_FIXTURES.users.backOne.id);

interface LeadsRequestSeed {
  branchId: BranchId;
  userIds: UserId[];
  engineClient: EngineClient;
}

export async function seedLeadsRequestFixtures(
  ctx: TestDbContext,
): Promise<LeadsRequestSeed> {
  const users = Array.from({ length: USER_POOL_SIZE }, (_, index) => ({
    id: asUserId(randomUUIDv7()),
    branch_id: BRANCH_ID,
    team_id: null,
    username: `bench.leads${index}`,
    email: `bench-leads-${index}@test.local`,
    password_hash: "hash",
    names: `Bench Leads ${index}`,
    first_surname: "User",
    second_surname: "Bench",
    onboarding_completed_at: BENCH_NOW,
    role: "executive" as const,
    executive_category: "elite" as const,
    is_active: true,
    created_at: BENCH_NOW,
  }));

  await ctx.db.insertInto("users").values(users).execute();
  const userIds = users.map((user) => user.id);

  for (let index = 0; index < USER_POOL_SIZE; index += 1) {
    await ctx.repos.organization.upsertOrganization({
      ruc: `2099${String(index).padStart(8, "0")}`,
      legalName: `Bench Org ${index}`,
    });
  }

  // Capacity grants keep the benchmark on assignment work, not quota rejection.
  for (const userId of userIds) {
    await ctx.repos.leadCapacityGrants.insert({
      user_id: userId,
      amount: 5,
      reason: "bench_seed",
      actor_user_id: ACTOR_USER_ID,
    });
  }

  const engineClient = {
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
      const index = userIds.indexOf(input.userId);
      return Ok([
        {
          ruc: `2099${String(index).padStart(8, "0")}`,
          organization_name: `Bench Org ${index}`,
          dni: `7000${String(index).padStart(4, "0")}`,
          person_name: `Bench Person ${index}`,
          phone_primary: `99033${String(index).padStart(4, "0")}`,
        },
      ]);
    },
  };

  return { branchId: BRANCH_ID, userIds, engineClient };
}
