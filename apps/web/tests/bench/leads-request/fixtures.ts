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

const BRANCH_ID = asBranchId(TEST_FIXTURES.branches.lima.id);
const ACTOR_USER_ID = asUserId(TEST_FIXTURES.users.backOne.id);

export interface LeadsBench {
  branchId: BranchId;
  engine: EngineClient;
  // Seeds a fresh user + org + capacity grant and returns the user.
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
  };

  async function seedUnit(): Promise<UserId> {
    const index = seq;
    seq += 1;
    const userId = asUserId(randomUUIDv7());

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
    });

    // Capacity grant keeps the benchmark on assignment work.
    await ctx.repos.leadCapacityGrants.insert({
      user_id: userId,
      amount: 5,
      reason: "bench_seed",
      actor_user_id: ACTOR_USER_ID,
    });

    unitIndexByUser.set(userId, index);
    return userId;
  }

  return { branchId: BRANCH_ID, engine, seedUnit };
}
