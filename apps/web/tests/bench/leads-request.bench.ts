import { afterAll, beforeAll, bench, describe, vi } from "vitest";

vi.mock("~/server/shared/engine", () => ({
  engineClient: {
    health: vi.fn(async () => true),
    search: vi.fn(async (_type: string, ruc: string) => ({
      count: 1,
      results: [
        {
          dni: `bench-${ruc}`,
          name: `Bench Contact ${ruc}`,
          phone_primary: "+51911111111",
          phone_secondary: null,
          org_ruc: ruc,
          org_name: `Bench Org ${ruc}`,
          sibling_phones: null,
        },
      ],
    })),
  },
}));

import { createAssignment } from "~/server/leads/domain-assignment";
import { createLeadAssignmentService } from "~/server/leads/service";
import { createQuotaService } from "~/server/quota/service";

import {
  cleanupTestDb,
  createIsolatedTestDb,
  type TestDbContext,
} from "../support/test-db";
import { fixedIterations } from "./shared";

const LEADS_REQUEST_USER_POOL_SIZE = 80;
const LEADS_REQUEST_USER_ID_START = 90_000;
const LEADS_REQUEST_ORG_ID_START = 80_000;
const LEADS_REQUEST_BENCH_NOW = 1_700_000_000_000;

describe("lead assignment performance", () => {
  let ctx: TestDbContext | null = null;
  let leadAssignmentService: ReturnType<typeof createLeadAssignmentService> | null =
    null;
  let userIds: number[] = [];
  let userCursor = 0;

  beforeAll(async () => {
    ctx = await createIsolatedTestDb("leads-request-bench");
    const benchCtx = ctx;
    if (!benchCtx) {
      throw new Error("expected benchmark db context");
    }
    leadAssignmentService = createLeadAssignmentService(benchCtx.repos);

    const now = LEADS_REQUEST_BENCH_NOW;
    const users = Array.from(
      { length: LEADS_REQUEST_USER_POOL_SIZE },
      (_, i) => ({
        id: LEADS_REQUEST_USER_ID_START + i,
        branch_id: 1,
        team_id: null,
        email: `bench-leads-${LEADS_REQUEST_USER_ID_START + i}@test.local`,
        password_hash: "hash",
        full_name: `Bench Leads ${LEADS_REQUEST_USER_ID_START + i}`,
        phone_e164: `+5199033${String(i).padStart(4, "0")}`,
        phone_verified_at: now,
        profile_confirmed_at: now,
        onboarding_completed_at: now,
        strong_auth_required: 0,
        strong_auth_enrolled_at: null,
        role: "executive" as const,
        is_active: 1,
        created_at: now,
      }),
    );
    await benchCtx.db.insertInto("users").values(users).execute();
    userIds = users.map((user) => user.id);

    const orgs = Array.from(
      { length: LEADS_REQUEST_USER_POOL_SIZE },
      (_, i) => ({
        id: LEADS_REQUEST_ORG_ID_START + i,
        ruc: `2099${String(i).padStart(8, "0")}`,
        name: `Bench Leads Org ${i}`,
        created_at: now,
        locked_branch_id: null,
        locked_at: null,
        locked_by_user_id: null,
      }),
    );
    await benchCtx.db.insertInto("organizations").values(orgs).execute();

    const quota = createQuotaService(benchCtx.repos);
    const benchDay = new Date().toISOString().slice(0, 10);
    for (const userId of userIds) {
      // oxlint-disable-next-line no-await-in-loop
      const allocated = await quota.allocate(2, userId, 1, benchDay);
      if (!allocated.ok) {
        throw new Error(
          `expected quota allocation success, got ${allocated.error}`,
        );
      }
    }
  });

  afterAll(async () => {
    if (ctx) {
      await cleanupTestDb(ctx);
      ctx = null;
    }
    leadAssignmentService = null;
  });

  bench(
    "action path: request leads for one user",
    async () => {
      const userId = userIds[userCursor];
      userCursor += 1;
      if (userId === undefined) {
        throw new Error(
          "request-leads pool exhausted before iterations completed",
        );
      }

      const result = await leadAssignmentService!.requestLeads(userId, 1, 1);
      if (!result.ok) {
        throw new Error(`expected lead request success, got ${result.error}`);
      }
      if (result.value !== 1) {
        throw new Error(`expected one assigned lead, got ${result.value}`);
      }
    },
    fixedIterations(LEADS_REQUEST_USER_POOL_SIZE),
  );

  bench(
    "component path: build assignment payload",
    () => {
      const assignment = createAssignment(1, 1);
      if (assignment.user_id !== 1 || assignment.contact_id !== 1) {
        throw new Error("unexpected assignment payload");
      }
    },
    fixedIterations(25_000),
  );
});
