import {
  makeNullSearchPolicyRepos,
  makeSearchCapacityGrantsRepo,
  makeSearchUsageCommitsRepo,
  makeSearchUsageReservationsRepo,
} from "@tests/support/fakes/capacity";
import { expectErr, expectOk } from "@tests/support/_core/assertions";
import { describe, expect, it } from "vitest";

import { runDirectSearch } from "~/server/search-workflow/run-search";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import type { SearchResult } from "~/server/shared/engine/types";
import { Err, Ok, type Result } from "~/server/shared/result";

const USER_ID = 1;

function makeRepos() {
  const searchCapacityGrants = makeSearchCapacityGrantsRepo();
  const searchUsageReservations = makeSearchUsageReservationsRepo();
  const searchUsageCommits = makeSearchUsageCommitsRepo();
  return {
    users: {
      findById: async () => ({ teamId: null, branchId: 1 }),
    },
    ...makeNullSearchPolicyRepos(),
    searchCapacityGrants,
    searchUsageReservations,
    searchUsageCommits,
  };
}

const successEngine = {
  search: async (): Promise<Result<SearchResult[], DomainError>> =>
    Ok([
      {
        person: {
          dni: "12345678",
          name: "Test Person",
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
        org: null,
        role: null,
        phones: { primary: null, secondary: null, siblings: null },
      },
    ]),
};

const failEngine = {
  search: async (): Promise<Result<SearchResult[], DomainError>> =>
    Err(
      domainError("external", "engine_request_failed", "service unavailable", {
        status: 503,
        request_id: "req-search-1",
        engine_error: "service unavailable",
      }),
    ),
};

describe("runDirectSearch", () => {
  it("commits reservation when gateway succeeds", async () => {
    const repos = makeRepos();
    const result = await runDirectSearch(
      { actorUserId: USER_ID, type: "dni", value: "12345678", limit: 10 },
      repos,
      successEngine,
    );

    expectOk(result);
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

    const error = expectErr(result);
    expect(error.details).toMatchObject({
      status: 503,
      request_id: "req-search-1",
      engine_error: "service unavailable",
    });
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
        return Ok([] as SearchResult[]);
      },
    };

    const result = await runDirectSearch(
      { actorUserId: USER_ID, type: "dni", value: "12345678", limit: 10 },
      repos,
      trackingEngine,
    );

    const error = expectErr(result);
    expect(error.code).toBe("search_exhausted");
    expect(engineCalled).toBe(false);
  });
});
