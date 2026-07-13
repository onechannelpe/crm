import { describe, expect, it } from "vitest";

import {
  parseLeadPageIndex,
  resolveLeadListQueryInput,
} from "~/features/workflow/workspace/lead-list-query";

describe("resolveLeadListQueryInput", () => {
  it("applies role defaults and pagination in one query input", () => {
    expect(
      resolveLeadListQueryInput(
        {
          view: undefined,
          filter: undefined,
          sort: undefined,
          search: undefined,
          pageIndex: 2,
        },
        { id: "user-1", role: "executive" },
      ),
    ).toEqual({
      executiveId: "user-1",
      sortBy: "createdAt",
      sortDirection: "desc",
      anyFieldSearch: undefined,
      limit: 100,
      offset: 200,
    });
  });

  it("normalizes route values before building the query key", () => {
    expect(
      resolveLeadListQueryInput(
        {
          view: "review",
          filter: "stage:LIVE",
          sort: "ruc_asc",
          search: "  Acme  ",
          pageIndex: 0,
        },
        { id: "user-1", role: "back_office" },
      ),
    ).toEqual({
      stage: "LIVE",
      sortBy: "ruc",
      sortDirection: "asc",
      anyFieldSearch: "Acme",
      limit: 100,
      offset: 0,
    });
  });
});

describe("parseLeadPageIndex", () => {
  it.each([
    [undefined, 0],
    ["", 0],
    ["-1", 0],
    ["1.5", 0],
    ["3", 3],
  ])("parses %s as page %s", (value, expected) => {
    expect(parseLeadPageIndex(value)).toBe(expected);
  });
});
