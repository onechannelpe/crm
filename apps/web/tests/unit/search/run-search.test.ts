import {
  makeNullSearchPolicyRepos,
  makeSearchCapacityGrantsRepo,
  makeSearchUsageReservationPorts,
  makeSearchUsageCommitsRepo,
  makeSearchUsageReservationsRepo,
} from "@tests/support/fakes/capacity";
import { describe, expect, it } from "vitest";

import { runDirectSearch } from "~/server/search-workflow/run-search";
import { external, type DomainError } from "~/server/shared/domain-error";
import type { SearchResult } from "~/server/shared/engine/types";
import {
  asBranchId,
  asSearchReservationId,
  asUserId,
} from "~/server/shared/ids";
import { Err, Ok, type Result } from "~/server/shared/result";

const USER_ID = asUserId("1");
const EXHAUSTED_SEARCH_COMMIT_AMOUNT = 999_999;
const PRE_EXISTING_AT = new Date(1_700_000_000_000);

function makeRepos() {
  const searchCapacityGrants = makeSearchCapacityGrantsRepo();
  const searchUsageReservations = makeSearchUsageReservationsRepo();
  const searchUsageCommits = makeSearchUsageCommitsRepo();
  const repos = {
    users: {
      findById: async () => ({ teamId: null, branchId: asBranchId("1") }),
    },
    ...makeNullSearchPolicyRepos(),
    searchCapacityGrants,
    searchUsageReservations,
    searchUsageCommits,
  };
  return {
    ...repos,
    usageReservationPorts: makeSearchUsageReservationPorts(repos),
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
      external("service unavailable", {
        code: "engine_request_failed",
        details: {
          status: 503,
          request_id: "req-search-1",
          engine_error: "service unavailable",
        },
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
      repos.usageReservationPorts,
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
      repos.usageReservationPorts,
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

    repos.searchUsageCommits.rows.push({
      id: "pre-existing",
      reservation_id: asSearchReservationId("pre-res"),
      amount: EXHAUSTED_SEARCH_COMMIT_AMOUNT,
      created_at: PRE_EXISTING_AT,
    });
    repos.searchUsageReservations.rows.push({
      id: asSearchReservationId("pre-res"),
      user_id: USER_ID,
      amount: 999999,
      reason: "direct_search",
      status: "committed",
      created_at: PRE_EXISTING_AT,
      updated_at: PRE_EXISTING_AT,
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
      repos.usageReservationPorts,
      trackingEngine,
    );

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected failure");
    const error = result.error;
    expect(error.code).toBe("search_exhausted");
    expect(engineCalled).toBe(false);
  });
});
