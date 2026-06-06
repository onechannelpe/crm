import {
  makeNullSearchPolicyRepos,
  makeSearchCapacityGrantsRepo,
  makeSearchUsageCommitsRepo,
  makeSearchUsageReservationsRepo,
} from "@tests/support/fakes/capacity";
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
        kind: "document",
        doc: {
          doc_type: "DNI",
          doc_number: "12345678",
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
      {
        actorUserId: USER_ID,
        intent: "people",
        query: "12345678",
        limit: 10,
      },
      repos,
      successEngine,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected success");
    expect(repos.searchUsageReservations.rows).toHaveLength(1);
    expect(repos.searchUsageReservations.rows[0].status).toBe("committed");
    expect(repos.searchUsageCommits.rows).toHaveLength(1);
  });

  it("cancels reservation when gateway fails", async () => {
    const repos = makeRepos();
    const result = await runDirectSearch(
      {
        actorUserId: USER_ID,
        intent: "people",
        query: "12345678",
        limit: 10,
      },
      repos,
      failEngine,
    );

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected failure");
    const error = result.error;
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
      created_at: 1_700_000_000_000,
    });
    repos.searchUsageReservations.rows.push({
      id: "pre-res",
      user_id: USER_ID,
      amount: 999999,
      reason: "direct_search",
      status: "committed",
      created_at: 1_700_000_000_000,
      updated_at: 1_700_000_000_000,
    });

    let engineCalled = false;
    const trackingEngine = {
      search: async () => {
        engineCalled = true;
        return Ok([] as SearchResult[]);
      },
    };

    const result = await runDirectSearch(
      {
        actorUserId: USER_ID,
        intent: "people",
        query: "12345678",
        limit: 10,
      },
      repos,
      trackingEngine,
    );

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected failure");
    const error = result.error;
    expect(error.code).toBe("search_exhausted");
    expect(engineCalled).toBe(false);
  });
});
