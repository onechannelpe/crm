import * as fc from "fast-check";
import { describe, it } from "vitest";

import {
  resolveLeadPolicy,
  resolveSearchPolicy,
} from "~/server/capacity-policy/domain";

const optionalSearchRow = fc.option(fc.record({ search_limit: fc.nat() }), {
  nil: null,
});

const optionalLeadRow = fc.option(
  fc.record({ active_buffer_target: fc.nat(), daily_refill_limit: fc.nat() }),
  { nil: null },
);

describe("resolveSearchPolicy", () => {
  it("always returns a defined source", () => {
    fc.assert(
      fc.property(
        optionalSearchRow,
        optionalSearchRow,
        optionalSearchRow,
        (userOverride, teamDefault, branchDefault) => {
          const policy = resolveSearchPolicy({
            userOverride,
            teamDefault,
            branchDefault,
          });
          return policy.source !== undefined && policy.source !== null;
        },
      ),
    );
  });

  it("source is user when user override is present", () => {
    fc.assert(
      fc.property(
        fc.record({ search_limit: fc.nat() }),
        optionalSearchRow,
        optionalSearchRow,
        (userOverride, teamDefault, branchDefault) => {
          const policy = resolveSearchPolicy({
            userOverride,
            teamDefault,
            branchDefault,
          });
          return (
            policy.source === "user" &&
            policy.monthlyLimit === userOverride.search_limit
          );
        },
      ),
    );
  });

  it("source is team when no user override but team default is present", () => {
    fc.assert(
      fc.property(
        fc.record({ search_limit: fc.nat() }),
        optionalSearchRow,
        (teamDefault, branchDefault) => {
          const policy = resolveSearchPolicy({
            userOverride: null,
            teamDefault,
            branchDefault,
          });
          return (
            policy.source === "team" &&
            policy.monthlyLimit === teamDefault.search_limit
          );
        },
      ),
    );
  });

  it("source is branch when only branch default is present", () => {
    fc.assert(
      fc.property(fc.record({ search_limit: fc.nat() }), (branchDefault) => {
        const policy = resolveSearchPolicy({
          userOverride: null,
          teamDefault: null,
          branchDefault,
        });
        return (
          policy.source === "branch" &&
          policy.monthlyLimit === branchDefault.search_limit
        );
      }),
    );
  });

  it("source is system when all overrides are absent", () => {
    const policy = resolveSearchPolicy({
      userOverride: null,
      teamDefault: null,
      branchDefault: null,
    });
    return policy.source === "system";
  });
});

describe("resolveLeadPolicy", () => {
  it("always returns a defined source", () => {
    fc.assert(
      fc.property(
        optionalLeadRow,
        optionalLeadRow,
        optionalLeadRow,
        (userOverride, teamDefault, branchDefault) => {
          const policy = resolveLeadPolicy({
            userOverride,
            teamDefault,
            branchDefault,
          });
          return policy.source !== undefined && policy.source !== null;
        },
      ),
    );
  });

  it("source is user when user override is present", () => {
    fc.assert(
      fc.property(
        fc.record({
          active_buffer_target: fc.nat(),
          daily_refill_limit: fc.nat(),
        }),
        optionalLeadRow,
        optionalLeadRow,
        (userOverride, teamDefault, branchDefault) => {
          const policy = resolveLeadPolicy({
            userOverride,
            teamDefault,
            branchDefault,
          });
          return (
            policy.source === "user" &&
            policy.bufferTarget === userOverride.active_buffer_target &&
            policy.dailyLimit === userOverride.daily_refill_limit
          );
        },
      ),
    );
  });

  it("source is team when no user override but team default is present", () => {
    fc.assert(
      fc.property(
        fc.record({
          active_buffer_target: fc.nat(),
          daily_refill_limit: fc.nat(),
        }),
        optionalLeadRow,
        (teamDefault, branchDefault) => {
          const policy = resolveLeadPolicy({
            userOverride: null,
            teamDefault,
            branchDefault,
          });
          return policy.source === "team";
        },
      ),
    );
  });

  it("source is system when all overrides are absent", () => {
    const policy = resolveLeadPolicy({
      userOverride: null,
      teamDefault: null,
      branchDefault: null,
    });
    return policy.source === "system";
  });
});
