import type { DomainError } from "~/server/shared/domain-error";
import type { EngineClient } from "~/server/shared/engine/client";
import type { LeadCandidatesRequest } from "~/server/shared/engine/client";
import type { LeadCandidate, SearchResult } from "~/server/shared/engine/types";
import {
  asBranchId,
  asOrganizationId,
  asUserId,
  type BranchId,
  type UserId,
} from "~/server/shared/ids";
import type { SearchType } from "~/server/shared/pipeline-types";
import { Ok, type Result } from "~/server/shared/result";

import type { TestDbContext } from "../../support/test-db";
import { BENCH_NOW } from "../_shared/constants";

export const USER_POOL_SIZE = 80;
const USER_ID_PREFIX = "00000000-0000-0000-0000-00000002";
const ORG_ID_PREFIX = "00000000-0000-0000-0000-00000003";

interface LeadsRequestSeed {
  userIds: UserId[];
  engineClient: EngineClient;
}

export async function seedLeadsRequestFixtures(
  ctx: TestDbContext,
): Promise<LeadsRequestSeed> {
  const users = Array.from({ length: USER_POOL_SIZE }, (_, index) => ({
    id: asUserId(USER_ID_PREFIX + String(index).padStart(4, "0")),
    branch_id: asBranchId("00000000-0000-0000-0000-000000000011"),
    team_id: null,
    username: `bench.leads${index}`,
    email: `bench-leads-${index}@test.local`,
    password_hash: "hash",
    names: `Bench Leads ${index}`,
    first_surname: "User",
    second_surname: "Bench",
    phone_e164: `+5199033${String(index).padStart(4, "0")}`,
    onboarding_completed_at: BENCH_NOW,
    role: "executive" as const,
    executive_category: "elite" as const,
    is_active: 1,
    created_at: BENCH_NOW,
  }));

  await ctx.db.insertInto("users").values(users).execute();
  const userIds = users.map((user) => user.id);

  const organizations = Array.from({ length: USER_POOL_SIZE }, (_, index) => ({
    id: asOrganizationId(ORG_ID_PREFIX + String(index).padStart(4, "0")),
    ruc: `2099${String(index).padStart(8, "0")}`,
    name: `Bench Org ${index}`,
    created_at: BENCH_NOW,
    locked_branch_id: null,
    locked_at: null,
    locked_by_user_id: null,
  }));

  await ctx.db.insertInto("organizations").values(organizations).execute();

  // Seed lead capacity grants so each user can complete one refill.
  // bufferTarget defaults to system default; grant 5 units per user to cover it.
  for (const userId of userIds) {
    await ctx.repos.leadCapacityGrants.insert({
      user_id: userId,
      amount: 5,
      reason: "bench_seed",
      actor_user_id: asUserId("00000000-0000-0000-0000-000000000002"),
    });
  }

  const engineClient = {
    async search(
      _type: SearchType,
      value: string,
    ): Promise<Result<SearchResult[], DomainError>> {
      return Ok([
        {
          person: {
            dni: `bench-${value}`,
            name: `Bench Contact ${value}`,
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
            ruc: value,
            name: `Bench Org ${value}`,
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
            primary: "+51911111111",
            secondary: null,
            siblings: null,
          },
        },
      ]);
    },
    async requestCandidates(
      input: LeadCandidatesRequest,
    ): Promise<Result<LeadCandidate[], DomainError>> {
      const index = userIds.indexOf(input.userId);
      return Ok([
        {
          ruc: `2099${String(index >= 0 ? index : 0).padStart(8, "0")}`,
          organization_name: `Bench Org ${index}`,
          dni: `7000${String(index >= 0 ? index : 0).padStart(4, "0")}`,
          person_name: `Bench Person ${index}`,
          phone_primary: `+5199033${String(index >= 0 ? index : 0).padStart(4, "0")}`,
        },
      ]);
    },
  };

  return { userIds, engineClient };
}
