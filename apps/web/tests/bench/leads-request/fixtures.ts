import { createQuotaService } from "~/server/quota/service";
import type { EngineClient } from "~/server/shared/engine/client";

import type { TestDbContext } from "../../support/test-db";
import { BENCH_DATE, BENCH_NOW } from "../_shared/constants";

export const USER_POOL_SIZE = 80;
const USER_ID_START = 90_000;
const ORG_ID_START = 80_000;

export interface LeadsRequestSeed {
  userIds: number[];
  quotaService: ReturnType<typeof createQuotaService>;
  engineClient: EngineClient;
}

export async function seedLeadsRequestFixtures(
  ctx: TestDbContext,
): Promise<LeadsRequestSeed> {
  const users = Array.from({ length: USER_POOL_SIZE }, (_, index) => ({
    id: USER_ID_START + index,
    branch_id: 1,
    team_id: null,
    username: `bench.leads${USER_ID_START + index}`,
    email: `bench-leads-${USER_ID_START + index}@test.local`,
    password_hash: "hash",
    names: `Bench Leads ${USER_ID_START + index}`,
    first_surname: "User",
    second_surname: "Bench",
    phone_e164: `+5199033${String(index).padStart(4, "0")}`,
    phone_verified_at: BENCH_NOW,
    profile_confirmed_at: BENCH_NOW,
    onboarding_completed_at: BENCH_NOW,
    strong_auth_required: 0,
    strong_auth_enrolled_at: null,
    role: "executive" as const,
    is_active: 1,
    created_at: BENCH_NOW,
  }));

  await ctx.db.insertInto("users").values(users).execute();
  const userIds = users.map((user) => user.id);

  const organizations = Array.from({ length: USER_POOL_SIZE }, (_, index) => ({
    id: ORG_ID_START + index,
    ruc: `2099${String(index).padStart(8, "0")}`,
    name: `Bench Org ${index}`,
    created_at: BENCH_NOW,
    locked_branch_id: null,
    locked_at: null,
    locked_by_user_id: null,
  }));

  await ctx.db.insertInto("organizations").values(organizations).execute();

  const quotaService = createQuotaService(ctx.repos, {
    todayDateString: () => BENCH_DATE,
  });

  for (const userId of userIds) {
    const result = await quotaService.allocate(2, userId, 1, BENCH_DATE);
    if (!result.ok) {
      throw new Error(
        `expected quota allocation success, got ${result.error.message}`,
      );
    }
  }

  const engineClient: EngineClient = {
    async health() {
      return true;
    },
    async search(_type, value) {
      return {
        count: 1,
        results: [
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
        ],
      };
    },
  };

  return { userIds, quotaService, engineClient };
}
