import { describe, expect, it } from "vitest";

import { runDirectSearch } from "~/server/search-workflow/run-search";
import type { EngineClient } from "~/server/shared/engine/client";
import { asBranchId, asUserId } from "~/server/shared/ids";
import {
  makeNullSearchPolicyRepos,
  makeSearchCapacityGrantsRepo,
  makeSearchUsageCommitsRepo,
  makeSearchUsageReservationsRepo,
} from "../support/capacity-fakes";

const USER_ID = asUserId(1);

function makeRepos() {
  const searchCapacityGrants = makeSearchCapacityGrantsRepo();
  const searchUsageReservations = makeSearchUsageReservationsRepo();
  const searchUsageCommits = makeSearchUsageCommitsRepo();
  return {
    users: {
      findById: async () => ({ team_id: null, branch_id: asBranchId(1) }),
    },
    ...makeNullSearchPolicyRepos(),
    searchCapacityGrants,
    searchUsageReservations,
    searchUsageCommits,
  };
}

const successEngine = {
  search: async () => ({
    results: [
      {
        person: { dni: "12345678", name: "Test Person", ruc: null, birth_date: null, birth_place: null, sex: null, marital_status: null, location_text: null, ubigeo_code: null, mother_name: null, father_name: null, email: null },
        org: null,
        role: null,
        phones: { primary: null, secondary: null, siblings: null },
      },
    ],
    count: 1,
  }),
} satisfies Pick<EngineClient, "search">;

const failEngine = {
  search: async (): Promise<never> => {
    throw new Error("engine unavailable");
  },
} satisfies Pick<EngineClient, "search">;

describe("runDirectSearch", () => {
  it("commits reservation when gateway succeeds", async () => {
    const repos = makeRepos();
    const result = await runDirectSearch(
      { actorUserId: USER_ID, type: "dni", value: "12345678", limit: 10 },
      repos,
      successEngine,
    );

    expect(result.ok).toBe(true);
    expect(repos.searchUsageReservations.rows).toHaveLength(1);
    expect(repos.searchUsageReservations.rows[0].status).toBe("committed");
    expect(repos.searchUsageCommits.rows).toHaveLength(1);
  });

  it("cancels reservation when gateway fails", async () => {
    const repos = makeRepos();
    const result = await runDirectSearch(
      { actorUserId: USER_ID, type: "dni", value: "12345678", limit: 10 },
      repos,
      failEngine,
    );

    expect(result.ok).toBe(false);
    expect(repos.searchUsageReservations.rows).toHaveLength(1);
    expect(repos.searchUsageReservations.rows[0].status).toBe("cancelled");
    expect(repos.searchUsageCommits.rows).toHaveLength(0);
  });

  it("returns error immediately when capacity is exhausted without calling gateway", async () => {
    const repos = makeRepos();

    // Exhaust capacity by pre-filling commits up to the system default limit
    // The system default is read from config; we simulate exhaustion by
    // inserting a large committed reservation directly.
    repos.searchUsageCommits.rows.push({
      id: "pre-existing",
      reservation_id: "pre-res",
      amount: 999999,
      created_at: Date.now(),
    });
    repos.searchUsageReservations.rows.push({
      id: "pre-res",
      user_id: USER_ID,
      amount: 999999,
      reason: "direct_search",
      status: "committed",
      created_at: Date.now(),
      updated_at: Date.now(),
    });

    let engineCalled = false;
    const trackingEngine = {
      search: async () => {
        engineCalled = true;
        return { results: [], count: 0 };
      },
    } satisfies Pick<EngineClient, "search">;

    const result = await runDirectSearch(
      { actorUserId: USER_ID, type: "dni", value: "12345678", limit: 10 },
      repos,
      trackingEngine,
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("search_exhausted");
    }
    expect(engineCalled).toBe(false);
  });
});
